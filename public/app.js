let questions = [];
let mapping = {};
let current = 0;
let answers = [];

const app = document.getElementById("app");

async function applyTheme() {
  try {
    const theme = await fetch("/data/theme.json").then(r => r.json());
    const root = document.documentElement;
    if (theme.bg)               root.style.setProperty("--bg", theme.bg);
    if (theme.text)             root.style.setProperty("--text", theme.text);
    if (theme.choiceBg)         root.style.setProperty("--choice-bg", theme.choiceBg);
    if (theme.choiceText)       root.style.setProperty("--choice-text", theme.choiceText);
    if (theme.btnPrimaryBg)     root.style.setProperty("--btn-primary-bg", theme.btnPrimaryBg);
    if (theme.btnPrimaryText)   root.style.setProperty("--btn-primary-text", theme.btnPrimaryText);
    if (theme.btnSecondaryBg)   root.style.setProperty("--btn-secondary-bg", theme.btnSecondaryBg);
    if (theme.btnSecondaryText) root.style.setProperty("--btn-secondary-text", theme.btnSecondaryText);
  } catch(e) {}
}

async function loadData() {
  await applyTheme();
  questions = await fetch("/data/questions.json").then(r => r.json());
  mapping   = await fetch("/data/mapping.json").then(r => r.json());
  renderQuestion();
}

function renderQuestion() {
  const q = questions[current];

  app.innerHTML = `
    <div class="screen">
      <header class="top">
        <img src="/img/logo.png" class="logo" />
      </header>
      <section class="question-area">
        <div class="q-number">Q.${current + 1}</div>
        <div class="q-text">${q.text}</div>
      </section>
      <section class="choices">
        ${renderChoice(q, "A")}
        ${renderChoice(q, "B")}
      </section>
    </div>
  `;
}

function renderChoice(q, key) {
  const c = q.choices[key];
  return `
    <div class="choice" onclick="answer('${key}')">
      <div class="choice-label">${key}</div>
      <div class="choice-text">${c.label}</div>
      <div class="choice-img">
        <img src="${c.image}" />
      </div>
    </div>
  `;
}

function answer(key) {
  const q = questions[current];

  fetch("/api/quiz-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: q.id, answerKey: key })
  });

  answers.push(key);
  current++;

  if (current < questions.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  const type = answers.join("");
  const result = mapping[type];

  if (!result) {
    app.innerHTML = `<h1>NO RESULT FOR TYPE ${type}</h1>`;
    return;
  }

  app.innerHTML = `
    <div class="screen result-screen">
      <header class="top">
        <img src="/img/logo.png" class="logo" />
      </header>
      <section class="result-area">
        <div class="result-title">${result.title}</div>
        <img class="result-type-img" src="${result.typeImage}" />
        <p class="result-desc">${result.description}</p>
        <img class="result-device-img" src="${result.deviceImage}" />
      </section>
      <section class="result-actions">
        <button class="btn pill primary" onclick="printResult('${type}')">티켓 출력하기</button>
        <button class="btn pill secondary" onclick="reset()">다시 시작</button>
      </section>
    </div>
  `;
}

function printResult(type) {
  window.open(`/print/print.html?type=${type}`, "_blank");
}

function reset() {
  current = 0;
  answers = [];
  renderQuestion();
}

loadData();
