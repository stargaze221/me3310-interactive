(() => {
  'use strict';

  const B0 = 2;
  const X = [0, 0.7142857, 1.4285714, 2.1428571, 2.8571429, 3.5714286, 4.2857143, 5];
  const ERR = [0.35, -0.55, 0.70, -0.25, 0.20, -0.60, 0.45, -0.10];
  const Y = X.map((x, i) => B0 + 3 * x + ERR[i]);
  const SLOPE_MIN = 2.2;
  const SLOPE_MAX = 3.8;

  const slopeSlider = document.getElementById('slopeSlider');
  const sigmaSlider = document.getElementById('sigmaSlider');
  const slopeValue = document.getElementById('slopeValue');
  const sigmaValue = document.getElementById('sigmaValue');
  const bestBtn = document.getElementById('bestBtn');
  const resetBtn = document.getElementById('resetBtn');

  const metricSlope = document.getElementById('metricSlope');
  const metricSSE = document.getElementById('metricSSE');
  const metricLike = document.getElementById('metricLike');
  const metricBest = document.getElementById('metricBest');

  const dataCanvas = document.getElementById('dataCanvas');
  const likeCanvas = document.getElementById('likeCanvas');
  const sseCanvas = document.getElementById('sseCanvas');
  const residCanvas = document.getElementById('residCanvas');
  const dctx = dataCanvas.getContext('2d');
  const lctx = likeCanvas.getContext('2d');
  const sctx = sseCanvas.getContext('2d');
  const rctx = residCanvas.getContext('2d');

  function bestSlope() {
    let num = 0, den = 0;
    for (let i = 0; i < X.length; i++) {
      num += X[i] * (Y[i] - B0);
      den += X[i] * X[i];
    }
    return num / den;
  }

  const BEST = bestSlope();

  function residuals(b1) {
    return X.map((x, i) => Y[i] - (B0 + b1 * x));
  }

  function sse(b1) {
    return residuals(b1).reduce((sum, r) => sum + r * r, 0);
  }

  const SSE_MIN = sse(BEST);

  function relativeLikelihood(b1, sigma) {
    const delta = sse(b1) - SSE_MIN;
    return Math.exp(-delta / (2 * sigma * sigma));
  }

  function clear(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function axes(ctx, canvas, m, xLabel, yLabel) {
    const w = canvas.width, h = canvas.height;
    ctx.strokeStyle = '#9aa1aa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.l, m.t);
    ctx.lineTo(m.l, h - m.b);
    ctx.lineTo(w - m.r, h - m.b);
    ctx.stroke();
    ctx.fillStyle = '#4b525b';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, (m.l + w - m.r) / 2, h - 12);
    ctx.save();
    ctx.translate(16, (m.t + h - m.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  function drawData(b1) {
    clear(dctx, dataCanvas);
    const w = dataCanvas.width, h = dataCanvas.height;
    const m = { l: 58, r: 24, t: 18, b: 52 };
    axes(dctx, dataCanvas, m, 'Known input, x', 'Observed output, y');
    const xMin = 0, xMax = 5;
    const yMin = 1.2, yMax = 18.2;
    const sx = x => m.l + (x - xMin) / (xMax - xMin) * (w - m.l - m.r);
    const sy = y => h - m.b - (y - yMin) / (yMax - yMin) * (h - m.t - m.b);

    dctx.strokeStyle = '#e4e7eb';
    dctx.fillStyle = '#5e6570';
    dctx.font = '12px Arial';
    for (let i = 0; i <= 5; i++) {
      const px = sx(i);
      dctx.beginPath(); dctx.moveTo(px, m.t); dctx.lineTo(px, h - m.b); dctx.stroke();
      dctx.textAlign = 'center'; dctx.fillText(i.toString(), px, h - m.b + 20);
    }
    for (let i = 0; i <= 4; i++) {
      const y = yMin + (yMax - yMin) * i / 4;
      const py = sy(y);
      dctx.beginPath(); dctx.moveTo(m.l, py); dctx.lineTo(w - m.r, py); dctx.stroke();
      dctx.textAlign = 'right'; dctx.fillText(y.toFixed(1), m.l - 8, py + 4);
    }

    // Residual segments for candidate line.
    dctx.strokeStyle = '#9aa1aa';
    dctx.lineWidth = 1.5;
    for (let i = 0; i < X.length; i++) {
      const yhat = B0 + b1 * X[i];
      dctx.beginPath();
      dctx.moveTo(sx(X[i]), sy(Y[i]));
      dctx.lineTo(sx(X[i]), sy(yhat));
      dctx.stroke();
    }

    function drawLine(slope, color, width) {
      dctx.strokeStyle = color;
      dctx.lineWidth = width;
      dctx.beginPath();
      dctx.moveTo(sx(xMin), sy(B0 + slope * xMin));
      dctx.lineTo(sx(xMax), sy(B0 + slope * xMax));
      dctx.stroke();
    }

    drawLine(BEST, '#2e6f95', 3);
    drawLine(b1, '#a24b2a', 3);

    dctx.fillStyle = '#333333';
    for (let i = 0; i < X.length; i++) {
      dctx.beginPath();
      dctx.arc(sx(X[i]), sy(Y[i]), 4.5, 0, Math.PI * 2);
      dctx.fill();
    }
  }

  function drawLikelihood(b1, sigma) {
    clear(lctx, likeCanvas);
    const w = likeCanvas.width, h = likeCanvas.height;
    const m = { l: 58, r: 24, t: 18, b: 52 };
    axes(lctx, likeCanvas, m, 'Candidate slope, b₁', 'Relative likelihood');
    const sx = x => m.l + (x - SLOPE_MIN) / (SLOPE_MAX - SLOPE_MIN) * (w - m.l - m.r);
    const sy = y => h - m.b - y * (h - m.t - m.b);

    lctx.strokeStyle = '#e4e7eb';
    lctx.fillStyle = '#5e6570';
    lctx.font = '12px Arial';
    for (let i = 0; i <= 4; i++) {
      const x = SLOPE_MIN + (SLOPE_MAX - SLOPE_MIN) * i / 4;
      lctx.beginPath(); lctx.moveTo(sx(x), m.t); lctx.lineTo(sx(x), h - m.b); lctx.stroke();
      lctx.textAlign = 'center'; lctx.fillText(x.toFixed(2), sx(x), h - m.b + 20);
      const y = i / 4;
      lctx.beginPath(); lctx.moveTo(m.l, sy(y)); lctx.lineTo(w - m.r, sy(y)); lctx.stroke();
      lctx.textAlign = 'right'; lctx.fillText(y.toFixed(2), m.l - 8, sy(y) + 4);
    }

    lctx.strokeStyle = '#4f2683';
    lctx.lineWidth = 3;
    lctx.beginPath();
    const steps = 240;
    for (let i = 0; i <= steps; i++) {
      const x = SLOPE_MIN + (SLOPE_MAX - SLOPE_MIN) * i / steps;
      const y = relativeLikelihood(x, sigma);
      if (i === 0) lctx.moveTo(sx(x), sy(y)); else lctx.lineTo(sx(x), sy(y));
    }
    lctx.stroke();

    lctx.strokeStyle = '#2e6f95';
    lctx.lineWidth = 2;
    lctx.beginPath(); lctx.moveTo(sx(BEST), m.t); lctx.lineTo(sx(BEST), h - m.b); lctx.stroke();

    const current = relativeLikelihood(b1, sigma);
    lctx.fillStyle = '#a24b2a';
    lctx.beginPath(); lctx.arc(sx(b1), sy(current), 6, 0, Math.PI * 2); lctx.fill();

    lctx.fillStyle = '#2e6f95';
    lctx.textAlign = 'left';
    lctx.fillText(`maximum near b₁ = ${BEST.toFixed(3)}`, Math.min(w - 180, sx(BEST) + 7), m.t + 15);
  }

  function drawSSE(b1) {
    clear(sctx, sseCanvas);
    const w = sseCanvas.width, h = sseCanvas.height;
    const m = { l: 58, r: 24, t: 18, b: 52 };
    axes(sctx, sseCanvas, m, 'Candidate slope, b₁', 'SSE');
    const sx = x => m.l + (x - SLOPE_MIN) / (SLOPE_MAX - SLOPE_MIN) * (w - m.l - m.r);
    let maxSSE = 0;
    for (let i = 0; i <= 200; i++) {
      const x = SLOPE_MIN + (SLOPE_MAX - SLOPE_MIN) * i / 200;
      maxSSE = Math.max(maxSSE, sse(x));
    }
    maxSSE *= 1.05;
    const sy = y => h - m.b - y / maxSSE * (h - m.t - m.b);

    sctx.strokeStyle = '#e4e7eb';
    sctx.fillStyle = '#5e6570';
    sctx.font = '12px Arial';
    for (let i = 0; i <= 4; i++) {
      const x = SLOPE_MIN + (SLOPE_MAX - SLOPE_MIN) * i / 4;
      sctx.beginPath(); sctx.moveTo(sx(x), m.t); sctx.lineTo(sx(x), h - m.b); sctx.stroke();
      sctx.textAlign = 'center'; sctx.fillText(x.toFixed(2), sx(x), h - m.b + 20);
      const y = maxSSE * i / 4;
      sctx.beginPath(); sctx.moveTo(m.l, sy(y)); sctx.lineTo(w - m.r, sy(y)); sctx.stroke();
      sctx.textAlign = 'right'; sctx.fillText(y.toFixed(1), m.l - 8, sy(y) + 4);
    }

    sctx.strokeStyle = '#4f2683';
    sctx.lineWidth = 3;
    sctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const x = SLOPE_MIN + (SLOPE_MAX - SLOPE_MIN) * i / 240;
      const y = sse(x);
      if (i === 0) sctx.moveTo(sx(x), sy(y)); else sctx.lineTo(sx(x), sy(y));
    }
    sctx.stroke();

    sctx.strokeStyle = '#2e6f95';
    sctx.lineWidth = 2;
    sctx.beginPath(); sctx.moveTo(sx(BEST), m.t); sctx.lineTo(sx(BEST), h - m.b); sctx.stroke();

    sctx.fillStyle = '#a24b2a';
    sctx.beginPath(); sctx.arc(sx(b1), sy(sse(b1)), 6, 0, Math.PI * 2); sctx.fill();
  }

  function drawResiduals(b1) {
    clear(rctx, residCanvas);
    const w = residCanvas.width, h = residCanvas.height;
    const m = { l: 58, r: 24, t: 18, b: 52 };
    axes(rctx, residCanvas, m, 'Known input, x', 'Residual, eᵢ');
    const rs = residuals(b1);
    const maxAbs = Math.max(1.0, ...rs.map(v => Math.abs(v))) * 1.2;
    const sx = x => m.l + x / 5 * (w - m.l - m.r);
    const sy = y => h - m.b - (y + maxAbs) / (2 * maxAbs) * (h - m.t - m.b);

    rctx.strokeStyle = '#d2d6dc';
    rctx.lineWidth = 1;
    rctx.beginPath(); rctx.moveTo(m.l, sy(0)); rctx.lineTo(w - m.r, sy(0)); rctx.stroke();

    rctx.fillStyle = '#5e6570';
    rctx.font = '12px Arial';
    for (let i = 0; i <= 5; i++) {
      rctx.textAlign = 'center'; rctx.fillText(i.toString(), sx(i), h - m.b + 20);
    }
    for (let i = -2; i <= 2; i++) {
      const y = maxAbs * i / 2;
      rctx.textAlign = 'right'; rctx.fillText(y.toFixed(1), m.l - 8, sy(y) + 4);
    }

    rctx.strokeStyle = '#7d8793';
    rctx.fillStyle = '#a24b2a';
    for (let i = 0; i < X.length; i++) {
      rctx.beginPath(); rctx.moveTo(sx(X[i]), sy(0)); rctx.lineTo(sx(X[i]), sy(rs[i])); rctx.stroke();
      rctx.beginPath(); rctx.arc(sx(X[i]), sy(rs[i]), 5, 0, Math.PI * 2); rctx.fill();
    }
  }

  function render() {
    const b1 = Number(slopeSlider.value);
    const sigma = Number(sigmaSlider.value);
    const currentSSE = sse(b1);
    const currentLike = relativeLikelihood(b1, sigma);

    slopeValue.textContent = b1.toFixed(2);
    sigmaValue.textContent = sigma.toFixed(2);
    metricSlope.textContent = b1.toFixed(2);
    metricSSE.textContent = currentSSE.toFixed(3);
    metricLike.textContent = currentLike.toFixed(3);
    metricBest.textContent = BEST.toFixed(3);

    drawData(b1);
    drawLikelihood(b1, sigma);
    drawSSE(b1);
    drawResiduals(b1);
  }

  slopeSlider.addEventListener('input', render);
  sigmaSlider.addEventListener('input', render);
  bestBtn.addEventListener('click', () => {
    slopeSlider.value = BEST.toFixed(2);
    render();
  });
  resetBtn.addEventListener('click', () => {
    slopeSlider.value = '2.70';
    sigmaSlider.value = '0.70';
    render();
  });

  render();
})();
