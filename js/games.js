'use strict';
/* The five games. Each one builds a single question for the round engine in app.js.
   Choice question: { show, prompt, options:[{html, value, cls, ok}], wrongSay(o), rightSay, meaning?, hint?, stat?, key?, used? }
   Build question:  { kind:'build', show, prompt, word, letters, tiles, rightSay, meaning, used }
   Speech values are arrays of parts: Hebrew strings and EN('...') English parts.
   stat = letter whose progress this answer counts toward; key = avoid repeating it next;
   used = word already shown this round. */

const EAR = '<span class="ear">👂</span>';
const lat = (text, cls = '') => `<span class="lat ${cls}" dir="ltr" lang="en">${esc(text)}</span>`;

// Upper case, lower case, or a coin toss when the parent chose "both".
const questionCase = () => {
  const mode = Store.get().caseMode;
  return mode === 'both' ? pick(['upper', 'lower']) : mode;
};

const hasWords = c => WORDS.some(x => lettersOf(x.w)[0] === c);

// Words to play with: prefer ones made only of letters he knows, never repeat within a round.
function wordChoices(list, used) {
  const pool = new Set(Progress.pool());
  let fresh = list.filter(x => !used.has(x.w));
  if (!fresh.length) fresh = list;
  const scored = shuffle(fresh)
    .map(x => ({ x, miss: lettersOf(x.w).filter(c => !pool.has(c)).length }))
    .sort((a, b) => a.miss - b.miss);
  const easy = scored.filter(s => s.miss === 0);
  return (easy.length >= 4 ? easy : scored.slice(0, 6)).map(s => s.x);
}

const letterOption = (c, t, kase) => ({ html: lat(inCase(c, kase)), value: c, cls: 'letter', ok: c === t });

const Games = {
  // 1. Hear a letter's name, tap the letter.
  letters(round) {
    const t = Progress.pickLetter([round.last]), kase = questionCase();
    const opts = shuffle([t, ...Progress.distractors(t, Progress.optionCount() - 1, c => !related(NAME_ALIKE, c, t))]);
    const prompt = ['אֵיפֹה הָאוֹת', nameOf(t), '?'];
    return {
      key: t, stat: t, show: EAR, prompt,
      options: opts.map(c => letterOption(c, t, kase)),
      wrongSay: o => ['זוֹ הָאוֹת', nameOf(o.value), '. אֵיפֹה', nameOf(t), '?'],
      rightSay: [nameOf(t), EN(KEYWORD[t])],
    };
  },

  // 2. See a capital letter, find its small letter (or the other way round). Look-alikes come on purpose.
  cases(round) {
    const t = Progress.pickLetter([round.last]);
    const from = pick(['upper', 'lower']), to = from === 'upper' ? 'lower' : 'upper';
    const n = Progress.optionCount();
    const group = LOOK_ALIKE[to].find(g => g.includes(inCase(t, to)));
    const twins = group ? group.map(c => c.toUpperCase()).filter(c => c !== t) : [];
    const twin = twins.length && Math.random() < 0.6 ? pick(twins) : null;
    const rest = Progress.distractors(t, n - (twin ? 2 : 1), c => c !== twin);
    const opts = shuffle([t, ...(twin ? [twin] : []), ...rest]);
    const which = to === 'lower' ? 'הַקְּטַנָּה' : 'הַגְּדוֹלָה';
    const prompt = ['מְצָא אֶת', nameOf(t), which];
    return {
      key: t, stat: t, show: lat(inCase(t, from), 'big-letter-show'), prompt,
      options: opts.map(c => letterOption(c, t, to)),
      wrongSay: o => ['זוֹ', nameOf(o.value), '.', SAY.retry],
      rightSay: [nameOf(t)],
    };
  },

  // 3. See a picture, hear its English word, tap the letter it starts with.
  first(round) {
    // X has no picture words; if he only practises such letters, take any letter that has some.
    const noWords = TEACH_ORDER.filter(c => !hasWords(c));
    let t = Progress.pickLetter([round.last, ...noWords]);
    if (!hasWords(t)) t = Progress.pickLetter(noWords);
    if (!hasWords(t)) t = pick(TEACH_ORDER.filter(hasWords));
    const all = WORDS.filter(x => lettersOf(x.w)[0] === t);
    const fresh = all.filter(x => !round.used.has(x.w));
    const word = pick(fresh.length ? fresh : all);
    const kase = questionCase();
    const opts = shuffle([t, ...Progress.distractors(t, Progress.optionCount() - 1, c => !related(SOUND_ALIKE, c, t))]);
    return {
      key: t, stat: t, used: word.w, meaning: word.he,
      show: `<span class="picture">${word.e}</span>`,
      prompt: [EN(word.w), '. בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה', EN(word.w), '?'],
      options: opts.map(c => letterOption(c, t, kase)),
      wrongSay: o => ['זוֹ', nameOf(o.value), '.', SAY.retry, '.', EN(word.w)],
      rightSay: [nameOf(t), EN(word.w), word.he],
    };
  },

  // 4. Spell a pictured short word by tapping letter tiles in order (left to right).
  build(round) {
    const word = pick(wordChoices(WORDS.filter(x => x.r), round.used));
    const letters = Array.from(word.w);
    const base = lettersOf(word.w);
    const fits = c => !base.some(b => related(SOUND_ALIKE, b, c));
    let extra = shuffle(Progress.pool().filter(fits));
    if (extra.length < 2) extra = extra.concat(shuffle(TEACH_ORDER.filter(c => fits(c) && !extra.includes(c))));
    return {
      kind: 'build', used: word.w, word, letters, meaning: word.he,
      tiles: shuffle(letters.concat(extra.slice(0, 2).map(c => c.toLowerCase()))),
      show: `<span class="picture">${word.e}</span>`,
      prompt: ['בּוֹא נִבְנֶה אֶת הַמִּלָּה', EN(word.w)],
      rightSay: [EN(word.w), word.he],
    };
  },

  // 5. Read a short word, tap its picture.
  read(round) {
    const list = WORDS.filter(x => x.r);
    const word = pick(wordChoices(list, round.used));
    const first = lettersOf(word.w)[0];
    // Pictures whose words start with other letters, so the first letter is a real clue.
    const others = shuffle(list.filter(x => x.e !== word.e && lettersOf(x.w)[0] !== first)).slice(0, 2);
    return {
      used: word.w, hint: [EN(word.w)], meaning: word.he,
      show: lat(word.w, 'word'),
      prompt: round.i === 0 ? SAY.readFirst : SAY.readNext,
      options: shuffle([word, ...others]).map(x => ({ html: x.e, value: x.w, cls: 'pic', ok: x === word })),
      wrongSay: o => ['זֶה', EN(o.value), '.', SAY.retry],
      rightSay: [EN(word.w), word.he],
    };
  },
};
