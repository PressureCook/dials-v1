const { chromium } = require('playwright');
const H=+(process.argv[2]||10); const GAMES=+(process.argv[3]||5); const TR=process.argv[4]!=="hand";
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  const results=[]; for(let g=0;g<GAMES;g++){ await p.goto('file:///home/claude/dials-v1/game.html');
  const r = await p.evaluate(async ([H,TR])=>{
    P.social_horizon=H; P.tabula_rasa=TR;
    world.food={}; for(const [cx,cy] of [[6,6],[21,8],[13,21]]){ let n=0; while(n<5){ const x=cx+rint(5)-2,y=cy+rint(5)-2; const k=key(x,y); if(x<0||y<0||x>=P.W||y>=P.H||world.food[k]) continue; world.food[k]=4+rnd()*6; n++; } }
    for(const a of world.agents) a.knownFood={};
    me.isPlayer=false; me.reward=1.0; me.fear=0.1; me.guilt=0.2;
    for(let t=0;t<800;t++) world.turnStep(null);
    const score={}; const S=id=>score[id]||(score[id]={tribute:0,enforced:0,pooled:0,subjects:new Set()});
    for(const e of world.events){ let m;
      if(m=e.s.match(/^(?:A(\d+)|you) gave [\d.]+ to (?:A(\d+)|you)$/)){ const from=m[1]!==undefined?+m[1]:0, to=m[2]!==undefined?+m[2]:0; S(to).tribute++; S(to).subjects.add(from); }
      if(m=e.s.match(/hurt (?:A\d+|you) at (?:A(\d+)|you)'s request/)) S(m[1]!==undefined?+m[1]:0).enforced++;
      if(m=e.s.match(/stashed here for (?:A(\d+)|you)/)) S(m[1]!==undefined?+m[1]:0).pooled++; }
    const sends=world.events.filter(e=>/will go to/.test(e.s)).length; const gifts=world.events.filter(e=>/ gave /.test(e.s)).length, hurts=world.events.filter(e=>/ hurt A/.test(e.s)).length, thefts=world.events.filter(e=>/ took /.test(e.s)).length;
    const eff={}; for(const a of world.agents) for(const k in a.effects){ const L=a.effects[k]; eff[k]=eff[k]||{n:0,gain:0,loss:0,harm:0}; eff[k].n+=L.n; eff[k].gain+=L.gain; eff[k].loss+=L.loss; eff[k].harm+=L.harm; }
    const effTop=Object.entries(eff).filter(([k,v])=>v.n>=30).map(([k,v])=>[k,v.n,+(v.gain/v.n).toFixed(1),+(v.loss/v.n).toFixed(1),+(v.harm/v.n).toFixed(1)]).sort((x,y)=>y[1]-x[1]).slice(0,14);
    const rows=world.agents.map(a=>{ const s=S(a.id); return {id:a.id,r:a.reward,f:a.fear,g:a.guilt,alive:a.alive,tribute:s.tribute,subjects:s.subjects.size,enforced:s.enforced,pooled:s.pooled,lead:s.subjects.size*5+s.tribute+2*s.enforced+2*s.pooled}; });
    rows.sort((x,y)=>y.lead-x.lead);
    return {alive:world.agents.filter(a=>a.alive).length,gifts,hurts,thefts,sends,effTop,meRank:rows.findIndex(x=>x.id===0)+1,top:rows.slice(0,3),med:rows[Math.floor(rows.length/2)]};
  }, [H,TR]);
  results.push(r); }
  console.log("social_horizon",H,"tabula_rasa",TR); if(TR){ console.log("learned (last game, situations with 30+ trials): situation, trials, gain, loss, harm"); for(const e of results[results.length-1].effTop) console.log("  "+e.join("  ")); } for(const r of results){ const f=t=>`A${t.id}(r${t.r} f${t.f} g${t.g})${t.alive?"":"†"} subj${t.subjects} trib${t.tribute} enf${t.enforced} pool${t.pooled}`; console.log(JSON.stringify({alive:r.alive,gifts:r.gifts,hurts:r.hurts,thefts:r.thefts,sends:r.sends,meRank:r.meRank,top:r.top.map(f)})); }
  console.log(errs); await b.close();
})();
