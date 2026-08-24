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

/**
 * 解析 CSV 文本为题目数组（RFC 4180 兼容）
 * 支持：引号内逗号、引号内换行、引号转义（"" → "）
 */
function parseCsv(text, source) {
  const tokens = tokenizeCsv(text);
  if (tokens.length === 0) return [];

  const headers = tokens[0];
  const optCols = headers.filter(h => h.startsWith(source.optionPrefix));
  const valCols = headers.filter(h => h.startsWith(source.valuePrefix));

  return tokens.slice(1).map(cols => {
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] || ''; });

    row.options = optCols.map((col, idx) => ({
      text: row[col] || '',
      value: parseInt(row[valCols[idx]], 10)
    }));

    return row;
  });
}

/**
 * 将 CSV 文本拆分为 token 行（每行是字符串数组）
 */
function tokenizeCsv(text) {
  const lines = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // 引号转义: "" → "
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        current.push(field);
        field = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        // 处理 \r\n
        if (ch === '\r' && text[i + 1] === '\n') i++;
        current.push(field);
        field = '';
        if (current.some(c => c !== '')) lines.push(current);
        current = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // 最后一个字段
  current.push(field);
  if (current.some(c => c !== '')) lines.push(current);

  return lines;
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
  // 提交前检查所有题目是否已答
  const unanswered = items.filter(item => answers[item.q_id] === undefined);
  if (unanswered.length > 0) {
    const qids = unanswered.map(i => i.q_id).join('、');
    alert(`还有 ${unanswered.length} 题未作答（第 ${qids} 题），请完成所有题目后再提交。`);
    // 跳转到第一道未答题
    currentIndex = items.indexOf(unanswered[0]);
    renderCurrentQuestion();
    updateProgress();
    return;
  }

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
