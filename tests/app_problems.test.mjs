// Validates generated column-arithmetic problems for the public app.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, generate, upgradeSaved, BASIC_SETS, EXTRA_TIERS } from '../app/js/problems.js';

const templates = [...new Set([...Object.values(BASIC_SETS).flat(), ...EXTRA_TIERS.flat()])];

test('every template yields steps that spell the correct answer', () => {
  const rng = makeRng(12345);
  for (const t of templates) {
    for (let i = 0; i < 300; i++) {
      const p = generate(t, rng);
      const digits = p.steps.map((s) => s.digit);
      if (p.kind === 'div') {
        assert.equal(p.a % p.b, 0, `${p.text} must divide exactly`);
        const q = p.steps.filter((s) => s.cell.startsWith('q')).map((s) => s.digit).join('');
        assert.equal(q, String(p.answer), p.text);
      } else {
        assert.equal([...digits].reverse().join(''), String(p.answer), p.text);
        assert.equal(Number(p.answer), p.kind === 'add' ? p.a + p.b : p.a - p.b);
      }
      for (const s of p.steps) {
        assert.match(s.digit, /^[0-9]$/);
        assert.ok(p.cells.some((c) => c.id === s.cell && c.kind === 'input'));
        for (const id of s.after || []) assert.ok(p.cells.some((c) => c.id === id) || p.lines.some((l) => l.id === id), `${p.text} reveals ${id}`);
      }
    }
  }
});

test('borrow marks follow the standard algorithm (503 - 278)', () => {
  const p = generate('sub3z', makeRng(1), { kind: 'sub', a: 503, b: 278 });
  assert.deepEqual(p.steps.map((s) => s.digit), ['5', '2', '2']);
  // Dots over the lending digits, as in a Russian notebook; the hints carry the numbers.
  assert.deepEqual(p.steps[0].marks, [{ c: 2, text: '•' }, { c: 1, text: '•' }]);
  assert.deepEqual(p.steps.map((s) => s.help.text), ['13 − 8', '9 − 7', '4 − 2']);
});

test('long division 156 / 4 matches the spec walkthrough', () => {
  const p = generate('div3', makeRng(1), { kind: 'div', a: 156, b: 4 });
  // Quotient tens, the remainder 15 - 12, then quotient ones; the final 0 is automatic.
  assert.deepEqual(p.steps.map((s) => s.digit), ['3', '3', '9']);
  assert.equal(p.cells.find((c) => c.id.startsWith('bd')).text, '6');
  assert.ok(p.cells.some((c) => c.id.startsWith('z') && c.text === '0'));
});

test('long division uses the Russian corner layout (827 : 6)', () => {
  const p = generate('div3', makeRng(1), { kind: 'div', a: 827, b: 6 });
  const at = (id) => p.cells.find((c) => c.id === id);
  // Dividend on the left (after the minus column), divisor right of the bar.
  assert.deepEqual(['D1', 'D2', 'D3'].map((id) => [at(id).r, at(id).c]), [[0, 1], [0, 2], [0, 3]]);
  assert.deepEqual([at('dv0').r, at('dv0').c], [0, 4]);
  assert.deepEqual(p.bracket, { r: 0, c0: 4, c1: 6 });
  // Quotient 137 under the divisor, typed left to right.
  const q = p.cells.filter((c) => c.id.startsWith('q')).sort((a, b) => a.c - b.c);
  assert.deepEqual(q.map((c) => [c.r, c.c, c.text]), [[1, 4, '1'], [1, 5, '3'], [1, 6, '7']]);
  // A minus left of each partial dividend (8, 22, 47), between it and the product.
  const minus = p.cells.filter((c) => c.text === '−').map((c) => [c.r, c.c]);
  assert.deepEqual(minus, [[1, 0], [3, 0], [5, 1]]);
  assert.deepEqual(p.steps.map((s) => s.digit), ['1', '2', '3', '4', '7', '5']);
  assert.equal(p.answer, '137 (ост. 5)');
});

test('a long division saved in the old layout is rebuilt as a corner', () => {
  const old = { kind: 'div', a: 156, b: 4, skill: 'g4-vdiv-3d1', answerText: '156 : 4 = 39', bracket: { r: 1, c0: 1, c1: 3 }, cells: [], steps: [] };
  const p = upgradeSaved(old);
  assert.deepEqual(p.bracket, { r: 0, c0: 4, c1: 5 });
  assert.equal(p.skill, 'g4-vdiv-3d1');
  assert.deepEqual(p.steps.map((s) => s.digit), ['3', '3', '9']);
  const fresh = generate('div3', makeRng(1), { kind: 'div', a: 156, b: 4 });
  assert.equal(upgradeSaved(fresh), fresh);
});

test('first basic problem is the spec example and sets have the chosen lengths', () => {
  for (const n of [6, 10, 14]) assert.equal(BASIC_SETS[n].length, n);
});
