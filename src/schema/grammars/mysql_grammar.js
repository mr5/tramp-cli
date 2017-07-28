import fs from 'fs';
import Column from '../column';
import Grammar from './grammar';

export default class MysqlGrammar extends Grammar {
  /**
   * The possible column modifiers.
   *
   * @returns {[string,string,string,string,string,string,string,string,string,string,string]}
   */
  modifiers() {
    return [
      'VirtualAs', 'StoredAs', 'Unsigned', 'Charset', 'Collation', 'Nullable',
      'Default', 'AutoIncrement', 'Comment', 'After', 'First'
    ];
  }

  /**
   * The possible column serials.
   *
   * @returns {string[]}
   */
  serials() {
    return ['bigInteger', 'integer', 'mediumInteger', 'smallInteger', 'tinyInteger'];
  }

  /**
   *
   * @param {Blueprint} blueprint
   * @param command
   * @returns {string}
   */
  // eslint-disable-next-line no-unused-vars
  compileChange(blueprint, command) {
    let sql = '';
    for (const column of blueprint.getChangedColumns()) {
      if (sql) {
        sql += ';\n\n';
      }
      let typeStr = 'NULL';
      if (column.has('type')) {
        typeStr = JSON.stringify(this.getType(column));
      }
      sql += `/* Change column: ${column.get('name')}, NOTICE: NULL means kept property */ 
      SET @ddl_sql=TRAMP_ALTER_COLUMN(
        /* table_name */ '${blueprint.getTable()}', 
        /* column_name */ '${column.get('name')}', 
        /* new_name */ ${column.has('newName') ? JSON.stringify(column.get('newName')) : 'NULL'}, 
        /* new_type */ ${typeStr}, 
        /* new_charset */ ${column.has('charset') ? JSON.stringify(this.modifyCharset(blueprint, column)) : 'NULL'}, 
        /* new_collation */ ${column.has('collation') ? JSON.stringify(this.modifyCollation(blueprint, column)) : 'NULL'}, 
        /* new_nullable */ ${column.has('nullable') ? JSON.stringify(this.modifyNullable(blueprint, column)) : 'NULL'}, 
        /* new_extra */ NULL, 
        /* new_default */ ${column.has('default') ? JSON.stringify(this.modifyDefault(blueprint, column)) : 'NULL'}, 
        /* new_comment */ ${column.has('comment') ? JSON.stringify(this.modifyComment(blueprint, column)) : 'NULL'}
      ); 
      PREPARE stmt FROM @ddl_sql; SET @ddl_sql=''; EXECUTE stmt; DROP PREPARE stmt`;
    }
    return sql;
  }

  /**
   * Get the SQL for a "comment" table command.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Column}  command
   * @return {string|null}
   */
  // eslint-disable-next-line no-unused-vars
  compileComment(blueprint, command) {
    const comment = this.modifyComment(blueprint, command);
    return comment === null
      ? null
      : `ALTER TABLE ${blueprint.getTable()} ${comment}`;
  }

  // eslint-disable-next-line no-unused-vars
  compileRenameColumn(blueprint, command, connection) {
    return `/* Rename column: ${command.get('from')}, NOTICE: NULL means kept property */
      SET @ddl_sql=TRAMP_ALTER_COLUMN(
        /* table_name */ '${blueprint.getTable()}',
        /* column_name */ '${command.get('from')}',
        /* new_name */ '${command.get('to')}',
        /* new_type */ NULL,
        /* new_charset */ NULL,
        /* new_collation */ NULL,
        /* new_nullable */ NULL,
        /* new_extra */ NULL,
        /* new_default */ NULL,
        /* new_comment */ NULL
      );
      PREPARE stmt FROM @ddl_sql; SET @ddl_sql=''; EXECUTE stmt; DROP PREPARE stmt`;
  }

  compileTableExists() {
    return 'SELECT * FROM information_schema.tables WHERE table_schema = ? and table_name = ?';
  }

  compileColumnListing() {
    return 'SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?';
  }

  compileCreate(blueprint, command, connection) {
    let sql = this.compileCreateTable(
      blueprint, command, connection
    );

    // Once we have the primary SQL, we can add the encoding option to the SQL for
    // the table.  Then, we can check if a storage engine has been supplied for
    // the table. If so, we will add the engine declaration to the SQL query.
    sql = this.compileCreateEncoding(
      sql, connection, blueprint
    );

    // Finally, we will append the engine configuration onto this SQL statement as
    // the final thing we do before returning this finished SQL. Once this gets
    // added the query will be ready to execute against the real connections.
    sql = this.compileCreateEngine(
      sql, connection, blueprint
    );

    return this.compileCreateComment(sql, connection, blueprint);
  }

  compileCreateTable(blueprint) {
    return `${blueprint.temporary ? 'CREATE TEMPORARY' : 'CREATE'} TABLE ${this.wrapTable(blueprint)} (${this.getColumns(blueprint).join(', ')}) ${this.modifyComment(null, new Column({ comment: blueprint.tableComment }))}`;
  }

  compileCreateEncoding(sql, connection, blueprint) {
    let newSql = sql;
    if (blueprint.tableCharset) {
      newSql += ` DEFAULT CHARACTER SET ${blueprint.tableCharset}`;
    } else if (connection.getConfig('charset')) {
      newSql += ` DEFAULT CHARACTER SET ${connection.getConfig('charset')}`;
    }

    if (blueprint.tableCollation) {
      newSql += ` COLLATE ${blueprint.tableCollation}`;
    } else if (connection.getConfig('collation')) {
      newSql += ` COLLATE ${connection.getConfig('collation')}`;
    }

    return newSql;
  }

  compileCreateComment(sql, connection, blueprint) {
    let newSql = sql;
    if (blueprint.tableComment !== null) {
      newSql += ` ${this.modifyComment(blueprint, new Column({ comment: blueprint.tableComment }))}`;
    }

    return newSql;
  }

  compileCreateEngine(sql, connection, blueprint) {
    if (blueprint.tableEngine) {
      return `${sql} ENGINE = ${blueprint.tableEngine}`;
    } else if (connection.getConfig('engine')) {
      return `${sql} ENGINE = ${connection.getConfig('engine')}`;
    }

    return sql;
  }

  // eslint-disable-next-line no-unused-vars
  compileAdd(blueprint, command) {
    const columns = this.prefixArray('ADD', this.getColumns(blueprint));

    return `ALTER TABLE ${this.wrapTable(blueprint)} ${columns.join(', ')}`;
  }

  compilePrimary(blueprint, command) {
    command.set('name', null);
    return this.compileKey(blueprint, command, 'PRIMARY KEY');
  }

  compileUnique(blueprint, command) {
    return this.compileKey(blueprint, command, 'UNIQUE');
  }

  compileIndex(blueprint, command) {
    return this.compileKey(blueprint, command, 'INDEX');
  }

  compileKey(blueprint, command, type) {
    return [
      'ALTER TABLE',
      this.wrapTable(blueprint),
      'ADD',
      type,
      this.wrap(command.get('index')),
      command.get('algorithm') ? `USING ${command.get('algorithm')}` : '',
      `(${this.columnize(command.get('columns')).trim()})`
    ].filter(item => !['', null, undefined].includes(item)).join(' ').trim();
  }

  // eslint-disable-next-line no-unused-vars
  compileDrop(blueprint, command) {
    return `DROP TABLE ${this.wrapTable(blueprint)}`;
  }

  // eslint-disable-next-line no-unused-vars
  compileDropIfExists(blueprint, command) {
    return `DROP TABLE IF EXISTS ${this.wrapTable(blueprint)}`;
  }

  compileDropColumn(blueprint, command) {
    const columns = this.prefixArray('DROP', this.wrapArray(command.get('columns')));
    return `ALTER TABLE ${this.wrapTable(blueprint)} ${columns.join(', ')}`;
  }

  // eslint-disable-next-line no-unused-vars
  compileDropPrimary(blueprint, command) {
    return `ALTER TABLE ${this.wrapTable(blueprint)} DROP PRIMARY KEY`;
  }

  compileDropUnique(bluebrint, command) {
    return this.compileDropIndex(bluebrint, command);
  }

  compileDropIndex(blueprint, command) {
    const index = this.wrap(command.get('index'));
    return `ALTER TABLE ${this.wrapTable(blueprint)} DROP INDEX ${index}`;
  }

  compileDropForeign(blueprint, command) {
    const index = this.wrap(command.get('index'));
    return `ALTER TABLE ${this.wrapTable(blueprint)} DROP FOREIGN KEY ${index}`;
  }

  compileRename(blueprint, command) {
    const from = this.wrapTable(blueprint);
    return `RENAME TABLE ${from} TO ${this.wrapTable(command.get('to'))}`;
  }

  compileEnableForeignKeyConstraints() {
    return 'SET FOREIGN_KEY_CHECKS=1;';
  }

  /**
   * Compile the command to disable foreign key constraints.
   *
   * @return string
   */
  compileDisableForeignKeyConstraints() {
    return 'SET FOREIGN_KEY_CHECKS=0;';
  }

  typeString(column) {
    return `VARCHAR(${column.get('length')})`;
  }

  /**
   * Create the column definition for a text type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeText(column) {
    return 'TEXT';
  }

  /**
   * Create the column definition for a medium text type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeMediumText(column) {
    return 'MEDIUMTEXT';
  }

  /**
   * Create the column definition for a long text type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeLongText(column) {
    return 'LONGTEXT';
  }

  /**
   * Create the column definition for a big integer type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeBigInteger(column) {
    return 'BIGINT';
  }

  /**
   * Create the column definition for an integer type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeInteger(column) {
    return 'INT';
  }

  /**
   * Create the column definition for a medium integer type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeMediumInteger(column) {
    return 'MEDIUMINT';
  }

  /**
   * Create the column definition for a tiny integer type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeTinyInteger(column) {
    return 'TINYINT';
  }

  /**
   * Create the column definition for a small integer type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeSmallInteger(column) {
    return 'SMALLINT';
  }

  /**
   * Create the column definition for a float type.
   *
   * @param  {Object}  column
   * @return string
   */
  typeFloat(column) {
    return this.typeDouble(column);
  }

  /**
   * Create the column definition for a double type.
   *
   * @param  {Object}  column
   * @return string
   */
  typeDouble(column) {
    if (column.get('total') && column.get('places')) {
      return `DOUBLE(${column.get('total')}, ${column.get('places')})`;
    }

    return 'DOUBLE';
  }

  /**
   * Create the column definition for a decimal type.
   *
   * @param  {Object}  column
   * @return string
   */
  typeDecimal(column) {
    return `DECIMAL(${column.get('total')}, ${column.get('places')})`;
  }

  /**
   * Create the column definition for a boolean type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeBoolean(column) {
    return 'TINYINT(1)';
  }

  /**
   * Create the column definition for an enum type.
   *
   * @param  {Object}  column
   * @return string
   */
  typeEnum(column) {
    return `ENUM('${column.get('allowed').join("', '")}')`;
  }

  /**
   * Create the column definition for a json type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeJson(column) {
    return 'JSON';
  }

  /**
   * Create the column definition for a jsonb type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeJsonb(column) {
    return 'JSON';
  }

  /**
   * Create the column definition for a date type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeDate(column) {
    return 'DATE';
  }

  /**
   * Create the column definition for a date-time type.
   *
   * @param  {Object}  column
   * @return string
   */
  typeDateTime(column) {
    return `DATETIME(${column.get('precision')})`;
  }

  /**
   * Create the column definition for a date-time type.
   *
   * @param  {Object}  column
   * @return string
   */
  typeDateTimeTz(column) {
    return `DATETIME(${column.get('precision')})`;
  }

  /**
   * Create the column definition for a time type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeTime(column) {
    return 'TIME';
  }

  /**
   * Create the column definition for a time type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeTimeTz(column) {
    return 'TIME';
  }

  /**
   * Create the column definition for a timestamp type.
   *
   * @param  {Object}  column
   * @return string
   */
  typeTimestamp(column) {
    if (column.get('useCurrent')) {
      return `TIMESTAMP(${column.get('precision')}) DEFAULT CURRENT_TIMESTAMP`;
    }

    return `TIMESTAMP(${column.get('precision')})`;
  }

  /**
   * Create the column definition for a timestamp type.
   *
   * @param  {Object}  column
   * @return string
   */
  typeTimestampTz(column) {
    if (column.get('useCurrent')) {
      return `TIMESTAMP(${column.get('precision')}) DEFAULT CURRENT_TIMESTAMP`;
    }

    return `TIMESTAMP(${column.get('precision')})`;
  }

  /**
   * Create the column definition for a binary type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeBinary(column) {
    return 'BLOB';
  }

  /**
   * Create the column definition for a uuid type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeUuid(column) {
    return 'CHAR(36)';
  }

  /**
   * Create the column definition for an IP address type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeIpAddress(column) {
    return 'VARCHAR(45)';
  }

  /**
   * Create the column definition for a MAC address type.
   *
   * @param  {Object}  column
   * @return string
   */
  // eslint-disable-next-line no-unused-vars
  typeMacAddress(column) {
    return 'VARCHAR(17)';
  }

  /**
   * Get the SQL for a generated virtual column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return string|null
   */
  // eslint-disable-next-line no-unused-vars
  modifyVirtualAs(blueprint, column) {
    if (column.get('virtualAs')) {
      return ` AS (${column.get('virtualAs')})`;
    }
    return null;
  }

  /**
   * Get the SQL for a generated stored column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return string|null
   */
  // eslint-disable-next-line no-unused-vars
  modifyStoredAs(blueprint, column) {
    if (column.get('storedAs')) {
      return ` AS (${column.get('storedAs')}) STORED`;
    }
    return null;
  }

  /**
   * Get the SQL for an unsigned column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return string|null
   */
  // eslint-disable-next-line no-unused-vars
  modifyUnsigned(blueprint, column) {
    if (!this.serials().includes(column.get('type'))) {
      throw new TypeError(`Unsigned modify for ${column.get('type')} is unsupported`);
    }
    if (column.get('unsigned')) {
      return ' UNSIGNED';
    }
    return null;
  }

  /**
   * Get the SQL for a character set column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return string|null
   */
  // eslint-disable-next-line no-unused-vars
  modifyCharset(blueprint, column) {
    if (column.has('charset')) {
      if (this.serials().includes(column.get('type'))) {
        throw new TypeError(`Charset modify for ${column.get('type')} is unsupported`);
      }
      return ` CHARACTER SET ${column.get('charset')}`;
    }
    return null;
  }

  /**
   * Get the SQL for a collation column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return string|null
   */
  // eslint-disable-next-line no-unused-vars
  modifyCollation(blueprint, column) {
    if (column.get('collation')) {
      if (this.serials().includes(column.get('type'))) {
        throw new TypeError(`Collation modify for ${column.get('type')} is unsupported`);
      }
      return ` COLLATE ${column.get('collation')}`;
    }
    return null;
  }

  /**
   * Get the SQL for a nullable column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return string|null
   */
  // eslint-disable-next-line no-unused-vars
  modifyNullable(blueprint, column) {
    if (!column.get('virtualAs') && !column.get('storedAs')) {
      return column.get('nullable') ? ' NULL' : ' NOT NULL';
    }
    return null;
  }

  /**
   * Get the SQL for a default column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return string|null
   */
  // eslint-disable-next-line no-unused-vars
  modifyDefault(blueprint, column) {
    if (column.has('default')) {
      return ` DEFAULT ${this.getDefaultValue(column.get('default'))}`;
    }
    return null;
  }

  /**
   * Get the SQL for an auto-increment column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return string|null
   */
  // eslint-disable-next-line no-unused-vars
  modifyAutoIncrement(blueprint, column) {
    if (this.serials().includes(column.get('type')) && column.get('autoIncrement')) {
      return ' AUTO_INCREMENT PRIMARY KEY';
    }
    return null;
  }

  /**
   * Get the SQL for a "first" column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return string|null
   */
  // eslint-disable-next-line no-unused-vars
  modifyFirst(blueprint, column) {
    if (column.get('first')) {
      return ' FIRST';
    }
    return null;
  }

  /**
   * Get the SQL for an "after" column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return string|null
   */
  // eslint-disable-next-line no-unused-vars
  modifyAfter(blueprint, column) {
    if (column.get('after')) {
      return ` AFTER ${this.wrap(column.get('after'))}`;
    }

    return null;
  }

  /**
   * Get the SQL for a "comment" column modifier.
   *
   * @param  {Blueprint}  blueprint
   * @param  {Object}  column
   * @return {string|null}
   */
  // eslint-disable-next-line no-unused-vars
  modifyComment(blueprint, column) {
    if (column.has('comment')) {
      return ` COMMENT '${column.get('comment')}'`;
    }

    return null;
  }

  /**
   * Wrap a single string in keyword identifiers.
   *
   * @param  {string}  value
   * @return {string}
   */
  wrapValue(value) {
    if (value !== '*') {
      return `\`${value.replace('`', '``')}\``;
    }

    return value;
  }

  getMigrationInitialSql() {
    return [
      'DROP FUNCTION IF EXISTS `TRAMP_ALTER_COLUMN`;',
      fs.readFileSync(`${__dirname}/mysql_initialize.sql`).toString()
    ];
  }
}
