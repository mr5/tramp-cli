import Builder from '../schema/builder';

export default class Connection {
  constructor(config) {
    this.config = Object.assign({
      dialect: 'mysql',
      forceReview: true
    }, config);
  }

  getConfig(name, defaultValue = null) {
    return this.config[name] || defaultValue;
  }

  getTablePrefix() {
    return this.getConfig('tablePrefix', '');
  }

  getDatabaseName() {
    return this.getConfig('connection').database;
  }

  async connect() {
    throw new Error('Method is not implemented.');
  }

  /**
   *
   * @returns {Builder}
   */
  getSchemaBuilder() {
    return new Builder(this);
  }

  getSchemaGrammar() {
    throw new Error('Method is not implemented.');
  }

  /**
   *
   * @param sql
   * @returns {Promise.<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async query(sql, binding) {
    throw new Error('Method is not implemented.');
  }

  async close() {
    throw new Error('Method is not implemented.');
  }
}
