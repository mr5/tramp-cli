import globby from 'globby';
import _ from 'lodash';
import chalk from 'chalk';
import indentString from 'indent-string';
import wrapAnsi from 'wrap-ansi';
import emphasize from 'emphasize';
import { exec } from 'child_process';
import Builder from '../schema/builder';
import MysqlConnection from '../connection/mysql_connection';

export default class Migrator {
  constructor(config = {}) {
    this.config = config;
    this.paths = this.getConfig('paths', []);
    if (_.isString(this.paths)) {
      this.paths = this.paths.split(',');
    }
    this.paths = this.paths.map(this.absolutelyPath);
    this.tablePrefix = this.getConfig('tablePrefix');
  }

  getConfig(name, defaultValue = null) {
    return this.config[name] === undefined ? defaultValue : this.config[name];
  }

  async createConnection() {
    this.connection = new MysqlConnection(this.config);
    await this.connection.connect();
  }

  getConnection() {
    return this.connection;
  }

  wrapTable(tableName) {
    return `${this.tablePrefix || ''}${tableName}`;
  }

  async isMigrated(file) {
    return (await this.connection
          .query(`SELECT * FROM ${this.wrapTable('tramp_migrations')} WHERE migration='${file}'`)
      ).length > 0;
  }

  async markAsMigrated(migration, ranSql = '') {
    const authors = await this.getAuthors(migration);
    await this.getConnection().query(
      'INSERT INTO tramp_migrations (migration, path, ran_sql, authors) VALUES (?, ?, ?, ?);',
      [migration.file, this.relativelyPath(migration.path), ranSql, authors]
    );
  }

  async initialize() {
    await this.createConnection();
    let initialSql = this.connection.getSchemaGrammar().getMigrationInitialSql();
    if (initialSql) {
      if (!Array.isArray(initialSql)) {
        initialSql = [initialSql];
      }
      for (const sql of initialSql) {
        await this.connection.query(sql);
      }
    }
    if (!await this.connection.getSchemaBuilder().hasTable('tramp_migrations')) {
      this.connection.getSchemaBuilder().create('tramp_migrations', (table) => {
        table.increments('id');
        table.string('migration').unique();
        table.string('path');
        table.string('authors').default('');
        table.text('ran_sql');
        table.dateTime('ran_at').default(
          this.connection.getSchemaGrammar().literal('CURRENT_TIMESTAMP')
        );
      });
      await this.connection.getSchemaBuilder().execute();
    }
  }

  async dumpPreview(logger, opts) {
    const pendingMigrations = await this.pendingMigrations();
    if (pendingMigrations.length <= 0) {
      logger.info(chalk.yellow('\n  No pending migrations to migrate.'), '\n');
      return 0;
    }
    logger.info(chalk.yellow(`\n  -- Found ${chalk.red(pendingMigrations.length)} pending ${pendingMigrations.length > 1 ? 'migrations' : 'migration'}.`));

    logger.info('');
    for (const migration of pendingMigrations) {
      const authors = await this.getAuthors(migration);
      logger.info(indentString(
        `-- ${migration.file} ${authors ? chalk.gray(`by ${authors}`) : ''}${this.paths.length > 1 ? chalk.grey(` in ${this.relativelyPath(migration.path)}`
        ) : ''}:`, 2));
      logger.info('');
      if (opts.summary === undefined) {
        this.getMigrationSql(migration).forEach((sql) => {
          let msg = wrapAnsi(sql, Math.min(process.stdout.columns - 8, 200), { wordWrap: true });
          msg = indentString(msg, 6);
          msg = emphasize.highlight('sql', msg).value;
          logger.info(msg);
          logger.info('');
        });
      }
    }
    return pendingMigrations.length;
  }

  addPath(path) {
    if (!this.paths.includes(path)) {
      this.paths.push(path);
    }
  }

  getAuthors(migration) {
    return new Promise((resolve) => {
      exec(
        `git blame --line-porcelain '${migration.path}/${migration.file}' | sed -n 's/^author //p' | sort | uniq -c | sort -rn | awk '{print $2}' | paste -s -d"," -`,
        (error, stdout) => {
          if (error) {
            resolve('');
          } else {
            resolve(stdout.toString().trim());
          }
        }
      );
    });
  }

  absolutelyPath(path) {
    let absolutelyPath = path;
    absolutelyPath = _.trimEnd(absolutelyPath, '/');
    if (absolutelyPath.startsWith('/')) {
      return absolutelyPath;
    }

    return `${process.cwd()}/${absolutelyPath}`;
  }

  relativelyPath(path) {
    const relativelyPath = _.trimEnd(path, '/');
    if (relativelyPath.startsWith('/')) {
      return relativelyPath.replace(`${process.cwd()}/`, '');
    }

    return relativelyPath;
  }

  async pendingMigrations() {
    let pendingMigrationFiles = [];
    for (const path of this.paths) {
      const files = globby.sync(['*.js'], { cwd: path });
      for (const file of files) {
        if (!await this.isMigrated(file)) {
          pendingMigrationFiles.push({ path, file });
        }
      }
    }
    pendingMigrationFiles = pendingMigrationFiles.sort((a, b) => {
      if (a.file < b.file) {
        return -1;
      } else if (a.file > b.file) {
        return 1;
      }
      return 0;
    });
    return pendingMigrationFiles;
  }

  getMigrationSql(file, action = 'up') {
    const builder = new Builder(this.connection);
    //eslint-disable-next-line import/no-dynamic-require,global-require
    const migrationDefinition = require(`${file.path}/${file.file}`);
    migrationDefinition[action](builder);

    return builder.toSql();
  }
}
