const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  const results=[]; for(let g=0;g<5;g++){ await p.goto('file:///home/claude/dials-v1/game.html');
  const r = await p.evaluate(async ()=>{
    P.tabula_rasa=true; world.food={}; for(const [cx,cy] of [[6,6],[21,8],[13,21]]){ let n=0; while(n<5){ const x=cx+rint(5)-2,y=cy+rint(5)-2; const k=key(x,y); if(x<0||y<0||x>=P.W||y>=P.H||world.food[k]) continue; world.food[k]=4+rnd()*6; n++; } }
    for(const a of world.agents) a.knownFood={};
    const diary=[]; const note=s=>diary.push(`t${world.turn} ${s}`);
    const say=(b,s)=>turn(["say",0,P.act_cost*0.2,0,0,{b,s}]); const give=(b,amt)=>turn(["give",0,P.act_cost,0,0,{b,amt}]);
    const hurt=b=>turn(["hurt",0,P.hurt_cost,0,0,{b}]); const move=(dx,dy)=>turn(["move",0,P.act_cost,0,0,{dx,dy}]);
    const eat=()=>turn(["eat",0,P.act_cost*0.3,0,0,Math.min(me.carried,100-me.energy)]); const stash=()=>turn(["stash",0,P.act_cost*0.5,0,0,null]);
    const wait=()=>turn(["idle",0,0,0,0,null]); const V=()=>world.view(me); const R=P.view_range;
    let home=null, heading={dx:1,dy:0}, headT=0; const marks={}; const M=id=>marks[id]||(marks[id]={thief:0,broke:0,hits:0,given:0,ally:0});
    let evIdx=0; const feedAll=()=>world.events.filter(e=>dist(me.x,me.y,e.x,e.y)<=R||/\byou\b/.test(e.s));
    function readFeed(){ const evs=feedAll(); for(;evIdx<evs.length;evIdx++){ const e=evs[evIdx]; let m;
      if(m=e.s.match(/^A(\d+) took .* from you|^A(\d+) dug up .* of you's/)) M(+(m[1]||m[2])).thief++;
      if(m=e.s.match(/^A(\d+) broke a promise to you/)) M(+m[1]).broke++;
      if(m=e.s.match(/^A(\d+) hurt you/)) M(+m[1]).thief+=2;
      if(m=e.s.match(/^A(\d+) gave .* to you|^A(\d+) kept a promise to you/)) M(+(m[1]||m[2])).ally++;
      if(m=e.s.match(/^A(\d+) hurt A\d+ at you's request/)) M(+m[1]).ally+=2; } }
    function edgeDirs(){ const v=V(); const has=(dx,dy)=>!!v.tiles[key(me.x+dx,me.y+dy)]; return {left:!has(-R,0),right:!has(R,0),up:!has(0,-R),down:!has(0,R)}; }
    function roamStep(){ const e=edgeDirs(); if(headT<=0||(heading.dx>0&&e.right)||(heading.dx<0&&e.left)||(heading.dy>0&&e.down)||(heading.dy<0&&e.up)){ const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].filter(([dx,dy])=>!((dx>0&&e.right)||(dx<0&&e.left)||(dy>0&&e.down)||(dy<0&&e.up))); const d=dirs[Math.floor(rnd()*dirs.length)]; heading={dx:d[0],dy:d[1]}; headT=10; } headT--; move(heading.dx,heading.dy); }
    function foodTiles(){ const v=V(); return Object.values(v.tiles).filter(t=>t.food>0.8); }
    function nearestFood(){ let best=null; for(const t of foodTiles()){ const d=dist(me.x,me.y,t.x,t.y); if(!best||d<best.d||(d===best.d&&t.food>best.f)) best={x:t.x,y:t.y,d,f:t.food}; } return best; }
    const stepTo=(x,y)=>move(Math.sign(x-me.x),Math.sign(y-me.y));
    const isThief=a=>(M(a.id).thief>0||M(a.id).broke>0)&&!M(a.id).hired, isAlly=a=>M(a.id).ally>0||M(a.id).hired;
    const inTerritory=(x,y)=>home&&dist(x,y,home.x,home.y)<=3;
    const told={}; let lastSeenIn={};
    for(let t=0;t<800&&me.alive;t++){
      readFeed(); world.perceive(me); const v=V(); const adj=v.agents.filter(a=>dist(me.x,me.y,a.x,a.y)<=1);
      const stashHere=(world.stash[key(me.x,me.y)]||{})[me.id]||0;
      if(me.energy<35&&me.carried>0){ eat(); continue; }
      if(me.energy<30&&home){ if(me.x===home.x&&me.y===home.y){ const st=world.stash[key(home.x,home.y)]||{}; const pooled=Object.keys(st).find(id=>+id!==me.id&&st[id]>0.5&&(world.agents[+id].permitted[me.id]||0)>=world.turn); if(stashHere>0) turn(["unstash",0,P.act_cost*0.5,0,0,null]); else if(pooled) turn(["raid",0,P.act_cost,0,0,{owner:+pooled}]); else { const f=nearestFood(); f?stepTo(f.x,f.y):roamStep(); } } else stepTo(home.x,home.y); continue; }
      // territory: settle where food is dense
      if(!home&&foodTiles().length>=3&&me.carried>=4){ home={x:me.x,y:me.y}; note(`settled at a spot with ${foodTiles().length} food tiles in view`); }
      // law enforcement: trespassers (non allies seen inside the territory carrying food they picked up here) and thieves
      const trespasser=v.agents.find(a=>!isAlly(a)&&inTerritory(a.x,a.y)&&a.carried>1&&home);
      const mark=adj.find(a=>(isThief(a)&&M(a.id).given===0)||(trespasser===a&&M(a.id).warned&&world.turn-M(a.id).warned>3&&!isAlly(a)));
      if(mark&&me.energy>30){ const m=M(mark.id); if(m.hits<2&&mark.energy>25){ hurt(mark); m.hits++; if(m.hits===1) note(`hit A${mark.id} (${isThief(mark)?"thief":"trespasser"})`); continue; } if(me.carried>=2&&!m.hired){ give(mark,2); m.given=1; m.hired=1; m.giftT=world.turn; note(`hired A${mark.id}`); continue; } }
      // tribute and warning to anyone in the territory
      const sub=v.agents.find(a=>home&&inTerritory(a.x,a.y)&&!isAlly(a)&&!(M(a.id).warned&&world.turn-M(a.id).warned<40));
      if(sub){ say(sub,{who:"you",time:"will",act:"give",amt:2,whom:"me"}); say(sub,{who:"me",time:"will",act:"hurt",amt:0,whom:"you",cond:{who:"you",time:"will",act:"give",amt:2,whom:"me",neg:true}}); M(sub.id).warned=world.turn; note(`told A${sub.id}: pay 2 or be hurt`); continue; }
      // promises and offers
      const owe=me.promOut.find(pr=>adj.some(a=>a.id===pr.target)); if(owe&&me.carried>=owe.amount){ give(adj.find(a=>a.id===owe.target),owe.amount); continue; }
      const off=me.offersIn.find(o=>o.give>0&&o.give>=(o.want.amt||1)); const offA=off&&adj.find(a=>a.id===off.from); if(offA&&me.carried>=(off.want.amt||1)){ give(offA,off.want.amt||1); continue; }
      // enlist allies against a thief or trespasser they can reach
      let enemy=null, ally=null; for(const al of v.agents.filter(a=>isAlly(a))){ const th=v.agents.find(t=>t!==al&&(isThief(t)||(trespasser===t))&&dist(al.x,al.y,t.x,t.y)<=2); if(th&&!(told["r"+al.id]&&world.turn-told["r"+al.id]<4)){ ally=al; enemy=th; break; } }
      // send: an ally in view, a thief in view but not near the ally → "go to thief"
      const farAlly=v.agents.find(a=>isAlly(a)&&!(told["g"+a.id]&&world.turn-told["g"+a.id]<12)); const farThief=farAlly?v.agents.find(t=>t!==farAlly&&(isThief(t)||trespasser===t)&&dist(farAlly.x,farAlly.y,t.x,t.y)>2):null;
      if(farAlly&&farThief&&!ally){ say(farAlly,{who:"you",time:"will",act:"go",amt:0,whom:farThief.id}); told["g"+farAlly.id]=world.turn; note(`sent A${farAlly.id} to A${farThief.id}`); continue; }
      if(ally&&enemy){ if(!told["w"+ally.id]){ say(ally,{who:"me",time:"will",act:"hurt",amt:0,whom:"you",cond:{who:"you",time:"will",act:"hurt",amt:0,whom:enemy.id,neg:true}}); told["w"+ally.id]=world.turn; continue; } say(ally,{who:"you",time:"will",act:"hurt",amt:0,whom:enemy.id}); told["r"+ally.id]=world.turn; note(`asked A${ally.id} to hurt A${enemy.id}`); continue; }
      // pooling: allies carrying food are asked to stash at home
      const pooler=v.agents.find(a=>isAlly(a)&&a.carried>=3&&home&&!(told["p"+a.id]&&world.turn-told["p"+a.id]<25));
      if(pooler){ say(pooler,{who:"you",time:"will",act:"stash",amt:4,whom:"me",place:home}); told["p"+pooler.id]=world.turn; note(`asked A${pooler.id} to stash at home`); continue; }
      // recruit the decent
      const cand=adj.find(a=>!isThief(a)&&!isAlly(a)&&M(a.id).given===0&&me.carried>=3&&me.energy>45);
      if(cand){ give(cand,2); M(cand.id).given=1; M(cand.id).giftT=world.turn; note(`gift to A${cand.id}`); continue; }
      const cand2=adj.find(a=>!isThief(a)&&M(a.id).given===1&&world.turn-M(a.id).giftT>3&&me.carried>=2);
      if(cand2){ say(cand2,{who:"me",time:"will",act:"give",amt:2,whom:"you",cond:{who:"you",time:"will",act:"give",amt:1,whom:"me"}}); M(cand2.id).given=2; continue; }
      // economy inside the territory: bank at home when full, forage nearby, patrol otherwise
      if(me.carried>=P.carry_cap-0.5&&home){ if(me.x===home.x&&me.y===home.y){ if(v.agents.some(a=>!isAlly(a))){ me.energy<85?eat():wait(); continue; } stash(); continue; } stepTo(home.x,home.y); continue; }
      const f=nearestFood(); if(f&&(!home||inTerritory(f.x,f.y)||me.carried<2)){ f.d===0?wait():stepTo(f.x,f.y); continue; }
      if(me.energy<70&&me.carried>0){ eat(); continue; }
      if(home){ if(dist(me.x,me.y,home.x,home.y)>2) stepTo(home.x,home.y); else { const a=v.agents.find(x=>!isAlly(x)&&inTerritory(x.x,x.y)); a?stepTo(a.x,a.y):move(rnd()<0.5?1:-1,rnd()<0.5?1:-1); } continue; }
      roamStep();
    }

    const score={}; const S=id=>score[id]||(score[id]={tribute:0,enforced:0,pooled:0,subjects:new Set()});
    for(const e of world.events){ let m;
      if(m=e.s.match(/^(?:A(\d+)|you) gave [\d.]+ to (?:A(\d+)|you)$/)){ const from=m[1]!==undefined?+m[1]:0, to=m[2]!==undefined?+m[2]:0; S(to).tribute++; S(to).subjects.add(from); }
      if(m=e.s.match(/hurt (?:A\d+|you) at (?:A(\d+)|you)'s request/)) S(m[1]!==undefined?+m[1]:0).enforced++;
      if(m=e.s.match(/stashed here for (?:A(\d+)|you)/)) S(m[1]!==undefined?+m[1]:0).pooled++; }
    const rows=world.agents.map(a=>{ const s=S(a.id); const stash=Object.values(world.stash).reduce((x,o)=>x+(o[a.id]||0),0); return {id:a.id,r:a.reward,f:a.fear,g:a.guilt,alive:a.alive,tribute:s.tribute,subjects:s.subjects.size,enforced:s.enforced,pooled:s.pooled,stash:Math.round(stash),lead:s.subjects.size*5+s.tribute+2*s.enforced+2*s.pooled}; });
    rows.sort((x,y)=>y.lead-x.lead);
    return {alive:world.agents.filter(a=>a.alive).length, me:rows.find(x=>x.id===0), rank:rows.findIndex(x=>x.id===0)+1, top:rows.slice(0,3), sends:diary.filter(d=>/sent/.test(d)).length, diary:diary.slice(0,6)};
  });
  results.push(r); }
  for(const r of results){ const f=t=>`${t.id===0?"ME":"A"+t.id+"(r"+t.r+" f"+t.f+" g"+t.g+")"}${t.alive?"":"†"} subj${t.subjects} trib${t.tribute} enf${t.enforced} pool${t.pooled} stash${t.stash}`; console.log(JSON.stringify({alive:r.alive,myRank:r.rank,mySends:r.sends,me:f(r.me),top:r.top.map(f)})); }
  console.log(errs); await b.close();
})();
