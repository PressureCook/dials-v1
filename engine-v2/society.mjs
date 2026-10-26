// the society test: cap 80, 1500 turns, 50 founders from scratch; leaders by distinct givers, words shared
import { World, srand, P, ACT, COINED } from "./index.mjs";
const seed=+(process.argv[2]||7), T=+(process.argv[3]||1500), cap=+(process.argv[4]||80); srand(seed);
const w=new World(50,{params:{max_pop:cap}}); let gifts=0,hits=0,thefts=0,teach=0,qs=0; const given=new Map();
const od=w.doAct.bind(w); w.doAct=(i,c)=>{ const a=w.C.act[c], j=w.C.target[c]; if(a===ACT.give){ gifts++; let g=given.get(j); if(!g){ g={s:new Set(),n:0}; given.set(j,g); } g.s.add(i); g.n++; } if(a===ACT.hurt) hits++; if(a===ACT.take||a===ACT.raid) thefts++; if(a===ACT.say){ const pl=w.C.payload[c]; if(pl.words&&pl.words.includes("?")) qs++; else if(pl.concept!==undefined||(pl.s&&pl.s.who==="anyone")) teach++; } od(i,c); };
const d={killed:0,starved:0,thirst:0,old:0}; const ok=w.kill.bind(w); w.kill=(i)=>{ if(w.alive[i]){ if(w.water[i]<=0) d.thirst++; else if(w.hitsTaken[i]>0) d.killed++; else if(w.energy[i]<=0) d.starved++; else d.old++; } ok(i); };
const lookup=(i,m)=>{ const mm=w.mind[i]; let best=null,bn=0; for(const [x,e] of mm.lexicon){ if(w.meaning(i,x)===m){ const n=e.get(m)||0; if(n>bn){bn=n;best=x;} } } return best||"-"; };
const share=m=>{ const use={}; let n=0; for(let i=0;i<w.count;i++) if(w.alive[i]){ const x=lookup(i,m); if(x==="-") continue; use[x]=(use[x]||0)+1; n++; } const mx=Math.max(0,...Object.values(use)); return `${Object.keys(use).length} words, top shared by ${mx}`; };
const t0=Date.now(); for(let t=0;t<T;t++){ w.turnStep(); if((t+1)%250===0){ let al=0; for(let i=0;i<w.count;i++) if(w.alive[i]) al++;
  const top=[...given.entries()].filter(([id])=>w.alive[id]).map(([id,g])=>({id,subjects:g.s.size,tributes:g.n})).sort((x,y)=>y.subjects-x.subjects||y.tributes-x.tributes).slice(0,3);
  console.log(JSON.stringify({t:t+1,alive:al,births:w.births||0,gifts,hits,thefts,teachingSentences:teach,wordQuestions:qs,deaths:{...d},leaders:top,wordsFor:{give:share("give"),hurt:share("hurt"),take:share("take")},s:+((Date.now()-t0)/1000).toFixed(0)})); if(!al) break; } }
