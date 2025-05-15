



ALTER TABLE users
ADD COLUMN SMTP_host VARCHAR(255),
ADD COLUMN SMTP_user VARCHAR(255),
ADD COLUMN SMTP_password VARCHAR(255);


INSERT INTO users (email, password, full_name, display_name, roles, smtp_host, smtp_user, smtp_password)
VALUES (
    'permits@vicpa.com.au',
    '$2b$10$xZmtFaYOMdDv0UT0EZKbQ.UVs0oQU11NAgIMVntk1Md2MFcSMOVxO',
   'Vic Permits',
   'vicpa',
'permits',
 'mail.privateemail.com',
 NULL,
 'thoreau2'
);


UPDATE users
SET smtp_host = 'cp-wc64.per01.ds.network'
 WHERE smtp_host IS NULL;
 
 
 ALTER TABLE users
DROP COLUMN smtp_user;