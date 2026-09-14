(() => {
  const $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const els = {
    ex: $('eps-x'), ey: $('eps-y'), g: $('gamma-xy'), theta: $('theta'), thetaOut: $('theta-output'), preset: $('preset'),
    principal: $('principal-angle'), zero: $('zero-angle'), elementSvg: $('element-svg'), mohrSvg: $('mohr-svg'),
    modelTheta: $('model-theta'), modelDouble: $('model-double-theta'), modelReading: $('model-reading'),
    epsTheta: $('stat-eps-theta'), gammaTheta: $('stat-gamma-theta'), e1: $('stat-e1'), e2: $('stat-e2'),
    thetaP: $('stat-theta-p'), center: $('stat-center'), radius: $('stat-radius'), circleAngle: $('stat-circle-angle'),
    observation: $('observation'), r0: $('rosette-0'), r45: $('rosette-45'), r90: $('rosette-90'), rosetteCheck: $('rosette-check')
  };

  const fmt = (x, digits = 1) => `${Number(x).toFixed(digits)} με`;
  const fmtDeg = (x) => `${Number(x).toFixed(1)}°`;
  const rad = (deg) => deg * Math.PI / 180;
  const deg = (radValue) => radValue * 180 / Math.PI;
  const clampFinite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

  function readState() {
    return {
      ex: clampFinite(parseFloat(els.ex.value)),
      ey: clampFinite(parseFloat(els.ey.value)),
      g: clampFinite(parseFloat(els.g.value)),
      theta: clampFinite(parseFloat(els.theta.value))
    };
  }

  function derived(s) {
    const avg = (s.ex + s.ey) / 2;
    const dx = (s.ex - s.ey) / 2;
    const gy = s.g / 2;
    const R = Math.hypot(dx, gy);
    const e1 = avg + R;
    const e2 = avg - R;
    const thetaP = R < 1e-12 ? 0 : 0.5 * deg(Math.atan2(s.g, s.ex - s.ey));
    const a = rad(2 * s.theta);
    const eTheta = avg + dx * Math.cos(a) + gy * Math.sin(a);
    const gHalfTheta = -dx * Math.sin(a) + gy * Math.cos(a);
    const gTheta = 2 * gHalfTheta;
    const startAngle = deg(Math.atan2(gy, dx));
    const currentAngle = deg(Math.atan2(gHalfTheta, eTheta - avg));
    const r0 = s.ex;
    const r45 = avg + gy;
    const r90 = s.ey;
    return { avg, dx, gy, R, e1, e2, thetaP, eTheta, gHalfTheta, gTheta, startAngle, currentAngle, r0, r45, r90 };
  }

  function svgEl(name, attrs = {}, text = null) {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text !== null) node.textContent = text;
    return node;
  }

  function clear(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function drawElement(s, d) {
    const svg = els.elementSvg;
    clear(svg);
    const cx = 260, cy = 195, half = 92;
    const maxPrincipal = Math.max(Math.abs(d.e1), Math.abs(d.e2), 1);
    const scale = 0.22 / maxPrincipal;
    const exn = s.ex * scale;
    const eyn = s.ey * scale;
    const exyn = (s.g / 2) * scale;

    const corners = [[-half,-half],[half,-half],[half,half],[-half,half]];
    const deform = ([x,y]) => {
      const xd = (1 + exn) * x + exyn * y;
      const yd = exyn * x + (1 + eyn) * y;
      return [cx + xd, cy - yd];
    };

    svg.appendChild(svgEl('rect', {
      x: cx-half, y: cy-half, width: 2*half, height: 2*half,
      fill:'none', stroke:'#b9bbc0', 'stroke-width':'2', 'stroke-dasharray':'7 6'
    }));

    const pts = corners.map(deform).map(p => p.join(',')).join(' ');
    svg.appendChild(svgEl('polygon', {points:pts, fill:'#f6f3fa', stroke:'#4f2683', 'stroke-width':'3'}));

    svg.appendChild(svgEl('line', {x1:cx-135,y1:cy,x2:cx+145,y2:cy,stroke:'#777','stroke-width':'1.4'}));
    svg.appendChild(svgEl('line', {x1:cx,y1:cy+135,x2:cx,y2:cy-145,stroke:'#777','stroke-width':'1.4'}));
    svg.appendChild(svgEl('text',{x:cx+151,y:cy+5,class:'svg-label'},'x'));
    svg.appendChild(svgEl('text',{x:cx+6,y:cy-150,class:'svg-label'},'y'));

    const th = rad(s.theta);
    const ux = Math.cos(th), uy = -Math.sin(th);
    const L = 132;
    svg.appendChild(svgEl('line',{
      x1:cx-L*ux,y1:cy-L*uy,x2:cx+L*ux,y2:cy+L*uy,
      stroke:'#4f2683','stroke-width':'6','stroke-linecap':'round'
    }));
    svg.appendChild(svgEl('circle',{cx,cy,r:7,fill:'#4f2683'}));
    svg.appendChild(svgEl('text',{x:cx+L*ux+8,y:cy+L*uy-4,class:'svg-title'},"x′ / gauge"));

    const arcR = 46;
    const endX = cx + arcR * Math.cos(th);
    const endY = cy - arcR * Math.sin(th);
    const sweep = s.theta >= 0 ? 0 : 1;
    const path = `M ${cx+arcR} ${cy} A ${arcR} ${arcR} 0 0 ${sweep} ${endX} ${endY}`;
    svg.appendChild(svgEl('path',{d:path,fill:'none',stroke:'#bd7d00','stroke-width':'3'}));
    const labelAngle = rad(s.theta/2);
    svg.appendChild(svgEl('text',{
      x:cx+62*Math.cos(labelAngle),y:cy-62*Math.sin(labelAngle)-4,class:'svg-title'
    },`θ = ${s.theta.toFixed(1)}°`));

    svg.appendChild(svgEl('text',{x:20,y:30,class:'svg-small'},'Gray dashed: undeformed reference'));
    svg.appendChild(svgEl('text',{x:20,y:49,class:'svg-small'},'Purple outline: exaggerated strained shape'));
  }

  function drawMohr(s, d) {
    const svg = els.mohrSvg;
    clear(svg);
    const W = 620, H = 420;
    const margin = {l:62,r:26,t:28,b:56};
    const pw = W-margin.l-margin.r, ph = H-margin.t-margin.b;
    const rVal = Math.max(d.R, 1);
    const span = 1.32 * rVal;
    const unitsPerPixel = Math.max((2*span)/pw, (2*span)/ph);
    const pxPerUnit = 1/unitsPerPixel;
    const xC = margin.l + pw/2;
    const yC = margin.t + ph/2;
    const mapX = (e) => xC + (e-d.avg)*pxPerUnit;
    const mapY = (ghalf) => yC - ghalf*pxPerUnit;
    const circleR = d.R * pxPerUnit;

    for (let k=-2;k<=2;k++) {
      const y = yC + k*(ph/4);
      svg.appendChild(svgEl('line',{x1:margin.l,y1:y,x2:W-margin.r,y2:y,class:'svg-grid'}));
    }

    svg.appendChild(svgEl('line',{x1:margin.l,y1:yC,x2:W-margin.r,y2:yC,class:'svg-axis'}));
    svg.appendChild(svgEl('text',{
      x:W-margin.r-6,y:yC-8,'text-anchor':'end',class:'svg-label'
    },'normal strain ε (με)'));

    const zeroX = mapX(0);
    if (zeroX >= margin.l && zeroX <= W-margin.r) {
      svg.appendChild(svgEl('line',{
        x1:zeroX,y1:margin.t,x2:zeroX,y2:H-margin.b,class:'svg-grid','stroke-dasharray':'4 4'
      }));
      svg.appendChild(svgEl('text',{x:zeroX+4,y:H-margin.b+18,class:'svg-small'},'0'));
    }

    svg.appendChild(svgEl('circle',{
      cx:xC,cy:yC,r:circleR,fill:'#f9f7fc',stroke:'#4f2683','stroke-width':'3'
    }));
    svg.appendChild(svgEl('circle',{cx:xC,cy:yC,r:4,fill:'#555'}));
    svg.appendChild(svgEl('text',{x:xC+7,y:yC+17,class:'svg-small'},`C = ${d.avg.toFixed(1)}`));

    const x1 = mapX(d.e1), x2 = mapX(d.e2);
    svg.appendChild(svgEl('circle',{cx:x1,cy:yC,r:7,fill:'#bd7d00',stroke:'#fff','stroke-width':'2'}));
    svg.appendChild(svgEl('circle',{cx:x2,cy:yC,r:7,fill:'#bd7d00',stroke:'#fff','stroke-width':'2'}));
    svg.appendChild(svgEl('text',{x:x1,y:yC+28,'text-anchor':'middle',class:'svg-title'},`ε₁ ${d.e1.toFixed(1)}`));
    svg.appendChild(svgEl('text',{x:x2,y:yC+28,'text-anchor':'middle',class:'svg-title'},`ε₂ ${d.e2.toFixed(1)}`));

    const startX = mapX(s.ex), startY = mapY(s.g/2);
    const currX = mapX(d.eTheta), currY = mapY(d.gHalfTheta);
    svg.appendChild(svgEl('line',{
      x1:xC,y1:yC,x2:startX,y2:startY,stroke:'#336699','stroke-width':'2','stroke-dasharray':'6 5'
    }));
    svg.appendChild(svgEl('circle',{cx:startX,cy:startY,r:7,fill:'#336699',stroke:'#fff','stroke-width':'2'}));
    svg.appendChild(svgEl('text',{x:startX+10,y:startY-8,class:'svg-small'},'θ = 0°'));

    svg.appendChild(svgEl('line',{
      x1:xC,y1:yC,x2:currX,y2:currY,stroke:'#4f2683','stroke-width':'3'
    }));
    svg.appendChild(svgEl('circle',{cx:currX,cy:currY,r:8,fill:'#4f2683',stroke:'#fff','stroke-width':'2'}));
    svg.appendChild(svgEl('text',{x:currX+10,y:currY+18,class:'svg-title'},`θ = ${s.theta.toFixed(1)}°`));

    const a0 = Math.atan2(d.gy, d.dx);
    const delta = rad(-2*s.theta);
    const arcRad = Math.max(24, circleR*0.28);
    const sx = xC + arcRad*Math.cos(a0);
    const sy = yC - arcRad*Math.sin(a0);
    const exa = xC + arcRad*Math.cos(a0+delta);
    const eya = yC - arcRad*Math.sin(a0+delta);
    const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
    const sweep = delta >= 0 ? 0 : 1;
    svg.appendChild(svgEl('path',{
      d:`M ${sx} ${sy} A ${arcRad} ${arcRad} 0 ${largeArc} ${sweep} ${exa} ${eya}`,
      fill:'none',stroke:'#bd7d00','stroke-width':'3'
    }));
    const amid = a0+delta/2;
    svg.appendChild(svgEl('text',{
      x:xC+(arcRad+22)*Math.cos(amid),y:yC-(arcRad+22)*Math.sin(amid),class:'svg-title'
    },'−2θ'));

    const topY = mapY(d.R), bottomY = mapY(-d.R);
    svg.appendChild(svgEl('text',{x:margin.l-12,y:topY+4,'text-anchor':'end',class:'svg-small'},`${d.R.toFixed(1)}`));
    svg.appendChild(svgEl('text',{x:margin.l-12,y:bottomY+4,'text-anchor':'end',class:'svg-small'},`${(-d.R).toFixed(1)}`));
    svg.appendChild(svgEl('text',{x:margin.l-12,y:margin.t+12,'text-anchor':'end',class:'svg-label'},'γ/2'));
  }

  function updateText(s, d) {
    els.thetaOut.value = fmtDeg(s.theta);
    els.thetaOut.textContent = fmtDeg(s.theta);
    els.modelTheta.textContent = `θ = ${s.theta.toFixed(1)}°`;
    els.modelDouble.textContent = `2θ = ${(2*s.theta).toFixed(1)}°`;
    els.modelReading.textContent = `εθ = ${d.eTheta.toFixed(1)} με`;
    els.epsTheta.textContent = fmt(d.eTheta);
    els.gammaTheta.textContent = fmt(d.gTheta);
    els.e1.textContent = fmt(d.e1);
    els.e2.textContent = fmt(d.e2);
    els.thetaP.textContent = fmtDeg(d.thetaP);
    els.center.textContent = fmt(d.avg);
    els.radius.textContent = fmt(d.R);
    els.circleAngle.textContent = `${(-2*s.theta).toFixed(1)}° from start`;
    els.r0.textContent = fmt(d.r0);
    els.r45.textContent = fmt(d.r45);
    els.r90.textContent = fmt(d.r90);

    const recovered = 2*d.r45 - d.r0 - d.r90;
    els.rosetteCheck.innerHTML = `<strong>Rosette check:</strong> 2ε45 − ε0 − ε90 = ${recovered.toFixed(1)} με, which recovers the entered γxy = ${s.g.toFixed(1)} με.`;

    const nearPrincipal = Math.abs(d.gTheta) < Math.max(2, 0.01*Math.max(Math.abs(d.e1),Math.abs(d.e2),1));
    if (nearPrincipal) {
      els.observation.innerHTML = `<strong>Principal direction found:</strong> transformed shear strain is approximately zero, so the rotated axes are nearly principal axes. The gauge reads εθ = ${d.eTheta.toFixed(1)} με.`;
    } else {
      els.observation.innerHTML = `<strong>Observe the coupling:</strong> at θ = ${s.theta.toFixed(1)}°, the gauge reads ${d.eTheta.toFixed(1)} με while the transformed engineering shear strain is ${d.gTheta.toFixed(1)} με. The same fixed strain state can produce different directional readings.`;
    }
  }

  function render() {
    const s = readState();
    const d = derived(s);
    updateText(s,d);
    drawElement(s,d);
    drawMohr(s,d);
  }

  function setPreset(name) {
    const presets = {
      general:{ex:400,ey:-100,g:300},
      beam:{ex:-500,ey:150,g:0},
      tension:{ex:500,ey:-150,g:0},
      shear:{ex:0,ey:0,g:500}
    };
    const p = presets[name] || presets.general;
    els.ex.value = p.ex;
    els.ey.value = p.ey;
    els.g.value = p.g;
    els.theta.value = 0;
    render();
  }

  [els.ex,els.ey,els.g,els.theta].forEach(el => el.addEventListener('input', render));
  els.preset.addEventListener('change', () => setPreset(els.preset.value));
  els.zero.addEventListener('click', () => {
    els.theta.value = 0;
    render();
  });
  els.principal.addEventListener('click', () => {
    const s = readState();
    const d = derived(s);
    let t = d.thetaP;
    while (t > 90) t -= 180;
    while (t < -90) t += 180;
    els.theta.value = t.toFixed(1);
    render();
  });

  render();
})();
