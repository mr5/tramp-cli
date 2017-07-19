import { isArray, map, clone, each } from 'lodash'

class Base {

  toQuery (tz) {
    let data = this.toSQL(this._method, tz);
    if (!isArray(data)) data = [data];
    return map(data, (statement) => {
      return this.client._formatQuery(statement.sql, statement.bindings, tz);
    }).join(';\n');
  }

  // Create a new instance of the `Runner`, passing in the current object.
  then (/* onFulfilled, onRejected */) {
    const result = this.client.runner(this).run()
    return result.then.apply(result, arguments);
  }

  // Add additional "options" to the builder. Typically used for client specific
  // items, like the `mysql` and `sqlite3` drivers.
  options (opts) {
    this._options = this._options || [];
    this._options.push(clone(opts) || {});
    return this;
  }

  // Sets an explicit "connnection" we wish to use for this query.
  connection (connection) {
    this._connection = connection;
    return this;
  }

  // Set a debug flag for the current knex_schema query stack.
  debug (enabled) {
    this._debug = arguments.length ? enabled : true;
    return this;
  }

  // Set the transaction object for this query.
  transacting (t) {
    if (t && t.client) {
      if (!t.client.transacting) {
        helpers.warn(`Invalid transaction value: ${t.client}`)
      } else {
        this.client = t.client
      }
    }
    return this;
  }

  // Initializes a stream.
  stream (options) {
    return this.client.runner(this).stream(options);
  }

  // Initialize a stream & pipe automatically.
  pipe (writable, options) {
    return this.client.runner(this).pipe(writable, options);
  }

}


// Creates a method which "coerces" to a promise, by calling a
// "then" method on the current `Target`
each(['bind', 'catch', 'finally', 'asCallback',
  'spread', 'map', 'reduce', 'tap', 'thenReturn',
  'return', 'yield', 'ensure', 'reflect',
  'get', 'mapSeries', 'delay'], function(method) {
  Target.prototype[method] = function() {
    const promise = this.then();
    return promise[method].apply(promise, arguments);
  };
});
