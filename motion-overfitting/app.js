"use strict";
/* ME 3310 | Actual USC-HAD trial-level (not window-level) model comparison.
   4, 8, 12, 16 fixed first feature columns, train-only standardization.
   Fixed unregularized logistic regression full-batch GD: same process per model.
   No synthetic data, no shuffling of overlapping windows into evaluation. */
const $=id=>document.getElementById(id);
const COUNTS=[4,8,12,16],BLUE="#2776ac",ORANGE="#cc7540",PURPLE="#4f2683";
const st={rows:[],names:[],results:{},metric:"accuracy",evaluation:"loso",
          selected:8,highlightSubject:null,working:false};
const sigmoid=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
const ce=(z,y)=>Math.max(0,z)-y*z+Math.log1p(Math.exp(-Math.abs(z)));
const fmt=(x,d=2)=>Number.isFinite(x)?Number(x).toFixed(d):"—";
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length;}
function balancedAccuracy(records,pr){
 let sum=0;
 for(const y of [0,1]){
  const indices=records.flatMap((r,i)=>r.y===y?[i]:[]);
  if(!indices.length)throw Error("Fold lacks a true motion class.");
  sum+=indices.filter(i=>(pr[i]>=0.5?1:0)===y).length/indices.length;
 }
 return 50*sum;
}
function stats(records,w,mu,sigma,count){
 const probabilities=[],losses=[];
 for(const r of records){
  let z=w[count];
  for(let j=0;j<count;j++)z+=w[j]*(r.x[j]-mu[j])/sigma[j];
  probabilities.push(sigmoid(z));losses.push(ce(z,r.y));
 }
 return {loss:mean(losses),accuracy:balancedAccuracy(records,probabilities),
         pr:probabilities};
}
function fit(train,count){
 const n=train.length,mu=[],sd=[];
 for(let j=0;j<count;j++){
  const values=train.map(r=>r.x[j]),m=mean(values);
  const s=Math.sqrt(mean(values.map(v=>(v-m)**2)));
  if(!Number.isFinite(s)||s<=0)throw Error("Zero variance at feature "+(j+1));
  mu.push(m);sd.push(s);
 }
 const standardized=train.map(r=>r.x.slice(0,count).map((v,j)=>(v-mu[j])/sd[j]));
 const w=Array(count+1).fill(0),g=Array(count+1).fill(0);
 const rate=.18,iterations=900; // common, prespecified training schedule
 for(let step=0;step<iterations;step++){
  g.fill(0);
  for(let i=0;i<n;i++){
   const z=standardized[i],r=train[i];
   let raw=w[count];
   for(let j=0;j<count;j++)raw+=w[j]*z[j];
   const diff=sigmoid(raw)-r.y;
   for(let j=0;j<count;j++)g[j]+=diff*z[j];
   g[count]+=diff;
  }
  for(let j=0;j<=count;j++)w[j]-=(rate/n)*g[j];
 }
 return {w,mu,sd};
}
function perSubject(records,model,count){
 const tr={};
 for(const r of records)(tr[r.s]??=[]).push(r);
 return Object.entries(tr).sort((a,b)=>Number(a[0])-Number(b[0]))
  .map(([s,group])=>{
   const p=stats(group,model.w,model.mu,model.sd,count);
   const y0=group.filter(r=>r.y===0),y1=group.filter(r=>r.y===1);
   const indexes0=group.flatMap((r,i)=>r.y===0?[i]:[]);
   const indexes1=group.flatMap((r,i)=>r.y===1?[i]:[]);
   return {
    subject:Number(s),loss:p.loss,accuracy:p.accuracy,
    correct0:indexes0.filter(i=>p.pr[i]<0.5).length,
    correct1:indexes1.filter(i=>p.pr[i]>=0.5).length,
    n0:y0.length,n1:y1.length,n:group.length
   };
  });
}
function averageSummaries(arr){
 return {loss:mean(arr.map(x=>x.loss)),
         accuracy:mean(arr.map(x=>x.accuracy))};
}
function computeFeatureSet(count){
 const dev=st.rows.filter(r=>r.split==="development");
 const diag=st.rows.filter(r=>r.split==="diagnostic");
 const subjects=[...new Set(dev.map(r=>r.s))].sort((a,b)=>a-b);
 const folds=[];
 for(const subject of subjects){
  const training=dev.filter(r=>r.s!==subject);
  const testing=dev.filter(r=>r.s===subject);
  const model=fit(training,count);
  const trainStat=stats(training,model.w,model.mu,model.sd,count);
  const testStat=stats(testing,model.w,model.mu,model.sd,count);
  const subj=perSubject(testing,model,count)[0];
  folds.push({subject,train:trainStat,test:testStat,individual:subj});
 }
 const allDevModel=fit(dev,count);
 const devStat=stats(dev,allDevModel.w,allDevModel.mu,allDevModel.sd,count);
 const diagStat=stats(diag,allDevModel.w,allDevModel.mu,allDevModel.sd,count);
 return {
  loso:{
   train:averageSummaries(folds.map(f=>f.train)),
   test:averageSummaries(folds.map(f=>f.test)),
   subjects:folds.map(f=>f.individual)
  },
  diagnostic:{
   train:devStat,test:diagStat,
   subjects:perSubject(diag,allDevModel,count)
  }
 };
}
function validate(d){
 if(!d || !Array.isArray(d.rows)||d.rows.length!==140||
     !Array.isArray(d.featureNames)||d.featureNames.length!==16)
  throw Error("Expected real USC-HAD 140-trial, 16-feature export.");
 if(JSON.stringify(d.fixedFeatureSets)!==JSON.stringify(COUNTS))
  throw Error("Feature count metadata does not match the predeclared comparison.");
 const rows=d.rows.map(r=>({
  s:Number(r.subject),t:Number(r.trial),y:Number(r.classId),
  x:(Array.isArray(r.features)?r.features:[]).map(Number),
  split:String(r.split)
 }));
 if(rows.some(r=>r.x.length!==16||r.x.some(x=>!Number.isFinite(x))||
    !Number.isInteger(r.s)||!Number.isInteger(r.t)||![0,1].includes(r.y)||
    !["development","diagnostic"].includes(r.split)))
  throw Error("Original-trial feature records are invalid.");
 const identities=new Set(rows.map(r=>r.s+"/"+r.y+"/"+r.t));
 if(identities.size!==rows.length)throw Error("Duplicate original-trial identities.");
 const groups={};
 for(const r of rows){
  (groups[r.s]??={split:r.split,up:0,down:0});
  if(groups[r.s].split!==r.split)throw Error("Subject split leakage.");
  if(r.y===0)groups[r.s].up++;else groups[r.s].down++;
 }
 if(Object.keys(groups).length!==14 ||
    Object.values(groups).some(g=>g.up!==5||g.down!==5) ||
    Object.values(groups).filter(g=>g.split==="development").length!==10 ||
    Object.values(groups).filter(g=>g.split==="diagnostic").length!==4)
  throw Error("Invalid independent trial / class counts.");
 st.rows=rows;st.names=d.featureNames;
}
const defer=()=>new Promise(resolve=>setTimeout(resolve,0));
async function recompute(){
 if(st.working || !st.rows.length)return;
 st.working=true;
 $("status").textContent="Computing four real-data models across 10 held-out-subject folds…";
 $("recalculate").disabled=true;
 try{
  for(const n of COUNTS){
   st.results[n]=computeFeatureSet(n);
   $("status").textContent="Fitted "+n+"-feature model, including 10 subject-held-out folds…";
   await defer();
  }
  $("status").className="success";
  $("status").textContent="Ready: 140 real original USC-HAD trials · 10 development subjects / 4 previously inspected diagnostic subjects · 4 feature counts · 40 subject-held-out model fits.";
  $("evaluation").disabled=false;$("metric").disabled=false;
  for(const b of document.querySelectorAll("#modelButtons button"))b.disabled=false;
 }catch(e){
  $("status").className="error";
  $("status").textContent="Failed model computation: "+e.message;
 }finally{st.working=false;$("recalculate").disabled=false;}
 render();
}
function chartBase(canvas,xl,yl){
 const c=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
 c.clearRect(0,0,W,H);
 const p={l:65,r:18,t:26,b:57,W,H};
 const x2=W-p.r,y2=H-p.b;
 c.font="12px Arial";c.fillStyle="#607085";
 c.strokeStyle="#9babb9";c.lineWidth=1.4;
 c.beginPath();c.moveTo(p.l,p.t);c.lineTo(p.l,y2);c.lineTo(x2,y2);c.stroke();
 c.textAlign="center";c.fillText(xl,(p.l+x2)/2,H-14);
 c.save();c.translate(18,(p.t+y2)/2);c.rotate(-Math.PI/2);
 c.fillText(yl,0,0);c.restore();
 return {ctx:c,left:p.l,right:x2,top:p.t,bottom:y2};
}
function chartY(domain,b){
 const [lo,hi]=domain;
 return v=>b.bottom-(v-lo)/(hi-lo)*(b.bottom-b.top);
}
function chartX(xs,b){
 const left=b.left+42,right=b.right-42;
 return i=>left+i/(xs.length-1)*(right-left);
}
function renderComplexity(){
 const b=chartBase($("complexity"),"Number of measured features",
   st.metric==="accuracy"?"Balanced accuracy (%)":"Cross-entropy loss");
 if(!st.results[4])return;
 const mode=st.evaluation,key=st.metric;
 const tr=COUNTS.map(n=>st.results[n][mode].train[key]);
 const te=COUNTS.map(n=>st.results[n][mode].test[key]);
 let lo,hi;
 if(key==="accuracy"){lo=0;hi=100;}
 else {
  const values=[...tr,...te];lo=Math.max(0,Math.min(...values)-.06);
  hi=Math.max(...values)+.06;
 }
 const px=chartX(COUNTS,b),py=chartY([lo,hi],b),c=b.ctx;
 c.font="12px Arial";
 for(let k=0;k<=4;k++){
  const val=lo+(hi-lo)*k/4,y=py(val);
  c.strokeStyle="#e5eaf0";c.lineWidth=1;c.beginPath();c.moveTo(b.left,y);c.lineTo(b.right,y);c.stroke();
  c.textAlign="right";c.fillStyle="#596c80";c.fillText(fmt(val,key==="accuracy"?0:2),b.left-9,y+4);
 }
 COUNTS.forEach((n,i)=>{
  const x=px(i);c.textAlign="center";c.fillStyle="#55677e";
  c.fillText(String(n),x,b.bottom+20);
  if(n===st.selected){
   c.fillStyle="rgba(79,38,131,.065)";
   c.fillRect(x-28,b.top,56,b.bottom-b.top);
   c.setLineDash([3,5]);c.strokeStyle=PURPLE;
   c.beginPath();c.moveTo(x,b.top);c.lineTo(x,b.bottom);c.stroke();c.setLineDash([]);
  }
 });
 function line(data,color,filled){
  c.beginPath();c.strokeStyle=color;c.lineWidth=2.8;
  data.forEach((val,i)=>i===0?c.moveTo(px(i),py(val)):c.lineTo(px(i),py(val)));
  c.stroke();
  data.forEach((val,i)=>{
   c.beginPath();c.arc(px(i),py(val),i===COUNTS.indexOf(st.selected)?7:5,0,Math.PI*2);
   c.fillStyle=filled?color:"white";c.fill();
   c.lineWidth=2;c.strokeStyle=color;c.stroke();
  });
 }
 line(tr,BLUE,true);line(te,ORANGE,true);
}
function renderSubjects(){
 const b=chartBase($("subjects"),"Held-out subject ID",
   st.metric==="accuracy"?"Balanced accuracy (%)":"Cross-entropy loss");
 const model=st.results[st.selected]?.[st.evaluation];
 if(!model)return;
 const arr=model.subjects,key=st.metric;
 const vals=arr.map(a=>a[key]);
 let lo=0,hi=key==="accuracy"?100:Math.max(...vals)*1.15+.02;
 if(key==="loss")lo=Math.max(0,Math.min(...vals)-.12);
 const py=chartY([lo,hi],b),c=b.ctx,barW=(b.right-b.left-40)/arr.length;
 c.font="12px Arial";
 for(let i=0;i<=4;i++){
  const v=lo+(hi-lo)*i/4,y=py(v);
  c.beginPath();c.strokeStyle="#e5eaf0";c.moveTo(b.left,y);c.lineTo(b.right,y);c.stroke();
  c.fillStyle="#596c80";c.textAlign="right";c.fillText(fmt(v,key==="accuracy"?0:2),b.left-8,y+4);
 }
 arr.forEach((row,i)=>{
  const x=b.left+20+i*barW;
  const y=py(row[key]);
  c.fillStyle=row.subject===st.highlightSubject?PURPLE:(st.evaluation==="diagnostic"?"#cc7540":"#2776ac");
  c.fillRect(x+barW*.14,y,barW*.72,b.bottom-y);
  c.fillStyle="#586b80";c.textAlign="center";
  c.fillText(String(row.subject),x+barW/2,b.bottom+17);
 });
 const pick=arr.find(x=>x.subject===st.highlightSubject);
 $("subjectCaption").textContent=pick?
  "Subject "+pick.subject+" (excluded from this fitted classifier): "+
  fmt(pick.accuracy,0)+"% balanced accuracy; true Upstairs "+pick.correct0+"/"+pick.n0+
  " correctly predicted, true Downstairs "+pick.correct1+"/"+pick.n1+
  " correctly predicted; loss "+fmt(pick.loss,3)+
  ". Click another bar to examine a participant.":
  "Click a bar to inspect an individual held-out participant. Each has five Upstairs and five Downstairs original trials.";
}
function renderFeatures(){
 const ul=$("features");ul.replaceChildren();
 st.names.forEach((name,i)=>{
  const li=document.createElement("li");
  li.className=i<st.selected?"included":"extra";
  const tag=document.createElement("span");tag.className="index";tag.textContent=String(i+1).padStart(2,"0");
  li.append(tag,document.createTextNode(name));
  ul.append(li);
 });
}
function render(){
 if(!st.results[4])return;
 const m=st.results[st.selected][st.evaluation],key=st.metric;
 const format=x=>key==="accuracy"?fmt(x,1)+"%":fmt(x,3);
 const a=m.train[key],v=m.test[key],gap=v-a;
 $("numFeatures").textContent=String(st.selected);
 $("trainMetric").textContent=format(a);
 $("testMetric").textContent=format(v);
 $("gapMetric").textContent=(gap>0?"+":"")+format(gap);
 const validationLabel=st.evaluation==="loso"?"LOSO held-out person":"previously viewed diagnostic people";
 $("evaluationNote").textContent=st.evaluation==="loso"?
  "Ten leave-one-subject-out folds: each model trains on nine development subjects and evaluates on the excluded tenth; the training metric is averaged across the same folds. Standardization is refit within each fold. Four previously inspected diagnostic subjects are unused in this display.":
  "One classifier per feature count fits all 10 development subjects, then evaluates four participants previously inspected during course development. This is diagnostic, NOT an untouched final test.";
 $("interpretation").textContent=key==="accuracy"?
  "For "+st.selected+" features, the model averages "+format(a)+" on training folds and "+
  format(v)+" on "+validationLabel+". "+
  (gap<0?"The held-out performance is lower by "+fmt(-gap,1)+" percentage points. This is a generalization gap, not proof of overfitting.":
  gap>0?"Held-out subjects scored higher than training folds. An easier held-out group is possible; this is not a contradiction or proof of superior generalization.":
  "Both scores are equal in this run.")+
  " Compare all four models and ask whether added features improve scores outside the training data.":
  "For "+st.selected+" features, mean training cross-entropy is "+format(a)+
  " and "+validationLabel+" cross-entropy is "+format(v)+". "+
  (gap>0?"The held-out loss is higher. The size and trend of this gap can raise a possible generalization concern.":
  "The held-out loss is lower. This is possible when excluded participants happen to be easier to classify.")+
  " Lower loss is better; this loss is evaluated on original trials, not overlapping windows.";
 document.querySelectorAll("#modelButtons button").forEach(b=>{
  const selected=Number(b.dataset.n)===st.selected;
  b.classList.toggle("active",selected);b.setAttribute("aria-pressed",String(selected));
 });
 renderComplexity();renderSubjects();renderFeatures();
}
$("evaluation").addEventListener("change",e=>{st.evaluation=e.target.value;st.highlightSubject=null;render();});
$("metric").addEventListener("change",e=>{st.metric=e.target.value;render();});
$("recalculate").addEventListener("click",recompute);
document.querySelectorAll("#modelButtons button").forEach(b=>b.addEventListener("click",()=>{
 st.selected=Number(b.dataset.n);st.highlightSubject=null;render();
}));
$("complexity").addEventListener("click",e=>{
 if(!st.results[4])return;
 const canvas=e.currentTarget,rect=canvas.getBoundingClientRect(),
 x=(e.clientX-rect.left)*canvas.width/rect.width;
 const left=65+42,right=canvas.width-18-42;
 const idx=Math.round((x-left)/(right-left)*(COUNTS.length-1));
 if(idx>=0&&idx<COUNTS.length){st.selected=COUNTS[idx];st.highlightSubject=null;render();}
});
$("subjects").addEventListener("click",e=>{
 if(!st.results[4])return;
 const ar=st.results[st.selected][st.evaluation].subjects;
 const c=e.currentTarget,rect=c.getBoundingClientRect(),
 x=(e.clientX-rect.left)*c.width/rect.width;
 const i=Math.floor((x-65-20)/( (c.width-18-65-40)/ar.length ));
 if(ar[i]){st.highlightSubject=ar[i].subject;render();}
});
fetch("./data/usc_had_16_features.json",{cache:"no-cache"})
 .then(r=>{if(!r.ok)throw Error("Real-feature JSON not published (HTTP "+r.status+")");return r.json();})
 .then(async d=>{validate(d);await recompute();})
 .catch(e=>{
  $("status").className="error";
  $("status").textContent="Verified real data unavailable: "+e.message+
    ". There is no synthetic-data fallback. Check the GitHub data-export workflow.";
 });
