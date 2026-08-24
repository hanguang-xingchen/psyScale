// result.js — 结果展示

import { drawRadar } from './radar.js';
import { downloadResult } from './report.js';

const params = new URLSearchParams(window.location.search);
const scaleId = params.get('scale');

function init() {
  const resultData = sessionStorage.getItem('psyScale_result');

  if (!resultData) {
    document.getElementById('result-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p>暂无结果数据，请先完成量表答题</p>
        <a href="index.html" class="btn btn-primary btn-mt-lg">去答题</a>
      </div>
    `;
    return;
  }

  const data = JSON.parse(resultData);
  document.getElementById('result-title').textContent = `${data.title} — 结果`;

  const content = document.getElementById('result-content');

  if (data.type === 'single') {
    content.innerHTML = renderSingle(data);
  } else if (data.type === 'dimensions') {
    content.innerHTML = renderDimensions(data);
    // 延迟一帧渲染雷达图，确保 DOM 已插入
    requestAnimationFrame(() => drawRadarForData(data));
  }

  // 清理 sessionStorage
  sessionStorage.removeItem('psyScale_result');

  // 应用动态颜色
  applyDynamicColors();

  // 重新答题按钮
  document.getElementById('btn-retry').addEventListener('click', () => {
    window.location.href = `scale.html?scale=${encodeURIComponent(scaleId)}`;
  });

  // 下载报告按钮（事件委托，因为按钮是 innerHTML 动态插入的）
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-download')) {
      downloadResult(data, scaleId, data.title);
    }
  });
}

function applyDynamicColors() {
  document.querySelectorAll('[data-color]').forEach(el => {
    const color = el.dataset.color;
    if (el.classList.contains('result-score-color')) {
      el.style.color = color;
    } else if (el.classList.contains('result-level-color')) {
      el.style.background = color;
      el.style.color = 'white';
    } else if (el.classList.contains('level-badge-color')) {
      el.style.background = color;
    }
  });
}

function renderSingle(data) {
  return `
    <div class="result-card fade-in">
      <div class="result-label">总分</div>
      <div class="result-score result-score-color" data-color="${escapeHtml(data.color)}">${data.totalScore}</div>
      <div class="result-meta">
        <div class="meta-item">
          <span class="meta-label">题目数</span>
          <span class="meta-value">${data.totalItems}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">因子均分</span>
          <span class="meta-value result-score-color" data-color="${escapeHtml(data.color)}">${data.mean}</span>
        </div>
      </div>
      <div class="result-level result-level-color" data-color="${escapeHtml(data.color)}">
        ${escapeHtml(data.level)}
      </div>
      <div class="result-advice">${escapeHtml(data.advice)}</div>
    </div>
    <p class="text-center text-sm text-muted btn-mt-lg">
      本结果仅供参考，不构成医学诊断。如有疑虑请咨询专业人士。
    </p>
    <div class="action-bar" id="btn-download" style="justify-content: center; cursor: pointer;">
      <span>📥 下载报告</span>
    </div>
  `;
}

function renderDimensions(data) {
  const dimCount = data.dimensions.filter(d => d.dimension !== '其他').length;
  // 过滤掉"其他"维度用于雷达图
  const radarDims = data.dimensions.filter(d => d.dimension !== '其他');

  const rows = data.dimensions.map(d => `
    <tr>
      <td>${escapeHtml(d.dimension)}</td>
      <td class="text-center">${d.mean}（${d.score}/${d.count}题）</td>
      <td class="text-right">
        <span class="level-badge level-badge-color" data-color="${escapeHtml(d.color)}">
          ${escapeHtml(d.level)}
        </span>
      </td>
    </tr>
  `).join('');

  return `
    <div class="result-overall fade-in">
      <div class="result-overall-info">
        <div class="result-label">总平均分</div>
        <div class="result-score result-score-color" data-color="${escapeHtml(data.overallColor)}">${data.overallMean}</div>
        <div class="result-level result-level-color" data-color="${escapeHtml(data.overallColor)}">
          ${escapeHtml(data.overallLevel)}
        </div>
        <div class="result-meta">
          <div class="meta-item">
            <span class="meta-label">题目数</span>
            <span class="meta-value">${data.totalItems}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">维度数</span>
            <span class="meta-value">${dimCount}</span>
          </div>
        </div>
        <div class="result-advice">${escapeHtml(data.overallAdvice)}</div>
      </div>
      <div class="result-overall-radar">
        <div id="radar-container"></div>
      </div>
    </div>
    <div class="result-card fade-in">
      <table class="dimension-table">
        <thead>
          <tr>
            <th>维度</th>
            <th class="text-center">因子均分</th>
            <th class="text-right">等级</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="text-center text-sm text-muted btn-mt-lg">
      本结果仅供参考，不构成医学诊断。如有疑虑请咨询专业人士。
    </p>
    <div class="action-bar" id="btn-download" style="justify-content: center; cursor: pointer;">
      <span>📥 下载报告</span>
    </div>
  `;
}

function drawRadarForData(data) {
  // 过滤掉"其他"维度
  const dims = data.dimensions.filter(d => d.dimension !== '其他');
  if (dims.length < 3) return; // 少于 3 个维度不画雷达图

  drawRadar('#radar-container', {
    dimensions: dims.map(d => d.dimension),
    values: dims.map(d => d.mean),
    levels: dims.map(d => d.level),
    colors: dims.map(d => d.color),
    minValue: 1,
    maxValue: 5,
    fillColor: 'rgba(244,114,182,0.15)',
    strokeColor: '#f472b6',
    strokeWidth: 2,
    levelCount: 4
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
