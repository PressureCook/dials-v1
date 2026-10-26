const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p = await b.newPage();
  const rows=[]; for(let g=0;g<4;g++){ await p.goto('file:///home/claude/dials-v1/game.html');
  const r = await p.evaluate(async ()=>{ P.tabula_rasa=true;
    world.food={}; for(const [cx,cy] of [[6,6],[21,8],[13,21]]){ let n=0; while(n<5){ const x=cx+rint(5)-2,y=cy+rint(5)-2; const k=key(x,y); if(x<0||y<0||x>=P.W||y>=P.H||world.food[k]) continue; world.food[k]=4+rnd()*6; n++; } }
    for(const a of world.agents) a.knownFood={}; me.isPlayer=false;
    const firstHurt={}, hitsBefore={}, hitsAfter={}; const _exec=world.execute.bind(world);
    world.execute=function(a,act){ const r=_exec(a,act); if(act[0]==="hurt"){ if(firstHurt[a.id]===undefined) hitsBefore[a.id]=(hitsBefore[a.id]||0)+1; else hitsAfter[a.id]=(hitsAfter[a.id]||0)+1; } return r; };
    const _feel=world.feel.bind(world); world.feel=(a,k,amt)=>{ if(k==="hurt"&&firstHurt[a.id]===undefined) firstHurt[a.id]=world.turn; _feel(a,k,amt); };
    for(let t=0;t<800;t++) world.turnStep(null);
    return world.agents.map(a=>({g:a.guilt,alive:a.alive,hurtAt:firstHurt[a.id]??null,before:hitsBefore[a.id]||0,after:hitsAfter[a.id]||0,lifeAfter:firstHurt[a.id]!==undefined?((a.died>0?a.died:800)-firstHurt[a.id]):0,lifeBefore:firstHurt[a.id]!==undefined?firstHurt[a.id]:(a.died>0?a.died:800)}));
  }); rows.push(...r); }
  const hi=rows.filter(q=>q.g>=0.6), lo=rows.filter(q=>q.g<=0.3);
  const rate=(arr,k,life)=>{ const h=arr.reduce((s,q)=>s+q[k],0), L=arr.reduce((s,q)=>s+q[life],0); return L?(100*h/L).toFixed(2):"-"; };
  console.log(`agents ${rows.length}; ever hurt: ${rows.filter(q=>q.hurtAt!==null).length}`);
  console.log(`hits dealt per 100 turns  | before first being hurt | after`);
  console.log(`high guilt (>=0.6, n=${hi.length})     | ${rate(hi,"before","lifeBefore")} | ${rate(hi,"after","lifeAfter")}`);
  console.log(`low guilt  (<=0.3, n=${lo.length})     | ${rate(lo,"before","lifeBefore")} | ${rate(lo,"after","lifeAfter")}`);
  console.log(`alive: ${rows.filter(q=>q.alive).length}`);
  await b.close();
})();
