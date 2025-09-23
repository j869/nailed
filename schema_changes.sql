



--auto approve parents when all children are completed
ALTER TABLE jobs ADD COLUMN blocked_by JSONB;


