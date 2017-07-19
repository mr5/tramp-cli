import globby from 'globby';
import _ from 'lodash';
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

  async markAsMigrated(file, ranSql = '') {
    await this.getConnection().query(
      'INSERT INTO tramp_migrations (migration, ran_sql) VALUES (?, ?);',
      [file, ranSql]
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
        table.string('authors').default('');
        table.text('ran_sql');
        table.dateTime('ran_at').default(
          this.connection.getSchemaGrammar().literal('CURRENT_TIMESTAMP')
        );
      });
      await this.connection.getSchemaBuilder().execute();
    }
  }

  addPath(path) {
    if (!this.paths.includes(path)) {
      this.paths.push(path);
    }
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
