/* eslint no-console:0 */
import prog from 'caporal';
import chalk from 'chalk';
import emphasize from 'emphasize';
import Listr from 'listr';
import listrRenderer from 'listr-overwrite-renderer';
import indentString from 'indent-string';
import inquirer from 'inquirer';
import moment from 'moment-timezone';
import fs from 'fs';
import AsciiTable from 'ascii-table-unicode';
import MigrationCreator from './migrations/migration_creator';
import Migrator from './migrations/migrator';

const printError = (err) => {
  console.error(`\n${indentString(chalk.red(err.message), 4)}\n`);
};
const printMessage = (message) => {
  console.log(`\n${indentString(message, 4)}\n`);
};
const rcFilePath = `${process.cwd()}/.tramprc.js`;
let config = {};
let sharedMigrator;
const getMigrator = () => {
  if (!sharedMigrator) {
    if (!fs.existsSync(rcFilePath)) {
      printError({ message: 'Config file `.tramprc.js` is not exists. Run `tramp init` to generate one' });
      process.exit(1);
    }
    config = require(rcFilePath); // eslint-disable-line
    sharedMigrator = new Migrator(config);
  }
  return sharedMigrator;
};

const highlight = (str, lang = 'sql') => emphasize.highlight(lang, str).value;
prog.name('tramp').version(require(`${__dirname}/../package.json`).version);
prog.command('init', 'generate `.tramprc.js` file')
  .action((args, options, logger) => {
    if (fs.existsSync(rcFilePath)) {
      printError({ message: `File '.tramprc.js' already exists. Current working dir is ${process.cwd()}` });
      process.exit(1);
    }
    fs.writeFileSync(rcFilePath, fs.readFileSync(`${__dirname}/migrations/tramprc.stub`).toString('utf8'));
    printMessage(chalk.green(`Wrote config file ${rcFilePath}`));
  });
prog.command('make', 'Make a new migration file')
  .argument('<name>', 'The name of migration')
  .option('--path', 'The location where the migration file should be created.', null)
  .action(async (args, options, logger) => {
    const migrator = getMigrator();
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
  .option('--force', 'Run migrate without confirmation.')
  .option('--summary', 'Do not display SQL in unforced mode.')
  .action(async (args, options, logger) => {
    const migrator = getMigrator();
    await migrator.initialize();
    let skipped = [];
    if (options.force === undefined) {
      const pendingMigrations = await migrator.dumpPreview(logger, options);
      if (pendingMigrations <= 0) {
        await migrator.getConnection().close();
        return;
      }
      const prompt = inquirer.createPromptModule();
      const confirmed = await prompt({
        name: 'goOn',
        message: chalk.red(`Would you want to migrate these ${pendingMigrations} migrations: [yes/no]`)
      });
      if (confirmed.goOn.toLowerCase() !== 'yes') {
        printMessage(chalk.yellow('Migration has been canceled, nothing happened.'));
        await migrator.getConnection().close();
        return;
      }
    }
    if (options.skip) {
      skipped = skipped.concat(options.skip.split(','));
    }
    const pendingMigrations = await migrator.pendingMigrations();
    if (pendingMigrations.length <= 0) {
      migrator.getConnection().close();
      logger.info(chalk.yellow('\n  No pending migrations to migrate.'), '\n');
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
            return migrator.markAsMigrated(migration, migrator.getMigrationSql(migration).join('\n\n'));
          }
        });
      }
      mainTasks.push({
        title: migration.file,
        skip: async () => {
          if (!skipped.includes(migration.file)) {
            return false;
          }
          await migrator.markAsMigrated(migration, 'skipped');
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
prog.command('preview', 'Preview pending migrations')
  .option('--summary', 'Do not display SQL')
  .action(async (args, opts, logger) => {
    const migrator = getMigrator();
    await migrator.initialize();
    try {
      await migrator.dumpPreview(logger, opts);
    } catch (e) {
      printError(e);
      await migrator.getConnection().close();
      process.exit(1);
    }
    await migrator.getConnection().close();
  });
prog.command('history', 'Show last 20 migrated migration information.').action(async (args, opts, logger) => {
  const migrator = getMigrator();
  await migrator.initialize();
  const migratedMigrations =
    await migrator
      .getConnection()
      .query(`SELECT * FROM ${migrator.wrapTable('tramp_migrations')} ORDER BY ran_at DESC LIMIT 20`);
  if (migratedMigrations.length <= 0) {
    await migrator.getConnection().close();
    return logger.info(`\n${indentString(chalk.yellow('No migrations migrated yet.'), 2)}\n`);
  }
  const rows = [];
  for (const migratedMigration of migratedMigrations) {
    rows.push([
      migratedMigration.id,
      chalk.gray(migratedMigration.path),
      `${migratedMigration.migration}${migratedMigration.ran_sql === 'skipped' ? chalk.gray(' [skipped]') : ''}`,
      moment(migratedMigration.ran_at).format('YYYY-MM-DD HH:mm:ss'),
      migratedMigration.authors
    ]);
  }
  const historyTable = new AsciiTable().fromJSON({
    title: chalk.bold('Last 20 migrated migrations'),
    heading: ['ID', 'PATH', 'MIGRATION', 'RAN AT', 'AUTHORS'].map(head => chalk.yellow(head)),
    rows
  });
  logger.info(`\n${indentString(historyTable.toString(), 2)}\n`);
  return migrator.getConnection().close();
});

process.on('unhandledRejection', printError);
process.on('uncaughtException', printError);
prog.parse(process.argv);
