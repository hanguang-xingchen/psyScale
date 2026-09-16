// report.js — 评估结果下载模块

const REPORT_VERSION = 1;

/**
 * 下载标准报告（JSON，不含原始答卷）
 */
export function downloadResult(data, scaleId, title) {
  const report = buildReport(data, scaleId, title);
  downloadJson(report, `${scaleId}-report-${today()}.json`);
}

/**
 * 下载含原始答卷的详细报告（JSON）
 */
export function downloadResultWithDetail(data, scaleId, title) {
  const report = buildReport(data, scaleId, title);
  report.answers = data.answers || [];
  downloadJson(report, `${scaleId}-report-detail-${today()}.json`);
}

/**
 * 下载答题明细（CSV）
 */
export async function downloadCsvDetail(data, scaleId, title) {
  const configRes = await fetch(`scales/${scaleId}/basic.json`);
  const config = await configRes.json();

  const csvRes = await fetch(`scales/${scaleId}/${config.source.file}`);
  const csvText = await csvRes.text();

  const items = parseCsvItems(csvText, config.source);

  const rows = [['题号', '题目', '选项', '分值']];
  items.forEach((item, i) => {
    const val = data.answers?.[i];
    const selectedOpt = item.options.find(o => o.value === val);
    rows.push([
      item.q_id,
      item.text,
      selectedOpt ? selectedOpt.text : '(未答)',
      val != null ? String(val) : ''
    ]);
  });

  const csvContent = rows.map(r =>
    r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${scaleId}-detail-${today()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildReport(data, scaleId, title) {
  const base = {
    version: REPORT_VERSION,
    date: today(),
    scale: title,
    scaleId
  };

  if (data.type === 'dimensions') {
    const factors = {};
    for (const d of data.dimensions) {
      factors[d.dimension] = d.mean;
    }
    return {
      ...base,
      factors,
      summary: {
        totalScore: data.totalScore,
        totalMean: data.overallMean,
        positiveItemCount: data.positiveItemCount,
        positiveMean: data.positiveMean,
        factorOverThreshold: data.factorOverThreshold || []
      }
    };
  }

  return {
    ...base,
    summary: {
      totalScore: data.totalScore,
      mean: data.mean,
      level: data.level,
      totalItems: data.totalItems
    }
  };
}

function downloadJson(obj, filename) {
  // 将 answers 数组压缩为一行，避免在 JSON 中换行
  const answers = obj.answers;
  delete obj.answers;
  let json = JSON.stringify(obj, null, 2);
  json = json.slice(0, -1); // 去掉末尾 }
  if (answers) {
    json += ',\n  "answers": ' + JSON.stringify(answers) + '\n}';
  } else {
    json += '\n}';
  }
  if (answers) obj.answers = answers; // 恢复对象

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 简易 CSV 解析（仅解析量表数据格式）
function parseCsvItems(text, source) {
  const lines = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else { field += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === ',') { current.push(field); field = ''; i++; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        current.push(field); field = '';
        if (current.some(c => c !== '')) lines.push(current);
        current = []; i++;
      } else { field += ch; i++; }
    }
  }
  current.push(field);
  if (current.some(c => c !== '')) lines.push(current);

  if (lines.length === 0) return [];
  const headers = lines[0];
  const optCols = headers.filter(h => h.startsWith(source.optionPrefix));
  const valCols = headers.filter(h => h.startsWith(source.valuePrefix));

  return lines.slice(1).map(cols => {
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });
    row.options = optCols.map((col, idx) => ({
      text: row[col] || '',
      value: parseInt(row[valCols[idx]], 10)
    }));
    return row;
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}