(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const z95 = 1.959963984540054;
  const el = id => document.getElementById(id);

  const nInput = el('n');
  const xbarInput = el('xbar');
  const sInput = el('s');
  const showZ = el('show-z');

  [nInput, xbarInput, sInput, showZ].forEach(node => node.addEventListener('input', render));
  window.addEventListener('resize', render);

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

  function svgEl(name, attrs = {}, text = '') {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  }

  function fmt(v, digits = 3) {
    return Number.isFinite(v) ? v.toFixed(digits) : '—';
  }

  function render() {
    const n = Math.max(3, Number(nInput.value));
    const xbar = Number(xbarInput.value);
    const s = Math.max(0.000001, Number(sInput.value));
    const df = n - 1;
    const se = s / Math.sqrt(n);
    const tcrit = tCritical95(df);
    const tHalf = tcrit * se;
    const zHalf = z95 * se;

    el('n-value').textContent = n;
    el('df').textContent = df;
    el('se').textContent = fmt(se);
    el('tcrit').textContent = fmt(tcrit);
    el('tci').textContent = `${fmt(xbar - tHalf, 2)} to ${fmt(xbar + tHalf, 2)}`;
    el('z-note').hidden = !showZ.checked;

    drawCI({ xbar, tHalf, zHalf, showZ: showZ.checked });
  }

  function drawCI({ xbar, tHalf, zHalf, showZ }) {
    const svg = el('ci-chart');
    const width = Math.max(520, svg.clientWidth || 800);
    const height = 260;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';

    const margin = { left:70, right:35, top:32, bottom:52 };
    const halfRange = Math.max(tHalf * 1.35, 1);
    const xmin = xbar - halfRange;
    const xmax = xbar + halfRange;
    const xScale = x => margin.left + (x - xmin) / (xmax - xmin) * (width - margin.left - margin.right);

    const axisY = height - margin.bottom;
    svg.appendChild(svgEl('line', { x1:margin.left, y1:axisY, x2:width-margin.right, y2:axisY, class:'axis' }));

    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
      const value = xmin + (xmax - xmin) * i / tickCount;
      const x = xScale(value);
      svg.appendChild(svgEl('line', { x1:x, y1:margin.top, x2:x, y2:axisY, class:'gridline' }));
      svg.appendChild(svgEl('text', { x, y:axisY+19, 'text-anchor':'middle', class:'tick-label' }, value.toFixed(2)));
    }
    svg.appendChild(svgEl('text', { x:(margin.left+width-margin.right)/2, y:height-8, 'text-anchor':'middle', class:'axis-label' }, 'Possible values of the population mean'));

    const meanX = xScale(xbar);
    svg.appendChild(svgEl('line', { x1:meanX, y1:margin.top, x2:meanX, y2:axisY, class:'mean-line' }));
    svg.appendChild(svgEl('text', { x:meanX, y:margin.top-8, 'text-anchor':'middle', class:'ci-label' }, `sample mean = ${xbar.toFixed(2)}`));

    drawInterval(svg, xScale, xbar - tHalf, xbar + tHalf, 92, '95% t-interval', 'ci-t', 'cap-t');

    if (showZ) {
      drawInterval(svg, xScale, xbar - zHalf, xbar + zHalf, 148, '95% z-interval', 'ci-z', 'cap-z');
    }

    svg.appendChild(svgEl('circle', { cx:meanX, cy:92, r:5, class:'mean-point' }));
    if (showZ) svg.appendChild(svgEl('circle', { cx:meanX, cy:148, r:5, class:'mean-point' }));
  }

  function drawInterval(svg, xScale, lo, hi, y, label, lineClass, capClass) {
    const x1 = xScale(lo);
    const x2 = xScale(hi);
    svg.appendChild(svgEl('line', { x1, y1:y, x2, y2:y, class:lineClass }));
    svg.appendChild(svgEl('line', { x1, y1:y-10, x2:x1, y2:y+10, class:capClass }));
    svg.appendChild(svgEl('line', { x1:x2, y1:y-10, x2, y2:y+10, class:capClass }));
    svg.appendChild(svgEl('text', { x:70, y:y-14, class:'ci-label' }, label));
  }

  render();
})();
