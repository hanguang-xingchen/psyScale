// radar.js — 纯 SVG 雷达图模块

export function drawRadar(container, config) {
  const {
    dimensions,   // ['躯体化', '强迫', ...]
    values,       // [2.3, 1.8, ...]
    levels,       // ['轻度', '正常', ...]
    colors,       // ['#f472b6', '#4caf50', ...]
    minValue = 1,
    maxValue = 5,
    fillColor = 'rgba(244,114,182,0.2)',
    strokeColor = '#f472b6',
    strokeWidth = 2,
    levelCount = 5   // 同心圆层数
  } = config;

  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  el.innerHTML = '';

  const n = dimensions.length;
  if (n === 0) return;

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2; // 从顶部开始

  // SVG 尺寸
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 40; // 留边距给标签

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'radar-svg');

  // 计算某一层半径
  function radius(level) {
    return (level / levelCount) * maxR;
  }

  // 计算某个轴上某个值的坐标
  function pointCoords(axisIndex, value) {
    const angle = startAngle + axisIndex * angleStep;
    const ratio = (value - minValue) / (maxValue - minValue);
    const r = ratio * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  // 绘制同心圆参考线
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridGroup.setAttribute('class', 'radar-grid');

  for (let i = 1; i <= levelCount; i++) {
    const r = radius(i);
    const points = [];
    for (let j = 0; j < n; j++) {
      const angle = startAngle + j * angleStep;
      points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points.join(' '));
    polygon.setAttribute('fill', 'none');
    polygon.setAttribute('stroke', '#e5e7eb');
    polygon.setAttribute('stroke-width', '1');
    gridGroup.appendChild(polygon);
  }

  // 同心圆分值标签
  for (let i = 1; i <= levelCount; i++) {
    const val = minValue + (maxValue - minValue) * (i / levelCount);
    const r = radius(i);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', cx + 2);
    text.setAttribute('y', cy - r + 4);
    text.setAttribute('fill', '#9ca3af');
    text.setAttribute('font-size', '10');
    text.textContent = Math.round(val * 10) / 10;
    gridGroup.appendChild(text);
  }

  svg.appendChild(gridGroup);

  // 绘制轴线和轴标签
  const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  axisGroup.setAttribute('class', 'radar-axes');

  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const endX = cx + maxR * Math.cos(angle);
    const endY = cy + maxR * Math.sin(angle);

    // 轴线
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', cx);
    line.setAttribute('y1', cy);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.setAttribute('stroke', '#f3f4f6');
    line.setAttribute('stroke-width', '1');
    axisGroup.appendChild(line);

    // 标签位置（轴端点外侧）
    const labelR = maxR + 18;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);

    // 标签
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', '#374151');
    text.setAttribute('font-size', '11');
    text.setAttribute('class', 'radar-label');
    text.setAttribute('data-dim-index', i);
    text.textContent = dimensions[i];

    // 分数标签
    const scoreR = maxR + 32;
    const sx = cx + scoreR * Math.cos(angle);
    const sy = cy + scoreR * Math.sin(angle);

    const scoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    scoreText.setAttribute('x', sx);
    scoreText.setAttribute('y', sy);
    scoreText.setAttribute('text-anchor', 'middle');
    scoreText.setAttribute('dominant-baseline', 'central');
    scoreText.setAttribute('fill', colors[i]);
    scoreText.setAttribute('font-size', '10');
    scoreText.setAttribute('font-weight', '600');
    scoreText.setAttribute('class', 'radar-score');
    scoreText.textContent = values[i];
    scoreText.setAttribute('data-dim-index', i);

    axisGroup.appendChild(text);
    axisGroup.appendChild(scoreText);
  }

  svg.appendChild(axisGroup);

  // 绘制数据多边形
  const dataGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  dataGroup.setAttribute('class', 'radar-data');

  // 填充
  const fillPoints = values.map((v, i) => {
    const p = pointCoords(i, v);
    return `${p.x},${p.y}`;
  }).join(' ');

  const fillPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  fillPolygon.setAttribute('points', fillPoints);
  fillPolygon.setAttribute('fill', fillColor);
  fillPolygon.setAttribute('stroke', strokeColor);
  fillPolygon.setAttribute('stroke-width', strokeWidth);
  fillPolygon.setAttribute('class', 'radar-polygon');
  dataGroup.appendChild(fillPolygon);

  // 数据点
  values.forEach((v, i) => {
    const p = pointCoords(i, v);
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', '4');
    circle.setAttribute('fill', colors[i]);
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('class', 'radar-dot');
    circle.setAttribute('data-dim-index', i);
    circle.style.cursor = 'pointer';

    // hover 交互
    circle.addEventListener('mouseenter', () => highlightAxis(i, true));
    circle.addEventListener('mouseleave', () => highlightAxis(i, false));

    dataGroup.appendChild(circle);
  });

  svg.appendChild(dataGroup);
  el.appendChild(svg);

  // 高亮/取消高亮
  function highlightAxis(index, on) {
    const labels = el.querySelectorAll('.radar-label');
    const scores = el.querySelectorAll('.radar-score');
    const dots = el.querySelectorAll('.radar-dot');
    const polygon = el.querySelector('.radar-polygon');

    if (on) {
      if (dots[index]) dots[index].setAttribute('r', '6');
      if (scores[index]) {
        scores[index].setAttribute('font-size', '12');
      }
      if (polygon) {
        polygon.setAttribute('stroke-width', strokeWidth + 1);
      }
    } else {
      if (dots[index]) dots[index].setAttribute('r', '4');
      if (scores[index]) {
        scores[index].setAttribute('font-size', '10');
      }
      if (polygon) {
        polygon.setAttribute('stroke-width', strokeWidth);
      }
    }
  }
}
