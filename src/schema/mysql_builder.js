import Builder from './builder';
export default class MysqlBuilder extends Builder {
  async hasTable(tableName) {
    const table = `${this.connection.getTablePrefix()}${tableName}`;
    return (await this.connection.query(
        this.grammar.compileTableExists(),
        [this.connection.getDatabaseName(), table]
      )).length > 0;
  }

  async getColumnListing(tableName) {
    const table = `${this.connection.getTablePrefix()}${tableName}`;
    return this.connection.query(
      this.grammar.compileColumnListing(),
      [this.connection.getDatabaseName(), table]
    );
  }
}
