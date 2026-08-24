// 从 scales/index.json 动态加载量表 ID 列表
async function loadScales() {
  const container = document.getElementById('scale-list');
  const loading = document.getElementById('loading');

  // 动态发现量表 ID
  let scaleIds;
  try {
    const indexRes = await fetch('scales/index.json');
    scaleIds = await indexRes.json();
  } catch {
    // 兜底：手动维护的最小列表
    scaleIds = ['phq-9', 'gad-7', 'scl-90'];
  }

  for (const id of scaleIds) {
    try {
      const res = await fetch(`scales/${id}/basic.json`);
      const config = await res.json();
      const card = createCard(config);
      container.appendChild(card);
    } catch (err) {
      console.error(`加载量表 ${id} 失败:`, err);
    }
  }

  loading.style.display = 'none';
}

function createCard(config) {
  const card = document.createElement('div');
  card.className = 'card fade-in';

  card.innerHTML = `
    <div class="card-title">${escapeHtml(config.title)}</div>
    <div class="card-desc">${escapeHtml(config.description)}</div>
    <div class="card-meta">
      <span>作者: ${escapeHtml(config.author)}</span>
      <span>年份: ${config.year}</span>
    </div>
  `;

  const link = document.createElement('a');
  link.href = `scale.html?scale=${encodeURIComponent(config.id)}`;
  link.className = 'btn btn-primary btn-full btn-mt';
  link.textContent = '开始答题';

  card.appendChild(link);
  return card;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadScales);
