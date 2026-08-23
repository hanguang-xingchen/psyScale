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

  // 先用总分查解读表，如果没有匹配再用均分
  const interpByTotal = findInterpretation(totalScore, config.interpretation);
  const interpByMean = findInterpretation(mean, config.interpretation);

  return {
    type: 'single',
    totalScore,
    totalItems,
    mean: roundedMean,
    level: interpByMean.level || interpByTotal.level,
    color: interpByMean.color || interpByTotal.color,
    advice: interpByMean.advice || interpByTotal.advice
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

  // 计算各维度因子均分
  const results = [];
  for (const [name, data] of Object.entries(dimensions)) {
    const mean = data.count > 0 ? data.score / data.count : 0;
    const interp = findInterpretation(mean, config.interpretation);
    results.push({
      dimension: name,
      score: data.score,
      count: data.count,
      mean: Math.round(mean * 100) / 100,
      level: interp.level,
      color: interp.color,
      advice: interp.advice
    });
  }

  return {
    type: 'dimensions',
    overallMean,
    overallLevel: overallInterp.level,
    overallColor: overallInterp.color,
    overallAdvice: overallInterp.advice,
    totalItems,
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
