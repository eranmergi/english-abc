'use strict';
/* Shared plumbing: helpers, saved state, two-language speech, sound effects, visual effects, letter progress. */

const ROUND_SIZE = 8;     // questions per round
const LEARN_STREAK = 5;   // first-try answers in a row that move a letter to "known"

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const rand = n => Math.floor(Math.random() * n);
const pick = arr => arr[rand(arr.length)];
const sleep = ms => new Promise(res => setTimeout(res, ms));
const lettersOf = w => Array.from(w.toUpperCase()).filter(c => LETTER[c]);
// A capital letter spoken alone is read by its name ("ay", "bee"); inside a sentence "A" can become "uh".
// A Hebrew page gives its own letter names (APP.nameOf).
const nameOf = ch => (APP.nameOf ? APP.nameOf(ch) : { en: ch.toUpperCase(), solo: true });
const related = (groups, a, b) => a === b || groups.some(g => g.includes(a) && g.includes(b));
const inCase = (ch, kase) => (kase === 'lower' ? ch.toLowerCase() : ch.toUpperCase());
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- saved state (localStorage; plays on without it if the browser blocks storage) ---------- */
const Store = (() => {
  // Each page has its own key (APP.key): all the family's games share one github.io origin.
  const KEY = APP.key;
  const defaults = () => Object.assign({
    name: '', known: [], pinned: [], stats: {}, stars: 0,
    caseMode: 'upper', rate: 0.85, voice: { he: '', en: '' }, sfx: true, setupDone: false,
  }, JSON.parse(JSON.stringify(APP.defaults || {}))); // the page's own fields
  let state = null;

  function clean(s) {
    // known/pinned letters belong to the letters page; other pages have no LETTER table
    const letters = v => (Array.isArray(v) && typeof LETTER !== 'undefined' ? v.filter(c => LETTER[c]) : []);
    s.known = letters(s.known);
    s.pinned = letters(s.pinned).filter(c => !s.known.includes(c));
    if (!['upper', 'lower', 'both'].includes(s.caseMode)) s.caseMode = 'upper';
    s.rate = Math.min(1.2, Math.max(0.5, Number(s.rate) || 0.85));
    s.stars = Math.max(0, parseInt(s.stars, 10) || 0);
    if (!s.stats || typeof s.stats !== 'object') s.stats = {};
    const v = s.voice && typeof s.voice === 'object' ? s.voice : {};
    s.voice = { he: String(v.he || ''), en: String(v.en || '') };
    s.name = String(s.name || '').slice(0, 20);
    return s;
  }
  function get() {
    if (!state) {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { /* no storage */ }
      state = clean(Object.assign(defaults(), saved));
    }
    return state;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* no storage */ }
  }
  function reset() {
    const s = get();
    state = Object.assign(defaults(), { name: s.name, voice: s.voice, rate: s.rate, sfx: s.sfx, caseMode: s.caseMode });
    save();
  }
  return { get, save, reset };
})();

/* ---------- speech: Hebrew instructions, English letters and words ---------- */
const Speech = (() => {
  const synth = window.speechSynthesis || null;
  const LANG = { he: { re: /^(he|iw)([-_]|$)/i, tag: 'he-IL' }, en: { re: /^en([-_]|$)/i, tag: 'en-US' } };
  const listeners = [];
  const voice = { he: null, en: null };
  let gen = 0, loaded = false, queue = [];

  const all = () => (synth ? synth.getVoices() : []);
  const voices = lang => all().filter(v => LANG[lang].re.test(v.lang));
  const quality = v => (/natural|online|neural|premium|enhanced/i.test(v.name) ? 4 : 0) +
    (/google/i.test(v.name) ? 2 : 0) + (/^en[-_]US/i.test(v.lang) ? 1 : 0);

  function choose() {
    if (all().length) loaded = true;
    const want = Store.get().voice;
    for (const lang of ['he', 'en']) {
      const list = voices(lang);
      voice[lang] = list.find(v => v.voiceURI === want[lang]) || list.sort((a, b) => quality(b) - quality(a))[0] || null;
    }
    listeners.forEach(fn => fn());
  }
  if (synth) {
    choose();
    synth.onvoiceschanged = choose;
  }

  // Strings are Hebrew, {en} parts English; neighbours in one language become one utterance,
  // except letter names ({solo}), which always get an utterance of their own.
  function segments(parts) {
    const out = [];
    for (const p of [].concat(parts)) {
      const seg = typeof p === 'string' ? { lang: 'he', text: p }
        : p && p.en ? { lang: 'en', text: p.en, solo: !!p.solo } : null;
      if (!seg) continue;
      seg.text = seg.text.trim().replace(/^[.,?!\s]+/, '');
      if (!/[\p{L}\p{N}]/u.test(seg.text)) continue; // a lone "?" would be read aloud as "question mark"
      const last = out[out.length - 1];
      if (last && last.lang === seg.lang && !last.solo && !seg.solo) last.text += ' ' + seg.text;
      else out.push(seg);
    }
    return out;
  }

  function utter(seg) {
    return new Promise(resolve => {
      const u = new SpeechSynthesisUtterance(seg.text);
      const v = voice[seg.lang];
      u.lang = v ? v.lang : LANG[seg.lang].tag; // the language tag, not just the voice, picks the engine on Android
      if (v) u.voice = v;
      u.rate = Store.get().rate;
      u.pitch = 1.05;
      let timer = null;
      const done = () => { clearTimeout(timer); resolve(); };
      u.onend = done;
      u.onerror = done;
      timer = setTimeout(done, 2000 + seg.text.length * 130); // some engines never fire onend
      queue.push(u); // keep references: Chrome drops events of garbage-collected utterances
      synth.speak(u);
    });
  }

  // Resolves when all parts are spoken; true if nothing newer interrupted.
  async function say(parts) {
    const segs = segments(parts);
    if (!synth || !segs.length) return false;
    const my = ++gen;
    synth.cancel();
    queue = [];
    for (const seg of segs) {
      if (my !== gen) return false;
      await utter(seg);
    }
    return my === gen;
  }

  return {
    say,
    stop() { gen++; queue = []; if (synth) synth.cancel(); },
    voices,
    choose,
    onChange: fn => listeners.push(fn),
    get supported() { return !!synth; },
    get loaded() { return loaded; },
    current: lang => voice[lang],
  };
})();

/* ---------- sound effects (generated, no audio files) ---------- */
const Sfx = (() => {
  let ctx = null;
  function audio() {
    if (!Store.get().sfx) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function notes(list, type, vol) {
    const c = audio();
    if (!c) return;
    const t0 = c.currentTime + 0.02;
    list.forEach(([freq, at, dur]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t0 + at);
      o.stop(t0 + at + dur + 0.05);
    });
  }
  return {
    pop: () => notes([[880, 0, 0.09]], 'triangle', 0.12),
    good: () => notes([[523, 0, 0.15], [659, 0.1, 0.15], [784, 0.2, 0.3]], 'triangle', 0.2),
    bad: () => notes([[247, 0, 0.16], [208, 0.14, 0.24]], 'sine', 0.12),
    fanfare: () => notes([[523, 0, 0.16], [659, 0.15, 0.16], [784, 0.3, 0.16], [1047, 0.45, 0.6]], 'triangle', 0.2),
  };
})();

/* ---------- visual effects ---------- */
const Fx = {
  confetti(n = 70) {
    const box = $('#fx'), colors = ['#ff8fab', '#ffb703', '#4cc9f0', '#2ec4b6', '#9b7bff', '#fb5607'];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i');
      d.className = 'confetti';
      d.style.left = Math.random() * 100 + 'vw';
      d.style.background = pick(colors);
      d.style.animationDuration = 2 + Math.random() * 1.8 + 's';
      d.style.animationDelay = Math.random() * 0.5 + 's';
      box.appendChild(d);
      setTimeout(() => d.remove(), 4500);
    }
  },
  starFrom(el) {
    const r = el.getBoundingClientRect(), s = document.createElement('i');
    s.className = 'fly-star';
    s.textContent = '⭐';
    s.style.left = r.left + r.width / 2 + 'px';
    s.style.top = r.top + r.height / 3 + 'px';
    $('#fx').appendChild(s);
    setTimeout(() => s.remove(), 1200);
  },
};

/* ---------- which letters to practise ---------- */
const Progress = {
  // Letters being learned now: the ones the parent pinned, else the next two in teaching order.
  focus() {
    const s = Store.get();
    const pinned = s.pinned.filter(c => !s.known.includes(c));
    return pinned.length ? pinned : TEACH_ORDER.filter(c => !s.known.includes(c)).slice(0, 2);
  },
  pool() {
    const s = Store.get(), focus = this.focus();
    return TEACH_ORDER.filter(c => s.known.includes(c) || focus.includes(c));
  },
  optionCount() { return this.pool().length >= 8 ? 4 : 3; },

  // Weighted pick: letters being learned and letters often missed come up more.
  pickLetter(avoid = []) {
    const s = Store.get(), focus = this.focus(), pool = this.pool();
    const list = pool.filter(c => !avoid.includes(c));
    const from = list.length ? list : pool;
    const weights = from.map(c => {
      if (focus.includes(c)) return 4;
      const st = s.stats[c];
      return st && st.n ? 1 + 3 * (1 - st.ok / st.n) : 1.5;
    });
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < from.length; i++) {
      r -= weights[i];
      if (r <= 0) return from[i];
    }
    return from[from.length - 1];
  },

  // Wrong answers: letters he practises first, then the next ones to learn; ok() filters out unfair ones.
  distractors(target, n, ok = () => true) {
    const pool = shuffle(this.pool()), rest = TEACH_ORDER.filter(c => !pool.includes(c));
    const out = [];
    for (const c of pool.concat(rest)) {
      if (out.length >= n) break;
      if (c !== target && ok(c)) out.push(c);
    }
    return out;
  },

  // Returns true when this answer completed learning the letter.
  record(ch, firstTry) {
    const s = Store.get();
    const st = s.stats[ch] || (s.stats[ch] = { n: 0, ok: 0, streak: 0 });
    st.n++;
    if (firstTry) { st.ok++; st.streak++; } else st.streak = 0;
    let learned = false;
    if (!s.known.includes(ch) && st.streak >= LEARN_STREAK) {
      s.known.push(ch);
      s.pinned = s.pinned.filter(c => c !== ch);
      learned = true;
    }
    Store.save();
    return learned;
  },

  stickerCount() { return Math.min(STICKERS.length, Math.floor(Store.get().stars / STARS_PER_STICKER)); },

  // Adds a star; returns the index of a sticker it unlocked, or -1.
  addStar() {
    const before = this.stickerCount();
    Store.get().stars++;
    Store.save();
    return this.stickerCount() > before ? before : -1;
  },
};
