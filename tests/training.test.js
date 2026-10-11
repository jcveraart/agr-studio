import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, dateKey, addDays, mondayOf, getPhase, getWorkoutLibrary, summarizeWeek } from '../public/training.js';

const profile = {
  name: 'Jan', weeklyHours: 6, currentHours: 4, experience: 'regular', goal: 'strong',
  distance: 150, raceDate: '2027-04-17', startDate: '2026-10-12', ftp: 220, maxHR: 185,
  availableDays: [1, 2, 3, 4, 5, 6, 0], longRideDay: 6,
  otherSports: [{ name: 'Run', day: 3, minutes: 45, intensity: 'easy' }],
};
const now = new Date(2026, 9, 11);
const makePlan = (patch = {}, logs = [], checkins = [], overrides = {}, when = now) => createPlan({ ...profile, ...patch }, logs, checkins, overrides, when);
const keyOfWeek = session => dateKey(mondayOf(session.date));
function groupWeeks(sessions) {
  const weeks = new Map();
  sessions.forEach(session => {
    const key = keyOfWeek(session);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key).push(session);
  });
  return weeks;
}

test('calendar helpers retain local days across daylight-saving boundaries', () => {
  assert.equal(dateKey(new Date(2026, 9, 25, 0, 30)), '2026-10-25');
  assert.equal(dateKey(addDays('2026-10-24', 2)), '2026-10-26');
  assert.equal(dateKey(mondayOf('2026-10-25')), '2026-10-19');
  assert.equal(dateKey(mondayOf('2026-10-26')), '2026-10-26');
  assert.equal(dateKey('2026-02-30'), '');
});

test('phases distinguish event day, taper, specificity, build and base', () => {
  assert.equal(getPhase('2027-04-18', profile.raceDate), 'complete');
  assert.equal(getPhase(profile.raceDate, profile.raceDate), 'race');
  assert.equal(getPhase('2027-04-10', profile.raceDate), 'taper');
  assert.equal(getPhase('2027-03-20', profile.raceDate), 'specific');
  assert.equal(getPhase('2027-02-01', profile.raceDate), 'build');
  assert.equal(getPhase('2026-10-12', profile.raceDate), 'base');
});

test('full plan has stable unique IDs, bilingual detail, exact workout block durations and one event', () => {
  const first = makePlan(), second = makePlan();
  assert.deepEqual(first, second);
  assert.equal(new Set(first.sessions.map(session => session.id)).size, first.sessions.length);
  assert.equal(first.sessions.filter(session => session.type === 'race').length, 1);
  assert.equal(first.sessions.at(-1).date, profile.raceDate);
  for (const session of first.sessions) {
    assert.ok(session.title.en && session.title.nl);
    assert.ok(session.description.en && session.description.nl);
    assert.ok(Number.isFinite(session.minutes) && session.minutes >= 0);
    assert.equal(session.blocks.reduce((sum, block) => sum + block.minutes, 0), session.minutes, session.id);
  }
});

test('every week fits its progression budget and total availability, including other sports', () => {
  for (const hours of [0, 1, 3, 6, 12, 24]) {
    const plan = makePlan({ weeklyHours: hours, currentHours: hours * 0.7 });
    for (const [week, sessions] of groupWeeks(plan.sessions)) {
      const summary = summarizeWeek(sessions);
      assert.ok(summary.trainingMinutes <= plan.weeklyBudgetMinutes, `${hours}h ${week}`);
      assert.ok(summary.trainingMinutes <= plan.weekLimits[week], `${hours}h ramp ${week}`);
    }
  }
});

test('beginners start below availability, progress gradually and receive regular lighter weeks', () => {
  const plan = makePlan({ experience: 'beginner', weeklyHours: 10, currentHours: 2, otherSports: [] });
  const limits = Object.values(plan.weekLimits);
  assert.equal(limits[0], 120);
  assert.ok(limits[1] <= limits[0] * 1.1);
  assert.ok(limits[2] <= limits[1] * 1.1);
  assert.ok(limits[3] < limits[2] * 0.8);
  assert.ok(plan.sessions.filter(session => session.phase === 'recovery').every(session => session.type !== 'intervals'));
  assert.ok(plan.sessions.filter(session => session.date < '2026-11-02').every(session => session.type !== 'intervals'));
});

test('hard other sports consume quality allowance and cycling avoids adjacent hard sessions', () => {
  const plan = makePlan({ experience: 'experienced', goal: 'performance', weeklyHours: 12, currentHours: 10,
    otherSports: [{ name: 'Hard run', day: 3, minutes: 60, intensity: 'hard' }] });
  const hard = plan.sessions.filter(session => session.minutes > 0 && (session.type === 'intervals' || session.type === 'other' && session.rpe >= 7));
  for (let index = 1; index < hard.length; index++) {
    const previous = new Date(`${hard[index - 1].date}T12:00:00`), next = new Date(`${hard[index].date}T12:00:00`);
    assert.ok((next - previous) / 86400000 > 1.9, `${hard[index - 1].date} / ${hard[index].date}`);
  }
  for (const sessions of groupWeeks(plan.sessions).values()) assert.ok(summarizeWeek(sessions).hardSessions <= 2);
  const twoSports = makePlan({ otherSports: [{ name: 'Run', day: 2, minutes: 60, intensity: 'hard' }, { name: 'Gym', day: 5, minutes: 60, intensity: 'hard' }] });
  assert.equal(twoSports.sessions.filter(session => session.type === 'intervals').length, 0);
});

test('cycling honors available days and moves long ride to an available fallback', () => {
  const plan = makePlan({ availableDays: [2, 0], longRideDay: 6, otherSports: [] });
  const rides = plan.sessions.filter(session => session.minutes > 0 && session.type !== 'race');
  assert.ok(rides.length > 0);
  assert.ok(rides.every(session => [2, 0].includes(new Date(`${session.date}T12:00:00`).getDay())));
  assert.ok(rides.filter(session => session.type === 'long').every(session => new Date(`${session.date}T12:00:00`).getDay() === 0));
  assert.equal(makePlan({ availableDays: [], otherSports: [] }).sessions.filter(session => session.minutes > 0 && session.type !== 'race').length, 0);
});

test('overbooked other sports are visibly shortened and never exceed the time limit', () => {
  const plan = makePlan({ weeklyHours: 1, currentHours: 1, otherSports: [
    { name: 'Run', day: 2, minutes: 120, intensity: 'hard' },
    { name: 'Swim', day: 5, minutes: 60, intensity: 'easy' },
  ] });
  assert.ok(plan.notes.some(note => note.en.includes('exceed')));
  assert.ok(plan.sessions.some(session => session.type === 'other' && session.adapted));
  assert.ok(plan.sessions.every(session => session.type !== 'intervals'));
  for (const sessions of groupWeeks(plan.sessions).values()) assert.ok(summarizeWeek(sessions).trainingMinutes <= 60);
});

test('readiness only eases forthcoming uncompleted work and preserves past sessions', () => {
  const when = new Date(2026, 10, 9), baseline = makePlan({}, [], [], {}, when);
  const completed = baseline.sessions.find(session => session.date === '2026-11-09' && session.minutes > 0);
  const logs = completed ? [{ sessionId: completed.id, date: completed.date, minutes: completed.minutes, rpe: completed.rpe, feeling: 'good' }] : [];
  const adjusted = makePlan({}, logs, [{ date: '2026-11-09', sleepHours: 5, fatigue: 4, soreness: 2, stress: 2, wellness: 'good' }], {}, when);
  const original = new Map(baseline.sessions.map(session => [session.id, session]));
  for (const session of adjusted.sessions) {
    if (session.date < '2026-11-09' || session.id === completed?.id) assert.deepEqual(session, original.get(session.id));
    if (session.date >= '2026-11-09' && session.date <= '2026-11-11' && session.id !== completed?.id) {
      assert.ok(session.minutes <= original.get(session.id).minutes);
      assert.notEqual(session.type, 'intervals');
    }
  }
  assert.ok(adjusted.sessions.some(session => session.adapted));
});

test('pain or illness pauses upcoming training and does not claim event readiness', () => {
  const when = new Date(2026, 10, 9);
  const plan = makePlan({}, [], [{ date: '2026-11-09', sleepHours: 8, fatigue: 2, soreness: 2, stress: 2, wellness: 'ill' }], {}, when);
  assert.ok(plan.sessions.filter(session => session.date >= '2026-11-09' && session.date <= '2026-11-11').every(session => session.minutes === 0));
  assert.ok(plan.notes.some(note => note.en.includes('paused')));
  const pain = makePlan({}, [{ sessionId: 'external', date: '2026-11-08', minutes: 30, rpe: 3, feeling: 'okay', pain: true }], [], {}, when);
  assert.ok(pain.sessions.filter(session => session.date >= '2026-11-09' && session.date <= '2026-11-11').every(session => session.minutes === 0));
});

test('future feedback is ignored, and missed sessions do not create catch-up work', () => {
  const when = new Date(2026, 10, 9);
  const baseline = makePlan({}, [], [], {}, when);
  const ignored = makePlan({}, [], [{ date: '2026-12-09', sleepHours: 2, fatigue: 5, wellness: 'ill' }], {}, when);
  assert.deepEqual(ignored.sessions, baseline.sessions);
  const missed = makePlan({}, [{ sessionId: 'ride-2026-11-08', date: '2026-11-08', minutes: 0, rpe: 0, feeling: 'okay' }], [], {}, when);
  assert.deepEqual(missed.sessions, baseline.sessions);
});

test('unexpectedly high session RPE lightens the next days', () => {
  const when = new Date(2026, 10, 9);
  const plan = makePlan({}, [{ sessionId: 'ride-2026-11-07', date: '2026-11-08', minutes: 80, rpe: 9, feeling: 'okay' }], [], {}, when);
  assert.ok(plan.notes.some(note => note.en.includes('harder than planned')));
  assert.ok(plan.sessions.some(session => session.date === '2026-11-09' && session.adapted));
});

test('manual duration and date changes retain stable IDs while preserving budget and spacing', () => {
  const initial = makePlan();
  const ride = initial.sessions.find(session => session.type === 'long');
  const edit = { [ride.id]: { minutes: 500, date: '2026-10-13', type: 'intervals', title: 'My climb ride' },
    'ride-2026-10-12': { minutes: 90, type: 'intervals' } };
  const plan = makePlan({}, [], [], edit);
  const edited = plan.sessions.find(session => session.id === ride.id);
  assert.equal(edited.date, '2026-10-13');
  assert.ok(edited.adapted);
  assert.ok(edited.minutes < 500);
  const hard = plan.sessions.filter(session => session.type === 'intervals' && session.date <= '2026-10-18');
  assert.ok(hard.length <= 1);
  for (const [week, sessions] of groupWeeks(plan.sessions)) assert.ok(summarizeWeek(sessions).trainingMinutes <= plan.weekLimits[week]);
});

test('a manual quality session respects completed hard work earlier in the week', () => {
  const when = new Date(2026, 9, 20);
  const baseline = makePlan({}, [], [], {}, when);
  const previousHard = baseline.sessions.find(session => session.date === '2026-10-19' && session.type === 'intervals');
  assert.ok(previousHard);
  const future = baseline.sessions.find(session => session.date === '2026-10-20' && session.type !== 'other');
  assert.ok(future);
  const logs = [{ sessionId: previousHard.id, date: previousHard.date, minutes: previousHard.minutes, rpe: previousHard.rpe, feeling: 'good' }];
  const adjusted = makePlan({}, logs, [], { [future.id]: { type: 'intervals', minutes: 45 } }, when);
  assert.equal(adjusted.sessions.find(session => session.id === future.id).type, 'endurance');
  assert.deepEqual(adjusted.sessions.find(session => session.id === previousHard.id), previousHard);
});

test('actual and manual activity minutes replace planned cost and reduce remaining weekly work', () => {
  const when = new Date(2026, 10, 10), original = makePlan({}, [], [], {}, when);
  const completed = original.sessions.find(session => session.date === '2026-11-09' && session.minutes > 0);
  assert.ok(completed);
  const logs = [
    { sessionId: completed.id, date: completed.date, minutes: 120, rpe: completed.rpe, feeling: 'good' },
    { sessionId: 'manual-run', date: '2026-11-10', minutes: 45, rpe: 3, feeling: 'good' },
  ];
  const adjusted = makePlan({}, logs, [], {}, when);
  const week = '2026-11-09';
  const completedIds = new Set(logs.map(log => log.sessionId));
  const remaining = adjusted.sessions.filter(session => keyOfWeek(session) === week && !completedIds.has(session.id)).reduce((sum, session) => sum + session.minutes, 0);
  assert.ok(remaining + 165 <= adjusted.weekLimits[week]);
  assert.deepEqual(adjusted.sessions.find(session => session.id === completed.id), completed);
  assert.ok(adjusted.sessions.some(session => session.date >= '2026-11-10' && session.date <= '2026-11-15' && session.adapted));
  const futureLog = [{ sessionId: 'ride-2026-11-14', date: '2026-11-14', minutes: 500, rpe: 3, feeling: 'good' }];
  assert.deepEqual(makePlan({}, futureLog, [], {}, when).sessions, original.sessions);
});

test('busy-week hour caps include other sports and never increase global availability', () => {
  const caps = { '2026-10-12': 1, '2026-10-19': 0, '2026-10-26': 99, '2026-11-02': -4, '2026-11-09': NaN, '2026-11-10': 0, 'invalid': 0 };
  const capped = makePlan({ weeklyHoursByWeek: caps });
  const baseline = makePlan();
  assert.equal(capped.weekLimits['2026-10-12'], 60);
  assert.equal(capped.weekLimits['2026-10-19'], 0);
  assert.equal(capped.weekLimits['2026-10-26'], baseline.weekLimits['2026-10-26']);
  assert.equal(capped.weekLimits['2026-11-02'], baseline.weekLimits['2026-11-02']);
  assert.equal(capped.weekLimits['2026-11-09'], baseline.weekLimits['2026-11-09']);
  for (const [week, sessions] of groupWeeks(capped.sessions)) assert.ok(summarizeWeek(sessions).trainingMinutes <= capped.weekLimits[week]);
  const sportOnly = makePlan({ weeklyHoursByWeek: { '2026-10-12': 0.5 } });
  const firstWeek = sportOnly.sessions.filter(session => keyOfWeek(session) === '2026-10-12');
  assert.equal(summarizeWeek(firstWeek).trainingMinutes, 30);
  assert.equal(summarizeWeek(firstWeek).otherMinutes, 30);
  assert.ok(firstWeek.some(session => session.type === 'other' && session.adapted));
});

test('new cap in an underway week preserves completed/past details and reduces only remaining work', () => {
  const when = new Date(2026, 10, 11);
  const original = makePlan({}, [], [], {}, when);
  const completed = original.sessions.find(session => session.date === '2026-11-09' && session.minutes > 0);
  const logs = [{ sessionId: completed.id, date: completed.date, minutes: 100, rpe: completed.rpe, feeling: 'good' }];
  const cap = makePlan({ weeklyHoursByWeek: { '2026-11-09': 1.5 } }, logs, [], {}, when);
  assert.equal(cap.weekLimits['2026-11-09'], 90);
  for (const session of cap.sessions.filter(session => session.date < '2026-11-11')) assert.deepEqual(session, original.sessions.find(item => item.id === session.id));
  assert.ok(cap.sessions.filter(session => session.date >= '2026-11-11' && session.date <= '2026-11-15').every(session => session.minutes === 0));
  assert.ok(cap.notes.some(note => note.en.includes('exceed this week')));
});

test('persistent sport IDs survive removal and reordering without attaching logs or edits to another sport', () => {
  const run = { id: 'run-identity', name: 'Running', day: 3, minutes: 45, intensity: 'easy' };
  const swim = { id: 'swim-identity', name: 'Swimming', day: 5, minutes: 30, intensity: 'easy' };
  const first = makePlan({ otherSports: [run, swim] });
  const reversed = makePlan({ otherSports: [swim, run] });
  const removed = makePlan({ otherSports: [swim] });
  const firstSwim = first.sessions.find(session => session.type === 'other' && session.title.en === 'Swimming');
  assert.ok(firstSwim.id.endsWith('swim-identity'));
  assert.equal(reversed.sessions.find(session => session.date === firstSwim.date && session.title.en === 'Swimming').id, firstSwim.id);
  assert.equal(removed.sessions.find(session => session.date === firstSwim.date && session.title.en === 'Swimming').id, firstSwim.id);
  const edit = makePlan({ otherSports: [swim, run] }, [], [], { [firstSwim.id]: { minutes: 20 } });
  assert.equal(edit.sessions.find(session => session.id === firstSwim.id).minutes, 20);
  assert.equal(edit.sessions.find(session => session.id === firstSwim.id).title.en, 'Swimming');
  const legacy = makePlan({ otherSports: [{ name: 'Legacy sport', day: 3, minutes: 30, intensity: 'easy' }] });
  assert.ok(legacy.sessions.find(session => session.type === 'other').id.endsWith('-0'));
});

test('taper reduces load and event time stays separate from the training budget', () => {
  const plan = makePlan({ weeklyHours: 8, currentHours: 8, otherSports: [] });
  assert.ok(plan.weekLimits['2027-04-05'] < plan.weekLimits['2027-03-29'] * 0.7);
  assert.ok(plan.weekLimits['2027-04-12'] < plan.weekLimits['2027-04-05']);
  const eventWeek = summarizeWeek(plan.sessions.filter(session => keyOfWeek(session) === '2027-04-12'));
  assert.ok(eventWeek.raceMinutes > 0);
  assert.equal(eventWeek.totalMinutes, eventWeek.raceMinutes + eventWeek.trainingMinutes);
  assert.ok(plan.sessions.filter(session => session.date >= '2027-04-10').every(session => session.type !== 'long'));
});

test('empty and malformed input, zero load and passed events fail gently', () => {
  assert.equal(createPlan({}, [], [], {}, now).sessions.length, 0);
  assert.equal(makePlan({ raceDate: '2026-09-01' }).phase, 'complete');
  assert.equal(makePlan({ raceDate: '2027-02-30' }).sessions.length, 0);
  const plan = makePlan({ weeklyHours: 5, currentHours: 0, experience: 'beginner', otherSports: [] });
  assert.ok(plan.weekLimits['2026-10-12'] <= 90);
  assert.ok(plan.sessions.filter(session => session.date <= '2026-10-18').every(session => session.type !== 'intervals'));
  assert.ok(makePlan({ raceDate: '2026-11-01' }).notes.some(note => note.en.includes('eight weeks')));
});

test('library localizes all workout types, and most cycling time remains easy', () => {
  const en = getWorkoutLibrary('en'), nl = getWorkoutLibrary('nl');
  assert.equal(en.length, 8);
  assert.equal(nl.length, en.length);
  assert.notEqual(en.find(item => item.type === 'long').title, nl.find(item => item.type === 'long').title);
  const plan = makePlan({ experience: 'experienced', goal: 'performance', weeklyHours: 10, currentHours: 9, otherSports: [] });
  for (const sessions of groupWeeks(plan.sessions).values()) assert.ok(summarizeWeek(sessions).intensityShare <= 0.2);
});

test('seeded difficult schedules and manual moves preserve constraints', () => {
  let seed = 923;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  for (let trial = 0; trial < 90; trial++) {
    const patch = {
      weeklyHours: 0.5 + Math.floor(random() * 59) / 2,
      currentHours: Math.floor(random() * 60) / 2,
      availableDays: [0, 1, 2, 3, 4, 5, 6].filter(() => random() < 0.45),
      longRideDay: Math.floor(random() * 7),
      experience: ['beginner', 'regular', 'experienced'][Math.floor(random() * 3)],
      goal: ['finish', 'strong', 'performance'][Math.floor(random() * 3)],
      distance: [65, 100, 125, 150, 200, 240][Math.floor(random() * 6)],
      otherSports: Array.from({ length: Math.floor(random() * 5) }, (_, index) => ({ name: `Sport ${index}`, day: Math.floor(random() * 7), minutes: 15 + Math.floor(random() * 12) * 15, intensity: ['easy', 'moderate', 'hard'][Math.floor(random() * 3)] })),
    };
    const original = makePlan(patch);
    const movable = original.sessions.filter(session => session.type !== 'race');
    const overrides = {};
    for (let edit = 0; edit < 5; edit++) {
      const session = movable[Math.floor(random() * movable.length)];
      overrides[session.id] = { date: dateKey(addDays(profile.startDate, Math.floor(random() * 185))), minutes: Math.floor(random() * 120) * 5, type: ['long', 'intervals', 'endurance', 'recovery', 'rest'][Math.floor(random() * 5)] };
    }
    const edited = makePlan(patch, [], [], overrides);
    for (const [week, sessions] of groupWeeks(edited.sessions)) {
      assert.ok(summarizeWeek(sessions).trainingMinutes <= edited.weekLimits[week], `trial ${trial} week ${week}`);
    }
    const intervals = edited.sessions.filter(session => session.type === 'intervals');
    const otherHard = edited.sessions.filter(session => session.type === 'other' && session.rpe >= 7 && session.minutes > 0);
    for (const session of intervals) {
      const others = [...intervals.filter(other => other.id !== session.id), ...otherHard];
      assert.ok(others.every(other => Math.abs(new Date(`${session.date}T12:00:00`) - new Date(`${other.date}T12:00:00`)) / 86400000 > 1.9), `trial ${trial} interval ${session.date}`);
    }
    for (const session of edited.sessions) assert.equal(session.blocks.reduce((sum, block) => sum + block.minutes, 0), session.minutes, `trial ${trial} blocks ${session.id}`);
  }
});
