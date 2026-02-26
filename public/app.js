let questions = [];
let mapping = {};
let current = 0;
let answers = [];

const app = document.getElementById("app");

function pickVariant(base) {
  const v = Math.random() < 0.5 ? 1 : 2;
  return `${base}_${v}.jpeg`;
}

async function loadData() {
  questions = await fetch("/data/questions.json").then(r => r.json());
  mapping = await fetch("/data/mapping.json").then(r => r.json());
  renderQuestion();
}

function renderQuestion() {
  const q = questions[current];
  app.innerHTML = `
    <div class="question">
      <h1>${q.text}</h1>
      <div class="choices">
        ${renderChoice(q, "A")}
        ${renderChoice(q, "B")}
      </div>
    </div>
  `;
}

function renderChoice(q, key) {
  const c = q.choices[key];
  const img = pickVariant(c.imageBase);

  return `
    <div class="choice" onclick="answer('${key}')">
      <img src="${img}" />
      <p>${c.label}</p>
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
    <div class="result">
      <h1>TYPE ${type}</h1>
      <img class="types-img" src="${result.typeImage}" />
      <h2>${result.title}</h2>
      <img class="devices-img" src="${result.deviceImage}" />
      <p>${result.description}</p>
      <button onclick="printResult('${type}')">PRINT</button>
      <button onclick="reset()">RESTART</button>
    </div>
  `;
}

async function printResult(type) {
  await fetch("/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type })
  });
}

function reset() {
  current = 0;
  answers = [];
  renderQuestion();
}

loadData();

