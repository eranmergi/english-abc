'use strict';
/* Parent area of the Hebrew spelling page (ktiv.html): his results per kind of mistake (each can be
   turned off), per sound-alike pair, and the words he gets wrong most. */

Object.assign(Screens, {
  parent() {
    App.screen = 'parent';
    const s = Store.get();
    const stat = st => (st && st.n ? `${st.ok} מתוך ${st.n} נכון` : 'עוד לא תורגל');
    const hard = Ktiv.hardWords();
    view().innerHTML = `
    <section class="screen parent">
      <header class="bar">
        <h1>⚙️ אזור הורים</h1>
        <button class="btn" data-act="parent-done">${s.setupDone ? 'חזרה למשחק' : 'שמירה ומשחק ▶'}</button>
      </header>
      ${s.setupDone ? '' : `<div class="panel intro"><b>ברוכים הבאים!</b> כתיב בעברית, לילד שקורא וכותב אבל טועה
        בכתיב. שלושה משחקים: איזו אות חסרה (ט או ת, כ או ק, אות סופית), הכתבה, ומילים תאומות (לא או לו, קרא או
        קרה). המשחק סופר כל סוג של טעות ומתרגל יותר את מה שקשה לו. המילים בכתיב מלא בלי ניקוד, כמו שכותבים
        בכיתה, וההוראות מוקראות.</div>`}
      ${this.namePanel()}
      <div class="panel"><h2>סוגי טעויות</h2>
        <p class="note">סוג שהוא טועה בו חוזר יותר. אפשר לכבות סוג שהוא כבר שולט בו.</p>
        <div class="stage-list">${Object.entries(CATS).map(([id, label]) => `
          <label class="chk"><input type="checkbox" data-cat="${id}" ${s.off.includes(id) ? '' : 'checked'}>
            <b>${label}</b> <span class="cat-stat">${stat(s.cats[id])}</span></label>`).join('')}</div></div>
      <div class="panel"><h2>מילים תאומות</h2>
        <div class="stage-list">${Object.entries(PAIRS).map(([id, ws]) => `
          <span><b>${ws.map(plain).join(' / ')}</b> <span class="cat-stat">${stat(s.pairs[id])}</span></span>`).join('')}</div></div>
      <div class="panel"><h2>מילים שקשות לו</h2>
        ${hard.length ? `<p class="hard-words">${hard.map(x => esc(x.w)).join(' · ')}</p>`
          : '<p class="note">עוד אין. כאן יופיעו המילים שהוא טעה בהן הכי הרבה.</p>'}</div>
      <div class="panel" id="voicePanel">${this.voicePanel()}</div>
      ${this.progressPanel(`${Ktiv.knownCount()} מילים שהוא כבר כותב נכון`)}
    </section>`;
  },

  // Settings only this page has; returns true when it handled the input.
  parentInput(t) {
    const c = t.dataset && t.dataset.cat;
    if (!c) return false;
    const s = Store.get();
    s.off = s.off.filter(x => x !== c).concat(t.checked ? [] : [c]);
    Store.save();
    return true;
  },
});
