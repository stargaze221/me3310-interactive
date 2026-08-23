(() => {
  const NS='http://www.w3.org/2000/svg';
  const slider=document.getElementById('n-slider');
  const out=document.getElementById('n-value');
  const chart=document.getElementById('chart');
  document.querySelectorAll('[data-n]').forEach(b=>b.addEventListener('click',()=>{slider.value=b.dataset.n;render();}));
  slider.addEventListener('input',render); window.addEventListener('resize',render);

  function erf(x){const s=x<0?-1:1; x=Math.abs(x); const a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=.3275911; const t=1/(1+p*x); const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x); return s*y;}
  const Phi=z=>.5*(1+erf(z/Math.SQRT2));
  function binomialPMF(n){const p=[]; p[0]=Math.pow(.5,n); for(let k=0;k<n;k++)p[k+1]=p[k]*(n-k)/(k+1); return p;}
  function normalMass(k,mu,sd){return Phi((k+.5-mu)/sd)-Phi((k-.5-mu)/sd);}
  function el(name,attrs={},text=''){const n=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;return n;}

  function render(){
    const n=Number(slider.value), mu=n/2, sd=Math.sqrt(n)/2, pmf=binomialPMF(n), approx=pmf.map((_,k)=>normalMass(k,mu,sd));
    out.value=n; out.textContent=n; document.getElementById('dist-label').textContent=`Binomial(${n}, 0.5)`; document.getElementById('mean-value').textContent=mu.toFixed(2); document.getElementById('sd-value').textContent=sd.toFixed(2); document.getElementById('normal-label').textContent=`N(${mu.toFixed(2)}, ${sd.toFixed(2)}²)`;
    const width=Math.max(480,chart.clientWidth||900),height=370,m={l:58,r:20,t:18,b:50}; chart.setAttribute('viewBox',`0 0 ${width} ${height}`); chart.innerHTML='';
    const maxY=Math.max(...pmf,...approx)*1.14; const x0=m.l,x1=width-m.r,y0=height-m.b,y1=m.t;
    const xScale=k=>x0+(k+.5)/(n+1)*(x1-x0), yScale=y=>y0-y/maxY*(y0-y1);
    for(let i=0;i<=4;i++){const v=maxY*i/4,y=yScale(v);chart.appendChild(el('line',{x1:x0,y1:y,x2:x1,y2:y,class:'gridline'}));chart.appendChild(el('text',{x:x0-8,y:y+4,'text-anchor':'end',class:'tick'},`${(100*v).toFixed(v<.1?1:0)}%`));}
    chart.appendChild(el('line',{x1:x0,y1:y0,x2:x1,y2:y0,class:'axis'})); chart.appendChild(el('line',{x1:x0,y1:y0,x2:x0,y2:y1,class:'axis'}));
    const band=(x1-x0)/(n+1), barW=Math.max(1.5,band*.72);
    pmf.forEach((v,k)=>{const x=xScale(k)-barW/2,y=yScale(v);chart.appendChild(el('rect',{x,y,width:barW,height:y0-y,class:'bar',rx:1}));});
    const pts=approx.map((v,k)=>`${xScale(k)},${yScale(v)}`).join(' '); chart.appendChild(el('polyline',{points:pts,class:'normal-line'})); if(n<=40) approx.forEach((v,k)=>chart.appendChild(el('circle',{cx:xScale(k),cy:yScale(v),r:2.3,class:'normal-point'})));
    const ticks=[]; const step=n<=20?Math.max(1,Math.ceil(n/10)):Math.ceil(n/8); for(let k=0;k<=n;k+=step)ticks.push(k); if(ticks[ticks.length-1]!==n)ticks.push(n); ticks.forEach(k=>chart.appendChild(el('text',{x:xScale(k),y:y0+18,'text-anchor':'middle',class:'tick'},String(k))));
    chart.appendChild(el('text',{x:(x0+x1)/2,y:height-7,'text-anchor':'middle',class:'axis-label'},'Number of heads, k')); chart.appendChild(el('text',{x:14,y:(y0+y1)/2,transform:`rotate(-90 14 ${(y0+y1)/2})`,'text-anchor':'middle',class:'axis-label'},'Probability'));
  }
  render();
})();
