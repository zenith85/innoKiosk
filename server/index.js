const express = require("express");
const path = require("path");
const { port } = require("./config");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/data", express.static(path.join(__dirname, "..", "data")));

app.post("/print", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/quiz-click", (req, res) => {

  const fs = require("fs");
  const statsPath = path.join(__dirname, "quiz_stats.json");

  const { questionId, answerKey } = req.body;

  const stats = JSON.parse(fs.readFileSync(statsPath));

  stats[questionId][answerKey]++;

  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

  res.json({ ok: true });
});

app.listen(port, "0.0.0.0", () => {
  console.log("SERVER RUNNING ON PORT", port);
});

