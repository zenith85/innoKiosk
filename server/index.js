const express = require("express");
const path    = require("path");
const fs      = require("fs");
const multer  = require("multer");
const { port, adminPassword } = require("./config");

const app = express();

const uploadsDir = path.join(__dirname, "..", "public", "img", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json());

// ── Admin auth ────────────────────────────────────────────
const adminAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Kiosk Admin"');
    return res.status(401).send("Unauthorized");
  }
  const credentials = Buffer.from(auth.slice(6), "base64").toString();
  const password = credentials.slice(credentials.indexOf(":") + 1);
  if (password !== adminPassword) {
    res.set("WWW-Authenticate", 'Basic realm="Kiosk Admin"');
    return res.status(401).send("Unauthorized");
  }
  next();
};

// ── Static (admin protected, public after) ────────────────
app.use("/admin", adminAuth, express.static(path.join(__dirname, "..", "public", "admin")));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/data", express.static(path.join(__dirname, "..", "data")));

// ── Admin pages ───────────────────────────────────────────
app.get("/admin", adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin", "index.html"));
});

// ── Admin API ─────────────────────────────────────────────
app.get("/admin/api/data", (req, res) => {
  const dataDir = path.join(__dirname, "..", "data");
  const questions = JSON.parse(fs.readFileSync(path.join(dataDir, "questions.json")));
  const mapping   = JSON.parse(fs.readFileSync(path.join(dataDir, "mapping.json")));
  const themePath = path.join(dataDir, "theme.json");
  const theme = fs.existsSync(themePath) ? JSON.parse(fs.readFileSync(themePath)) : {};
  res.json({ questions, mapping, theme });
});

app.post("/admin/api/questions", (req, res) => {
  const questions = req.body;
  fs.writeFileSync(
    path.join(__dirname, "..", "data", "questions.json"),
    JSON.stringify(questions, null, 2)
  );
  const stats = {};
  questions.forEach(q => { stats[q.id] = { A: 0, B: 0 }; });
  fs.writeFileSync(
    path.join(__dirname, "quiz_stats.json"),
    JSON.stringify(stats, null, 2)
  );
  res.json({ ok: true });
});

app.post("/admin/api/mapping", (req, res) => {
  fs.writeFileSync(
    path.join(__dirname, "..", "data", "mapping.json"),
    JSON.stringify(req.body, null, 2)
  );
  res.json({ ok: true });
});

app.post("/admin/api/theme", (req, res) => {
  fs.writeFileSync(
    path.join(__dirname, "..", "data", "theme.json"),
    JSON.stringify(req.body, null, 2)
  );
  res.json({ ok: true });
});

app.post("/admin/api/upload", adminAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ path: `/img/uploads/${req.file.filename}` });
});

// ── Quiz API ──────────────────────────────────────────────
app.post("/print", (req, res) => res.json({ ok: true }));

app.post("/api/quiz-click", (req, res) => {
  const statsPath = path.join(__dirname, "quiz_stats.json");
  const { questionId, answerKey } = req.body;
  if (!fs.existsSync(statsPath)) return res.json({ ok: true });
  const stats = JSON.parse(fs.readFileSync(statsPath));
  if (!stats[questionId] || !Object.prototype.hasOwnProperty.call(stats[questionId], answerKey))
    return res.json({ ok: true });
  stats[questionId][answerKey]++;
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  res.json({ ok: true });
});

app.listen(port, "0.0.0.0", () => {
  console.log("SERVER RUNNING ON PORT", port);
});
