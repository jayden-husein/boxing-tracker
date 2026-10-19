create table session_types (
  id integer generated always as identity primary key,
  name text not null unique
);

create table sessions (
  id  integer generated always as identity primary key,
  session_date date not null, -- date of when you trained (not when it was logged)
  session_type_id integer not null references session_types(id),
  duration_in_mins integer not null check (duration_in_mins > 0),
  notes text 
);

insert into session_types (name) values ('Boxing'), ('Muay Thai');
