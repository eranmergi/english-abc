'use strict';
/* Game content: English letters and words, Hebrew meanings, stickers, spoken phrases.
   Instructions are spoken in Hebrew (the child reads Hebrew); letters and words in English. */

const LETTERS = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(ch => ({ ch }));
const LETTER = Object.fromEntries(LETTERS.map(l => [l.ch, l]));

// Phonics-friendly order (s a t p i n first), so short words become buildable early.
const TEACH_ORDER = Array.from('SATPINMDGOCKEURHBFLJVWXYZQ');

// One word said after a letter, "B... ball", to tie the letter to its sound.
const KEYWORD = {
  A: 'apple', B: 'ball', C: 'cat', D: 'dog', E: 'egg', F: 'fish', G: 'goat', H: 'hat', I: 'ice cream',
  J: 'juice', K: 'key', L: 'lion', M: 'moon', N: 'nose', O: 'octopus', P: 'pig', Q: 'queen',
  R: 'rabbit', S: 'sun', T: 'tree', U: 'umbrella', V: 'van', W: 'whale', X: 'x-ray', Y: 'yo-yo', Z: 'zebra',
};

// Letter names that rhyme by ear (bee/dee/pee...): never offered together when listening for a name.
const NAME_ALIKE = ['BCDEGPTVZ', 'AJK', 'MN', 'FSX', 'IY', 'QUW'].map(g => Array.from(g));

// First sounds a Hebrew-speaking child cannot tell apart (c/k/q, short vowels, v/w), plus letters whose
// name starts with another letter's sound: U "you" ~ yarn, G "jee" ~ juice, C "see" ~ sun, Y "why" ~ whale.
const SOUND_ALIKE = ['CKQ', 'AEIOU', 'VW', 'UY', 'GJ', 'CS', 'WY'].map(g => Array.from(g));

// Shapes children mix up; offered on purpose in the big/small game.
const LOOK_ALIKE = {
  lower: ['bdpq', 'nuh', 'mw', 'ilj', 'ft', 'ao', 'ce'].map(g => Array.from(g)),
  upper: ['MW', 'EF', 'OQCG', 'PRB', 'ILT', 'UV'].map(g => Array.from(g)),
};

// [word, picture, Hebrew meaning, readable]
// readable: 1 = short regular word (cat, sun) used in the build and read games; 0 = picture games only.
// Every word starts with its letter's plain sound: no sh/ch/th, no silent letters, no soft c or g.
const WORDS = [
  ['ant', '🐜', 'נמלה', 1], ['apple', '🍎', 'תפוח', 0], ['alligator', '🐊', 'תנין', 0],
  ['bus', '🚌', 'אוטובוס', 1], ['bat', '🦇', 'עטלף', 1], ['bed', '🛏️', 'מיטה', 1], ['bag', '🎒', 'תיק', 1],
  ['bug', '🐛', 'חרק', 1], ['ball', '⚽', 'כדור', 0], ['banana', '🍌', 'בננה', 0], ['bear', '🐻', 'דוב', 0],
  ['bee', '🐝', 'דבורה', 0], ['book', '📖', 'ספר', 0],
  ['cat', '🐱', 'חתול', 1], ['cup', '🥤', 'כוס', 1], ['cap', '🧢', 'כובע מצחייה', 1], ['cow', '🐄', 'פרה', 0],
  ['car', '🚗', 'מכונית', 0], ['cake', '🎂', 'עוגה', 0], ['carrot', '🥕', 'גזר', 0], ['corn', '🌽', 'תירס', 0],
  ['dog', '🐶', 'כלב', 1], ['duck', '🦆', 'ברווז', 0], ['door', '🚪', 'דלת', 0], ['drum', '🥁', 'תוף', 0],
  ['egg', '🥚', 'ביצה', 1], ['elephant', '🐘', 'פיל', 0], ['envelope', '✉️', 'מעטפה', 0],
  ['fox', '🦊', 'שועל', 1], ['fish', '🐟', 'דג', 0], ['frog', '🐸', 'צפרדע', 0], ['fire', '🔥', 'אש', 0],
  ['flower', '🌸', 'פרח', 0],
  ['goat', '🐐', 'עז', 0], ['gift', '🎁', 'מתנה', 0], ['grapes', '🍇', 'ענבים', 0], ['guitar', '🎸', 'גיטרה', 0],
  ['ghost', '👻', 'רוח רפאים', 0],
  ['hat', '🎩', 'כובע', 1], ['hen', '🐔', 'תרנגולת', 1], ['horse', '🐴', 'סוס', 0], ['house', '🏠', 'בית', 0],
  ['hand', '✋', 'יד', 0], ['heart', '❤️', 'לב', 0],
  ['ice cream', '🍦', 'גלידה', 0], ['island', '🏝️', 'אי', 0],
  ['juice', '🧃', 'מיץ', 0], ['jeans', '👖', 'ג׳ינס', 0], ['jacket', '🧥', 'מעיל', 0],
  ['key', '🔑', 'מפתח', 0], ['king', '🤴', 'מלך', 0], ['kangaroo', '🦘', 'קנגורו', 0], ['koala', '🐨', 'קואלה', 0],
  ['leg', '🦵', 'רגל', 1], ['lion', '🦁', 'אריה', 0], ['lemon', '🍋', 'לימון', 0], ['lollipop', '🍭', 'סוכרייה על מקל', 0],
  ['ladybug', '🐞', 'פרת משה רבנו', 0],
  ['map', '🗺️', 'מפה', 1], ['mug', '☕', 'ספל', 1], ['monkey', '🐵', 'קוף', 0], ['moon', '🌙', 'ירח', 0],
  ['mouse', '🐭', 'עכבר', 0], ['milk', '🥛', 'חלב', 0], ['mushroom', '🍄', 'פטרייה', 0],
  ['net', '🥅', 'רשת', 1], ['nut', '🥜', 'אגוז', 1], ['nose', '👃', 'אף', 0], ['noodles', '🍜', 'אטריות', 0],
  ['ox', '🐂', 'שור', 1], ['octopus', '🐙', 'תמנון', 0], ['orange', '🍊', 'תפוז', 0], ['owl', '🦉', 'ינשוף', 0],
  ['pig', '🐷', 'חזיר', 1], ['pen', '🖊️', 'עט', 1], ['pin', '📌', 'נעץ', 1], ['pizza', '🍕', 'פיצה', 0],
  ['penguin', '🐧', 'פינגווין', 0], ['pear', '🍐', 'אגס', 0], ['panda', '🐼', 'פנדה', 0], ['pumpkin', '🎃', 'דלעת', 0],
  ['popcorn', '🍿', 'פופקורן', 0],
  ['queen', '👸', 'מלכה', 0], ['question', '❓', 'שאלה', 0],
  ['rat', '🐀', 'עכברוש', 1], ['rabbit', '🐰', 'ארנב', 0], ['rainbow', '🌈', 'קשת בענן', 0], ['robot', '🤖', 'רובוט', 0],
  ['ring', '💍', 'טבעת', 0], ['rocket', '🚀', 'טיל', 0], ['rose', '🌹', 'ורד', 0],
  ['sun', '☀️', 'שמש', 1], ['snake', '🐍', 'נחש', 0], ['star', '⭐', 'כוכב', 0], ['sock', '🧦', 'גרב', 0],
  ['snail', '🐌', 'שבלול', 0], ['spoon', '🥄', 'כפית', 0],
  ['ten', '🔟', 'עשר', 1], ['tree', '🌳', 'עץ', 0], ['train', '🚂', 'רכבת', 0], ['turtle', '🐢', 'צב', 0],
  ['tomato', '🍅', 'עגבנייה', 0], ['tooth', '🦷', 'שן', 0], ['tent', '⛺', 'אוהל', 0], ['tiger', '🐯', 'טיגריס', 0],
  ['umbrella', '☂️', 'מטרייה', 0], ['unicorn', '🦄', 'חד קרן', 0], ['up', '⬆️', 'למעלה', 1],
  ['van', '🚐', 'ואן', 1], ['violin', '🎻', 'כינור', 0], ['volcano', '🌋', 'הר געש', 0],
  ['web', '🕸️', 'קורי עכביש', 1], ['whale', '🐳', 'לווייתן', 0], ['watch', '⌚', 'שעון יד', 0],
  ['watermelon', '🍉', 'אבטיח', 0],
  ['yarn', '🧶', 'חוט צמר', 0], ['yo-yo', '🪀', 'יו-יו', 0],
  ['zebra', '🦓', 'זברה', 0],
].map(([w, e, he, r]) => ({ w, e, he, r }));

const GAMES_META = [
  { id: 'letters', icon: '<span class="ico-lat">ABC</span>', title: 'אותיות', color: '#ff8fab' },
  { id: 'cases', icon: '<span class="ico-lat">Aa</span>', title: 'גדולה וקטנה', color: '#9b7bff' },
  { id: 'first', icon: '🐶', title: 'צליל ראשון', color: '#ffb703' },
  { id: 'build', icon: '🧩', title: 'בונים מילה', color: '#4cc9f0' },
  { id: 'read', icon: '📖', title: 'קוראים מילה', color: '#2ec4b6' },
];

const STICKERS = ['🦖', '🚀', '🦈', '🐉', '🦁', '🐯', '🦊', '🐼', '🐙', '🦋', '🐬', '🦒', '🐧', '🦜', '🛸',
  '⚽', '🏀', '🎸', '🎮', '🌋', '🌈', '🍕', '🍩', '🦄', '🐲', '👾', '🤖', '🏆', '🦅', '🐊'];
const STARS_PER_STICKER = 5;

// Speech parts: a plain string is Hebrew, EN('...') is English.
const EN = text => ({ en: text });

const SAY = {
  praise: [['כל הכבוד'], ['מצוין'], ['יופי'], ['אלוף'], ['נהדר'], ['בדיוק'],
    [EN('Great job!')], [EN('Awesome!')], [EN('Well done!')], [EN('Super!')]],
  retry: 'נַסֵּה שׁוּב',
  hello: 'שָׁלוֹם',
  choose: 'בְּחַר מִשְׂחָק',
  readFirst: 'קְרָא אֶת הַמִּלָּה, וּמְצָא אֶת הַתְּמוּנָה',
  readNext: 'מָה כָּתוּב כָּאן?',
  notYet: 'עוֹד לֹא. אֵיזוֹ אוֹת בָּאָה קֹדֶם?',
  newLetter: 'יֵשׁ! לָמַדְתָּ אוֹת חֲדָשָׁה!',
  test: ['שָׁלוֹם! בּוֹא נִלְמַד אַנְגְּלִית.', EN('Hello! A, B, C. Let\'s learn English!')],
};
