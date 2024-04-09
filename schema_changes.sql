

DROP TABLE IF EXISTS worksheets;
CREATE TABLE worksheets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    user_id INTEGER,
    date DATE
);

ALTER TABLE reminders ALTER COLUMN trigger TYPE TEXT;
