// result.js — 结果展示

import { drawRadar } from './radar.js';
import { downloadResult, downloadResultWithDetail, downloadCsvDetail } from './report.js';
import { loadResult } from './db.js';
import { t } from './i18n.js';

const params = new URLSearchParams(window.location.search);
const scaleId = params.get('scale');
let resultData = null; // 全局保存以便下载事件使用

async function init() {
  const data = await loadResult(scaleId);
  resultData = data;

  if (!data) {
    document.getElementById('result-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p>${t('noResultText')}</p>
        <a href="index.html" class="btn btn-primary btn-mt-lg">${t('goToAnswer')}</a>
      </div>
    `;
    return;
  }

  document.getElementById('result-title').textContent = `${data.title} — 结果`;

  const content = document.getElementById('result-content');

  if (data.type === 'single') {
    content.innerHTML = renderSingle(data);
  } else if (data.type === 'dimensions') {
    content.innerHTML = renderDimensions(data);
    // 延迟一帧渲染雷达图，确保 DOM 已插入
    requestAnimationFrame(() => drawRadarForData(data));
  }

  // 应用动态颜色
  applyDynamicColors();

  // 重新答题按钮
  document.getElementById('btn-retry').addEventListener('click', () => {
    window.location.href = `scale.html?scale=${encodeURIComponent(scaleId)}`;
  });

  // 下载主按钮：切换下拉菜单
  document.getElementById('btn-download-main').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('download-menu');
    menu.classList.toggle('show');
  });

  // 下载选项点击
  document.getElementById('download-menu').addEventListener('click', async (e) => {
    const option = e.target.closest('.download-option');
    if (!option) return;
    const type = option.dataset.type;

    if (type === 'report') {
      downloadResult(resultData, scaleId, resultData.title);
    } else if (type === 'detail-report') {
      downloadResultWithDetail(resultData, scaleId, resultData.title);
    } else if (type === 'detail-csv') {
      await downloadCsvDetail(resultData, scaleId, resultData.title);
    }
    document.getElementById('download-menu').classList.remove('show');
  });

  // 点击别处关闭下拉菜单
  document.addEventListener('click', () => {
    document.getElementById('download-menu').classList.remove('show');
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
      <div class="result-label">${t('totalScore')}</div>
      <div class="result-score result-score-color" data-color="${escapeHtml(data.color)}">${data.totalScore}</div>
      <div class="result-meta">
        <div class="meta-item">
          <span class="meta-label">${t('totalItems')}</span>
          <span class="meta-value">${data.totalItems}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">${t('meanScore')}</span>
          <span class="meta-value result-score-color" data-color="${escapeHtml(data.color)}">${data.mean}</span>
        </div>
      </div>
      <div class="result-level result-level-color" data-color="${escapeHtml(data.color)}">
        ${escapeHtml(data.level)}
      </div>
      <div class="result-advice">${escapeHtml(data.advice)}</div>
    </div>
    <p class="text-center text-sm text-muted btn-mt-lg">
      ${t('disclaimer')}
    </p>
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
        <div class="result-label">${t('meanScore')}</div>
        <div class="result-score result-score-color" data-color="${escapeHtml(data.overallColor)}">${data.overallMean}</div>
        <div class="result-level result-level-color" data-color="${escapeHtml(data.overallColor)}">
          ${escapeHtml(data.overallLevel)}
        </div>
        <div class="result-meta">
          <div class="meta-item">
            <span class="meta-label">${t('totalItems')}</span>
            <span class="meta-value">${data.totalItems}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${t('dimCount')}</span>
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
            <th>${t('dimension')}</th>
            <th class="text-center">${t('meanScore')}</th>
            <th class="text-right">${t('level')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="text-center text-sm text-muted btn-mt-lg">
      ${t('disclaimer')}
    </p>
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
