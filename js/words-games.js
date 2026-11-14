'use strict';
/* The four games of the reading/vocabulary page. Same question shapes as games.js (see there);
   record(firstTry) feeds this page's own progress and may return a celebration. */

const EAR = '<span class="ear">👂</span>';
const lat = (text, cls = '') => `<span class="lat ${cls}" dir="ltr" lang="en">${esc(text)}</span>`;
const PIC = w => `<span class="picture">${w.e}</span>`;

// Other words to offer as wrong answers: no two options on screen may be too close to each other
// (different picture, different meaning, not in one SIMILAR group; apart() can add a rule).
// Words in `prefer` are tried first.
function others(word, list, n, { prefer = [], apart = () => false } = {}) {
  const chosen = [word];
  for (const x of shuffle(prefer).concat(shuffle(list))) {
    if (chosen.length > n) break;
    if (chosen.every(c => c.w !== x.w && c.e !== x.e && c.he !== x.he && !similar(c.w, x.w) && !apart(c.w, x.w))) {
      chosen.push(x);
    }
  }
  return chosen.slice(1);
}

const Games = {
  // 1. Read a word that follows the current rule, tap its picture.
  read(round) {
    const list = Ladder.words();
    const word = Ladder.pick(list, round.used);
    const n = Ladder.stage() >= 3 ? 4 : 3;
    // Wrong pictures whose words start like this one (ship/shop/shell), so the first letter is not enough.
    const sameStart = list.filter(x => x.w[0] === word.w[0]);
    const opts = shuffle([word, ...others(word, list, n - 1, { prefer: sameStart })]);
    return {
      used: word.w, hint: [EN(word.w)], meaning: word.he,
      show: lat(word.w, 'word'),
      prompt: round.i === 0 ? SAY.readFirst : SAY.readNext,
      options: opts.map(x => ({ html: x.e, value: x.w, cls: 'pic', ok: x === word })),
      wrongSay: o => ['זֶה', EN(o.value), '.', SAY.retry],
      rightSay: [EN(word.w), word.he],
      record: ft => Ladder.record(word.stage, ft),
    };
  },

  // 2. Dictation: see the picture, hear the word, spell it with letter tiles.
  spell(round) {
    const word = Ladder.pick(Ladder.words(true), round.used);
    const letters = Array.from(word.w);
    const pool = shuffle(Array.from('abcdefghijklmnoprstuwy').filter(c => !letters.includes(c)));
    const vowel = pool.find(c => 'aeiou'.includes(c));
    const extra = [vowel, ...pool.filter(c => c !== vowel)].filter(Boolean).slice(0, letters.length > 4 ? 3 : 2);
    return {
      kind: 'build', withHint: true, used: word.w, word, letters, meaning: word.he,
      tiles: shuffle(letters.concat(extra)),
      show: PIC(word),
      prompt: [EN(word.w), '. אֵיךְ כּוֹתְבִים', EN(word.w), '?'],
      rightSay: [EN(word.w), word.he],
      record: ft => Ladder.record(word.stage, ft),
    };
  },

  // 3. Vocabulary, three ways: hear it → picture; read it → Hebrew meaning; see a picture → English word.
  vocab(round) {
    const word = Vocab.pick(round.used);
    // "Picture → English word" has him read every option without audio: only for words of his reading stages.
    const way = pick(word.stage >= 1 ? ['listen', 'meaning', 'name'] : ['listen', 'meaning']);
    const pool = way === 'name' ? Ladder.words() : Vocab.pool();
    const apart = way === 'listen' ? hearAlike : () => false;
    const opts = shuffle([word, ...others(word, pool, 2, { apart })]);
    const base = {
      used: word.w, meaning: word.he, withHint: false,
      rightSay: [EN(word.w), word.he],
      record: ft => Vocab.record(word.w, ft),
    };
    if (way === 'listen') {
      return Object.assign(base, {
        show: EAR,
        prompt: ['אֵיפֹה', EN(word.w), '?'],
        options: opts.map(x => ({ html: x.e, value: x.w, cls: 'pic', ok: x === word })),
        wrongSay: o => ['זֶה', EN(o.value), '.', SAY.retry],
      });
    }
    if (way === 'meaning') {
      return Object.assign(base, {
        show: lat(word.w, 'word'),
        prompt: [EN(word.w), '. מָה זֶה בְּעִבְרִית?'],
        options: opts.map(x => ({ html: `<span class="heb">${esc(x.he)}</span>`, value: x.w, cls: 'heopt', ok: x === word })),
        wrongSay: () => [SAY.retry, '.', EN(word.w)],
      });
    }
    return Object.assign(base, {
      show: PIC(word),
      prompt: ['אֵיךְ אוֹמְרִים אֶת זֶה בְּאַנְגְּלִית?'],
      options: opts.map(x => ({ html: lat(x.w), value: x.w, cls: 'wordopt', ok: x === word })),
      wrongSay: o => ['זֶה', EN(o.value), '.', SAY.retry],
    });
  },

  // 4. Complete a sentence: am/is/are, a/an, plural, has/have, he plays.
  sentences(round) {
    const fresh = SENTENCES.filter(x => !round.used.has(x.s));
    const item = pick(fresh.length ? fresh : SENTENCES);
    const spoken = item.s.replace('___', '...');
    const shown = esc(item.s).replace('___', '<span class="blank">___</span>');
    return {
      used: item.s, withHint: true, hint: [item.he], meaning: item.he,
      show: `<span class="picture small">${item.e}</span><span class="sentence lat" dir="ltr" lang="en">${shown}</span>`,
      prompt: round.i === 0 ? ['הַשְׁלֵם אֶת הַמִּשְׁפָּט.', EN(spoken)] : [EN(spoken)],
      options: shuffle(item.opts).map(o => ({ html: lat(o), value: o, cls: 'wordopt', ok: o === item.a })),
      wrongSay: o => ['לֹא', EN(o.value), '.', SAY.retry],
      rightSay: [EN(item.s.replace('___', item.a)), item.he],
    };
  },
};
