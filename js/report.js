// report.js — 评估结果下载模块

const REPORT_VERSION = 1;

/**
 * 将量表结果组装为 JSON 并触发浏览器下载
 * @param {object} data - result.js 传入的完整计分结果
 * @param {string} scaleId - 量表 ID
 * @param {string} title - 量表中文名
 */
export function downloadResult(data, scaleId, title) {
  const report = buildReport(data, scaleId, title);
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${scaleId}-report-${today()}.json`;
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
    // 多维度：factors + summary
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

  // 单维度：summary only
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

function today() {
  return new Date().toISOString().slice(0, 10);
}
