import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {escapeHTML, isDate, validateBackup, calendarICS, validateAIChanges} from '../public/utils.js';

function backup() {
  return {
    version: 1, lang: 'nl', configured: false,
    profile: {
      name: 'Mila', raceDate: '2027-04-17', startDate: '2026-10-12',
      weeklyHours: 8, currentHours: 4, distance: 150,
      availableDays: [1, 3, 5], experience: 'regular', goal: 'finish',
      otherSports: [{name: 'Running', day: 2, minutes: 40, intensity: 'easy'}]
    },
    logs: [{sessionId: 'ride-1', date: '2026-10-12', minutes: 45, rpe: 3}],
    checkins: [{date: '2026-10-12', sleepHours: 7, fatigue: 2, soreness: 2, stress: 2}],
    overrides: {'ride-2': {date: '2026-10-14', minutes: 60}},
    chat: [{role: 'user', text: 'How should I pace the hills?'}],
    prep: {helmet: true}
  };
}

test('HTML escaping prevents markup and attribute injection', () => {
  assert.equal(escapeHTML(`<img src="x" onerror='bad'>&`), '&lt;img src=&quot;x&quot; onerror=&#39;bad&#39;&gt;&amp;');
  assert.equal(escapeHTML(null), '');
});

test('dates must be complete ISO calendar dates, including leap-day validity', () => {
  for (const date of ['2027-04-17', '2028-02-29', '2026-12-31']) assert.equal(isDate(date), true, date);
  for (const date of ['2027-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026-1-01', '17-04-2027', '2027-04-17T08:00:00Z', '', null]) {
    assert.equal(isDate(date), false, String(date));
  }
});

test('valid backup restores athlete history and strips unrelated top-level secrets', () => {
  const input = backup();
  input.apiKey = 'dummy-not-a-key';
  const restored = validateBackup(input);
  assert.deepEqual(restored.profile, input.profile);
  assert.deepEqual(restored.logs, input.logs);
  assert.deepEqual(restored.checkins, input.checkins);
  assert.deepEqual(restored.overrides, input.overrides);
  assert.deepEqual(restored.prep, input.prep);
  assert.equal(restored.lang, 'nl');
  assert.equal(restored.configured, true);
  assert.equal(Object.hasOwn(restored, 'apiKey'), false);
});

test('backup normalizes language, limits display names and filters malformed chat records', () => {
  const input = backup();
  input.lang = 'unknown';
  input.profile.name = 'A'.repeat(100);
  input.chat = [null, {role: 'system', text: 'ignored'}, {role: 'user', text: 42}, {role: 'assistant', text: 'B'.repeat(13000)}];
  const restored = validateBackup(input);
  assert.equal(restored.lang, 'en');
  assert.equal(restored.profile.name.length, 80);
  assert.equal(restored.chat.length, 1);
  assert.equal(restored.chat[0].text.length, 12000);
});

test('backup rejects unsupported formats and malformed training profiles', () => {
  for (const value of [null, {}, {...backup(), version: 2}, {...backup(), profile: null}]) assert.throws(() => validateBackup(value));
  const changes = [
    ['raceDate', '2027-02-29'], ['startDate', '2026-02-30'],
    ['weeklyHours', 0], ['weeklyHours', 31], ['weeklyHours', '8'], ['weeklyHours', Infinity],
    ['currentHours', -1], ['currentHours', 31], ['currentHours', NaN],
    ['distance', 175], ['availableDays', []], ['availableDays', [7]], ['availableDays', [1.5]],
    ['experience', 'professional'], ['goal', 'win'], ['otherSports', null]
  ];
  for (const [field, value] of changes) {
    const input = backup(); input.profile[field] = value;
    assert.throws(() => validateBackup(input), undefined, `${field}: ${String(value)}`);
  }
});

test('backup rejects malformed other sports, activity and recovery history', () => {
  const mutations = [
    value => {value.profile.otherSports[0].day = -1;},
    value => {value.profile.otherSports[0].minutes = 301;},
    value => {value.profile.otherSports[0].intensity = 'maximum';},
    value => {value.logs = {};},
    value => {value.logs = Array(5001).fill(backup().logs[0]);},
    value => {value.logs[0].date = '2026-04-31';},
    value => {value.logs[0].sessionId = 4;},
    value => {value.logs[0].minutes = -1;},
    value => {value.logs[0].rpe = 11;},
    value => {value.logs[0].rpe = 0;},
    value => {value.logs[0] = null;},
    value => {value.checkins = null;},
    value => {value.checkins[0].date = '2026-02-30';},
    value => {value.checkins[0].sleepHours = 25;},
    value => {value.checkins[0].fatigue = 0;},
    value => {value.checkins[0].soreness = 6;},
    value => {value.checkins[0].stress = NaN;},
    value => {value.chat = 'not an array';},
    value => {value.overrides = [];},
    value => {value.overrides['ride-2'].date = '2026-02-31';},
    value => {value.overrides['ride-2'].minutes = -1;},
    value => {value.overrides['ride-2'].minutes = 1501;},
    value => {value.overrides['ride-2'] = null;}
  ];
  for (const mutate of mutations) {
    const input = backup(); mutate(input);
    assert.throws(() => validateBackup(input), undefined, mutate.toString());
  }
});

test('ICS export escapes text, creates all-day events and excludes zero-minute rest days', () => {
  const sessions = [
    {id: 'ride-1', date: '2027-04-16', type: 'endurance', minutes: 45, rpe: 3, title: {en: 'Spin, easy; \\ calm', nl: 'Rustige rit'}, description: {en: 'Line one\nLine two, keep; easy\\steady'}},
    {id: 'rest-1', date: '2027-04-16', type: 'rest', minutes: 0, rpe: 0},
    {id: 'race-1', date: '2027-04-17', type: 'race', minutes: 0, rpe: 0, title: {en: 'AGR'}, description: {en: 'Event day'}}
  ];
  const exported = calendarICS(sessions, 'en');
  const unfolded = exported.replace(/\r\n[ \t]/g, '');
  assert.ok(exported.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(exported.endsWith('END:VCALENDAR\r\n'));
  assert.equal((exported.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.ok(unfolded.includes('UID:ride-1@agr-studio.local\r\n'));
  assert.ok(unfolded.includes('DTSTART;VALUE=DATE:20270416\r\nDTEND;VALUE=DATE:20270417\r\n'));
  assert.ok(unfolded.includes('SUMMARY:Spin\\, easy\\; \\\\ calm\r\n'));
  assert.ok(unfolded.includes('DESCRIPTION:45 min · RPE 3\\nLine one\\nLine two\\, keep\\; easy\\\\steady\r\n'));
  assert.match(unfolded, /DTSTAMP:\d{8}T\d{6}Z\r\n/);
  assert.equal(unfolded.includes('rest-1'), false);
  assert.ok(calendarICS(sessions, 'nl').includes('SUMMARY:Rustige rit\r\n'));
});

test('ICS folding respects UTF-8 octet limits without corrupting Unicode', () => {
  const title = 'Één heuvel 🚲 '.repeat(25);
  const exported = calendarICS([{id: 'unicode', date: '2027-04-17', type: 'endurance', minutes: 60, rpe: 3, title: {en: title}, description: {en: title}}]);
  assert.ok(exported.includes('\r\n '), 'long properties should be folded');
  for (const line of exported.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, line);
  const unfolded = exported.replace(/\r\n[ \t]/g, '');
  assert.ok(unfolded.includes(`SUMMARY:${title}\r\n`));
  assert.equal(unfolded.includes('\uFFFD'), false);
});

test('all-day ICS end dates remain the next calendar day across Amsterdam DST and year boundaries', () => {
  const utilsUrl = new URL('../public/utils.js', import.meta.url).href;
  const code = `import {calendarICS} from ${JSON.stringify(utilsUrl)}; const dates=['2027-03-28','2027-10-31','2027-12-31']; console.log(calendarICS(dates.map((date,i)=>({id:String(i),date,type:'endurance',minutes:60,rpe:3}))));`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], {encoding: 'utf8', env: {...process.env, TZ: 'Europe/Amsterdam'}});
  assert.equal(child.status, 0, child.stderr);
  assert.ok(child.stdout.includes('DTSTART;VALUE=DATE:20270328\r\nDTEND;VALUE=DATE:20270329'));
  assert.ok(child.stdout.includes('DTSTART;VALUE=DATE:20271031\r\nDTEND;VALUE=DATE:20271101'));
  assert.ok(child.stdout.includes('DTSTART;VALUE=DATE:20271231\r\nDTEND;VALUE=DATE:20280101'));
});

const today = '2026-10-12';
function schedule() {
  return [
    {id: 'future', date: '2026-10-14', type: 'endurance', minutes: 90},
    {id: 'today', date: today, type: 'tempo', minutes: 60},
    {id: 'past', date: '2026-10-11', type: 'endurance', minutes: 60},
    {id: 'logged', date: '2026-10-13', type: 'endurance', minutes: 60},
    {id: 'completed', date: '2026-10-13', type: 'endurance', minutes: 60, completed: true},
    {id: 'race', date: '2027-04-17', type: 'race', minutes: 300},
    {id: 'other', date: '2026-10-14', type: 'other', minutes: 45}
  ];
}
const history = [{sessionId: 'logged'}];
const change = (sessionId = 'future', minutes = 45, type = 'recovery') => ({sessionId, minutes, type, reason: 'Reduce load'});

test('AI edits accept only conservative changes to eligible sessions and return a bounded reason', () => {
  const changes = [change(), change('today', 0, 'rest')];
  assert.deepEqual(validateAIChanges(changes, schedule(), history, today), changes);
  assert.deepEqual(validateAIChanges([], schedule(), history, today), []);
  assert.equal(validateAIChanges([{...change(), reason: 'x'.repeat(600)}], schedule(), history, today)[0].reason.length, 500);
  assert.equal(validateAIChanges([change('future', 90, 'keep')], schedule(), history, today)[0].minutes, 90);
});

test('AI edits reject completed, logged, past, race, other-sport and unknown sessions', () => {
  for (const id of ['completed', 'logged', 'past', 'race', 'other', 'unknown']) {
    assert.throws(() => validateAIChanges([change(id)], schedule(), history, today), undefined, id);
  }
});

test('AI edits reject increases, invalid minutes, unsupported types, duplicate targets and malformed requests', () => {
  const invalid = [
    [change('future', 91)], [change('future', -1)], [change('future', 45.5)],
    [change('future', '45')], [change('future', NaN)], [change('future', 1, 'rest')],
    [change('future', 30, 'intervals')], [change(), change('future', 0, 'rest')],
    [null], [{}], null, {}, Array(15).fill(change())
  ];
  for (const changes of invalid) assert.throws(() => validateAIChanges(changes, schedule(), history, today));
});
