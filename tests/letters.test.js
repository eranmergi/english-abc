// Letters page (index.html): generates thousands of questions per game under different learner states
// and checks invariants. Run: node tests/letters.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..');
const ctx = { localStorage: { getItem: () => null, setItem: () => {} }, console, setTimeout, clearTimeout };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['data.js', 'core.js', 'games.js']) vm.runInContext(fs.readFileSync(path.join(dir, 'js', f), 'utf8'), ctx, { filename: f });
vm.runInContext('globalThis.__x = { Store, Progress, Games, WORDS, LETTER, LETTERS, TEACH_ORDER, KEYWORD, NAME_ALIKE, SOUND_ALIKE, lettersOf, related };', ctx);
const { Store, Progress, Games, WORDS, LETTERS, TEACH_ORDER, KEYWORD, NAME_ALIKE, SOUND_ALIKE, lettersOf, related } = ctx.__x;
let fails = 0;
const fail = (m, q) => { if (fails++ < 15) console.log('FAIL', m, JSON.stringify(q || {}, (k, v) => typeof v === 'function' ? undefined : v)); };
const badParts = parts => [].concat(parts).some(p => p === undefined || p === null || (typeof p === 'object' && !p.en) || /undefined|null/.test(typeof p === 'string' ? p : p.en));
const textOf = html => html.replace(/<[^>]+>/g, '');

const states = [
  { known: [], caseMode: 'upper' },
  { known: Array.from('SAT'), caseMode: 'lower' },
  { known: Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), caseMode: 'both' },
  { known: Array.from('SATPIN'), pinned: ['X'], caseMode: 'both' },
  { known: Array.from('SATPINMDGOCK'), pinned: ['Q', 'B'], caseMode: 'upper' },
  { known: [], pinned: ['X'], caseMode: 'upper' },          // only a letter without picture words
  { known: [], pinned: ['X', 'Q'], caseMode: 'lower' },
];
for (const st of states) {
  Object.assign(Store.get(), { known: st.known, pinned: st.pinned || [], caseMode: st.caseMode, stats: {} });
  for (const id of Object.keys(Games)) {
    const round = { i: 0, last: null, used: new Set() };
    for (let n = 0; n < 3000; n++) {
      round.i = n % 8;
      if (round.i === 0) round.used = new Set();
      const q = Games[id](round);
      if (q.key) round.last = q.key;
      if (q.used) round.used.add(q.used);
      if (badParts(q.prompt) || badParts(q.rightSay)) fail(id + ' bad speech parts', q);
      if (q.kind === 'build') {
        if (q.letters.join('') !== q.word.w) fail('build letters', q);
        const tiles = q.tiles.slice();
        for (const c of q.letters) { const k = tiles.indexOf(c); if (k < 0) fail('build missing tile', q); else tiles.splice(k, 1); }
        if (tiles.length !== 2) fail('build extra count ' + tiles.length, q);
        if (tiles.some(c => c !== c.toLowerCase())) fail('build tile not lowercase', q);
        if (tiles.some(c => lettersOf(q.word.w).some(l => related(SOUND_ALIKE, l, c.toUpperCase())))) fail('build sound-alike extra', q);
      } else {
        const ok = q.options.filter(o => o.ok);
        if (ok.length !== 1) fail(id + ' ok count ' + ok.length, q);
        if (q.options.length < 3) fail(id + ' too few options', q);
        if (new Set(q.options.map(o => o.html)).size !== q.options.length) fail(id + ' duplicate options', q);
        for (const o of q.options) if (badParts(q.wrongSay(o))) fail(id + ' wrongSay', q);
        const t = ok[0].value, vals = q.options.map(o => o.value);
        if (id === 'letters' && vals.some(v => v !== t && related(NAME_ALIKE, v, t))) fail('letters: rhyming names together', q);
        if (id === 'first') {
          if (vals.some(v => v !== t && related(SOUND_ALIKE, v, t))) fail('first: sound-alike distractor', q);
          if (lettersOf(q.used)[0] !== t) fail('first: word does not start with target', q);
        }
        if (id === 'letters' || id === 'first' || id === 'cases') {
          const poolHasWords = Progress.pool().some(c => WORDS.some(w => lettersOf(w.w)[0] === c));
          if (!Progress.pool().includes(t) && (id !== 'first' || poolHasWords)) fail(id + ' target outside pool', q);
          const shown = q.options.map(o => textOf(o.html));
          const cases = new Set(shown.map(s => (s === s.toUpperCase() ? 'U' : 'L')));
          if (cases.size !== 1) fail(id + ' mixed case options', q);
          if (st.caseMode === 'upper' && id !== 'cases' && shown.some(s => s !== s.toUpperCase())) fail(id + ' lower case in upper mode', q);
        }
        if (id === 'cases') {
          const big = textOf(q.show);
          const optCase = textOf(q.options[0].html);
          if ((big === big.toUpperCase()) === (optCase === optCase.toUpperCase())) fail('cases: same case shown and offered', q);
        }
      }
    }
  }
}
// word list hygiene
const dupE = WORDS.filter((x, i) => WORDS.findIndex(y => y.e === x.e) !== i).map(x => x.w + x.e);
const dupW = WORDS.filter((x, i) => WORDS.findIndex(y => y.w === x.w) !== i).map(x => x.w);
if (dupE.length) fail('duplicate pictures: ' + dupE.join(' '));
if (dupW.length) fail('duplicate words: ' + dupW.join(' '));
for (const x of WORDS) {
  if (!x.he) fail('no Hebrew meaning: ' + x.w);
  if (x.r && !/^[a-z]{2,3}$/.test(x.w)) fail('readable word not short and plain: ' + x.w);
  if (/^(sh|ch|th|ph|wh|kn|wr|ce|ci|cy|ge|gi)/.test(x.w) && !['whale', 'ghost', 'gift'].includes(x.w)) fail('first sound not plain: ' + x.w);
}
for (const c of TEACH_ORDER) if (!KEYWORD[c]) fail('no keyword for ' + c);
if (TEACH_ORDER.length !== 26 || new Set(TEACH_ORDER).size !== 26) fail('teach order is not 26 unique letters');
// learning
Object.assign(Store.get(), { known: [], pinned: [], stats: {} });
const f = Progress.focus()[0];
let at = -1;
for (let i = 1; i <= 6; i++) if (Progress.record(f, true) && at < 0) at = i;
console.log('focus', f, 'learned after', at, '-> next focus', Progress.focus().join(','));
const per = TEACH_ORDER.map(c => c + WORDS.filter(w => lettersOf(w.w)[0] === c).length).join(' ');
console.log('words:', WORDS.length, '| readable:', WORDS.filter(w => w.r).length, '| per letter:', per);
console.log(fails ? `${fails} failures` : 'all invariants hold');
