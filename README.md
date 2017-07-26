## tramp-cli

[![NPM version](https://img.shields.io/npm/v/tramp-cli.svg?style=flat-square)](http://badge.fury.io/js/tramp-cli)
[![Build Status](https://travis-ci.org/mr5/tramp-cli.svg?branch=master)](https://travis-ci.org/mr5/tramp-cli)
[![codecov](https://codecov.io/gh/mr5/tramp-cli/branch/master/graph/badge.svg)](https://codecov.io/gh/mr5/tramp-cli)
[![Dependencies Status](https://david-dm.org/mr5/tramp-cli.svg)](https://david-dm.org/mr5/tramp-cli)
[![License](https://img.shields.io/npm/l/tramp-cli.svg?maxAge=2592000?style=plastic)](https://github.com/mr5/tramp-cli/blob/master/LICENSE)


Tramp is a graceful migration tool for database,  with excellent interactive design.
 No framework or program language bound. It's inspired by [laravel](https://laravel.com/docs/5.4/migrations).


- [Installation](#installation)
- [Introduction](#introduction)
- [Initialization](#Initialization)
- [Generating Migrations](#generating-migrations)
- [Migration Structure](#migration-structure)
- [Preview Migrations](#preview-migrations)
- [Running Migrations](#running-migrations)
    - [Rolling Back Migrations](#rolling-back-migrations)
- [Tables](#tables)
    - [Creating Tables](#creating-tables)
    - [Renaming / Dropping Tables](#renaming-and-dropping-tables)
- [Columns](#columns)
    - [Creating Columns](#creating-columns)
    - [Column Modifiers](#column-modifiers)
    - [Modifying Columns](#modifying-columns)
    - [Dropping Columns](#dropping-columns)
- [Indexes](#indexes)
    - [Creating Indexes](#creating-indexes)
    - [Dropping Indexes](#dropping-indexes)
    - [Foreign Key Constraints](#foreign-key-constraints)

<a name="installation"></a>
## installation

```shell
    npm install -g tramp-cli
```

Run `tramp` to list commands:
```shell
   tramp 0.1.7 
     
   USAGE

     tramp <command> [options]

   COMMANDS

     init                generate `.tramprc.js` file                 
     make <name>         Make a new migration file                   
     migrate             Run the database migrations.                
     preview             Preview pending migrations                  
     history             Show last 20 migrated migration information.
     help <command>      Display help for a specific command         

   GLOBAL OPTIONS

     -h, --help         Display help                                      
     -V, --version      Display version                                   
     --no-color         Disable colors                                    
     --quiet            Quiet mode - only displays warn and error messages
     -v, --verbose      Verbose mode - will also output debug messages    
```

<a name="introduction"></a>
## Introduction
Migrations are like version control for your database, allowing your team to easily modify and share the application's database schema. Migrations are typically paired with schema builder to easily build your application's database schema. If you have ever had to tell a teammate to manually add a column to their local database schema, you've faced the problem that database migrations solve.

<a name="Initialization"></a>
## Initialization

Run `.tramprc.js` in your project root path will generate a configuration file of tramp. It looks like below:

```javascript
module.exports = {
  dialect: 'mysql',
  connection: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'databasename'
  },
  paths: [
    'migrations'
  ]
};

// Below is a example for read configuration from your project's cli command. Your project's command `./project_cli dump_config` must output
// a JSON format string (It must be implemented by yourself, not included in tramp-cli), it's very useful for no-nodejs projects.
// const child_process = require('child_process');
// module.exports = JSON.parse(child_process.execSync('./project_cli dump_config'));
```

It is a normal node.js file. You can use all nodej.s API in `.tramprc.js`. You can read configuration from your project config file, or read config from another cli command stdout if your project is not node.js. 

> NOTE: Tramp only support mysql in recently released versions.

<a name="generating-migrations"></a>
## Generating Migrations

To create a migration, use the `tramp make` command:

```shell
    tramp make create_users_table
```

The new migration will be placed in your path. Each migration file name contains a timestamp which allows Tramp to determine the order of the migrations.

If you would like to specify a custom output path for the generated migration, you may use the `--path` option when executing the `tramp make` command. The given path should be relative to your application's base path and included in configuration that defined in `.tramprc.js`.

<a name="migration-structure"></a>
## Migration Structure

A migration class contains two methods: `up` and `down`. The `up` method is used to add new tables, columns, or indexes to your database, while the `down` method should simply reverse the operations performed by the `up` method (like rollback).

> NOTE: Feature `down` is not implemented yet.

Within both of these methods you may use the tramp schema builder to expressively create and modify tables. To learn about all of the methods available on the schema builder, [check out its documentation](#creating-tables). For example, this migration example creates a `flights` table:
```javascript
    /* eslint-disable object-shorthand, func-names, no-param-reassign */
    module.exports = {
        /**
        * Run the migrations.
        * @param {Builder} schema
        */
        up: function (schema) {
            schema.table('flights', (table) => {
                table.increments('id');
                table.string('name');
                table.string('airline');
                table.timestamp('created_at');
            });
        },

        /**
        * Reverse the migrations.
        * @param {Builder} schema
        */
        down: function (schema) {
            schema.drop('flights');
        }
    };
```

<a name="running-migrations"></a>
## Running Migrations

To run all of your outstanding migrations, execute the `migrate` command:
```shell
    tramp migrate
```

<a name="preview-migrations"></a>
## Preview Migrations

To preview all of your outstanding migrations, execute the `preview` command:

```shell
    tramp preview
```

Tramp will print the SQL statements of all outstanding migrations, but do nothing which effect database.

#### Forcing Migrations To Run In Production

Some migration operations are destructive, which means they may cause you to lose data. In order to protect you from running these commands against your production database, you will be prompted for confirmation before the commands are executed. To force the commands to run without a prompt, use the `--force` flag, it's very useful for unit test:

```shell
    tramp migrate --force
```

<a name="rolling-back-migrations"></a>
### Rolling Back Migrations

To rollback the latest migration operation, you may use the `rollback` command. This command rolls back the last "batch" of migrations, which may include multiple migration files:

```shell
    tramp rollback
```

You may rollback a limited number of migrations by providing the `step` option to the `rollback` command. For example, the following command will rollback the last five migrations:

```shell
    tramp rollback --step=5
```

> NOTE: migration rollback is not implemented yet.

<a name="tables"></a>
## Tables

<a name="creating-tables"></a>
### Creating Tables

To create a new database table, use the `create` method on the `schema`. The `create` method accepts two arguments. The first is the name of the table, while the second is a `Closure` which receives a `Blueprint` object that may be used to define the new table:

```javascript
    schema.create('users', (table)=> {
        table.increments('id');
    });
```

Of course, when creating the table, you may use any of the schema builder's [column methods](#creating-columns) to define the table's columns.

#### Checking For Table / Column Existence

#### Storage Engine

You may use the `engine` property on the schema builder to define the table's storage engine:

```javascript
    schema.create('users', (table)=> {
        table.engine = 'InnoDB';
        table.increments('id');
    });
```

<a name="renaming-and-dropping-tables"></a>
### Renaming / Dropping Tables

To rename an existing database table, use the `rename` method:
```javascript
    schema.rename(from, to);
```
To drop an existing table, you may use the `drop` or `dropIfExists` methods:

```javascript
    schema.drop('users');

    schema.dropIfExists('users');
```

#### Renaming Tables With Foreign Keys

Before renaming a table, you should verify that any foreign key constraints on the table have an explicit name in your migration files instead of letting Tramp assign a convention based name. Otherwise, the foreign key constraint name will refer to the old table name.

<a name="columns"></a>
## Columns

<a name="creating-columns"></a>
### Creating Columns

The `table` method on the `schema` may be used to update existing tables. Like the `create` method, the `table` method accepts two arguments: the name of the table and a `Closure` that receives a `Blueprint` instance you may use to add columns to the table:
```javascript
    schema.table('users', (table) => {
        table.string('email');
    });
```
#### Available Column Types

Of course, the schema builder contains a variety of column types that you may specify when building your tables:

Command  | Description
------------- | -------------
`table.bigIncrements('id');`  |  Incrementing ID (primary key) using a "UNSIGNED BIG INTEGER" equivalent.
`table.bigInteger('votes');`  |  BIGINT equivalent for the database.
`table.binary('data');`  |  BLOB equivalent for the database.
`table.boolean('confirmed');`  |  BOOLEAN equivalent for the database.
`table.char('name', 4);`  |  CHAR equivalent with a length.
`table.date('created_at');`  |  DATE equivalent for the database.
`table.dateTime('created_at');`  |  DATETIME equivalent for the database.
`table.dateTimeTz('created_at');`  |  DATETIME (with timezone) equivalent for the database.
`table.decimal('amount', 5, 2);`  |  DECIMAL equivalent with a precision and scale.
`table.double('column', 15, 8);`  |  DOUBLE equivalent with precision, 15 digits in total and 8 after the decimal point.
`table.enum('choices', ['foo', 'bar']);` | ENUM equivalent for the database.
`table.float('amount', 8, 2);`  |  FLOAT equivalent for the database, 8 digits in total and 2 after the decimal point.
`table.increments('id');`  |  Incrementing ID (primary key) using a "UNSIGNED INTEGER" equivalent.
`table.integer('votes');`  |  INTEGER equivalent for the database.
`table.ipAddress('visitor');`  |  IP address equivalent for the database.
`table.json('options');`  |  JSON equivalent for the database.
`table.jsonb('options');`  |  JSONB equivalent for the database.
`table.longText('description');`  |  LONGTEXT equivalent for the database.
`table.macAddress('device');`  |  MAC address equivalent for the database.
`table.mediumIncrements('id');`  |  Incrementing ID (primary key) using a "UNSIGNED MEDIUM INTEGER" equivalent.
`table.mediumInteger('numbers');`  |  MEDIUMINT equivalent for the database.
`table.mediumText('description');`  |  MEDIUMTEXT equivalent for the database.
`table.smallIncrements('id');`  |  Incrementing ID (primary key) using a "UNSIGNED SMALL INTEGER" equivalent.
`table.smallInteger('votes');`  |  SMALLINT equivalent for the database.
`table.softDeletes();`  |  Adds nullable `deleted_at` column for soft deletes.
`table.string('email');`  |  VARCHAR equivalent column.
`table.string('name', 100);`  |  VARCHAR equivalent with a length.
`table.text('description');`  |  TEXT equivalent for the database.
`table.time('sunrise');`  |  TIME equivalent for the database.
`table.timeTz('sunrise');`  |  TIME (with timezone) equivalent for the database.
`table.tinyInteger('numbers');`  |  TINYINT equivalent for the database.
`table.timestamp('added_on');`  |  TIMESTAMP equivalent for the database.
`table.timestampTz('added_on');`  |  TIMESTAMP (with timezone) equivalent for the database.
`table.unsignedBigInteger('votes');`  |  Unsigned BIGINT equivalent for the database.
`table.unsignedInteger('votes');`  |  Unsigned INT equivalent for the database.
`table.unsignedMediumInteger('votes');`  |  Unsigned MEDIUMINT equivalent for the database.
`table.unsignedSmallInteger('votes');`  |  Unsigned SMALLINT equivalent for the database.
`table.unsignedTinyInteger('votes');`  |  Unsigned TINYINT equivalent for the database.
`table.uuid('id');`  |  UUID equivalent for the database.

<a name="column-modifiers"></a>
### Column Modifiers

In addition to the column types listed above, there are several column "modifiers" you may use while adding a column to a database table. For example, to make the column "nullable", you may use the `nullable` method:

    Schema::table('users', function (Blueprint $table) {
        table.string('email')->nullable();
    });

Below is a list of all the available column modifiers. This list does not include the [index modifiers](#creating-indexes):

Modifier  | Description
------------- | -------------
`.after('column')`  |  Place the column "after" another column (MySQL Only)
`.comment('my comment')`  |  Add a comment to a column
`.default($value)`  |  Specify a "default" value for the column
`.first()`  |  Place the column "first" in the table (MySQL Only)
`.nullable()`  |  Allow NULL values to be inserted into the column
`.storedAs(expression)`  |  Create a stored generated column (MySQL Only)
`.unsigned()`  |  Set `integer` columns to `UNSIGNED`
`.virtualAs(expression)`  |  Create a virtual generated column (MySQL Only)

<a name="changing-columns"></a>
<a name="modifying-columns"></a>
### Modifying Columns

#### Updating Column Attributes

The `change` method allows you to modify some existing column types to a new type or modify the column's attributes. For example, you may wish to increase the size of a string column. To see the `change` method in action, let's increase the size of the `name` column from 25 to 50:

```javascript
    schema::table('users', (table) => {
        table.string('name', 50)->change();
    });
```

We could also modify a column to be nullable:
```javascript
    schema.table('users', (table) => {
        table.string('name', 50)->nullable()->change();
    });
```

<a name="renaming-columns"></a>
#### Renaming Columns

To rename a column, you may use the `renameColumn` method on the Schema builder:

```javascript
    schema.table('users', (table) => {
        table.renameColumn('from', 'to');
    });
```

<a name="dropping-columns"></a>
### Dropping Columns

To drop a column, use the `dropColumn` method on the Schema builder:
```javascript
    Schema::table('users', function (Blueprint $table) {
        table.dropColumn('votes');
    });
```
You may drop multiple columns from a table by passing an array of column names to the `dropColumn` method:

```javascript
    schema.table('users', (table) => {
        table.dropColumn(['votes', 'avatar', 'location']);
    });
```

> {note} Dropping or modifying multiple columns within a single migration while using a SQLite database is not supported.

<a name="indexes"></a>
## Indexes

<a name="creating-indexes"></a>
### Creating Indexes

The schema builder supports several types of indexes. First, let's look at an example that specifies a column's values should be unique. To create the index, we can simply chain the `unique` method onto the column definition:

```javascript
    table.string('email')->unique();
```

Alternatively, you may create the index after defining the column. For example:

```javascript
    table.unique('email');
```

You may even pass an array of columns to an index method to create a compound index:

```javascript
    table.index(['account_id', 'created_at']);
```

Tramp will automatically generate a reasonable index name, but you may pass a second argument to the method to specify the name yourself:

```javascript
    table.index('email', 'my_index_name');
```

#### Available Index Types

Command  | Description
------------- | -------------
`table.primary('id');`  |  Add a primary key.
`table.primary(['first', 'last']);`  |  Add composite keys.
`table.unique('email');`  |  Add a unique index.
`table.unique('state', 'my_index_name');`  |  Add a custom index name.
`table.unique(['first', 'last']);`  |  Add a composite unique index.
`table.index('state');`  |  Add a basic index.

<a name="dropping-indexes"></a>
### Dropping Indexes

To drop an index, you must specify the index's name. By default, Tramp automatically assigns a reasonable name to the indexes. Simply concatenate the table name, the name of the indexed column, and the index type. Here are some examples:

Command  | Description
------------- | -------------
`table.dropPrimary('users_id_primary');`  |  Drop a primary key from the "users" table.
`table.dropUnique('users_email_unique');`  |  Drop a unique index from the "users" table.
`table.dropIndex('geo_state_index');`  |  Drop a basic index from the "geo" table.

If you pass an array of columns into a method that drops indexes, the conventional index name will be generated based on the table name, columns and key type:

```javascript
    schema.table('geo', (table) => {
        table.dropIndex(['state']); // Drops index 'geo_state_index'
    });
```

<a name="foreign-key-constraints"></a>
### Foreign Key Constraints

Tramp also provides support for creating foreign key constraints, which are used to force referential integrity at the database level. For example, let's define a `user_id` column on the `posts` table that references the `id` column on a `users` table:

```javascript
    schema.table('posts', (table) => {
        table.integer('user_id')->unsigned();

        table.foreign('user_id')->references('id')->on('users');
    });
```

You may also specify the desired action for the "on delete" and "on update" properties of the constraint:

```javascript
    table.foreign('user_id')
          ->references('id')->on('users')
          ->onDelete('cascade');
```

To drop a foreign key, you may use the `dropForeign` method. Foreign key constraints use the same naming convention as indexes. So, we will concatenate the table name and the columns in the constraint then suffix the name with "_foreign":

```javascript
    table.dropForeign('posts_user_id_foreign');
```

Or, you may pass an array value which will automatically use the conventional constraint name when dropping:

```javascript
    table.dropForeign(['user_id']);
```

You may enable or disable foreign key constraints within your migrations by using the following methods:

```javascript
    schema.enableForeignKeyConstraints();

    schema.disableForeignKeyConstraints();
```