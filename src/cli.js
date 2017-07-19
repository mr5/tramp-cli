import prog from 'caporal';
import chalk from 'chalk';
import emphasize from 'emphasize';
import Listr from 'listr';
import listrRenderer from 'listr-overwrite-renderer';
import wrapAnsi from 'wrap-ansi';
import indentString from 'indent-string';
import inquirer from 'inquirer';
import AsciiTable from 'ascii-table-unicode';
import MigrationCreator from './migrations/migration_creator';
import Migrator from './migrations/migrator';

const config = {
  connection: {
    host: 'localhost',
    user: 'root',
    database: 'tramp_test',
    password: 'root'
  },
  paths: [
    'migrations/app',
    'migrations/claim',
    'migrations/crawler',
    'migrations/loan',
    'migrations/market',
    'migrations/payment',
    'migrations/riskcontrol',
    'migrations/up',
    'migrations/user'
  ]
};
const migrator = new Migrator(config);
const printError = (err) => {
  console.error(`\n${indentString(chalk.red(err.message), 4)}\n`);
};
const highlight = (str, lang = 'sql') => emphasize.highlight(lang, str).value;
prog.command('make', 'Make a new migration file')
  .argument('<name>', 'The name of migration')
  .option('--path', 'The location where the migration file should be created.', null)
  .action(async (args, options, logger) => {
    const migrationCreator = new MigrationCreator();
    let path;
    if (options.path) {
      if (!migrator.paths.includes(migrator.absolutelyPath(options.path))) {
        throw new Error(`The path '${options.path}' is not in path list.`);
      } else {
        path = migrator.absolutelyPath(options.path);
      }
    } else if (migrator.paths.length > 0) {
      const prompt = inquirer.createPromptModule();
      path = await prompt({
        name: 'path',
        type: 'list',
        choices: migrator.paths.map(migrator.relativelyPath),
        message: 'Which path would you want to position your new migration file.'
      });
      path = migrator.absolutelyPath(path.path);
    } else {
      path = migrator.paths[0];
    }
    const filename = migrationCreator.create(args.name, path);
    logger.info(`${chalk.green('A new migration file made:')} ${filename}`);
  });

prog.command('migrate', 'Run the database migrations.')
  .option('--skip', 'Skip specific migration files, use \',\' for multiple files.\n' +
    'The statements defined in skipped migrations will not be executed, but log as migrated.')
  .action(async (args, options, logger) => {
    let skipped = [];
    if (options.skip) {
      skipped = skipped.concat(options.skip.split(','));
    }
    await migrator.initialize();
    const pendingMigrations = await migrator.pendingMigrations();
    if (pendingMigrations.length <= 0) {
      migrator.getConnection().close();
      logger.info(chalk.yellow('\n  [NOTE] No pending migrations to migrate.'), '\n');
      return;
    }
    logger.info(chalk.yellow(`\n  Attempting to migrate ${pendingMigrations.length} migrations.`));

    logger.info('');
    const mainTasks = [];
    for (const migration of pendingMigrations) {
      const migrationTasks = [];
      for (const sql of migrator.getMigrationSql(migration)) {
        migrationTasks.push(
          {
            title: highlight(sql),
            task: () => migrator.getConnection().query(sql)
          });
      }

      if (migrationTasks.length > 0) {
        migrationTasks.push({
          title: `Mark ${migration.file} as migrated`,
          task () {
            return migrator.markAsMigrated(migration.file, migrator.getMigrationSql(migration).join('\n\n'));
          }
        });
      }
      mainTasks.push({
        title: migration.file,
        skip: async () => {
          if (!skipped.includes(migration.file)) {
            return false;
          }
          await migrator.markAsMigrated(migration.file, 'skipped');
          return 'Skipped cause of --skip option.';
        },
        task() {
          return new Listr(migrationTasks);
        }
      });
    }
    const tasks = new Listr(mainTasks, { renderer: listrRenderer });
    tasks.run().then(() => {
      logger.info(chalk.green(indentString(`\n${pendingMigrations.length} migrations migrated.\n`, 2)));
      migrator.getConnection().close();
    }).catch((err) => {
      printError(err);
      migrator.getConnection().close();
    });
  });
prog.command('preview')
  .option('--summary', 'Do not display SQL')
  .action(async (args, opts, logger) => {
    await migrator.initialize();
    const pendingMigrations = await migrator.pendingMigrations();
    if (pendingMigrations.length <= 0) {
      migrator.getConnection().close();
      logger.info(chalk.yellow('\n  [NOTE] No pending migrations to migrate.'), '\n');
      return;
    }
    logger.info(chalk.yellow(`\n  -- Found ${chalk.red(pendingMigrations.length)} pending ${pendingMigrations.length > 1 ? 'migrations' : 'migration'}.`));

    logger.info('');
    try {
      for (const migration of pendingMigrations) {
        logger.info(indentString(
          `-- ${migration.file}${migrator.paths.length > 1 ? chalk.grey(` [ in path '${migrator.relativelyPath(migration.path)}' ]`
          ) : ''}:`, 2));
        logger.info('');
        if (opts.summary === undefined) {
          migrator.getMigrationSql(migration).forEach((sql) => {
            let msg = wrapAnsi(sql, Math.min(process.stdout.columns - 8, 150), { wordWrap: true });
            msg = indentString(msg, 6);
            msg = emphasize.highlight('sql', msg).value;
            logger.info(msg);
            logger.info('');
          });
        }
      }
    } catch
      (e) {
      logger.error(e);
    }
    await migrator.getConnection().close();
  });
prog.command('history', 'Show last 10 migrated migration information.').action(async (args, opts, logger) => {
  await migrator.initialize();
  const migratedMigrations =
    await migrator
      .getConnection()
      .query(`SELECT * FROM ${migrator.wrapTable('tramp_migrations')} ORDER BY ran_at DESC LIMIT 10`);
  if (migratedMigrations.length <= 0) {
    await migrator.getConnection().close();
    return logger.info(`\n${indentString(chalk.yellow('No migrations migrated yet.'), 2)}\n`);
  }
  const rows = [];
  for (const migratedMigration of migratedMigrations) {
    rows.push([
      migratedMigration.id,
      migratedMigration.migration,
      migratedMigration.ran_at,
      migratedMigration.authors
    ]);
  }
  const historyTable = new AsciiTable().fromJSON({
    title: chalk.bold('Last 10 migrated migrations'),
    heading: ['ID', 'MIGRATION', 'RAN AT', 'AUTHORS'].map(head => chalk.yellow(head)),
    rows
  });
  logger.info(`\n${indentString(historyTable.toString(), 2)}\n`);
  await migrator.getConnection().close();
});

process.on('unhandledRejection', printError);
process.on('uncaughtException', printError);
prog.parse(process.argv);
