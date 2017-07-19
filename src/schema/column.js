export default class Column {
  constructor(options) {
    this.attrs = {};
    this.options(options);
  }

  s(key, value) {
    this.attrs[key] = value;
    return this;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  set(key, value) {
    return this.s(key, value);
  }

  get(key) {
    return this.attrs[key];
  }

  options(options) {
    Object.assign(this.attrs, options);
    return this;
  }

  change() {
    this.set('change', true);
    return this;
  }

  nullable(nullable = true) {
    this.s('nullable', nullable);
    return this;
  }

  comment(comment) {
    this.set('comment', comment);
    return this;
  }

  index(index = true) {
    this.set('index', index);
    return this;
  }

  unique(unique = true) {
    this.set('unique', unique);
    return this;
  }

  primary(primary = true) {
    this.set('primary', primary);
    return this;
  }

  after(columnName) {
    this.set('after', columnName);
    return this;
  }

  default(value) {
    this.s('default', value);
    return this;
  }

  collation(collation) {
    this.s('collation', collation);
    return this;
  }

  charset(charset) {
    this.s('charset', charset);
    return this;
  }
}
