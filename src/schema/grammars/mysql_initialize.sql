CREATE FUNCTION `TRAMP_ALTER_COLUMN`(
    tramp_table_name TEXT,
    tramp_column_name TEXT,
    tramp_new_name TEXT,
    tramp_new_type TEXT,
    tramp_new_charset TEXT,
    tramp_new_collation TEXT,
    tramp_new_nullable TEXT,
    tramp_new_extra TEXT,
    tramp_new_default TEXT,
    tramp_new_comment TEXT) RETURNS text CHARSET utf8
    DETERMINISTIC
BEGIN
	DECLARE prepared_sql TEXT;
    SELECT
        CONCAT_WS(
            ' ',
            'ALTER TABLE',
            table_name,
            'CHANGE',
            COLUMN_NAME,
            IF(tramp_new_name IS NOT NULL, tramp_new_name, COLUMN_NAME),
            IF(tramp_new_type IS NOT NULL, tramp_new_type, COLUMN_TYPE),
            IF(tramp_new_charset IS NOT NULL, tramp_new_charset, IF(CHARACTER_SET_NAME IS NULL, '', CONCAT('CHARACTER SET ', CHARACTER_SET_NAME))),
            IF(tramp_new_collation IS NOT NULL, tramp_new_collation, IF(COLLATION_NAME IS NULL, '', CONCAT('COLLATE ', COLLATION_NAME))),
            IF(tramp_new_nullable IS NOT NULL, tramp_new_nullable, IF(IS_NULLABLE='YES','NULL', 'NOT NULL')),
            IF(tramp_new_extra IS NOT NULL, tramp_new_extra, IF(EXTRA = '', '', EXTRA)),
            IF(tramp_new_default IS NOT NULL, tramp_new_default, IF(COLUMN_DEFAULT IS NULL, '', CONCAT('DEFAULT \'', COLUMN_DEFAULT, '\''))),
            IF(tramp_new_comment IS NOT NULL, tramp_new_comment, IF(COLUMN_COMMENT='', '', CONCAT('COMMENT \'', COLUMN_COMMENT, '\'')))
        ) INTO prepared_sql
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE()
    	AND TABLE_NAME=tramp_table_name
        AND COLUMN_NAME=tramp_column_name
    LIMIT 1;
    RETURN prepared_sql;
END;
