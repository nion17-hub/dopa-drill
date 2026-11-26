// Session planning (which skills to ask) and per-skill progress.
// Pure logic over a plain progress object so it can be unit tested;
// persistence is handled by store.js.
import { SKILLS, SKILL, DEPTH, MASTERY, LANES, NEXT_GRADE, skillsOfGrade } from './skills.js';
const LANES_N = LANES.length;
import { makeProblem, signature } from './problems.js';
import { comboWindowMs } from './scoring.js';
import { daysBetween } from './growth.js';
import { plural, countOf } from './ru.js';

// Skills in a single easy -> hard order (placement walks along it).
export const ORDER = SKILLS.slice().sort((a, b) => DEPTH[a.id] - DEPTH[b.id] || a.grade - b.grade || SKILLS.indexOf(a) - SKILLS.indexOf(b)).map((s) => s.id);

// Placement walks grade by grade (prerequisites never come from a later grade).
export const PLACEMENT = SKILLS.slice().sort((a, b) => a.grade - b.grade || DEPTH[a.id] - DEPTH[b.id]).map((s) => s.id);

// The level check walks in the order of the school year (the SKILLS list,
// prerequisites first within a grade), not by tree depth.
export const YEAR = SKILLS.slice().sort((a, b) => a.grade - b.grade || SKILLS.indexOf(a) - SKILLS.indexOf(b)).map((s) => s.id);

// Skill-tree layout: each lane gets SUB columns and skills are placed grade
// by grade, so the tree reads top-down by school year. Grades 5-6 all sit
// below every grade 1-4 skill, after a blank row. Each skill takes the cheapest
// free cell at or up to two rows below its prerequisites: going lower costs 3
// per row, a same-column link passing behind another node 3 (so a slight
// overlap may be kept instead of dropping far down; the renderer detours
// it), leaving its chain's column 1.5 (add / multiply / decimal on the left,
// subtract / divide / fraction on the right), each column away from a
// prerequisite 1.
export const TREE_SUB = 2;
export const TREE_UPPER = 5;
const RIGHT_GENS = new Set(['hsub', 'hsub100', 'vsub', 'div', 'divRem', 'divTens', 'divPick', 'eqMulDiv', 'vdiv', 'fracOf', 'frac', 'gcdlcm', 'ratio', 'letter']);
const prefSub = (sk) => (RIGHT_GENS.has(sk.gen[0]) ? 1 : 0);
export const TREE_LAYOUT = (() => {
  const row = {}; const col = {}; const occ = new Set();
  const key = (c, r) => `${c}:${r}`;
  const behind = (c, r0, r1) => { for (let r = r0 + 1; r < r1; r++) if (occ.has(key(c, r))) return true; return false; };
  let floor = 0;
  for (const id of PLACEMENT) {
    const sk = SKILL[id];
    if (sk.grade >= TREE_UPPER && !floor) floor = Math.max(0, ...Object.values(row)) + 2;
    const base = Math.max(sk.req.length ? Math.max(...sk.req.map((q) => row[q])) + 1 : 0, sk.grade >= TREE_UPPER ? floor : 0);
    let best = null;
    for (let r = base; !(best && r > base + 2); r++) {
      for (let k = 0; k < TREE_SUB; k++) {
        const c = sk.lane * TREE_SUB + k;
        if (occ.has(key(c, r))) continue;
        const cost = 3 * (r - base)
          + 3 * sk.req.filter((q) => col[q] === c && behind(c, row[q], r)).length
          + (k === prefSub(sk) ? 0 : 1.5)
          + sk.req.reduce((a, q) => a + Math.abs(col[q] - c), 0);
        if (!best || cost < best.cost) best = { c, r, cost };
      }
    }
    row[id] = best.r; col[id] = best.c; occ.add(key(best.c, best.r));
  }
  return { row, col, rows: Math.max(...Object.values(row)) + 1, cols: LANES_N * TREE_SUB };
})();

export function emptyProgress() { return { placed: false, skills: {}, review: [] }; }

const rec = (prog, id) => prog.skills[id] || (prog.skills[id] = { n: 0, hist: [], mastered: false, recent: [] });

export const isMastered = (prog, id) => !!(prog.skills[id] && prog.skills[id].mastered);
export const isUnlocked = (prog, id) => SKILL[id].req.every((r) => isMastered(prog, r));

export function stateOf(prog, id) {
  if (isMastered(prog, id)) return 'mastered';
  if (isUnlocked(prog, id)) return (prog.skills[id] && prog.skills[id].n) ? 'learning' : 'new';
  return 'locked';
}

// Mark a skill (and everything it depends on) as mastered.
export function masterWithAncestors(prog, id, at = Date.now()) {
  const r = rec(prog, id);
  r.mastered = true;
  if (!r.masteredAt) r.masteredAt = at;
  if (!r.grantedAt) r.grantedAt = at;
  r.stars = Math.max(r.stars || 0, 1);
  for (const p of SKILL[id].req) if (!isMastered(prog, p)) masterWithAncestors(prog, p, at);
}

// Growth records per skill (id033, provisional sizes).
export const TIMES_MAX = 30; // recent answers: time, cells, first try, slips, day
export const FIRST_MAX = 3; // the very first problems, kept whole for the time capsule
export const DAYS_MAX = 60; // one aggregate per played day

// Record one finished problem. Returns ids that became unlocked because of it.
// info (optional): { at, day, ms, cells, misses, problem } from a timed answer.
export function recordResult(prog, id, firstTry, sig, info = {}) {
  const at = info.at ?? Date.now();
  const before = new Set(SKILLS.filter((s) => isUnlocked(prog, s.id)).map((s) => s.id));
  const wasRusty = rustyOf(prog, at).includes(id);
  const r = rec(prog, id);
  r.n += 1;
  r.hist.push(firstTry ? 1 : 0);
  if (r.hist.length > MASTERY.window) r.hist.splice(0, r.hist.length - MASTERY.window);
  r.last = at;
  if (firstTry) r.lastOk = at;
  if (sig) { r.recent.push(sig); if (r.recent.length > 24) r.recent.splice(0, r.recent.length - 24); }
  if (info.ms != null && info.day) noteTiming(r, firstTry, info, at);
  const wasMastered = r.mastered;
  if (!r.mastered && r.hist.length >= MASTERY.window && r.hist.reduce((a, b) => a + b, 0) >= MASTERY.need) { r.mastered = true; r.masteredAt = at; }
  const stars = updateStars(r, SKILL[id].grade, info.day || null);
  const unlocked = SKILLS.filter((s) => !before.has(s.id) && isUnlocked(prog, s.id)).map((s) => s.id);
  return { unlocked, mastered: !wasMastered && r.mastered, stars, polished: wasRusty && firstTry };
}

// ---------------------------------------------------------------- rust (id040)
// Light touch: one level only (rusty or not), and at most three skills at a
// time, the ones left alone longest. A single first-try answer polishes it.
// Stars are never taken away.
export const RUST = { days: 21, max: 3 };
const rustClock = (r) => r.lastOk || r.grantedAt || r.masteredAt || null;
export function rustyOf(prog, now = Date.now()) {
  return Object.entries(prog.skills)
    .filter(([id, r]) => SKILL[id] && r.mastered && rustClock(r) && now - rustClock(r) >= RUST.days * 864e5)
    .sort((a, b) => rustClock(a[1]) - rustClock(b[1]))
    .slice(0, RUST.max)
    .map(([id]) => id);
}

// ---------------------------------------------------------------- stars (id037)
// After mastery (1 star), stars grow with understanding and never go down:
// 2 accuracy, 3 speed, 4 retention after a gap, 5 accurate and fast.
// Times are compared with the combo window of the skill's grade (id032),
// so "fast" means answering every cell within that window.
export const STAR_MAX = 5;
export const STAR_RULE = { accN: 20, acc: 0.9, speedN: 10, speedMin: 5, gapDays: 7, holdRun: 3, topN: 20, top: 0.95, topSpeed: 0.6 };
export const baseMs = (grade, cells) => comboWindowMs(grade, true) + Math.max(0, cells - 1) * comboWindowMs(grade, false);
const median = (xs) => { const a = xs.slice().sort((x, y) => x - y); const n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : Infinity; };
const rate = (list) => (list.length ? list.filter((e) => e.f).length / list.length : 0);
const speedOf = (list, grade) => median(list.filter((e) => e.f).map((e) => e.t / baseMs(grade, e.c)));
export const starsOf = (prog, id) => { const r = prog.skills[id]; return r ? Math.max(r.stars || 0, r.mastered ? 1 : 0) : 0; };

// Whether the next star (n = 2..5) is earned now.
function meets(r, grade, n) {
  const times = r.times || [];
  const R = STAR_RULE;
  if (n === 2) { const l = times.slice(-R.accN); return l.length >= R.accN && rate(l) >= R.acc; }
  if (n === 3) { const l = times.slice(-R.speedN); return l.length >= R.speedN && l.filter((e) => e.f).length >= R.speedMin && speedOf(l, grade) <= 1; }
  if (n === 4) {
    const since = r.starDay && r.starDay[3];
    const l = times.slice(-R.holdRun);
    return !!since && l.length >= R.holdRun && l.every((e) => e.f && e.d && daysBetween(since, e.d) >= R.gapDays);
  }
  if (n === 5) { const l = times.slice(-R.topN); return l.length >= R.topN && rate(l) >= R.top && speedOf(l, grade) <= R.topSpeed; }
  return false;
}

// Raise the stars as far as the records allow. Returns the new count when it
// went up, otherwise 0.
export function updateStars(r, grade, day) {
  if (!r.mastered) return 0;
  const before = Math.max(r.stars || 0, 0);
  let s = Math.max(before, 1);
  r.starDay = r.starDay || {};
  while (s < STAR_MAX && meets(r, grade, s + 1)) { s += 1; if (day && !r.starDay[s]) r.starDay[s] = day; }
  if (day && !r.starDay[1]) r.starDay[1] = day;
  r.stars = s;
  return s > before ? s : 0;
}

// What the next star asks for, with the child's current numbers (for the tree).
export function nextStar(prog, id, today = null) {
  const r = prog.skills[id];
  const grade = SKILL[id].grade;
  const s = starsOf(prog, id);
  if (!r || !r.mastered || s >= STAR_MAX) return null;
  const R = STAR_RULE;
  const times = r.times || [];
  const cells = times.length ? Math.round(times.slice(-10).reduce((a, e) => a + e.c, 0) / Math.min(10, times.length)) : 1;
  const sec = (k) => Math.round((baseMs(grade, cells) * k) / 100) / 10;
  const pct = (l) => Math.round(rate(l) * 100);
  const cur = (l) => { const v = speedOf(l, grade); return Number.isFinite(v) ? Math.round((v * baseMs(grade, cells)) / 100) / 10 : null; };
  const n = s + 1;
  const dec = (x) => String(x).replace('.', ','); // 7.5 -> "7,5"
  const lastN = (k) => `В последних ${k} ${plural(k, 'задаче', 'задачах', 'задачах')}`;
  const tasks = (k) => countOf(k, 'задача', 'задачи', 'задач');
  if (n === 2) { const l = times.slice(-R.accN); return { n, text: `${lastN(R.accN)} — ${R.acc * 100}% и больше с первого раза`, now: `Сейчас: ${tasks(l.length)}, ${pct(l)}%` }; }
  if (n === 3) { const l = times.slice(-R.speedN); const c = cur(l); return { n, text: `Решать задачу примерно за ${dec(sec(1))} сек. или быстрее`, now: c == null ? `Сейчас: ${tasks(l.length)}` : `Сейчас ${dec(c)} сек. (${l.length} из ${R.speedN})` }; }
  if (n === 4) {
    const since = r.starDay && r.starDay[3];
    const ref = today || (times.length ? times[times.length - 1].d : since);
    const wait = since && ref ? Math.max(0, R.gapDays - daysBetween(since, ref)) : R.gapDays;
    return { n, text: `Через ${countOf(R.gapDays, 'день', 'дня', 'дней')} после ☆3 — ${tasks(R.holdRun)} подряд с первого раза`, now: wait ? `Подожди ещё ${countOf(wait, 'день', 'дня', 'дней')}` : 'Можно пробовать уже сегодня!' };
  }
  const l = times.slice(-R.topN); const c = cur(l);
  return { n, text: `${lastN(R.topN)} — ${R.top * 100}% и больше с первого раза, и задача примерно за ${dec(sec(R.topSpeed))} сек.`, now: `Сейчас ${pct(l)}%${c == null ? '' : `, ${dec(c)} сек.`}` };
}

function noteTiming(r, firstTry, { day, ms, cells = 1, misses = 0, problem = null }, at) {
  const t = Math.max(0, Math.round(ms));
  const times = r.times || (r.times = []);
  times.push({ t, c: cells, f: firstTry ? 1 : 0, m: misses, d: day });
  if (times.length > TIMES_MAX) times.splice(0, times.length - TIMES_MAX);
  const days = r.days || (r.days = []);
  let g = days[days.length - 1];
  if (!g || g.d !== day) { g = { d: day, n: 0, ms: 0, f: 0, c: 0 }; days.push(g); }
  g.n += 1; g.ms += t; g.f += firstTry ? 1 : 0; g.c += cells;
  if (days.length > DAYS_MAX) days.splice(0, days.length - DAYS_MAX);
  const first = r.first || (r.first = []);
  if (problem && first.length < FIRST_MAX) first.push({ p: problem, t, m: misses, d: day, at });
}

// Skills built on id, directly or through other skills (id itself excluded),
// in easy -> hard order.
export function dependents(id) {
  const out = new Set([id]);
  for (const x of ORDER) if (SKILL[x].req.some((r) => out.has(r))) out.add(x);
  out.delete(id);
  return ORDER.filter((x) => out.has(x));
}

// Skills whose records a relock of id would erase (id first).
export const relockTargets = (prog, id) => [id, ...dependents(id)].filter((x) => prog.skills[x]);

// Forget a skill and everything built on it. The dependents lose a mastered
// prerequisite, so they fall back to locked; id itself shows as new (or locked
// if its own prerequisites are not mastered). Returns the erased ids.
export function relockSkill(prog, id) {
  const gone = relockTargets(prog, id);
  for (const x of gone) delete prog.skills[x];
  return gone;
}

// Progress toward mastery, 0..1, for display.
export function masteryRatio(prog, id) {
  const r = prog.skills[id];
  if (!r) return 0;
  if (r.mastered) return 1;
  const ok = r.hist.reduce((a, b) => a + b, 0);
  return Math.min(0.95, ok / MASTERY.need);
}

// ---------------------------------------------------------------- planners
// A plan answers: which skill for basic problem i, and for extra problem k.
// "adaptive" plans also react to answers (placement walk).

// Within a grade skills go in the order of the school year (the SKILLS list).
export function gradePlan(grade, N, rng) {
  const list = skillsOfGrade(grade).map((s) => s.id);
  // Extras peek into the next grade, but grade 4 never spills into "Дальше".
  const nextGrade = grade + 1 === NEXT_GRADE ? grade : Math.min(6, grade + 1);
  const next = skillsOfGrade(nextGrade).sort((a, b) => DEPTH[a.id] - DEPTH[b.id]).map((s) => s.id);
  const basic = Array.from({ length: N }, (_, i) => {
    // Walk from easy to hard across the grade with a little jitter.
    const t = N <= 1 ? 1 : i / (N - 1);
    const j = Math.round(t * (list.length - 1) + (rng() - 0.5) * 1.6);
    return list[Math.max(0, Math.min(list.length - 1, j))];
  });
  const hard = list.slice(Math.floor(list.length * 0.55));
  return {
    mode: 'grade', grade, basic,
    extra: (k) => (k < 6 || grade === 6 ? hard[k % hard.length] : next[(k - 6) % Math.max(1, Math.min(next.length, 4))]),
  };
}

// Frontier = unlocked but not mastered; "warm" = mastered (light review).
// Multiplication and division come first (that is what the child learns now),
// then the rest of grades 1-4; "Дальше" only once nothing else is open.
export const FOCUS_LANE = 1;
const frontRank = (id) => (SKILL[id].grade >= NEXT_GRADE ? 2 : SKILL[id].lane === FOCUS_LANE ? 0 : 1);
export function frontier(prog) {
  const open = ORDER.filter((id) => isUnlocked(prog, id) && !isMastered(prog, id));
  return [0, 1, 2].flatMap((k) => open.filter((id) => frontRank(id) === k));
}

export function levelPlan(prog, N, rng, now = Date.now()) {
  if (!prog.placed) return placementPlan(prog, N);
  // "Дальше" joins the mix only when grades 1-4 have nothing open.
  const open = frontier(prog);
  const primary = open.filter((id) => SKILL[id].grade < NEXT_GRADE);
  const front = primary.length ? primary : open;
  const warm = ORDER.filter((id) => isMastered(prog, id));
  // Rusty skills (id040) take the review slots first; the share does not change.
  const rusty = rustyOf(prog, now);
  // Recent mastered skills first, then the frontier (least practised first).
  const warmPick = warm.slice(-6);
  const nWarm = Math.min(warmPick.length, Math.max(1, Math.round(N * 0.3)));
  const frontSorted = front.slice(0, 4);
  const basic = [];
  for (let i = 0; i < nWarm; i++) basic.push(i < rusty.length ? rusty[i] : warmPick[Math.floor(rng() * warmPick.length)]);
  for (let i = nWarm; i < N; i++) basic.push(frontSorted.length ? frontSorted[(i - nWarm) % frontSorted.length] : warm[Math.floor(rng() * warm.length)]);
  const hardest = front.length ? front.slice(-3) : warm.slice(-3);
  return { mode: 'level', basic, extra: (k) => hardest[k % hardest.length] };
}

// Addition and subtraction of grades 1-2 count as known: the check starts
// with the multiplication table (3rd grade, the class is on it now).
export const PLACEMENT_GRANTED = SKILLS.filter((s) => s.grade <= 2 && s.lane === 0).map((s) => s.id);
const WALK = YEAR.filter((id) => !PLACEMENT_GRANTED.includes(id) && SKILL[id].grade < NEXT_GRADE);

// First session: walk along WALK, jumping ahead after clean answers and
// easing back after slips. A clean answer grants that skill and its ancestors,
// so a skill may be asked before it is unlocked (skipping ahead).
export function placementPlan(prog, N) {
  for (const id of PLACEMENT_GRANTED) masterWithAncestors(prog, id);
  const walk = { p: 0, jump: 2, lastOk: -1 };
  return {
    mode: 'level', placement: true, walk,
    basic: Array.from({ length: N }, () => null),
    pick() { return WALK[Math.min(WALK.length - 1, walk.p)]; },
    answer(firstTry) {
      if (firstTry) {
        masterWithAncestors(prog, WALK[walk.p]);
        walk.lastOk = walk.p;
        walk.p = Math.min(WALK.length - 1, walk.p + walk.jump);
        walk.jump = Math.min(6, Math.ceil(walk.jump * 1.5));
      } else {
        walk.jump = Math.max(1, Math.floor(walk.jump / 2));
        walk.p = Math.min(walk.p, Math.max(walk.lastOk + 1, walk.p - walk.jump));
      }
    },
    extra: () => { const f = frontier(prog); return f.length ? f[0] : WALK[walk.p]; },
  };
}

export const QUICK_SKILLS = ['g2-hadd100', 'g2-hsub100', 'g2-kuku-mix', 'g3-div-basic', 'g4-order'];

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Focused mental-math session: +/- within 100, 2-9 multiplication table,
// table division, and mixed order of operations with brackets.
export function quickPlan(N, rng) {
  const base = Math.floor(N / QUICK_SKILLS.length);
  const counts = Object.fromEntries(QUICK_SKILLS.map((id) => [id, base]));
  const remOrder = ['g4-order', 'g2-hadd100', 'g2-hsub100', 'g2-kuku-mix', 'g3-div-basic'];
  for (let i = 0; i < N % QUICK_SKILLS.length; i++) counts[remOrder[i % remOrder.length]] += 1;
  const kukuFirst = Math.ceil(counts['g2-kuku-mix'] / 2);
  const kukuRest = counts['g2-kuku-mix'] - kukuFirst;
  const pushMany = (arr, id, n) => { for (let i = 0; i < n; i++) arr.push(id); };
  const wave1 = [];
  pushMany(wave1, 'g2-hadd100', counts['g2-hadd100']);
  pushMany(wave1, 'g2-hsub100', counts['g2-hsub100']);
  pushMany(wave1, 'g2-kuku-mix', kukuFirst);
  const wave2 = [];
  pushMany(wave2, 'g2-kuku-mix', kukuRest);
  pushMany(wave2, 'g3-div-basic', counts['g3-div-basic']);
  const wave3 = [];
  pushMany(wave3, 'g4-order', counts['g4-order']);
  const basic = [...shuffle(wave1, rng), ...shuffle(wave2, rng), ...wave3];
  const extraPool = shuffle(['g2-kuku-mix', 'g3-div-basic', 'g4-order', 'g2-hadd100', 'g2-hsub100', 'g4-order'], rng);
  return { mode: 'quick', basic, extra: (k) => extraPool[k % extraPool.length] };
}

export function reviewPlan(items) {
  return { mode: 'review', basic: items.map((it) => it.skill || null), items };
}

// Problem factory honouring per-skill recent signatures.
export function problemFor(prog, skillId, rng) {
  const r = prog.skills[skillId];
  const recent = new Set(r ? r.recent : []);
  const p = makeProblem(skillId, rng, recent);
  return p;
}

export { signature };

// ---------------------------------------------------------------- time capsule (id039)
// A problem from the child's first days with a skill comes back once it is
// mastered and a month has passed, to compare "that day" with today.
export const CAPSULE = { days: 30 };
export function pickCapsule(prog, now = Date.now()) {
  let best = null;
  for (const [id, r] of Object.entries(prog.skills)) {
    if (!r.mastered || !r.first || !SKILL[id]) continue;
    r.first.forEach((e, i) => {
      if (e.used || !e.p || !e.at || now - e.at < CAPSULE.days * 864e5) return;
      if (!best || e.at < best.entry.at) best = { skill: id, index: i, entry: e };
    });
  }
  return best;
}
export function useCapsule(prog, skill, index, at = Date.now()) {
  const e = prog.skills[skill] && prog.skills[skill].first && prog.skills[skill].first[index];
  if (e) e.used = at;
  return !!e;
}
