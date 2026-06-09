// ── State ──────────────────────────────────────────────────
let state = { groups: [], mapping: { device: {}, book: {} }, theme: {} };
let analysisCharts = {};

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
  renderAnalysis();
  renderResultCharts();
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
    const img      = r.image || "";
    const qr       = r.qr    || "";
    const titleKo  = getLang(r.title, 'ko');
    const titleEn  = getLang(r.title, 'en');
    const descKo   = getLang(r.description, 'ko');
    const descEn   = getLang(r.description, 'en');
    const catchKo  = getLang(r.catchphrase, 'ko');
    const catchEn  = getLang(r.catchphrase, 'en');
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
        ${groupId === 'book' ? `
        <td>
          <div class="bilingual-row compact">
            <div class="lang-field">
              <span class="lang-tag">KR</span>
              <textarea class="table-input table-textarea" placeholder="설명 (\\n = 줄바꿈)"
                onchange="updateMappingLang('book','${combo}','description','ko',this.value)">${escHtml(descKo)}</textarea>
            </div>
            <div class="lang-field">
              <span class="lang-tag">EN</span>
              <textarea class="table-input table-textarea" placeholder="Description (\\n = new line)"
                onchange="updateMappingLang('book','${combo}','description','en',this.value)">${escHtml(descEn)}</textarea>
            </div>
          </div>
        </td>
        <td>
          <div class="bilingual-row compact">
            <div class="lang-field">
              <span class="lang-tag">KR</span>
              <textarea class="table-input table-textarea" placeholder="캐치프레이즈 (\\n = 줄바꿈)"
                onchange="updateMappingLang('book','${combo}','catchphrase','ko',this.value)">${escHtml(catchKo)}</textarea>
            </div>
            <div class="lang-field">
              <span class="lang-tag">EN</span>
              <textarea class="table-input table-textarea" placeholder="Catchphrase (\\n = new line)"
                onchange="updateMappingLang('book','${combo}','catchphrase','en',this.value)">${escHtml(catchEn)}</textarea>
            </div>
          </div>
        </td>` : `<td></td><td></td>`}
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
        ${groupId === 'device' ? `
        <td>
          <div class="table-img-cell">
            <img class="table-thumb${qr ? "" : " hidden"}" src="${qr}" />
            <label class="btn-upload-small">Upload
              <input type="file" accept="image/*"
                onchange="uploadMappingQr('${combo}', this)" />
            </label>
            ${qr ? `<button class="btn-remove" onclick="removeMappingQr('${combo}')">✕</button>` : ""}
          </div>
        </td>` : `<td></td>`}
      </tr>
    `;
  }).join("");

  return `
    <tr class="section-header-row">
      <td colspan="6"><span class="section-header-label">${label}</span></td>
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

async function uploadMappingQr(combo, input) {
  const file = input.files[0];
  if (!file) return;
  const filePath = await uploadFile(file);
  if (!filePath) return;
  updateMapping("device", combo, "qr", filePath);
  renderResults();
}

function removeMappingQr(combo) {
  updateMapping("device", combo, "qr", "");
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
  const img = state.theme.frontImage || "";
  document.getElementById("theme-front-image").innerHTML = `
    <div class="theme-section-label">Front Page Image</div>
    <div class="table-img-cell">
      <img class="table-thumb${img ? "" : " hidden"}" id="front-img-preview" src="${img}" />
      <label class="btn-upload-small">Upload
        <input type="file" accept="image/*" onchange="uploadFrontImage(this)" />
      </label>
      ${img ? `<button class="btn-remove" onclick="removeFrontImage()">✕ Remove</button>` : ""}
    </div>
  `;

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

async function uploadFrontImage(input) {
  const file = input.files[0];
  if (!file) return;
  const filePath = await uploadFile(file);
  if (!filePath) return;
  state.theme.frontImage = filePath;
  renderTheme();
}

function removeFrontImage() {
  state.theme.frontImage = "";
  renderTheme();
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

// ── Analysis ───────────────────────────────────────────────
function deriveQuestionStats(resultStats) {
  const stats = {};
  state.groups.forEach(group => {
    const comboCounts = resultStats[group.id] || {};
    const rootId   = group.rootQuestion.id;
    const branchAId = group.branchQuestions.A.id;
    const branchBId = group.branchQuestions.B.id;
    stats[rootId]    = {};
    stats[branchAId] = {};
    stats[branchBId] = {};
    Object.keys(comboCounts).forEach(combo => {
      const count       = comboCounts[combo] || 0;
      const rootAnswer  = combo[0];
      const branchAnswer = combo[1];
      stats[rootId][rootAnswer]    = (stats[rootId][rootAnswer]    || 0) + count;
      if (rootAnswer === 'A') {
        stats[branchAId][branchAnswer] = (stats[branchAId][branchAnswer] || 0) + count;
      } else {
        stats[branchBId][branchAnswer] = (stats[branchBId][branchAnswer] || 0) + count;
      }
    });
  });
  return stats;
}

async function renderAnalysis() {
  const resultStats = await fetch("/admin/api/result-stats").then(r => r.json());
  const stats = deriveQuestionStats(resultStats);

  Object.values(analysisCharts).forEach(c => c.destroy());
  analysisCharts = {};

  const COLORS = ['#4e79a7', '#f28e2b', '#e15759'];

  const container = document.getElementById("analysis-body");
  container.innerHTML = state.groups.map((group, gi) => {
    const questions = [
      { q: group.rootQuestion,      label: `Group ${gi + 1} — Root Question` },
      { q: group.branchQuestions.A, label: `Group ${gi + 1} — Branch A` },
      { q: group.branchQuestions.B, label: `Group ${gi + 1} — Branch B` }
    ];
    return `
      <div class="analysis-group">
        <div class="analysis-group-title">${escHtml(getLang(group.label, 'ko') || `Group ${gi + 1}`)}</div>
        ${questions.map(({ q, label }) => {
          const qStats = stats[q.id] || {};
          const total  = Object.values(qStats).reduce((a, b) => a + b, 0);
          return `
            <div class="analysis-card">
              <div class="analysis-card-header">
                <span class="analysis-label">${label}</span>
                <span class="analysis-total">${total} responses</span>
              </div>
              <p class="analysis-question">${escHtml(getLang(q.text, 'ko').replace(/\\n|\n/g, ' '))}</p>
              <div class="analysis-chart-wrap">
                <canvas id="chart-${q.id}"></canvas>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');

  state.groups.forEach(group => {
    [group.rootQuestion, group.branchQuestions.A, group.branchQuestions.B].forEach(q => {
      const canvas = document.getElementById(`chart-${q.id}`);
      if (!canvas) return;
      const qStats  = stats[q.id] || {};
      const choices = Object.keys(q.choices);
      const total   = choices.reduce((a, k) => a + (qStats[k] || 0), 0);
      const labels  = choices.map(k => {
        const pct  = total ? Math.round((qStats[k] || 0) / total * 100) : 0;
        const text = (getLang(q.choices[k].label, 'ko') || k).replace(/\\n|\n/g, ' ');
        const trimmed = text.length > 18 ? text.slice(0, 18) + '…' : text;
        return `${k}: ${trimmed}  (${pct}%)`;
      });
      const data = choices.map(k => qStats[k] || 0);

      analysisCharts[q.id] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ data, backgroundColor: COLORS.slice(0, choices.length), borderRadius: 6 }]
        },
        options: {
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            datalabels: {
              anchor: 'end', align: 'end',
              color: '#333',
              font: { weight: 'bold', size: 12 },
              formatter: v => v > 0 ? v : ''
            }
          },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
            y: { grid: { display: false } }
          }
        },
        plugins: [ChartDataLabels]
      });
    });
  });
}

const centerTotalPlugin = {
  id: 'centerTotal',
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#222';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy);
    ctx.restore();
  }
};

async function renderResultCharts() {
  const resultStats = await fetch("/admin/api/result-stats").then(r => r.json());

  ['device', 'book'].forEach(type => {
    const existing = Chart.getChart(`chart-result-${type}`);
    if (existing) existing.destroy();
  });

  const container = document.getElementById("analysis-result-charts");
  if (!container) return;

  ['device', 'book'].forEach(type => {
    const data  = resultStats[type] || {};
    const combos = Object.keys(data).length ? Object.keys(data) : ["AA","AB","AC","BA","BB","BC"];
    const counts = combos.map(k => data[k] || 0);
    const canvas = document.getElementById(`chart-result-${type}`);
    if (!canvas) return;

    const PALETTE = ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948'];
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: combos.map(k => {
          const entry = (state.mapping[type] || {})[k] || {};
          return `${k} — ${entry.title?.ko || k}`;
        }),
        datasets: [{ data: counts, backgroundColor: PALETTE, borderWidth: 2 }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
          datalabels: {
            color: '#fff',
            font: { weight: 'bold', size: 13 },
            formatter: (v, ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total ? Math.round(v / total * 100) : 0;
              return v > 0 ? `${pct}%` : '';
            }
          }
        }
      },
      plugins: [ChartDataLabels, centerTotalPlugin]
    });
  });
}

document.getElementById("btn-refresh-analysis").addEventListener("click", () => {
  renderAnalysis();
  renderResultCharts();
});

document.getElementById("btn-export-excel").addEventListener("click", async () => {
  const resultStats = await fetch("/admin/api/result-stats").then(r => r.json());
  const stats = deriveQuestionStats(resultStats);

  const wb = XLSX.utils.book_new();

  // Sheet 1 — Question Stats
  const qRows = [["Group", "Question", "Choice", "Choice Text (KO)", "Count", "%"]];
  state.groups.forEach((group, gi) => {
    const groupLabel = getLang(group.label, 'ko') || `Group ${gi + 1}`;
    const questions = [
      { q: group.rootQuestion,      label: "Root" },
      { q: group.branchQuestions.A, label: "Branch A" },
      { q: group.branchQuestions.B, label: "Branch B" }
    ];
    questions.forEach(({ q, label }) => {
      const qStats = stats[q.id] || {};
      const total  = Object.values(qStats).reduce((a, b) => a + b, 0);
      const qText  = getLang(q.text, 'ko');
      Object.keys(q.choices).forEach(k => {
        const count = qStats[k] || 0;
        const pct   = total ? Math.round(count / total * 100) : 0;
        qRows.push([groupLabel, `${label}: ${qText}`, k, getLang(q.choices[k].label, 'ko'), count, `${pct}%`]);
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qRows), "Questions");

  // Sheet 2 — Results Picked
  const rRows = [["Type", "Code", "Title (KO)", "Count"]];
  ["device", "book"].forEach(type => {
    const data = resultStats[type] || {};
    Object.keys(state.mapping[type] || {}).forEach(code => {
      const title = getLang((state.mapping[type][code] || {}).title, 'ko') || code;
      rRows.push([type, code, title, data[code] || 0]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rRows), "Results Picked");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `kiosk-stats-${date}.xlsx`);
});

// ── Export / Import ────────────────────────────────────────
document.getElementById("btn-export-setup").addEventListener("click", () => {
  window.location.href = "/admin/api/export";
});

async function importSetup(input) {
  const file = input.files[0];
  if (!file) return;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/admin/api/import", { method: "POST", body: form });
  if (res.ok) {
    toast("Import successful — reloading...");
    setTimeout(() => location.reload(), 1200);
  } else {
    toast("Import failed", true);
  }
  input.value = "";
}

// ── Utils ──────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

init();
