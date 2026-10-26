const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p = await b.newPage();
  const rows=[]; for(let g=0;g<14;g++){ await p.goto('file:///home/claude/dials-v1/game.html');
  const r = await p.evaluate(async ()=>{
    world.food={}; for(const [cx,cy] of [[6,6],[21,8],[13,21]]){ let n=0; while(n<5){ const x=cx+rint(5)-2,y=cy+rint(5)-2; const k=key(x,y); if(x<0||y<0||x>=P.W||y>=P.H||world.food[k]) continue; world.food[k]=4+rnd()*6; n++; } }
    for(const a of world.agents) a.knownFood={}; me.isPlayer=false;
    for(let t=0;t<800;t++) world.turnStep(null);
    const S={}; const g=id=>S[id]||(S[id]={trib:0,enf:0,subj:new Set(),asked:0,hitsGiven:0});
    for(const e of world.events){ let m;
      if(m=e.s.match(/^(?:A(\d+)|you) gave [\d.]+ to (?:A(\d+)|you)$/)){ const f=m[1]!==undefined?+m[1]:0,t=m[2]!==undefined?+m[2]:0; g(t).trib++; g(t).subj.add(f); }
      if(m=e.s.match(/hurt (?:A\d+|you) at (?:A(\d+)|you)'s request/)) g(m[1]!==undefined?+m[1]:0).enf++;
      if(m=e.s.match(/^(?:A(\d+)|you) hurt (?:A\d+|you)$/)) g(m[1]!==undefined?+m[1]:0).hitsGiven++; }
    return world.agents.map(a=>({r:a.reward,f:a.fear,gu:a.guilt,alive:a.alive?1:0,died:a.died>0?a.died:800,subj:g(a.id).subj.size,trib:g(a.id).trib,enf:g(a.id).enf,hits:g(a.id).hitsGiven,lead:g(a.id).subj.size*5+g(a.id).trib+2*g(a.id).enf}));
  }); rows.push(...r); }
  const cor=(x,y)=>{ const n=x.length,mx=x.reduce((a,b)=>a+b)/n,my=y.reduce((a,b)=>a+b)/n; const sx=Math.sqrt(x.reduce((a,v)=>a+(v-mx)**2,0)),sy=Math.sqrt(y.reduce((a,v)=>a+(v-my)**2,0)); return sx&&sy?x.reduce((a,v,i)=>a+(v-mx)*(y[i]-my),0)/(sx*sy):0; };
  const cols=["lead","subj","trib","enf","hits","alive","died"]; console.log(rows.length+" agents over 14 games. correlation of dial with:"); console.log("        "+cols.map(c=>c.padStart(7)).join(""));
  for(const d of ["r","f","gu"]) console.log(d.padEnd(8)+cols.map(c=>cor(rows.map(q=>q[d]),rows.map(q=>q[c])).toFixed(2).padStart(7)).join(""));
  // leaders only: top 10% by lead
  const top=[...rows].sort((a,b)=>b.lead-a.lead).slice(0,Math.round(rows.length*0.1)); const mean=(arr,k)=>(arr.reduce((a,q)=>a+q[k],0)/arr.length).toFixed(2);
  console.log(`top 10% leaders (n=${top.length}): mean reward ${mean(top,"r")} fear ${mean(top,"f")} guilt ${mean(top,"gu")} | all: reward ${mean(rows,"r")} fear ${mean(rows,"f")} guilt ${mean(rows,"gu")}`);
  const alive=rows.filter(q=>q.alive); console.log(`survivors (n=${alive.length}): mean fear ${mean(alive,"f")}; leaders who died: ${top.filter(q=>!q.alive).length}/${top.length}`);
  await b.close();
})();
