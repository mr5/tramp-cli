export default class Expression {
  /**
   * The value of the expression.
   *
   * @var mixed
   */
  /**
   * Create a new raw query expression.
   *
   * @param  {String}  value
   */
  constructor(value) {
    this.value = value;
  }

  /**
   * Get the value of the expression.
   *
   * @return mixed
   */
  getValue() {
    return this.value;
  }

  /**
   * Get the value of the expression.
   *
   * @return string
   */
  toString() {
    return this.getValue().toString();
  }
}
