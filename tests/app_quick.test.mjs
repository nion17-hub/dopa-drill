import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng, makeProblem } from '../app/js/problems.js';
import { QUICK_SKILLS, quickPlan } from '../app/js/session.js';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app');

function evalOrderExpr(expr) {
  const tokens = expr.match(/\d+|[+−·:()]/g);
  assert.ok(tokens && tokens.length >= 3, `bad expr: ${expr}`);
  let i = 0;
  function parseExpr() {
    let left = parseTerm();
    while (tokens[i] === '+' || tokens[i] === '−') {
      const op = tokens[i++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
      assert.ok(left > 0, `non-positive intermediate in ${expr}: ${left}`);
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    while (tokens[i] === '·' || tokens[i] === ':') {
      const op = tokens[i++];
      const right = parseFactor();
      if (op === '·') left *= right;
      else {
        assert.ok(right > 0 && left % right === 0, `non-exact division in ${expr}: ${left} : ${right}`);
        left /= right;
      }
    }
    return left;
  }
  function parseFactor() {
    if (tokens[i] === '(') {
      i += 1;
      const v = parseExpr();
      assert.equal(tokens[i++], ')', `unclosed ( in ${expr}`);
      return v;
    }
    assert.match(tokens[i], /^\d+$/, `expected number in ${expr}`);
    return Number(tokens[i++]);
  }
  const val = parseExpr();
  assert.equal(i, tokens.length, `trailing tokens in ${expr}`);
  return val;
}

test('g2-hadd100: mental addition within 100 with both 2d+1d carry and 2d+2d', () => {
  const rng = makeRng(101);
  let twoOne = 0;
  let twoTwo = 0;
  for (let i = 0; i < 500; i++) {
    const p = makeProblem('g2-hadd100', rng);
    const m = p.text.match(/^(\d+) \+ (\d+)$/);
    assert.ok(m, p.text);
    const a = Number(m[1]); const b = Number(m[2]);
    assert.equal(a + b, Number(p.answer), p.text);
    assert.ok(a + b <= 100, p.text);
    assert.ok(p.steps[0].help && p.steps[0].help.text.length > 0, p.text);
    if (b < 10) {
      twoOne += 1;
      assert.ok((a % 10) + b >= 10, `2d+1d without carry: ${p.text}`);
    } else {
      twoTwo += 1;
      assert.ok(a >= 10 && b >= 10, p.text);
    }
  }
  assert.ok(twoOne > 120 && twoTwo > 150, `twoOne=${twoOne} twoTwo=${twoTwo}`);
});

test('g2-hsub100: mental subtraction within 100 across all 3 subtypes', () => {
  const rng = makeRng(202);
  let twoOne = 0;
  let roundSub = 0;
  let twoTwo = 0;
  for (let i = 0; i < 500; i++) {
    const p = makeProblem('g2-hsub100', rng);
    const m = p.text.match(/^(\d+) − (\d+)$/);
    assert.ok(m, p.text);
    const a = Number(m[1]); const b = Number(m[2]);
    assert.equal(a - b, Number(p.answer), p.text);
    assert.ok(a <= 100 && a - b >= 2, p.text);
    assert.ok(p.steps[0].help && p.steps[0].help.text.length > 0, p.text);
    if (a % 10 === 0) roundSub += 1;
    else if (b < 10) {
      twoOne += 1;
      assert.ok((a % 10) < b, `2d-1d without borrow: ${p.text}`);
    } else {
      twoTwo += 1;
    }
  }
  assert.ok(twoOne > 80 && roundSub > 50 && twoTwo > 120, `twoOne=${twoOne} roundSub=${roundSub} twoTwo=${twoTwo}`);
});

test('g2-kuku-mix: pure 2-9 multiplication table without 1', () => {
  const rng = makeRng(303);
  for (let i = 0; i < 500; i++) {
    const p = makeProblem('g2-kuku-mix', rng);
    const m = p.text.match(/^(\d+) · (\d+)$/);
    assert.ok(m, p.text);
    const a = Number(m[1]); const b = Number(m[2]);
    assert.ok(a >= 2 && a <= 9 && b >= 2 && b <= 9, p.text);
    assert.equal(a * b, Number(p.answer), p.text);
  }
});

test('g4-order: all 10 forms including division and brackets, answers 1..99, cols <= 12', () => {
  const rng = makeRng(404);
  const forms = [
    /^\d+ \+ \d+ · \d+$/,
    /^\d+ − \d+ · \d+$/,
    /^\d+ · \(\d+ \+ \d+\)$/,
    /^\(\d+ − \d+\) · \d+$/,
    /^\d+ \+ \d+ : \d+$/,
    /^\d+ − \d+ : \d+$/,
    /^\(\d+ \+ \d+\) : \d+$/,
    /^\(\d+ − \d+\) : \d+$/,
    /^\d+ : \(\d+ [+\−] \d+\)$/,
    /^\d+ · \d+ [+\−] \d+ : \d+$/,
  ];
  const seen = new Array(forms.length).fill(0);
  for (let i = 0; i < 1000; i++) {
    const p = makeProblem('g4-order', rng);
    const val = evalOrderExpr(p.text);
    assert.equal(val, Number(p.answer), p.text);
    assert.ok(val >= 1 && val <= 99, `${p.text} = ${val}`);
    assert.ok(p.cols <= 12, `${p.text}: cols=${p.cols}`);
    const idx = forms.findIndex((re) => re.test(p.text));
    assert.ok(idx >= 0, `unexpected form: ${p.text}`);
    seen[idx] += 1;
  }
  seen.forEach((n, idx) => assert.ok(n >= 40, `form ${idx} count=${n}`));
});

test('quickPlan: covers all 5 quick skills, ends with g4-order, extra stays in pool', () => {
  for (const N of [6, 10, 14]) {
    const plan = quickPlan(N, makeRng(505 + N));
    assert.equal(plan.mode, 'quick');
    assert.equal(plan.basic.length, N);
    for (const id of QUICK_SKILLS) assert.ok(plan.basic.includes(id), `N=${N} missing ${id}`);
    const orderIdx = plan.basic.map((id, i) => (id === 'g4-order' ? i : -1)).filter((i) => i >= 0);
    assert.ok(orderIdx.every((i) => i >= N - orderIdx.length), `N=${N}: g4-order not at end: ${plan.basic}`);
    for (let k = 0; k < 20; k++) assert.ok(QUICK_SKILLS.includes(plan.extra(k)), plan.extra(k));
  }
  const p10 = quickPlan(10, makeRng(606));
  const counts = {};
  for (const id of p10.basic) counts[id] = (counts[id] || 0) + 1;
  for (const id of QUICK_SKILLS) assert.equal(counts[id], 2, `${id}: ${counts[id]}`);
});

test('PWA manifest and service worker reference existing relative files only', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.ok(!manifest.start_url.startsWith('/'));
  for (const ic of manifest.icons) {
    assert.ok(!ic.src.startsWith('/'), ic.src);
    assert.ok(fs.existsSync(path.join(APP_DIR, ic.src)), `missing icon ${ic.src}`);
  }
  const sw = fs.readFileSync(path.join(APP_DIR, 'sw.js'), 'utf8');
  const m = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(m, 'ASSETS array missing in sw.js');
  const entries = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  assert.ok(entries.length >= 25);
  for (const rel of entries) {
    assert.ok(rel.startsWith('./'), `non-relative sw asset: ${rel}`);
    const target = rel === './' ? 'index.html' : rel.slice(2);
    assert.ok(fs.existsSync(path.join(APP_DIR, target)), `missing sw asset ${rel}`);
  }
});
