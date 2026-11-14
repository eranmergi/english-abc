'use strict';
/* Content of the reading/vocabulary page (words.html): reading stages, words, sentences, stickers, phrases.
   For a child who knows the letters and reads short words slowly. Instructions in Hebrew, English content. */

const APP = {
  key: 'words.v1', title: 'Word Quest', mascot: '🚀',
  defaults: { stage: 1, stageLog: [], vocab: {}, sentencesOpen: false },
};

const LETTERS = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(ch => ({ ch }));
const LETTER = Object.fromEntries(LETTERS.map(l => [l.ch, l]));

// Speech parts: a plain string is Hebrew, EN('...') is English.
const EN = text => ({ en: text });

// The reading ladder. A stage opens after 8 of the last 10 stage words were read or spelled on the first try.
const STAGES = [
  { n: 1, name: 'מילים קצרות', example: 'cat · sun · pig' },
  { n: 2, name: 'sh, ch, th, ck, ng', example: 'ship · chick · duck' },
  { n: 3, name: 'צירופי עיצורים', example: 'frog · stop · plant' },
  { n: 4, name: 'e שקטה בסוף', example: 'cake · bike · bone' },
  { n: 5, name: 'צמדי תנועות ee, oa, ai, ea', example: 'tree · boat · rain' },
];
const SENTENCES_STAGE = 3; // sentences open here: before that he cannot read them fluently

// [word, picture, Hebrew, stage, flags]
// stage 1-5: follows that stage's reading rule (reading and spelling games); 0: vocabulary only.
// flags 'nd': not for dictation, it sounds like another word (sun/son, rose/rows).
// Left out on purpose: rule-breakers (have, some, bread in stages), words with two readings (read, live, wind).
const WORDS = [
  ['cat', '🐱', 'חתול', 1], ['dog', '🐶', 'כלב', 1], ['pig', '🐷', 'חזיר', 1], ['bus', '🚌', 'אוטובוס', 1],
  ['bed', '🛏️', 'מיטה', 1], ['box', '📦', 'קופסה', 1], ['fox', '🦊', 'שועל', 1], ['hat', '🎩', 'כובע', 1],
  ['hen', '🐔', 'תרנגולת', 1], ['map', '🗺️', 'מפה', 1], ['pen', '🖊️', 'עט', 1], ['net', '🥅', 'רשת', 1],
  ['web', '🕸️', 'קורי עכביש', 1], ['van', '🚐', 'ואן', 1], ['bat', '🦇', 'עטלף', 1], ['bug', '🐛', 'חרק', 1],
  ['rat', '🐀', 'עכברוש', 1], ['six', '6️⃣', 'שש', 1], ['ten', '🔟', 'עשר', 1], ['egg', '🥚', 'ביצה', 1],
  ['ant', '🐜', 'נמלה', 1], ['leg', '🦵', 'רגל', 1], ['cup', '🥤', 'כוס', 1], ['sun', '☀️', 'שמש', 1, 'nd'],

  ['ship', '🚢', 'ספינה', 2], ['fish', '🐟', 'דג', 2], ['shell', '🐚', 'צדף', 2], ['shop', '🏪', 'חנות', 2],
  ['chick', '🐤', 'אפרוח', 2], ['chips', '🍟', 'צ׳יפס', 2], ['duck', '🦆', 'ברווז', 2], ['sock', '🧦', 'גרב', 2],
  ['lock', '🔒', 'מנעול', 2], ['bath', '🛁', 'אמבטיה', 2], ['ring', '💍', 'טבעת', 2], ['king', '🤴', 'מלך', 2],

  ['frog', '🐸', 'צפרדע', 3], ['flag', '🚩', 'דגל', 3], ['drum', '🥁', 'תוף', 3], ['crab', '🦀', 'סרטן', 3],
  ['stop', '🛑', 'עצור', 3], ['plant', '🌱', 'צמח', 3], ['milk', '🥛', 'חלב', 3], ['tent', '⛺', 'אוהל', 3],
  ['clock', '⏰', 'שעון', 3], ['truck', '🚚', 'משאית', 3], ['sled', '🛷', 'מזחלת', 3], ['gift', '🎁', 'מתנה', 3],
  ['hand', '✋', 'יד', 3], ['brick', '🧱', 'לבנה', 3], ['plug', '🔌', 'תקע', 3],

  ['cake', '🎂', 'עוגה', 4], ['bike', '🚲', 'אופניים', 4], ['kite', '🪁', 'עפיפון', 4], ['bone', '🦴', 'עצם', 4],
  ['rose', '🌹', 'ורד', 4, 'nd'], ['cube', '🧊', 'קובייה', 4], ['nose', '👃', 'אף', 4, 'nd'], ['game', '🎮', 'משחק', 4],
  ['plane', '✈️', 'מטוס', 4, 'nd'], ['snake', '🐍', 'נחש', 4], ['five', '5️⃣', 'חמש', 4], ['nine', '9️⃣', 'תשע', 4],
  ['smile', '😊', 'חיוך', 4], ['globe', '🌍', 'גלובוס', 4], ['home', '🏠', 'בית', 4], ['grape', '🍇', 'ענב', 4],
  ['whale', '🐳', 'לווייתן', 4, 'nd'], ['pine', '🌲', 'עץ אורן', 4], ['skate', '⛸️', 'מחליק', 4],

  ['tree', '🌳', 'עץ', 5], ['bee', '🐝', 'דבורה', 5, 'nd'], ['sheep', '🐑', 'כבשה', 5], ['boat', '⛵', 'סירה', 5],
  ['goat', '🐐', 'עז', 5], ['coat', '🧥', 'מעיל', 5], ['soap', '🧼', 'סבון', 5], ['rain', '🌧️', 'גשם', 5, 'nd'],
  ['train', '🚂', 'רכבת', 5], ['snail', '🐌', 'שבלול', 5], ['leaf', '🍃', 'עלה', 5], ['peach', '🍑', 'אפרסק', 5],
  ['three', '3️⃣', 'שלוש', 5], ['queen', '👸', 'מלכה', 5], ['sleep', '😴', 'לישון', 5], ['paint', '🎨', 'לצבוע', 5],
  ['beach', '🏖️', 'חוף ים', 5, 'nd'],

  ['red', '🟥', 'אדום', 0], ['blue', '🟦', 'כחול', 0], ['green', '🟩', 'ירוק', 0], ['yellow', '🟨', 'צהוב', 0],
  ['orange', '🟧', 'כתום', 0], ['purple', '🟪', 'סגול', 0], ['brown', '🟫', 'חום', 0], ['black', '⬛', 'שחור', 0],
  ['white', '⬜', 'לבן', 0],
  ['one', '1️⃣', 'אחת', 0], ['two', '2️⃣', 'שתיים', 0], ['four', '4️⃣', 'ארבע', 0], ['seven', '7️⃣', 'שבע', 0],
  ['eight', '8️⃣', 'שמונה', 0],
  ['mother', '👩', 'אמא', 0], ['father', '👨', 'אבא', 0], ['baby', '👶', 'תינוק', 0], ['boy', '👦', 'ילד', 0],
  ['girl', '👧', 'ילדה', 0], ['grandmother', '👵', 'סבתא', 0], ['grandfather', '👴', 'סבא', 0],
  ['eye', '👁️', 'עין', 0], ['ear', '👂', 'אוזן', 0], ['mouth', '👄', 'פה', 0], ['foot', '🦶', 'כף רגל', 0],
  ['tooth', '🦷', 'שן', 0],
  ['apple', '🍎', 'תפוח', 0], ['banana', '🍌', 'בננה', 0], ['bread', '🍞', 'לחם', 0], ['cheese', '🧀', 'גבינה', 0],
  ['pizza', '🍕', 'פיצה', 0], ['water', '💧', 'מים', 0], ['juice', '🧃', 'מיץ', 0], ['ice cream', '🍦', 'גלידה', 0],
  ['carrot', '🥕', 'גזר', 0], ['tomato', '🍅', 'עגבנייה', 0], ['cookie', '🍪', 'עוגייה', 0], ['chicken', '🍗', 'עוף', 0],
  ['rice', '🍚', 'אורז', 0], ['pear', '🍐', 'אגס', 0],
  ['horse', '🐴', 'סוס', 0], ['cow', '🐄', 'פרה', 0], ['lion', '🦁', 'אריה', 0], ['tiger', '🐯', 'טיגריס', 0],
  ['monkey', '🐵', 'קוף', 0], ['elephant', '🐘', 'פיל', 0], ['rabbit', '🐰', 'ארנב', 0], ['bird', '🐦', 'ציפור', 0],
  ['bear', '🐻', 'דוב', 0], ['butterfly', '🦋', 'פרפר', 0], ['spider', '🕷️', 'עכביש', 0], ['turtle', '🐢', 'צב', 0],
  ['penguin', '🐧', 'פינגווין', 0], ['owl', '🦉', 'ינשוף', 0], ['zebra', '🦓', 'זברה', 0], ['giraffe', '🦒', 'ג׳ירפה', 0],
  ['shirt', '👕', 'חולצה', 0], ['dress', '👗', 'שמלה', 0], ['shoes', '👟', 'נעליים', 0], ['glasses', '👓', 'משקפיים', 0],
  ['door', '🚪', 'דלת', 0], ['chair', '🪑', 'כיסא', 0], ['book', '📖', 'ספר', 0], ['pencil', '✏️', 'עיפרון', 0],
  ['bag', '🎒', 'תיק', 0], ['computer', '💻', 'מחשב', 0], ['phone', '📱', 'טלפון', 0], ['key', '🔑', 'מפתח', 0],
  ['ball', '⚽', 'כדור', 0], ['school', '🏫', 'בית ספר', 0],
  ['flower', '🌸', 'פרח', 0], ['moon', '🌙', 'ירח', 0], ['star', '⭐', 'כוכב', 0], ['snow', '❄️', 'שלג', 0],
  ['fire', '🔥', 'אש', 0], ['cloud', '☁️', 'ענן', 0], ['mountain', '⛰️', 'הר', 0], ['rainbow', '🌈', 'קשת בענן', 0],
  ['car', '🚗', 'מכונית', 0], ['taxi', '🚕', 'מונית', 0], ['helicopter', '🚁', 'מסוק', 0],
  ['run', '🏃', 'לרוץ', 0], ['swim', '🏊', 'לשחות', 0], ['sing', '🎤', 'לשיר', 0], ['dance', '💃', 'לרקוד', 0],
  ['cry', '😢', 'לבכות', 0], ['laugh', '😂', 'לצחוק', 0], ['happy', '😀', 'שמח', 0], ['sad', '😞', 'עצוב', 0],
  ['angry', '😠', 'כועס', 0], ['hot', '🥵', 'חם', 0], ['cold', '🥶', 'קר', 0],
].map(([w, e, he, stage, flags]) => ({ w, e, he, stage, nd: flags === 'nd' }));

// Words whose pictures or meanings are too close to offer against each other.
const SIMILAR = [
  ['ship', 'boat'], ['rose', 'flower'], ['pine', 'tree'], ['rain', 'cloud'], ['hen', 'chick'], ['leg', 'foot'],
  ['smile', 'happy', 'laugh'], ['cry', 'sad'], ['car', 'taxi', 'van', 'bus', 'truck'], ['shop', 'school', 'home'],
  ['sleep', 'cry', 'sad'],
];

// Pairs a Hebrew-speaking child cannot tell apart by ear (th, short i vs ee, short a vs u...).
// Kept apart when he must pick a picture by listening; in the reading game they are the point.
const HEAR_ALIKE = [
  ['three', 'tree'], ['bath', 'bat'], ['ship', 'sheep'], ['bag', 'bug'], ['hat', 'hot'],
  ['lock', 'clock'], ['five', 'fire'], ['ten', 'tent'],
];

// Fill-in sentences, written by hand. a = the one right answer; e = picture; he = meaning.
const SENTENCES = [
  ['I ___ happy.', ['am', 'is', 'are'], 'am', '😀', 'אני שמח.'],
  ['The dog ___ big.', ['is', 'am', 'are'], 'is', '🐶', 'הכלב גדול.'],
  ['They ___ friends.', ['are', 'is', 'am'], 'are', '👫', 'הם חברים.'],
  ['We ___ at school.', ['are', 'am', 'is'], 'are', '🏫', 'אנחנו בבית הספר.'],
  ['She ___ my sister.', ['is', 'am', 'are'], 'is', '👧', 'היא אחותי.'],
  ['You ___ my friend.', ['are', 'is', 'am'], 'are', '🤝', 'אתה החבר שלי.'],
  ['It ___ hot today.', ['is', 'am', 'are'], 'is', '🥵', 'חם היום.'],
  ['The cats ___ black.', ['are', 'is', 'am'], 'are', '🐈🐈', 'החתולים שחורים.'],
  ['My name ___ Dan.', ['is', 'am', 'are'], 'is', '📛', 'קוראים לי דן.'],
  ['I ___ ten years old.', ['am', 'is', 'are'], 'am', '🔟', 'אני בן עשר.'],
  ['I have ___ apple.', ['an', 'a'], 'an', '🍎', 'יש לי תפוח.'],
  ['It is ___ dog.', ['a', 'an'], 'a', '🐕', 'זה כלב.'],
  ['I see ___ egg.', ['an', 'a'], 'an', '🥚', 'אני רואה ביצה.'],
  ['This is ___ cake.', ['a', 'an'], 'a', '🎂', 'זאת עוגה.'],
  ['She has ___ umbrella.', ['an', 'a'], 'an', '☂️', 'יש לה מטרייה.'],
  ['He has ___ red bike.', ['a', 'an'], 'a', '🚲', 'יש לו אופניים אדומים.'],
  ['I have two ___.', ['cats', 'cat'], 'cats', '🐱🐱', 'יש לי שני חתולים.'],
  ['I see three ___.', ['dogs', 'dog'], 'dogs', '🐶🐶🐶', 'אני רואה שלושה כלבים.'],
  ['I have one ___.', ['ball', 'balls'], 'ball', '⚽', 'יש לי כדור אחד.'],
  ['Look at the five ___.', ['stars', 'star'], 'stars', '⭐⭐⭐⭐⭐', 'תסתכל על חמשת הכוכבים.'],
  ['There is one ___.', ['cake', 'cakes'], 'cake', '🎂', 'יש עוגה אחת.'],
  ['She ___ a cat.', ['has', 'have'], 'has', '🐈', 'יש לה חתול.'],
  ['I ___ a big dog.', ['have', 'has'], 'have', '🐕', 'יש לי כלב גדול.'],
  ['He ___ a blue hat.', ['has', 'have'], 'has', '🧢', 'יש לו כובע כחול.'],
  ['We ___ a new car.', ['have', 'has'], 'have', '🚗', 'יש לנו מכונית חדשה.'],
  ['He ___ football.', ['plays', 'play'], 'plays', '⚽', 'הוא משחק כדורגל.'],
  ['I ___ milk.', ['like', 'likes'], 'like', '🥛', 'אני אוהב חלב.'],
  ['She ___ fast.', ['runs', 'run'], 'runs', '🏃', 'היא רצה מהר.'],
  ['They ___ in the pool.', ['swim', 'swims'], 'swim', '🏊', 'הם שוחים בבריכה.'],
  ['The bird ___ in the tree.', ['sings', 'sing'], 'sings', '🐦', 'הציפור שרה בעץ.'],
  ['We ___ pizza.', ['eat', 'eats'], 'eat', '🍕', 'אנחנו אוכלים פיצה.'],
  ['The cat ___ a lot.', ['sleeps', 'sleep'], 'sleeps', '😴', 'החתול ישן הרבה.'],
  ['A fish can ___.', ['swim', 'swims'], 'swim', '🐠', 'דג יכול לשחות.'],
  ['Birds can ___.', ['fly', 'flies'], 'fly', '🕊️', 'ציפורים יכולות לעוף.'],
].map(([s, opts, a, e, he]) => ({ s, opts, a, e, he }));

const GAMES_META = [
  { id: 'read', icon: '📖', title: 'קוראים', color: '#4f7cff' },
  { id: 'spell', icon: '✏️', title: 'מאייתים', color: '#2ec4b6' },
  { id: 'vocab', icon: '🧠', title: 'אוצר מילים', color: '#ff8f5a' },
  { id: 'sentences', icon: '💬', title: 'משפטים', color: '#9b7bff',
    lock: () => (Ladder.sentencesOpen() ? '' : 'הַמִּשְׂחָק הַזֶּה נִפְתָּח בְּשָׁלָב שָׁלוֹשׁ שֶׁל הַקְּרִיאָה') },
];

const STICKERS = ['🚀', '🛸', '🪐', '🌋', '🦈', '🐉', '🦖', '🦅', '🐺', '🦁', '🐯', '⚽', '🏀', '🏈', '⚾',
  '🎾', '🏓', '🎮', '🕹️', '🎸', '🥁', '🎧', '🏆', '🥇', '💎', '🔥', '⚡', '🌊', '🏄', '🛹'];
const STARS_PER_STICKER = 5;

const SAY = {
  praise: [['כל הכבוד'], ['מצוין'], ['יופי'], ['אלוף'], ['בדיוק'],
    [EN('Great job!')], [EN('Excellent!')], [EN('Well done!')], [EN('Correct!')], [EN('Nice!')]],
  retry: 'נַסֵּה שׁוּב',
  hello: 'שָׁלוֹם',
  choose: 'בְּחַר מִשְׂחָק',
  readFirst: 'קְרָא אֶת הַמִּלָּה, וּמְצָא אֶת הַתְּמוּנָה',
  readNext: 'מָה כָּתוּב כָּאן?',
  notYet: 'עוֹד לֹא. אֵיזוֹ אוֹת בָּאָה קֹדֶם?',
  test: ['שָׁלוֹם! בּוֹא נִקְרָא בְּאַנְגְּלִית.', EN('Hello! Let\'s read in English!')],
};
