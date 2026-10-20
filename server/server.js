const express = require("express");
const cors = require("cors");
const app = express();

require("dotenv").config();

app.use(express.json());
process.env.ORIGIN
  ? app.use(cors({ origin: process.env.ORIGIN }))
  : (console.error("ORIGIN is not set"), process.exit(1));

const PORT = process.env.PORT || 3000;

const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get("/sessions", async (req, res) => {
  try {
    // important to note that u have to cast the date as text otherwise pg will convert it into js date which includes timezone
    const result = await pool.query(
      `select 
        sessions.id, 
        cast(sessions.session_date as text), 
        session_types.name as session_type, 
        sessions.duration_in_mins, 
        sessions.notes 
      from 
        sessions 
      inner join 
        session_types 
      on 
        sessions.session_type_id = session_types.id 
      order by 
        sessions.session_date desc
      limit
        15`,
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: `Couldn't load session` });
    console.error(err);
  }
});

// error messages for the post route
const errorMessages = {
  session_type_id: `Invalid session type`,
  session_date: `Date is required`,
  duration_in_mins: `Duration is required`,
  sessions_duration_in_mins_check: `Duration must be greater than 0`,
  22007: `Invalid date`,
  22008: `Invalid date`,
  "22P02": `Invalid duration entry`,
  22003: `Duration is too long`,
};

app.post("/sessions", async (req, res) => {
  try {
    const { session_date, session_type, duration_in_mins, notes } = req.body;

    const session = await pool.query(
      `insert into
        sessions (session_date, session_type_id, duration_in_mins, notes)
      values 
        ($1, (select id from session_types where session_types.name = $2), $3, $4)
      returning
        id, cast(session_date as text), (select name from session_types where session_types.name = $2) as session_type, duration_in_mins, notes`,
      [session_date, session_type, duration_in_mins, notes],
    );

    res.status(201).json(session.rows[0]);
  } catch (err) {
    console.error(err);
    const message = errorMessages[err.column || err.constraint || err.code];

    if (message) {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: `Request didn't go through` });
    }
  }
});

app.get("/session-types", async (req, res) => {
  try {
    const result = await pool.query(`
      select 
        id, name
      from 
        session_types
      order by
        id`);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Error getting types` });
  }
});

app.listen(PORT, (err) => {
  if (err) {
    console.error("failed to start:", err.message);
    process.exit(1);
  }
  console.log(`listening on ${PORT}`);
});
