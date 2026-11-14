'use strict';
/* Parent area of the reading/vocabulary page (words.html): reading stage and the sentences game. */

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
      ${s.setupDone ? '' : `<div class="panel intro"><b>ברוכים הבאים!</b> קריאה, איות ואוצר מילים באנגלית,
        לילד שמכיר את האותיות וקורא מילים קצרות לאט. הקריאה מתקדמת בסולם של חמישה שלבים, מ-cat ועד tree,
        ומשחק המשפטים נפתח בשלב 3. ההוראות מוקראות בעברית, והמילים באנגלית. אם הוא כבר קורא בקלות
        מילים של שלב מסוים, בחרו אותו למטה.</div>`}
      ${this.namePanel()}
      <div class="panel"><h2>שלב קריאה</h2>
        <p class="note">משחקי הקריאה והאיות מתרגלים את השלב הנוכחי וחוזרים על הקודמים. אחרי 8 תשובות נכונות
          בניסיון ראשון מתוך 10 האחרונות בשלב, הוא עולה שלב לבד.</p>
        <div class="stage-list">${STAGES.map(st => `
          <label class="chk stage-row"><input type="radio" name="stage" value="${st.n}" ${s.stage === st.n ? 'checked' : ''}>
            <b>${st.n}</b> ${st.name} <span class="lat" dir="ltr">${st.example}</span></label>`).join('')}</div></div>
      <div class="panel"><h2>משחק המשפטים</h2>
        <p class="note">נפתח לבד בשלב ${SENTENCES_STAGE}. אפשר לפתוח אותו מוקדם יותר אם הוא קורא משפטים קצרים.</p>
        <label class="chk"><input id="sentencesOpen" type="checkbox" ${s.sentencesOpen ? 'checked' : ''}> לפתוח עכשיו</label></div>
      <div class="panel" id="voicePanel">${this.voicePanel()}</div>
      ${this.progressPanel(`שלב ${s.stage} מתוך ${STAGES.length} · ${Vocab.knownCount()} מילים שהוא כבר יודע`)}
    </section>`;
  },

  // Settings only this page has; returns true when it handled the input.
  parentInput(t) {
    const s = Store.get();
    if (t.name === 'stage') {
      if (!t.checked) return true;
      s.stage = Number(t.value);
      s.stageLog = [];
    } else if (t.id === 'sentencesOpen') {
      s.sentencesOpen = t.checked;
    } else return false;
    Store.save();
    return true;
  },
});
