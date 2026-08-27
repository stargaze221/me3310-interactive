(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const TRUE_OFFSET = 0.50;
  const TRUE_SLOPE = 0.0400;
  const DEFAULT_OFFSET = 0.30;
  const DEFAULT_SLOPE = 0.0450;
  const MAX_N = 50;

  let noiseZ = [];
  let showFit = false;
  let showTrue = false;

  const el = id => document.getElementById(id);
  const positions = makeProgressivePositions(MAX_N);

  const sampleSize = el('sample-size');
  const noise = el('noise');
  const offset = el('offset');
  const slope = el('slope');
  const residualToggle = el('show-residuals');

  sampleSize.addEventListener('change', render);
  noise.addEventListener('input', render);
  offset.addEventListener('input', render);
  slope.addEventListener('input', render);
  residualToggle.addEventListener('change', render);
  el('new-experiment').addEventListener('click', newExperiment);
  el('reset-guess').addEventListener('click', () => {
    offset.value = DEFAULT_OFFSET;
    slope.value = DEFAULT_SLOPE;
    render();
  });
  el('toggle-fit').addEventListener('click', () => {
    showFit = !showFit;
    render();
  });
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

  function newExperiment() {
    noiseZ = Array.from({ length: MAX_N }, randn);
    showFit = false;
    showTrue = false;
    render();
  }

  function currentData() {
    const n = Number(sampleSize.value);
    const sigma = Number(noise.value);
    return positions.slice(0, n).map((x, i) => ({
      x,
      y: TRUE_OFFSET + TRUE_SLOPE * x + sigma * noiseZ[i]
    }));
  }

  function leastSquares(data) {
    const n = data.length;
    const meanX = data.reduce((s, d) => s + d.x, 0) / n;
    const meanY = data.reduce((s, d) => s + d.y, 0) / n;
    const sxx = data.reduce((s, d) => s + (d.x - meanX) ** 2, 0);
    const sxy = data.reduce((s, d) => s + (d.x - meanX) * (d.y - meanY), 0);
    const b1 = sxy / sxx;
    const b0 = meanY - b1 * meanX;
    return { b0, b1, sse: calcSSE(data, b0, b1) };
  }

  function calcSSE(data, b0, b1) {
    return data.reduce((sum, d) => {
      const r = d.y - (b0 + b1 * d.x);
      return sum + r * r;
    }, 0);
  }

  function formatSSE(value) {
    if (Math.abs(value) < 1e-6) return '< 0.000001 V²';
    if (Math.abs(value) < 0.001) return `${value.toExponential(2)} V²`;
    return `${value.toFixed(4)} V²`;
  }

  function render() {
    const data = currentData();
    const guessB0 = Number(offset.value);
    const guessB1 = Number(slope.value);
    const guessSSE = calcSSE(data, guessB0, guessB1);
    const fit = leastSquares(data);

    el('noise-value').textContent = `${Number(noise.value).toFixed(2)} V`;
    el('offset-value').textContent = `${guessB0.toFixed(2)} V`;
    el('slope-value').textContent = `${guessB1.toFixed(4)} V/%`;

    el('stat-n').textContent = data.length;
    el('stat-sse').textContent = formatSSE(guessSSE);
    el('stat-offset').textContent = `${guessB0.toFixed(2)} V`;
    el('stat-slope').textContent = `${guessB1.toFixed(4)} V/%`;

    el('toggle-fit').textContent = showFit ? 'Hide least-squares fit' : 'Reveal least-squares fit';
    el('toggle-true').textContent = showTrue ? 'Hide true model' : 'Show true model';

    el('fit-result').classList.toggle('hidden', !showFit);
    el('legend-fit').classList.toggle('hidden', !showFit);
    el('fit-equation').textContent = `V̂ = ${fit.b0.toFixed(3)} + ${fit.b1.toFixed(5)} p`;
    el('fit-sse').textContent = `Minimum SSE for these data = ${formatSSE(fit.sse)}`;

    el('true-result').classList.toggle('hidden', !showTrue);
    el('legend-true').classList.toggle('hidden', !showTrue);
    el('true-equation').textContent = `V = ${TRUE_OFFSET.toFixed(2)} + ${TRUE_SLOPE.toFixed(4)} p`;

    updateObservation(data.length, fit);
    drawCalibration(data, guessB0, guessB1, fit);
  }

  function updateObservation(n, fit) {
    const box = el('observation');
    if (n === 2) {
      box.innerHTML = '<strong>Two-point warning:</strong> with two calibration points, a straight line can pass through both measurements exactly, so the least-squares SSE is essentially zero. A perfect fit to two points does <em>not</em> show that the sensor is truly linear or that the estimated offset and sensitivity equal the true values.';
    } else if (n <= 5) {
      box.innerHTML = '<strong>Small-sample question:</strong> try a few new experiments without changing n. Notice that the estimated offset and sensitivity can move because each finite sample contains a different realization of measurement noise.';
    } else if (n < 20) {
      box.innerHTML = '<strong>Adding evidence:</strong> increase the number of calibration points while keeping the same experiment. The existing measurements remain and new points are added across the calibration range. Watch how the fitted offset and sensitivity respond.';
    } else {
      const offsetError = fit.b0 - TRUE_OFFSET;
      const slopeError = fit.b1 - TRUE_SLOPE;
      box.innerHTML = `<strong>More evidence, not perfect knowledge:</strong> with n = ${n}, the least-squares estimates are typically more stable, but finite noisy data still need not recover the exact true parameters. In this realization, b̂₀ − b₀ = ${offsetError.toFixed(3)} V and b̂₁ − b₁ = ${slopeError.toFixed(5)} V/%.`;
    }
  }

  function svgEl(name, attrs = {}, text = '') {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  }

  function setupSvg(svg, height = 390) {
    const width = Math.max(460, svg.clientWidth || 760);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';
    return { width, height };
  }

  function ticks(min, max, count = 5) {
    return Array.from({ length: count + 1 }, (_, i) => min + (max - min) * i / count);
  }

  function formatTick(v) {
    if (Math.abs(v) >= 10) return Number(v.toFixed(1)).toString();
    return Number(v.toFixed(2)).toString();
  }

  function drawAxes(svg, width, height, margin, xScale, yScale, yMin, yMax) {
    const x0 = margin.left;
    const x1 = width - margin.right;
    const y0 = height - margin.bottom;
    const y1 = margin.top;

    ticks(yMin, yMax, 5).forEach(t => {
      const y = yScale(t);
      svg.appendChild(svgEl('line', { x1:x0, y1:y, x2:x1, y2:y, class:'gridline' }));
      svg.appendChild(svgEl('text', { x:x0-8, y:y+4, 'text-anchor':'end', class:'tick-label' }, formatTick(t)));
    });

    [0, 20, 40, 60, 80, 100].forEach(t => {
      const x = xScale(t);
      svg.appendChild(svgEl('line', { x1:x, y1:y1, x2:x, y2:y0, class:'gridline' }));
      svg.appendChild(svgEl('text', { x, y:y0+18, 'text-anchor':'middle', class:'tick-label' }, String(t)));
    });

    svg.appendChild(svgEl('line', { x1:x0, y1:y0, x2:x1, y2:y0, class:'axis' }));
    svg.appendChild(svgEl('line', { x1:x0, y1:y0, x2:x0, y2:y1, class:'axis' }));
    svg.appendChild(svgEl('text', { x:(x0+x1)/2, y:height-6, 'text-anchor':'middle', class:'axis-label' }, 'Pedal position, p (%)'));
    svg.appendChild(svgEl('text', { x:15, y:(y0+y1)/2, transform:`rotate(-90 15 ${(y0+y1)/2})`, 'text-anchor':'middle', class:'axis-label' }, 'Sensor voltage, V (V)'));
  }

  function drawCalibration(data, guessB0, guessB1, fit) {
    const svg = el('calibration-chart');
    const { width, height } = setupSvg(svg, 390);
    const m = { left:64, right:20, top:22, bottom:50 };

    const lineValues = [
      guessB0,
      guessB0 + guessB1 * 100,
      TRUE_OFFSET,
      TRUE_OFFSET + TRUE_SLOPE * 100,
      fit.b0,
      fit.b0 + fit.b1 * 100,
      ...data.map(d => d.y)
    ];
    let yMin = Math.min(...lineValues);
    let yMax = Math.max(...lineValues);
    const pad = Math.max(0.25, (yMax - yMin) * 0.10);
    yMin = Math.min(0, yMin - pad);
    yMax += pad;

    const xScale = x => m.left + x / 100 * (width - m.left - m.right);
    const yScale = y => height - m.bottom - (y - yMin) / (yMax - yMin) * (height - m.top - m.bottom);

    drawAxes(svg, width, height, m, xScale, yScale, yMin, yMax);

    if (showTrue) drawLine(svg, xScale, yScale, TRUE_OFFSET, TRUE_SLOPE, 'true-line');
    if (showFit) drawLine(svg, xScale, yScale, fit.b0, fit.b1, 'fit-line');

    if (residualToggle.checked) {
      data.forEach(d => {
        const yHat = guessB0 + guessB1 * d.x;
        svg.appendChild(svgEl('line', {
          x1:xScale(d.x), y1:yScale(d.y),
          x2:xScale(d.x), y2:yScale(yHat),
          class:'residual-line'
        }));
      });
    }

    drawLine(svg, xScale, yScale, guessB0, guessB1, 'guess-line');

    data.forEach(d => {
      const point = svgEl('circle', {
        cx:xScale(d.x), cy:yScale(d.y), r:5.2, class:'data-point'
      });
      const title = svgEl('title', {}, `p = ${d.x.toFixed(2)}%, V = ${d.y.toFixed(3)} V`);
      point.appendChild(title);
      svg.appendChild(point);
    });
  }

  function drawLine(svg, xScale, yScale, b0, b1, className) {
    svg.appendChild(svgEl('line', {
      x1:xScale(0), y1:yScale(b0),
      x2:xScale(100), y2:yScale(b0 + b1 * 100),
      class:className
    }));
  }

  newExperiment();
})();
