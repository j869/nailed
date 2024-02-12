drop table users;

CREATE TABLE users
(
    id SERIAL PRIMARY KEY,
    email varchar(100) NOT NULL UNIQUE,
    password varchar(100),
    full_name text,
    system_access_type varchar(100)
);

-- John discussed key requirements with Bryan, Alex, and Amandah on 12Feb
-- For future action:
--     > add provision to link to multiple QBE numbers (for quotes), and E-Numbers (for builds)
drop table customers;
CREATE TABLE customers
(
    id SERIAL PRIMARY KEY,
    full_name varchar(255) NOT NULL,
	primary_phone varchar(15) NOT NULL,     --     +61409877561
    primary_email varchar(255),
	contact_other text,
	current_status varchar(31),
	contact_history text
);
