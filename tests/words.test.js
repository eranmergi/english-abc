// Reading/vocabulary page (words.html): word-list rules, thousands of generated questions per game at
// every stage, and the stage ladder. Run: node tests/words.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..');
const ctx = { localStorage: { getItem: () => null, setItem: () => {} }, console, setTimeout, clearTimeout };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['words-data.js', 'core.js', 'words-progress.js', 'words-games.js']) {
  vm.runInContext(fs.readFileSync(path.join(dir, 'js', f), 'utf8'), ctx, { filename: f });
}
vm.runInContext('globalThis.__x = { Store, Games, WORDS, STAGES, SENTENCES, SIMILAR, Ladder, Vocab, similar, SENTENCES_STAGE };', ctx);
const { Store, Games, WORDS, STAGES, SENTENCES, Ladder, Vocab, similar, SENTENCES_STAGE } = ctx.__x;
let fails = 0;
const fail = (m, q) => { if (fails++ < 15) console.log('FAIL', m, JSON.stringify(q || {}, (k, v) => typeof v === 'function' ? undefined : v)); };
const badParts = parts => [].concat(parts).some(p => p === undefined || p === null ||
  (typeof p === 'object' && !p.en) || /undefined|null|NaN/.test(typeof p === 'string' ? p : p.en));
const textOf = html => html.replace(/<[^>]+>/g, '');

// ---- word list rules
const dup = key => WORDS.filter((x, i) => WORDS.findIndex(y => y[key] === x[key]) !== i).map(x => x.w);
if (dup('e').length) fail('duplicate pictures: ' + dup('e').join(' '));
if (dup('w').length) fail('duplicate words: ' + dup('w').join(' '));
if (dup('he').length) fail('duplicate Hebrew meanings: ' + dup('he').join(' '));
const RULE = {
  1: w => /^[a-z]{2,3}$/.test(w) && !/(sh|ch|th|ck|ng|ee|oa|ai|ea)/.test(w),
  2: w => /(sh|ch|th|ck|ng)/.test(w) && !/[aeiou]e$|ee|oa|ai|ea/.test(w),
  3: w => /[^aeiou]{2}/.test(w) && !/(sh|ch|th|ng|ee|oa|ai|ea)/.test(w) && !/[aeiou][^aeiou]e$/.test(w),
  4: w => /[aeiou][^aeiou]e$/.test(w) && !/(ee|oa|ai|ea)/.test(w),
  5: w => /(ee|oa|ai|ea)/.test(w),
};
for (const x of WORDS) {
  if (!x.he || !x.e) fail('missing picture or meaning: ' + x.w);
  if (x.stage && !RULE[x.stage](x.w)) fail(`word does not follow stage ${x.stage}: ${x.w}`);
  if (x.stage && !/^[a-z]+$/.test(x.w)) fail('stage word with non-letters: ' + x.w);
}
for (const st of STAGES) if (WORDS.filter(w => w.stage === st.n && !w.nd).length < 8) fail('stage too small: ' + st.n);
for (const s of SENTENCES) {
  if ((s.s.match(/___/g) || []).length !== 1) fail('sentence needs exactly one blank: ' + s.s);
  if (s.opts.filter(o => o === s.a).length !== 1) fail('answer must appear once: ' + s.s);
  if (new Set(s.opts).size !== s.opts.length) fail('duplicate options: ' + s.s);
}

// ---- generated questions at every stage
for (let stage = 1; stage <= 5; stage++) {
  Object.assign(Store.get(), { stage, stageLog: [], vocab: {}, sentencesOpen: true });
  for (const id of Object.keys(Games)) {
    const round = { i: 0, used: new Set() };
    for (let n = 0; n < 2000; n++) {
      round.i = n % 8;
      if (round.i === 0) round.used = new Set();
      const q = Games[id](round);
      if (q.used) round.used.add(q.used);
      if (badParts(q.prompt) || badParts(q.rightSay)) fail(id + ' bad speech parts', q);
      if (q.kind === 'build') {
        const w = WORDS.find(x => x.w === q.word.w);
        if (w.nd) fail('dictation of a sound-alike word: ' + w.w);
        if (w.stage < 1 || w.stage > stage) fail('spelling word above his stage: ' + w.w);
        const tiles = q.tiles.slice();
        for (const c of q.letters) { const k = tiles.indexOf(c); if (k < 0) fail('missing tile', q); else tiles.splice(k, 1); }
        if (tiles.some(c => q.letters.includes(c))) fail('extra tile repeats a word letter', q);
        if (tiles.length < 2) fail('too few extra tiles', q);
        continue;
      }
      const ok = q.options.filter(o => o.ok);
      if (ok.length !== 1) fail(id + ' ok count ' + ok.length, q);
      if (new Set(q.options.map(o => o.html)).size !== q.options.length) fail(id + ' duplicate options', q);
      for (const o of q.options) if (badParts(q.wrongSay(o))) fail(id + ' wrongSay', q);
      if (id !== 'sentences') {
        const vals = q.options.map(o => o.value);
        for (let a = 0; a < vals.length; a++) for (let b = a + 1; b < vals.length; b++)
          if (similar(vals[a], vals[b])) fail(`${id}: similar words offered together: ${vals[a]}/${vals[b]}`);
        const t = WORDS.find(x => x.w === ok[0].value);
        if (id === 'read' && (t.stage < 1 || t.stage > stage)) fail('reading word above his stage: ' + t.w);
        if (id === 'vocab' && t.stage > stage) fail('vocab word from a stage he has not reached: ' + t.w);
      } else {
        const item = SENTENCES.find(x => x.s === q.used);
        if (ok[0].value !== item.a) fail('sentence: wrong answer marked right', q);
        if (!textOf(q.show).includes('___')) fail('sentence: blank not shown', q);
      }
    }
  }
}

// ---- the ladder
Object.assign(Store.get(), { stage: 1, stageLog: [], sentencesOpen: false });
let ups = [];
for (let i = 0; i < 9; i++) if (Ladder.record(1, true)) ups.push(i);
if (ups.length) fail('levelled up before 10 answers');
if (!Ladder.record(1, true)) fail('did not level up after 10 right answers');
if (Store.get().stage !== 2) fail('stage did not move to 2');
if (Ladder.record(1, true)) fail('an earlier-stage word counted toward the current stage');
Object.assign(Store.get(), { stage: 2, stageLog: [] });
for (let i = 0; i < 10; i++) Ladder.record(2, i % 4 !== 0); // 7 of 10
if (Store.get().stage !== 2) fail('levelled up with only 7 of 10');
Object.assign(Store.get(), { stage: 2, stageLog: [] });
if (Ladder.sentencesOpen()) fail('sentences open too early');
let opened = null;
for (let i = 0; i < 10; i++) opened = Ladder.record(2, true) || opened;
if (!opened || !Ladder.sentencesOpen() || !/משפטים/.test(opened.text)) fail('reaching stage 3 should open sentences', opened);
Object.assign(Store.get(), { stage: 5, stageLog: [] });
for (let i = 0; i < 20; i++) if (Ladder.record(5, true)) fail('levelled past the last stage');
// vocabulary memory
Object.assign(Store.get(), { vocab: {} });
for (let i = 0; i < 3; i++) Vocab.record('cat', true);
if (!Vocab.known('cat') || Vocab.weight('cat') >= Vocab.weight('dog')) fail('known words should come up less than new ones');

console.log('words:', WORDS.length, '| per stage:', STAGES.map(s => s.n + ':' + WORDS.filter(w => w.stage === s.n).length).join(' '),
  '| vocabulary only:', WORDS.filter(w => !w.stage).length, '| sentences:', SENTENCES.length);
console.log(fails ? `${fails} failures` : 'all invariants hold');
