import mysql from 'promise-mysql';
import { client } from 'mysql';
import MysqlGrammar from '../schema/grammars/mysql_grammar';
import MysqlBuilder from '../schema/mysql_builder';
import Connection from './index';

export default class MysqlConnection extends Connection {

  async connect() {
    if (!this.dialectConnection) {
      this.dialectConnection = await mysql.createConnection(Object.assign({
        flags: 'MULTI_STATEMENTS'
      }, this.getConfig('connection')));
    }
  }

  getSchemaGrammar() {
    if (!this.schemaGrammar) {
      this.schemaGrammar = new MysqlGrammar(this.getConfig('tablePrefix', ''));
    }

    return this.schemaGrammar;
  }

  getSchemaBuilder() {
    if (!this.schemaBuilder) {
      this.schemaBuilder = new MysqlBuilder(this);
    }
    return this.schemaBuilder;
  }

  /**
   *
   * @param sql
   * @param binding
   * @returns {Promise.<void>}
   */
  async query(sql, binding = {}) {
    return this.dialectConnection.query(sql, binding);
  }

  async close() {
    try {
      if (this.dialectConnection) {
        await this.dialectConnection.destroy();
      }
    } catch (e) {
    }
  }
}
