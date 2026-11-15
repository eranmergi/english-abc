'use strict';
/* The three games of the Hebrew spelling page. Same question shapes as games.js (see there), plus:
   miss(x, pos) records which kind of mistake a wrong answer was, nameAt / wrongTile speak about the
   letter in a given place, solvedShow replaces the picture area once solved. record(star) saves the result. */

const HPIC = (x, cls = 'small') => `<span class="picture ${cls}">${x.e}</span>`;
const plain = s => esc(stripMarks(s));
// ש is named by its sound here: as the sound-alike of ס it is sin.
const nameIn = (ch, x) => (ch !== 'ש' ? LETTER_NAME[ch]
  : x && x.slots.some(sl => sl.ch === 'ש' && !sl.sin) ? 'שִׁין' : 'שִׂין');

// A tip's {א} marks a letter: the voice says its name, the screen shows it as א׳ ("ו{ט}" becomes "ו-ט׳").
const tipSay = wn => TIP[wn].replace(/\{(.)\}/g, (_, c) => LETTER_NAME[c]);
const tipShow = wn => stripMarks(TIP[wn]).replace(/ו\{(.)\}/g, 'ו-$1׳').replace(/\{(.)\}/g, '$1׳');

// The word with one letter hidden, or filled in once found.
function gapWord(x, slot, filled) {
  return Array.from(x.w).map((c, i) => (i !== slot.i ? esc(c)
    : `<span class="gap${filled ? ' in' : ''}">${filled ? esc(c) : '?'}</span>`)).join('');
}

const Games = {
  // 1. One letter is missing; the choices sound the same (ט/ת, כ/ק/ח, ם/מ...). He never sees a whole wrong word.
  gap(round) {
    const x = Ktiv.pickWord(round.used, 'gap'), slot = Ktiv.pickSlot(x);
    const letters = [...new Set([slot.ch, ...slot.twins.map(t => t.ch)])];
    const missed = new Map();
    return {
      used: x.w, at: slot.i, withHint: false,
      show: `${HPIC(x)}<span class="word">${gapWord(x, slot)}</span>`,
      solvedShow: `${HPIC(x)}<span class="word">${gapWord(x, slot, true)}</span>`,
      prompt: round.i === 0 ? [SAY.gapFirst, x.n] : [x.n],
      options: shuffle(letters).map(c => ({ html: esc(c), value: c, cls: 'letter', ok: c === slot.ch })),
      miss: c => { if (!missed.has(slot.i)) { const t = twinOf(slot, c); missed.set(slot.i, t ? t.cat : 'all'); } },
      wrongSay: o => {
        const t = twinOf(slot, o.value);
        return t && t.cat === 'fin' ? [SAY.finalLetter, SAY.retry] : [`זוֹ ${nameIn(o.value)}. ${SAY.twin}`];
      },
      rightSay: [`${x.n}, עִם ${slotName(slot)}.`],
      record: star => Ktiv.result(x, [slot], missed, star),
    };
  },

  // 2. Dictation: hear the word, see the picture, build it. The extra tiles are the sound-alikes of its letters.
  dictation(round) {
    const x = Ktiv.pickWord(round.used, 'dictation');
    const letters = Array.from(x.w), tested = Ktiv.tested(x, 'dictation');
    // Sound-alike tiles for the kinds he gets wrong most first; at most 9 tiles in all, at least 2 extra.
    const twins = [], on = Ktiv.kinds('dictation');
    const byNeed = shuffle(tested.filter(sl => sl.twins.length))
      .sort((a, b) => Ktiv.slotWeight(b, 'dictation') - Ktiv.slotWeight(a, 'dictation'));
    for (const sl of byNeed) for (const t of sl.twins) if (on.has(t.cat) && !twins.includes(t.ch)) twins.push(t.ch);
    const extra = twins.slice(0, Math.max(2, 9 - letters.length));
    const fill = shuffle(Array.from('גדזלמנפר').filter(c => !letters.includes(c)));
    while (extra.length < 2 && fill.length) extra.push(fill.pop());
    const missed = new Map();
    const note = (pos, v) => { if (!missed.has(pos)) missed.set(pos, v); };
    return {
      kind: 'build', withHint: true, used: x.w, word: x, letters,
      tiles: shuffle(letters.concat(extra)),
      show: HPIC(x, ''),
      prompt: round.i === 0 ? [SAY.dictFirst, x.n] : [`${x.n}. ${SAY.howWrite} ${x.n}?`],
      nameAt: pos => slotName(x.slots[pos]),
      miss: (ch, pos) => {
        const sl = x.slots[pos], t = ch && twinOf(sl, ch);
        note(pos, ch === null ? 'all' : t ? t.cat : sl.em ? 'em' : 'other');
      },
      wrongTile: (ch, pos) => {
        const sl = x.slots[pos], t = twinOf(sl, ch);
        if (t) return [t.cat === 'fin' ? SAY.finalLetter : `זוֹ ${nameIn(ch, x)}. ${SAY.twin}`];
        if (sl.em && letters.slice(pos + 1).includes(ch)) return [SAY.missing]; // skipped the vowel letter
        if (letters.slice(pos).includes(ch)) return [SAY.notYet];
        return [`זוֹ ${nameIn(ch, x)}. ${SAY.retry}`];
      },
      // After the word, name the letters he stumbled on: "אבטיח, עם טית".
      get rightSay() {
        const hard = x.slots.filter(sl => missed.has(sl.i) && (sl.twins.length || sl.em));
        return hard.length ? [`${x.n}, עִם ${hard.map(slotName).join(' וְ')}.`] : [`${x.n}!`];
      },
      record: star => Ktiv.result(x, tested, missed, star),
    };
  },

  // 3. Words that sound the same (לא/לו, קרא/קרה): the sentence decides. The sentence is read aloud whole,
  //    since both words sound alike; the tip after the answer is a way to remember.
  twins(round) {
    const item = Ktiv.pickSentence(round.used);
    const full = item.n.replace('___', item.a), shown = plain(item.n);
    return {
      used: item.n, withHint: true, hint: [tipSay(item.a)],
      show: `${HPIC(item)}<span class="sentence">${shown.replace('___', '<span class="blank">___</span>')}</span>`,
      solvedShow: `${HPIC(item)}<span class="sentence">${shown.replace('___', `<span class="blank in">${plain(item.a)}</span>`)}</span>`,
      prompt: round.i === 0 ? [SAY.twinsFirst, full] : [full],
      options: shuffle(PAIRS[item.p]).map(wn => ({ html: plain(wn), value: wn, cls: 'heopt', ok: wn === item.a })),
      wrongSay: () => [SAY.notThis, tipSay(item.a)],
      meaning: tipShow(item.a),
      rightSay: [full],
      record: star => Ktiv.pairResult(item.p, star),
    };
  },
};
