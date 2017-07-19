export default class Schema {
  constructor(knex, database) {
    this.knex = knex;
    this.database = database;
    this.sequence = [];
  }

  createTable(name, fn) {
    const builder = this.knex.client.tableBuilder('create', name, fn);
    builder.setSchema(this.database);
    for (const sql of builder.toSQL()) {
      this.sequence.push(sql.sql);
    }
  }

  alterTable(name, fn) {
    const builder = this.knex.client.tableBuilder('alter', name, fn);
    builder.setSchema(this.database);
    console.log(builder.toSQL());
    for (const sql of builder.toSQL()) {
      this.sequence.push(sql.sql);
    }
  }

  raw(sql) {
    this.sequence.push(sql);
  }
}
