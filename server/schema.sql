create table sessions (
  id  integer generated always as identity primary key,
  workout_date date not null -- date of when you trained (not when it was logged)

);