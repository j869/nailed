

  CREATE TABLE listorder (
    user_id INT NOT NULL,
    location_used VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL,
    display_text VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, location_used, sort_order)  -- Composite primary key
   );

   INSERT INTO listorder (user_id, location_used, sort_order, display_text) VALUES (12, 'CustomersStatus', 0, 'Planning Lapsed'),
   (12, 'CustomersStatus', 1, 'open'),
   (12, 'CustomersStatus', 2, 'Pending LPOD and Contract'),
   (12, 'CustomersStatus', 3, 'RFI Actioned'),
   (12, 'CustomersStatus', 4, 'Refund Pending'),
   (12, 'CustomersStatus', 5, 'On Hold - Financial Issues'),
   (12, 'CustomersStatus', 6, 'Followed up refund'),
   (12, 'CustomersStatus', 7, 'Pending Contract Insurance'),
   (12, 'CustomersStatus', 8, 'Pending Payment'),
   (12, 'CustomersStatus', 9, 'Pending payment $234'),
   (12, 'CustomersStatus', 10, 'Pending Archival'),
   (12, 'CustomersStatus', 11, 'JMQuote'),
   (12, 'CustomersStatus', 12, 'PreProduction');


ALTER TABLE users RENAME COLUMN system_access_type TO roles;


