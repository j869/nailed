



--auto approve parents when all children are completed
ALTER TABLE jobs ADD COLUMN blocked_by JSONB;
ALTER TABLE users ADD COLUMN org integer;



-- add attachments to task record
ALTER TABLE jobs ADD COLUMN uploaded_docs JSONB;



ALTER TABLE conversations ADD COLUMN subject VARCHAR(255);