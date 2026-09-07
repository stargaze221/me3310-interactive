(() => {
  'use strict';

  const TRUE_B0 = 2;
  const TRUE_B1 = 3;
  const X_MIN = 0;
  const X_MAX = 5;
  const T_CRIT_95 = { 3: 3.182446, 8: 2.306004, 18: 2.100922, 48: 2.010635, 98: 1.984467 };

  const sampleSizeEl = document.getElementById('sampleSize');
  const noiseEl = document.getElementById('noiseSigma');
  const noiseValueEl = document.getElementById('noiseValue');
  const intervalModeEl = document.getElementById('intervalMode');
  const statusEl = document.getElementById('status');
  const resetBtn = document.getElementById('resetBtn');
  const runButtons = [...document.querySelectorAll('[data-runs]')];

  const runsCountEl = document.getElementById('runsCount');
  const latestSlopeEl = document.getElementById('latestSlope');
  const latestSlopeCIEl = document.getElementById('latestSlopeCI');
  const meanSlopeEl = document.getElementById('meanSlope');
  const sdSlopeEl = document.getElementById('sdSlope');
  const coverageRateEl = document.getElementById('coverageRate');
  const residualMeanEl = document.getElementById('residualMean');
  const residualSDEl = document.getElementById('residualSD');

  const scatterCanvas = document.getElementById('scatterCanvas');
  const residualCanvas = document.getElementById('residualCanvas');
  const histCanvas = document.getElementById('histCanvas');
  const coverageCanvas = document.getElementById('coverageCanvas');
  const sctx = scatterCanvas.getContext('2d');
  const rctx = residualCanvas.getContext('2d');
  const hctx = histCanvas.getContext('2d');
  const cctx = coverageCanvas.getContext('2d');

  let slopes = [];
  let intervals = [];
  let latestData = [];
  let latestFit = null;
  let coverageHits = 0;
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
      const x = X_MIN + (X_MAX - X_MIN) * i / (n - 1);
      const y = TRUE_B0 + TRUE_B1 * x + sigma * gaussianRandom();
      data.push({ x, y });
    }
    return data;
  }

  function tCritical95(df) {
    return T_CRIT_95[df] || 1.96;
  }

  function fitLine(data) {
    const n = data.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of data) {
      sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y;
    }
    const xbar = sx / n;
    const ybar = sy / n;
    const Sxx = sxx - n * xbar * xbar;
    const Sxy = sxy - n * xbar * ybar;
    const b1 = Sxy / Sxx;
    const b0 = ybar - b1 * xbar;
    const residuals = data.map(p => ({ x: p.x, e: p.y - (b0 + b1 * p.x) }));
    const SSE = residuals.reduce((sum, p) => sum + p.e * p.e, 0);
    const df = n - 2;
    const s = Math.sqrt(SSE / df);
    const seSlope = s / Math.sqrt(Sxx);
    const t = tCritical95(df);
    const ciLo = b1 - t * seSlope;
    const ciHi = b1 + t * seSlope;
    return { n, b0, b1, xbar, Sxx, SSE, df, s, seSlope, t, ciLo, ciHi, residuals };
  }

  function mean(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;
  }

  function sampleSD(arr) {
    if (arr.length < 2) return NaN;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1));
  }

  function fmt(v, digits = 3) {
    return Number.isFinite(v) ? v.toFixed(digits) : '—';
  }

  function reset(message = 'Reset complete. The true model is y = 2 + 3x + ε.') {
    slopes = [];
    intervals = [];
    latestData = [];
    latestFit = null;
    coverageHits = 0;
    statusEl.textContent = message;
    render();
  }

  function resetForDesignChange() {
    reset(`Experimental design changed: n = ${sampleSizeEl.value}, σ = ${Number(noiseEl.value).toFixed(1)}. Monte Carlo history was cleared.`);
  }

  function updateSummary() {
    runsCountEl.textContent = slopes.length.toLocaleString();
    latestSlopeEl.textContent = latestFit ? fmt(latestFit.b1) : '—';
    latestSlopeCIEl.textContent = latestFit ? `[${fmt(latestFit.ciLo, 2)}, ${fmt(latestFit.ciHi, 2)}]` : '—';
    meanSlopeEl.textContent = fmt(mean(slopes));
    sdSlopeEl.textContent = fmt(sampleSD(slopes));
    coverageRateEl.textContent = slopes.length ? `${(100 * coverageHits / slopes.length).toFixed(1)}%` : '—';
    residualMeanEl.textContent = latestFit ? fmt(mean(latestFit.residuals.map(p => p.e)), 4) : '—';
    residualSDEl.textContent = latestFit ? fmt(latestFit.s) : '—';
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
    ctx.moveTo(l, t); ctx.lineTo(l, h - b); ctx.lineTo(w - r, h - b); ctx.stroke();
    ctx.fillStyle = '#4b525b';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, (l + w - r) / 2, h - 12);
    ctx.save(); ctx.translate(16, (t + h - b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();
  }

  function drawBand(ctx, fit, sx, sy, type, fillStyle) {
    if (!fit) return;
    const ptsUpper = [], ptsLower = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const x = X_MIN + (X_MAX - X_MIN) * i / steps;
      const base = 1 / fit.n + ((x - fit.xbar) ** 2) / fit.Sxx;
      const se = fit.s * Math.sqrt(type === 'prediction' ? 1 + base : base);
      const yhat = fit.b0 + fit.b1 * x;
      const delta = fit.t * se;
      ptsUpper.push([sx(x), sy(yhat + delta)]);
      ptsLower.push([sx(x), sy(yhat - delta)]);
    }
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(ptsUpper[0][0], ptsUpper[0][1]);
    ptsUpper.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    ptsLower.reverse().forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fill();
  }

  function drawScatter() {
    const w = scatterCanvas.width, h = scatterCanvas.height;
    clearCanvas(sctx, scatterCanvas);
    const m = { l: 58, r: 24, t: 18, b: 52 };
    drawAxes(sctx, w, h, m, 'Known input, x', 'Sensor output, y');

    const sigma = Number(noiseEl.value);
    const yMin = TRUE_B0 - 5 * sigma - 1;
    const yMax = TRUE_B0 + TRUE_B1 * X_MAX + 5 * sigma + 1;
    const sx = x => m.l + (x - X_MIN) / (X_MAX - X_MIN) * (w - m.l - m.r);
    const sy = y => h - m.b - (y - yMin) / (yMax - yMin) * (h - m.t - m.b);

    sctx.strokeStyle = '#e4e7eb'; sctx.fillStyle = '#5e6570'; sctx.font = '12px Arial';
    for (let i = 0; i <= 5; i++) {
      const x = X_MIN + i, px = sx(x);
      sctx.beginPath(); sctx.moveTo(px, m.t); sctx.lineTo(px, h - m.b); sctx.stroke();
      sctx.textAlign = 'center'; sctx.fillText(x.toFixed(0), px, h - m.b + 20);
    }
    for (let i = 0; i <= 4; i++) {
      const y = yMin + (yMax - yMin) * i / 4, py = sy(y);
      sctx.beginPath(); sctx.moveTo(m.l, py); sctx.lineTo(w - m.r, py); sctx.stroke();
      sctx.textAlign = 'right'; sctx.fillText(y.toFixed(1), m.l - 8, py + 4);
    }

    if (latestFit) {
      const mode = intervalModeEl.value;
      if (mode === 'prediction' || mode === 'both') drawBand(sctx, latestFit, sx, sy, 'prediction', 'rgba(46,111,149,0.14)');
      if (mode === 'confidence' || mode === 'both') drawBand(sctx, latestFit, sx, sy, 'confidence', 'rgba(79,38,131,0.22)');
    }

    function line(b0, b1, color, width) {
      sctx.strokeStyle = color; sctx.lineWidth = width;
      sctx.beginPath(); sctx.moveTo(sx(X_MIN), sy(b0 + b1 * X_MIN)); sctx.lineTo(sx(X_MAX), sy(b0 + b1 * X_MAX)); sctx.stroke();
    }
    line(TRUE_B0, TRUE_B1, '#2e6f95', 3);
    if (latestFit) line(latestFit.b0, latestFit.b1, '#a24b2a', 3);

    sctx.fillStyle = '#333333';
    for (const p of latestData) {
      sctx.beginPath(); sctx.arc(sx(p.x), sy(p.y), 4.2, 0, 2 * Math.PI); sctx.fill();
    }

    if (!latestData.length) {
      sctx.fillStyle = '#6a717b'; sctx.font = '17px Arial'; sctx.textAlign = 'center';
      sctx.fillText('Run an experiment to generate measured data.', w / 2, h / 2);
    }
  }

  function drawResiduals() {
    const w = residualCanvas.width, h = residualCanvas.height;
    clearCanvas(rctx, residualCanvas);
    const m = { l: 58, r: 24, t: 18, b: 52 };
    drawAxes(rctx, w, h, m, 'Known input, x', 'Residual, e');
    if (!latestFit) {
      rctx.fillStyle = '#6a717b'; rctx.font = '17px Arial'; rctx.textAlign = 'center';
      rctx.fillText('Run an experiment to inspect residuals.', w / 2, h / 2);
      return;
    }
    const residuals = latestFit.residuals;
    const maxAbs = Math.max(1, ...residuals.map(p => Math.abs(p.e))) * 1.25;
    const sx = x => m.l + (x - X_MIN) / (X_MAX - X_MIN) * (w - m.l - m.r);
    const sy = e => h - m.b - (e + maxAbs) / (2 * maxAbs) * (h - m.t - m.b);

    rctx.strokeStyle = '#e4e7eb'; rctx.fillStyle = '#5e6570'; rctx.font = '12px Arial';
    for (let i = 0; i <= 5; i++) {
      const x = X_MIN + i, px = sx(x);
      rctx.beginPath(); rctx.moveTo(px, m.t); rctx.lineTo(px, h - m.b); rctx.stroke();
      rctx.textAlign = 'center'; rctx.fillText(x.toFixed(0), px, h - m.b + 20);
    }
    [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs].forEach(e => {
      const py = sy(e);
      rctx.beginPath(); rctx.moveTo(m.l, py); rctx.lineTo(w - m.r, py); rctx.stroke();
      rctx.textAlign = 'right'; rctx.fillText(e.toFixed(2), m.l - 8, py + 4);
    });
    rctx.strokeStyle = '#4f2683'; rctx.lineWidth = 2;
    rctx.beginPath(); rctx.moveTo(m.l, sy(0)); rctx.lineTo(w - m.r, sy(0)); rctx.stroke();
    rctx.fillStyle = '#333333';
    residuals.forEach(p => { rctx.beginPath(); rctx.arc(sx(p.x), sy(p.e), 4.4, 0, 2 * Math.PI); rctx.fill(); });
  }

  function drawHistogram() {
    const w = histCanvas.width, h = histCanvas.height;
    clearCanvas(hctx, histCanvas);
    const m = { l: 58, r: 24, t: 18, b: 52 };
    drawAxes(hctx, w, h, m, 'Estimated slope, b̂₁', 'Count');
    if (!slopes.length) {
      hctx.fillStyle = '#6a717b'; hctx.font = '17px Arial'; hctx.textAlign = 'center';
      hctx.fillText('Repeated experiments will build a distribution here.', w / 2, h / 2); return;
    }
    const bins = Math.min(40, Math.max(10, Math.round(Math.sqrt(slopes.length))));
    const mu = mean(slopes), sd = sampleSD(slopes);
    let min = Math.min(...slopes), max = Math.max(...slopes);
    if (Number.isFinite(sd) && sd > 0) { min = Math.min(min, TRUE_B1 - 4 * sd); max = Math.max(max, TRUE_B1 + 4 * sd); }
    if (max === min) { min -= 0.5; max += 0.5; }
    const counts = new Array(bins).fill(0);
    slopes.forEach(v => {
      let idx = Math.floor((v - min) / (max - min) * bins);
      idx = Math.max(0, Math.min(bins - 1, idx)); counts[idx]++;
    });
    const maxCount = Math.max(...counts, 1), plotW = w - m.l - m.r, plotH = h - m.t - m.b, barW = plotW / bins;
    hctx.fillStyle = '#8b76a8';
    counts.forEach((c, i) => { const bh = c / maxCount * plotH; hctx.fillRect(m.l + i * barW + 1, h - m.b - bh, Math.max(1, barW - 2), bh); });
    const sx = x => m.l + (x - min) / (max - min) * plotW;
    hctx.strokeStyle = '#2e6f95'; hctx.lineWidth = 3; hctx.beginPath(); hctx.moveTo(sx(TRUE_B1), m.t); hctx.lineTo(sx(TRUE_B1), h - m.b); hctx.stroke();
    hctx.fillStyle = '#5e6570'; hctx.font = '12px Arial'; hctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) { const v = min + (max - min) * i / 4; hctx.fillText(v.toFixed(2), sx(v), h - m.b + 20); }
    hctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) { const c = maxCount * i / 4, py = h - m.b - c / maxCount * plotH; hctx.fillText(Math.round(c).toString(), m.l - 8, py + 4); }
    hctx.fillStyle = '#2e6f95'; hctx.textAlign = 'left'; hctx.fillText('true b₁ = 3', Math.min(w - 100, sx(TRUE_B1) + 7), m.t + 14);
    if (slopes.length > 1) { hctx.fillStyle = '#4b525b'; hctx.fillText(`mean = ${mu.toFixed(3)}, SD = ${sd.toFixed(3)}`, m.l + 8, m.t + 32); }
  }

  function drawCoverage() {
    const w = coverageCanvas.width, h = coverageCanvas.height;
    clearCanvas(cctx, coverageCanvas);
    const m = { l: 70, r: 30, t: 22, b: 48 };
    drawAxes(cctx, w, h, m, 'Slope parameter', 'Recent experiment');
    if (!intervals.length) {
      cctx.fillStyle = '#6a717b'; cctx.font = '17px Arial'; cctx.textAlign = 'center';
      cctx.fillText('Repeated experiments will add confidence intervals here.', w / 2, h / 2); return;
    }
    const recent = intervals.slice(-30);
    let min = Math.min(TRUE_B1, ...recent.map(v => v.lo)), max = Math.max(TRUE_B1, ...recent.map(v => v.hi));
    const pad = Math.max(0.2, (max - min) * 0.1); min -= pad; max += pad;
    const sx = x => m.l + (x - min) / (max - min) * (w - m.l - m.r);
    const plotH = h - m.t - m.b;
    const row = plotH / recent.length;
    cctx.strokeStyle = '#2e6f95'; cctx.lineWidth = 2; cctx.beginPath(); cctx.moveTo(sx(TRUE_B1), m.t); cctx.lineTo(sx(TRUE_B1), h - m.b); cctx.stroke();
    recent.forEach((it, i) => {
      const y = m.t + row * (i + 0.5);
      cctx.strokeStyle = it.hit ? '#2e6f95' : '#a24b2a'; cctx.fillStyle = it.hit ? '#2e6f95' : '#a24b2a'; cctx.lineWidth = 2;
      cctx.beginPath(); cctx.moveTo(sx(it.lo), y); cctx.lineTo(sx(it.hi), y); cctx.stroke();
      cctx.beginPath(); cctx.arc(sx(it.b1), y, 2.8, 0, 2 * Math.PI); cctx.fill();
    });
    cctx.fillStyle = '#5e6570'; cctx.font = '12px Arial'; cctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) { const v = min + (max - min) * i / 4; cctx.fillText(v.toFixed(2), sx(v), h - m.b + 20); }
    cctx.fillStyle = '#2e6f95'; cctx.textAlign = 'left'; cctx.fillText('true b₁ = 3', Math.min(w - 95, sx(TRUE_B1) + 6), m.t + 12);
  }

  function render() {
    updateSummary(); drawScatter(); drawResiduals(); drawHistogram(); drawCoverage();
  }

  function simulateOne() {
    const n = Number(sampleSizeEl.value), sigma = Number(noiseEl.value);
    latestData = makeExperiment(n, sigma);
    latestFit = fitLine(latestData);
    const hit = latestFit.ciLo <= TRUE_B1 && TRUE_B1 <= latestFit.ciHi;
    slopes.push(latestFit.b1);
    intervals.push({ lo: latestFit.ciLo, hi: latestFit.ciHi, b1: latestFit.b1, hit });
    if (hit) coverageHits++;
  }

  async function runMany(total) {
    if (running) return;
    running = true;
    runButtons.forEach(b => b.disabled = true); resetBtn.disabled = true; sampleSizeEl.disabled = true; noiseEl.disabled = true;
    const chunk = total >= 10000 ? 500 : total >= 1000 ? 200 : 50;
    let done = 0;
    statusEl.textContent = `Running ${total.toLocaleString()} repeated experiments…`;
    while (done < total) {
      const nThis = Math.min(chunk, total - done);
      for (let i = 0; i < nThis; i++) simulateOne();
      done += nThis;
      if (total >= 1000) {
        statusEl.textContent = `Running… ${done.toLocaleString()} / ${total.toLocaleString()}`;
        updateSummary(); drawHistogram(); drawCoverage();
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }
    render();
    statusEl.textContent = `Completed ${total.toLocaleString()} new experiment${total === 1 ? '' : 's'}. Compare the slope distribution, residual evidence, and 95% CI coverage.`;
    runButtons.forEach(b => b.disabled = false); resetBtn.disabled = false; sampleSizeEl.disabled = false; noiseEl.disabled = false; running = false;
  }

  runButtons.forEach(btn => btn.addEventListener('click', () => runMany(Number(btn.dataset.runs))));
  resetBtn.addEventListener('click', () => reset());
  intervalModeEl.addEventListener('change', drawScatter);
  sampleSizeEl.addEventListener('change', resetForDesignChange);
  noiseEl.addEventListener('input', () => { noiseValueEl.textContent = Number(noiseEl.value).toFixed(1); });
  noiseEl.addEventListener('change', resetForDesignChange);

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
    return `${(v / 10 ** exp).toFixed(2)} × 10^${exp}`;
  }

  function updateDimensionInsight() {
    const g = Number(gridEl.value), d = Number(dimEl.value), N = Number(mcEl.value);
    const combos = g ** d, equiv = N ** (1 / d);
    gridValueEl.textContent = g.toString(); dimValueEl.textContent = d.toString();
    gridCombosEl.textContent = compactNumber(combos);
    equivEl.textContent = equiv.toFixed(equiv >= 100 ? 0 : equiv >= 10 ? 1 : 2);
    dimTakeawayEl.textContent = `${N.toLocaleString()} Monte Carlo samples in ${d} dimension${d === 1 ? '' : 's'} correspond to about ${equiv.toFixed(equiv >= 100 ? 0 : equiv >= 10 ? 1 : 2)} samples per dimension.`;
  }

  [gridEl, dimEl, mcEl].forEach(el => el.addEventListener('input', updateDimensionInsight));
  noiseValueEl.textContent = Number(noiseEl.value).toFixed(1);
  updateDimensionInsight(); render();
})();
