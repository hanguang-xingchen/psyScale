// result.js — 结果展示

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
  }

  // 清理 sessionStorage
  sessionStorage.removeItem('psyScale_result');

  // 应用动态颜色
  applyDynamicColors();

  // 重新答题按钮
  document.getElementById('btn-retry').addEventListener('click', () => {
    window.location.href = `scale.html?scale=${encodeURIComponent(scaleId)}`;
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
  `;
}

function renderDimensions(data) {
  const dimCount = data.dimensions.filter(d => d.dimension !== '总分').length;

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
    <div class="result-card fade-in">
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
      <div class="result-advice">${escapeHtml(data.overallAdvice)}</div>
    </div>
    <p class="text-center text-sm text-muted btn-mt-lg">
      本结果仅供参考，不构成医学诊断。如有疑虑请咨询专业人士。
    </p>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
