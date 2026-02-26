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

app.listen(port, () => {
  console.log("SERVER RUNNING ON PORT", port);
});

