import fs from 'fs';
import moment from 'moment-timezone';

export default class MigrationCreator {
  create(name, path) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
    const filename = this.getPath(name, path);
    fs.writeFileSync(filename, this.getStub());
    return filename;
  }

  getPath(name, path) {
    return `${path}/${this.getDatePrefix()}_${name}.js`;
  }

  getDatePrefix() {
    return moment().format('YYYY_MM_DD_HHmmss');
  }

  getStub() {
    if (!this.stub) {
      this.stub = fs.readFileSync(`${__dirname}/migration.stub`).toString('utf8');
    }

    return this.stub;
  }
}
