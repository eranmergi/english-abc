'use strict';
/* Progress on the reading/vocabulary page: the reading ladder (stages) and per-word vocabulary memory.
   Stars and stickers stay with Progress in core.js. */

const LEVEL_UP = { window: 10, need: 8 }; // 8 of the last 10 stage words right on the first try

const inGroup = (groups, a, b) => a === b || groups.some(g => g.includes(a) && g.includes(b));
const similar = (a, b) => inGroup(SIMILAR, a, b);
const hearAlike = (a, b) => inGroup(HEAR_ALIKE, a, b);

const Ladder = {
  clean() {
    const s = Store.get();
    s.stage = Math.min(STAGES.length, Math.max(1, parseInt(s.stage, 10) || 1));
    if (!Array.isArray(s.stageLog)) s.stageLog = [];
    if (!s.vocab || typeof s.vocab !== 'object') s.vocab = {};
    s.sentencesOpen = !!s.sentencesOpen;
  },
  stage() { return Store.get().stage; },
  sentencesOpen() { return Store.get().sentencesOpen || this.stage() >= SENTENCES_STAGE; },

  // Words of the stages he has reached; spelling leaves out words that sound like other words.
  words(forSpelling = false) {
    const st = this.stage();
    return WORDS.filter(w => w.stage >= 1 && w.stage <= st && !(forSpelling && w.nd));
  },

  // The current stage comes up three times as often as review of earlier stages.
  pick(list, used) {
    const fresh = list.filter(w => !used.has(w.w));
    const from = fresh.length ? fresh : list;
    const st = this.stage();
    const weights = from.map(w => (w.stage === st ? 3 : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < from.length; i++) {
      r -= weights[i];
      if (r <= 0) return from[i];
    }
    return from[from.length - 1];
  },

  // Counts only words of the current stage. Returns a celebration when he moves up a stage.
  record(stage, firstTry) {
    const s = Store.get();
    if (stage !== s.stage) return null;
    s.stageLog = s.stageLog.concat(firstTry).slice(-LEVEL_UP.window);
    let up = null;
    const right = s.stageLog.filter(Boolean).length;
    if (s.stage < STAGES.length && s.stageLog.length >= LEVEL_UP.window && right >= LEVEL_UP.need) {
      s.stage++;
      s.stageLog = [];
      const opened = s.stage === SENTENCES_STAGE && !s.sentencesOpen;
      up = {
        big: `Level ${s.stage}`,
        text: opened ? 'שלב חדש! ונפתח משחק המשפטים' : 'עלית שלב!',
        say: [`יֵשׁ! עָלִיתָ לְשָׁלָב ${s.stage}!`].concat(opened ? ['וְנִפְתַּח מִשְׂחַק הַמִּשְׁפָּטִים'] : []),
      };
    }
    Store.save();
    return up;
  },
};

const Vocab = {
  // All vocabulary words, plus the reading words of the stages he has reached.
  pool() {
    const st = Ladder.stage();
    return WORDS.filter(w => w.stage === 0 || w.stage <= st);
  },
  known(w) {
    const v = Store.get().vocab[w];
    return !!v && v.ok >= 3 && v.ok / v.n >= 0.8;
  },
  // New words and missed words come up more; words he knows well come up rarely.
  weight(w) {
    const v = Store.get().vocab[w];
    if (!v || !v.n) return 2;
    if (this.known(w)) return 0.3;
    return 1 + 3 * (1 - v.ok / v.n);
  },
  pick(used) {
    const list = this.pool();
    const fresh = list.filter(w => !used.has(w.w));
    const from = fresh.length ? fresh : list;
    const weights = from.map(w => this.weight(w.w));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < from.length; i++) {
      r -= weights[i];
      if (r <= 0) return from[i];
    }
    return from[from.length - 1];
  },
  record(w, firstTry) {
    const s = Store.get();
    const v = s.vocab[w] || (s.vocab[w] = { n: 0, ok: 0 });
    v.n++;
    if (firstTry) v.ok++;
    Store.save();
    return null;
  },
  knownCount() { return WORDS.filter(w => this.known(w.w)).length; },
};

Ladder.clean();
