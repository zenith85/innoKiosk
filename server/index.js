const express = require("express");
const path    = require("path");
const fs      = require("fs");
const multer  = require("multer");
const AdmZip  = require("adm-zip");
const { port, adminPassword } = require("./config");

const app = express();

const uploadsDir = path.join(__dirname, "..", "public", "img", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dataDefaults = {
  "questions.json": { groups: [] },
  "mapping.json":   { device: {}, book: {} },
  "theme.json":     {}
};
Object.entries(dataDefaults).forEach(([file, def]) => {
  const p = path.join(dataDir, file);
  if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(def, null, 2));
});
if (!fs.existsSync(path.join(__dirname, "result_stats.json"))) {
  fs.writeFileSync(path.join(__dirname, "result_stats.json"), JSON.stringify({ device: {}, book: {} }, null, 2));
}

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
    res.set("WWW-Authenticate", 'Basic realm="INNOSPACEONE Kiosk Admin"');
    return res.status(401).send("Unauthorized");
  }
  const credentials = Buffer.from(auth.slice(6), "base64").toString();
  const password = credentials.slice(credentials.indexOf(":") + 1);
  if (password !== adminPassword) {
    res.set("WWW-Authenticate", 'Basic realm="INNOSPACEONE Kiosk Admin"');
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
  const data = req.body;
  fs.writeFileSync(
    path.join(__dirname, "..", "data", "questions.json"),
    JSON.stringify(data, null, 2)
  );
  const stats = {};
  (data.groups || []).forEach(group => {
    const root = group.rootQuestion;
    stats[root.id] = Object.fromEntries(Object.keys(root.choices).map(k => [k, 0]));
    Object.values(group.branchQuestions || {}).forEach(q => {
      stats[q.id] = Object.fromEntries(Object.keys(q.choices).map(k => [k, 0]));
    });
  });
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


app.get("/admin/api/result-stats", adminAuth, (req, res) => {
  const p = path.join(__dirname, "result_stats.json");
  const stats = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p)) : { device: {}, book: {} };
  res.json(stats);
});

app.post("/api/result-pick", (req, res) => {
  const { deviceCode, bookCode } = req.body;
  const p = path.join(__dirname, "result_stats.json");
  const stats = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p)) : { device: {}, book: {} };
  if (!stats.device) stats.device = {};
  if (!stats.book)   stats.book   = {};
  stats.device[deviceCode] = (stats.device[deviceCode] || 0) + 1;
  stats.book[bookCode]     = (stats.book[bookCode]     || 0) + 1;
  fs.writeFileSync(p, JSON.stringify(stats, null, 2));
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

// ── Export setup ─────────────────────────────────────────
app.get("/admin/api/export", adminAuth, (req, res) => {
  const zip = new AdmZip();
  const dataFiles = ["mapping.json", "questions.json", "theme.json"];
  dataFiles.forEach(file => {
    const p = path.join(dataDir, file);
    if (fs.existsSync(p)) zip.addLocalFile(p, "data/");
  });
  if (fs.existsSync(uploadsDir)) {
    fs.readdirSync(uploadsDir).forEach(file => {
      zip.addLocalFile(path.join(uploadsDir, file), "uploads/");
    });
  }
  const buf = zip.toBuffer();
  res.setHeader("Content-Disposition", "attachment; filename=kiosk-setup.zip");
  res.setHeader("Content-Type", "application/zip");
  res.send(buf);
});

// ── Import setup ─────────────────────────────────────────
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });
app.post("/admin/api/import", adminAuth, importUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  try {
    const zip = new AdmZip(req.file.buffer);
    zip.getEntries().forEach(entry => {
      if (entry.isDirectory) return;
      const name = entry.name;
      if (entry.entryName.startsWith("data/") && name.endsWith(".json")) {
        fs.writeFileSync(path.join(dataDir, name), entry.getData());
      } else if (entry.entryName.startsWith("uploads/")) {
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        fs.writeFileSync(path.join(uploadsDir, name), entry.getData());
      }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to extract zip" });
  }
});

// ── Video list ────────────────────────────────────────────
app.get("/api/videos", (req, res) => {
  const videoDir = path.join(__dirname, "..", "public", "video");
  const exts = [".mp4", ".webm", ".ogg"];
  try {
    const files = fs.readdirSync(videoDir)
      .filter(f => exts.includes(path.extname(f).toLowerCase()))
      .sort()
      .map(f => `/video/${f}`);
    res.json(files);
  } catch (e) {
    res.json([]);
  }
});

// ── Quiz API ──────────────────────────────────────────────
app.post("/print", (req, res) => res.json({ ok: true }));


app.listen(port, "0.0.0.0", () => {
  console.log("SERVER RUNNING ON PORT", port);
});
