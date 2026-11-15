'use strict';
/* The Hebrew spelling page's brain: which letters of a word can be misspelled (worked out from the vowel
   marks), and his results per kind of mistake, per word and per sound-alike pair. Picks lean toward
   what he gets wrong. Stars and stickers stay with Progress in core.js. */

const MARK = /[֑-ׇ]/;
const stripMarks = s => s.replace(/[֑-ׇ]/g, '');
const DAGESH = 'ּ', SIN_DOT = 'ׂ', HOLAM = 'ֹ';
const REGULAR_OF = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

// The vocalized word as letters, each with its marks.
function marked(n) {
  const out = [];
  for (const c of n) {
    if (MARK.test(c)) { if (out.length) out[out.length - 1].m += c; } else out.push({ ch: c, m: '' });
  }
  return out;
}

// One entry per letter: twins = letters that sound the same in this place ({ ch, cat }),
// em = a ו or י that only marks a vowel (children leave it out).
function analyze(n) {
  const u = marked(n), last = u.length - 1;
  return u.map(({ ch, m }, i) => {
    const has = c => m.includes(c), vowels = m.replace(/[^ְ-ׇֻ]/g, '');
    const slot = { i, ch, twins: [], em: false, sin: has(SIN_DOT) };
    const tw = (c, cat) => slot.twins.push({ ch: c, cat });
    switch (ch) {
      case 'ו':
        if (vowels === HOLAM || (!vowels && has(DAGESH))) slot.em = true; // וֹ, וּ
        else tw('ב', 'bv'); // a consonant ו, as in ורד
        break;
      case 'י': if (i > 0 && !vowels && !has(DAGESH)) slot.em = true; break; // a first י is always "y"
      case 'א': if (i === last && !vowels) tw('ה', 'end'); else tw('ע', 'ae'); break;
      case 'ה': if (i === last && !has(DAGESH)) tw('א', 'end'); break;
      case 'ע': tw('א', 'ae'); break;
      case 'ח': tw(i === last ? 'ך' : 'כ', 'xk'); break;
      case 'כ': if (has(DAGESH)) tw('ק', 'kq'); else tw('ח', 'xk'); break;
      case 'ך': tw('כ', 'fin'); tw('ח', 'xk'); break;
      case 'ק': if (i !== last) tw('כ', 'kq'); break;
      case 'ט': tw('ת', 'tt'); break;
      case 'ת': tw('ט', 'tt'); break;
      case 'ב': if (!has(DAGESH)) tw('ו', 'bv'); break;
      case 'ס': tw('ש', 'ss'); break;
      case 'ש': if (slot.sin) tw('ס', 'ss'); break;
      case 'ם': case 'ן': case 'ף': case 'ץ': tw(REGULAR_OF[ch], 'fin'); break;
    }
    return slot;
  });
}
const catsOf = slot => (slot.em ? ['em'] : [...new Set(slot.twins.map(t => t.cat))]);
const twinOf = (slot, ch) => slot.twins.find(t => t.ch === ch);
// The letter's spoken name in this place: ש is shin or sin.
const slotName = slot => (slot.ch === 'ש' ? (slot.sin ? 'שִׂין' : 'שִׁין') : LETTER_NAME[slot.ch]);

for (const x of WORDS) x.slots = analyze(x.n);

function weighted(list, weightOf) {
  const weights = list.map(weightOf);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

const Ktiv = {
  clean() {
    const s = Store.get();
    for (const k of ['cats', 'words', 'pairs']) {
      if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {};
    }
    s.off = Array.isArray(s.off) ? s.off.filter(c => CATS[c]) : [];
  },

  // The kinds a game practises: the ones the parent left on. If that leaves the game nothing to ask
  // (the missing-letter game has no vowel letters), all of its kinds.
  kinds(game) {
    const off = Store.get().off;
    const all = Object.keys(CATS).filter(c => game !== 'gap' || c !== 'em');
    const left = all.filter(c => !off.includes(c));
    return new Set(left.length ? left : all);
  },

  // Kinds he often gets wrong come up more; a kind he gets right comes up less, but still comes up.
  catWeight(cat) {
    const st = Store.get().cats[cat];
    if (!st || st.n < 4) return 2;
    return 0.4 + 3.6 * (1 - st.ok / st.n);
  },
  known(w) {
    const v = Store.get().words[w];
    return !!v && v.ok >= 3 && v.ok / v.n >= 0.8;
  },
  wordWeight(w) {
    const v = Store.get().words[w];
    if (!v || !v.n) return 1.5;
    if (this.known(w)) return 0.3;
    return 1 + 3 * (1 - v.ok / v.n);
  },

  // The letters a game tests: "gap" only letters with a sound-alike, dictation also the vowel letters.
  tested(x, game) {
    const on = this.kinds(game);
    return x.slots.filter(sl => (sl.twins.length || (game !== 'gap' && sl.em)) && catsOf(sl).some(c => on.has(c)));
  },
  slotWeight(sl, game) {
    const on = this.kinds(game);
    return Math.max(...catsOf(sl).filter(c => on.has(c)).map(c => this.catWeight(c)));
  },

  pickWord(used, game) {
    const all = WORDS.filter(x => this.tested(x, game).length);
    const fresh = all.filter(x => !used.has(x.w));
    const from = fresh.length ? fresh : all;
    return weighted(from, x => this.wordWeight(x.w) * Math.max(...this.tested(x, game).map(sl => this.slotWeight(sl, game))));
  },
  pickSlot(x) { return weighted(this.tested(x, 'gap'), sl => this.slotWeight(sl, 'gap')); },

  // After a word question: per tested letter, a kind counts as right unless he slipped on it there.
  // missed: letter index → the kind he mixed up, 'all' (hint or no idea) or 'other' (a slip that says nothing).
  result(x, tested, missed, star) {
    const s = Store.get();
    const bump = (cat, ok) => {
      const st = s.cats[cat] || (s.cats[cat] = { n: 0, ok: 0 });
      st.n++;
      if (ok) st.ok++;
    };
    for (const sl of tested) {
      const m = missed.get(sl.i);
      for (const c of catsOf(sl)) {
        if (m === undefined) bump(c, true);
        else if (m === 'all' || m === c) bump(c, false);
      }
    }
    const v = s.words[x.w] || (s.words[x.w] = { n: 0, ok: 0 });
    v.n++;
    if (star) v.ok++;
    Store.save();
    return null;
  },

  pairWeight(p) {
    const st = Store.get().pairs[p];
    if (!st || st.n < 2) return 2;
    return 0.4 + 3.6 * (1 - st.ok / st.n);
  },
  pickSentence(used) {
    const fresh = SENTENCES.filter(x => !used.has(x.n));
    return weighted(fresh.length ? fresh : SENTENCES, x => this.pairWeight(x.p));
  },
  pairResult(p, star) {
    const s = Store.get();
    const st = s.pairs[p] || (s.pairs[p] = { n: 0, ok: 0 });
    st.n++;
    if (star) st.ok++;
    Store.save();
    return null;
  },

  knownCount() { return WORDS.filter(x => this.known(x.w)).length; },
  // Words he got wrong most, for the parent area.
  hardWords(n = 12) {
    const s = Store.get();
    return WORDS.map(x => ({ x, v: s.words[x.w] })).filter(o => o.v && o.v.n > o.v.ok)
      .sort((a, b) => (b.v.n - b.v.ok) - (a.v.n - a.v.ok) || a.v.ok / a.v.n - b.v.ok / b.v.n)
      .slice(0, n).map(o => o.x);
  },
};

Ktiv.clean();
