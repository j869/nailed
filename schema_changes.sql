



--auto approve parents when all children are completed
ALTER TABLE jobs ADD COLUMN blocked_by JSONB;
ALTER TABLE users ADD COLUMN org integer;



-- add attachments to task record
ALTER TABLE jobs ADD COLUMN uploaded_docs JSONB;



ALTER TABLE conversations ADD COLUMN subject VARCHAR(255);




ALTER TABLE worksheets ADD COLUMN stalled_for VARCHAR(30);
COMMENT ON COLUMN worksheets.stalled_for IS 'Indicates how long the worksheet has been unactioned. Values represent time periods like "3 days", "2 weeks", etc. Used to visually prioritize older items in the todo list.';
