// Russian school programme (stage 2): regrading, new 3rd-grade skills, level mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, makeProblem } from '../app/js/problems.js';
import { SKILL, SKILLS, NEXT_GRADE } from '../app/js/skills.js';
import { emptyProgress, placementPlan, levelPlan, frontier, isMastered, PLACEMENT_GRANTED, gradePlan } from '../app/js/session.js';

test('grade 3 has no decimals or fractions beyond halves and quarters', () => {
  for (const s of SKILLS.filter((x) => x.grade <= 4)) assert.ok(!['vdec', 'frac', 'decDivInt', 'decDivDec', 'percent', 'round'].includes(s.gen[0]) && !s.gen[1].pa, s.id);
  for (const id of ['g2-kuku67', 'g3-zero-one', 'g3-mul-oral', 'g3-div-tens', 'g3-div-pick', 'g3-eq', 'g4-order', 'g4-vdiv-2d1']) assert.equal(SKILL[id].grade, 3, id);
});

test('equations: x makes the equation true', () => {
  const rng = makeRng(7);
  for (let i = 0; i < 300; i++) {
    const p = makeProblem('g3-eq', rng);
    const x = Number(p.answer);
    const [l, r] = p.text.replace(/x/g, String(x)).replace(/·/g, '*').replace(/:/g, '/').split('=');
    assert.equal(eval(l), eval(r), `${p.text}, x = ${x}`); // eslint-disable-line no-eval
  }
});

test('out-of-table division hint splits the dividend into parts that add up', () => {
  const rng = makeRng(8);
  for (let i = 0; i < 300; i++) {
    const p = makeProblem('g3-div-tens', rng);
    const m = p.help.match(/^(\d+) : (\d) \+ (\d+) : \2$/);
    if (!m) continue;
    const [D, d] = p.text.split(' : ').map(Number);
    assert.equal(Number(m[1]) + Number(m[3]), D, p.text);
    assert.equal(Number(m[1]) % (10 * d), 0, p.text);
  }
});

test('oral multiplication and division stay within 100', () => {
  const rng = makeRng(9);
  for (const id of ['g3-mul-oral', 'g3-div-tens', 'g3-div-pick']) for (let i = 0; i < 200; i++) {
    const p = makeProblem(id, rng);
    assert.ok(Math.max(...p.text.split(/ [·:] /).map(Number), Number(p.answer)) <= 99, `${id} ${p.text}`);
  }
});

test('level check starts with the multiplication table and grants grades 1-2 addition', () => {
  const prog = emptyProgress();
  const plan = placementPlan(prog, 10);
  assert.equal(plan.pick(), 'g2-kuku25');
  for (const id of PLACEMENT_GRANTED) assert.ok(isMastered(prog, id), id);
  assert.ok(!isMastered(prog, 'g2-kuku25'));
  for (let i = 0; i < 40; i++) { assert.ok(SKILL[plan.pick()].grade < NEXT_GRADE, plan.pick()); plan.answer(true); }
});

test('level mode puts multiplication first and keeps "Дальше" out while grades 1-4 are open', () => {
  const prog = emptyProgress();
  placementPlan(prog, 10);
  prog.placed = true;
  assert.equal(SKILL[frontier(prog)[0]].lane, 1);
  for (let s = 0; s < 20; s++) for (const id of levelPlan(prog, 14, makeRng(s)).basic) assert.ok(SKILL[id].grade < NEXT_GRADE, id);
});

test('grade 4 extras do not spill into "Дальше"', () => {
  const plan = gradePlan(4, 10, makeRng(3));
  for (let k = 0; k < 20; k++) assert.equal(SKILL[plan.extra(k)].grade, 4);
});

test('grade 3 button follows the school year: the table first, not fractions', () => {
  for (let s = 0; s < 20; s++) {
    const plan = gradePlan(3, 10, makeRng(s));
    assert.ok(['g2-kuku67', 'g2-kuku891'].includes(plan.basic[0]), `seed ${s}: starts with ${plan.basic[0]}`);
    assert.ok(!plan.basic.slice(0, 2).includes('g2-frac-of'), `seed ${s}: ${plan.basic.slice(0, 2)}`);
  }
});

test('within a grade the skill list keeps prerequisites first', () => {
  for (const s of SKILLS) for (const r of s.req) {
    if (SKILL[r].grade === s.grade) assert.ok(SKILLS.indexOf(SKILL[r]) < SKILLS.indexOf(s), `${r} before ${s.id}`);
  }
});

test('level check walks in school-year order: no 3-digit columns right after the table', () => {
  const prog = emptyProgress();
  const plan = placementPlan(prog, 10);
  const asked = [];
  for (let i = 0; i < 6; i++) { asked.push(plan.pick()); plan.answer(i < 3); }
  // Numbers up to 1000 (columns) come only after the whole table section.
  const upTo1000 = ['g2-vadd3s', 'g2-vsub3s', 'g3-vadd3', 'g3-vsub3', 'g3-vmul-2x1', 'g3-vmul-3x1', 'g4-vdiv-2d1', 'g4-vdiv-3d1'];
  for (const id of asked) assert.ok(!upTo1000.includes(id), `${asked}`);
});
