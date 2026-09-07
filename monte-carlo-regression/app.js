(() => {
  'use strict';

  const TRUE_B0 = 2;
  const TRUE_B1 = 3;
  const X_MIN = 0;
  const X_MAX = 5;

  const sampleSizeEl = document.getElementById('sampleSize');
  const noiseEl = document.getElementById('noiseSigma');
  const noiseValueEl = document.getElementById('noiseValue');
  const statusEl = document.getElementById('status');
  const resetBtn = document.getElementById('resetBtn');
  const runButtons = [...document.querySelectorAll('[data-runs]')];

  const runsCountEl = document.getElementById('runsCount');
  const latestSlopeEl = document.getElementById('latestSlope');
  const meanSlopeEl = document.getElementById('meanSlope');
  const sdSlopeEl = document.getElementById('sdSlope');

  const scatterCanvas = document.getElementById('scatterCanvas');
  const histCanvas = document.getElementById('histCanvas');
  const sctx = scatterCanvas.getContext('2d');
  const hctx = histCanvas.getContext('2d');

  let slopes = [];
  let intercepts = [];
  let latestData = [];
  let latestFit = null;
  let running = false;

  function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function makeExperiment(n, sigma) {
    const data = [];
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 2.5 : X_MIN + (X_MAX - X_MIN) * i / (n - 1);
      const y = TRUE_B0 + TRUE_B1 * x + sigma * gaussianRandom();
      data.push({ x, y });
    }
    return data;
  }

  function fitLine(data) {
    const n = data.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of data) {
      sx += p.x;
      sy += p.y;
      sxx += p.x * p.x;
      sxy += p.x * p.y;
    }
    const denom = n * sxx - sx * sx;
    const b1 = (n * sxy - sx * sy) / denom;
    const b0 = (sy - b1 * sx) / n;
    return { b0, b1 };
  }

  function mean(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;
  }

  function sampleSD(arr) {
    if (arr.length < 2) return NaN;
    const m = mean(arr);
    const ss = arr.reduce((a, v) => a + (v - m) ** 2, 0);
    return Math.sqrt(ss / (arr.length - 1));
  }

  function fmt(v, digits = 3) {
    return Number.isFinite(v) ? v.toFixed(digits) : '—';
  }

  function updateSummary() {
    runsCountEl.textContent = slopes.length.toLocaleString();
    latestSlopeEl.textContent = latestFit ? fmt(latestFit.b1) : '—';
    meanSlopeEl.textContent = fmt(mean(slopes));
    sdSlopeEl.textContent = fmt(sampleSD(slopes));
  }

  function clearCanvas(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawAxes(ctx, w, h, margins, xLabel, yLabel) {
    const { l, r, t, b } = margins;
    ctx.strokeStyle = '#9aa1aa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l, t);
    ctx.lineTo(l, h - b);
    ctx.lineTo(w - r, h - b);
    ctx.stroke();
    ctx.fillStyle = '#4b525b';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, (l + w - r) / 2, h - 12);
    ctx.save();
    ctx.translate(16, (t + h - b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  function drawScatter() {
    const w = scatterCanvas.width, h = scatterCanvas.height;
    clearCanvas(sctx, scatterCanvas);
    const m = { l: 58, r: 24, t: 18, b: 52 };
    drawAxes(sctx, w, h, m, 'Known input, x', 'Sensor output, y');

    const sigma = Number(noiseEl.value);
    const yMin = TRUE_B0 - 4 * sigma - 1;
    const yMax = TRUE_B0 + TRUE_B1 * X_MAX + 4 * sigma + 1;
    const sx = x => m.l + (x - X_MIN) / (X_MAX - X_MIN) * (w - m.l - m.r);
    const sy = y => h - m.b - (y - yMin) / (yMax - yMin) * (h - m.t - m.b);

    sctx.strokeStyle = '#e4e7eb';
    sctx.fillStyle = '#5e6570';
    sctx.font = '12px Arial';
    for (let i = 0; i <= 5; i++) {
      const x = X_MIN + i;
      const px = sx(x);
      sctx.beginPath(); sctx.moveTo(px, m.t); sctx.lineTo(px, h - m.b); sctx.stroke();
      sctx.textAlign = 'center'; sctx.fillText(x.toFixed(0), px, h - m.b + 20);
    }
    for (let i = 0; i <= 4; i++) {
      const y = yMin + (yMax - yMin) * i / 4;
      const py = sy(y);
      sctx.beginPath(); sctx.moveTo(m.l, py); sctx.lineTo(w - m.r, py); sctx.stroke();
      sctx.textAlign = 'right'; sctx.fillText(y.toFixed(1), m.l - 8, py + 4);
    }

    function line(b0, b1, color, width) {
      sctx.strokeStyle = color; sctx.lineWidth = width;
      sctx.beginPath();
      sctx.moveTo(sx(X_MIN), sy(b0 + b1 * X_MIN));
      sctx.lineTo(sx(X_MAX), sy(b0 + b1 * X_MAX));
      sctx.stroke();
    }
    line(TRUE_B0, TRUE_B1, '#2e6f95', 3);
    if (latestFit) line(latestFit.b0, latestFit.b1, '#a24b2a', 3);

    sctx.fillStyle = '#333333';
    for (const p of latestData) {
      sctx.beginPath();
      sctx.arc(sx(p.x), sy(p.y), 4.2, 0, 2 * Math.PI);
      sctx.fill();
    }

    if (!latestData.length) {
      sctx.fillStyle = '#6a717b';
      sctx.font = '17px Arial';
      sctx.textAlign = 'center';
      sctx.fillText('Run an experiment to generate measured data.', w / 2, h / 2);
    }
  }

  function drawHistogram() {
    const w = histCanvas.width, h = histCanvas.height;
    clearCanvas(hctx, histCanvas);
    const m = { l: 58, r: 24, t: 18, b: 52 };
    drawAxes(hctx, w, h, m, 'Estimated slope, b̂₁', 'Count');

    if (!slopes.length) {
      hctx.fillStyle = '#6a717b';
      hctx.font = '17px Arial';
      hctx.textAlign = 'center';
      hctx.fillText('Repeated experiments will build a distribution here.', w / 2, h / 2);
      return;
    }

    const bins = Math.min(40, Math.max(10, Math.round(Math.sqrt(slopes.length))));
    const mu = mean(slopes);
    const sd = sampleSD(slopes);
    let min = Math.min(...slopes), max = Math.max(...slopes);
    if (Number.isFinite(sd) && sd > 0) {
      min = Math.min(min, TRUE_B1 - 4 * sd);
      max = Math.max(max, TRUE_B1 + 4 * sd);
    }
    if (max === min) { min -= 0.5; max += 0.5; }

    const counts = new Array(bins).fill(0);
    for (const v of slopes) {
      let idx = Math.floor((v - min) / (max - min) * bins);
      if (idx < 0) idx = 0;
      if (idx >= bins) idx = bins - 1;
      counts[idx]++;
    }
    const maxCount = Math.max(...counts, 1);
    const plotW = w - m.l - m.r;
    const plotH = h - m.t - m.b;
    const barW = plotW / bins;

    hctx.fillStyle = '#8b76a8';
    counts.forEach((c, i) => {
      const bh = c / maxCount * plotH;
      hctx.fillRect(m.l + i * barW + 1, h - m.b - bh, Math.max(1, barW - 2), bh);
    });

    const sx = x => m.l + (x - min) / (max - min) * plotW;
    hctx.strokeStyle = '#2e6f95'; hctx.lineWidth = 3;
    hctx.beginPath(); hctx.moveTo(sx(TRUE_B1), m.t); hctx.lineTo(sx(TRUE_B1), h - m.b); hctx.stroke();

    hctx.fillStyle = '#5e6570';
    hctx.font = '12px Arial';
    hctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const v = min + (max - min) * i / 4;
      hctx.fillText(v.toFixed(2), sx(v), h - m.b + 20);
    }
    hctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const c = maxCount * i / 4;
      const py = h - m.b - c / maxCount * plotH;
      hctx.fillText(Math.round(c).toString(), m.l - 8, py + 4);
    }

    hctx.fillStyle = '#2e6f95';
    hctx.textAlign = 'left';
    hctx.fillText('true b₁ = 3', Math.min(w - 100, sx(TRUE_B1) + 7), m.t + 14);
    if (slopes.length > 1) {
      hctx.fillStyle = '#4b525b';
      hctx.fillText(`mean = ${mu.toFixed(3)}, SD = ${sd.toFixed(3)}`, m.l + 8, m.t + 32);
    }
  }

  function render() {
    updateSummary();
    drawScatter();
    drawHistogram();
  }

  function simulateOne() {
    const n = Number(sampleSizeEl.value);
    const sigma = Number(noiseEl.value);
    latestData = makeExperiment(n, sigma);
    latestFit = fitLine(latestData);
    slopes.push(latestFit.b1);
    intercepts.push(latestFit.b0);
  }

  async function runMany(total) {
    if (running) return;
    running = true;
    runButtons.forEach(b => b.disabled = true);
    resetBtn.disabled = true;
    sampleSizeEl.disabled = true;
    noiseEl.disabled = true;
    const chunk = total >= 10000 ? 500 : total >= 1000 ? 200 : 50;
    let done = 0;
    statusEl.textContent = `Running ${total.toLocaleString()} repeated experiments…`;

    while (done < total) {
      const nThis = Math.min(chunk, total - done);
      for (let i = 0; i < nThis; i++) simulateOne();
      done += nThis;
      if (total >= 1000) {
        statusEl.textContent = `Running… ${done.toLocaleString()} / ${total.toLocaleString()}`;
        updateSummary();
        drawHistogram();
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }

    render();
    statusEl.textContent = `Completed ${total.toLocaleString()} new experiment${total === 1 ? '' : 's'}. Try changing n and compare the width of the slope distribution.`;
    runButtons.forEach(b => b.disabled = false);
    resetBtn.disabled = false;
    sampleSizeEl.disabled = false;
    noiseEl.disabled = false;
    running = false;
  }

  function reset() {
    slopes = [];
    intercepts = [];
    latestData = [];
    latestFit = null;
    statusEl.textContent = 'Reset complete. The true model is y = 2 + 3x + ε.';
    render();
  }

  runButtons.forEach(btn => {
    btn.addEventListener('click', () => runMany(Number(btn.dataset.runs)));
  });
  resetBtn.addEventListener('click', reset);
  noiseEl.addEventListener('input', () => {
    noiseValueEl.textContent = Number(noiseEl.value).toFixed(1);
    drawScatter();
  });

  const gridEl = document.getElementById('gridPerDim');
  const dimEl = document.getElementById('dimension');
  const mcEl = document.getElementById('mcSamples');
  const gridValueEl = document.getElementById('gridValue');
  const dimValueEl = document.getElementById('dimValue');
  const gridCombosEl = document.getElementById('gridCombos');
  const equivEl = document.getElementById('equivPerDim');
  const dimTakeawayEl = document.getElementById('dimensionTakeaway');

  function compactNumber(v) {
    if (v < 1e6) return Math.round(v).toLocaleString();
    const exp = Math.floor(Math.log10(v));
    const mant = v / 10 ** exp;
    return `${mant.toFixed(2)} × 10^${exp}`;
  }

  function updateDimensionInsight() {
    const g = Number(gridEl.value);
    const d = Number(dimEl.value);
    const N = Number(mcEl.value);
    const combos = g ** d;
    const equiv = N ** (1 / d);
    gridValueEl.textContent = g.toString();
    dimValueEl.textContent = d.toString();
    gridCombosEl.textContent = compactNumber(combos);
    equivEl.textContent = equiv.toFixed(equiv >= 100 ? 0 : equiv >= 10 ? 1 : 2);
    dimTakeawayEl.textContent = `${N.toLocaleString()} Monte Carlo samples in ${d} dimension${d === 1 ? '' : 's'} correspond to about ${equiv.toFixed(equiv >= 100 ? 0 : equiv >= 10 ? 1 : 2)} samples per dimension.`;
  }

  [gridEl, dimEl, mcEl].forEach(el => el.addEventListener('input', updateDimensionInsight));

  noiseValueEl.textContent = Number(noiseEl.value).toFixed(1);
  updateDimensionInsight();
  render();
})();
