// scorer.js — 计分引擎

export function score(answers, items, config) {
  const scoringType = config.scoring.type;

  if (scoringType === 'sum') {
    return scoreSum(answers, items, config);
  }

  if (scoringType === 'dimensionSum') {
    return scoreDimensionSum(answers, items, config);
  }

  throw new Error(`未知计分类型: ${scoringType}`);
}

function scoreSum(answers, items, config) {
  let totalScore = 0;
  const totalItems = items.length;
  for (const qid in answers) {
    totalScore += answers[qid];
  }

  const mean = totalItems > 0 ? totalScore / totalItems : 0;
  const roundedMean = Math.round(mean * 100) / 100;

  const interp = findInterpretation(totalScore, config.interpretation);

  return {
    type: 'single',
    totalScore,
    totalItems,
    mean: roundedMean,
    level: interp.level,
    color: interp.color,
    advice: interp.advice
  };
}

function scoreDimensionSum(answers, items, config) {
  // 按维度分组
  const dimensions = {};

  items.forEach(item => {
    const dim = item.dimension || '总分';
    if (!dimensions[dim]) {
      dimensions[dim] = { score: 0, count: 0 };
    }
    const qid = String(item.q_id);
    if (answers[qid] !== undefined) {
      dimensions[dim].score += answers[qid];
      dimensions[dim].count += 1;
    }
  });

  // 计算总平均分
  let totalScore = 0;
  let totalItems = 0;
  for (const data of Object.values(dimensions)) {
    totalScore += data.score;
    totalItems += data.count;
  }
  const overallMean = totalItems > 0 ? Math.round((totalScore / totalItems) * 100) / 100 : 0;
  const overallInterp = findInterpretation(overallMean, config.interpretation);

  // 阳性项目统计：单项 ≥ 2 视为阳性（SCL-90 标准）
  let positiveItemCount = 0;
  let positiveTotalScore = 0;
  items.forEach(item => {
    const qid = String(item.q_id);
    const val = answers[qid];
    if (val !== undefined && val >= 2) {
      positiveItemCount += 1;
      positiveTotalScore += val;
    }
  });
  const positiveMean = positiveItemCount > 0
    ? Math.round((positiveTotalScore / positiveItemCount) * 100) / 100
    : 0;

  // 计算各维度因子均分 + 超阈值维度列表
  const results = [];
  const factorOverThreshold = [];
  // 推导阈值：取 interpretation 中 min=2.0 的 entry，否则默认 2.0
  const threshold = config.interpretation.find(i => i.min === 2)?.min ?? 2.0;

  for (const [name, data] of Object.entries(dimensions)) {
    const mean = data.count > 0 ? data.score / data.count : 0;
    const interp = findInterpretation(mean, config.interpretation);
    const roundedMean = Math.round(mean * 100) / 100;
    results.push({
      dimension: name,
      score: data.score,
      count: data.count,
      mean: roundedMean,
      level: interp.level,
      color: interp.color,
      advice: interp.advice
    });
    if (mean >= threshold) {
      factorOverThreshold.push(name);
    }
  }

  return {
    type: 'dimensions',
    overallMean,
    overallLevel: overallInterp.level,
    overallColor: overallInterp.color,
    overallAdvice: overallInterp.advice,
    totalScore,
    totalItems,
    positiveItemCount,
    positiveMean,
    factorOverThreshold,
    dimensions: results
  };
}

function findInterpretation(score, interpretations) {
  for (const interp of interpretations) {
    if (score >= interp.min && score < interp.max) {
      return interp;
    }
  }
  // 兜底：返回最后一个
  return interpretations[interpretations.length - 1];
}
