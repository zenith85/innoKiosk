let groups = [];
let mapping = {};
let theme = {};
let lang = "ko";
let currentGroupIdx = 0;
let currentStep = 0;
let firstAnswerKey = null;
let groupAnswers = {};

const app = document.getElementById("app");

/* Returns the correct language string from a {ko, en} object or plain string */
function getText(val) {
  if (!val) return '';
  if (typeof val === 'object') return val[lang] || val.ko || val.en || '';
  return val;
}

async function applyTheme() {
  try {
    theme = await fetch("/data/theme.json").then(r => r.json());
    const root = document.documentElement;
    if (theme.bg)               root.style.setProperty("--bg", theme.bg);
    if (theme.text)             root.style.setProperty("--text", theme.text);
    if (theme.choiceBg)         root.style.setProperty("--choice-bg", theme.choiceBg);
    if (theme.choiceBg1)        root.style.setProperty("--choice-bg-1", theme.choiceBg1);
    if (theme.choiceBg2)        root.style.setProperty("--choice-bg-2", theme.choiceBg2);
    if (theme.choiceBg3)        root.style.setProperty("--choice-bg-3", theme.choiceBg3);
    if (theme.choiceText)       root.style.setProperty("--choice-text", theme.choiceText);
    if (theme.btnPrimaryBg)     root.style.setProperty("--btn-primary-bg", theme.btnPrimaryBg);
    if (theme.btnPrimaryText)   root.style.setProperty("--btn-primary-text", theme.btnPrimaryText);
    if (theme.btnSecondaryBg)   root.style.setProperty("--btn-secondary-bg", theme.btnSecondaryBg);
    if (theme.btnSecondaryText) root.style.setProperty("--btn-secondary-text", theme.btnSecondaryText);
  } catch(e) {}
}

async function loadData() {
  await applyTheme();
  const data = await fetch("/data/questions.json").then(r => r.json());
  groups  = data.groups;
  mapping = await fetch("/data/mapping.json").then(r => r.json());
  await fetchVideoPlaylist();
  showFrontPage();
}

let idleTimer = null;
let idleEnabled = localStorage.getItem("idleEnabled") !== "false";

function clearIdleTimer() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
}

function toggleIdle() {
  idleEnabled = !idleEnabled;
  localStorage.setItem("idleEnabled", idleEnabled);
  const input = document.getElementById("idle-toggle-input");
  if (input) input.checked = idleEnabled;
  clearIdleTimer();
  if (idleEnabled) startIdleTimer();
}

let videoPlaylist = [];
let videoIndex = 0;

async function fetchVideoPlaylist() {
  try {
    videoPlaylist = await fetch("/api/videos").then(r => r.json());
  } catch (e) {
    videoPlaylist = [];
  }
}

function startIdleTimer() {
  if (!idleEnabled || !videoPlaylist.length) return;
  idleTimer = setTimeout(() => {
    const overlay = document.getElementById("video-overlay");
    const video   = document.getElementById("idle-video");
    const toggle  = document.getElementById("idle-switch-wrap");
    if (!overlay || !video) return;
    if (toggle) toggle.style.display = "none";
    overlay.classList.remove("hidden");
    videoIndex = 0;
    video.src = videoPlaylist[videoIndex];
    video.play().catch(() => {});
    video.addEventListener("ended", function onEnded() {
      videoIndex = (videoIndex + 1) % videoPlaylist.length;
      video.src = videoPlaylist[videoIndex];
      video.play().catch(() => {});
    });
  }, 10000);
}

function showFrontPage() {
  clearIdleTimer();
  app.innerHTML = `
    <div class="screen lang-screen" id="front-screen">
      <div class="lang-content">
        <img src="/img/logo.png" class="lang-logo" />
        <p class="lang-title front-title">${theme.frontTitle || '콜라보 굿즈 받아가세요!'}</p>
        ${theme.frontImage ? `<img src="${theme.frontImage}" class="front-img" />` : ''}
        <div class="lang-buttons">
          <button class="btn-lang btn-lang-single" onclick="showLanguageSelect()">${theme.frontButtonText || '테스트 후 굿즈받기'}</button>
        </div>
      </div>
      <div id="idle-switch-wrap" class="idle-switch-wrap">
        <span class="idle-switch-label">Idle</span>
        <label class="idle-switch">
          <input type="checkbox" id="idle-toggle-input" onchange="toggleIdle()" ${idleEnabled ? 'checked' : ''}>
          <span class="idle-switch-slider"></span>
        </label>
      </div>
      <div id="video-overlay" class="video-overlay hidden">
        <video id="idle-video" muted playsinline></video>
      </div>
    </div>
  `;

  startIdleTimer();

  document.getElementById("front-screen").addEventListener("click", (e) => {
    const overlay = document.getElementById("video-overlay");
    if (overlay && !overlay.classList.contains("hidden")) {
      e.stopPropagation();
      showFrontPage();
    }
  }, { capture: true });
}

function showLanguageSelect() {
  clearIdleTimer();
  app.innerHTML = `
    <div class="screen lang-screen">
      <div class="lang-content">
        <img src="/img/logo.png" class="lang-logo" />
        <p class="lang-subtitle">알고 보면 더 재미있는 독서 스타일!</p>
        <p class="lang-title">당신에게 딱 맞는<br>책과 이북리더기는?!</p>
        <img src="/img/LanguagePage.png" class="lang-frontpage" />
        <div class="lang-buttons">
          <button class="btn-lang" onclick="selectLang('ko')">한국어</button>
          <button class="btn-lang" onclick="selectLang('en')">English</button>
        </div>
      </div>
    </div>
  `;
}

function selectLang(l) {
  clearIdleTimer();
  lang = l;
  currentGroupIdx = 0;
  currentStep = 0;
  firstAnswerKey = null;
  groupAnswers = {};
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const group = groups[currentGroupIdx];
  const question = currentStep === 0
    ? group.rootQuestion
    : group.branchQuestions[firstAnswerKey];
  renderQuestion(question);
}

function renderQuestion(q) {
  const choiceKeys = Object.keys(q.choices);
  const count = choiceKeys.length;

  app.innerHTML = `
    <div class="screen">
      <section class="question-area">
        <div class="q-number">Q.${questionNumber()}</div>
        <div class="q-text">${getText(q.text).replace(/\\n|\n/g, '<br>')}</div>
      </section>
      <section class="choices" data-count="${count}">
        ${choiceKeys.map(key => renderChoice(q, key)).join("")}
      </section>
      <footer class="bottom">
        <img src="/img/logo.png" class="logo" />
      </footer>
    </div>
  `;
}

function questionNumber() {
  return currentGroupIdx * 2 + currentStep + 1;
}

function renderChoice(q, key) {
  const c = q.choices[key];
  const img = c.image ? `<img src="${c.image}" />` : "";
  return `
    <div class="choice" onclick="answer('${key}')">
      <div class="choice-label">${key}</div>
      <div class="choice-text">${getText(c.label).replace(/\\n|\n/g, '<br>')}</div>
      <div class="choice-img">${img}</div>
    </div>
  `;
}

function answer(key) {
  const group = groups[currentGroupIdx];
  const questionId = currentStep === 0
    ? group.rootQuestion.id
    : group.branchQuestions[firstAnswerKey].id;


  if (currentStep === 0) {
    firstAnswerKey = key;
    currentStep = 1;
    renderCurrentQuestion();
  } else {
    groupAnswers[group.id] = firstAnswerKey + key;
    currentGroupIdx++;
    currentStep = 0;
    firstAnswerKey = null;

    if (currentGroupIdx < groups.length) {
      renderCurrentQuestion();
    } else {
      showResult();
    }
  }
}

function showResult() {
  const deviceCode = groupAnswers["device"];
  const bookCode   = groupAnswers["book"];

  fetch("/api/result-pick", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceCode, bookCode })
  });
  const device = mapping.device[deviceCode] || {};
  const book   = mapping.book[bookCode]     || {};

  app.innerHTML = `
    <div class="screen result-screen">
      <header class="top">
        <img src="/img/logo.png" class="logo" />
      </header>
      <section class="result-area">
        <div class="result-columns">

          <div class="result-col">
            <div class="result-tag">${lang === 'en' ? 'Recommended Device' : '추천 기기'}</div>
            <div class="result-title">${getText(device.title) || ""}</div>
            ${device.image ? `<img class="result-device-img" src="${device.image}" />` : ""}
            ${getText(device.description) ? `<p class="result-desc">${getText(device.description)}</p>` : ""}
          </div>

          <div class="result-divider"></div>

          <div class="result-col">
            <div class="result-tag">${lang === 'en' ? 'Recommended Book' : '추천 도서'}</div>
            <div class="result-title">${getText(book.title) || ""}</div>
            ${book.image ? `<img class="result-book-img" src="${book.image}" />` : ""}
            ${getText(book.description) ? `<p class="result-desc">${getText(book.description)}</p>` : ""}
          </div>

        </div>
      </section>
      <section class="result-actions">
        <button class="btn pill primary" onclick="printResult('${deviceCode}','${bookCode}')">${lang === 'en' ? 'Print Ticket' : '티켓 출력하기'}</button>
        <button class="btn pill secondary" onclick="reset()">${lang === 'en' ? 'Start Over' : '다시 시작'}</button>
      </section>
    </div>
  `;
}

function printResult(deviceCode, bookCode) {
  window.open(`/print/print.html?device=${deviceCode}&book=${bookCode}&lang=${lang}`, "_blank");
}

function reset() {
  showFrontPage();
}

loadData();
