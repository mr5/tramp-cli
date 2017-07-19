import _ from 'lodash';
import Blueprint from '../blueprint';
import BaseGrammar from '../../grammar';
import Expression from '../../expression';

export default class Grammar extends BaseGrammar {
  /**
   *
   * @param tablePrefix
   * @param {Connection} connection
   */
  constructor(tablePrefix, connection) {
    super(tablePrefix);
    this.transactions = false;
    this.connection = connection;
  }

  prefixArray(prefix, values) {
    return values.map(value => `${prefix} ${value}`);
  }

  wrapTable(table) {
    return super.wrapTable(
      table instanceof Blueprint ? table.getTable() : table
    );
  }

  wrap(value, prefixAlias = false) {
    return super.wrap(
      _.isObject(value) ? value.get('name') : value, prefixAlias
    );
  }

  compileForeign(blueprint, command) {
    // We need to prepare several of the elements of the foreign key definition
    // before we can create the SQL, such as wrapping the tables and convert
    // an array of columns to comma-delimited strings for the SQL queries.

    let sql = `alter table ${this.wrapTable(blueprint)} add constraint ${this.wrap(command.g('index'))} `
    // Once we have the initial portion of the SQL statement we will add on the
    // key name, table name, and referenced columns. These will complete the
    // main portion of the SQL statement and this SQL will almost be done.
    let references = command.g('references');
    if (!_.isArray(command.g('references'))) {
      references = [references];
    }
    sql += `foreign key (${this.columnize(command.g('columns'))}) references ${this.wrapTable(command.g('on'))} (${this.columnize(references)})`

    // Once we have the basic foreign key creation statement constructed we can
    // build out the syntax for what should happen on an update or delete of
    // the affected columns, which will get something like "cascade", etc.
    if (command.g('onDelete')) {
      sql += ` on delete ${command.g('onDelete')}`;
    }

    if (command.g('onUpdate')) {
      sql += ` on update ${command.g('onUpdate')}`;
    }

    return sql;
  }

  getColumns(blueprint) {
    const columns = [];
    blueprint.getAddedColumns().forEach((column) => {
      const sql = this.wrap(column) + ' ' + this.getType(column);
      columns.push(this.addModifiers(sql, blueprint, column));
    });

    return columns;
  }

  getType(column) {
    return this[`type${_.upperFirst(column.get('type'))}`](column);
  }

  addModifiers(sql, blueprint, column) {
    this.modifiers().forEach((modifier) => {
      const method = `modify${_.upperFirst(modifier)}`;
      if (column.has([_.lowerFirst(modifier)]) && _.isFunction(this[method])) {
        sql += this[method](blueprint, column) || '';
      }
    });
    return sql;
  }

  getCommandsByName(blueprint, name) {
    return blueprint.getCommands().filter(command => command.g('name') === name);
  }

  getDefaultValue(value) {
    if (value instanceof Expression) {
      return value;
    }
    if (value === null) {
      return 'null';
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    return `'${value}'`;
  }

  supportsSchemaTransactions() {
    return this.transactions;
  }

  compileTableExists() {
    throw new Error('`compileTableExists` has not been implemented for current grammar.');
  }

  literal(sql) {
    return new Expression(sql);
  }

  getMigrationInitialSql() {
    return null;
  }
}
