// scale-runner.js — 通用答题引擎

const params = new URLSearchParams(window.location.search);
const scaleId = params.get('scale');

if (!scaleId) {
  window.location.href = 'index.html';
  throw new Error('缺少量表 ID');
}

let config = null;
let items = [];
let answers = {};
let currentIndex = 0;

async function init() {
  // 加载 basic.json
  const configRes = await fetch(`scales/${scaleId}/basic.json`);
  config = await configRes.json();

  // 加载 items.csv
  const csvRes = await fetch(`scales/${scaleId}/${config.source.file}`);
  const csvText = await csvRes.text();
  items = parseCsv(csvText, config.source);

  // 渲染页面
  renderHeader();
  renderCurrentQuestion();
  updateProgress();
  bindEvents();
}

function parseCsv(text, source) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const optCols = headers.filter(h => h.startsWith(source.optionPrefix));
  const valCols = headers.filter(h => h.startsWith(source.valuePrefix));

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i]; });

    row.options = optCols.map((col, idx) => ({
      text: row[col],
      value: parseInt(row[valCols[idx]], 10)
    }));

    return row;
  });
}

function renderHeader() {
  document.getElementById('scale-title').textContent = config.title;
  document.getElementById('scale-description').textContent = config.description;

  const instructionEl = document.getElementById('scale-instruction');
  if (config.instruction) {
    instructionEl.textContent = config.instruction;
    instructionEl.style.display = 'block';
  }
}

function renderCurrentQuestion() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';

  const item = items[currentIndex];
  const card = document.createElement('div');
  card.className = 'question-card fade-in';

  // 恢复之前选中的选项
  const selectedVal = answers[item.q_id];

  const optionsHtml = item.options.map((opt) => `
    <label class="option-item${selectedVal === opt.value ? ' selected' : ''}" data-qid="${item.q_id}" data-val="${opt.value}">
      <input type="radio" name="q_${item.q_id}" value="${opt.value}"${selectedVal === opt.value ? ' checked' : ''}>
      <span>${escapeHtml(opt.text)}</span>
    </label>
  `).join('');

  card.innerHTML = `
    <div class="question-index">第 ${currentIndex + 1} 题 / 共 ${items.length} 题</div>
    <div class="question-text">${escapeHtml(item.text)}</div>
    <div class="option-list">${optionsHtml}</div>
  `;

  container.appendChild(card);
}

function showQuestion(index) {
  if (index < 0 || index >= items.length) return;
  currentIndex = index;
  renderCurrentQuestion();
  updateProgress();
}

function renderQuestions() {
  renderCurrentQuestion();
}

function updateProgress() {
  const answered = Object.keys(answers).length;
  const total = items.length;
  const pct = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  document.getElementById('progress-text').textContent = `第 ${currentIndex + 1} 题 / 共 ${total} 题`;
  document.getElementById('progress-fill').style.width = `${pct}%`;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;
  const hasAnswer = answers[items[currentIndex].q_id] !== undefined;

  document.getElementById('btn-prev').disabled = isFirst;
  document.getElementById('btn-next').disabled = !hasAnswer;
  document.getElementById('btn-next').textContent = isLast ? '提交' : '下一题';
}

function bindEvents() {
  // 选项点击
  document.getElementById('questions-container').addEventListener('click', (e) => {
    const label = e.target.closest('.option-item');
    if (!label) return;

    const qid = label.dataset.qid;
    const val = parseInt(label.dataset.val, 10);

    // 清除同题其他选中
    label.closest('.option-list').querySelectorAll('.option-item.selected').forEach(el => {
      el.classList.remove('selected');
    });
    label.classList.add('selected');

    answers[qid] = val;
    updateProgress();
  });

  // 上一题
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (currentIndex > 0) {
      showQuestion(currentIndex - 1);
    }
  });

  // 下一题 / 提交
  document.getElementById('btn-next').addEventListener('click', () => {
    const isLast = currentIndex === items.length - 1;
    if (isLast) {
      handleSubmit();
    } else {
      showQuestion(currentIndex + 1);
    }
  });
}

async function handleSubmit() {
  // 调用计分
  const result = await import('./scorer.js').then(m => m.score(answers, items, config));

  // 存储结果
  sessionStorage.setItem('psyScale_result', JSON.stringify({
    scaleId: config.id,
    title: config.title,
    ...result
  }));

  // 跳转结果页
  window.location.href = `result.html?scale=${encodeURIComponent(config.id)}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
