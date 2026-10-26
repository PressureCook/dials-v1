import { World, srand, P, ACT } from "./index.mjs";
const N=+(process.argv[2]||50), T=+(process.argv[3]||500), side=+(process.argv[4]||40);
srand(+(process.argv[5]||7)); const scale=(side*side)/(40*40);
const w=new World(N,{params:{W:side,H:side,food_tiles:Math.round(120*scale),springs:Math.round(12*scale),max_pop:N>500?Math.round(N*1.5):Math.round(250*scale)}});
const t0=Date.now(); let peak=0, hits=0, gifts=0, thefts=0; const d={killed:0,starved:0,thirst:0,old:0}; const ok=w.kill.bind(w); w.kill=(i)=>{ if(w.alive[i]){ if(w.water[i]<=0) d.thirst++; else if(w.hitsTaken[i]>0) d.killed++; else if(w.energy[i]<=0) d.starved++; else d.old++; } ok(i); };
const od=w.doAct.bind(w); w.doAct=(i,c)=>{ const a=w.C.act[c]; if(a===ACT.hurt) hits++; if(a===ACT.give) gifts++; if(a===ACT.take||a===ACT.raid) thefts++; od(i,c); };
for(let t=0;t<T;t++){ w.turnStep(); const p=w.pop; if(p>peak) peak=p; if((t+1)%(T>=100?100:10)===0) console.log(JSON.stringify({t:t+1,alive:p,peak,births:w.births||0,hits,gifts,thefts,deaths:d,ms_per_turn:+((Date.now()-t0)/(t+1)).toFixed(1)})); if(!p) break; }
console.log("total s",((Date.now()-t0)/1000).toFixed(1));
