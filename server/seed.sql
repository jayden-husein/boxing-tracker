-- for testing purposes
truncate sessions restart identity;

insert into sessions (session_date, session_type_id, duration_in_mins, notes) values
  ('2121-11-01', 2, 45, 'hi lol'),
  ('2026-03-25', 1, 95, null),
  ('2025-01-21', 2, 90, null);
