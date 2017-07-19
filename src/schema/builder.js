import _ from 'lodash';
import Blueprint from './blueprint';
import Expression from '../expression';
export default class Builder {
  constructor(connection) {
    this.sequences = [];
    this.connection = connection;
    this.grammar = this.connection.getSchemaGrammar();
  }

  table(table, callback) {
    this.sequences.push(this.createBlueprint(table, callback));
  }

  create(table, callback) {
    this.sequences.push(this.createBlueprint(table, (blueprint) => {
      blueprint.create();
      callback(blueprint);
    }));
  }

  drop(table) {
    this.sequences.push(this.createBlueprint(table, (blueprint) => {
      blueprint.drop();
    }));
  }

  dropIfExists(table) {
    this.sequences.push(this.createBlueprint(table, (blueprint) => {
      blueprint.dropIfExists();
    }));
  }

  rename(from, to) {
    this.sequences.push(this.createBlueprint(from, (blueprint) => {
      blueprint.rename(to);
    }));
  }

  toSql() {
    let sqls = [];
    this.sequences.forEach((blueprint) => {
      if (_.isString(blueprint)) {
        sqls.push(blueprint);
        return;
      }
      if (blueprint instanceof Expression) {
        sqls.push(blueprint.getValue());
        return;
      }
      sqls = sqls.concat(blueprint.toSql(this.connection, this.grammar));
    });
    return sqls;
  }

  raw(sql) {
    this.sequences.push(this.literal(sql));
  }

  literal(sql) {
    return this.grammar.literal(sql);
  }

  createBlueprint(table, callback = null) {
    return new Blueprint(table, callback);
  }

  async execute() {
    while (this.sequences.length > 0) {
      let sql = this.sequences.shift().toSql(this.connection);
      if (typeof sql === 'string') {
        sql = [sql];
      }
      sql.forEach(async (subSql) => {
        await this.connection.query(subSql);
      });
    }
  }
}

Builder.defaultStringLength = 255;
