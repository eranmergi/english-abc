'use strict';
/* Screens: home, game + question, learned-letter overlay, round end, sticker album, parent area. */

const view = () => $('#app');
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const countWord = (n, one, many) => (n === 1 ? one : `${n} ${many}`);
const CASE_LABEL = { upper: 'גדולות (ABC)', lower: 'קטנות (abc)', both: 'גם וגם' };

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
        <span class="mascot" id="mascot">🦖</span>
        <span class="title lat" dir="ltr">ABC</span>
      </button>
      <div class="menu">
        ${GAMES_META.map((g, k) => `
          <button class="tile-game" data-game="${g.id}" style="--c:${g.color}">
            <span class="num">${k + 1}</span><span class="ico">${g.icon}</span><span class="lbl">${g.title}</span>
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
      <div class="mascot corner" id="mascot">🦖</div>
    </section>`;
  },

  question(r) {
    const q = r.q, withHint = r.id === 'read' || r.id === 'build';
    const top = `
      <div class="show-row">
        <button class="show" data-act="replay" aria-label="לשמוע שוב">${q.show}</button>
        ${withHint ? '<button class="icon-btn hint" data-act="hint" aria-label="רמז">💡</button>' : ''}
      </div>
      <div class="meaning" id="meaning"></div>`;
    const body = q.kind === 'build'
      ? `<div class="slots lat" id="slots" dir="ltr">${q.letters.map((_, k) => `<span class="slot${k ? '' : ' next'}"></span>`).join('')}</div>
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

  // Full-screen celebration when a letter moves to "known".
  async learned(ch) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="card"><div class="big-letter lat" dir="ltr">${ch}${ch.toLowerCase()}</div>
      <p class="ov-text">🎉 אוֹת חֲדָשָׁה! 🎉</p></div>`;
    document.body.appendChild(ov);
    Sfx.fanfare();
    Fx.confetti();
    await Speech.say([SAY.newLetter, nameOf(ch), EN(KEYWORD[ch])]);
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

  /* ---------- parent area (adult text) ---------- */
  parent() {
    App.screen = 'parent';
    const s = Store.get();
    view().innerHTML = `
    <section class="screen parent">
      <header class="bar">
        <h1>⚙️ אזור הורים</h1>
        <button class="btn" data-act="parent-done">${s.setupDone ? 'חזרה למשחק' : 'שמירה ומשחק ▶'}</button>
      </header>
      ${s.setupDone ? '' : `<div class="panel intro"><b>ברוכים הבאים!</b> חמישה משחקים להכרת האותיות באנגלית:
        שם האות, אות גדולה וקטנה, הצליל הראשון של מילה, ובסוף בנייה וקריאה של מילים קצרות.
        ההוראות מוקראות בעברית, והאותיות והמילים באנגלית. סמנו למטה את האותיות שהילד כבר מכיר:
        המשחק יתרגל אותן ויוסיף כל פעם שתי אותיות חדשות.</div>`}
      <div class="panel"><h2>שם הילד</h2>
        <input id="kidName" type="text" maxlength="20" value="${esc(s.name)}" placeholder="למשל: יוֹנָתָן" autocomplete="off">
        <p class="note">נשמע בעידוד ("כל הכבוד, יונתן!"). נשמר רק במכשיר הזה. אם הקול מבטא לא נכון, כתבו עם ניקוד.</p></div>
      <div class="panel"><h2>אותיות</h2>
        <p class="note">לחיצה על אות מחליפה מצב: <span class="tag known">מכיר</span> →
          <span class="tag pinned">לתרגל עכשיו</span> → רגילה. אם לא בחרתם אותיות לתרגול, המשחק בוחר לבד
          את שתי הבאות בתור (<span class="tag auto">מסגרת מקווקוות</span>). אות שזוהתה נכון ${LEARN_STREAK} פעמים ברצף
          עוברת ל"מכיר" לבד. המספר מתחת לאות: תשובות נכונות בניסיון ראשון מתוך כל הפעמים.</p>
        <div id="letterBox">${this.letterBox()}</div></div>
      <div class="panel"><h2>אותיות גדולות או קטנות</h2>
        <p class="note">איך יוצגו האותיות במשחקים 1 ו-3. משחק 2 תמיד מתרגל את שתיהן, והמילים תמיד באותיות קטנות.</p>
        <div class="row">${Object.entries(CASE_LABEL).map(([k, label]) => `
          <label class="chk"><input type="radio" name="caseMode" value="${k}" ${s.caseMode === k ? 'checked' : ''}> ${label}</label>`).join('')}</div></div>
      <div class="panel" id="voicePanel">${this.voicePanel()}</div>
      <div class="panel"><h2>התקדמות</h2>
        <p>⭐ ${s.stars} כוכבים · 📒 ${Progress.stickerCount()} מתוך ${STICKERS.length} מדבקות ·
          ${s.known.length} מתוך ${LETTERS.length} אותיות</p>
        <p class="note">ההתקדמות נשמרת בדפדפן הזה בלבד. במכשיר אחר מתחילים מאפס.</p>
        <button class="btn danger" data-act="reset">איפוס התקדמות</button></div>
    </section>`;
  },

  letterBox() {
    const s = Store.get(), focus = Progress.focus();
    const grid = LETTERS.map(({ ch }) => {
      const st = s.stats[ch];
      const cls = s.known.includes(ch) ? 'known' : s.pinned.includes(ch) ? 'pinned' : focus.includes(ch) ? 'auto' : '';
      return `<button class="lt lat ${cls}" data-letter="${ch}" dir="ltr">${ch}${ch.toLowerCase()}<small>${st && st.n ? `${st.ok}/${st.n}` : '&nbsp;'}</small></button>`;
    }).join('');
    const now = focus.length ? `לומד עכשיו: <b class="lat" dir="ltr">${focus.join(' ')}</b>` : 'הוא מכיר את כל האותיות! 🎉';
    return `<div class="letter-grid" dir="ltr">${grid}</div><p class="note now">${now}</p>`;
  },

  toggleLetter(ch) {
    const s = Store.get();
    if (s.known.includes(ch)) {
      s.known = s.known.filter(c => c !== ch);
      s.pinned.push(ch);
    } else if (s.pinned.includes(ch)) {
      s.pinned = s.pinned.filter(c => c !== ch);
    } else {
      s.known.push(ch);
    }
    Store.save();
    $('#letterBox').innerHTML = this.letterBox();
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
