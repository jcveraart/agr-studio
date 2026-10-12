export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const localDate = value => new Date(`${String(value).slice(0,10)}T12:00:00`);
export const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(localDate(v).getTime()) && `${localDate(v).getFullYear()}-${String(localDate(v).getMonth()+1).padStart(2,'0')}-${String(localDate(v).getDate()).padStart(2,'0')}` === v;
export function validateBackup(value) {
  if (!value || value.version !== 1 || typeof value.profile !== 'object' || !value.profile) throw new Error('Unsupported backup');
  const p=value.profile;
  if (!isDate(p.raceDate) || !isDate(p.startDate) || !Number.isFinite(p.weeklyHours) || p.weeklyHours<0.5 || p.weeklyHours>30 || !Number.isFinite(p.currentHours) || p.currentHours<0 || p.currentHours>30 || ![65,100,125,150,200,240].includes(p.distance)) throw new Error('Invalid athlete profile');
  if (!Array.isArray(p.availableDays) || !p.availableDays.length || p.availableDays.some(d=>!Number.isInteger(d)||d<0||d>6) || !['beginner','regular','experienced'].includes(p.experience) || !['finish','strong','performance'].includes(p.goal)) throw new Error('Invalid training preferences');
  if (p.raceDate<p.startDate || (localDate(p.raceDate)-localDate(p.startDate))/86400000>731) throw new Error('Invalid training period');
  if (p.weeklyHoursByWeek && (typeof p.weeklyHoursByWeek!=='object'||Array.isArray(p.weeklyHoursByWeek)||Object.entries(p.weeklyHoursByWeek).some(([k,v])=>!isDate(k)||!Number.isFinite(v)||v<0||v>30))) throw new Error('Invalid weekly availability');
  if (p.maxMinutesByDay && (typeof p.maxMinutesByDay!=='object'||Object.entries(p.maxMinutesByDay).some(([k,v])=>!/^\d$/.test(k)||Number(k)>6||!Number.isFinite(v)||v<0||v>600))) throw new Error('Invalid daily time limits');
  if (p.availableDaysByWeek && (typeof p.availableDaysByWeek!=='object'||Object.entries(p.availableDaysByWeek).some(([k,v])=>!isDate(k)||!Array.isArray(v)||v.some(d=>!Number.isInteger(d)||d<0||d>6)))) throw new Error('Invalid weekly days');
  if (p.unavailableDates && (!Array.isArray(p.unavailableDates)||p.unavailableDates.length>731||p.unavailableDates.some(d=>!isDate(d)))) throw new Error('Invalid blocked dates');
  const locations=[...(p.locations||[]),...Object.values(p.locationSettings||{})];
  if(locations.length>60||locations.some(l=>!l||typeof l.id!=='string'||l.id.length>120||typeof l.name!=='string'||l.name.length>100||!['flat','bridge','hill','tunnel','indoor'].includes(l.kind)||!Number.isFinite(l.usableEffortSeconds)||l.usableEffortSeconds<20||l.usableEffortSeconds>600||!Number.isFinite(l.returnMinutes)||l.returnMinutes<1||l.returnMinutes>10||!Number.isFinite(l.travelMinutes)||l.travelMinutes<0||l.travelMinutes>180||l.mapUrl&&!/^https?:\/\//i.test(l.mapUrl)))throw new Error('Invalid training locations');
  const validPoint=point=>Array.isArray(point)&&point.length>=2&&point.slice(0,2).every(Number.isFinite)&&Math.abs(point[0])<=180&&Math.abs(point[1])<=90;
  if(locations.some(l=>l.start!=null&&!validPoint(l.start)||l.end!=null&&!validPoint(l.end)))throw new Error('Invalid climb endpoints');
  if(p.trainingRoutes&&(!Array.isArray(p.trainingRoutes)||p.trainingRoutes.length>30||p.trainingRoutes.some(r=>!r||typeof r.id!=='string'||typeof r.name!=='string'||r.name.length>100||!Number.isFinite(r.distanceM)||r.distanceM<0||!Number.isFinite(r.speedKph)||r.speedKph<10||r.speedKph>45||!Array.isArray(r.blocks)||r.blocks.length<1||r.blocks.length>6||r.blocks.some(b=>typeof b.name!=='string'||!Number.isInteger(b.repeats)||b.repeats<1||b.repeats>12||!Number.isFinite(b.workSeconds)||b.workSeconds<20||b.workSeconds>600||!Number.isFinite(b.recoveryMinutes)||b.recoveryMinutes<1||b.recoveryMinutes>10)||!Array.isArray(r.geometry)||r.geometry.length<2||r.geometry.length>25000||r.geometry.some(p=>!validPoint(p))||!/^https:\/\/brouter\.de\/brouter-web\//.test(r.externalUrl))))throw new Error('Invalid saved training routes');
  if (!Array.isArray(p.otherSports) || p.otherSports.length>14 || p.otherSports.some(s=>typeof s.name!=='string'||s.name.length>80||!Number.isInteger(s.day)||s.day<0||s.day>6||!Number.isFinite(s.minutes)||s.minutes<5||s.minutes>300||!['easy','moderate','hard'].includes(s.intensity))) throw new Error('Invalid other sports');
  for (const k of ['logs','checkins','chat']) if (!Array.isArray(value[k]) || value[k].length>5000) throw new Error('Invalid history');
  if (value.logs.some(l=>typeof l.sessionId!=='string'||!isDate(l.date)||!Number.isFinite(l.minutes)||l.minutes<0||l.minutes>1500||!Number.isFinite(l.rpe)||l.rpe<1||l.rpe>10)) throw new Error('Invalid activity log');
  if (value.checkins.some(c=>!isDate(c.date)||!Number.isFinite(c.sleepHours)||c.sleepHours<0||c.sleepHours>24||['fatigue','soreness','stress'].some(k=>!Number.isFinite(c[k])||c[k]<1||c[k]>5))) throw new Error('Invalid check-in');
  if (!value.overrides || typeof value.overrides!=='object'||Array.isArray(value.overrides)||Object.values(value.overrides).some(o=>!o||typeof o!=='object'||o.date&&!isDate(o.date)||o.minutes!=null&&(!Number.isFinite(o.minutes)||o.minutes<0||o.minutes>1500))) throw new Error('Invalid workout edits');
  return {version:1,lang:value.lang==='nl'?'nl':'en',profile:{...p,name:String(p.name||'Rider').slice(0,80)},logs:value.logs,checkins:value.checkins,overrides:value.overrides,chat:value.chat.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string').map(m=>({role:m.role,text:m.text.slice(0,12000)})),prep:value.prep&&typeof value.prep==='object'?value.prep:{},configured:true};
}
export function calendarICS(sessions, lang='en') {
 const esc=v=>String(v).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
 const fold=line=>{let out='', chunk='', size=0;for(const ch of line){const n=new TextEncoder().encode(ch).length;if(size+n>73){out+=chunk+'\r\n ';chunk='';size=1;}chunk+=ch;size+=n;}return out+chunk;};
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AGR Studio//Training Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const s of sessions.filter(s=>s.minutes>0||s.type==='race')) {
   const next=localDate(s.date);next.setDate(next.getDate()+1);
   const end=[next.getFullYear(),String(next.getMonth()+1).padStart(2,'0'),String(next.getDate()).padStart(2,'0')].join('');
   lines.push('BEGIN:VEVENT',`UID:${esc(s.id)}@agr-studio.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,`DTSTART;VALUE=DATE:${s.date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${end}`,`SUMMARY:${esc(s.title?.[lang]||s.title?.en||s.type)}`,`DESCRIPTION:${esc(`${s.minutes} min · RPE ${s.rpe}\n${s.description?.[lang]||''}`)}`,'END:VEVENT');
 }lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
export function validateAIChanges(changes, sessions, logs, today) {
 if(!Array.isArray(changes)||changes.length>14)throw new Error('Invalid suggestions');
 const used=new Set();return changes.map(c=>{const s=sessions.find(s=>s.id===c.sessionId);if(!s||s.completed||s.date<today||s.type==='race'||s.type==='other'||logs.some(l=>l.sessionId===s.id)||used.has(s.id)||!Number.isInteger(c.minutes)||c.minutes<0||c.minutes>s.minutes||!['keep','recovery','rest'].includes(c.type)||c.type==='rest'&&c.minutes!==0)throw new Error('Suggestion exceeds safe editing limits');used.add(s.id);return {sessionId:s.id,minutes:c.minutes,type:c.type,reason:String(c.reason||'').slice(0,500)};});
}
