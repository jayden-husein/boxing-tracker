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

app.post("/sessions", (req, res) => {
  console.log(req.body);
  res.status(201).json(req.body);
});
