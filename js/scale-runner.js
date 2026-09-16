// scale-runner.js — 通用答题引擎

import { saveDraft, loadDraft, clearDraft, saveResult } from './db.js';

const params = new URLSearchParams(window.location.search);
const scaleId = params.get('scale');
const isResume = params.get('resume') === '1';

if (!scaleId) {
  window.location.href = 'index.html';
  throw new Error('缺少量表 ID');
}

let config = null;
let items = [];
let currentIndex = 0;

async function init() {
  const configRes = await fetch(`scales/${scaleId}/basic.json`);
  config = await configRes.json();

  const csvRes = await fetch(`scales/${scaleId}/${config.source.file}`);
  const csvText = await csvRes.text();
  items = parseCsv(csvText, config.source);

  if (isResume) {
    const draft = await loadDraft(scaleId);
    if (draft) {
      currentIndex = draft.currentIndex || 0;
    }
  } else {
    // 新答题：先清除可能残留的旧草稿，再初始化
    await clearDraft(scaleId);
    await saveDraft({ scaleId, answers: {}, currentIndex: 0, timestamp: Date.now() });
  }

  renderHeader();
  initAnswerSheet();
  renderCurrentQuestion();
  updateProgress();
  bindEvents();
}

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

async function renderCurrentQuestion() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';

  const item = items[currentIndex];
  const card = document.createElement('div');
  card.className = 'question-card fade-in';

  const draft = await loadDraft(scaleId);
  const selectedVal = draft?.answers?.[item.q_id];

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

async function updateProgress() {
  const draft = await loadDraft(scaleId);
  const answered = draft ? Object.keys(draft.answers).length : 0;
  const total = items.length;
  const pct = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  document.getElementById('progress-text').textContent = `第 ${currentIndex + 1} 题 / 共 ${total} 题`;
  document.getElementById('progress-fill').style.width = `${pct}%`;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;
  const hasAnswer = draft?.answers?.[items[currentIndex].q_id] !== undefined;

  document.getElementById('btn-prev').disabled = isFirst;
  document.getElementById('btn-next').disabled = !hasAnswer;
  document.getElementById('btn-next').textContent = isLast ? '提交' : '下一题';

  updateAnswerSheet();
}

function initAnswerSheet() {
  const grid = document.getElementById('answer-sheet-grid');
  grid.innerHTML = '';
  for (let i = 0; i < items.length; i++) {
    const el = document.createElement('div');
    el.className = 'answer-sheet-item';
    el.dataset.index = i;
    el.textContent = i + 1;
    grid.appendChild(el);
  }
}

async function updateAnswerSheet() {
  const draft = await loadDraft(scaleId);
  const answers = draft?.answers || {};
  const cells = document.querySelectorAll('.answer-sheet-item');
  cells.forEach((cell, i) => {
    cell.classList.remove('answered', 'current');
    if (answers[items[i].q_id] !== undefined) {
      cell.classList.add('answered');
    }
    if (i === currentIndex) {
      cell.classList.add('current');
    }
  });
}

function bindEvents() {
  // 答题卡折叠切换
  document.getElementById('answer-sheet-toggle').addEventListener('click', () => {
    const sheet = document.getElementById('answer-sheet');
    const toggle = document.getElementById('answer-sheet-toggle');
    sheet.classList.toggle('collapsed');
    toggle.textContent = sheet.classList.contains('collapsed') ? '▶' : '◀';
  });

  // 答题卡点击跳转（仅已答题目可跳转）
  document.getElementById('answer-sheet-grid').addEventListener('click', (e) => {
    const item = e.target.closest('.answer-sheet-item');
    if (!item || !item.classList.contains('answered')) return;
    showQuestion(parseInt(item.dataset.index, 10));
  });

  document.getElementById('questions-container').addEventListener('click', async (e) => {
    const label = e.target.closest('.option-item');
    if (!label) return;

    const qid = label.dataset.qid;
    const val = parseInt(label.dataset.val, 10);

    label.closest('.option-list').querySelectorAll('.option-item.selected').forEach(el => {
      el.classList.remove('selected');
    });
    label.classList.add('selected');

    const draft = await loadDraft(scaleId) || { scaleId, answers: {}, currentIndex: 0 };
    draft.answers[qid] = val;
    draft.timestamp = Date.now();
    await saveDraft(draft);

    updateProgress();
  });

  document.getElementById('btn-prev').addEventListener('click', () => {
    if (currentIndex > 0) {
      showQuestion(currentIndex - 1);
    }
  });

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
  const draft = await loadDraft(scaleId);
  const answers = draft?.answers || {};

  const unanswered = items.filter(item => answers[item.q_id] === undefined);
  if (unanswered.length > 0) {
    const qids = unanswered.map(i => i.q_id).join('、');
    alert(`还有 ${unanswered.length} 题未作答（第 ${qids} 题），请完成所有题目后再提交。`);
    currentIndex = items.indexOf(unanswered[0]);
    renderCurrentQuestion();
    updateProgress();
    return;
  }

  const result = await import('./scorer.js').then(m => m.score(scaleId, items, config));

  // 按题目顺序构建答卷数组
  const answerValues = items.map(item => answers[item.q_id]);

  await saveResult(config.id, {
    scaleId: config.id,
    title: config.title,
    ...result,
    answers: answerValues
  });

  await clearDraft(scaleId);

  window.location.href = `result.html?scale=${encodeURIComponent(config.id)}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
