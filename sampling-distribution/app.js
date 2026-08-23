(() => {
  const NS='http://www.w3.org/2000/svg';
  const popSelect=document.getElementById('population');
  const slider=document.getElementById('n-slider');
  const out=document.getElementById('n-value');
  const popChart=document.getElementById('population-chart');
  const meanChart=document.getElementById('mean-chart');
  const R=3000;

  const cfgs={
    dice:{mu:3.5,sigma:Math.sqrt(35/12),sample:()=>1+Math.floor(Math.random()*6),note:'A fair die is clearly not normally distributed.',domain:[.5,6.5],bins:6},
    exp:{mu:1,sigma:1,sample:()=>-Math.log(1-Math.random()),note:'This population is strongly right-skewed, not normal.',domain:[0,6],bins:20}
  };

  let mode='dice', n=1, populationData=[], meanData=[];
  document.querySelectorAll('[data-n]').forEach(b=>b.addEventListener('click',()=>{slider.value=b.dataset.n;n=Number(b.dataset.n);simulateMeans();draw();}));
  slider.addEventListener('input',()=>{n=Number(slider.value);simulateMeans();draw();});
  popSelect.addEventListener('change',()=>{mode=popSelect.value;simulateAll();draw();});
  document.getElementById('resimulate').addEventListener('click',()=>{simulateAll();draw();});
  window.addEventListener('resize',draw);

  function simulateAll(){const c=cfgs[mode];populationData=Array.from({length:5000},c.sample);simulateMeans();}
  function simulateMeans(){const c=cfgs[mode];meanData=[];for(let r=0;r<R;r++){let s=0;for(let i=0;i<n;i++)s+=c.sample();meanData.push(s/n);}}
  function mean(a){return a.reduce((x,y)=>x+y,0)/a.length}
  function sd(a){const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));}
  function svgEl(name,attrs={},text=''){const e=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text)e.textContent=text;return e;}
  function normPdf(x,mu,s){const z=(x-mu)/s;return Math.exp(-.5*z*z)/(s*Math.sqrt(2*Math.PI));}

  function draw(){
    const c=cfgs[mode], se=c.sigma/Math.sqrt(n); out.value=n;out.textContent=n;
    document.getElementById('mu').textContent=c.mu.toFixed(3);document.getElementById('sigma').textContent=c.sigma.toFixed(3);document.getElementById('se').textContent=se.toFixed(3);document.getElementById('emp-sd').textContent=sd(meanData).toFixed(3);document.getElementById('population-note').textContent=c.note;
    drawHistogram(popChart,populationData,c.domain[0],c.domain[1],c.bins,false,null,null,'Measurement value','Relative frequency');
    let xmin,xmax;if(mode==='dice'){xmin=Math.max(.5,c.mu-4*se);xmax=Math.min(6.5,c.mu+4*se);}else{xmin=Math.max(0,c.mu-3.5*se);xmax=c.mu+5*se;} if(xmax-xmin<.2){xmin=c.mu-.1;xmax=c.mu+.1;}
    drawHistogram(meanChart,meanData,xmin,xmax,24,true,c.mu,se,'Sample mean, X̄','Density');
  }

  function drawHistogram(svg,data,xmin,xmax,bins,density,mu,se,xLabel,yLabel){
    const width=Math.max(420,svg.clientWidth||650),height=330,m={l:58,r:18,t:18,b:48};svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.innerHTML='';
    const counts=Array(bins).fill(0),bw=(xmax-xmin)/bins;data.forEach(x=>{if(x<xmin||x>xmax)return;let j=Math.floor((x-xmin)/bw);if(j===bins)j--;if(j>=0&&j<bins)counts[j]++;});
    const vals=counts.map(c=>density?c/(data.length*bw):c/data.length); let ymax=Math.max(...vals);
    if(density&&se){for(let i=0;i<=120;i++){const x=xmin+(xmax-xmin)*i/120;ymax=Math.max(ymax,normPdf(x,mu,se));}} ymax*=1.15;
    const x0=m.l,x1=width-m.r,y0=height-m.b,y1=m.t,xs=x=>x0+(x-xmin)/(xmax-xmin)*(x1-x0),ys=y=>y0-y/ymax*(y0-y1);
    for(let i=0;i<=4;i++){const v=ymax*i/4,y=ys(v);svg.appendChild(svgEl('line',{x1:x0,y1:y,x2:x1,y2:y,class:'gridline'}));svg.appendChild(svgEl('text',{x:x0-8,y:y+4,'text-anchor':'end',class:'tick'},density?v.toFixed(2):`${Math.round(100*v)}%`));}
    svg.appendChild(svgEl('line',{x1:x0,y1:y0,x2:x1,y2:y0,class:'axis'}));svg.appendChild(svgEl('line',{x1:x0,y1:y0,x2:x0,y2:y1,class:'axis'}));
    const px=(x1-x0)/bins;vals.forEach((v,i)=>{const x=x0+i*px+px*.1,y=ys(v);svg.appendChild(svgEl('rect',{x,y,width:px*.8,height:y0-y,class:'bar',rx:1}));});
    if(density&&se){const pts=[];for(let i=0;i<=120;i++){const x=xmin+(xmax-xmin)*i/120;pts.push(`${xs(x)},${ys(normPdf(x,mu,se))}`);}svg.appendChild(svgEl('polyline',{points:pts.join(' '),class:'normal-line'}));}
    for(let i=0;i<=5;i++){const x=xmin+(xmax-xmin)*i/5;svg.appendChild(svgEl('text',{x:xs(x),y:y0+18,'text-anchor':'middle',class:'tick'},Number(x.toFixed(2)).toString()));}
    svg.appendChild(svgEl('text',{x:(x0+x1)/2,y:height-6,'text-anchor':'middle',class:'axis-label'},xLabel));svg.appendChild(svgEl('text',{x:14,y:(y0+y1)/2,transform:`rotate(-90 14 ${(y0+y1)/2})`,'text-anchor':'middle',class:'axis-label'},yLabel));
  }

  simulateAll();draw();
})();
