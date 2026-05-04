let groups = [];
let mapping = {};
let currentGroupIdx = 0;
let currentStep = 0;       // 0 = root question, 1 = branch question
let firstAnswerKey = null;
let groupAnswers = {};     // { device: "AB", book: "BA" }

const app = document.getElementById("app");

async function applyTheme() {
  try {
    const theme = await fetch("/data/theme.json").then(r => r.json());
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
        <div class="q-text">${q.text.replace(/\\n|\n/g, '<br>')}</div>
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
      <div class="choice-text">${c.label.replace(/\\n|\n/g, '<br>')}</div>
      <div class="choice-img">${img}</div>
    </div>
  `;
}

function answer(key) {
  const group = groups[currentGroupIdx];
  const questionId = currentStep === 0
    ? group.rootQuestion.id
    : group.branchQuestions[firstAnswerKey].id;

  fetch("/api/quiz-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, answerKey: key })
  });

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
            <div class="result-tag">추천 기기</div>
            <div class="result-title">${device.title || ""}</div>
            ${device.image ? `<img class="result-device-img" src="${device.image}" />` : ""}
            ${device.description ? `<p class="result-desc">${device.description}</p>` : ""}
          </div>

          <div class="result-divider"></div>

          <div class="result-col">
            <div class="result-tag">추천 도서</div>
            <div class="result-title">${book.title || ""}</div>
            ${book.image ? `<img class="result-book-img" src="${book.image}" />` : ""}
            ${book.description ? `<p class="result-desc">${book.description}</p>` : ""}
          </div>

        </div>
      </section>
      <section class="result-actions">
        <button class="btn pill primary" onclick="printResult('${deviceCode}','${bookCode}')">티켓 출력하기</button>
        <button class="btn pill secondary" onclick="reset()">다시 시작</button>
      </section>
    </div>
  `;
}

function printResult(deviceCode, bookCode) {
  window.open(`/print/print.html?device=${deviceCode}&book=${bookCode}`, "_blank");
}

function reset() {
  currentGroupIdx = 0;
  currentStep = 0;
  firstAnswerKey = null;
  groupAnswers = {};
  renderCurrentQuestion();
}

loadData();
