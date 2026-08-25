# 计分 Bug 说明：PHQ-9 / GAD-7 恒为最低等级

## 现象

无论用户如何选择，PHQ-9 和 GAD-7 的结果页始终显示绿色最低等级（"没有抑郁"/"没有焦虑"）。

## 原因

`scorer.js` 的 `scoreSum` 函数（负责单维度量表计分）原先做了两次解读表查询：

```js
const interpByTotal = findInterpretation(totalScore, config.interpretation);
const interpByMean  = findInterpretation(mean,      config.interpretation);

return {
  level: interpByMean.level || interpByTotal.level,
  color: interpByMean.color || interpByTotal.color,
  advice: interpByMean.advice || interpByTotal.advice,
};
```

表面上是"双保险"——总分查一次、均分查一次。但 `||` 的短路逻辑导致 `interpByMean` 有值时（字符串非空即 truthy），`interpByTotal` 的结果被完全丢弃。

**关键错位**：PHQ-9 的解读表按总分设计（0–4 / 5–9 / 10–14 / 15–19 / 20–27），但均分 = 总分 ÷ 9，范围永远在 0–3。用均分去查总分的表，永远命中第一条 `0 ≤ mean < 4` → "没有抑郁"。

SCL-90 不受影响，因为它走的是 `scoreDimensionSum` 分支，解读表本身就是为因子均分设计的（1.0–2.0 / 2.0–3.0 / 3.0–4.0 / 4.0–5.0）。

## 修复

`scoreSum` 改为仅用 `totalScore` 查表：

```js
const interp = findInterpretation(totalScore, config.interpretation);
```

`mean` 保留为纯展示字段（结果页中的"因子均分"），不参与等级判定。

## 架构保证

解读表（min/max/level/color/advice）全部定义在各量表自己的 `basic.json` 中，`scorer.js` 只做通用查表，不硬编码任何分数范围。修改判定标准只需编辑 JSON，无需改 JS。
