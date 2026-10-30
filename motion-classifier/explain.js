"use strict";
/* ME3310: interactive explanation of the EXISTING real-data model.
   This script only reads measured trial features and trained GD parameters.
   Selecting a trial NEVER affects the optimization history. */
(function(){
  let sample = null;
  const F = (x,n=3) => Number.isFinite(x) ? x.toFixed(n) : "—";

  function selectMeasuredTrial(r){
    if(!r) return;
    sample=r;
    window.selectedMeasuredTrial=r;
    const idx=rows.indexOf(r);
    const selector=get("sample");
    if(idx>=0)selector.value=String(idx);
    if(r.group==="diagnostic" && !get("showHold").checked){
      get("showHold").checked=true;
    }
    render(); // redraws both training graphics plus interpretation
  }

  function initialize(){
    if(!rows.length||!history.length)return;
    const select=get("sample");
    select.replaceChildren();
    const training=document.createElement("optgroup");
    training.label="Development subjects — used for training";
    const diagnostic=document.createElement("optgroup");
    diagnostic.label="Held-out subjects — diagnostic only";
    for(let i=0;i<rows.length;i++){
      const r=rows[i];
      const option=document.createElement("option");
      option.value=String(i);
      option.textContent="Subject "+r.subject+" · Trial "+r.trial+" · "+(r.y?"Downstairs":"Upstairs");
      (r.group==="diagnostic"?diagnostic:training).appendChild(option);
    }
    select.append(training,diagnostic);
    select.disabled=false;
    select.addEventListener("change",()=>{
      const idx=Number(select.value);
      selectMeasuredTrial(rows[idx]);
    });
    // Prefer a known original trial from Subject 2 to align with Page 02.
    selectMeasuredTrial(rows.find(r=>r.subject===2&&r.trial===1&&r.y===0&&r.group==="development")
      || rows.find(r=>r.group==="development"));

    const canvas=get("scatter");
    canvas.style.cursor="crosshair";
    canvas.title="Click any measured original-trial dot to examine its weighted score and loss.";
    canvas.addEventListener("click",event=>{
      const rect=canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const mx=(event.clientX-rect.left)*canvas.width/rect.width;
      const my=(event.clientY-rect.top)*canvas.height/rect.height;
      const xs=rows.map(r=>r.z[0]),ys=rows.map(r=>r.z[1]);
      let loX=Math.min(...xs),hiX=Math.max(...xs);
      let loY=Math.min(...ys),hiY=Math.max(...ys);
      const padX=Math.max(.4,(hiX-loX)*.1),padY=Math.max(.4,(hiY-loY)*.1);
      loX-=padX;hiX+=padX;loY-=padY;hiY+=padY;
      const sx=x=>62+(x-loX)/(hiX-loX)*(596-62);
      const sy=y=>377-(y-loY)/(hiY-loY)*(377-28);
      let nearest=null,dist=Infinity;
      for(const r of rows){
        if(r.group==="diagnostic"&&!get("showHold").checked)continue;
        const d=(sx(r.z[0])-mx)**2+(sy(r.z[1])-my)**2;
        if(d<dist){nearest=r;dist=d;}
      }
      if(nearest&&dist<=17*17)selectMeasuredTrial(nearest);
    });
  }

  function fillBar(barId,value,maxAbs){
    const b=get(barId);
    if(Math.abs(value)<1e-12){b.style.width="0";return;}
    const width=45*Math.min(1,Math.abs(value)/maxAbs);
    b.style.left=(value>0?50:50-width)+"%";
    b.style.width=width+"%";
    b.className="term-bar"+(value<0?" negative":"");
  }

  function drawSampleLoss(p,y,loss){
    const c=get("sampleLossPlot"),ctx=c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);
    const left=66,right=598,top=24,bottom=281;
    const maxLoss=4.2;
    const xp=t=>left+t*(right-left);
    const yl=l=>bottom-Math.min(maxLoss,Math.max(0,l))/maxLoss*(bottom-top);
    ctx.font="13px Arial";
    ctx.strokeStyle="#e1e7ee";ctx.lineWidth=1;
    for(let k=0;k<=4;k++){
      const v=k;
      const yy=yl(v);
      ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();
      ctx.fillStyle="#556579";ctx.textAlign="right";ctx.fillText(String(v),left-12,yy+4);
    }
    for(let k=0;k<=5;k++){
      const v=k/5,xx=xp(v);
      ctx.strokeStyle="#edf1f5";ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,bottom);ctx.stroke();
      ctx.fillStyle="#556579";ctx.textAlign="center";ctx.fillText(F(v,1),xx,bottom+20);
    }
    ctx.strokeStyle="#7b8da2";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();
    const curves=[
      {label:"True Upstairs (y=0)",color:"#2a76af",fn:t=>-Math.log(1-t)},
      {label:"True Downstairs (y=1)",color:"#d37b42",fn:t=>-Math.log(t)}
    ];
    for(const curve of curves){
      ctx.strokeStyle=curve.color;ctx.lineWidth=y===(curve.color==="#d37b42"?1:0)?3.1:1.5;
      ctx.globalAlpha=y===(curve.color==="#d37b42"?1:0)?1:.32;
      ctx.beginPath();
      for(let i=0;i<=392;i++){
        const t=.01+.98*i/392;
        const xx=xp(t),yy=yl(curve.fn(t));
        if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha=1;
    const pt=Math.min(.9999,Math.max(.0001,p));
    const px=xp(pt),py=yl(loss);
    ctx.strokeStyle="#39465b";ctx.setLineDash([4,3]);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(px,bottom);ctx.lineTo(px,py);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(px,py,7,0,Math.PI*2);
    ctx.fillStyle=y===0?"#2a76af":"#d37b42";ctx.fill();
    ctx.strokeStyle="#202a3a";ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle="#48596b";ctx.font="13px Arial";ctx.textAlign="center";
    ctx.fillText("Model probability p(Downstairs)",330,330);
    ctx.save();ctx.translate(17,152);ctx.rotate(-Math.PI/2);ctx.fillText("Individual loss",0,0);ctx.restore();
    ctx.font="12px Arial";
    ctx.fillStyle="#2a76af";ctx.fillText("Upstairs: −log(1−p)",180,16);
    ctx.fillStyle="#d37b42";ctx.fillText("Downstairs: −log(p)",453,16);
    if(loss>maxLoss){
      ctx.fillStyle="#39465b";ctx.fillText("Point above graph range; see exact numeric loss.",320,305);
    }
  }

  function update(epoch,h){
    if(!sample || !history.length)return;
    const r=sample;
    const a=h.w[0]*r.z[0],b=h.w[1]*r.z[1],bias=h.w[2];
    const score=a+b+bias,p=sig(score),loss=ce(score,r.y);
    const predicted=score>=0?1:0;
    const actual=r.y===0?"Upstairs":"Downstairs";
    const predictName=predicted===0?"Upstairs":"Downstairs";
    get("sampleGroup").textContent=r.group==="development"?"Training trial":"Held-out diagnostic trial";
    get("sampleRaw").textContent=
      "Real Subject "+r.subject+", Trial "+r.trial+" · True motion: "+actual+
      " · Measured STD = "+F(r.x[0],5)+" g, PSD power = "+F(r.x[1],6)+
      " g² · Standardized x₁ = "+F(r.z[0])+", x₂ = "+F(r.z[1]);
    const scale=Math.max(.02,Math.abs(a),Math.abs(b),Math.abs(bias));
    fillBar("contrib1",a,scale);
    fillBar("contrib2",b,scale);
    fillBar("contrib3",bias,scale);
    get("term1").textContent=F(a);
    get("term2").textContent=F(b);
    get("term3").textContent=F(bias);
    get("scoreLine").textContent="Weighted score z = ("+F(a)+") + ("+F(b)+") + ("+F(bias)+") = "+F(score);
    get("probLine").textContent="Sigmoid probability p(Downstairs) = "+F(p,4)+" ("+F(100*p,1)+"%)";
    get("predictionLine").textContent="Predicted: "+predictName+
      " · True: "+actual+" · "+(predicted===r.y?"Correct at this step":"Incorrect at this step");
    get("sampleLossLine").textContent="This original trial's cross-entropy loss = "+F(loss,4)+
      " = "+(r.y===1?"−log(p)":"−log(1−p)");
    get("sampleInterpretation").textContent=
      "At step "+epoch+", this real "+actual+" trial has p(Downstairs) = "+
      F(p,3)+" and loss "+F(loss,3)+". "+
      (r.y===1?
        "For a true Downstairs motion, larger p produces smaller loss.":
        "For a true Upstairs motion, smaller p produces smaller loss.");
    drawSampleLoss(p,r.y,loss);
  }
  window.initTrialExplanation=initialize;
  window.renderTrialExplanation=update;
})();
