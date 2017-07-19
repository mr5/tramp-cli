import test from 'ava';
import MysqlGrammar from '../../src/schema/grammars/mysql_grammar';
import Blueprint from '../../src/schema/blueprint';
import MysqlConnection from '../../src/connection/mysql_connection';
import Column from '../../src/schema/column';

test('compileCreateEncoding', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  const blueprint = new Blueprint('dummy_table');
  blueprint.charset = 'utf8';
  blueprint.collation = 'utf8_bin';
  t.is(
    mysqlGrammar.compileCreateEncoding('', null, blueprint),
    ' DEFAULT CHARACTER SET utf8 COLLATE utf8_bin'
  );
  const gbkConnection = new MysqlConnection({
    charset: 'gbk'
  });
  blueprint.charset = null;
  blueprint.collation = null;
  t.is(
    mysqlGrammar.compileCreateEncoding('', gbkConnection, blueprint),
    ' DEFAULT CHARACTER SET gbk'
  );
  const gbkBinConnection = new MysqlConnection({
    collation: 'gbk_bin'
  });
  t.is(
    mysqlGrammar.compileCreateEncoding('', gbkBinConnection, blueprint),
    ' COLLATE gbk_bin'
  );
  const noConfigConnection = new MysqlConnection({});
  t.is(
    mysqlGrammar.compileCreateEncoding('', noConfigConnection, blueprint),
    ''
  );
});

test('compileCreateEngine', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  const blueprint = new Blueprint('dummy_table');
  blueprint.engine = 'InnoDB';
  t.is(
    mysqlGrammar.compileCreateEngine('', null, blueprint),
    ' ENGINE = InnoDB'
  );
  const myISAMConnection = new MysqlConnection({
    engine: 'MyISAM'
  });
  blueprint.engine = null;
  t.is(
    mysqlGrammar.compileCreateEngine('', myISAMConnection, blueprint),
    ' ENGINE = MyISAM'
  );
});

test('compileAdd', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  const blueprint = new Blueprint('dummy_table');
  blueprint.unsignedInteger('created_at').default(0).comment('created at timestamp');
  t.is(
    mysqlGrammar.compileAdd(blueprint),
    "ALTER TABLE `dummy_table` ADD `created_at` INT UNSIGNED DEFAULT '0' COMMENT 'created at timestamp'"
  );
  const blueprintMultipleColumns = new Blueprint('dummy_table');
  blueprintMultipleColumns.unsignedInteger('created_at').default(0).comment('created at timestamp');
  blueprintMultipleColumns.string('username').comment('username of user');
  t.is(
    mysqlGrammar.compileAdd(blueprintMultipleColumns),
    "ALTER TABLE `dummy_table` ADD `created_at` INT UNSIGNED DEFAULT '0' COMMENT 'created at timestamp', ADD `username` VARCHAR(255) COMMENT 'username of user'"
  );
});
test('compilePrimary', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compilePrimary(blueprint, new Column({
      index: 'dummy_status',
      columns: 'status'
    })),
    'ALTER TABLE `dummy_table` ADD PRIMARY KEY `dummy_status` (`status`)'
  );
  t.is(
    mysqlGrammar.compilePrimary(blueprint, new Column({
      index: 'dummy_status_created_at',
      columns: ['status', 'created_at']
    })),
    'ALTER TABLE `dummy_table` ADD PRIMARY KEY `dummy_status_created_at` (`status`, `created_at`)'
  );
  t.is(
    mysqlGrammar.compilePrimary(blueprint, new Column({
      index: 'dummy_status_created_at',
      columns: ['status', 'created_at'],
      algorithm: 'HASH'
    })),
    'ALTER TABLE `dummy_table` ADD PRIMARY KEY `dummy_status_created_at` USING HASH (`status`, `created_at`)'
  );
});
test('compileUnique', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileUnique(blueprint, new Column({
      index: 'dummy_status',
      columns: 'status'
    })),
    'ALTER TABLE `dummy_table` ADD UNIQUE `dummy_status` (`status`)'
  );
  t.is(
    mysqlGrammar.compileUnique(blueprint, new Column({
      index: 'dummy_status_created_at',
      columns: ['status', 'created_at']
    })),
    'ALTER TABLE `dummy_table` ADD UNIQUE `dummy_status_created_at` (`status`, `created_at`)'
  );
  t.is(
    mysqlGrammar.compileUnique(blueprint, new Column({
      index: 'dummy_status_created_at',
      columns: ['status', 'created_at'],
      algorithm: 'HASH'
    })),
    'ALTER TABLE `dummy_table` ADD UNIQUE `dummy_status_created_at` USING HASH (`status`, `created_at`)'
  );
});
test('compileIndex', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileIndex(blueprint, new Column({
      index: 'dummy_status',
      columns: 'status'
    })),
    'ALTER TABLE `dummy_table` ADD INDEX `dummy_status` (`status`)'
  );
  t.is(
    mysqlGrammar.compileIndex(blueprint, new Column({
      index: 'dummy_status_created_at',
      columns: ['status', 'created_at']
    })),
    'ALTER TABLE `dummy_table` ADD INDEX `dummy_status_created_at` (`status`, `created_at`)'
  );
  t.is(
    mysqlGrammar.compileIndex(blueprint, new Column({
      index: 'dummy_status_created_at',
      columns: ['status', 'created_at'],
      algorithm: 'HASH'
    })),
    'ALTER TABLE `dummy_table` ADD INDEX `dummy_status_created_at` USING HASH (`status`, `created_at`)'
  );
});
test('compileKey', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileKey(blueprint, new Column({
      index: 'dummy_status',
      columns: 'status'
    })),
    'ALTER TABLE `dummy_table` ADD `dummy_status` (`status`)'
  );
  t.is(
    mysqlGrammar.compileKey(blueprint, new Column({
      index: 'dummy_status_created_at',
      columns: ['status', 'created_at']
    })),
    'ALTER TABLE `dummy_table` ADD `dummy_status_created_at` (`status`, `created_at`)'
  );
  t.is(
    mysqlGrammar.compileKey(blueprint, new Column({
      index: 'dummy_status_created_at',
      columns: ['status', 'created_at'],
      algorithm: 'HASH'
    })),
    'ALTER TABLE `dummy_table` ADD `dummy_status_created_at` USING HASH (`status`, `created_at`)'
  );
});
test('compileDrop', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileDrop(blueprint, new Column({})),
    'DROP TABLE `dummy_table`'
  );
});
test('compileDropIfExists', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileDropIfExists(blueprint, new Column({})),
    'DROP TABLE IF EXISTS `dummy_table`'
  );
});
test('compileDropColumn', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileDropColumn(blueprint, new Column({ columns: 'fooColumn' })),
    'ALTER TABLE `dummy_table` DROP `fooColumn`'
  );
  t.is(
    mysqlGrammar.compileDropColumn(blueprint, new Column({ columns: ['fooColumn'] })),
    'ALTER TABLE `dummy_table` DROP `fooColumn`'
  );
  t.is(
    mysqlGrammar.compileDropColumn(blueprint, new Column({ columns: ['fooColumn', 'barColumn'] })),
    'ALTER TABLE `dummy_table` DROP `fooColumn`, DROP `barColumn`'
  );
});
test('compileDropPrimary', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileDropPrimary(blueprint, new Column({})),
    'ALTER TABLE `dummy_table` DROP PRIMARY KEY'
  );
});
test('compileDropUnique', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileDropUnique(blueprint, new Column({ index: 'foo_unique_index' })),
    'ALTER TABLE `dummy_table` DROP INDEX `foo_unique_index`'
  );
});
test('compileDropIndex', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileDropIndex(blueprint, new Column({ index: 'foo_index' })),
    'ALTER TABLE `dummy_table` DROP INDEX `foo_index`'
  );
});
test('compileDropForeign', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileDropForeign(blueprint, new Column({ index: 'foo_foreign_key' })),
    'ALTER TABLE `dummy_table` DROP FOREIGN KEY `foo_foreign_key`'
  );
});
test('compileRename', (t) => {
  const blueprint = new Blueprint('dummy_table');
  const mysqlGrammar = new MysqlGrammar();
  t.is(
    mysqlGrammar.compileRename(blueprint, new Column({ to: 'new_dummy_table' })),
    'RENAME TABLE `dummy_table` TO `new_dummy_table`'
  );
});
test('compileEnableForeignKeyConstraints', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.compileEnableForeignKeyConstraints(), 'SET FOREIGN_KEY_CHECKS=1;');
});
test('compileDisableForeignKeyConstraints', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.compileDisableForeignKeyConstraints(), 'SET FOREIGN_KEY_CHECKS=0;');
});
test('typeString', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeString(new Column({ length: 32 })), 'VARCHAR(32)');
});
test('typeText', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeText(new Column({})), 'TEXT');
});
test('typeMediumText', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeMediumText(new Column({})), 'MEDIUMTEXT');
});
test('typeLongText', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeLongText(new Column({})), 'LONGTEXT');
});
test('typeBigInteger', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeBigInteger(new Column({})), 'BIGINT');
});
test('typeInteger', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeInteger(new Column({})), 'INT');
});
test('typeTinyInteger', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeTinyInteger(new Column({})), 'TINYINT');
});
test('typeSmallInteger', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeSmallInteger(new Column({})), 'SMALLINT');
});
test('typeFloat', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeFloat(new Column({ total: 10, places: 2 })), 'DOUBLE(10, 2)');
  t.is(mysqlGrammar.typeFloat(new Column({})), 'DOUBLE');
});
test('typeDouble', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeDouble(new Column({ total: 10, places: 2 })), 'DOUBLE(10, 2)');
  t.is(mysqlGrammar.typeDouble(new Column({})), 'DOUBLE');
});
test('typeDecimal', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeDecimal(new Column({ total: 10, places: 2 })), 'DECIMAL(10, 2)');
});
test('typeBoolean', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeBoolean(new Column({})), 'TINYINT(1)');
});
test('enum', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeEnum(new Column({ allowed: ['foo', 'bar', 2333] })), "ENUM('foo', 'bar', '2333')");
});
test('typeJson', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeJsonb(new Column({})), 'JSON');
});
test('typeJsonb', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeJsonb(new Column({})), 'JSON');
});
test('typeDate', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeDate(new Column({})), 'DATE');
});
test('typeDateTime', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeDateTime(new Column({ precision: 0 })), 'DATETIME(0)');
});
test('typeDateTimeTz', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeDateTimeTz(new Column({ precision: 0 })), 'DATETIME(0)');
});
test('typeTime', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeTime(new Column({})), 'TIME');
});
test('typeTimeTz', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeTimeTz(new Column({})), 'TIME');
});
test('typeTimestamp', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeTimestamp(new Column({ precision: 0 })), 'TIMESTAMP(0)');
  t.is(mysqlGrammar.typeTimestamp(new Column({
    precision: 1,
    useCurrent: true
  })), 'TIMESTAMP(1) DEFAULT CURRENT_TIMESTAMP');
});
test('typeTimestampTz', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeTimestampTz(new Column({ precision: 0 })), 'TIMESTAMP(0)');
  t.is(mysqlGrammar.typeTimestampTz(new Column({
    precision: 1,
    useCurrent: true
  })), 'TIMESTAMP(1) DEFAULT CURRENT_TIMESTAMP');
});
test('typeBinary', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeBinary(new Column({})), 'BLOB');
});
test('typeUuid', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeUuid(new Column({})), 'CHAR(36)');
});
test('typeIpAddress', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeIpAddress(new Column({})), 'VARCHAR(45)');
});
test('typeMacAddress', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.typeMacAddress(new Column({})), 'VARCHAR(17)');
});
test('modifyVirtualAs', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.modifyVirtualAs(null, new Column({ virtualAs: 'fooVirtualAs' })), ' AS (fooVirtualAs)');
  t.is(mysqlGrammar.modifyVirtualAs(null, new Column({})), null);
});
test('modifyStoredAs', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.modifyStoredAs(null, new Column({ storedAs: 'fooStoreAs' })), ' AS (fooStoreAs) STORED');
  t.is(mysqlGrammar.modifyStoredAs(null, new Column({})), null);
});
test('modifyUnsigned', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.modifyUnsigned(null, new Column({
    unsigned: true,
    type: 'integer'
  })), ' UNSIGNED');
  t.is(mysqlGrammar.modifyUnsigned(null, new Column({
    unsigned: false,
    type: 'integer'
  })), null);
  t.is(mysqlGrammar.modifyUnsigned(null, new Column({
    type: 'integer'
  })), null);
  try {
    t.is(
      mysqlGrammar.modifyUnsigned(null, new Column({
        unsigned: true,
        type: 'varchar'
      })),
      'void',
      'must throw a TypeError'
    );
  } catch (e) {
    t.is(e instanceof TypeError, true);
  }
  t.is(mysqlGrammar.modifyCharset(null, new Column({})), null);
});

test('modifyCharset', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.modifyCharset(null, new Column({ charset: 'utf8' })), ' CHARACTER SET utf8');
  t.is(mysqlGrammar.modifyCharset(null, new Column({ charset: 'gbk' })), ' CHARACTER SET gbk');
  try {
    t.is(mysqlGrammar.modifyCharset(null, new Column({
      charset: 'utf8',
      type: 'integer'
    })), 'void', 'must throw a TypeError');
  } catch (e) {
    t.is(e instanceof TypeError, true);
  }
  t.is(mysqlGrammar.modifyCharset(null, new Column({})), null);
});

test('modifyNullable', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.modifyNullable(null, new Column({ nullable: true })), ' NULL');
  t.is(mysqlGrammar.modifyNullable(null, new Column({ nullable: false })), ' NOT NULL');
  t.is(mysqlGrammar.modifyNullable(null, new Column({
    nullable: true,
    virtualAs: 'fooVirtual',
    storeAs: 'fooStoreAs'
  })), null);
  t.is(mysqlGrammar.modifyNullable(null, new Column({})), ' NOT NULL');
});

test('modifyDefault', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.modifyDefault(null, new Column({ default: 'foo default' })), ' DEFAULT \'foo default\'');
  t.is(mysqlGrammar.modifyDefault(null, new Column({ default: 3 })), ' DEFAULT \'3\'');
  t.is(mysqlGrammar.modifyDefault(null, new Column({})), null);
});

test('modifyAutoIncrement', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.modifyAutoIncrement(null, new Column({
    type: 'integer',
    autoIncrement: true
  })), ' AUTO_INCREMENT PRIMARY KEY');
  t.is(mysqlGrammar.modifyAutoIncrement(null, new Column({
    type: 'string',
    autoIncrement: true
  })), null);
  t.is(mysqlGrammar.modifyAutoIncrement(null, new Column({ autoIncrement: true })), null);
  t.is(mysqlGrammar.modifyAutoIncrement(null, new Column({ autoIncrement: false })), null);
  t.is(mysqlGrammar.modifyAutoIncrement(null, new Column({})), null);
});

test('modifyFirst', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.modifyFirst(null, new Column({ first: true })), ' FIRST');
  t.is(mysqlGrammar.modifyFirst(null, new Column({ first: false })), null);
  t.is(mysqlGrammar.modifyFirst(null, new Column({})), null);
});

test('modifyAfter', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.modifyAfter(null, new Column({ after: 'fooColumn' })), ' AFTER `fooColumn`');
  t.is(mysqlGrammar.modifyAfter(null, new Column({})), null);
});

test('modifyComment', (t) => {
  const mysqlGrammar = new MysqlGrammar();
  t.is(mysqlGrammar.modifyComment(null, new Column({ comment: 'some comment' })), ' COMMENT \'some comment\'');
  t.is(mysqlGrammar.modifyComment(null, new Column({})), null);
});
