// ── State ──────────────────────────────────────────────────
let state = { groups: [], mapping: { device: {}, book: {} }, theme: {} };

const THEME_LABELS = {
  bg:               "Page Background",
  text:             "Text Color",
  choiceBg:         "Choice Background",
  choiceText:       "Choice Text",
  btnPrimaryBg:     "Primary Button",
  btnPrimaryText:   "Primary Button Text",
  btnSecondaryBg:   "Secondary Button",
  btnSecondaryText: "Secondary Button Text"
};

const RESULT_COMBOS = ["AA","AB","AC","BA","BB","BC"];

// ── Init ───────────────────────────────────────────────────
async function init() {
  const data = await fetch("/admin/api/data").then(r => r.json());
  state.groups  = data.questions.groups || [];
  state.mapping = data.mapping || { device: {}, book: {} };
  state.theme   = data.theme   || {};
  renderQuestions();
  renderResults();
  renderTheme();
}

// ── Tab navigation ─────────────────────────────────────────
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ── Questions ──────────────────────────────────────────────
function renderQuestions() {
  const list = document.getElementById("questions-list");
  list.innerHTML = state.groups.map((group, gi) => groupSection(group, gi)).join("");
}

function groupSection(group, gi) {
  return `
    <div class="group-section">
      <div class="group-header">
        <span class="group-badge">${gi + 1}</span>
        <input class="group-label-input" value="${escHtml(group.label)}"
          onchange="updateGroupLabel(${gi}, this.value)" />
      </div>
      ${questionBlock(group.rootQuestion, gi, 'root', null)}
      ${questionBlock(group.branchQuestions.A, gi, 'branch', 'A')}
      ${questionBlock(group.branchQuestions.B, gi, 'branch', 'B')}
    </div>
  `;
}

function questionBlock(q, gi, type, branchKey) {
  const choiceKeys = Object.keys(q.choices);
  const label = type === 'root'
    ? 'Root Question (A/B)'
    : `Branch when root = <strong>${branchKey}</strong> (A/B/C)`;

  return `
    <div class="question-card">
      <div class="question-card-header">
        <span class="question-number">${label}</span>
      </div>
      <input class="question-text-input" placeholder="Question text..."
        value="${escHtml(q.text)}"
        onchange="updateQuestionText(${gi}, '${type}', '${branchKey}', this.value)" />
      <div class="choices-row choices-${choiceKeys.length}">
        ${choiceKeys.map(key => choiceCard(q, gi, type, branchKey, key)).join("")}
      </div>
    </div>
  `;
}

function choiceCard(q, gi, type, branchKey, key) {
  const c = q.choices[key];
  const img = c.image || "";
  return `
    <div class="choice-card">
      <span class="choice-badge">${key}</span>
      <input class="choice-label-input" placeholder="Choice label..."
        value="${escHtml(c.label)}"
        onchange="updateChoiceLabel(${gi}, '${type}', '${branchKey}', '${key}', this.value)" />
      <div class="image-upload-area">
        ${img ? `<img class="image-preview" src="${img}" />` : `<img class="image-preview hidden" />`}
        <span class="upload-hint">${img ? "Click to change" : "Click to upload"}</span>
        <input type="file" accept="image/*" class="upload-input"
          onchange="uploadChoiceImage(${gi}, '${type}', '${branchKey}', '${key}', this)" />
      </div>
    </div>
  `;
}

function getQuestion(gi, type, branchKey) {
  const group = state.groups[gi];
  return type === 'root' ? group.rootQuestion : group.branchQuestions[branchKey];
}

function updateGroupLabel(gi, val) {
  state.groups[gi].label = val;
}

function updateQuestionText(gi, type, branchKey, val) {
  getQuestion(gi, type, branchKey).text = val;
}

function updateChoiceLabel(gi, type, branchKey, key, val) {
  getQuestion(gi, type, branchKey).choices[key].label = val;
}

async function uploadChoiceImage(gi, type, branchKey, key, input) {
  const file = input.files[0];
  if (!file) return;
  const filePath = await uploadFile(file);
  if (!filePath) return;
  getQuestion(gi, type, branchKey).choices[key].image = filePath;
  renderQuestions();
}

document.getElementById("btn-save-questions").addEventListener("click", async () => {
  const res = await fetch("/admin/api/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groups: state.groups })
  });
  res.ok ? toast("Questions saved") : toast("Save failed", true);
});

// ── Results ────────────────────────────────────────────────
function renderResults() {
  const container = document.getElementById("results-body");
  container.innerHTML = [
    resultSection("device", "기기 추천 (Device)", state.mapping.device || {}),
    resultSection("book",   "책 추천 (Book)",     state.mapping.book   || {})
  ].join("");
}

function resultSection(groupId, label, data) {
  const rows = RESULT_COMBOS.map(combo => {
    const r = data[combo] || {};
    const img = r.image || "";
    return `
      <tr data-group="${groupId}" data-combo="${combo}">
        <td><span class="combo-code">${combo}</span></td>
        <td><input class="table-input" placeholder="Title"
          value="${escHtml(r.title || "")}"
          onchange="updateMapping('${groupId}','${combo}','title', this.value)" /></td>
        <td><input class="table-input" placeholder="Description"
          value="${escHtml(r.description || "")}"
          onchange="updateMapping('${groupId}','${combo}','description', this.value)" /></td>
        <td>
          <div class="table-img-cell">
            <img class="table-thumb${img ? "" : " hidden"}" src="${img}" />
            <label class="btn-upload-small">Upload
              <input type="file" accept="image/*"
                onchange="uploadMappingImage('${groupId}','${combo}', this)" />
            </label>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  return `
    <tr class="section-header-row">
      <td colspan="4"><span class="section-header-label">${label}</span></td>
    </tr>
    ${rows}
  `;
}

function updateMapping(groupId, combo, field, val) {
  if (!state.mapping[groupId]) state.mapping[groupId] = {};
  if (!state.mapping[groupId][combo]) state.mapping[groupId][combo] = {};
  state.mapping[groupId][combo][field] = val;
}

async function uploadMappingImage(groupId, combo, input) {
  const file = input.files[0];
  if (!file) return;
  const filePath = await uploadFile(file);
  if (!filePath) return;
  updateMapping(groupId, combo, "image", filePath);
  const row = document.querySelector(`tr[data-group="${groupId}"][data-combo="${combo}"]`);
  const thumb = row.querySelector(".table-thumb");
  thumb.src = filePath;
  thumb.classList.remove("hidden");
}

document.getElementById("btn-save-results").addEventListener("click", async () => {
  const res = await fetch("/admin/api/mapping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.mapping)
  });
  res.ok ? toast("Results saved") : toast("Save failed", true);
});

// ── Theme ──────────────────────────────────────────────────
function renderTheme() {
  const grid = document.getElementById("theme-grid");
  grid.innerHTML = Object.entries(THEME_LABELS).map(([key, label]) => {
    const val = state.theme[key] || "#ffffff";
    return `
      <div class="theme-card">
        <div class="theme-swatch" style="background:${val}">
          <input type="color" value="${val}"
            oninput="updateThemeColor('${key}', this.value, this)" />
        </div>
        <div>
          <div class="theme-label">${label}</div>
          <div class="theme-hex" id="hex-${key}">${val}</div>
        </div>
      </div>
    `;
  }).join("");
}

function updateThemeColor(key, val, input) {
  state.theme[key] = val;
  input.closest(".theme-swatch").style.background = val;
  document.getElementById(`hex-${key}`).textContent = val;
}

document.getElementById("btn-save-theme").addEventListener("click", async () => {
  const res = await fetch("/admin/api/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.theme)
  });
  res.ok ? toast("Theme saved") : toast("Save failed", true);
});

// ── Upload helper ──────────────────────────────────────────
async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/admin/api/upload", { method: "POST", body: form });
  if (!res.ok) { toast("Upload failed", true); return null; }
  return (await res.json()).path;
}

// ── Toast ──────────────────────────────────────────────────
function toast(msg, isError = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => { el.className = "toast"; }, 2500);
}

// ── Utils ──────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

init();
