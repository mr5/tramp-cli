import _ from 'lodash';
import Builder from './builder';
import Column from './column';

export default class Blueprint {
  constructor(table, callback) {
    this.table = table;
    this.columns = [];
    this.commands = [];
    this.engine = null;
    this.charset = null;
    this.collation = null;
    this.temporary = false;
    if (callback) {
      callback(this);
    }
  }

  toSql(connection) {
    this.addImpliedCommands();
    const statements = [];
    this.commands.forEach((command) => {
      const method = `compile${_.upperFirst(command.get('name'))}`;
      if (_.isFunction(connection.getSchemaGrammar()[method])) {
        statements.push(`${connection.getSchemaGrammar()[method](this, command, connection)};`);
      }
    });
    return statements;
  }

  addImpliedCommands() {
    if (this.getAddedColumns().length > 0 && !this.creating()) {
      this.commands.unshift(this.createCommand('add'));
    }
    if (this.getChangedColumns().length > 0 && !this.creating()) {
      this.commands.unshift(this.createCommand('change'));
    }
    this.addFluentIndexes();
  }

  addFluentIndexes() {
    this.columns.forEach((column) => {
      for (const index of ['primary', 'unique', 'index']) {
        // column[index] === true
        if (column.get(index) === true) {
          this[index](column.get('name'));
          break;
        } else if (column.get(index)) {
          this[index](column.get('name'), column.get(index));
          break;
        }
      }
    });
  }

  creating() {
    return this.commands.filter(command => command.get('name') === 'create').length > 0;
  }

  create() {
    return this.addCommand('create');
  }

  temporary() {
    this.temporary = true;
  }

  drop() {
    this.addCommand('drop');
  }

  dropIfExists() {
    this.addCommand('dropIfExists');
  }

  dropColumn(columns) {
    return this.addCommand('dropColumn', {
      columns
    });
  }

  renameColumn(from, to) {
    return this.addCommand('renameColumn', { from, to });
  }

  dropPrimary(index = null) {
    return this.dropIndexCommand('dropPrimary', 'primary', index);
  }

  dropUnique(index) {
    return this.dropIndexCommand('dropUnique', 'unique', index);
  }

  dropIndex(index) {
    return this.dropIndexCommand('dropIndex', 'index', index);
  }

  dropForeign(index) {
    return this.dropIndexCommand('dropForeign', 'foreign', index);
  }

  rename(to) {
    return this.addCommand('rename', { to });
  }

  primary(columns, name = null, algorithm = null) {
    return this.indexCommand('primary', columns, name, algorithm);
  }

  unique(columns, name = null, algorithm = null) {
    return this.indexCommand('unique', columns, name, algorithm);
  }

  index(columns, name = null, algorithm = null) {
    return this.indexCommand('index', columns, name, algorithm);
  }

  foreign(columns, name = null) {
    return this.indexCommand('foreign', columns, name);
  }

  increments(column) {
    return this.unsignedInteger(column, true);
  }

  /**
   * Create a new auto-incrementing tiny integer (1-byte) column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  tinyIncrements(column) {
    return this.unsignedTinyInteger(column, true);
  }

  /**
   * Create a new auto-incrementing small integer (2-byte) column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  smallIncrements(column) {
    return this.unsignedSmallInteger(column, true);
  }

  /**
   * Create a new auto-incrementing medium integer (3-byte) column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  mediumIncrements(column) {
    return this.unsignedMediumInteger(column, true);
  }

  /**
   * Create a new auto-incrementing big integer (8-byte) column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  bigIncrements(column) {
    return this.unsignedBigInteger(column, true);
  }

  /**
   * Create a new char column on the table.
   *
   * @param  {string}    column
   * @param  {integer}    length
   * @return {Object}
   */
  char(column, length = null) {
    return this.addColumn('char', column, { length: length || Builder.defaultStringLength });
  }

  /**
   * Create a new  {string}    column on the table.
   *
   * @param  {string}    column
   * @param  {integer}    length
   * @return {Object}
   */
  string(column, length = null) {
    return this.addColumn('string', column, { length: length || Builder.defaultStringLength });
  }

  /**
   * Create a new text column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  text(column) {
    return this.addColumn('text', column);
  }

  /**
   * Create a new medium text column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  mediumText(column) {
    return this.addColumn('mediumText', column);
  }

  /**
   * Create a new long text column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  longText(column) {
    return this.addColumn('longText', column);
  }

  /**
   * Create a new integer (4-byte) column on the table.
   *
   * @param  {string}    column
   * @param  {boolean}    autoIncrement
   * @param  {boolean}    unsigned
   * @return {Object}
   */
  integer(column, autoIncrement = false, unsigned = false) {
    return this.addColumn('integer', column, { autoIncrement, unsigned });
  }

  /**
   * Create a new tiny integer (1-byte) column on the table.
   *
   * @param  {string}    column
   * @param  {boolean}    autoIncrement
   * @param  {boolean}    unsigned
   * @return {Object}
   */
  tinyInteger(column, autoIncrement = false, unsigned = false) {
    return this.addColumn('tinyInteger', column, { autoIncrement, unsigned });
  }

  /**
   * Create a new small integer (2-byte) column on the table.
   *
   * @param  {string}    column
   * @param  {boolean}    autoIncrement
   * @param  {boolean}    unsigned
   * @return {Object}
   */
  smallInteger(column, autoIncrement = false, unsigned = false) {
    return this.addColumn('smallInteger', column, { autoIncrement, unsigned });
  }

  /**
   * Create a new medium integer (3-byte) column on the table.
   *
   * @param  {string}    column
   * @param  {boolean}    autoIncrement
   * @param  {boolean}    unsigned
   * @return {Object}
   */
  mediumInteger(column, autoIncrement = false, unsigned = false) {
    return this.addColumn('mediumInteger', column, { autoIncrement, unsigned });
  }

  /**
   * Create a new big integer (8-byte) column on the table.
   *
   * @param  {string}    column
   * @param  {boolean}    autoIncrement
   * @param  {boolean}    unsigned
   * @return {Object}
   */
  bigInteger(column, autoIncrement = false, unsigned = false) {
    return this.addColumn('bigInteger', column, { autoIncrement, unsigned });
  }

  /**
   * Create a new unsigned integer (4-byte) column on the table.
   *
   * @param  {string}    column
   * @param  {boolean}    autoIncrement
   * @return {Object}
   */
  unsignedInteger(column, autoIncrement = false) {
    return this.integer(column, autoIncrement, true);
  }

  /**
   * Create a new unsigned tiny integer (1-byte) column on the table.
   *
   * @param  {string}    column
   * @param  {boolean}    autoIncrement
   * @return {Object}
   */
  unsignedTinyInteger(column, autoIncrement = false) {
    return this.tinyInteger(column, autoIncrement, true);
  }

  /**
   * Create a new unsigned small integer (2-byte) column on the table.
   *
   * @param  {string}    column
   * @param  {boolean}    autoIncrement
   * @return {Object}
   */
  unsignedSmallInteger(column, autoIncrement = false) {
    return this.smallInteger(column, autoIncrement, true);
  }

  /**
   * Create a new unsigned medium integer (3-byte) column on the table.
   *
   * @param  {string}    column
   * @param  {boolean}    autoIncrement
   * @return {Object}
   */
  unsignedMediumInteger(column, autoIncrement = false) {
    return this.mediumInteger(column, autoIncrement, true);
  }

  /**
   * Create a new unsigned big integer (8-byte) column on the table.
   *
   * @param  {string}    column
   * @param  {boolean}    autoIncrement
   * @return {Object}
   */
  unsignedBigInteger(column, autoIncrement = false) {
    return this.bigInteger(column, autoIncrement, true);
  }

  /**
   * Create a new float column on the table.
   *
   * @param  {string}    column
   * @param  {number}    total
   * @param  {number}    places
   * @return {Object}
   */
  float(column, total = 8, places = 2) {
    return this.addColumn('float', column, { total, places });
  }

  /**
   * Create a new double column on the table.
   *
   * @param  {string}    column
   * @param  {number|null}    total
   * @param  {number|null} places
   * @return {Object}
   */
  double(column, total = null, places = null) {
    return this.addColumn('double', column, { total, places });
  }

  /**
   * Create a new decimal column on the table.
   *
   * @param  {string}    column
   * @param  {number}    total
   * @param  {number}    places
   * @return {Object}
   */
  decimal(column, total = 8, places = 2) {
    return this.addColumn('decimal', column, { total, places });
  }

  /**
   * Create a new boolean column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  boolean(column) {
    return this.addColumn('boolean', column);
  }

  /**
   * Create a new enum column on the table.
   *
   * @param  {string}    column
   * @param  {Array}   allowed
   * @return {Object}
   */
  enum(column, allowed) {
    return this.addColumn('enum', column, { allowed });
  }

  /**
   * Create a new json column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  json(column) {
    return this.addColumn('json', column);
  }

  /**
   * Create a new jsonb column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  jsonb(column) {
    return this.addColumn('jsonb', column);
  }

  /**
   * Create a new date column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  date(column) {
    return this.addColumn('date', column);
  }

  /**
   * Create a new date-time column on the table.
   *
   * @param  {string}    column
   * @param  {number}   precision
   * @return {Object}
   */
  dateTime(column, precision = 0) {
    return this.addColumn('dateTime', column, { precision });
  }

  /**
   * Create a new date-time column (with time zone) on the table.
   *
   * @param  {string}    column
   * @param  {number}   precision
   * @return {Object}
   */
  dateTimeTz(column, precision = 0) {
    return this.addColumn('dateTimeTz', column, { precision });
  }

  /**
   * Create a new time column on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  time(column) {
    return this.addColumn('time', column);
  }

  /**
   * Create a new time column (with time zone) on the table.
   *
   * @param  {string}    column
   * @return {Object}
   */
  timeTz(column) {
    return this.addColumn('timeTz', column);
  }

  binary(column) {
    return this.addColumn('binary', column);
  }

  /**
   * Create a new uuid column on the table.
   *
   * @param  {string} column
   * @return {Column}
   */
  uuid(column) {
    return this.addColumn('uuid', column);
  }

  /**
   * Create a new IP address column on the table.
   *
   * @param  {string}  column
   * @return {Column}
   */
  ipAddress(column) {
    return this.addColumn('ipAddress', column);
  }

  /**
   * Create a new MAC address column on the table.
   *
   * @param  {string}  column
   * @return {Column}
   */
  macAddress(column) {
    return this.addColumn('macAddress', column);
  }

  createIndexName(type, columns) {
    let columnArray = columns;
    if (_.isString(columnArray)) {
      columnArray = [columnArray];
    }
    const index = [this.table, columnArray.join('_'), type].join('_');
    return index.replace(/[-.]/, '_');
  }

  addColumn(type, name, parameters = {}) {
    const column = new Column(Object.assign({
      type, name
    }, parameters));
    this.columns.push(column);
    return column;
  }

  removeColumn(name) {
    this.columns = this.columns.filter(column => column.name !== name);

    return this;
  }

  addCommand(name, parameters = {}) {
    const command = this.createCommand(name, parameters);
    this.commands.push(command);
    return command;
  }

  createCommand(name, parameters = {}) {
    return new Column(Object.assign({ name }, parameters));
  }

  getTable() {
    return this.table;
  }

  getColumns() {
    return this.columns;
  }

  getCommands() {
    return this.commands;
  }

  getAddedColumns() {
    return this.columns.filter(column => !column.get('change'));
  }

  getChangedColumns() {
    return this.columns.filter(column => Boolean(column.get('change')));
  }

  indexCommand(type, columns, index, algorithm = null) {
    // If no name was specified for this index, we will create one using a basic
    // convention of the table name, followed by the columns, followed by an
    // index type, such as primary or index, which makes the index unique.
    index = index || this.createIndexName(type, columns); // eslint-disable-line no-param-reassign

    return this.addCommand(
      type, { index, columns, algorithm }
    );
  }

  dropIndexCommand(command, type, index) {
    let columns = [];

    // If the given "index" is actually an array of columns, the developer means
    // to drop an index merely by specifying the columns involved without the
    // conventional name, so we will build the index name from the columns.
    if (Array.isArray(index)) {
      columns = index;
      index = this.createIndexName(type, columns); // eslint-disable-line no-param-reassign
    }

    return this.indexCommand(command, columns, index);
  }
}
