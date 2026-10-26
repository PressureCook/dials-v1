const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p = await b.newPage();
  let tot={n:0,felt:0,toldOnly:0,neither:0,teach:0,hitsByToldOnly:0,hitsByNeither:0,lifeToldOnly:0,lifeNeither:0}; for(let g=0;g<4;g++){ await p.goto('file:///home/claude/dials-v1/game.html');
  const r = await p.evaluate(async ()=>{ P.tabula_rasa=true;
    world.food={}; for(const [cx,cy] of [[6,6],[21,8],[13,21]]){ let n=0; while(n<5){ const x=cx+rint(5)-2,y=cy+rint(5)-2; const k=key(x,y); if(x<0||y<0||x>=P.W||y>=P.H||world.food[k]) continue; world.food[k]=4+rnd()*6; n++; } }
    for(const a of world.agents) a.knownFood={}; me.isPlayer=false;
    const hits={}; const _exec=world.execute.bind(world); world.execute=function(a,act){ if(act[0]==="hurt") hits[a.id]=(hits[a.id]||0)+1; return _exec(a,act); };
    for(let t=0;t<800;t++) world.turnStep(null);
    const teach=world.events.filter(e=>/wrongs|is bad/.test(e.s)).length;
    return {teach,agents:world.agents.map(a=>({felt:!!(a.felt.hurt&&a.felt.hurt.n),told:!!(a.told.hurt&&a.told.hurt.w),hits:hits[a.id]||0,life:a.died>0?a.died:800}))};
  });
  tot.teach+=r.teach; for(const a of r.agents){ tot.n++; if(a.felt) tot.felt++; else if(a.told){ tot.toldOnly++; tot.hitsByToldOnly+=a.hits; tot.lifeToldOnly+=a.life; } else { tot.neither++; tot.hitsByNeither+=a.hits; tot.lifeNeither+=a.life; } } }
  console.log(`teaching sentences said: ${tot.teach} over 4 games`);
  console.log(`agents ${tot.n}: felt being hurt ${tot.felt}, only told ${tot.toldOnly}, neither ${tot.neither}`);
  console.log(`hits dealt per 100 turns: told-only ${(100*tot.hitsByToldOnly/Math.max(1,tot.lifeToldOnly)).toFixed(2)}  neither ${(100*tot.hitsByNeither/Math.max(1,tot.lifeNeither)).toFixed(2)}`);
  await b.close();
})();
