// Stage 6: fixes after the live walk through every 3rd-grade skill.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, makeProblem, upgradeSaved } from '../app/js/problems.js';

const many = (id, n = 300, seed = 11) => { const rng = makeRng(seed); return Array.from({ length: n }, () => makeProblem(id, rng)); };

test('column multiplication hints use the in-line sign ·', () => {
  for (const id of ['g3-vmul-2x1', 'g3-vmul-3x1']) for (const p of many(id, 100)) for (const st of p.steps) assert.ok(!st.help || !st.help.text.includes('×'), `${p.text}: ${st.help && st.help.text}`);
});

test('"through the hundred" subtraction always crosses it', () => {
  for (const p of many('g2-vsub3s')) assert.ok(p.a >= 100 && p.a - p.b < 100, p.text);
});

test('3-digit by 1-digit multiplication stays within 1000', () => {
  const bs = new Set();
  for (const p of many('g3-vmul-3x1')) { assert.ok(p.a * p.b <= 999 && p.a >= 100, p.text); bs.add(p.b); }
  assert.ok(bs.size >= 7, [...bs].join());
});

test('division by a 2-digit number: answers are spread, not mostly 2', () => {
  const n = {};
  for (const p of many('g3-div-pick', 500)) n[p.answer] = (n[p.answer] || 0) + 1;
  for (const q of ['2', '3', '4', '5', '6']) assert.ok(n[q] > 60, JSON.stringify(n));
});

test('remainder step hint is the subtraction', () => {
  for (const p of many('g3-div-rem', 100)) {
    const [D, d] = p.text.split(' : ').map(Number);
    const q = Math.floor(D / d);
    const st = p.steps.find((s) => s.label === 'Остаток');
    assert.equal(st.help.text, `${D} − ${q * d}`, p.text);
  }
});

test('0 and 1: the hint speaks of a factor, whichever side it is on', () => {
  for (const p of many('g3-zero-one', 200)) {
    const h = p.steps[0].help.text;
    if (/^0 · |· 0$/.test(p.text)) assert.match(h, /множитель 0/, p.text);
    if (/^1 · |· 1$/.test(p.text)) assert.match(h, /множитель 1/, p.text);
  }
});

test('column subtraction marks a borrow with a dot over the lending digit', () => {
  for (const id of ['g2-vsub3s', 'g3-vsub3']) for (const p of many(id, 200)) {
    for (const st of p.steps) for (const m of st.marks || []) {
      assert.equal(m.text, '•', p.text);
      assert.notEqual(`s${m.c}`, st.cell, `${p.text}: no mark over the column being solved`);
    }
  }
});

test('saved subtraction with old Japanese marks gets dots', () => {
  const old = makeProblem('g3-vsub3', makeRng(3));
  const step = old.steps.find((s) => s.marks && s.marks.length) || old.steps[0];
  const c = Number(step.cell.slice(1));
  step.marks = [{ c: c - 1, text: '7' }, { c, text: '13' }];
  const p = upgradeSaved(structuredClone(old));
  const st = p.steps.find((s) => s.cell === step.cell);
  assert.deepEqual(st.marks, [{ c: c - 1, text: '•' }]);
});
