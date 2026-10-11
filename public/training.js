/**
 * Transparent local training planner. Heuristics are informed by endurance research;
 * this is not a validated performance predictor, diagnosis or medical model.
 * Dates are local calendar days, so a ride never shifts because of a UTC conversion.
 */
const DAY_MS = 86400000;
const TYPES = new Set(['endurance', 'intervals', 'recovery', 'long', 'strength', 'other', 'rest', 'race']);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const round5 = value => Math.max(0, Math.floor(value / 5) * 5);
const pair = (en, nl) => ({ en, nl });

function calendarDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : new Date(NaN);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? parsed : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function dateKey(value) {
  const date = calendarDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(value, amount) {
  const date = calendarDate(value);
  date.setDate(date.getDate() + number(amount));
  return date;
}

export function mondayOf(value) {
  const date = calendarDate(value);
  return addDays(date, -((date.getDay() + 6) % 7));
}

function daysBetween(a, b) {
  const first = calendarDate(a), second = calendarDate(b);
  return Math.round((Date.UTC(second.getFullYear(), second.getMonth(), second.getDate()) - Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) / DAY_MS);
}

export function getPhase(date, raceDate) {
  const remaining = daysBetween(date, raceDate);
  if (!Number.isFinite(remaining)) return 'base';
  if (remaining < 0) return 'complete';
  if (remaining === 0) return 'race';
  if (remaining <= 14) return 'taper';
  if (remaining <= 42) return 'specific';
  if (remaining <= 98) return 'build';
  return 'base';
}

const WORKOUTS = {
  endurance: {
    title: pair('Aerobic endurance', 'Rustige duurtraining'),
    description: pair('Ride at a conversational pace. Keep the pressure light on climbs and choose a smooth cadence. The talk test takes priority over estimated power zones.', 'Fiets op een tempo waarbij je in zinnen kunt praten. Houd de inspanning licht op klimmetjes en trap soepel. De praattest gaat vóór geschatte vermogenszones.'),
    rationale: pair('Most training stays easy to build aerobic consistency without making every day demanding.', 'Het grootste deel blijft rustig: zo bouw je een aerobe basis op zonder elke dag zwaar te maken.'),
    rpe: 3, zone: 'Z2 · 55–75% FTP',
  },
  long: {
    title: pair('Limburg endurance ride', 'Limburgse lange duurrit'),
    description: pair('Ride easy on rolling roads. Practice pacing, descending, food and drink. Stay controlled on short climbs; there is no need to chase speed.', 'Fiets rustig over glooiende wegen. Oefen met tempo, afdalen, eten en drinken. Houd korte klimmetjes beheerst; snelheid najagen hoeft niet.'),
    rationale: pair('A longer easy ride develops the endurance and practical habits needed for your selected AGR distance.', 'Een langere rustige rit ontwikkelt het uithoudingsvermogen en de praktische gewoontes voor jouw AGR-afstand.'),
    rpe: 4, zone: 'Z2 · 55–75% FTP',
  },
  intervals: {
    title: pair('Controlled climbing intervals', 'Beheerste klimintervallen'),
    description: pair('Warm up gently, ride the work blocks at a controlled hard effort, then recover easily. Keep each repeat repeatable; stop the hard work if your legs or breathing feel unusual.', 'Warm rustig op, fiets de werkblokken stevig maar beheerst en herstel rustig. Elke herhaling moet herhaalbaar zijn; beëindig het zware deel als benen of ademhaling ongewoon aanvoelen.'),
    rationale: pair('A small dose of quality work prepares you for repeated climbs, separated by easy days.', 'Een kleine dosis kwaliteit bereidt je voor op herhaalde klimmetjes, met rustige dagen ertussen.'),
    rpe: 7, zone: 'Z4 · 90–100% FTP',
  },
  recovery: {
    title: pair('Easy recovery spin', 'Rustige herstelrit'),
    description: pair('Spin very easily. You should finish feeling fresher than you started. Choosing rest instead is always fine.', 'Trap heel licht. Je hoort frisser te eindigen dan je begon. Rust nemen is altijd een prima alternatief.'),
    rationale: pair('An easy day leaves room for recovery and your next useful training session.', 'Een rustige dag geeft ruimte voor herstel en je volgende zinvolle training.'),
    rpe: 2, zone: 'Z1 · <55% FTP',
  },
  strength: {
    title: pair('Strength & control', 'Kracht & controle'),
    description: pair('Use familiar, technically sound squat, hinge, calf and trunk exercises. Leave repetitions in reserve. A new heavy routine belongs with qualified guidance, not in race week.', 'Doe vertrouwde squat-, heup-, kuit- en rompoefeningen met goede techniek. Houd herhalingen over. Begin een nieuwe zware routine met deskundige begeleiding, niet in de wedstrijdweek.'),
    rationale: pair('Strength work can complement cycling; its time and fatigue count toward the same weekly budget.', 'Krachttraining kan fietsen aanvullen; tijd en vermoeidheid tellen mee in hetzelfde weekbudget.'),
    rpe: 5, zone: 'Strength',
  },
  other: {
    title: pair('Other sport', 'Andere sport'),
    description: pair('Your chosen activity is part of your total training time. Its intensity also affects the cycling schedule.', 'Je gekozen activiteit hoort bij je totale trainingstijd. De intensiteit beïnvloedt ook je fietsschema.'),
    rationale: pair('All sports draw from the same recovery capacity and available hours.', 'Alle sporten vragen om dezelfde herstelcapaciteit en beschikbare uren.'),
    rpe: 3, zone: 'Other sport',
  },
  rest: {
    title: pair('Rest day', 'Rustdag'),
    description: pair('No scheduled training. Easy everyday movement is fine; leave room for sleep and recovery.', 'Geen geplande training. Rustig dagelijks bewegen is prima; maak ruimte voor slaap en herstel.'),
    rationale: pair('Recovery is part of consistent preparation.', 'Herstel hoort bij een consistente voorbereiding.'),
    rpe: 0, zone: 'Rest',
  },
  race: {
    title: pair('Amstel Gold Race Toertocht', 'Amstel Gold Race Toertocht'),
    description: pair('Start conservatively, ride the climbs at your own pace and use the food, drink and equipment you rehearsed. This is an estimated riding duration, not a predicted finish time.', 'Start behoudend, fiets klimmetjes op je eigen tempo en gebruik het eten, drinken en materiaal waarmee je hebt geoefend. Dit is een geschatte ritduur, geen voorspelde finishtijd.'),
    rationale: pair('Bring your preparation together on the day. Event duration is separate from the weekly training budget.', 'Breng je voorbereiding samen op de dag zelf. De evenementduur staat los van het wekelijkse trainingsbudget.'),
    rpe: 6, zone: 'Event pace',
  },
};

export function getWorkoutLibrary(lang = 'en') {
  const language = lang === 'nl' ? 'nl' : 'en';
  return Object.entries(WORKOUTS).map(([type, workout]) => ({ type, ...workout, title: workout.title[language], description: workout.description[language], rationale: workout.rationale[language] }));
}

function blocksFor(type, minutes, phase = 'base') {
  if (minutes <= 0) return [];
  const block = (duration, intensity, en, nl) => ({ minutes: duration, intensity, label: pair(en, nl) });
  if (type === 'intervals' && minutes >= 30) {
    // Intensity is deliberately modest in base and during taper; hard block time,
    // rather than the entire session, determines the intensity distribution.
    const workIntensity = phase === 'base' ? 0.9 : 0.97;
    const repetitions = phase === 'taper' ? 2 : Math.min(4, Math.max(2, Math.floor((minutes - 20) / 8)));
    const workMinutes = phase === 'taper' ? 2 : phase === 'base' ? 4 : 5;
    const warmup = Math.min(12, Math.floor(minutes * 0.2));
    const recovery = 3;
    const result = [block(warmup, 0.5, 'Warm up', 'Opwarmen')];
    for (let i = 0; i < repetitions; i++) {
      result.push(block(workMinutes, workIntensity, `Climb ${i + 1}`, `Klim ${i + 1}`));
      result.push(block(recovery, 0.45, 'Easy recovery', 'Rustig herstellen'));
    }
    const used = result.reduce((sum, item) => sum + item.minutes, 0);
    result.push(block(Math.max(0, minutes - used), 0.5, 'Easy finish', 'Rustig uitfietsen'));
    return result.filter(item => item.minutes > 0);
  }
  const intensity = type === 'recovery' ? 0.45 : type === 'strength' || type === 'other' ? 0 : type === 'race' ? 0.7 : 0.65;
  return [block(minutes, intensity, type === 'strength' ? 'Controlled strength work' : type === 'other' ? 'Your activity' : type === 'race' ? 'Ride your event' : type === 'recovery' ? 'Very easy spin' : 'Conversational effort', type === 'strength' ? 'Beheerste krachttraining' : type === 'other' ? 'Jouw activiteit' : type === 'race' ? 'Fiets je evenement' : type === 'recovery' ? 'Heel licht fietsen' : 'Praattempo')];
}

function makeSession(date, type, minutes, phase, id = `ride-${dateKey(date)}`) {
  const template = WORKOUTS[type] || WORKOUTS.endurance;
  return { id, date: dateKey(date), type, title: { ...template.title }, description: { ...template.description }, rationale: { ...template.rationale }, minutes: Math.round(minutes), rpe: template.rpe, zone: template.zone, blocks: blocksFor(type, Math.round(minutes), phase), phase, adapted: false, adaptationReason: pair('', '') };
}

function adapt(session, reason) {
  session.adapted = true;
  const previous = session.adaptationReason;
  session.adaptationReason = pair([previous?.en, reason.en].filter(Boolean).join(' '), [previous?.nl, reason.nl].filter(Boolean).join(' '));
}

function changeSession(session, type, minutes) {
  const sport = session.type === 'other' && type === 'other' ? { title: session.title, rpe: session.rpe, zone: session.zone, sportIntensity: session.sportIntensity } : {};
  const replacement = makeSession(session.date, type, minutes, session.phase, session.id);
  Object.assign(session, replacement, sport, { adapted: session.adapted, adaptationReason: session.adaptationReason });
}

function normalizeProfile(input, today) {
  const weeklyHours = clamp(number(input.weeklyHours, 6), 0, 30);
  const weeklyHoursByWeek = {};
  if (input.weeklyHoursByWeek && typeof input.weeklyHoursByWeek === 'object' && !Array.isArray(input.weeklyHoursByWeek)) {
    for (const [key, hours] of Object.entries(input.weeklyHoursByWeek)) {
      if (dateKey(key) === key && dateKey(mondayOf(key)) === key && typeof hours === 'number' && Number.isFinite(hours) && hours >= 0) weeklyHoursByWeek[key] = Math.min(hours, weeklyHours);
    }
  }
  const dayList = Array.isArray(input.availableDays) ? [...new Set(input.availableDays.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))] : [1, 2, 3, 4, 5, 6, 0];
  const start = calendarDate(input.startDate || today);
  const race = calendarDate(input.raceDate);
  return { ...input, weeklyHours, weeklyHoursByWeek, currentHours: clamp(number(input.currentHours, weeklyHours * 0.75), 0, 30), experience: ['beginner', 'regular', 'experienced'].includes(input.experience) ? input.experience : 'regular', goal: ['finish', 'strong', 'performance'].includes(input.goal) ? input.goal : 'finish', distance: clamp(number(input.distance, 150), 30, 350), availableDays: dayList, longRideDay: clamp(Math.round(number(input.longRideDay, 6)), 0, 6), startDate: Number.isNaN(start.getTime()) ? dateKey(today) : dateKey(start), raceDate: Number.isNaN(race.getTime()) ? '' : dateKey(race), otherSports: (Array.isArray(input.otherSports) ? input.otherSports : []).filter(item => item && Number.isInteger(Number(item.day)) && Number(item.day) >= 0 && Number(item.day) <= 6).map(item => ({ ...(item.id != null && String(item.id) ? { id: String(item.id).slice(0, 80) } : {}), name: String(item.name || 'Other sport').slice(0, 80), day: Number(item.day), minutes: clamp(Math.round(number(item.minutes, 45)), 0, 600), intensity: ['easy', 'moderate', 'hard'].includes(item.intensity) ? item.intensity : 'easy' })) };
}

function readinessSignals(logs, checkins, baseline, today) {
  const currentKey = dateKey(today);
  const recentLogs = logs.filter(log => log && dateKey(log.date) <= currentKey && daysBetween(log.date, today) >= 0 && daysBetween(log.date, today) <= 3);
  const recentCheckins = checkins.filter(item => item && dateKey(item.date) <= currentKey && daysBetween(item.date, today) >= 0 && daysBetween(item.date, today) <= 2).sort((a, b) => a.date.localeCompare(b.date));
  const latest = recentCheckins.at(-1);
  const latestLog = recentLogs.slice().sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  let factor = 1, days = 0, reason = pair('', '');
  if (latest?.wellness === 'ill' || recentLogs.some(log => log.pain === true)) {
    factor = 0; days = 3;
    reason = pair('You reported illness or pain. The next few training days are paused; review how you feel before resuming.', 'Je meldde ziekte of pijn. De komende trainingsdagen zijn gepauzeerd; beoordeel hoe je je voelt voordat je hervat.');
  } else if (latestLog?.feeling === 'exhausted' || number(latest?.fatigue) >= 5 || (latest && number(latest.sleepHours, 8) < 5)) {
    factor = 0.5; days = 3;
    reason = pair('Recent feedback suggests low readiness. Upcoming training is shorter and easy.', 'Recente feedback wijst op weinig herstelruimte. De komende training is korter en rustig.');
  } else if (latestLog?.feeling === 'tired' || number(latest?.fatigue) >= 4 || number(latest?.soreness) >= 4 || number(latest?.stress) >= 4 || (latest && number(latest.sleepHours, 8) < 6)) {
    factor = 0.75; days = 3;
    reason = pair('Fatigue, soreness, stress or short sleep triggered a lighter next few days.', 'Vermoeidheid, spierpijn, stress of korte slaap zorgde voor enkele lichtere dagen.');
  } else if (recentLogs.some(log => number(log.minutes) > 0 && number(log.rpe) >= number(baseline.get(log.sessionId)?.rpe, 4) + 2)) {
    factor = 0.8; days = 2;
    reason = pair('A recent session felt harder than planned. The next training days are eased.', 'Een recente training voelde zwaarder dan gepland. De volgende trainingsdagen zijn lichter.');
  }
  return { factor, days, reason };
}

/** Generate a complete plan with manual changes checked against shared time and recovery limits. */
export function createPlan(input = {}, logs = [], checkins = [], overrides = {}, now = new Date()) {
  const today = calendarDate(now);
  const profile = normalizeProfile(input, today);
  const notes = [], sessions = [];
  const addNote = (en, nl) => { if (!notes.some(note => note.en === en)) notes.push(pair(en, nl)); };
  const budget = Math.round(profile.weeklyHours * 60);
  const completedLogs = new Map(logs.filter(log => log && dateKey(log.date) && dateKey(log.date) <= dateKey(today) && number(log.minutes) > 0).map(log => [log.sessionId, log]));
  const completedIds = new Set(completedLogs.keys());
  if (!profile.raceDate) return { sessions, notes: [pair('Choose a valid event date to generate your plan.', 'Kies een geldige evenementdatum om je plan te maken.')], phase: 'base', weeklyBudgetMinutes: budget };
  const race = calendarDate(profile.raceDate);
  if (daysBetween(today, race) < 0) return { sessions, notes: [pair('This event date has passed. Choose a future event date for a new plan.', 'Deze evenementdatum is voorbij. Kies een toekomstige datum voor een nieuw plan.')], phase: 'complete', weeklyBudgetMinutes: budget };
  let start = calendarDate(profile.startDate);
  if (start > race) start = today;
  // A maximum two-year display horizon prevents accidental malformed profiles
  // producing enormous browser arrays; the selected event itself is still included.
  if (daysBetween(start, race) > 730) {
    start = addDays(race, -730);
    addNote('The calendar displays the final two years before your event.', 'De kalender toont de laatste twee jaar vóór je evenement.');
  }
  if (daysBetween(today, race) < 56) addNote('Less than eight weeks remain. Build from your current habits; a short plan cannot promise full preparation for the selected distance.', 'Er zijn minder dan acht weken over. Bouw voort op je huidige gewoontes; een kort plan kan geen volledige voorbereiding op de gekozen afstand beloven.');
  if (profile.currentHours === 0) addNote('With no recent training, the first week starts with short easy sessions rather than your full available hours.', 'Zonder recente training begint de eerste week met korte rustige trainingen in plaats van al je beschikbare uren.');
  if (profile.otherSports.reduce((sum, item) => sum + item.minutes, 0) > budget) addNote('Your other sports exceed the weekly time budget. Those sessions are shortened to fit, and no cycling is added until there is room.', 'Je andere sporten overschrijden het weekbudget. Die trainingen worden ingekort om te passen; fietsen wordt pas toegevoegd als er ruimte is.');
  if (!profile.availableDays.length) addNote('No cycling days are available. Add available days to receive bike sessions.', 'Er zijn geen fietsdagen beschikbaar. Voeg beschikbare dagen toe om fietstrainingen te ontvangen.');
  if (profile.weeklyHours < 4 && profile.distance >= 150) addNote('A longer route with under four hours per week leaves limited preparation time. Consider a shorter route or more available time.', 'Een langere route met minder dan vier uur per week geeft weinig voorbereidingstijd. Overweeg een kortere route of meer beschikbare tijd.');
  const startMonday = mondayOf(start), weekLimits = new Map();
  const baseMinutes = profile.currentHours > 0 ? profile.currentHours * 60 : Math.min(90, budget);
  const maxSlots = profile.experience === 'beginner' ? 3 : profile.experience === 'experienced' ? 5 : 4;
  let previousHardDates = [];

  for (let monday = startMonday, weekIndex = 0; monday <= race; monday = addDays(monday, 7), weekIndex++) {
    const weekDays = Array.from({ length: 7 }, (_, index) => addDays(monday, index)).filter(date => date >= start && date <= race);
    const trainingDays = weekDays.filter(date => date < race);
    const remaining = daysBetween(monday, race);
    const ordinaryPhase = getPhase(trainingDays[0] || race, race);
    const recoveryWeek = weekIndex % 4 === 3 && remaining > 14;
    const phase = recoveryWeek ? 'recovery' : ordinaryPhase;
    const buildWeeks = weekIndex - Math.floor((weekIndex + 1) / 4);
    let target = Math.min(budget, baseMinutes * Math.pow(1.06, Math.max(0, buildWeeks)));
    if (recoveryWeek) target *= 0.7;
    if (ordinaryPhase === 'taper') target *= remaining <= 7 ? 0.4 : 0.6;
    target = round5(target * trainingDays.length / 7);
    const weekKey = dateKey(monday);
    const cap = profile.weeklyHoursByWeek[weekKey];
    const limit = cap == null ? target : Math.min(target, round5(cap * 60));
    weekLimits.set(weekKey, limit);
    // For a week already underway, generate the original allocation first.
    // The final budget pass then trims future work while preserving history.
    const containsCompleted = [...completedLogs.values()].some(log => dateKey(mondayOf(log.date)) === weekKey);
    if (monday >= today && !containsCompleted) target = limit;
    let otherRemaining = target;
    const sports = [];
    trainingDays.forEach(date => profile.otherSports.forEach((sport, index) => {
      if (date.getDay() !== sport.day || sport.minutes <= 0) return;
      const minutes = Math.min(sport.minutes, otherRemaining);
      otherRemaining -= minutes;
      if (minutes <= 0) return;
      const session = makeSession(date, 'other', minutes, phase, `sport-${dateKey(date)}-${sport.id || index}`);
      session.title = pair(sport.name, sport.name);
      session.rpe = sport.intensity === 'hard' ? 7 : sport.intensity === 'moderate' ? 5 : 3;
      session.zone = sport.intensity;
      session.sportIntensity = sport.intensity;
      if (minutes < sport.minutes) adapt(session, pair('Other sport shortened to stay within this week’s time budget.', 'Andere sport ingekort om binnen het tijdsbudget van deze week te blijven.'));
      sports.push(session);
    }));
    sessions.push(...sports);
    const sportDates = new Set(sports.map(session => session.date));
    const hardDates = sports.filter(session => session.rpe >= 7).map(session => calendarDate(session.date));
    if (hardDates.some((date, i) => hardDates.some((other, j) => i !== j && Math.abs(daysBetween(date, other)) < 2))) addNote('Some hard activities in your other sports are on consecutive days. Consider separating them; the cycling plan avoids adding more hard work nearby.', 'Sommige zware trainingen in je andere sporten zijn op opeenvolgende dagen. Overweeg ze te spreiden; het fietsschema voegt geen zwaar werk in de buurt toe.');
    const dayChoices=Array.isArray(profile.availableDaysByWeek?.[weekKey])?profile.availableDaysByWeek[weekKey]:profile.availableDays;
    const available = trainingDays.filter(date => dayChoices.includes(date.getDay()) && !profile.unavailableDates?.includes(dateKey(date)));
    let cyclingBudget = Math.max(0, target - sports.reduce((sum, session) => sum + session.minutes, 0));
    const slots = [];
    const addSlot = (date, type) => { if (date && !slots.some(slot => dateKey(slot.date) === dateKey(date))) slots.push({ date, type }); };
    // Prefer the selected long day, otherwise the latest free day this week.
    const longCandidate = available.find(date => date.getDay() === profile.longRideDay) || available.slice().reverse().find(date => !sportDates.has(dateKey(date))) || available.at(-1);
    if (longCandidate && cyclingBudget >= 45) addSlot(longCandidate, daysBetween(longCandidate, race) <= 7 ? 'endurance' : 'long');
    const priorHard = previousHardDates.filter(date => daysBetween(date, monday) <= 2);
    const hardAllowance = profile.experience === 'experienced' && profile.goal === 'performance' && profile.weeklyHours >= 8 ? 2 : 1;
    const maxHard = Math.max(0, hardAllowance - hardDates.length);
    const intervalAllowed = !recoveryWeek && cyclingBudget >= 120 && (profile.experience !== 'beginner' || weekIndex >= 3) && daysBetween(start, race) >= 28 && weekIndex >= 1;
    const safeHardDay = date => [...priorHard, ...hardDates, ...slots.filter(slot => slot.type === 'intervals').map(slot => slot.date)].every(hard => Math.abs(daysBetween(hard, date)) >= 2) && (!longCandidate || Math.abs(daysBetween(longCandidate, date)) >= 2) && !sportDates.has(dateKey(date));
    if (intervalAllowed) {
      for (const date of available) {
        if (slots.filter(slot => slot.type === 'intervals').length >= maxHard) break;
        if (safeHardDay(date) && daysBetween(date, race) >= 3) addSlot(date, 'intervals');
      }
    }
    // Respect at least two unbooked days whenever the user's other sports allow it.
    const desiredSlots = Math.max(0, Math.min(maxSlots, 5 - sportDates.size));
    const ranked = available.slice().sort((a, b) => Number(sportDates.has(dateKey(a))) - Number(sportDates.has(dateKey(b))) || a - b);
    for (const date of ranked) {
      if (slots.length >= Math.max(desiredSlots, slots.length)) break;
      if (slots.some(slot => dateKey(slot.date) === dateKey(date))) continue;
      const nearHard = [...hardDates, ...slots.filter(slot => slot.type === 'intervals').map(slot => slot.date)].some(hard => Math.abs(daysBetween(hard, date)) === 1);
      addSlot(date, nearHard || recoveryWeek ? 'recovery' : 'endurance');
    }
    if (!slots.length && cyclingBudget >= 20 && available.length) addSlot(available[0], 'endurance');
    // Very small budgets use fewer useful sessions instead of seven tiny rides.
    while (slots.length > 1 && cyclingBudget / slots.length < 25) {
      const remove = slots.findIndex(slot => slot.type === 'recovery' || slot.type === 'endurance');
      slots.splice(remove >= 0 ? remove : slots.length - 1, 1);
    }
    const weights = slots.map(slot => slot.type === 'long' ? 2.4 : slot.type === 'recovery' ? 0.7 : 1);
    const weightTotal = weights.reduce((sum, value) => sum + value, 0);
    const allocated = slots.map((slot, index) => {
      let minutes = round5(cyclingBudget * weights[index] / (weightTotal || 1));
      const maximum = slot.type === 'long' ? Math.min(360, Math.max(60, profile.distance / 24 * 60 * 0.75)) : slot.type === 'intervals' ? 75 : 120;
      const dayCap=profile.maxMinutesByDay?.[slot.date.getDay()];
      minutes = Math.min(minutes, round5(maximum), Number.isFinite(dayCap)?Math.max(0,round5(dayCap)):maximum);
      let type = slot.type;
      if (type === 'intervals' && minutes < 35) type = 'endurance';
      return makeSession(slot.date, type, minutes, phase);
    }).filter(session => session.minutes >= 15);
    sessions.push(...allocated);
    previousHardDates = [...hardDates, ...allocated.filter(session => session.type === 'intervals').map(session => calendarDate(session.date))];
    for (const date of weekDays) {
      if (dateKey(date) === profile.raceDate) {
        const speed = profile.experience === 'beginner' ? 20 : profile.experience === 'experienced' ? 27 : 23;
        sessions.push(makeSession(date, 'race', Math.round(profile.distance / speed * 60), 'race', `race-${profile.raceDate}`));
      } else if (!sessions.some(session => session.date === dateKey(date))) sessions.push(makeSession(date, 'rest', 0, phase, `rest-${dateKey(date)}`));
    }
  }

  const baseline = new Map(sessions.map(session => [session.id, { ...session }]));
  for (const session of sessions) {
    const override = overrides?.[session.id];
    if (!override || session.type === 'race') continue;
    const newDate = override.date ? calendarDate(override.date) : calendarDate(session.date);
    if (!Number.isNaN(newDate.getTime()) && newDate >= start && newDate < race) session.date = dateKey(newDate);
    const type = TYPES.has(override.type) && override.type !== 'race' ? override.type : session.type;
    const minutes = type === 'rest' ? 0 : clamp(Math.round(number(override.minutes, session.minutes)), 0, 600);
    changeSession(session, type, minutes);
    if (override.title) session.title = typeof override.title === 'object' ? pair(String(override.title.en || session.title.en), String(override.title.nl || override.title.en || session.title.nl)) : pair(String(override.title), String(override.title));
    adapt(session, pair('Adjusted by you; time and recovery limits are still checked.', 'Door jou aangepast; tijds- en herstellimieten worden nog steeds gecontroleerd.'));
  }

  for(const session of sessions){if(session.date<dateKey(today)||completedIds.has(session.id)||session.type==='race'||session.type==='other')continue;const day=calendarDate(session.date).getDay(),cap=profile.maxMinutesByDay?.[day];if(profile.unavailableDates?.includes(session.date)){changeSession(session,'rest',0);adapt(session,pair('Unavailable date: no cycling planned.','Niet-beschikbare datum: geen fietstraining gepland.'));}else if(Number.isFinite(cap)&&session.minutes>cap){changeSession(session,session.type,round5(cap));adapt(session,pair('Kept within your daily time limit.','Binnen je dagelijkse tijdslimiet gehouden.'));}}
  const readiness = readinessSignals(logs, checkins, baseline, today);
  if (readiness.factor < 1) {
    addNote(readiness.reason.en, readiness.reason.nl);
    sessions.forEach(session => {
      const ahead = daysBetween(today, session.date);
      if (ahead < 0 || ahead >= readiness.days || session.type === 'race' || session.type === 'rest' || completedIds.has(session.id)) return;
      const minutes = round5(session.minutes * readiness.factor);
      if (minutes === 0) changeSession(session, 'rest', 0);
      else if (session.type === 'intervals' || session.type === 'long' || session.type === 'strength') changeSession(session, 'recovery', minutes);
      else { session.minutes = minutes; session.rpe = Math.min(session.rpe, 3); session.sportIntensity = 'easy'; session.blocks = blocksFor(session.type, minutes, session.phase); }
      adapt(session, readiness.reason);
    });
  }

  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  // Manual date edits cannot create consecutive hard cycling days or excess
  // hard sessions, even when an edited workout crosses a Monday boundary.
  const hardByWeek = new Map(), hardHistory = [];
  for (const session of sessions) {
    if (session.type === 'race' || session.minutes === 0) continue;
    const week = dateKey(mondayOf(session.date));
    if (session.type === 'other' && session.rpe >= 7 || session.type === 'intervals' && (session.date < dateKey(today) || completedIds.has(session.id))) {
      hardHistory.push(session.date); hardByWeek.set(week, (hardByWeek.get(week) || 0) + 1);
    }
  }
  const hardLimit = profile.experience === 'experienced' && profile.goal === 'performance' && profile.weeklyHours >= 8 ? 2 : 1;
  for (const session of sessions) {
    if (session.type !== 'intervals' || session.date < dateKey(today) || completedIds.has(session.id)) continue;
    const week = dateKey(mondayOf(session.date));
    if ((hardByWeek.get(week) || 0) >= hardLimit || hardHistory.some(date => Math.abs(daysBetween(date, session.date)) < 2)) {
      changeSession(session, 'endurance', session.minutes);
      adapt(session, pair('Changed to easy endurance to separate hard sessions and include your other sports.', 'Omgezet naar rustige duurtraining om zware trainingen te spreiden en je andere sporten mee te tellen.'));
    } else { hardByWeek.set(week, (hardByWeek.get(week) || 0) + 1); hardHistory.push(session.date); }
  }
  // The ramp, recovery and taper limits also apply to manually extended rides.
  for (const [week, limit] of weekLimits) {
    const items = sessions.filter(session => dateKey(mondayOf(session.date)) === week && session.type !== 'race');
    // Actual duration replaces the completed session's planned budget cost.
    // Manual activities count too; an event log is kept separate, like its plan.
    const actualMinutes = [...completedLogs.values()].filter(log => dateKey(mondayOf(log.date)) === week && baseline.get(log.sessionId)?.type !== 'race' && !String(log.sessionId).startsWith('race-')).reduce((sum, log) => sum + number(log.minutes), 0);
    const remainingPlanMinutes = items.filter(session => !completedIds.has(session.id)).reduce((sum, session) => sum + session.minutes, 0);
    let excess = Math.max(0, remainingPlanMinutes + actualMinutes - limit);
    const adjustable = items.filter(session => session.date >= dateKey(today) && !completedIds.has(session.id) && session.type !== 'rest').sort((a, b) => Number(a.type === 'other') - Number(b.type === 'other') || b.minutes - a.minutes);
    for (const session of adjustable) {
      if (excess <= 0) break;
      const reduction = Math.min(session.minutes, Math.ceil(excess / 5) * 5);
      const newMinutes = Math.max(0, session.minutes - reduction);
      excess -= reduction;
      if (newMinutes === 0) changeSession(session, 'rest', 0);
      else { session.minutes = newMinutes; session.blocks = blocksFor(session.type, newMinutes, session.phase); if (session.type === 'intervals' && newMinutes < 35) changeSession(session, 'endurance', newMinutes); }
      adapt(session, pair('Shortened to keep this week within your progression, recovery and time budget.', 'Ingekort om deze week binnen je opbouw-, herstel- en tijdsbudget te houden.'));
    }
    if (excess > 0) addNote('Past or completed sessions exceed this week’s planned budget. They are preserved; the plan does not add catch-up work.', 'Eerdere of afgeronde trainingen overschrijden het geplande weekbudget. Ze blijven behouden; het plan voegt geen inhaaltraining toe.');
  }
  // A moved session can leave an empty day: retain a readable calendar.
  for (let date = start; date < race; date = addDays(date, 1)) {
    if (!sessions.some(session => session.date === dateKey(date))) sessions.push(makeSession(date, 'rest', 0, getPhase(date, race), `empty-${dateKey(date)}`));
  }
  addNote('Your weekly hours include all sports. Missed sessions are never replaced by extra intensity; return to the next suitable session.', 'Je weekuren omvatten alle sporten. Gemiste trainingen worden nooit vervangen door extra intensiteit; pak de volgende passende training op.');
  addNote('The plan uses transparent local adaptation rules informed by endurance research. It is not a validated performance or medical model.', 'Het plan gebruikt transparante lokale aanpassingsregels op basis van duuronderzoek. Het is geen gevalideerd prestatie- of medisch model.');
  return { sessions: sessions.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)), notes, phase: getPhase(today, race), weeklyBudgetMinutes: budget, weekLimits: Object.fromEntries(weekLimits) };
}

export function summarizeWeek(sessions = []) {
  const active = sessions.filter(session => session.minutes > 0);
  const raceMinutes = active.filter(session => session.type === 'race').reduce((sum, session) => sum + session.minutes, 0);
  const otherMinutes = active.filter(session => session.type === 'other' || session.type === 'strength').reduce((sum, session) => sum + session.minutes, 0);
  const totalMinutes = active.reduce((sum, session) => sum + session.minutes, 0);
  const trainingMinutes = totalMinutes - raceMinutes;
  const hardMinutes = active.filter(session => session.type !== 'race').reduce((sum, session) => sum + (session.type === 'other' && session.rpe >= 7 ? session.minutes : (session.blocks || []).filter(block => block.intensity >= 0.85).reduce((minutes, block) => minutes + block.minutes, 0)), 0);
  return { totalMinutes, trainingMinutes, raceMinutes, otherMinutes, cyclingMinutes: totalMinutes - otherMinutes, easyMinutes: Math.max(0, trainingMinutes - hardMinutes), hardMinutes, hardSessions: active.filter(session => session.type === 'intervals' || session.rpe >= 7 && session.type !== 'race').length, hours: Number((totalMinutes / 60).toFixed(1)), activeDays: new Set(active.map(session => session.date)).size, workoutCount: active.length, trainingLoad: active.reduce((sum, session) => sum + session.minutes * session.rpe, 0), intensityShare: trainingMinutes ? hardMinutes / trainingMinutes : 0 };
}
