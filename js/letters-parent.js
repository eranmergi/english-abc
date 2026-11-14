'use strict';
/* Parent area of the letters page (index.html): which letters he knows, capital or small letters. */

const CASE_LABEL = { upper: 'גדולות (ABC)', lower: 'קטנות (abc)', both: 'גם וגם' };

Object.assign(Screens, {
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
      ${this.namePanel()}
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
      ${this.progressPanel(`${s.known.length} מתוך ${LETTERS.length} אותיות`)}
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
});
