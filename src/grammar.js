import _ from 'lodash';
import Expression from './expression';

export default class Grammar {
  constructor(tablePrefix = '') {
    this.tablePrefix = tablePrefix;
  }

  wrapArray(values) {
    if (!_.isArray(values)) {
      values = [values];
    }
    return values.map(this.wrap.bind(this));
  }

  wrapTable(table) {
    if (!this.isExpression(table)) {
      return this.wrap(`${this.tablePrefix}${table}`, true);
    }

    return this.getValue(table);
  }

  wrap(value, prefixAlias = false) {
    if (this.isExpression(value)) {
      return this.getValue(value);
    }
    if (value.toLowerCase().includes(' as ')) {
      return this.wrapAliasedValue(value, prefixAlias);
    }

    return this.wrapSegments(value.split('.'));
  }

  wrapAliasedValue(value, prefixAlias = false) {
    const segments = value.split(/\s+as\s+/i);

    if (prefixAlias) {
      segments[1] = this.tablePrefix + segments[1];
    }

    return this.wrap(`${segments[0]} AS ${this.wrapValue(segments[1])}`);
  }

  wrapSegments(segments) {
    return segments.map((segment, key) => {
      return key === 0 && segments.length > 1 ? this.wrapTable(segment) : this.wrapValue(segment);
    }).join('.');
  }

  wrapValue(value) {
    if (value !== '*') {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  columnize(columns) {
    if (_.isString(columns)) {
      columns = [columns];
    }
    return columns.map(this.wrap.bind(this)).join(', ');
  }

  parameterize(values) {
    return values.map(this.parameter).join(', ');
  }

  parameter(value) {
    return this.isExpression(value) ? this.getValue(value) : '?';
  }

  isExpression(value) {
    return value instanceof Expression;
  }

  getValue(expression) {
    return expression.getValue();
  }

  getTablePrefix() {
    return this.tablePrefix;
  }

  setTablePrefix(prefix) {
    this.tablePrefix = prefix;
  }
}
