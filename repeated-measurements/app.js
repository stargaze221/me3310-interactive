(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const z95 = 1.959963984540054;

  const experiments = {
    dice: {
      mean: 3.5,
      sigma: Math.sqrt(35 / 12),
      unit: '',
      decimals: 0,
      sample: () => 1 + Math.floor(Math.random() * 6),
      note: 'Each roll remains unpredictable. For a fair die, the theoretical population mean is 3.5.',
      histCaption: 'Relative frequency of the six possible outcomes.'
    },
    mpg: {
      mean: 30,
      sigma: 2,
      unit: ' MPG',
      decimals: 2,
      sample: () => 30 + 2 * randn(),
      note: 'Hypothetical road test: the simulation uses a population mean of 30 MPG and a population SD of 2 MPG. In a real experiment, these values would not be known.',
      histCaption: 'Relative frequency of simulated road-test measurements.'
    }
  };

  let mode = 'dice';
  let data = [];
  let runningMeans = [];

  const el = id => document.getElementById(id);
  const experimentSelect = el('experiment');
  const showZ = el('show-z');

  document.querySelectorAll('[data-add]').forEach(button => {
    button.addEventListener('click', () => addMeasurements(Number(button.dataset.add)));
  });
  el('reset').addEventListener('click', reset);
  experimentSelect.addEventListener('change', () => {
    mode = experimentSelect.value;
    reset();
  });
  showZ.addEventListener('change', render);
  window.addEventListener('resize', render);

  function randn() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function addMeasurements(count) {
    const cfg = experiments[mode];
    let sum = data.reduce((a, b) => a + b, 0);
    for (let i = 0; i < count; i++) {
      const value = cfg.sample();
      data.push(value);
      sum += value;
      runningMeans.push(sum / data.length);
    }
    render();
  }

  function reset() {
    data = [];
    runningMeans = [];
    showZ.checked = false;
    render();
  }

  function stats(values) {
    const n = values.length;
    if (!n) return { n: 0, mean: NaN, sd: NaN, se: NaN };
    const mean = values.reduce((a, b) => a + b, 0) / n;
    if (n < 2) return { n, mean, sd: NaN, se: NaN };
    const ss = values.reduce((acc, x) => acc + (x - mean) ** 2, 0);
    const sd = Math.sqrt(ss / (n - 1));
    return { n, mean, sd, se: sd / Math.sqrt(n) };
  }

  function tCritical95(df) {
    const table = {
      1:12.706,2:4.303,3:3.182,4:2.776,5:2.571,6:2.447,7:2.365,8:2.306,9:2.262,10:2.228,
      11:2.201,12:2.179,13:2.160,14:2.145,15:2.131,16:2.120,17:2.110,18:2.101,19:2.093,20:2.086,
      21:2.080,22:2.074,23:2.069,24:2.064,25:2.060,26:2.056,27:2.052,28:2.048,29:2.045,30:2.042
    };
    if (df <= 30) return table[df];
    const z = z95;
    const v = df;
    const z2 = z * z;
    const z3 = z2 * z;
    const z5 = z3 * z2;
    const z7 = z5 * z2;
    return z
      + (z3 + z) / (4 * v)
      + (5 * z5 + 16 * z3 + 3 * z) / (96 * v * v)
      + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * v * v * v);
  }

  function fmt(value, decimals = 2, unit = '') {
    if (!Number.isFinite(value)) return '—';
    return `${value.toFixed(decimals)}${unit}`;
  }

  function render() {
    const cfg = experiments[mode];
    const s = stats(data);
    el('experiment-note').textContent = cfg.note;
    el('hist-caption').textContent = cfg.histCaption;

    el('stat-n').textContent = s.n.toLocaleString();
    el('stat-latest').textContent = s.n ? fmt(data[data.length - 1], cfg.decimals, cfg.unit) : '—';
    el('stat-mean').textContent = fmt(s.mean, mode === 'dice' ? 3 : 2, cfg.unit);
    el('stat-sd').textContent = fmt(s.sd, 3, cfg.unit);

    if (s.n >= 2) {
      const df = s.n - 1;
      const t = tCritical95(df);
      const half = t * s.se;
      el('stat-df').textContent = df.toLocaleString();
      el('stat-se').textContent = fmt(s.se, 3, cfg.unit);
      el('stat-tci').textContent = `${fmt(s.mean - half, mode === 'dice' ? 3 : 2, cfg.unit)} to ${fmt(s.mean + half, mode === 'dice' ? 3 : 2, cfg.unit)}`;
      el('stat-width').textContent = fmt(2 * half, 3, cfg.unit);
    } else {
      el('stat-df').textContent = '—';
      el('stat-se').textContent = '—';
      el('stat-tci').textContent = 'Need n ≥ 2';
      el('stat-width').textContent = '—';
    }

    drawRunningMean(cfg);
    drawHistogram(cfg);
    drawCI(cfg, s);
  }

  function svgEl(name, attrs = {}, text = '') {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  }

  function setupSvg(svg, height = 300) {
    const width = Math.max(420, svg.clientWidth || 700);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';
    return { width, height };
  }

  function drawAxes(svg, width, height, margin, xTicks, yTicks, xScale, yScale, xLabel, yLabel) {
    const x0 = margin.left;
    const x1 = width - margin.right;
    const y0 = height - margin.bottom;
    const y1 = margin.top;

    yTicks.forEach(t => {
      const y = yScale(t);
      svg.appendChild(svgEl('line', { x1:x0, y1:y, x2:x1, y2:y, class:'gridline' }));
      svg.appendChild(svgEl('text', { x:x0 - 8, y:y + 4, 'text-anchor':'end', class:'tick-label' }, formatTick(t)));
    });
    xTicks.forEach(t => {
      const x = xScale(t);
      svg.appendChild(svgEl('line', { x1:x, y1:y1, x2:x, y2:y0, class:'gridline' }));
      svg.appendChild(svgEl('text', { x, y:y0 + 18, 'text-anchor':'middle', class:'tick-label' }, formatTick(t)));
    });
    svg.appendChild(svgEl('line', { x1:x0, y1:y0, x2:x1, y2:y0, class:'axis' }));
    svg.appendChild(svgEl('line', { x1:x0, y1:y0, x2:x0, y2:y1, class:'axis' }));
    svg.appendChild(svgEl('text', { x:(x0+x1)/2, y:height-5, 'text-anchor':'middle', class:'axis-label' }, xLabel));
    svg.appendChild(svgEl('text', { x:14, y:(y0+y1)/2, transform:`rotate(-90 14 ${(y0+y1)/2})`, 'text-anchor':'middle', class:'axis-label' }, yLabel));
  }

  function formatTick(v) {
    const av = Math.abs(v);
    if (av >= 1000) return Math.round(v).toLocaleString();
    if (av >= 10) return Number(v.toFixed(1)).toString();
    return Number(v.toFixed(2)).toString();
  }

  function ticks(min, max, count = 5) {
    if (max <= min) return [min];
    const out = [];
    for (let i = 0; i <= count; i++) out.push(min + (max - min) * i / count);
    return out;
  }

  function drawRunningMean(cfg) {
    const svg = el('mean-chart');
    const { width, height } = setupSvg(svg, 300);
    const m = { left:58, right:18, top:18, bottom:46 };
    const n = Math.max(1, data.length);
    const xMin = 1;
    const xMax = n;

    let yMin, yMax;
    if (mode === 'dice') {
      yMin = 1;
      yMax = 6;
    } else {
      yMin = cfg.mean - 3 * cfg.sigma;
      yMax = cfg.mean + 3 * cfg.sigma;
      if (runningMeans.length) {
        yMin = Math.min(yMin, ...runningMeans);
        yMax = Math.max(yMax, ...runningMeans);
      }
    }
    const pad = (yMax - yMin) * 0.04 || 1;
    yMin -= pad;
    yMax += pad;

    const xScale = x => m.left + (x - xMin) / Math.max(1, xMax - xMin) * (width - m.left - m.right);
    const yScale = y => height - m.bottom - (y - yMin) / (yMax - yMin) * (height - m.top - m.bottom);
    const xTicks = n === 1 ? [1] : ticks(1, n, 4);
    drawAxes(svg, width, height, m, xTicks, ticks(yMin, yMax, 5), xScale, yScale, 'Number of measurements, n', 'Running mean');

    const refY = yScale(cfg.mean);
    svg.appendChild(svgEl('line', { x1:m.left, y1:refY, x2:width-m.right, y2:refY, class:'reference-line' }));
    svg.appendChild(svgEl('text', { x:width-m.right-4, y:refY-7, 'text-anchor':'end', class:'tick-label' }, `population mean = ${cfg.mean}`));

    if (!runningMeans.length) {
      svg.appendChild(svgEl('text', { x:width/2, y:height/2, 'text-anchor':'middle', class:'tick-label' }, 'Add measurements to begin.'));
      return;
    }

    const maxPoints = 650;
    const step = Math.max(1, Math.floor(runningMeans.length / maxPoints));
    const points = [];
    for (let i = 0; i < runningMeans.length; i += step) points.push(`${xScale(i+1)},${yScale(runningMeans[i])}`);
    if ((runningMeans.length - 1) % step !== 0) {
      const i = runningMeans.length - 1;
      points.push(`${xScale(i+1)},${yScale(runningMeans[i])}`);
    }
    svg.appendChild(svgEl('polyline', { points:points.join(' '), class:'mean-line' }));
  }

  function drawHistogram(cfg) {
    const svg = el('hist-chart');
    const { width, height } = setupSvg(svg, 300);
    const m = { left:58, right:18, top:18, bottom:46 };

    if (!data.length) {
      svg.appendChild(svgEl('text', { x:width/2, y:height/2, 'text-anchor':'middle', class:'tick-label' }, 'Add measurements to begin.'));
      return;
    }

    let bins = [];
    if (mode === 'dice') {
      bins = Array.from({length:6}, (_, i) => ({ label:String(i+1), lo:i+.5, hi:i+1.5, count:0 }));
      data.forEach(x => bins[Math.max(0, Math.min(5, Math.round(x)-1))].count++);
    } else {
      const count = 12;
      const lo = cfg.mean - 4 * cfg.sigma;
      const hi = cfg.mean + 4 * cfg.sigma;
      const w = (hi - lo) / count;
      bins = Array.from({length:count}, (_, i) => ({ label:(lo + (i+.5)*w).toFixed(1), lo:lo+i*w, hi:lo+(i+1)*w, count:0 }));
      data.forEach(x => {
        let idx = Math.floor((x - lo) / w);
        idx = Math.max(0, Math.min(count-1, idx));
        bins[idx].count++;
      });
    }

    const props = bins.map(b => b.count / data.length);
    const yMax = Math.max(0.2, Math.max(...props) * 1.15);
    const xScale = i => m.left + i / bins.length * (width - m.left - m.right);
    const yScale = y => height - m.bottom - y / yMax * (height - m.top - m.bottom);

    const yTicks = ticks(0, yMax, 4);
    yTicks.forEach(t => {
      const y = yScale(t);
      svg.appendChild(svgEl('line', { x1:m.left, y1:y, x2:width-m.right, y2:y, class:'gridline' }));
      svg.appendChild(svgEl('text', { x:m.left-8, y:y+4, 'text-anchor':'end', class:'tick-label' }, `${Math.round(t*100)}%`));
    });
    svg.appendChild(svgEl('line', { x1:m.left, y1:height-m.bottom, x2:width-m.right, y2:height-m.bottom, class:'axis' }));
    svg.appendChild(svgEl('line', { x1:m.left, y1:height-m.bottom, x2:m.left, y2:m.top, class:'axis' }));

    const band = (width - m.left - m.right) / bins.length;
    bins.forEach((b, i) => {
      const barW = band * .78;
      const x = xScale(i) + (band - barW)/2;
      const y = yScale(props[i]);
      const h = height - m.bottom - y;
      svg.appendChild(svgEl('rect', { x, y, width:barW, height:h, class:'bar', rx:2 }));
      const showEvery = mode === 'dice' ? 1 : 2;
      if (i % showEvery === 0) svg.appendChild(svgEl('text', { x:x+barW/2, y:height-m.bottom+17, 'text-anchor':'middle', class:'tick-label' }, b.label));
    });
    svg.appendChild(svgEl('text', { x:(m.left+width-m.right)/2, y:height-5, 'text-anchor':'middle', class:'axis-label' }, mode === 'dice' ? 'Outcome' : 'MPG')); 
    svg.appendChild(svgEl('text', { x:14, y:(m.top+height-m.bottom)/2, transform:`rotate(-90 14 ${(m.top+height-m.bottom)/2})`, 'text-anchor':'middle', class:'axis-label' }, 'Relative frequency'));
  }

  function drawCI(cfg, s) {
    const svg = el('ci-chart');
    const { width, height } = setupSvg(svg, 230);
    const m = { left:80, right:25, top:28, bottom:45 };

    if (s.n < 2) {
      svg.appendChild(svgEl('text', { x:width/2, y:height/2, 'text-anchor':'middle', class:'tick-label' }, 'Collect at least two measurements to compute a t confidence interval.'));
      return;
    }

    const t = tCritical95(s.n - 1);
    const tHalf = t * s.se;
    const tLo = s.mean - tHalf;
    const tHi = s.mean + tHalf;
    const zHalf = z95 * cfg.sigma / Math.sqrt(s.n);
    const zLo = s.mean - zHalf;
    const zHi = s.mean + zHalf;

    let lo = Math.min(tLo, cfg.mean);
    let hi = Math.max(tHi, cfg.mean);
    if (showZ.checked) {
      lo = Math.min(lo, zLo);
      hi = Math.max(hi, zHi);
    }
    const span = Math.max(hi - lo, cfg.sigma * .25);
    lo -= span * .18;
    hi += span * .18;

    const xScale = x => m.left + (x - lo) / (hi - lo) * (width - m.left - m.right);
    const axisY = height - m.bottom;

    ticks(lo, hi, 5).forEach(tick => {
      const x = xScale(tick);
      svg.appendChild(svgEl('line', { x1:x, y1:m.top, x2:x, y2:axisY, class:'gridline' }));
      svg.appendChild(svgEl('text', { x, y:axisY+19, 'text-anchor':'middle', class:'tick-label' }, formatTick(tick)));
    });
    svg.appendChild(svgEl('line', { x1:m.left, y1:axisY, x2:width-m.right, y2:axisY, class:'axis' }));

    const trueX = xScale(cfg.mean);
    svg.appendChild(svgEl('line', { x1:trueX, y1:m.top, x2:trueX, y2:axisY, class:'true-line' }));
    svg.appendChild(svgEl('text', { x:trueX+5, y:m.top+10, class:'tick-label' }, 'simulation population mean'));

    const tY = 82;
    svg.appendChild(svgEl('text', { x:m.left-10, y:tY+4, 'text-anchor':'end', class:'ci-label' }, 't, σ unknown'));
    svg.appendChild(svgEl('line', { x1:xScale(tLo), y1:tY, x2:xScale(tHi), y2:tY, class:'ci-line ci-t' }));
    svg.appendChild(svgEl('circle', { cx:xScale(s.mean), cy:tY, r:5, class:'ci-point' }));
    svg.appendChild(svgEl('line', { x1:xScale(tLo), y1:tY-8, x2:xScale(tLo), y2:tY+8, class:'ci-t', 'stroke-width':2 }));
    svg.appendChild(svgEl('line', { x1:xScale(tHi), y1:tY-8, x2:xScale(tHi), y2:tY+8, class:'ci-t', 'stroke-width':2 }));

    if (showZ.checked) {
      const zY = 128;
      svg.appendChild(svgEl('text', { x:m.left-10, y:zY+4, 'text-anchor':'end', class:'ci-label' }, 'z, σ known'));
      svg.appendChild(svgEl('line', { x1:xScale(zLo), y1:zY, x2:xScale(zHi), y2:zY, class:'ci-line ci-z' }));
      svg.appendChild(svgEl('circle', { cx:xScale(s.mean), cy:zY, r:5, class:'ci-point' }));
      svg.appendChild(svgEl('line', { x1:xScale(zLo), y1:zY-8, x2:xScale(zLo), y2:zY+8, class:'ci-z', 'stroke-width':2 }));
      svg.appendChild(svgEl('line', { x1:xScale(zHi), y1:zY-8, x2:xScale(zHi), y2:zY+8, class:'ci-z', 'stroke-width':2 }));
    }

    svg.appendChild(svgEl('text', { x:(m.left+width-m.right)/2, y:height-5, 'text-anchor':'middle', class:'axis-label' }, mode === 'dice' ? 'Mean outcome' : 'Mean fuel economy (MPG)'));
  }

  render();
})();
