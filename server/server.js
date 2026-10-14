const express = require("express");
const app = express();

app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

app.get("/sessions", (req, res) => {
  const sesh1 = { date: "10/20/2025", type: "Boxing", duration: "20 min" };
  const sesh2 = { date: "1/1/1111", type: "Muay Thai", duration: "1 hr" };
  res.json([sesh1, sesh2]);
});

app.listen(3000, (err) => {
  if (err) {
    console.error("failed to start:", err.message);
    process.exit(1);
  }
  console.log("listening on 3000");
});
