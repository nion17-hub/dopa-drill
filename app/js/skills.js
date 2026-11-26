// Skill tree (calculation only). Grades 1-4 follow the Russian federal
// programme (ФРП «Математика. 1–4 классы», 2023); grades 5-6 are the
// "Дальше" section (decimals, fractions and the rest of the Japanese drill).
// Ids keep the original Japanese grade prefix so saved progress survives
// regrading: trust `grade`, not the id.
// Each skill: id, name (shown on screen), grade, lane (tree column),
// req (all must be mastered to unlock), gen (generator + params, problems.js).

export const LANES = ['Сложение и вычитание', 'Умножение и деление', 'Дроби', 'Разное'];

// Mastery / unlock rule (provisional): 5 first-try clears in the last 6 attempts.
export const MASTERY = { window: 6, need: 5 };

// Grades from here on are shown as "Дальше" (beyond primary school).
export const NEXT_GRADE = 5;

export const SKILLS = [
  // ---------------------------------------------------------------- grade 1: within 20
  { id: 'g1-compose10', name: 'Состав числа 10', grade: 1, lane: 0, req: [], gen: ['compose', { total: 10 }] },
  { id: 'g1-add-nc', name: 'Сложение в пределах 10', grade: 1, lane: 0, req: [], gen: ['hadd', { a: [1, 9], b: [1, 9], carry: 'none' }] },
  { id: 'g1-sub-nb', name: 'Вычитание в пределах 10', grade: 1, lane: 0, req: ['g1-add-nc'], gen: ['hsub', { a: [2, 10], b: [1, 9], borrow: 'none' }] },
  { id: 'g1-add-c', name: 'Сложение с переходом через десяток', grade: 1, lane: 0, req: ['g1-compose10', 'g1-add-nc'], gen: ['hadd', { a: [2, 9], b: [2, 9], carry: 'yes' }] },
  { id: 'g1-sub-b', name: 'Вычитание с переходом через десяток', grade: 1, lane: 0, req: ['g1-add-c', 'g1-sub-nb'], gen: ['hsub', { a: [11, 18], b: [2, 9], borrow: 'yes' }] },
  { id: 'g1-add3', name: 'Примеры с тремя числами', grade: 1, lane: 0, req: ['g1-sub-b'], gen: ['add3', {}] },

  // ---------------------------------------------------------------- grade 2: within 100, table up to 50
  { id: 'g1-add-2d1', name: 'Сложение двузначного и однозначного', grade: 2, lane: 0, req: ['g1-add-c'], gen: ['hadd', { a: [11, 89], b: [1, 9], carry: 'none', tensToo: true }] },
  { id: 'g1-sub-2d1', name: 'Вычитание однозначного из двузначного', grade: 2, lane: 0, req: ['g1-sub-b', 'g1-add-2d1'], gen: ['hsub', { a: [11, 99], b: [1, 9], borrow: 'none', tensToo: true }] },
  { id: 'g2-vadd2-nc', name: 'Сложение двузначных столбиком', grade: 2, lane: 0, req: ['g1-add-2d1'], gen: ['vadd', { da: 2, db: 2, carry: 'none', maxDigits: 2 }] },
  { id: 'g2-vadd2-c', name: 'Сложение столбиком с переходом через десяток', grade: 2, lane: 0, req: ['g2-vadd2-nc', 'g1-add-c'], gen: ['vadd', { da: 2, db: [1, 2], carry: 'some', maxDigits: 2 }] },
  { id: 'g2-vsub2-nb', name: 'Вычитание двузначных столбиком', grade: 2, lane: 0, req: ['g1-sub-2d1'], gen: ['vsub', { da: 2, db: 2, borrow: 'none' }] },
  { id: 'g2-vsub2-b', name: 'Вычитание столбиком с переходом через десяток', grade: 2, lane: 0, req: ['g2-vsub2-nb', 'g1-sub-b'], gen: ['vsub', { da: 2, db: [1, 2], borrow: 'some' }] },
  { id: 'g2-hadd100', name: 'Устное сложение до 100', grade: 2, lane: 0, req: ['g2-vadd2-c'], gen: ['hadd100', {}] },
  { id: 'g2-hsub100', name: 'Устное вычитание до 100', grade: 2, lane: 0, req: ['g2-vsub2-b'], gen: ['hsub100', {}] },
  { id: 'g2-kuku25', name: 'Таблица умножения на 2 и 5', grade: 2, lane: 1, req: ['g1-add-c'], gen: ['kuku', { dans: [5, 2] }] },
  { id: 'g2-kuku34', name: 'Таблица умножения на 3 и 4', grade: 2, lane: 1, req: ['g2-kuku25'], gen: ['kuku', { dans: [3, 4] }] },
  { id: 'g2-div2345', name: 'Деление на 2, 3, 4 и 5', grade: 2, lane: 1, req: ['g2-kuku34'], gen: ['div', { ds: [2, 3, 4, 5] }] },

  // ---------------------------------------------------------------- grade 3: within 100 orally, 1000 in columns
  // Order of the school year (Моро): the table, then out-of-table, then up to 1000.
  { id: 'g2-kuku67', name: 'Таблица умножения на 6 и 7', grade: 3, lane: 1, req: ['g2-kuku34'], gen: ['kuku', { dans: [6, 7] }] },
  { id: 'g2-kuku891', name: 'Таблица умножения на 8, 9 и 1', grade: 3, lane: 1, req: ['g2-kuku67'], gen: ['kuku', { dans: [8, 9, 1] }] },
  { id: 'g2-kuku-mix', name: 'Вся таблица умножения', grade: 3, lane: 1, req: ['g2-kuku891'], gen: ['kuku', { dans: [2, 3, 4, 5, 6, 7, 8, 9], minB: 2 }] },
  { id: 'g3-zero-one', name: 'Умножение и деление с 0 и 1', grade: 3, lane: 1, req: ['g2-kuku891'], gen: ['zeroOne', {}] },
  { id: 'g3-div-basic', name: 'Табличное деление', grade: 3, lane: 1, req: ['g2-kuku-mix', 'g2-div2345'], gen: ['div', {}] },
  { id: 'g2-frac-of', name: 'Половина и четверть числа', grade: 3, lane: 2, req: ['g2-kuku25'], gen: ['fracOf', { dens: [2, 4] }] },
  { id: 'g4-order', name: 'Порядок действий', grade: 3, lane: 3, req: ['g3-div-basic', 'g2-hsub100'], gen: ['order', {}] },
  { id: 'g3-eq', name: 'Уравнения: неизвестный множитель и делитель', grade: 3, lane: 3, req: ['g3-div-basic'], gen: ['eqMulDiv', {}] },
  { id: 'g2-mul-tens', name: 'Умножение круглых чисел', grade: 3, lane: 1, req: ['g2-kuku-mix'], gen: ['mulTens', {}] },
  { id: 'g3-mul-oral', name: 'Внетабличное умножение', grade: 3, lane: 1, req: ['g2-mul-tens'], gen: ['mulOral', {}] },
  { id: 'g3-div-tens', name: 'Внетабличное деление', grade: 3, lane: 1, req: ['g3-div-basic', 'g3-mul-oral'], gen: ['divTens', {}] },
  { id: 'g3-div-pick', name: 'Деление на двузначное подбором', grade: 3, lane: 1, req: ['g3-mul-oral', 'g3-div-basic'], gen: ['divPick', {}] },
  { id: 'g3-div-rem', name: 'Деление с остатком', grade: 3, lane: 1, req: ['g3-div-basic'], gen: ['divRem', {}] },
  { id: 'g2-vadd3s', name: 'Сложение с переходом через сотню', grade: 3, lane: 0, req: ['g2-vadd2-c'], gen: ['vadd', { da: 2, db: 2, carry: 'many', maxDigits: 3 }] },
  { id: 'g2-vsub3s', name: 'Вычитание с переходом через сотню', grade: 3, lane: 0, req: ['g2-vsub2-b', 'g2-vadd3s'], gen: ['vsub', { da: 3, db: 2, borrow: 'some', aMax: 199, resMax: 99 }] },
  { id: 'g3-vadd3', name: 'Сложение трёхзначных', grade: 3, lane: 0, req: ['g2-vadd3s'], gen: ['vadd', { da: 3, db: 3, carry: 'some', maxDigits: 3 }] },
  { id: 'g3-vsub3', name: 'Вычитание трёхзначных', grade: 3, lane: 0, req: ['g2-vsub3s'], gen: ['vsub', { da: 3, db: [2, 3], borrow: 'some' }] },
  { id: 'g3-vmul-2x1', name: 'Умножение двузначного на однозначное', grade: 3, lane: 1, req: ['g3-mul-oral'], gen: ['vmul', { da: 2, db: 1 }] },
  { id: 'g3-vmul-3x1', name: 'Умножение трёхзначного на однозначное', grade: 3, lane: 1, req: ['g3-vmul-2x1'], gen: ['vmul', { da: 3, db: 1, prodMax: 999 }] },
  { id: 'g4-vdiv-2d1', name: 'Деление двузначного на однозначное', grade: 3, lane: 1, req: ['g3-div-rem', 'g3-div-tens'], gen: ['vdiv', { dd: 2, ds: 1 }] },
  { id: 'g4-vdiv-3d1', name: 'Деление трёхзначного на однозначное', grade: 3, lane: 1, req: ['g4-vdiv-2d1'], gen: ['vdiv', { dd: 3, ds: 1 }] },

  // ---------------------------------------------------------------- grade 4: multi-digit numbers
  { id: 'g3-vadd4', name: 'Сложение четырёхзначных', grade: 4, lane: 0, req: ['g3-vadd3'], gen: ['vadd', { da: 4, db: [3, 4], carry: 'many', maxDigits: 4 }] },
  { id: 'g3-vsub4', name: 'Вычитание четырёхзначных', grade: 4, lane: 0, req: ['g3-vsub3'], gen: ['vsub', { da: 4, db: [3, 4], borrow: 'zero' }] },
  { id: 'g4-mul10', name: 'Умножение и деление на 10, 100 и 1000', grade: 4, lane: 1, req: ['g2-mul-tens'], gen: ['mul10', {}] },
  { id: 'g3-vmul-2x2', name: 'Умножение двузначного на двузначное', grade: 4, lane: 1, req: ['g3-vmul-2x1'], gen: ['vmul', { da: 2, db: 2 }] },
  { id: 'g3-vmul-3x2', name: 'Умножение трёхзначного на двузначное', grade: 4, lane: 1, req: ['g3-vmul-2x2', 'g3-vmul-3x1'], gen: ['vmul', { da: 3, db: 2 }] },
  { id: 'g4-vdiv-2d2', name: 'Деление двузначного на двузначное', grade: 4, lane: 1, req: ['g4-vdiv-2d1', 'g3-vmul-2x1'], gen: ['vdiv', { dd: 2, ds: 2 }] },
  { id: 'g4-vdiv-3d2', name: 'Деление трёхзначного на двузначное', grade: 4, lane: 1, req: ['g4-vdiv-2d2', 'g4-vdiv-3d1'], gen: ['vdiv', { dd: 3, ds: 2 }] },

  // ---------------------------------------------------------------- "Дальше": grade 5
  { id: 'g3-dec-add1', name: 'Сложение десятичных дробей', grade: 5, lane: 2, req: ['g2-vadd2-c'], gen: ['vdec', { op: 'add', places: 1 }] },
  { id: 'g3-dec-sub1', name: 'Вычитание десятичных дробей', grade: 5, lane: 2, req: ['g3-dec-add1', 'g2-vsub2-b'], gen: ['vdec', { op: 'sub', places: 1 }] },
  { id: 'g3-frac-same', name: 'Дроби с одинаковыми знаменателями', grade: 5, lane: 2, req: ['g2-frac-of'], gen: ['frac', { op: 'addsub', same: true, maxOne: true }] },
  { id: 'g4-round', name: 'Округление', grade: 5, lane: 3, req: ['g3-vadd4'], gen: ['round', {}] },
  { id: 'g4-dec-add2', name: 'Сложение и вычитание сотых', grade: 5, lane: 2, req: ['g3-dec-sub1'], gen: ['vdec', { op: 'addsub', places: 2 }] },
  { id: 'g4-dec-mul', name: 'Умножение десятичной дроби на число', grade: 5, lane: 2, req: ['g4-dec-add2', 'g3-vmul-2x1'], gen: ['vmul', { da: 2, db: 1, pa: 1 }] },
  { id: 'g4-dec-div', name: 'Деление десятичной дроби на число', grade: 5, lane: 2, req: ['g4-dec-mul', 'g4-vdiv-2d1'], gen: ['decDivInt', {}] },
  { id: 'g4-frac-mixed', name: 'Смешанные числа', grade: 5, lane: 2, req: ['g3-frac-same'], gen: ['frac', { op: 'addsub', same: true, mixed: true }] },
  { id: 'g5-dec-mul', name: 'Умножение десятичных дробей', grade: 5, lane: 2, req: ['g4-dec-mul'], gen: ['vmul', { da: 2, db: 2, pa: 1, pb: 1 }] },
  { id: 'g5-dec-div', name: 'Деление десятичных дробей', grade: 5, lane: 2, req: ['g4-dec-div', 'g5-dec-mul'], gen: ['decDivDec', {}] },
  { id: 'g5-gcd', name: 'НОД', grade: 5, lane: 3, req: ['g3-div-basic'], gen: ['gcdlcm', { kind: 'gcd' }] },
  { id: 'g5-lcm', name: 'НОК', grade: 5, lane: 3, req: ['g5-gcd'], gen: ['gcdlcm', { kind: 'lcm' }] },
  { id: 'g5-frac-reduce', name: 'Сокращение дробей', grade: 5, lane: 2, req: ['g5-gcd', 'g4-frac-mixed'], gen: ['frac', { op: 'reduce' }] },
  { id: 'g5-frac-diff', name: 'Дроби с разными знаменателями', grade: 5, lane: 2, req: ['g5-frac-reduce', 'g5-lcm'], gen: ['frac', { op: 'addsub', same: false }] },
  { id: 'g5-frac-int', name: 'Умножение и деление дроби на число', grade: 5, lane: 2, req: ['g5-frac-reduce'], gen: ['frac', { op: 'muldivInt' }] },
  { id: 'g5-percent', name: 'Проценты', grade: 5, lane: 3, req: ['g4-dec-mul'], gen: ['percent', {}] },

  // ---------------------------------------------------------------- "Дальше": grade 6
  { id: 'g6-frac-mul', name: 'Умножение дробей', grade: 6, lane: 2, req: ['g5-frac-int'], gen: ['frac', { op: 'mul' }] },
  { id: 'g6-frac-div', name: 'Деление дробей', grade: 6, lane: 2, req: ['g6-frac-mul'], gen: ['frac', { op: 'div' }] },
  { id: 'g6-frac-dec', name: 'Десятичные и обыкновенные дроби', grade: 6, lane: 2, req: ['g6-frac-div', 'g5-dec-div'], gen: ['frac', { op: 'decimal' }] },
  { id: 'g6-ratio', name: 'Пропорции', grade: 6, lane: 3, req: ['g5-lcm'], gen: ['ratio', {}] },
  { id: 'g6-letter', name: 'Уравнения', grade: 6, lane: 3, req: ['g4-order'], gen: ['letter', {}] },
];

export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

// Depth in the tree = longest prerequisite chain (roots are 0).
export const DEPTH = (() => {
  const memo = {};
  const d = (id) => memo[id] ?? (memo[id] = SKILL[id].req.length ? 1 + Math.max(...SKILL[id].req.map(d)) : 0);
  for (const s of SKILLS) d(s.id);
  return memo;
})();

export const skillsOfGrade = (g) => SKILLS.filter((s) => s.grade === g);
