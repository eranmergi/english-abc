'use strict';
/* Round engine, event wiring and start-up. Screens live in screens.js, questions in games.js. */

const App = { screen: '', round: null };

function startGame(id) {
  Speech.stop();
  App.round = { id, i: 0, stars: 0, last: null, used: new Set(), results: [], newStickers: [] };
  Screens.game(id);
  nextQuestion();
}

function nextQuestion() {
  const r = App.round;
  if (!r) return;
  if (r.i >= ROUND_SIZE) return endRound();
  const q = Games[r.id](r);
  Object.assign(r, { q, firstTry: true, hinted: false, locked: false, pos: 0 });
  if (q.key) r.last = q.key;
  if (q.used) r.used.add(q.used);
  Screens.question(r);
  Speech.say(q.prompt);
}

function endRound() {
  const r = App.round;
  App.round = null;
  Screens.end(r);
}

function goHome() {
  App.round = null;
  Speech.stop();
  Screens.home();
}

// Tapped an answer card.
function onOption(btn) {
  const r = App.round;
  if (!r || r.locked || btn.disabled) return;
  const o = r.q.options[Number(btn.dataset.opt)];
  if (o.ok) {
    btn.classList.add('right');
    $$('.opt').forEach(b => { if (b !== btn) b.classList.add('fade'); });
    solved(btn);
  } else {
    r.firstTry = false;
    btn.disabled = true;
    btn.classList.add('wrong');
    Sfx.bad();
    Screens.mascot('oops');
    Speech.say(r.q.wrongSay(o));
  }
}

// Tapped a letter tile while building a word.
function onTile(btn) {
  const r = App.round;
  if (!r || r.locked || btn.disabled) return;
  const q = r.q, ch = q.tiles[Number(btn.dataset.tile)], need = q.letters[r.pos];
  if (ch === need) {
    btn.disabled = true;
    btn.classList.add('used');
    Screens.fillSlot(r.pos, ch);
    r.pos++;
    if (r.pos === q.letters.length) {
      Screens.showBuilt(q.word.w);
      solved($('#slots'));
    } else {
      Sfx.pop();
      Screens.markNextSlot(r.pos);
      Speech.say(nameOf(ch));
    }
  } else {
    r.firstTry = false;
    Sfx.bad();
    Screens.nudge(btn);
    Screens.mascot('oops');
    const later = q.letters.slice(r.pos).includes(ch);
    Speech.say(later ? SAY.notYet : ['זוֹ', nameOf(ch), '.', SAY.retry]);
  }
}

// Question answered: reward, praise, maybe celebrate a learned letter, then move on.
async function solved(el) {
  const r = App.round;
  r.locked = true;
  Sfx.good();
  Screens.mascot('happy');
  const star = r.firstTry && !r.hinted;
  // stat: a letter, tracked by Progress (letters page); record(): the page's own progress hook (words page).
  // Either may return something to celebrate: a learned letter, or a new level.
  const levelUp = r.q.stat ? (Progress.record(r.q.stat, r.firstTry) ? r.q.stat : null)
    : r.q.record ? r.q.record(r.firstTry) : null;
  r.results.push(star);
  if (star) {
    r.stars++;
    const sticker = Progress.addStar();
    if (sticker >= 0) r.newStickers.push(sticker);
    Fx.starFrom(el);
    Screens.bumpScore();
  }
  Screens.dots(r);
  if (r.q.meaning) Screens.meaning(r.q.meaning);
  const name = Store.get().name;
  const praise = pick(SAY.praise).concat(name && Math.random() < 0.4 ? [name] : []);
  await Speech.say(praise.concat(r.q.rightSay || []));
  if (App.round !== r) return;
  if (levelUp) {
    await Screens.learned(levelUp);
    if (App.round !== r) return;
  }
  await sleep(300);
  if (App.round !== r) return;
  r.i++;
  nextQuestion();
}

function onHint() {
  const r = App.round;
  if (!r || r.locked) return;
  r.hinted = true;
  if (r.q.kind === 'build') {
    const need = r.q.letters[r.pos];
    const tile = $$('.tile').find(b => !b.disabled && r.q.tiles[Number(b.dataset.tile)] === need);
    if (tile) tile.classList.add('glow');
    Speech.say(nameOf(need));
  } else {
    Speech.say(r.q.hint || r.q.prompt);
  }
}

/* ---------- events ---------- */
function onClick(e) {
  const el = e.target.closest('button, [data-act]');
  if (!el || el.disabled) return;
  const d = el.dataset;
  if (d.opt !== undefined) return onOption(el);
  if (d.tile !== undefined) return onTile(el);
  if (d.game) {
    const lock = Screens.gameLock(d.game); // a game the child has not reached yet
    if (lock) { Sfx.bad(); Screens.nudge(el); return Speech.say(lock); }
    Sfx.pop();
    return startGame(d.game);
  }
  if (d.letter) return Screens.toggleLetter(d.letter);
  if (d.sticker !== undefined) { Sfx.pop(); return Screens.nudge(el, 'bounce'); }
  const s = Store.get();
  switch (d.act) {
    case 'home': return goHome();
    case 'again': Sfx.pop(); return startGame(d.id);
    case 'stickers': Sfx.pop(); return Screens.stickers();
    case 'hint': return onHint();
    case 'replay': {
      const r = App.round;
      if (r && !r.locked) Speech.say(r.q.prompt);
      return;
    }
    case 'hello':
      Screens.mascot('happy');
      return Speech.say(`${SAY.hello}${s.name ? ' ' + s.name : ''}! ${SAY.choose}`);
    case 'parent-done':
      s.setupDone = true;
      Store.save();
      return goHome();
    case 'voice-test':
      return Speech.say(SAY.test.concat(pick(SAY.praise), s.name ? [s.name] : []));
    case 'reset': // two taps instead of confirm(), which sandboxed pages may not show
      if (el.classList.contains('armed')) {
        Store.reset();
        Screens.parent();
      } else {
        el.classList.add('armed');
        el.textContent = 'בטוחים? לחיצה נוספת מוחקת את כל ההתקדמות, הכוכבים והמדבקות';
        setTimeout(() => {
          if (!el.isConnected) return;
          el.classList.remove('armed');
          el.textContent = 'איפוס התקדמות';
        }, 4000);
      }
      return;
  }
}

function onInput(e) {
  const t = e.target, s = Store.get();
  if (t.id === 'kidName') s.name = t.value.trim().slice(0, 20);
  else if (t.id === 'rate') s.rate = Number(t.value);
  else if (t.id === 'sfx') s.sfx = t.checked;
  else if (t.dataset.lang) { s.voice[t.dataset.lang] = t.value; Store.save(); Speech.choose(); return; }
  else if (t.name === 'caseMode') { if (t.checked) s.caseMode = t.value; }
  else if (Screens.parentInput && Screens.parentInput(t)) return; // the page's own settings
  else return;
  Store.save();
}

// Parent area opens on a long press, so a child tapping around does not land there.
function wireLongPress(root) {
  let timer = null, btn = null;
  const cancel = () => {
    clearTimeout(timer);
    if (btn) btn.classList.remove('holding');
    btn = null;
  };
  root.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-hold]');
    if (!el) return;
    btn = el;
    el.classList.add('holding');
    timer = setTimeout(() => { cancel(); Speech.stop(); Screens.parent(); }, 1200);
  });
  ['pointerup', 'pointercancel'].forEach(ev => root.addEventListener(ev, cancel));
  root.addEventListener('pointerout', e => { if (btn && e.target === btn) cancel(); });
  root.addEventListener('contextmenu', e => { if (e.target.closest('[data-hold]')) e.preventDefault(); });
}

function init() {
  const root = $('#app');
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onInput);
  wireLongPress(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) Speech.stop(); });
  Speech.onChange(() => Screens.refreshVoices());
  setTimeout(() => Screens.refreshVoices(true), 2000); // browsers that never announce their voices
  if (Store.get().setupDone) Screens.home();
  else Screens.parent();
}

init();
