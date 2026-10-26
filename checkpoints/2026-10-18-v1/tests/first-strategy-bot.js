const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p = await b.newPage({viewport:{width:1150,height:700}});
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  const results=[]; for(let g=0;g<6;g++){ await p.goto('file:///home/claude/dials-v1/game.html');
  const result = await p.evaluate(async ()=>{
    const diary=[]; const say=(b,s)=>turn(["say",0,P.act_cost*0.2,0,0,{b,s}]);
    const give=(b,amt)=>turn(["give",0,P.act_cost,0,0,{b,amt}]);
    const hurt=b=>turn(["hurt",0,P.hurt_cost,0,0,{b}]);
    const move=(dx,dy)=>turn(["move",0,P.act_cost,0,0,{dx,dy}]);
    const eat=()=>turn(["eat",0,P.act_cost*0.3,0,0,Math.min(me.carried,100-me.energy)]);
    const stash=()=>turn(["stash",0,P.act_cost*0.5,0,0,null]);
    const wait=()=>turn(["idle",0,0,0,0,null]);
    const V=()=>world.view(me);
    const R=P.view_range;
    // what I know, first person only
    let corner=null; const friends={}; const enemies={}; const promisedTo={}; let lastSaidTo={};
    const seenEvents=()=>world.events.filter(e=>dist(me.x,me.y,e.x,e.y)<=R||/\byou\b/.test(e.s));
    let evIdx=0;
    function readFeed(){ const evs=seenEvents(); for(;evIdx<evs.length;evIdx++){ const e=evs[evIdx];
      let m=e.s.match(/^A(\d+) took .* from you|^A(\d+) dug up .* of you's/); if(m){ const id=+(m[1]||m[2]); enemies[id]=(enemies[id]||0)+1; }
      m=e.s.match(/^A(\d+) hurt you/); if(m){ enemies[+m[1]]=(enemies[+m[1]]||0)+2; }
      m=e.s.match(/^A(\d+) gave .* to you/); if(m){ friends[+m[1]]=(friends[+m[1]]||0)+1; }
      m=e.s.match(/^A(\d+) kept a promise to you/); if(m){ friends[+m[1]]=(friends[+m[1]]||0)+1; }
      m=e.s.match(/^A(\d+) broke a promise to you/); if(m){ friends[+m[1]]=(friends[+m[1]]||0)-1; } } }
    function note(s){ diary.push(`t${world.turn} ${s}`); }
    function edgeDirs(){ const v=V(); const has=(dx,dy)=>!!v.tiles[key(me.x+dx,me.y+dy)]; return {left:!has(-R,0),right:!has(R,0),up:!has(0,-R),down:!has(0,R)}; }
    function nearestFood(){ const v=V(); let best=null; for(const k in v.tiles){ const t=v.tiles[k]; if(t.food>0.8){ const d=dist(me.x,me.y,t.x,t.y); if(!best||d<best.d||(d===best.d&&t.food>best.f)) best={x:t.x,y:t.y,d,f:t.food}; } } return best; }
    function stepTo(x,y){ move(Math.sign(x-me.x),Math.sign(y-me.y)); }
    let phase="forage"; let tribute={}; let heading={dx:1,dy:0}, headT=0;
    function roamStep(){ const e=edgeDirs(); if(headT<=0||(heading.dx>0&&e.right)||(heading.dx<0&&e.left)||(heading.dy>0&&e.down)||(heading.dy<0&&e.up)){ const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].filter(([dx,dy])=>!((dx>0&&e.right)||(dx<0&&e.left)||(dy>0&&e.down)||(dy<0&&e.up))); const d=dirs[Math.floor(rnd()*dirs.length)]; heading={dx:d[0],dy:d[1]}; headT=8; } headT--; move(heading.dx,heading.dy); }
    for(let t=0;t<600&&me.alive;t++){
      readFeed(); world.perceive(me);
      const v=V(); const adj=v.agents.filter(a=>dist(me.x,me.y,a.x,a.y)<=1);
      const stashHere=(world.stash[key(me.x,me.y)]||{})[me.id]||0;
      // 0. survival first
      if(me.energy<35&&me.carried>0){ eat(); continue; }
      if(me.energy<30&&stashHere>0){ turn(["unstash",0,P.act_cost*0.5,0,0,null]); note("dug up my stash to eat"); continue; }
      // 1. thieves adjacent get hit once they have robbed me twice; once I have friends in view, hit on first offence
      const thief=adj.find(a=>(enemies[a.id]||0)>=(Object.keys(friends).length?1:2));
      if(thief&&me.energy>30){ hurt(thief); if(!lastSaidTo["h"+thief.id]){ note(`hit A${thief.id} (robbed me ${enemies[thief.id]}x)`); lastSaidTo["h"+thief.id]=1; } continue; }
      // 2. offers to me: accept if the offer is good
      const off=me.offersIn.find(o=>o.give>0&&o.give>=(o.want.amt||1)); const offA=off&&adj.find(a=>a.id===off.from);
      if(offA&&me.carried>=(off.want.amt||1)){ give(offA,off.want.amt||1); note(`accepted A${offA.id}'s offer (${off.give} for ${off.want.amt})`); continue; }
      // 3. befriend: anyone adjacent, not an enemy, gets a gift + a promise once, later an offer
      const cand=adj.find(a=>!enemies[a.id]&&!promisedTo[a.id]&&me.carried>=3&&me.energy>50);
      if(cand){ give(cand,2); promisedTo[cand.id]=world.turn; note(`gave 2 to A${cand.id} to make a friend`); continue; }
      const cand2=adj.find(a=>!enemies[a.id]&&promisedTo[a.id]&&world.turn-promisedTo[a.id]>2&&!lastSaidTo["o"+a.id]&&me.carried>=2);
      if(cand2){ say(cand2,{who:"me",time:"will",act:"give",amt:2,whom:"you",cond:{who:"you",time:"will",act:"give",amt:1,whom:"me"}}); lastSaidTo["o"+cand2.id]=world.turn; note(`offered A${cand2.id} 2 for 1`); continue; }
      // 4. once I have 2+ friends: take over. demand tribute from non friends in view, threaten, and have the feed show who complies
      const nFriends=Object.values(friends).filter(x=>x>0).length;
      if(nFriends>=2&&phase!=="rule"){ phase="rule"; note(`entering rule phase with friends ${JSON.stringify(friends)}`); }
      if(phase==="rule"){ const subj=v.agents.find(a=>!friends[a.id]&&!tribute[a.id]);
        if(subj){ say(subj,{who:"you",time:"will",act:"give",amt:2,whom:"me"}); say(subj,{who:"me",time:"will",act:"hurt",amt:0,whom:"you",cond:{who:"you",time:"will",act:"not",amt:0,whom:"me"}}); tribute[subj.id]=world.turn; note(`demanded tribute from A${subj.id}`); continue; }
        const subj2=v.agents.find(a=>!friends[a.id]&&tribute[a.id]&&world.turn-tribute[a.id]>8&&!(enemies[a.id]));
        if(subj2){ say(subj2,{who:"me",time:"will",act:"hurt",amt:0,whom:"you",cond:{who:"you",time:"did",act:"take",amt:0,whom:"anyone"}}); tribute[subj2.id]=world.turn; continue; } }
      // 5. keep my own promises: if I owe someone adjacent, give
      const owe=me.promOut.find(pr=>adj.some(a=>a.id===pr.target)); if(owe&&me.carried>=owe.amount){ give(adj.find(a=>a.id===owe.target),owe.amount); continue; }
      const burials=diary.filter(d=>/buried/.test(d)).length;
      if(burials>=10&&phase!=="rule"&&phase!=="roam"){ phase="roam"; note("stash banked, going to find people"); }
      if(phase==="roam"||phase==="rule"){
        if(me.energy<40&&me.carried<2){ if(me.x===corner.x&&me.y===corner.y){ turn(["unstash",0,P.act_cost*0.5,0,0,null]); } else stepTo(corner.x,corner.y); continue; }
        if(me.carried<3){ const f=nearestFood(); if(f){ if(f.d===0) wait(); else stepTo(f.x,f.y); continue; } }
        if(v.agents.length){ const a=v.agents.sort((p,q)=>dist(me.x,me.y,p.x,p.y)-dist(me.x,me.y,q.x,q.y))[0]; if(dist(me.x,me.y,a.x,a.y)>1){ stepTo(a.x,a.y); continue; } wait(); continue; }
        roamStep(); continue; }
      // 6. economy: full carry → go to corner and bury; else forage; find corner by walking to edges
      if(me.carried>=P.carry_cap-0.5){
        if(!corner){ const e=edgeDirs(); if(e.left&&e.up){ corner={x:me.x,y:me.y}; note(`found a corner at my position after ${world.turn} turns`);} else { move(e.left?0:-1,e.up?0:-1); continue; } }
        if(me.x===corner.x&&me.y===corner.y){ if(adj.length||v.agents.length){ if(me.energy<90){ eat(); continue; } wait(); continue; } stash(); note(`buried ${P.carry_cap} in the corner (total ${(stashHere+8).toFixed(0)})`); continue; }
        stepTo(corner.x,corner.y); continue; }
      const f=nearestFood(); if(f){ if(f.d===0){ wait(); } else stepTo(f.x,f.y); continue; }
      if(me.energy<80&&me.carried>0){ eat(); continue; }
      // explore: away from known edges
      roamStep();
    }
    const stashTotal=Object.entries(world.stash).reduce((s,[k,o])=>s+(o[me.id]||0),0);
    return {alive:me.alive,turn:world.turn,energy:me.energy,carried:me.carried,stashTotal,friends,enemies,diary,
      feed:seenEvents().filter(e=>!/picked up|^t\d+ you ate|stashed food here/.test(e.s)).slice(-70).map(e=>`t${e.t} ${e.s}`), alivePop:world.agents.filter(a=>a.alive).length,
      whatTheyThink:world.agents.filter(a=>a.alive&&!a.isPlayer&&a.tally[0]&&a.tally[0].seen>0.5).map(a=>`A${a.id}(r${a.reward} f${a.fear} g${a.guilt}): give${a.t(0).rate("give",0).toFixed(2)} take${a.t(0).rate("take",0).toFixed(2)} hurt${a.t(0).rate("hurt",0).toFixed(2)} cred${a.t(0).cred().toFixed(2)} threat${(a.threats[0]||0).toFixed(2)}`)};
  });
  results.push(result); }
  for(const r of results) console.log(JSON.stringify({alive:r.alive,turn:r.turn,stash:Math.round(r.stashTotal),friends:r.friends,enemies:r.enemies,pop:r.alivePop,diary:r.diary.filter(d=>!/buried/.test(d)).slice(0,8),think:r.whatTheyThink.slice(0,5),lastFeed:r.feed.slice(-6)}));
  console.log(errs);
  await b.close();
})();
