// public/app.js

let questions = [];
let mapping = {};
let current = 0;
let answers = [];

const app = document.getElementById("app");

// use this when you want to add randomness to the equation
// function pickVariant(base) {
//   const v = Math.random() < 0.5 ? 1 : 2;
//   return `${base}_${v}.png`;
// }

function pickVariant(base) {
  return `${base}_1.png`;
}

async function loadData() {
  questions = await fetch("/data/questions.json").then(r => r.json());
  mapping = await fetch("/data/mapping.json").then(r => r.json());
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
  const img = pickVariant(c.imageBase);

  return `
    <div class="choice" onclick="answer('${key}')">
      <div class="choice-label">${key}</div>
      <div class="choice-text">${c.label}</div>
      <div class="choice-img">
        <img src="${img}" />
      </div>
    </div>
  `;
}

function answer(key) {
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

// async function printResult(type) {
//   await fetch("/print", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ type })
//   });
// }

function reset() {
  current = 0;
  answers = [];
  renderQuestion();
}

loadData();