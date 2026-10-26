const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p = await b.newPage();
  const agg={}; for(let g=0;g<5;g++){ await p.goto('file:///home/claude/dials-v1/game.html');
  const r = await p.evaluate(async ()=>{
    world.food={}; for(const [cx,cy] of [[6,6],[21,8],[13,21]]){ let n=0; while(n<5){ const x=cx+rint(5)-2,y=cy+rint(5)-2; const k=key(x,y); if(x<0||y<0||x>=P.W||y>=P.H||world.food[k]) continue; world.food[k]=4+rnd()*6; n++; } }
    for(const a of world.agents) a.knownFood={}; me.isPlayer=false;
    const asksByCtx={}; const _open=world.openTrial.bind(world); world.openTrial=(a,b,k,c)=>{ if(k==="ask"&&c) asksByCtx[c]=(asksByCtx[c]||0)+1; _open(a,b,k,c); };
    let firstHalf={};
    for(let t=0;t<800;t++){ world.turnStep(null); if(t===399) firstHalf=JSON.parse(JSON.stringify(asksByCtx)); }
    const out={}; for(const a of world.agents){ const L=a.lessons.all||{}; for(const k in L){ if(!/^ask:|^hurt$|^give$/.test(k)) continue; out[k]=out[k]||{n:0,ok:0}; out[k].n+=L[k].n; out[k].ok+=L[k].ok; } }
    return {out,asksByCtx,firstHalf};
  });
  for(const k in r.out){ agg[k]=agg[k]||{n:0,ok:0}; agg[k].n+=r.out[k].n; agg[k].ok+=r.out[k].ok; }
  const line=Object.keys(r.asksByCtx).sort().map(k=>`${k} ${r.firstHalf[k]||0}→${r.asksByCtx[k]-(r.firstHalf[k]||0)}`).join("  "); console.log(`game ${g} asks (first half → second half): ${line}`); }
  console.log("learned success rates across all agents and games:"); for(const k in agg) console.log(`  ${k.padEnd(9)} trials ${String(agg[k].n).padStart(5)}  success ${(agg[k].ok/agg[k].n).toFixed(2)}`);
  await b.close();
})();
