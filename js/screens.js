'use strict';
/* Screens shared by both pages: home, game + question, celebration overlay, round end, sticker album,
   parent-area panels. Each page's own parent() lives in letters-parent.js or words-parent.js.
   APP (from the page's data file) gives the title, mascot and storage key. */

const view = () => $('#app');
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const countWord = (n, one, many) => (n === 1 ? one : `${n} ${many}`);

const Screens = {
  voiceChecked: false, // true once the browser had time to list its voices

  home() {
    App.screen = 'home';
    const s = Store.get();
    view().innerHTML = `
    <section class="screen home">
      <header class="bar">
        <button class="icon-btn gear" data-hold="parent" aria-label="אזור הורים (לחיצה ארוכה)">⚙️</button>
        <div class="score" id="score">⭐ <b>${s.stars}</b></div>
        <button class="icon-btn" data-act="stickers" aria-label="אלבום מדבקות">📒</button>
      </header>
      <button class="hero" data-act="hello" aria-label="שלום">
        <span class="mascot" id="mascot">${APP.mascot}</span>
        <span class="title lat" dir="ltr">${APP.title}</span>
      </button>
      <div class="menu">
        ${GAMES_META.map((g, k) => `
          <button class="tile-game${this.gameLock(g.id) ? ' locked' : ''}" data-game="${g.id}" style="--c:${g.color}">
            <span class="num">${this.gameLock(g.id) ? '🔒' : k + 1}</span><span class="ico">${g.icon}</span><span class="lbl">${g.title}</span>
          </button>`).join('')}
      </div>
      <div id="voiceWarn">${this.voiceWarning(true)}</div>
      <p class="parent-hint">הורים: לחיצה ארוכה על ⚙️</p>
    </section>`;
  },

  game(id) {
    App.screen = 'game';
    const g = GAMES_META.find(x => x.id === id);
    view().innerHTML = `
    <section class="screen game" style="--accent:${g.color}">
      <header class="bar">
        <button class="icon-btn" data-act="home" aria-label="הביתה">🏠</button>
        <div class="dots" id="dots"></div>
        <div class="score" id="score">⭐ <b>${Store.get().stars}</b></div>
        <button class="icon-btn" data-act="replay" aria-label="לשמוע שוב">🔊</button>
      </header>
      <div class="stage" id="stage"></div>
      <div class="mascot corner" id="mascot">${APP.mascot}</div>
    </section>`;
  },

  // Spoken reason a game is still closed, or '' when it is open.
  gameLock(id) {
    const g = GAMES_META.find(x => x.id === id);
    return g && g.lock ? g.lock() : '';
  },

  question(r) {
    const q = r.q, withHint = q.withHint !== undefined ? q.withHint : r.id === 'read' || r.id === 'build';
    const long = q.kind === 'build' && q.letters.length > 4 ? ' long' : '';
    const top = `
      <div class="show-row">
        <button class="show" data-act="replay" aria-label="לשמוע שוב">${q.show}</button>
        ${withHint ? '<button class="icon-btn hint" data-act="hint" aria-label="רמז">💡</button>' : ''}
      </div>
      <div class="meaning" id="meaning"></div>`;
    const body = q.kind === 'build'
      ? `<div class="slots lat${long}" id="slots" dir="ltr">${q.letters.map((_, k) => `<span class="slot${k ? '' : ' next'}"></span>`).join('')}</div>
         <div class="tiles" dir="ltr">${q.tiles.map((c, k) =>
           `<button class="tile lat" data-tile="${k}" style="animation-delay:${k * 60}ms">${c}</button>`).join('')}</div>`
      : `<div class="options" dir="ltr">${q.options.map((o, k) =>
           `<button class="opt ${o.cls}" data-opt="${k}" style="animation-delay:${k * 70}ms">${o.html}</button>`).join('')}</div>`;
    $('#stage').innerHTML = top + body;
    this.dots(r);
  },

  dots(r) {
    const el = $('#dots');
    if (!el) return;
    el.innerHTML = Array.from({ length: ROUND_SIZE }, (_, k) => {
      const cls = k < r.results.length ? (r.results[k] ? 'star' : 'done') : k === r.i ? 'cur' : '';
      return `<i class="dot ${cls}"></i>`;
    }).join('');
  },

  mascot(mood) {
    const m = $('#mascot');
    if (!m) return;
    m.classList.remove('happy', 'oops');
    restart(m, mood);
  },
  bumpScore() {
    const s = $('#score');
    if (!s) return;
    s.querySelector('b').textContent = Store.get().stars;
    restart(s, 'bump');
  },
  nudge(el, cls = 'nudge') { restart(el, cls); },
  meaning(text) {
    const m = $('#meaning');
    if (m) { m.textContent = text; m.classList.add('on'); }
  },
  fillSlot(k, ch) {
    const slot = $$('#slots .slot')[k];
    slot.textContent = ch;
    slot.classList.remove('next');
    slot.classList.add('filled');
  },
  markNextSlot(k) {
    const slot = $$('#slots .slot')[k];
    if (slot) slot.classList.add('next');
    $$('.tile.glow').forEach(t => t.classList.remove('glow'));
  },
  showBuilt(word) { $('#slots').innerHTML = `<span class="built">${esc(word)}</span>`; },

  // Full-screen celebration: a letter that moved to "known" (a letter string),
  // or anything else a page wants to celebrate ({ big, text, say }).
  async learned(x) {
    const c = typeof x === 'string'
      ? { big: x + x.toLowerCase(), text: 'אוֹת חֲדָשָׁה!', say: [SAY.newLetter, nameOf(x), EN(KEYWORD[x])] }
      : x;
    const ov = document.createElement('div');
    ov.className = 'overlay';
    const wide = c.big.length > 2 ? ' wide' : ''; // "Level 3" needs a smaller size than "Bb"
    ov.innerHTML = `<div class="card"><div class="big-letter lat${wide}" dir="ltr">${esc(c.big)}</div>
      <p class="ov-text">🎉 ${esc(c.text)} 🎉</p></div>`;
    document.body.appendChild(ov);
    Sfx.fanfare();
    Fx.confetti();
    await Speech.say(c.say);
    await sleep(700);
    ov.remove();
  },

  end(r) {
    App.screen = 'end';
    const s = Store.get(), name = s.name;
    const got = r.newStickers.map((k, i) =>
      `<span class="new-sticker" style="animation-delay:${0.5 + i * 0.3}s">${STICKERS[k]}</span>`).join('');
    const toNext = STARS_PER_STICKER - (s.stars % STARS_PER_STICKER);
    const more = Progress.stickerCount() < STICKERS.length ? `עוד ${toNext} ⭐ למדבקה הבאה` : '';
    view().innerHTML = `
    <section class="screen end">
      <div class="trophy">🏆</div>
      <h1>${name ? esc(name) + ', ' : ''}כל הכבוד!</h1>
      <div class="stars-row">${'<span>⭐</span>'.repeat(r.stars)}${'<span class="dim">⭐</span>'.repeat(ROUND_SIZE - r.stars)}</div>
      ${got ? `<p class="got">מדבקה חדשה!</p><div class="stickers-new">${got}</div>` : `<p class="got">${more}</p>`}
      <div class="end-actions">
        <button class="big-btn" data-act="again" data-id="${r.id}" aria-label="עוד פעם">🔁</button>
        <button class="big-btn" data-act="home" aria-label="הביתה">🏠</button>
      </div>
    </section>`;
    Sfx.fanfare();
    Fx.confetti(90);
    const who = name ? ` ${name}` : '';
    Speech.say(r.stars
      ? [`כל הכבוד${who}! קִבַּלְתָּ ${countWord(r.stars, 'כּוֹכָב אֶחָד', 'כּוֹכָבִים')}${got ? ', וּמַדְבֵּקָה חֲדָשָׁה!' : ''}`]
      : [`סִיַּמְתָּ${who}! בּוֹא נְשַׂחֵק שׁוּב`]);
  },

  stickers() {
    App.screen = 'stickers';
    const s = Store.get(), have = Progress.stickerCount();
    const toNext = STARS_PER_STICKER - (s.stars % STARS_PER_STICKER);
    view().innerHTML = `
    <section class="screen stickers">
      <header class="bar">
        <button class="icon-btn" data-act="home" aria-label="הביתה">🏠</button>
        <div class="score">⭐ <b>${s.stars}</b></div>
        <span class="bar-gap"></span>
      </header>
      <h1 class="album-title">📒 המדבקות שלי</h1>
      <p class="album-note">${have < STICKERS.length ? `עוד ${toNext} ⭐ למדבקה הבאה` : 'אספת את כל המדבקות! 🎉'}</p>
      <div class="album">${STICKERS.map((e, k) => (k < have
        ? `<button class="sticker" data-sticker="${k}">${e}</button>`
        : '<span class="sticker locked">?</span>')).join('')}</div>
    </section>`;
    Speech.say(have
      ? [`יֵשׁ לְךָ ${countWord(have, 'מַדְבֵּקָה אַחַת', 'מַדְבֵּקוֹת')}`]
      : ['אוֹסְפִים כּוֹכָבִים, וּמְקַבְּלִים מַדְבֵּקוֹת']);
  },

  /* ---------- parent area parts shared by both pages (each page adds its own parent() file) ---------- */
  namePanel() {
    return `<div class="panel"><h2>שם הילד</h2>
      <input id="kidName" type="text" maxlength="20" value="${esc(Store.get().name)}" placeholder="למשל: יוֹנָתָן" autocomplete="off">
      <p class="note">נשמע בעידוד ("כל הכבוד, יונתן!"). נשמר רק במכשיר הזה. אם הקול מבטא לא נכון, כתבו עם ניקוד.</p></div>`;
  },

  progressPanel(extra) {
    const s = Store.get();
    return `<div class="panel"><h2>התקדמות</h2>
      <p>⭐ ${s.stars} כוכבים · 📒 ${Progress.stickerCount()} מתוך ${STICKERS.length} מדבקות · ${extra}</p>
      <p class="note">ההתקדמות נשמרת בדפדפן הזה בלבד. במכשיר אחר מתחילים מאפס.</p>
      <button class="btn danger" data-act="reset">איפוס התקדמות</button></div>`;
  },

  voiceWarning(onHome) {
    if (!this.voiceChecked && !Speech.loaded) return '';
    if (!Speech.supported) return '<p class="warn">הדפדפן הזה לא יודע להקריא. פתחו את המשחק ב-Chrome, Edge או Safari.</p>';
    const missing = [!Speech.current('en') && 'אנגלית', !Speech.current('he') && 'עברית'].filter(Boolean);
    if (!missing.length) return '';
    return `<p class="warn">⚠️ לא נמצא בדפדפן הזה קול ב${missing.join(' וב')}, ולכן חלק מהדיבור לא יישמע.
      במחשב Windows: פתחו ב-Microsoft Edge. בטאבלט אנדרואיד: Chrome, ובהגדרות "המרת טקסט לדיבור" ודאו
      שמותקנות עברית ואנגלית. באייפד: Safari. ${onHome ? '' : 'אחר כך חזרו לכאן ובחרו קול.'}</p>`;
  },

  voiceSelect(lang, label) {
    const s = Store.get(), list = Speech.voices(lang), cur = Speech.current(lang);
    if (!list.length) return '';
    const auto = cur && !s.voice[lang] ? ` (${esc(cur.name)})` : '';
    return `<label class="row">${label}
      <select id="voice-${lang}" data-lang="${lang}"><option value="">אוטומטי${auto}</option>${list.map(v =>
        `<option value="${esc(v.voiceURI)}" ${v.voiceURI === s.voice[lang] ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>`;
  },

  voicePanel() {
    const s = Store.get();
    return `<h2>קולות וצלילים</h2>${this.voiceWarning(false)}
      ${this.voiceSelect('en', 'קול באנגלית')}
      ${this.voiceSelect('he', 'קול בעברית')}
      <div class="row"><button class="btn ghost" data-act="voice-test">🔊 בדיקה (עברית ואנגלית)</button></div>
      <label class="row">מהירות דיבור <input id="rate" type="range" min="0.6" max="1.1" step="0.05" value="${s.rate}"></label>
      <label class="chk"><input id="sfx" type="checkbox" ${s.sfx ? 'checked' : ''}> צלילי משחק</label>`;
  },

  refreshVoices(force) {
    if (force) this.voiceChecked = true;
    const warn = $('#voiceWarn'), panel = $('#voicePanel');
    if (warn) warn.innerHTML = this.voiceWarning(true);
    if (panel && !panel.contains(document.activeElement)) panel.innerHTML = this.voicePanel();
  },
};
