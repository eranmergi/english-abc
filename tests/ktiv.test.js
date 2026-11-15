// Hebrew spelling page (ktiv.html): word-list rules, the letter analysis, thousands of generated questions
// per game, and the mistake bookkeeping. Run: node tests/ktiv.test.js   (--list prints every word's letters)
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..');
const ctx = { localStorage: { getItem: () => null, setItem: () => {} }, console, setTimeout, clearTimeout };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['ktiv-data.js', 'core.js', 'ktiv-progress.js', 'ktiv-games.js']) {
  vm.runInContext(fs.readFileSync(path.join(dir, 'js', f), 'utf8'), ctx, { filename: f });
}
vm.runInContext('globalThis.__x = { Store, Games, WORDS, SENTENCES, PAIRS, TIP, CATS, Ktiv, stripMarks, catsOf, twinOf, nameOf, LETTER_NAME };', ctx);
const { Store, Games, WORDS, SENTENCES, PAIRS, TIP, CATS, Ktiv, stripMarks, catsOf, twinOf, nameOf, LETTER_NAME } = ctx.__x;
let fails = 0;
const fail = (m, q) => { if (fails++ < 20) console.log('FAIL', m, q ? JSON.stringify(q, (k, v) => typeof v === 'function' ? undefined : v) : ''); };
const badParts = parts => [].concat(parts).some(p => typeof p !== 'string' || !p.trim() || /undefined|null|NaN/.test(p));
const HEB = /^[א-ת]+$/;
const FINALS = 'ךםןףץ', REGULAR = 'כמנפצ';

// ---- word list rules
const dup = key => WORDS.filter((x, i) => WORDS.findIndex(y => y[key] === x[key]) !== i).map(x => x.w);
if (dup('w').length) fail('duplicate words: ' + dup('w').join(' '));
if (dup('e').length) fail('duplicate pictures: ' + dup('e').join(' '));
for (const x of WORDS) {
  if (!HEB.test(x.w)) fail('written word must be Hebrew letters only: ' + x.w);
  if (stripMarks(x.n) !== x.w) fail(`vocalized form has other letters: ${x.n} → ${stripMarks(x.n)} ≠ ${x.w}`);
  if (/וו|יי/.test(x.w)) fail('double ו/י (spelling varies): ' + x.w);
  Array.from(x.w).forEach((c, i) => {
    const last = i === x.w.length - 1;
    if (FINALS.includes(c) && !last) fail('final letter inside a word: ' + x.w);
    if (REGULAR.includes(c) && last) fail('regular form at the end of a word: ' + x.w);
  });
  x.slots.forEach((sl, i) => {
    if (sl.ch === 'ש' && !/[ׁׂ]/.test(marksAt(x.n, i))) fail('ש without a shin/sin dot: ' + x.n);
    if (i === 0 && 'בכפ'.includes(sl.ch) && !marksAt(x.n, 0).includes('ּ')) fail('ב/כ/פ at the start without a dagesh: ' + x.n);
    if (sl.ch === 'ו' && !sl.em && i !== 0) fail('consonant ו inside a word (spelled וו): ' + x.n);
  });
  if (!x.slots.some(sl => sl.twins.length)) fail('no letter with a sound-alike: ' + x.w);
}
function marksAt(n, i) {
  let k = -1, m = '';
  for (const c of n) {
    if (/[֑-ׇ]/.test(c)) { if (k === i) m += c; } else k++;
  }
  return m;
}
if (process.argv.includes('--list')) {
  for (const x of WORDS) {
    console.log(x.w.padEnd(8), x.slots.map(sl => sl.em ? sl.ch + ':em' : sl.twins.length ? sl.ch + ':' + sl.twins.map(t => t.ch + '/' + t.cat).join(',') : '').filter(Boolean).join('  '));
  }
}
// a few words checked by hand
const slotsOf = w => WORDS.find(x => x.w === w).slots;
const expect = (w, i, want) => {
  const sl = slotsOf(w)[i], got = sl.em ? 'em' : sl.twins.map(t => t.ch + t.cat).join(',');
  if (got !== want) fail(`${w}[${i}] = ${got}, want ${want}`);
};
expect('כוכב', 0, 'קkq'); expect('כוכב', 1, 'em'); expect('כוכב', 2, 'חxk'); expect('כוכב', 3, 'וbv');
expect('תפוח', 0, 'טtt'); expect('תפוח', 3, 'ךxk'); expect('מלך', 2, 'כfin,חxk'); expect('כיסא', 3, 'הend');
expect('אבא', 0, 'עae'); expect('אבא', 1, ''); expect('אבא', 2, 'הend'); expect('שמלה', 0, 'סss');
expect('שעון', 0, ''); expect('ורד', 0, 'בbv'); expect('עכבר', 1, 'חxk'); expect('עכבר', 2, '');
expect('מים', 1, ''); expect('ליצן', 1, 'em'); expect('אפרסק', 4, ''); expect('יונה', 0, ''); expect('יונה', 1, 'em');

// ---- sentences
for (const s of SENTENCES) {
  if ((s.n.match(/___/g) || []).length !== 1) fail('sentence needs exactly one blank: ' + s.n);
  if (!PAIRS[s.p] || !PAIRS[s.p].includes(s.a)) fail('answer is not a word of its pair: ' + s.n);
  if (/[֑-ׇ]/.test(stripMarks(s.n))) fail('marks left on screen: ' + s.n);
  if (!s.e) fail('sentence without a picture: ' + s.n);
}
for (const [p, ws] of Object.entries(PAIRS)) {
  if (ws.length !== 2 || stripMarks(ws[0]) === stripMarks(ws[1])) fail('a pair must be two different spellings: ' + p);
  for (const wn of ws) {
    if (!TIP[wn]) fail('no tip for ' + wn);
    else if (!/\{[א-ת]\}/.test(TIP[wn])) fail('tip names no letter: ' + wn);
    if (!SENTENCES.some(s => s.a === wn)) fail('no sentence for ' + wn);
  }
}

// ---- generated questions, with every kind on and with kinds turned off
const states = [[], ['tt', 'kq', 'xk', 'bv', 'ae', 'ss', 'end', 'fin'], ['fin'], ['em'], Object.keys(CATS), ['tt', 'ae']];
for (const off of states) {
  Object.assign(Store.get(), { cats: {}, words: {}, pairs: {}, off: off.slice() });
  for (const id of Object.keys(Games)) {
    const round = { i: 0, used: new Set() };
    for (let n = 0; n < 2500; n++) {
      round.i = n % 8;
      if (round.i === 0) round.used = new Set();
      const q = Games[id](round);
      if (q.used) round.used.add(q.used);
      if (badParts(q.prompt) || badParts(q.rightSay)) fail(id + ' bad speech parts', q);
      if (id === 'dictation') {
        const x = q.word, tiles = q.tiles.slice();
        if (q.letters.join('') !== x.w) fail('letters are not the word', q);
        for (const c of q.letters) { const k = tiles.indexOf(c); if (k < 0) fail('missing tile', q); else tiles.splice(k, 1); }
        if (tiles.length < 2) fail('too few extra tiles', q);
        if (q.tiles.length > Math.max(9, q.letters.length + 2)) fail('too many tiles', q);
        // the extras are sound-alikes of its letters whenever it has enough of them
        const on = Ktiv.kinds('dictation');
        const twins = new Set(Ktiv.tested(x, 'dictation').flatMap(sl => sl.twins.filter(t => on.has(t.cat)).map(t => t.ch)));
        const traps = tiles.filter(c => twins.has(c)).length;
        if (traps < Math.min(twins.size, 2)) fail(`dictation: only ${traps} sound-alike tiles for ${x.w}`, q);
        if (twins.size >= 2 && tiles.some(c => !twins.has(c))) fail('dictation: random extra although sound-alikes exist: ' + x.w, q);
        if (!Ktiv.tested(x, 'dictation').length) fail('dictation word tests nothing that is on: ' + x.w);
        if (Ktiv.tested(x, 'dictation').some(sl => !catsOf(sl).some(c => on.has(c)))) fail('dictation tests a kind that is off: ' + x.w);
        for (let pos = 0; pos < q.letters.length; pos++) {
          for (const c of new Set(q.tiles)) if (c !== q.letters[pos] && badParts(q.wrongTile(c, pos))) fail('wrongTile speech', q);
          if (!q.nameAt(pos)) fail('no letter name at ' + pos, q);
        }
        continue;
      }
      const ok = q.options.filter(o => o.ok);
      if (ok.length !== 1) fail(id + ' ok count ' + ok.length, q);
      if (new Set(q.options.map(o => o.value)).size !== q.options.length) fail(id + ' duplicate options', q);
      for (const o of q.options) if (!o.ok && badParts(q.wrongSay(o))) fail(id + ' wrongSay', q);
      if (id === 'gap') {
        const x = WORDS.find(w => w.w === q.used), slot = x.slots[q.at];
        if (q.options.length < 2 || q.options.length > 3) fail('gap: 2-3 choices', q);
        if (!slot || !q.options.some(o => o.ok && o.value === slot.ch)) fail('gap: the right choice is not the hidden letter', q);
        else {
          if (q.options.some(o => !o.ok && !twinOf(slot, o.value))) fail('gap: a choice that does not sound the same', q);
          if (!catsOf(slot).some(c => Ktiv.kinds('gap').has(c))) fail('gap: tests a kind that is off', q);
          if (off.length && off.length < 8 && !off.includes('em') && catsOf(slot).every(c => off.includes(c))) fail('gap: ignored the parent', q);
        }
        if (!q.show.includes('class="gap"') || !q.solvedShow.includes('gap in')) fail('gap: no gap on screen', q);
      } else {
        const item = SENTENCES.find(s => s.n === q.used);
        if (/[{}]/.test(q.meaning + q.hint.join('') + q.wrongSay().join('')) || !/׳/.test(q.meaning)) fail('twins: tip letters not filled in', q);
        if (ok[0].value !== item.a) fail('twins: wrong answer marked right', q);
        if (!q.show.includes('___') || /[֑-ׇ]/.test(q.show)) fail('twins: screen text', q);
      }
    }
  }
}

// ---- bookkeeping: a mix-up counts against its own kind only
Object.assign(Store.get(), { cats: {}, words: {}, pairs: {}, off: [] });
const melech = WORDS.find(x => x.w === 'מלך'), kaf = melech.slots[2];
Ktiv.result(melech, [kaf], new Map([[2, 'fin']]), false);
let c = Store.get().cats;
if (!c.fin || c.fin.ok !== 0 || c.fin.n !== 1 || c.xk) fail('a final-letter slip should count for fin only', c);
Ktiv.result(melech, [kaf], new Map(), true);
c = Store.get().cats;
if (c.fin.n !== 2 || c.fin.ok !== 1 || c.xk.n !== 1 || c.xk.ok !== 1) fail('a right answer counts for every kind of the letter', c);
Ktiv.result(melech, [kaf], new Map([[2, 'other']]), false);
if (Store.get().cats.fin.n !== 2) fail('an unrelated slip should not count for a kind');
// the dictation question records what it was given
Object.assign(Store.get(), { cats: {}, words: {}, pairs: {}, off: [] });
let q;
do { q = Games.dictation({ i: 1, used: new Set() }); } while (!q.word.slots.some(sl => sl.ch === 'ת'));
const tPos = q.word.slots.find(sl => sl.ch === 'ת').i;
q.miss('ט', tPos);
q.record(false);
if (!Store.get().cats.tt || Store.get().cats.tt.ok !== Store.get().cats.tt.n - 1) fail('dictation: ט for ת should count against ט/ת', Store.get().cats);
if (!/טֵית|תָּו/.test(q.rightSay[0])) fail('dictation: the letter he missed should be named after the word', q.rightSay);
// a weak kind comes up more
Object.assign(Store.get(), { cats: { tt: { n: 20, ok: 4 } }, words: {}, pairs: {}, off: [] });
for (const k of Object.keys(CATS)) if (k !== 'tt') Store.get().cats[k] = { n: 20, ok: 20 };
let tt = 0;
for (let i = 0; i < 2000; i++) {
  const g = Games.gap({ i: 1, used: new Set() });
  if (g.options.some(o => o.value === 'ט') && g.options.some(o => o.value === 'ת')) tt++;
}
if (tt < 1000) fail(`a weak kind should come up most: ט/ת in ${tt} of 2000`);
// letter names
for (const ch of 'אבגדהוזחטיכךלמםנןסעפףצץקרשת') if (!LETTER_NAME[ch] || nameOf(ch) !== LETTER_NAME[ch]) fail('letter name ' + ch);

console.log('words:', WORDS.length, '| sentences:', SENTENCES.length, '| pairs:', Object.keys(PAIRS).length,
  '| ט/ת share when weak:', (tt / 20).toFixed(0) + '%');
console.log(fails ? `${fails} failures` : 'all invariants hold');
