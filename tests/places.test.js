import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlan,dateKey,mondayOf} from '../public/training.js';
import {localisePlan,allPlaces} from '../public/places.js';
const p={weeklyHours:7,currentHours:5,experience:'regular',goal:'strong',distance:150,raceDate:'2027-04-17',startDate:'2026-10-12',availableDays:[1,2,3,4,5,6,0],longRideDay:6,otherSports:[],trainingTerrain:'short-climbs',preferredLocationId:'brienenoord'};
const now=new Date(2026,9,12);
test('local short-climb plan preserves total session time, IDs and recovery limits',()=>{
 const source=createPlan(p,[],[],{},now),local=localisePlan(structuredClone(source),p);
 for(const s of local.sessions){const original=source.sessions.find(x=>x.id===s.id);assert.equal(s.minutes,original.minutes);assert.equal(s.rpe,original.rpe);assert.equal(s.type,original.type);assert.ok(Math.abs(s.blocks.reduce((a,b)=>a+b.minutes,0)-s.minutes)<1e-8);}
 const hard=local.sessions.find(s=>s.type==='intervals');assert.match(hard.title.en,/Van Brienenoordbrug/);assert.ok(hard.blocks.filter(b=>b.intensity>.8).every(b=>b.minutes<=1));assert.match(hard.locationReason.en,/not surveyed/);
 assert.ok(hard.blocks[0].minutes>=15);assert.ok(hard.blocks.at(-1).minutes>=15,'travel in both directions is inside the original session budget');
});
test('Heinenoord preset uses flat efforts outside the tube and no assumed ramp climbs',()=>{
 const profile={...p,preferredLocationId:'heinenoord',trainingTerrain:'flat'};const plan=localisePlan(createPlan(profile,[],[],{},now),profile);const hard=plan.sessions.find(s=>s.type==='intervals');assert.match(hard.title.en,/Heinenoord/);assert.match(hard.description.en,/outside any tunnel/);assert.ok(!hard.blocks.some(b=>/ascent/i.test(b.label.en)));
});
test('per-workout rain option changes terrain without adding time or load',()=>{
 const raw=createPlan(p,[],[],{},now),session=raw.sessions.find(s=>s.type==='intervals');const plan=localisePlan(raw,p,{[session.id]:{terrain:'indoor'}});assert.equal(plan.sessions.find(s=>s.id===session.id).locationId,'trainer');assert.equal(session.minutes,createPlan(p,[],[],{},now).sessions.find(s=>s.id===session.id).minutes);
});
test('travel time too long for the workout gives a close flat fallback',()=>{
 const profile={...p,locationSettings:{brienenoord:{travelMinutes:180}}};const local=localisePlan(createPlan(profile,[],[],{},now),profile);const hard=local.sessions.find(s=>s.type==='intervals');assert.equal(hard.locationId,'flat-local');assert.match(hard.locationReason.en,/travel time/);
});
test('custom place and persisted timing overrides are used by the planner',()=>{
 const profile={...p,preferredLocationId:'my-bridge',locations:[{id:'my-bridge',name:'My checked approach',kind:'bridge',usableEffortSeconds:45,returnMinutes:2,travelMinutes:5,verified:true}]};assert.equal(allPlaces(profile).at(-1).name,'My checked approach');const plan=localisePlan(createPlan(profile,[],[],{},now),profile);const hard=plan.sessions.find(s=>s.type==='intervals');assert.match(hard.title.en,/My checked approach/);assert.ok(hard.blocks.filter(b=>b.intensity>.8).every(b=>b.minutes===.75));
});
test('daily caps, week-specific days and time away constrain actual generated and edited sessions',()=>{
 const profile={...p,maxMinutesByDay:{1:30,2:0,3:45,4:30,5:30,6:90,0:45},unavailableDates:['2026-10-21'],availableDaysByWeek:{'2026-10-19':[1,3,6]}};
 const raw=createPlan(profile,[],[],{},now);const bike=s=>['endurance','long','intervals','recovery','strength'].includes(s.type);
 for(const s of raw.sessions.filter(bike)){assert.ok(s.minutes<=profile.maxMinutesByDay[new Date(s.date+'T12:00:00').getDay()]);assert.notEqual(s.date,'2026-10-21');if(dateKey(mondayOf(s.date))==='2026-10-19')assert.ok([1,3,6].includes(new Date(s.date+'T12:00:00').getDay()));}
 const target=raw.sessions.find(bike);const edited=createPlan(profile,[],[],{[target.id]:{minutes:600,date:'2026-10-21'}},now);assert.equal(edited.sessions.find(s=>s.id===target.id).minutes,0);
});
