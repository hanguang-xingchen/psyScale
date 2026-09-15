// index.js — 主页

async function init() {
  if (await checkResume()) return;
  await loadScales();
}

async function checkResume() {
  const { peekDraft } = await import('./db.js');
  const draft = await peekDraft();
  if (!draft) return false;

  const dialog = document.getElementById('resume-dialog');
  const titleEl = document.getElementById('resume-scale-title');

  try {
    const res = await fetch(`scales/${draft.scaleId}/basic.json`);
    const config = await res.json();
    titleEl.textContent = config.title;
  } catch {
    titleEl.textContent = draft.scaleId;
  }

  const timeEl = document.getElementById('resume-time');
  timeEl.textContent = formatRelativeTime(draft.timestamp);

  dialog.showModal();

  return new Promise((resolve) => {
    document.getElementById('btn-resume').onclick = () => {
      dialog.close();
      window.location.href = `scale.html?scale=${encodeURIComponent(draft.scaleId)}&resume=1`;
      resolve(true);
    };
    document.getElementById('btn-abandon').onclick = async () => {
      dialog.close();
      const { clearDraft } = await import('./db.js');
      await clearDraft(draft.scaleId);
      resolve(false);
    };
  });
}

async function loadScales() {
  const container = document.getElementById('scale-list');
  const loading = document.getElementById('loading');

  let scaleIds;
  try {
    const indexRes = await fetch('scales/index.json');
    scaleIds = await indexRes.json();
  } catch {
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
  link.href = `notice.html?scale=${encodeURIComponent(config.id)}`;
  link.className = 'btn btn-primary btn-full btn-mt';
  link.textContent = '开始答题';

  card.appendChild(link);
  return card;
}

function formatRelativeTime(ts) {
  if (!ts) return '刚刚';
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
