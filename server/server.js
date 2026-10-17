const express = require("express");
const app = express();
app.use(express.json());

const PORT = 3000;

require("dotenv").config();

const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.listen(PORT, (err) => {
  if (err) {
    console.error("failed to start:", err.message);
    process.exit(1);
  }
  console.log("listening on 3000");
});

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
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: `Couldn't load session` });
    console.error(err);
  }
});

app.post("/sessions", async (req, res) => {
  try {
    console.log(req.body);
    const { session_date, session_type, duration_in_mins, notes } = req.body;

    console.log(session_type);

    const session_type_id = await pool.query(
      `select 
        id 
      from 
        session_types
      where 
        $1 = session_types.name`,
      [session_type],
    );

    console.log(session_type_id.rows[0].id);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Request didn't go through` });
  }
});
