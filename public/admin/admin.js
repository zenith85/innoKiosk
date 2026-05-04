// ── State ──────────────────────────────────────────────────
let state = { groups: [], mapping: { device: {}, book: {} }, theme: {} };

const THEME_LABELS = {
  bg:               "Page Background",
  text:             "Text Color",
  choiceBg:         "Choice Fallback Background",
  choiceBg1:        "Choice A Background",
  choiceBg2:        "Choice B Background",
  choiceBg3:        "Choice C Background",
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
  const labelKo = getLang(group.label, 'ko');
  const labelEn = getLang(group.label, 'en');
  return `
    <div class="group-section">
      <div class="group-header">
        <span class="group-badge">${gi + 1}</span>
        <div class="bilingual-row inline">
          <input class="group-label-input" placeholder="그룹 이름 (KR)" value="${escHtml(labelKo)}"
            onchange="updateGroupLabel(${gi}, 'ko', this.value)" />
          <input class="group-label-input" placeholder="Group name (EN)" value="${escHtml(labelEn)}"
            onchange="updateGroupLabel(${gi}, 'en', this.value)" />
        </div>
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
  const textKo = getLang(q.text, 'ko');
  const textEn = getLang(q.text, 'en');

  return `
    <div class="question-card">
      <div class="question-card-header">
        <span class="question-number">${label}</span>
      </div>
      <div class="bilingual-row">
        <div class="lang-field">
          <span class="lang-tag">KR</span>
          <input class="question-text-input" placeholder="질문 텍스트..."
            value="${escHtml(textKo)}"
            onchange="updateQuestionText(${gi}, '${type}', '${branchKey}', 'ko', this.value)" />
        </div>
        <div class="lang-field">
          <span class="lang-tag">EN</span>
          <input class="question-text-input" placeholder="Question text..."
            value="${escHtml(textEn)}"
            onchange="updateQuestionText(${gi}, '${type}', '${branchKey}', 'en', this.value)" />
        </div>
      </div>
      <div class="choices-row choices-${choiceKeys.length}">
        ${choiceKeys.map(key => choiceCard(q, gi, type, branchKey, key)).join("")}
      </div>
    </div>
  `;
}

function choiceCard(q, gi, type, branchKey, key) {
  const c = q.choices[key];
  const img = c.image || "";
  const labelKo = getLang(c.label, 'ko');
  const labelEn = getLang(c.label, 'en');
  return `
    <div class="choice-card">
      <span class="choice-badge">${key}</span>
      <div class="bilingual-row">
        <div class="lang-field">
          <span class="lang-tag">KR</span>
          <input class="choice-label-input" placeholder="답변 텍스트..."
            value="${escHtml(labelKo)}"
            onchange="updateChoiceLabel(${gi}, '${type}', '${branchKey}', '${key}', 'ko', this.value)" />
        </div>
        <div class="lang-field">
          <span class="lang-tag">EN</span>
          <input class="choice-label-input" placeholder="Choice text..."
            value="${escHtml(labelEn)}"
            onchange="updateChoiceLabel(${gi}, '${type}', '${branchKey}', '${key}', 'en', this.value)" />
        </div>
      </div>
      <div class="image-upload-area">
        ${img ? `<img class="image-preview" src="${img}" />` : `<img class="image-preview hidden" />`}
        <span class="upload-hint">${img ? "Click to change" : "Click to upload"}</span>
        <input type="file" accept="image/*" class="upload-input"
          onchange="uploadChoiceImage(${gi}, '${type}', '${branchKey}', '${key}', this)" />
      </div>
      ${img ? `<button class="btn-remove-img" onclick="removeChoiceImage(${gi}, '${type}', '${branchKey}', '${key}')">✕ Remove image</button>` : ""}
    </div>
  `;
}

function getQuestion(gi, type, branchKey) {
  const group = state.groups[gi];
  return type === 'root' ? group.rootQuestion : group.branchQuestions[branchKey];
}

function getLang(val, langKey) {
  if (!val) return '';
  if (typeof val === 'object') return val[langKey] || '';
  return langKey === 'ko' ? val : '';
}

function setLang(obj, field, langKey, val) {
  const cur = obj[field];
  if (typeof cur !== 'object' || cur === null) {
    obj[field] = { ko: typeof cur === 'string' ? cur : '', en: '' };
  }
  obj[field][langKey] = val;
}

function updateGroupLabel(gi, langKey, val) {
  setLang(state.groups[gi], 'label', langKey, val);
}

function updateQuestionText(gi, type, branchKey, langKey, val) {
  setLang(getQuestion(gi, type, branchKey), 'text', langKey, val);
}

function updateChoiceLabel(gi, type, branchKey, key, langKey, val) {
  setLang(getQuestion(gi, type, branchKey).choices[key], 'label', langKey, val);
}

function removeChoiceImage(gi, type, branchKey, key) {
  getQuestion(gi, type, branchKey).choices[key].image = "";
  renderQuestions();
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
    const titleKo = getLang(r.title, 'ko');
    const titleEn = getLang(r.title, 'en');
    const descKo  = getLang(r.description, 'ko');
    const descEn  = getLang(r.description, 'en');
    return `
      <tr data-group="${groupId}" data-combo="${combo}">
        <td><span class="combo-code">${combo}</span></td>
        <td>
          <div class="bilingual-row compact">
            <div class="lang-field">
              <span class="lang-tag">KR</span>
              <input class="table-input" placeholder="제목"
                value="${escHtml(titleKo)}"
                onchange="updateMappingLang('${groupId}','${combo}','title','ko',this.value)" />
            </div>
            <div class="lang-field">
              <span class="lang-tag">EN</span>
              <input class="table-input" placeholder="Title"
                value="${escHtml(titleEn)}"
                onchange="updateMappingLang('${groupId}','${combo}','title','en',this.value)" />
            </div>
          </div>
        </td>
        <td>
          <div class="bilingual-row compact">
            <div class="lang-field">
              <span class="lang-tag">KR</span>
              <input class="table-input" placeholder="설명"
                value="${escHtml(descKo)}"
                onchange="updateMappingLang('${groupId}','${combo}','description','ko',this.value)" />
            </div>
            <div class="lang-field">
              <span class="lang-tag">EN</span>
              <input class="table-input" placeholder="Description"
                value="${escHtml(descEn)}"
                onchange="updateMappingLang('${groupId}','${combo}','description','en',this.value)" />
            </div>
          </div>
        </td>
        <td>
          <div class="table-img-cell">
            <img class="table-thumb${img ? "" : " hidden"}" src="${img}" />
            <label class="btn-upload-small">Upload
              <input type="file" accept="image/*"
                onchange="uploadMappingImage('${groupId}','${combo}', this)" />
            </label>
            ${img ? `<button class="btn-remove" onclick="removeMappingImage('${groupId}','${combo}')">✕</button>` : ""}
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

function updateMappingLang(groupId, combo, field, langKey, val) {
  if (!state.mapping[groupId]) state.mapping[groupId] = {};
  if (!state.mapping[groupId][combo]) state.mapping[groupId][combo] = {};
  setLang(state.mapping[groupId][combo], field, langKey, val);
}

function removeMappingImage(groupId, combo) {
  updateMapping(groupId, combo, "image", "");
  renderResults();
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
