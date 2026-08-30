(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const TRUE_OFFSET = 0.50;
  const TRUE_SLOPE = 0.0400;
  const MAX_N = 50;
  const MIN_N = 3;

  let currentN = MIN_N;
  let noiseZ = [];
  let showTrue = false;

  const el = id => document.getElementById(id);
  const positions = makeProgressivePositions(MAX_N);

  const t975 = {
    1:12.706,2:4.303,3:3.182,4:2.776,5:2.571,6:2.447,7:2.365,8:2.306,9:2.262,10:2.228,
    11:2.201,12:2.179,13:2.160,14:2.145,15:2.131,16:2.120,17:2.110,18:2.101,19:2.093,20:2.086,
    21:2.080,22:2.074,23:2.069,24:2.064,25:2.060,26:2.056,27:2.052,28:2.048,29:2.045,30:2.042,
    31:2.040,32:2.037,33:2.035,34:2.032,35:2.030,36:2.028,37:2.026,38:2.024,39:2.023,40:2.021,
    41:2.020,42:2.018,43:2.017,44:2.015,45:2.014,46:2.013,47:2.012,48:2.011,49:2.010,50:2.009
  };

  el('add-one').addEventListener('click', () => addEvidence(1));
  el('add-five').addEventListener('click', () => addEvidence(5));
  el('show-all').addEventListener('click', () => {
    currentN = MAX_N;
    render();
  });
  el('reset-evidence').addEventListener('click', () => {
    currentN = MIN_N;
    render();
  });
  el('new-experiment').addEventListener('click', newExperiment);
  el('noise').addEventListener('change', render);
  el('toggle-true').addEventListener('click', () => {
    showTrue = !showTrue;
    render();
  });
  window.addEventListener('resize', render);

  function makeProgressivePositions(count) {
    const xs = [0, 100];
    for (let level = 1; xs.length < count; level++) {
      const denominator = 2 ** level;
      for (let numerator = 1; numerator < denominator && xs.length < count; numerator += 2) {
        xs.push(100 * numerator / denominator);
      }
    }
    return xs.slice(0, count);
  }

  function randn() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function addEvidence(amount) {
    currentN = Math.min(MAX_N, currentN + amount);
    render();
  }

  function newExperiment() {
    noiseZ = Array.from({ length: MAX_N }, randn);
    currentN = MIN_N;
    showTrue = false;
    render();
  }

  function sigma() {
    return Number(el('noise').value);
  }

  function dataPrefix(n) {
    const sd = sigma();
    return positions.slice(0, n).map((x, i) => ({
      x,
      y: TRUE_OFFSET + TRUE_SLOPE * x + sd * noiseZ[i]
    }));
  }

  function tCritical(df) {
    if (df <= 1) return t975[1];
    if (df >= 50) return t975[50];
    return t975[df];
  }

  function leastSquares(data) {
    const n = data.length;
    const meanX = data.reduce((sum, d) => sum + d.x, 0) / n;
    const meanY = data.reduce((sum, d) => sum + d.y, 0) / n;
    const sxx = data.reduce((sum, d) => sum + (d.x - meanX) ** 2, 0);
    const sxy = data.reduce((sum, d) => sum + (d.x - meanX) * (d.y - meanY), 0);
    const b1 = sxy / sxx;
    const b0 = meanY - b1 * meanX;
    const sse = data.reduce((sum, d) => {
      const residual = d.y - (b0 + b1 * d.x);
      return sum + residual * residual;
    }, 0);
    const df = n - 2;
    const residualSd = Math.sqrt(Math.max(0, sse / df));
    const seSlope = residualSd / Math.sqrt(sxx);
    const t = tCritical(df);
    const slopeHalfWidth = t * seSlope;
    return {
      n, meanX, meanY, sxx, b0, b1, sse, df, residualSd, seSlope, t,
      slopeLower: b1 - slopeHalfWidth,
      slopeUpper: b1 + slopeHalfWidth,
      slopeHalfWidth
    };
  }

  function meanBandAt(fit, x) {
    const yHat = fit.b0 + fit.b1 * x;
    const seMean = fit.residualSd * Math.sqrt(1 / fit.n + ((x - fit.meanX) ** 2) / fit.sxx);
    const half = fit.t * seMean;
    return { x, yHat, lower: yHat - half, upper: yHat + half };
  }

  function history() {
    const rows = [];
    for (let n = MIN_N; n <= currentN; n++) {
      const fit = leastSquares(dataPrefix(n));
      rows.push({
        n,
        estimate: fit.b1,
        lower: fit.slopeLower,
        upper: fit.slopeUpper,
        width: fit.slopeUpper - fit.slopeLower
      });
    }
    return rows;
  }

  function render() {
    const data = dataPrefix(currentN);
    const fit = leastSquares(data);
    const rows = history();
    const previous = rows.length > 1 ? rows[rows.length - 2] : null;

    el('stat-n').textContent = String(currentN);
    el('stat-slope').textContent = `${fit.b1.toFixed(5)} V/%FS`;
    el('stat-ci').textContent = `[${fit.slopeLower.toFixed(5)}, ${fit.slopeUpper.toFixed(5)}]`;
    el('stat-ci-width').textContent = `${(fit.slopeUpper - fit.slopeLower).toFixed(5)} V/%FS`;
    el('stat-ci-width').nextElementSibling.textContent = `df = ${fit.df}, t* = ${fit.t.toFixed(3)}`;
    el('stat-s').textContent = `${fit.residualSd.toFixed(3)} V`;

    el('add-one').disabled = currentN >= MAX_N;
    el('add-five').disabled = currentN >= MAX_N;
    el('show-all').disabled = currentN >= MAX_N;
    el('reset-evidence').disabled = currentN <= MIN_N;
    el('toggle-true').textContent = showTrue ? 'Hide true model' : 'Reveal true model';
    el('legend-true-cal').classList.toggle('hidden', !showTrue);
    el('legend-true-history').classList.toggle('hidden', !showTrue);

    updateObservation(fit, previous);
    drawCalibration(data, fit);
    drawHistory(rows);
  }

  function updateObservation(fit, previous) {
    const box = el('observation');
    const width = fit.slopeUpper - fit.slopeLower;
    if (!previous) {
      box.innerHTML = `<strong>Start with very little evidence:</strong> with n = ${fit.n}, only ${fit.df} degree of freedom remains for estimating residual scatter. The 95% interval can be wide because both the standard error and the t critical value reflect limited information.`;
      return;
    }

    const delta = width - previous.width;
    if (delta < -1e-9) {
      box.innerHTML = `<strong>This update narrowed the interval.</strong> The current 95% slope-CI width is ${width.toFixed(5)} V/%FS. More well-distributed evidence generally increases information about the sensitivity, although the interval does not have to shrink after every single point.`;
    } else if (delta > 1e-9) {
      box.innerHTML = `<strong>This update widened the interval slightly.</strong> That can happen: the new observation changed the estimated residual scatter enough to offset the added information. Confidence intervals need not shrink monotonically one point at a time.`;
    } else {
      box.innerHTML = `<strong>More evidence:</strong> the interval width changed very little with this observation. Watch the overall trend as additional measurements accumulate across the calibration range.`;
    }
  }

  function svgEl(name, attrs = {}, text = '') {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text) node.textContent = text;
    return node;
  }

  function setupSvg(svg, height) {
    const width = Math.max(460, svg.clientWidth || 760);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';
    return { width, height };
  }

  function ticks(min, max, count = 5) {
    return Array.from({ length: count + 1 }, (_, i) => min + (max - min) * i / count);
  }

  function formatTick(value) {
    const a = Math.abs(value);
    if (a >= 10) return Number(value.toFixed(1)).toString();
    if (a >= 1) return Number(value.toFixed(2)).toString();
    if (a >= 0.01) return Number(value.toFixed(3)).toString();
    return value.toFixed(4);
  }

  function drawAxes(svg, width, height, margin, xScale, yScale, xTicks, yMin, yMax, xLabel, yLabel) {
    const x0 = margin.left;
    const x1 = width - margin.right;
    const y0 = height - margin.bottom;
    const y1 = margin.top;

    ticks(yMin, yMax, 5).forEach(t => {
      const y = yScale(t);
      svg.appendChild(svgEl('line', { x1:x0, y1:y, x2:x1, y2:y, class:'gridline' }));
      svg.appendChild(svgEl('text', { x:x0-8, y:y+4, 'text-anchor':'end', class:'tick-label' }, formatTick(t)));
    });

    xTicks.forEach(t => {
      const x = xScale(t);
      svg.appendChild(svgEl('line', { x1:x, y1:y1, x2:x, y2:y0, class:'gridline' }));
      svg.appendChild(svgEl('text', { x, y:y0+18, 'text-anchor':'middle', class:'tick-label' }, String(t)));
    });

    svg.appendChild(svgEl('line', { x1:x0, y1:y0, x2:x1, y2:y0, class:'axis' }));
    svg.appendChild(svgEl('line', { x1:x0, y1:y0, x2:x0, y2:y1, class:'axis' }));
    svg.appendChild(svgEl('text', { x:(x0+x1)/2, y:height-6, 'text-anchor':'middle', class:'axis-label' }, xLabel));
    svg.appendChild(svgEl('text', { x:15, y:(y0+y1)/2, transform:`rotate(-90 15 ${(y0+y1)/2})`, 'text-anchor':'middle', class:'axis-label' }, yLabel));
  }

  function pathFromPoints(points, xScale, yScale, yKey) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x ?? p.n)} ${yScale(p[yKey])}`).join(' ');
  }

  function polygonPath(upperPoints, lowerPoints, xScale, yScale, xKey, upperKey, lowerKey) {
    const upper = upperPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p[xKey])} ${yScale(p[upperKey])}`).join(' ');
    const lower = [...lowerPoints].reverse().map(p => `L ${xScale(p[xKey])} ${yScale(p[lowerKey])}`).join(' ');
    return `${upper} ${lower} Z`;
  }

  function drawCalibration(data, fit) {
    const svg = el('calibration-chart');
    const { width, height } = setupSvg(svg, 390);
    const m = { left:64, right:20, top:22, bottom:50 };
    const band = Array.from({ length: 51 }, (_, i) => meanBandAt(fit, i * 2));

    const values = [
      ...data.map(d => d.y),
      ...band.map(d => d.lower),
      ...band.map(d => d.upper),
      TRUE_OFFSET,
      TRUE_OFFSET + TRUE_SLOPE * 100
    ];
    let yMin = Math.min(...values);
    let yMax = Math.max(...values);
    const pad = Math.max(0.20, (yMax - yMin) * 0.08);
    yMin -= pad;
    yMax += pad;

    const xScale = x => m.left + x / 100 * (width - m.left - m.right);
    const yScale = y => height - m.bottom - (y - yMin) / (yMax - yMin) * (height - m.top - m.bottom);

    drawAxes(svg, width, height, m, xScale, yScale, [0,20,40,60,80,100], yMin, yMax, 'Pedal position, p (%FS)', 'Sensor voltage, V (V)');

    svg.appendChild(svgEl('path', {
      d: polygonPath(band, band, xScale, yScale, 'x', 'upper', 'lower'),
      class:'conf-band'
    }));
    svg.appendChild(svgEl('path', { d:pathFromPoints(band, xScale, yScale, 'upper'), class:'conf-bound' }));
    svg.appendChild(svgEl('path', { d:pathFromPoints(band, xScale, yScale, 'lower'), class:'conf-bound' }));

    if (showTrue) {
      svg.appendChild(svgEl('line', {
        x1:xScale(0), y1:yScale(TRUE_OFFSET),
        x2:xScale(100), y2:yScale(TRUE_OFFSET + TRUE_SLOPE * 100),
        class:'true-line-svg'
      }));
    }

    svg.appendChild(svgEl('line', {
      x1:xScale(0), y1:yScale(fit.b0),
      x2:xScale(100), y2:yScale(fit.b0 + fit.b1 * 100),
      class:'fit-line-svg'
    }));

    data.forEach(d => {
      const point = svgEl('circle', { cx:xScale(d.x), cy:yScale(d.y), r:5.0, class:'data-point' });
      point.appendChild(svgEl('title', {}, `p = ${d.x.toFixed(2)} %FS, V = ${d.y.toFixed(3)} V`));
      svg.appendChild(point);
    });
  }

  function drawHistory(rows) {
    const svg = el('history-chart');
    const { width, height } = setupSvg(svg, 300);
    const m = { left:74, right:20, top:20, bottom:50 };

    const yValues = rows.flatMap(r => [r.lower, r.upper, r.estimate]);
    if (showTrue) yValues.push(TRUE_SLOPE);
    let yMin = Math.min(...yValues);
    let yMax = Math.max(...yValues);
    const range = Math.max(0.002, yMax - yMin);
    yMin -= range * 0.12;
    yMax += range * 0.12;

    const xScale = n => m.left + (n - MIN_N) / (MAX_N - MIN_N) * (width - m.left - m.right);
    const yScale = y => height - m.bottom - (y - yMin) / (yMax - yMin) * (height - m.top - m.bottom);
    const xTicks = [3,10,20,30,40,50];

    drawAxes(svg, width, height, m, xScale, yScale, xTicks, yMin, yMax, 'Number of calibration measurements, n', 'Estimated sensitivity, V/%FS');

    svg.appendChild(svgEl('path', {
      d: polygonPath(rows, rows, xScale, yScale, 'n', 'upper', 'lower'),
      class:'history-band'
    }));
    svg.appendChild(svgEl('path', { d:pathFromPoints(rows, xScale, yScale, 'upper'), class:'history-bound' }));
    svg.appendChild(svgEl('path', { d:pathFromPoints(rows, xScale, yScale, 'lower'), class:'history-bound' }));
    svg.appendChild(svgEl('path', { d:pathFromPoints(rows, xScale, yScale, 'estimate'), class:'history-estimate' }));

    if (showTrue) {
      svg.appendChild(svgEl('line', {
        x1:xScale(MIN_N), y1:yScale(TRUE_SLOPE),
        x2:xScale(MAX_N), y2:yScale(TRUE_SLOPE),
        class:'history-true'
      }));
    }

    const last = rows[rows.length - 1];
    svg.appendChild(svgEl('line', {
      x1:xScale(last.n), y1:m.top,
      x2:xScale(last.n), y2:height-m.bottom,
      class:'current-guide'
    }));
    svg.appendChild(svgEl('circle', {
      cx:xScale(last.n), cy:yScale(last.estimate), r:4.8, class:'history-point'
    }));
  }

  newExperiment();
})();
