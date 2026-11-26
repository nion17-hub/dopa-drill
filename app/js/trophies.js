// Trophies (id036): many small achievements, like the ones in mobile games.
// Each series is one measure with rising steps; every step is a trophy.
// Days and streaks get dense steps; volume series get wide ones so long
// sessions are not pushed too hard (docs/SPEC.md 14.7). Nothing is
// random, conditions are always shown (except a few secrets), and a trophy,
// once earned, is kept.
import { SKILLS, LANES } from './skills.js';
import { isUnlocked, isMastered, starsOf } from './session.js';
import { countOf } from './ru.js';

export const CATS = ['Каждый день', 'Сколько всего', 'Навыки', 'Успехи', 'Экстра', 'Комбо', 'Точность', 'Допа', 'Работа над ошибками', 'По классам', 'Коллекция', 'Секреты'];

// Count with its word in Russian (1 задача, 2 задачи, 5 задач; 10 000 задач).
const n = (v, one, few, many) => countOf(v, one, few, many);
const times = (v) => n(v, 'раз', 'раза', 'раз');
const days = (v) => n(v, 'день', 'дня', 'дней');
const tasks = (v) => n(v, 'задача', 'задачи', 'задач');
const tasksAcc = (v) => n(v, 'задачу', 'задачи', 'задач');
const DOPA_LABEL = { 2: '100', 3: '1000', 4: '10 тыс.', 5: '100 тыс.', 6: '1 млн', 7: '10 млн', 8: '100 млн', 9: '1 млрд' };
const RANKS = ['bronze', 'silver', 'gold', 'rainbow'];
export const RANK_NAME = { bronze: 'бронза', silver: 'серебро', gold: 'золото', rainbow: 'радуга', secret: 'секрет' };

// Rank by position in its series: first ~30% bronze, then silver, gold, and the last step rainbow.
function rankAt(i, n) {
  if (n === 1) return 'gold';
  if (i === n - 1) return 'rainbow';
  return RANKS[Math.min(2, Math.floor((i / (n - 1)) * 3.3))];
}

// A series: { key, cat, title, metric, steps, name(v), desc(v) } or explicit items.
const SERIES_DEFS = [
  { key: 'streak', cat: 'Каждый день', title: 'Дни подряд', metric: 'bestStreak', steps: [3, 5, 7, 10, 14, 21, 30, 50, 75, 100, 150, 200, 365], name: (v) => `${days(v)} подряд`, desc: (v) => `Играть ${days(v)} подряд` },
  { key: 'days', cat: 'Каждый день', title: 'Дни с игрой', metric: 'days', steps: [1, 3, 5, 7, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 365, 500, 730, 1000], name: (v) => `${days(v)} с игрой`, desc: (v) => `Играть всего ${days(v)}, можно не подряд` },
  { key: 'stickers', cat: 'Каждый день', title: 'Наклейки за вход', metric: 'stickers', steps: [1, 7, 14, 30, 50, 100, 200, 365], name: (v) => n(v, 'наклейка', 'наклейки', 'наклеек'), desc: (v) => `Собрать ${n(v, 'наклейку', 'наклейки', 'наклеек')} «Подарка за вход»` },
  { key: 'crowns', cat: 'Каждый день', title: 'Наклейки-короны', metric: 'crowns', steps: [1, 3, 5, 10, 20, 52], name: (v) => n(v, 'корона', 'короны', 'корон'), desc: (v) => `Собрать ${n(v, 'наклейку-корону', 'наклейки-короны', 'наклеек-корон')} за 7-й день` },
  { key: 'problems', cat: 'Сколько всего', title: 'Решённые задачи', metric: 'problems', steps: [10, 30, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 20000, 30000, 50000, 100000], name: (v) => tasks(v), desc: (v) => `Решить всего ${tasksAcc(v)}` },
  { key: 'cells', cat: 'Сколько всего', title: 'Введённые цифры', metric: 'cells', steps: [100, 500, 1000, 3000, 5000, 10000, 30000, 50000, 100000, 300000], name: (v) => n(v, 'цифра', 'цифры', 'цифр'), desc: (v) => `Ввести всего ${n(v, 'верную цифру', 'верные цифры', 'верных цифр')}` },
  { key: 'plays', cat: 'Сколько всего', title: 'Сыгранные игры', metric: 'plays', steps: [1, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 2000], name: (v) => n(v, 'игра', 'игры', 'игр'), desc: (v) => `Пройти тренировку до конца ${times(v)}` },
  { key: 'minutes', cat: 'Сколько всего', title: 'Время игры', metric: 'minutes', steps: [10, 30, 60, 120, 300, 600, 1200, 3000], name: (v) => (v >= 60 ? `Всего ${n(v / 60, 'час', 'часа', 'часов')}` : `Всего ${n(v, 'минута', 'минуты', 'минут')}`), desc: (v) => `Играть всего ${v >= 60 ? n(v / 60, 'час', 'часа', 'часов') : n(v, 'минуту', 'минуты', 'минут')}` },
  { key: 'unlocked', cat: 'Навыки', title: 'Открытые навыки', metric: 'unlocked', steps: [3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 58], name: (v) => `Открыто: ${n(v, 'навык', 'навыка', 'навыков')}`, desc: (v) => `Открыть ${n(v, 'навык', 'навыка', 'навыков')}` },
  { key: 'mastered', cat: 'Навыки', title: 'Освоенные навыки', metric: 'mastered', steps: [1, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 58], name: (v) => `Освоено: ${n(v, 'навык', 'навыка', 'навыков')}`, desc: (v) => `Освоить ${n(v, 'навык', 'навыка', 'навыков')}` },
  { key: 'gradeDone', cat: 'Навыки', title: 'Класс освоен целиком', items: [1, 2, 3, 4, 5, 6].map((g) => ({ id: `gradeDone-${g}`, metric: `gradeDone${g}`, need: 1, name: `${g} класс освоен`, desc: `Освоить все навыки ${g} класса` })) },
  { key: 'laneDone', cat: 'Навыки', title: 'Раздел освоен целиком', items: LANES.map((l, i) => ({ id: `laneDone-${i}`, metric: `laneDone${i}`, need: 1, name: `${l}: всё освоено`, desc: `Освоить все навыки раздела «${l}»` })) },
  { key: 'extras', cat: 'Экстра', title: 'Дорога в Экстру', metric: 'extras', steps: [1, 3, 5, 10, 20, 30, 50, 100, 200, 300], name: (v) => `Экстра: ${times(v)}`, desc: (v) => `Дойти до Экстры ${times(v)}` },
  { key: 'extraBest', cat: 'Экстра', title: 'Рекорд Экстры', metric: 'extraBest', steps: [3, 5, 7, 10, 12, 15, 18, 20, 23, 25, 30], name: (v) => `${tasks(v)} за раз`, desc: (v) => `Решить ${tasksAcc(v)} за одну Экстру` },
  { key: 'extraSolved', cat: 'Экстра', title: 'Решено в Экстре', metric: 'extraSolved', steps: [10, 30, 50, 100, 200, 300, 500, 1000, 2000, 3000], name: (v) => `Экстра: ${tasks(v)}`, desc: (v) => `Решить в Экстре всего ${tasksAcc(v)}` },
  { key: 'combo', cat: 'Комбо', title: 'Комбо', metric: 'maxCombo', steps: [5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300], name: (v) => `Комбо ${v}`, desc: (v) => `Набрать комбо ${v}` },
  { key: 'perfects', cat: 'Точность', title: 'Без ошибок до конца', metric: 'perfects', steps: [1, 3, 5, 10, 20, 30, 50, 100, 200, 300], name: (v) => `Без ошибок: ${times(v)}`, desc: (v) => `Пройти тренировку до конца, решив всё с первого раза (${times(v)})` },
  { key: 'firstTry', cat: 'Точность', title: 'С первого раза', metric: 'firstTry', steps: [10, 50, 100, 300, 500, 1000, 3000, 5000, 10000, 30000], name: (v) => `С первого раза: ${tasks(v)}`, desc: (v) => `Решить с первого раза ${tasksAcc(v)}` },
  { key: 'dopa', cat: 'Допа', title: 'Допа', metric: 'bestDopaL', steps: [2, 3, 4, 5, 6, 7, 8, 9], name: (v) => `${DOPA_LABEL[v]} допы`, desc: (v) => `Набрать больше ${DOPA_LABEL[v]} допы за одну игру` },
  { key: 'review', cat: 'Работа над ошибками', title: 'Работа над ошибками', metric: 'reviewSolved', steps: [1, 5, 10, 30, 50, 100, 200, 300], name: (v) => `Исправлено: ${tasks(v)}`, desc: (v) => `Заново решить ${tasksAcc(v)}, где была ошибка` },
  ...[1, 2, 3, 4, 5, 6].map((g) => ({ key: `grade${g}`, cat: 'По классам', title: `Игра за ${g} класс`, metric: `gradePlays${g}`, steps: [1, 10, 30], name: (v) => `${g} класс: ${times(v)}`, desc: (v) => `Сыграть «${g} класс» ${times(v)}` })),
  { key: 'secret', cat: 'Секреты', title: 'Секреты', items: [
    { id: 'secret-perfect14', metric: 'flag:perfect14', need: 1, name: 'Идеальные 14 задач', desc: 'Решить 14 задач без единого «Почти»', secret: true },
    { id: 'secret-extraClean', metric: 'flag:extraClean', need: 1, name: 'Экстра без ошибок', desc: 'Решить в Экстре 5 задач и больше без единого «Почти»', secret: true },
    { id: 'secret-sunday', metric: 'flag:sunday', need: 1, name: 'Воскресная математика', desc: 'Сыграть в воскресенье', secret: true },
    { id: 'secret-newyear', metric: 'flag:newyear', need: 1, name: 'Новогодняя тренировка', desc: 'Сыграть 1 января', secret: true },
    { id: 'secret-comeback', metric: 'flag:comeback', need: 1, name: 'С возвращением!', desc: 'Вернуться в игру после перерыва в неделю и больше', secret: true },
    { id: 'secret-allmodes', metric: 'allModes', need: 1, name: 'Все режимы', desc: 'Сыграть во всех режимах: «Мой уровень», «По классам», «Тренировка», «Работа над ошибками»', secret: true },
  ] },
];

// Other features add their own series (id045). Keep this list append-only.
export const SERIES = [];
export const TROPHIES = [];
export const TROPHY = {};
export function addSeries(def) {
  const items = def.items
    ? def.items.map((it, i, a) => ({ rank: it.secret ? 'secret' : rankAt(i, a.length), ...it }))
    : def.steps.map((v, i, a) => ({ id: `${def.key}-${v}`, metric: def.metric, need: v, name: def.name(v), desc: def.desc(v), rank: rankAt(i, a.length) }));
  const series = { key: def.key, cat: def.cat, title: def.title, items: items.map((it) => ({ ...it, series: def.key, cat: def.cat, reward: it.reward || null })) };
  SERIES.push(series);
  for (const it of series.items) { TROPHIES.push(it); TROPHY[it.id] = it; }
  return series;
}
SERIES_DEFS.forEach(addSeries);

// id045: the features added after id036 (stars, quests, hammer, rust,
// time capsule, "Стало лучше!", collection).
[
  { key: 'questDays', cat: 'Каждый день', title: 'Все задания дня', metric: 'questDays', steps: [1, 3, 7, 14, 30, 50, 100, 200, 365], name: (v) => `Все задания: ${days(v)}`, desc: (v) => `Выполнить все «Задания на сегодня» — всего ${days(v)}` },
  { key: 'questRun', cat: 'Каждый день', title: 'Задания подряд', metric: 'questRun', steps: [2, 3, 5, 7, 14, 30], name: (v) => `Задания ${days(v)} подряд`, desc: (v) => `Выполнять все задания ${days(v)} подряд` },
  { key: 'hammer', cat: 'Каждый день', title: 'Молоток-выручалка', metric: 'hammerUsed', steps: [1, 3, 10], name: (v) => (v === 1 ? 'Первое «не в счёт»' : `«Не в счёт»: ${times(v)}`), desc: (v) => `Использовать Молоток-выручалку ${times(v)}` },
  { key: 'starsTotal', cat: 'Навыки', title: 'Все звёзды', metric: 'starsTotal', steps: [5, 10, 25, 50, 75, 100, 150, 200, 250, 290], name: (v) => n(v, 'звезда', 'звезды', 'звёзд'), desc: (v) => `Собрать за навыки ${n(v, 'звезду', 'звезды', 'звёзд')}` },
  { key: 'star5', cat: 'Навыки', title: 'Навыки на ☆5', metric: 'star5', steps: [1, 3, 5, 10, 20, 30, 58], name: (v) => `☆5: ${n(v, 'навык', 'навыка', 'навыков')}`, desc: (v) => `Довести до ☆5 ${n(v, 'навык', 'навыка', 'навыков')}` },
  { key: 'gradeStar3', cat: 'Навыки', title: 'Класс целиком на ☆3', items: [1, 2, 3, 4, 5, 6].map((g) => ({ id: `gradeStar3-${g}`, metric: `gradeStar3${g}`, need: 1, name: `${g} класс: всё на ☆3`, desc: `Довести все навыки ${g} класса до ☆3 и выше` })) },
  { key: 'polished', cat: 'Успехи', title: 'Чистка от ржавчины', metric: 'polished', steps: [1, 3, 5, 10, 30, 50], name: (v) => `Блестит! ${times(v)}`, desc: (v) => `Почистить заржавевший навык ${times(v)}` },
  { key: 'capsules', cat: 'Успехи', title: 'Капсула времени', metric: 'capsules', steps: [1, 3, 5, 10, 30], name: (v) => n(v, 'капсула', 'капсулы', 'капсул'), desc: (v) => `Открыть ${n(v, 'капсулу времени', 'капсулы времени', 'капсул времени')}` },
  { key: 'capsuleFaster', cat: 'Успехи', title: 'Быстрее, чем тогда', metric: 'capsuleFaster', steps: [1, 5, 10], name: (v) => `Быстрее, чем тогда: ${times(v)}`, desc: (v) => `В капсуле времени решить быстрее, чем в тот день (${times(v)})` },
  { key: 'grew', cat: 'Успехи', title: 'Стало лучше!', metric: 'grew', steps: [1, 5, 10, 30, 50, 100], name: (v) => `Стало лучше: ${times(v)}`, desc: (v) => `Увидеть «Стало лучше!» в результатах ${times(v)}` },
  { key: 'items', cat: 'Коллекция', title: 'Коллекция', metric: 'itemsOwned', steps: [10, 20, 30, 40, 47], name: (v) => `Коллекция: ${n(v, 'предмет', 'предмета', 'предметов')}`, desc: (v) => `Собрать в коллекцию ${n(v, 'предмет', 'предмета', 'предметов')}` },
  { key: 'catComplete', cat: 'Коллекция', title: 'Собрано целиком', metric: 'catComplete', steps: [1, 3, 5, 8], name: (v) => `Целиком: ${n(v, 'раздел', 'раздела', 'разделов')}`, desc: (v) => `Собрать целиком ${n(v, 'раздел', 'раздела', 'разделов')} коллекции` },
].forEach(addSeries);

// Numbers every trophy is measured against, from the saved state.
// snap: { stats, prog, bestStreak, stickers, crowns, ...extra metrics }
export function trophyMetrics(snap) {
  const s = snap.stats || {};
  const prog = snap.prog || { skills: {} };
  const m = {
    bestStreak: snap.bestStreak || 0, days: s.days || 0, stickers: snap.stickers || 0, crowns: snap.crowns || 0,
    problems: s.problems || 0, cells: s.cells || 0, plays: s.plays || 0, minutes: Math.floor((s.playMs || 0) / 60000),
    unlocked: SKILLS.filter((x) => isUnlocked(prog, x.id)).length, mastered: SKILLS.filter((x) => isMastered(prog, x.id)).length,
    extras: s.extras || 0, extraBest: s.extraBest || 0, extraSolved: s.extraSolved || 0, maxCombo: s.maxCombo || 0,
    perfects: s.perfects || 0, firstTry: s.firstTry || 0, bestDopaL: Math.floor((s.bestDopaL || 0) + 1e-9), reviewSolved: s.reviewSolved || 0,
  };
  const stars = Object.fromEntries(SKILLS.map((x) => [x.id, starsOf(prog, x.id)]));
  m.starsTotal = Object.values(stars).reduce((a, b) => a + b, 0);
  m.star5 = Object.values(stars).filter((n) => n >= 5).length;
  m.polished = s.polished || 0; m.capsules = s.capsules || 0; m.capsuleFaster = s.capsuleFaster || 0; m.grew = s.grew || 0;
  for (let g = 1; g <= 6; g++) {
    m[`gradeStar3${g}`] = SKILLS.filter((x) => x.grade === g).every((x) => stars[x.id] >= 3) ? 1 : 0;
    m[`gradeDone${g}`] = SKILLS.filter((x) => x.grade === g).every((x) => isMastered(prog, x.id)) ? 1 : 0;
    m[`gradePlays${g}`] = (s.grades || {})[g] || 0;
  }
  LANES.forEach((_, i) => { m[`laneDone${i}`] = SKILLS.filter((x) => x.lane === i).every((x) => isMastered(prog, x.id)) ? 1 : 0; });
  for (const [k, v] of Object.entries(s.flags || {})) if (v) m[`flag:${k}`] = 1;
  const modes = s.modes || {};
  m.allModes = ['level', 'grade', 'practice', 'review'].every((k) => modes[k]) ? 1 : 0;
  Object.assign(m, snap.extra || {});
  return m;
}
export const valueOf = (m, metric) => m[metric] || 0;

// Earn every trophy whose condition is met. Returns the new ones (in list order).
// `state` is the saved { got: { id: time } }; the first call earns what the
// existing records already reach and marks them as a batch.
export function evaluate(state, metrics, at = Date.now()) {
  state.got = state.got || {};
  const fresh = [];
  for (const t of TROPHIES) {
    if (state.got[t.id]) continue;
    if (valueOf(metrics, t.metric) >= t.need) { state.got[t.id] = at; fresh.push(t); }
  }
  if (!state.init) { state.init = true; state.batch = fresh.map((t) => t.id); return []; }
  return fresh;
}

export const earnedCount = (state) => TROPHIES.filter((t) => state.got && state.got[t.id]).length;

// Progress of one series for the list screen.
export function seriesView(series, state, metrics) {
  const got = series.items.filter((t) => state.got && state.got[t.id]);
  const next = series.items.find((t) => !(state.got && state.got[t.id]));
  const top = got[got.length - 1] || null;
  return { series, got, next, top, value: next ? valueOf(metrics, next.metric) : null };
}
