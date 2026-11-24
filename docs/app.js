'use strict';
/* Feminine Movement – client website.
   No outside libraries: a small built-in client talks to the Supabase database.
   All business rules (credits, waitlist, 8-hour cancellation, subscriptions) live in the database. */

const CFG = {
  url: 'https://vlnssgrfwjrpladaltmr.supabase.co',
  key: 'sb_publishable_YKmyBocLlZ7PorbISkHwQQ_LMneQ5tN', // public client key, safe in a web page
  whatsapp: '972586718686',
  address: 'מרווה 11, שכונת סיגליות, באר שבע',
  maps: 'https://maps.app.goo.gl/jwu2ckW7oeCmkMwp6',
  termsVersion: '2026-11-v3',
  vapid: 'BFBISCh2WSBq4-8oh1GKzanpkgTDrFNPXhi83QdjFj3eLbGWFJsLSJ6mkTlPirD1UNDYogLU8P0JxASVPYA902E', // public key, safe in a web page
};

/* ───────────────────────── texts ───────────────────────── */
const HEALTH_Q = [
  ['heart', 'האם רופא אמר לך שאת סובלת ממחלת לב?'],
  ['bp', 'האם רופא אמר לך שיש לך לחץ דם גבוה?'],
  ['chest_rest', 'האם את חשה כאבים בחזה בזמן מנוחה?'],
  ['chest_daily', 'האם את חשה כאבים בחזה במהלך פעולות שגרה ביום־יום?'],
  ['chest_ex', 'האם את חשה כאבים בחזה בזמן פעילות גופנית?'],
  ['dizzy', 'האם במהלך השנה האחרונה איבדת שיווי משקל עקב סחרחורת, או איבדת את הכרתך?'],
  ['asthma_breath', 'האם רופא אבחן שאת סובלת מאסתמה, ובשלושת החודשים האחרונים היא גרמה לך לקוצר נשימה בזמן מנוחה?'],
  ['asthma_meds', 'האם רופא אבחן שאת סובלת מאסתמה, ובשלושת החודשים האחרונים נזקקת לטיפול תרופתי בגללה?'],
  ['family_heart', 'האם אחד מבני משפחתך מדרגה ראשונה נפטר ממחלת לב?'],
  ['family_sudden', 'האם אחד מבני משפחתך מדרגה ראשונה נפטר ממוות פתאומי בגיל מוקדם?'],
  ['supervised', 'האם רופא אמר לך ב־5 השנים האחרונות לבצע פעילות גופנית רק תחת השגחה רפואית?'],
  ['chronic', 'האם את סובלת ממחלה קבועה (כרונית) שלא הוזכרה כאן, שעשויה להגביל או למנוע ממך ביצוע פעילות גופנית?'],
  ['preg_risk', 'אם את בהיריון: האם ההיריון הנוכחי, או היריון קודם, הוגדר "היריון בסיכון"? (לא בהיריון? סמני "לא")'],
];
const INTRO = [
  ['danced', 'רקדת פעם?', ['אף פעם, וזה הזמן', 'קצת, פה ושם', 'כן, הרבה'], false],
  ['why', 'מה הכי מושך אותך? (אפשר לבחור כמה)', ['להשתחרר', 'להתחבר לגוף', 'להרגיש נשית ויפה', 'זמן לעצמי', 'כושר וחיוניות', 'להכיר נשים חדשות'], true],
  ['source', 'איך הגעת אליי?', ['אינסטגרם', 'טיקטוק', 'חברה המליצה', 'אחר'], false],
];
const HEALTH_END = 'אני מצהירה שקראתי את השאלות, הבנתי אותן ועניתי עליהן בכנות. ידוע לי שאחרי שנתיים מיום החתימה אצטרך למלא הצהרת בריאות חדשה, ושאעדכן את יובל על כל שינוי במצבי, פציעה או היריון.';
const healthText = ans => 'הצהרת בריאות לפי תקנות מכוני כושר (רישוי ופיקוח) (הצהרת בריאות ותעודה רפואית), התשע"ו־2015\n\n' +
  HEALTH_Q.map(([k, q], i) => `${i + 1}. ${q} ${ans[k] ? 'כן' : 'לא'}`).join('\n') + '\n\n' + HEALTH_END;
const healthFull = (ans, notes, sig) => healthText(ans) + (notes ? '\n\nהערות: ' + notes : '') + '\n\nחתימה: ' + sig;

const TERMS = [
  ['מנויים ותשלום', [
    'המנוי חודשי ומתחדש אוטומטית בכל חודש בהוראת קבע. בתחילת כל חודש מנוי נטענים השיעורים של אותו חודש.',
    'שיעורים שלא נוצלו עד סוף חודש המנוי פגים ולא עוברים לחודש הבא.',
    'אפשר לבטל את המנוי בכל עת מתוך האתר. הביטול נכנס לתוקף תוך 3 ימי עסקים, ואין חיובים אחרי מועד הביטול. שיעורים ששולמו נשארים זמינים עד סוף החודש.',
    'שיעור בודד בתוקף ל־30 יום. המנוי אישי ולא ניתן להעברה.',
  ]],
  ['ביטולים', [
    'ביטול עד 8 שעות לפני השיעור: השיעור חוזר למנוי.',
    'פחות מ־8 שעות לפני: אפשר לבטל רק אם יש מישהי ברשימת ההמתנה שתיכנס במקומך. אחרת השיעור נספר.',
    'נכנסת לשיעור מרשימת ההמתנה? את רשומה.',
    'אי־הגעה: השיעור נספר. שיעור שיובל מבטלת חוזר לכל המשתתפות.',
  ]],
  ['צילום עצמי', ['מותר לצלם את עצמך בשיעור. מה שאת מצלמת ומפרסמת באחריותך.']],
  ['בריאות ואחריות', ['ההשתתפות באחריותך ובהתאם להצהרת הבריאות שמילאת.', 'חשוב לעדכן את יובל על כל שינוי במצב הבריאותי, פציעה או היריון.']],
  ['פרטיות', ['הפרטים, הצהרת הבריאות והסרטונים שלך נשמרים בשרת מאובטח. רק את ויובל רואות אותם.']],
];

const BIZ = { name: 'יובל רחמים ירושלמי', id: '326471448', address: 'צלף 12', email: 'yuvalrahamim22@gmail.com', phone: '058-6718686' };
const LEGAL_DATE = '24.11.2026';
const LEGAL = {
  terms: ['תקנון וביטולים', [
    ['מי אנחנו', [`Feminine Movement הוא הסטודיו של ${BIZ.name}, עוסק מס׳ ${BIZ.id}, ${BIZ.address}. מייל: ${BIZ.email}. וואטסאפ: ${BIZ.phone}.`,
      'השיעורים מתקיימים במרווה 11, שכונת סיגליות, באר שבע.']],
    ['המסלולים', ['מנוי חודשי פעם בשבוע: 4 שיעורים בחודש.', 'מנוי חודשי פעמיים בשבוע: 8 שיעורים בחודש.', 'שיעור בודד: שיעור אחד, בתוקף ל־30 יום.', 'המחירים המעודכנים מופיעים בעמוד "מנויים" באתר.']],
    ['המנוי החודשי', ['המנוי מתחדש אוטומטית בכל חודש בהוראת קבע, עד שמבטלים אותו.', 'בתחילת כל חודש מנוי נטענים השיעורים של אותו חודש. שיעורים שלא נוצלו עד סוף החודש פגים ולא עוברים לחודש הבא.',
      'המנוי אישי ואי אפשר להעביר אותו למישהי אחרת.', 'אם החיוב החודשי לא עובר, השיעורים של החודש החדש לא ייטענו עד שהתשלום יוסדר.']],
    ['הרשמה וביטול שיעור', ['נרשמים לשיעורים דרך האתר.', 'ביטול עד 8 שעות לפני השיעור: השיעור חוזר למנוי.',
      'פחות מ־8 שעות לפני השיעור: אפשר לבטל רק אם יש מישהי ברשימת ההמתנה שתיכנס במקומך. אחרת השיעור נספר.', 'אי־הגעה בלי ביטול: השיעור נספר.',
      'רשימת המתנה: אם מתפנה מקום עד המועד שבחרת, את נרשמת אוטומטית, יורד שיעור מהמנוי ונשלחת אלייך התראה לטלפון. באחריותך להפעיל התראות באתר.',
      'אם יובל מבטלת שיעור, השיעור חוזר לכל הנרשמות.']],
    ['ביטול המנוי', ['אפשר לבטל את המנוי בכל עת, בעמוד "המנוי שלי" באתר או בהודעה ליובל.', 'הביטול נכנס לתוקף תוך 3 ימי עסקים, ואין חיובים אחרי מועד הביטול.', 'השיעורים של החודש ששולם נשארים זמינים עד סוף אותו חודש.']],
    ['ביטול עסקה והחזר כספי', ['לפי חוק הגנת הצרכן, אפשר לבטל רכישה תוך 14 יום מיום הרכישה, ובלבד שעוד לא השתתפת בשיעור מהרכישה הזו. ההחזר יינתן בניכוי דמי ביטול של 5% מהמחיר או ₪100, הנמוך מביניהם.',
      'לאזרחים ותיקים (מעל 65), לאנשים עם מוגבלות ולעולים חדשים, החוק מאפשר במקרים מסוימים לבטל עד 4 חודשים מיום הרכישה.',
      'בקשת ביטול שולחים בוואטסאפ או במייל, עם שם מלא ותאריך הרכישה. ההחזר יינתן לאותו אמצעי תשלום, תוך 14 יום מקבלת הבקשה.']],
    ['בריאות ואחריות', ['לפני ההשתתפות ממלאים הצהרת בריאות לפי תקנות מכוני כושר. ההצהרה בתוקף לשנתיים.', 'מי שענתה "כן" על אחת השאלות צריכה להציג אישור רופא לפני השיעור הראשון.',
      'מתחת לגיל 18 נדרש גם אישור של הורה.', 'חשוב לעדכן את יובל על כל שינוי במצב הבריאותי, פציעה או היריון. ההשתתפות בהתאם להצהרת הבריאות שמילאת.']],
    ['צילום', ['מותר לצלם את עצמך בשיעור. מה שאת מצלמת ומפרסמת באחריותך.', 'יובל מצלמת ומשתפת ברשתות רק מי שאישרה זאת בהרשמה. אפשר לשנות את הבחירה בכל רגע בפרופיל, ופרסום שבו רואים אותך יוסר תוך 14 יום מבקשה.']],
    ['שינויים', ['התקנון, מערכת השעות והמחירים יכולים להשתנות. על שינוי מהותי נודיע באתר מראש. מחיר של מנוי פעיל לא ישתנה בלי הודעה מראש, ותמיד אפשר לבטל.']],
  ]],
  privacy: ['מדיניות פרטיות', [
    ['מי אחראית על המידע', [`${BIZ.name} (Feminine Movement), עוסק מס׳ ${BIZ.id}. לכל פנייה בנושא פרטיות: ${BIZ.email} או וואטסאפ ${BIZ.phone}.`]],
    ['איזה מידע נאסף ולמה', ['שם, טלפון, גיל ומייל: לניהול החשבון, ההרשמה לשיעורים ויצירת קשר.',
      'הצהרת בריאות, התשובות, ההערות שכתבת ואישורים רפואיים: חובה לפי תקנות מכוני כושר, ונועדו לשמור על הבטיחות שלך. זה מידע רגיש, והוא נשמר בהגנה מוגברת.',
      'תשובות לשאלות ההיכרות (לא חובה): כדי להכיר אותך ולהתאים את השיעורים.', 'הרשמות, ביטולים, מנויים ושיעורים שנוצלו: לניהול המנוי והשיעורים.',
      'סרטונים שהעלית או שיובל העלתה למסע שלך: כדי שתוכלי לראות את ההתקדמות שלך.', 'מזהה מכשיר להתראות (אם הפעלת): כדי לשלוח לך התראות על השיעורים.']],
    ['מה לא נאסף', ['פרטי כרטיס אשראי: התשלום נעשה בעמוד המאובטח של חברת הסליקה (UPAY), ופרטי הכרטיס לא מגיעים אלינו.', 'אין באתר פרסומות, ואין מעקב או פרופיילינג לצורכי שיווק.']],
    ['מי רואה את המידע', ['רק יובל רואה את המידע שלך, כולל הצהרת הבריאות. לקוחות אחרות לא רואות שום פרט עלייך.',
      'ספקי שירות שמפעילים את האתר, רק לצורך זה: Supabase (אחסון המידע, בשרתים בפרנקפורט שבגרמניה), GitHub (אחסון האתר) ו־UPAY (סליקה).', 'המידע לא נמכר ולא מועבר לאף אחד אחר, אלא אם החוק מחייב זאת.']],
    ['כמה זמן המידע נשמר', ['כל עוד החשבון פעיל. הצהרת בריאות מתחדשת כל שנתיים.', 'אפשר למחוק את החשבון בכל רגע בעמוד הפרופיל, ואז הפרטים, ההרשמות והסרטונים שלך נמחקים.']],
    ['אבטחה', ['המידע מועבר בחיבור מוצפן ונשמר בשרת מאובטח. כל לקוחה יכולה לגשת רק למידע שלה.']],
    ['הזכויות שלך', ['לעיין במידע שנשמר עלייך, לתקן אותו (את רוב הפרטים אפשר לתקן לבד בפרופיל), ולבקש למחוק אותו.', 'לבטל בכל רגע הסכמה לצילום ולהתראות.',
      'נענה לכל בקשה תוך 30 יום לכל היותר. אם לא נענית, אפשר לפנות לרשות להגנת הפרטיות.']],
    ['הודעות', ['נשלחות רק הודעות שירות: אישור הרשמה, מקום שהתפנה, תזכורות וביטולים. הודעות שיווקיות יישלחו רק אם אישרת זאת במפורש.']],
  ]],
};
function legalSheet(which) {
  const draw = (el, w) => {
    const [title, secs] = LEGAL[w];
    el.innerHTML = `<div class="row" style="gap:8px">${Object.entries(LEGAL).map(([k, [t]]) => `<button class="btn sm ${k === w ? 'gold' : 'outline'}" data-lg="${k}">${t}</button>`).join('')}</div>
      <h2>${title}</h2><p class="xs muted">Feminine Movement · עודכן לאחרונה: ${LEGAL_DATE}</p>
      ${secs.map(([h, ls]) => `<h3 class="gold">${esc(h)}</h3>${ls.map(l => `<p class="small soft">· ${esc(l)}</p>`).join('')}`).join('')}
      <button class="btn ghost block" data-close>סגירה</button>`;
    $$('[data-lg]', el).forEach(b => b.addEventListener('click', () => { draw(el, b.dataset.lg); el.scrollTop = 0; }));
    $$('[data-close]', el).forEach(b => b.addEventListener('click', () => { $('#sheet-root').innerHTML = ''; }));
  };
  sheet('', el => draw(el, which || 'terms'));
}

const FAQ = [
  ['צריך ניסיון קודם?', 'ממש לא. שיעור המתחילות בנוי בדיוק בשבילך, וכל אחת מתקדמת בקצב שלה.'],
  ['מאיפה רוכשים עקבים?', 'אלה העקבים שאני ממליצה עליהם: https://a.aliexpress.com/_c4N2yaH3\nלהתחלה מומלץ עקב בגובה 7.5 ס"מ.'],
  ['אפשר להגיע עם גרביים או בלי עקבים?', 'כן, גם וגם. אפשר לרקוד עם גרביים או בלי עקבים.'],
  ['מה ללבוש?', 'בגדים שנוח לך לזוז בהם ושגורמים לך להרגיש טוב עם עצמך. יכול להיות טייץ קצר או ארוך, טופ, בגד גוף, חזייה וכו׳.'],
  ['מה להביא?', 'בקבוק מים ואת הלב הפתוח שלך 🤍'],
  ['איך מבטלים שיעור או מנוי?', 'שיעור: בעמוד "שיעורים", עד 8 שעות לפני. מנוי: בעמוד "המנוי שלי", בכל עת.'],
];

const WAIT = [
  { h: 0.5, label: 'עד חצי שעה לפני', short: 'חצי שעה לפני השיעור' },
  { h: 2, label: 'עד שעתיים לפני', short: 'שעתיים לפני השיעור' },
  { h: 4, label: 'עד 4 שעות לפני', short: '4 שעות לפני השיעור' },
  { h: 8, label: 'עד 8 שעות לפני', short: '8 שעות לפני השיעור' },
];
const MILESTONES = [[1, 'הצעד הראשון'], [4, 'מתחילה להרגיש'], [8, 'בטוחה על עקב'], [16, 'נמרה'], [30, 'מלכה']];
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/* ───────────────────────── helpers ───────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const linky = s => nl(s).replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" target="_blank" rel="noopener" style="color:var(--gold)">לחצי כאן לקישור</a>`);
const pad = n => (n < 10 ? '0' + n : '' + n);
const dm = d => `${d.getDate()}.${d.getMonth() + 1}`;
const dmy = d => `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)}`;
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayName = d => DAYS[d.getDay()];
const credLabel = n => (n === 1 ? 'שיעור אחד' : `${n} שיעורים`);
const firstName = p => ((p && p.display_name) || '').trim().split(/\s+/)[0] || 'יפה שלי';
const nowIso = () => new Date().toISOString();

function toast(msg, ms = 3200) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

function errText(e) {
  const m = (e && (e.message || e.msg || e.error_description)) || String(e || '');
  if (/Invalid login credentials/i.test(m)) return 'המייל או הסיסמה לא נכונים';
  if (/already registered|already been registered/i.test(m)) return 'כבר יש חשבון עם המייל הזה. נסי להתחבר';
  if (/Email not confirmed/i.test(m)) return 'צריך לאשר את המייל קודם. בדקי את תיבת הדואר (גם בקידומי מכירות/ספאם)';
  if (/Password should be|weak/i.test(m)) return 'הסיסמה צריכה להיות לפחות 6 תווים';
  if (/rate limit|too many/i.test(m)) return 'יותר מדי ניסיונות. נסי שוב בעוד כמה דקות';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'אין חיבור לאינטרנט. נסי שוב';
  if (/JWT expired/i.test(m)) return 'החיבור פג. רענני את העמוד';
  return m;
}

/* ───────────────────────── mini Supabase client ───────────────────────── */
const SKEY = 'fm_session_v1';
const sb = {
  session: null,
  load() { try { this.session = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (_) { this.session = null; } },
  save(s) {
    if (s && s.access_token) {
      s.expires_at = s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600);
      this.session = { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, user: s.user || (this.session && this.session.user) };
    } else this.session = null;
    try { this.session ? localStorage.setItem(SKEY, JSON.stringify(this.session)) : localStorage.removeItem(SKEY); } catch (_) {}
  },
  get uid() { return this.session && this.session.user && this.session.user.id; },

  async raw(path, { method = 'GET', body, headers = {}, auth = true, json = true } = {}) {
    if (auth) await this.fresh();
    const h = { apikey: CFG.key, ...headers };
    if (auth && this.session) h.Authorization = 'Bearer ' + this.session.access_token;
    if (body !== undefined && json) h['Content-Type'] = 'application/json';
    const res = await fetch(CFG.url + path, { method, headers: h, body: body === undefined ? undefined : json ? JSON.stringify(body) : body });
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!res.ok) {
      const e = new Error((data && (data.message || data.msg || data.error_description || data.error)) || ('HTTP ' + res.status));
      e.status = res.status; e.data = data; throw e;
    }
    return { data, res };
  },

  async fresh() {
    const s = this.session;
    if (!s || !s.refresh_token) return;
    if (s.expires_at - 60 > Date.now() / 1000) return;
    if (this._refreshing) return this._refreshing;
    this._refreshing = (async () => {
      try {
        const { data } = await this.raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token }, auth: false });
        this.save(data);
      } catch (e) { if (e.status === 400 || e.status === 401) this.save(null); }
      finally { this._refreshing = null; }
    })();
    return this._refreshing;
  },

  redirectTo() { return location.origin + location.pathname; },
  async signUp(email, password) {
    const { data } = await this.raw('/auth/v1/signup?redirect_to=' + encodeURIComponent(this.redirectTo()), { method: 'POST', body: { email, password }, auth: false });
    if (data && data.access_token) { this.save(data); return true; }
    return false; // confirmation e-mail sent
  },
  async signIn(email, password) {
    const { data } = await this.raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, auth: false });
    this.save(data);
  },
  async recover(email) {
    await this.raw('/auth/v1/recover?redirect_to=' + encodeURIComponent(this.redirectTo()), { method: 'POST', body: { email }, auth: false });
  },
  async setPassword(password) { await this.raw('/auth/v1/user', { method: 'PUT', body: { password } }); },
  async signOut() { try { await this.raw('/auth/v1/logout', { method: 'POST' }); } catch (_) {} this.save(null); },
  // After the e-mail link: tokens arrive in the address bar.
  async fromUrl() {
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('error_description')) { history.replaceState(null, '', location.pathname); return { error: h.get('error_description') }; }
    if (!h.get('access_token')) return null;
    const s = { access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: Number(h.get('expires_in') || 3600) };
    this.save(s);
    try { const { data } = await this.raw('/auth/v1/user'); this.save({ ...this.session, user: data }); } catch (_) {}
    history.replaceState(null, '', location.pathname);
    return { type: h.get('type') };
  },

  async select(table, query) { return (await this.raw(`/rest/v1/${table}?${query}`)).data || []; },
  async insert(table, rows) { return (await this.raw(`/rest/v1/${table}`, { method: 'POST', body: rows, headers: { Prefer: 'return=representation' } })).data; },
  async update(table, filter, patch) { return (await this.raw(`/rest/v1/${table}?${filter}`, { method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' } })).data; },
  async count(table, query) {
    const { res } = await this.raw(`/rest/v1/${table}?${query}`, { method: 'HEAD', headers: { Prefer: 'count=exact', Range: '0-0' } });
    const cr = res.headers.get('content-range') || '*/0'; return Number(cr.split('/')[1] || 0);
  },
  async rpc(fn, args = {}) { return (await this.raw(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args })).data; },
  async signUrls(paths) {
    if (!paths.length) return [];
    const { data } = await this.raw('/storage/v1/object/sign/journey', { method: 'POST', body: { expiresIn: 3600, paths } });
    return (data || []).map(x => (x && x.signedURL ? CFG.url + '/storage/v1' + x.signedURL : null));
  },
  async upload(path, file) {
    await this.raw('/storage/v1/object/journey/' + path.split('/').map(encodeURIComponent).join('/'),
      { method: 'POST', body: file, json: false, headers: { 'Content-Type': file.type || 'video/mp4', 'x-upsert': 'false' } });
  },
};

/* ───────────────────────── data ───────────────────────── */
const S = { profile: null };

async function loadProfile() {
  if (!sb.uid) { S.profile = null; return null; }
  const rows = await sb.select('profiles', `select=*&id=eq.${sb.uid}`);
  S.profile = rows[0] || null; return S.profile;
}
function onboarded(p) {
  if (!p || !p.onboarded_at || p.notifications_ok === null || !p.health_signed_at) return false;
  return Date.now() - new Date(p.health_signed_at).getTime() < 2 * 365 * 864e5;
}
async function credits() {
  const rows = await sb.select('credit_packs', `select=remaining,expires_at&user_id=eq.${sb.uid}&expires_at=gt.${nowIso()}&order=expires_at`);
  return { total: rows.reduce((a, r) => a + (r.remaining || 0), 0), soonest: rows.find(r => r.remaining > 0) };
}
async function mySubscription() {
  const rows = await sb.select('subscriptions', `select=*,packages(title,classes,price_ils)&user_id=eq.${sb.uid}&period_end=gt.${nowIso()}&order=created_at.desc&limit=1`);
  return rows[0] || null;
}
async function upcoming() {
  return sb.select('class_sessions', `select=*&starts_at=gte.${nowIso()}&cancelled=eq.false&order=starts_at&limit=30`);
}
async function myBookings() {
  return sb.select('bookings', `select=session_id,status,wait_until_hours&user_id=eq.${sb.uid}&status=in.(booked,waitlist)`);
}
async function attended() {
  const rows = await sb.select('bookings', `select=status,class_sessions!inner(starts_at)&user_id=eq.${sb.uid}&status=in.(booked,attended)&class_sessions.starts_at=lt.${nowIso()}`);
  return rows.length;
}
function whatsappLink(text) {
  if (!CFG.whatsapp) return null;
  return `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(text || '')}`;
}

/* ───────────────────────── shell ───────────────────────── */
const app = () => $('#app');
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/></svg>',
  schedule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  journey: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5.3 5.6.6-4.2 3.8 1.2 5.6L12 15.5 7 18.3l1.2-5.6L4 8.9l5.6-.6z"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
};
function showTabs(active) {
  const nav = $('#tabs');
  if (!active) { nav.hidden = true; return; }
  const t = [['home', 'בית'], ['schedule', 'מערכת'], ['journey', 'המסע'], ['profile', 'פרופיל']];
  nav.innerHTML = t.map(([id, label]) => `<a href="#/${id}" ${id === active ? 'aria-current="page"' : ''}>${ICON[id]}<span>${label}</span></a>`).join('');
  nav.hidden = false;
}
function render(html, tab) { app().innerHTML = html; showTabs(tab); window.scrollTo(0, 0); }
function loading() { app().innerHTML = '<div class="loading"><span class="spinner" aria-label="טוען"></span></div>'; }
function bind(sel, ev, fn) { $$(sel).forEach(el => el.addEventListener(ev, fn)); }
async function busy(btn, fn) {
  if (!btn || btn.disabled) return;
  const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try { await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = old; } }
}
function sheet(html, mount) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const close = () => { root.innerHTML = ''; };
  $('.sheet-bg', root).addEventListener('click', e => { if (e.target.classList.contains('sheet-bg')) close(); });
  $$('[data-close]', root).forEach(b => b.addEventListener('click', close));
  if (mount) mount($('.sheet', root), close);
  return close;
}
function confirmSheet(title, body, yes, onYes, danger) {
  sheet(`<h2>${esc(title)}</h2>${body ? `<p class="soft">${esc(body)}</p>` : ''}
    <button class="btn ${danger ? 'primary' : 'gold'} block" data-yes>${esc(yes)}</button>
    <button class="btn ghost block" data-close>לא, חזרה</button>`, (el, close) => {
    $('[data-yes]', el).addEventListener('click', e => busy(e.currentTarget, async () => { await onYes(); close(); }));
  });
}

/* ───────────────────────── router ───────────────────────── */
const ROUTES = {};
async function route() {
  $('#sheet-root').innerHTML = '';
  const name = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'home';
  if (name === 'reset') return ROUTES.reset();
  if (!sb.session) return ROUTES.login();
  try {
    if (!S.profile) await loadProfile();
  } catch (e) {
    if (e.status === 401) { sb.save(null); return ROUTES.login(); }
    return render(`<div class="card"><p>${esc(errText(e))}</p><button class="btn primary" onclick="location.reload()">לנסות שוב</button></div>`);
  }
  if (!onboarded(S.profile)) return ROUTES.onboarding();
  const fn = ROUTES[name] || ROUTES.home;
  if (name === 'admin' && !(S.profile && S.profile.is_admin)) return ROUTES.home();
  try { await fn(); } catch (e) {
    render(`<div class="stack"><div class="card"><p>לא הצלחנו לטעון: ${esc(errText(e))}</p><button class="btn primary" id="retry">לנסות שוב</button></div></div>`, name);
    bind('#retry', 'click', route);
  }
}
window.addEventListener('hashchange', route);

/* ───────────────────────── login ───────────────────────── */
ROUTES.login = (mode = 'up', note = '') => {
  render(`<div class="stack" style="padding-top:28px">
    <div class="logo">Feminine Movement<small>BY YUVAL</small></div>
    <div class="stack-s" style="margin-top:18px">
      <h1>${mode === 'up' ? 'ברוכה הבאה 🖤' : mode === 'forgot' ? 'שכחתי סיסמה' : 'טוב לראות אותך שוב'}</h1>
      <p class="muted">${mode === 'up' ? 'יוצרים חשבון פעם אחת, וכל השיעורים שלך כאן.' : mode === 'forgot' ? 'נשלח לך מייל עם קישור לבחירת סיסמה חדשה.' : 'התחברי עם המייל והסיסמה שלך.'}</p>
    </div>
    <form class="card" id="f" novalidate>
      <label class="field"><span>מייל</span><input class="ltr" type="email" id="email" autocomplete="email" required placeholder="name@gmail.com"></label>
      ${mode === 'forgot' ? '' : `<label class="field"><span>סיסמה</span><input type="password" id="pw" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}" placeholder="לפחות 6 תווים" required></label>`}
      <p id="msg" class="small ${note ? 'gold-l' : ''}" ${note ? '' : 'hidden'}>${esc(note)}</p>
      <button class="btn primary block" type="submit">${mode === 'up' ? 'יצירת חשבון' : mode === 'forgot' ? 'שליחת קישור' : 'כניסה'}</button>
    </form>
    ${mode === 'up' ? '<button class="btn ghost" data-mode="in">כבר יש לי חשבון – כניסה</button>' : '<button class="btn ghost" data-mode="up">אין לי חשבון – הרשמה</button>'}
    ${mode === 'in' ? '<button class="btn ghost" data-mode="forgot">שכחתי סיסמה</button>' : ''}
  </div>`);
  bind('[data-mode]', 'click', e => ROUTES.login(e.currentTarget.dataset.mode));
  $('#f').addEventListener('submit', e => {
    e.preventDefault();
    const btn = $('button[type=submit]', e.target), msg = $('#msg');
    const email = $('#email').value.trim(), pw = $('#pw') && $('#pw').value;
    const say = (t, ok) => { msg.hidden = false; msg.textContent = t; msg.className = 'small ' + (ok ? 'gold-l' : 'danger'); };
    if (!/^\S+@\S+\.\S+$/.test(email)) return say('צריך כתובת מייל תקינה');
    if (mode !== 'forgot' && (!pw || pw.length < 6)) return say('הסיסמה צריכה להיות לפחות 6 תווים');
    busy(btn, async () => {
      try {
        if (mode === 'forgot') { await sb.recover(email); return say('אם יש חשבון עם המייל הזה, שלחנו אלייך קישור. בדקי את המייל 🖤', true); }
        if (mode === 'up') {
          const inNow = await sb.signUp(email, pw);
          if (!inNow) return ROUTES.login('in', 'שלחנו לך מייל לאישור. לחצי על הקישור שבמייל, ואם צריך חזרי לכאן והתחברי 🖤');
        } else await sb.signIn(email, pw);
        S.profile = null; location.hash = '#/home'; route();
      } catch (err) { say(errText(err)); }
    });
  });
};

ROUTES.reset = () => {
  if (!sb.session) { location.hash = ''; return ROUTES.login('forgot', 'הקישור לא תקף יותר. אפשר לבקש חדש.'); }
  render(`<div class="stack" style="padding-top:28px">
    <div class="logo">Feminine Movement<small>BY YUVAL</small></div>
    <h1>סיסמה חדשה</h1>
    <form class="card" id="f"><label class="field"><span>סיסמה חדשה</span><input type="password" id="pw" autocomplete="new-password" placeholder="לפחות 6 תווים"></label>
    <p id="msg" class="small danger" hidden></p><button class="btn primary block" type="submit">שמירה</button></form></div>`);
  $('#f').addEventListener('submit', e => {
    e.preventDefault();
    const pw = $('#pw').value;
    if (pw.length < 6) { $('#msg').hidden = false; $('#msg').textContent = 'לפחות 6 תווים'; return; }
    busy($('button', e.target), async () => {
      try { await sb.setPassword(pw); toast('הסיסמה עודכנה 🖤'); location.hash = '#/home'; }
      catch (err) { $('#msg').hidden = false; $('#msg').textContent = errText(err); }
    });
  });
};

/* ───────────────────────── onboarding (the gate) ───────────────────────── */
const OB = { step: 1, name: '', phone: '', age: '', intro: {}, ans: {}, notes: '', sig: '', health: false, terms: false, photo: null };
const STEPS = 4;
ROUTES.onboarding = () => {
  const p = S.profile;
  if (!OB.name && p) { OB.name = p.display_name || ''; OB.phone = p.phone || ''; }
  const calc = () => {
    const first = OB.name.trim().split(/\s+/)[0] || '';
    const age = parseInt(OB.age, 10), ageOk = age >= 12 && age <= 99;
    const answered = HEALTH_Q.every(([k]) => typeof OB.ans[k] === 'boolean');
    const sigOk = OB.sig.trim().length >= 2;
    const can = [0, !!first && ageOk, true, answered && sigOk && OB.health, OB.terms && OB.photo !== null][OB.step];
    const hint = OB.step === 1 ? (!first ? 'צריך למלא שם כדי להמשיך' : 'צריך למלא גיל כדי להמשיך')
      : OB.step === 3 ? (!answered ? 'צריך לענות על כל השאלות' : !sigOk ? 'צריך לחתום בשם המלא' : 'צריך לאשר את ההצהרה')
      : OB.photo === null ? 'צריך לבחור לגבי צילומים' : 'צריך לאשר את התקנון';
    return { can, label: can ? (OB.step === STEPS ? 'סיום, יאללה לרקוד 💋' : 'המשך') : hint };
  };
  const first = OB.name.trim().split(/\s+/)[0] || '';
  const age = parseInt(OB.age, 10), minor = age >= 12 && age < 18;
  const anyYes = HEALTH_Q.some(([k]) => OB.ans[k] === true);
  const { can, label } = calc();
  let body = '';
  if (OB.step === 1) body = `
    <h1>ברוכה הבאה למקום בו הכל אפשרי 🖤</h1>
    <label class="field"><span>שם מלא או שם חיבה</span><input type="text" id="name" value="${esc(OB.name)}" autocomplete="given-name" placeholder="איך לקרוא לך?"></label>
    <label class="field"><span>גיל <span class="xs muted">(נדרש להצהרת הבריאות)</span></span><input class="ltr" type="number" inputmode="numeric" min="12" max="99" id="age" value="${esc(OB.age)}" placeholder="בת כמה את?"></label>
    ${minor ? '<p class="small gold-l">מתחת לגיל 18 צריך גם אישור של הורה. אפשר להמשיך בהרשמה, ויובל תיצור איתך קשר לגבי האישור 🤍</p>' : ''}
    <label class="field"><span>טלפון</span><input class="ltr" type="tel" id="phone" value="${esc(OB.phone)}" autocomplete="tel" placeholder="05X-XXXXXXX"></label>`;
  if (OB.step === 2) body = `
    <h1>נעים מאוד${first ? ', ' + esc(first) : ''} ✨</h1>
    <p class="soft">שלוש שאלות קטנות, רק לוחצים. לא חובה.</p>
    ${INTRO.map(([k, q, opts, multi]) => `<div class="card"><h3>${esc(q)}</h3><div class="chips">${opts.map(o => {
      const on = multi ? (OB.intro[k] || []).includes(o) : OB.intro[k] === o;
      return `<button class="chip" aria-pressed="${on}" data-ik="${k}" data-iv="${esc(o)}" data-im="${multi ? 1 : 0}">${esc(o)}</button>`; }).join('')}</div></div>`).join('')}`;
  if (OB.step === 3) body = `
    <h1>הצהרת בריאות</h1>
    <p class="soft">${first ? esc(first) + ', ' : ''}כדי לרקוד בביטחון, צריך לענות פעם אחת על השאלות. ההצהרה בתוקף לשנתיים, והמידע נשמר באופן מאובטח: רק יובל רואה אותו.</p>
    <div class="card" style="gap:14px">${HEALTH_Q.map(([k, q], i) => `<div class="stack-s" style="gap:8px">
      <p class="small">${i + 1}. ${esc(q)}</p>
      <div class="row" style="gap:8px">
        <button class="btn sm ${OB.ans[k] === false ? 'gold' : 'outline'}" style="flex:1" data-q="${k}" data-v="0" aria-pressed="${OB.ans[k] === false}">לא</button>
        <button class="btn sm ${OB.ans[k] === true ? 'gold' : 'outline'}" style="flex:1" data-q="${k}" data-v="1" aria-pressed="${OB.ans[k] === true}">כן</button></div></div>`).join('')}</div>
    ${anyYes ? '<div class="card wine"><p class="small" style="color:var(--warm)">ענית "כן" על אחת השאלות? זה בסדר גמור 🤍 צריך אישור רופא שמותר לך להתאמן. אפשר להמשיך בהרשמה, ולפני השיעור הראשון שלחי ליובל את האישור. מיד כשהוא יגיע, תוכלי להירשם לשיעורים.</p></div>' : ''}
    <label class="field"><span>כדי שאתאים לך את התנועה: יש כאב, פציעה, ניתוח, היריון או כל דבר אחר שכדאי שאדע? <span class="xs muted">(לא חובה)</span></span>
      <textarea id="notes" rows="3" style="resize:vertical">${esc(OB.notes)}</textarea></label>
    <label class="field"><span>חתימה: הקלידי את שמך המלא</span><input type="text" id="sig" value="${esc(OB.sig)}" autocomplete="name"></label>
    <label class="check"><input type="checkbox" id="health" ${OB.health ? 'checked' : ''}><span>${esc(HEALTH_END)}</span></label>`;
  if (OB.step === 4) body = `
    <p class="gold" style="font-size:18px">ועוד רגע קטן אחרון…</p>
    <h1>התקנון שלנו</h1>
    <p class="muted">קצר, ברור, ושומר על כולנו.</p>
    <div class="card">${TERMS.map(([t, ls]) => `<div class="stack-s" style="gap:4px"><h3>${esc(t)}</h3>${ls.map(l => `<p class="small soft">· ${esc(l)}</p>`).join('')}</div>`).join('')}</div>
    <div class="card">
      <h3>צילומים בשיעורים 📷</h3>
      <p class="small soft">לפעמים אני מצלמת רגעים מהשיעורים כדי לשתף את האווירה ברשתות של הסטודיו ולהזמין עוד נשים לרקוד איתנו. מה מתאים לך?</p>
      <button class="btn ${OB.photo === true ? 'gold' : 'outline'} block" data-photo="1" aria-pressed="${OB.photo === true}">אני בעניין, אפשר לצלם אותי 🤍</button>
      <button class="btn ${OB.photo === false ? 'gold' : 'outline'} block" data-photo="0" aria-pressed="${OB.photo === false}">אני מעדיפה לא להצטלם</button>
      <p class="xs muted">הבחירה לא משפיעה על ההשתתפות שלך, ואפשר לשנות אותה בכל רגע בפרופיל. אם תבקשי, אוריד פרסום שבו רואים אותך תוך 14 יום.</p>
    </div>
    <div class="row" style="gap:8px"><button class="btn outline sm" data-legal="terms">לתקנון המלא</button><button class="btn outline sm" data-legal="privacy">למדיניות הפרטיות</button></div>
    <label class="check"><input type="checkbox" id="terms" ${OB.terms ? 'checked' : ''}><span>קראתי ואני מאשרת את התקנון, מדיניות הביטולים ומדיניות הפרטיות</span></label>
    <p id="err" class="danger small" hidden></p>`;

  render(`<div class="stack">
    <div class="row between"><span class="logo" style="font-size:22px">Feminine Movement</span><span class="xs muted">שלב ${OB.step} מתוך ${STEPS}</span></div>
    <div class="steps" aria-hidden="true">${[1, 2, 3, 4].map(i => `<span class="${i <= OB.step ? 'on' : ''}"></span>`).join('')}</div>
    ${body}
    <button class="btn primary block" id="next" ${can ? '' : 'disabled'}>${label}</button>
    ${OB.step > 1 ? '<button class="btn ghost" id="back">חזרה</button>' : '<button class="btn ghost" id="out">התנתקות</button>'}
  </div>`);

  const again = () => { const y = window.scrollY; ROUTES.onboarding(); window.scrollTo(0, y); };
  const refresh = () => { const c = calc(), btn = $('#next'); btn.disabled = !c.can; btn.textContent = c.label; };
  bind('#name', 'input', e => { OB.name = e.target.value; refresh(); });
  bind('#age', 'input', e => { OB.age = e.target.value; refresh(); });
  bind('#age', 'change', again);
  bind('#phone', 'input', e => { OB.phone = e.target.value; });
  bind('#notes', 'input', e => { OB.notes = e.target.value; });
  bind('#sig', 'input', e => { OB.sig = e.target.value; refresh(); });
  bind('[data-ik]', 'click', e => { const d = e.currentTarget.dataset;
    if (d.im === '1') { const arr = OB.intro[d.ik] || []; OB.intro[d.ik] = arr.includes(d.iv) ? arr.filter(x => x !== d.iv) : [...arr, d.iv]; }
    else OB.intro[d.ik] = OB.intro[d.ik] === d.iv ? undefined : d.iv;
    again(); });
  bind('[data-q]', 'click', e => { OB.ans[e.currentTarget.dataset.q] = e.currentTarget.dataset.v === '1'; again(); });
  bind('#health', 'change', e => { OB.health = e.target.checked; again(); });
  bind('#terms', 'change', e => { OB.terms = e.target.checked; again(); });
  bind('[data-legal]', 'click', e => legalSheet(e.currentTarget.dataset.legal));
  bind('[data-photo]', 'click', e => { OB.photo = e.currentTarget.dataset.photo === '1'; again(); });
  bind('#next', 'click', e => {
    if (OB.step < STEPS) { OB.step++; ROUTES.onboarding(); window.scrollTo(0, 0); } else busy(e.currentTarget, finishOnboarding);
  });
  bind('#back', 'click', () => { OB.step--; ROUTES.onboarding(); window.scrollTo(0, 0); });
  bind('#out', 'click', async () => { await sb.signOut(); S.profile = null; route(); });
};

async function finishOnboarding() {
  const now = nowIso(), age = parseInt(OB.age, 10);
  const row = {
    display_name: OB.name.trim(), phone: OB.phone.trim() || null, age, intro: OB.intro, notifications_ok: false,
    photo_social_ok: OB.photo, photo_journey_ok: true, health_signed_at: now, terms_signed_at: now, terms_version: CFG.termsVersion, onboarded_at: now,
  };
  const answers = { ...OB.ans, minor: age < 18 };
  try {
    if (S.profile) await sb.update('profiles', `id=eq.${sb.uid}`, row);
    else await sb.insert('profiles', { id: sb.uid, ...row });
    await sb.insert('health_declarations', { user_id: sb.uid, form_text: healthFull(OB.ans, OB.notes.trim(), OB.sig.trim()), answers, notes: OB.notes.trim() || null, signature: OB.sig.trim() });
    await loadProfile();
    OB.step = 1;
    location.hash = '#/home'; route();
    setTimeout(() => toast(`ברוכה הבאה, ${firstName(S.profile)} 🖤`), 300);
  } catch (e) { const el = $('#err'); if (el) { el.hidden = false; el.textContent = errText(e); } }
}

/* ───────────────────────── phone notifications ───────────────────────── */
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
let swReg = null;
async function swReady() {
  if (!('serviceWorker' in navigator)) return null;
  if (!swReg) swReg = await navigator.serviceWorker.register('sw.js').catch(() => null);
  return swReg;
}
// 'on' | 'off' | 'blocked' | 'install' (iPhone: add to home screen first) | 'unsupported'
async function pushState() {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'install' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await swReady(); if (!reg) return 'unsupported';
  const sub = await reg.pushManager.getSubscription().catch(() => null);
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}
async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('לא אושרו התראות. אפשר לאשר בהגדרות הטלפון');
  const reg = await swReady();
  const key = Uint8Array.from(atob(CFG.vapid.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - CFG.vapid.length % 4) % 4)), c => c.charCodeAt(0));
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const j = sub.toJSON();
  await sb.rpc('save_push_sub', { ep: j.endpoint, k: j.keys.p256dh, a: j.keys.auth });
  if (S.profile && !S.profile.notifications_ok) { await sb.update('profiles', `id=eq.${sb.uid}`, { notifications_ok: true }).catch(() => {}); S.profile.notifications_ok = true; }
}
// A card that explains and turns notifications on. Returns '' when already on.
function pushCard(state, compact) {
  if (state === 'on' || state === 'unsupported') return '';
  if (state === 'install') return `<div class="card" style="border-color:var(--gold)"><h3>🔔 כדי לקבל התראות באייפון</h3>
    <p class="small soft">באייפון התראות עובדות רק מהאתר שנשמר במסך הבית:</p>
    <p class="small soft">1. לוחצים על כפתור השיתוף <b>⎋</b> בתחתית ספארי<br>2. בוחרים <b>"הוספה למסך הבית"</b><br>3. פותחים את האתר מהאייקון החדש, ומפעילים כאן התראות</p></div>`;
  if (state === 'blocked') return `<div class="card"><h3>🔔 ההתראות חסומות</h3><p class="small soft">כדי לדעת כשמתפנה לך מקום, צריך לאשר התראות לאתר בהגדרות הטלפון או הדפדפן.</p></div>`;
  return `<div class="card" style="border-color:var(--gold)"><h3>🔔 התראות לטלפון</h3>
    ${compact ? '' : '<p class="small soft">כדי שתדעי מיד כשמתפנה לך מקום מרשימת ההמתנה, כשמשתנה שיעור, ותזכורת לפני כל שיעור.</p>'}
    <button class="btn gold block" data-push>להפעיל התראות</button></div>`;
}
function bindPush(after) {
  bind('[data-push]', 'click', e => busy(e.currentTarget, async () => {
    try { await enablePush(); toast('ההתראות הופעלו 🔔'); } catch (err) { toast(errText(err), 5000); }
    after && after();
  }));
}

/* ───────────────────────── home ───────────────────────── */
let msgShift = 0;
ROUTES.home = async () => {
  loading(); showTabs('home');
  const [cr, sub, s, b, msg, hOk, ps] = await Promise.all([credits(), mySubscription(), upcoming(), myBookings(), sb.rpc('message_of_day', { shift: msgShift }).catch(() => []), sb.rpc('my_health_ok').catch(() => true), pushState().catch(() => 'unsupported')]);
  const p = S.profile, h = new Date().getHours();
  const greet = h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : 'ערב טוב';
  const m = (msg && msg[0]) || null;
  const byId = Object.fromEntries(s.map(x => [x.id, x]));
  const mine = b.filter(x => byId[x.session_id]).map(x => ({ ...x, s: byId[x.session_id] }));
  const subLine = sub ? (sub.status === 'active'
    ? `${esc(sub.packages.title)} · מתחדש ב־${dmy(new Date(sub.period_end))}`
    : `${esc(sub.packages.title)} · בוטל, פעיל עד ${dmy(new Date(sub.period_end))}`) : 'אין מנוי פעיל';

  render(`<div class="stack">
    <div class="row between"><div class="logo">Feminine Movement<small>BY YUVAL</small></div>
      ${p.is_admin ? '<a class="btn outline sm" href="#/admin">ניהול</a>' : ''}</div>
    <div class="stack-s" style="gap:4px"><h1>${greet}, ${esc(firstName(p))} 🖤</h1><p class="muted">מה הגוף שלך רוצה להרגיש השבוע?</p></div>

    ${hOk === false ? `<div class="card" style="border-color:var(--gold)"><h3>עוד אישור קטן 🩺</h3><p class="small soft">לפני ההרשמה לשיעורים צריך אישור: אישור רופא, אם סימנת "כן" בהצהרת הבריאות, או אישור הורה, אם את מתחת לגיל 18. שלחי אותו ליובל, ומיד כשתאשר תוכלי להירשם לשיעורים.</p>${whatsappLink('היי יובל, מצרפת אישור רופא 🖤') ? `<a class="btn gold block" target="_blank" rel="noopener" href="${whatsappLink('היי יובל, מצרפת אישור רופא 🖤')}">לשליחה בוואטסאפ</a>` : ''}</div>` : ''}
    ${pushCard(ps)}
    <div class="card wine">
      <div class="row between"><span class="xs" style="color:#F0D6B0;font-weight:600">${m && m.kind === 'משימה' ? 'המשימה של היום 👠' : 'המשפט של היום 💋'}</span><span class="xs" style="color:#E8C9A0">${dm(new Date())}</span></div>
      <p style="font-size:19px;font-weight:500;color:var(--warm)">${m ? nl(m.body) : 'המשפטים היומיים יופיעו כאן בקרוב 🤍'}</p>
      <div><button class="btn outline sm" id="more" style="border-color:#E8C9A0;color:var(--warm)">עוד אחד בשבילי</button></div>
    </div>

    <div class="card">
      <div class="row between">
        <div><p class="small muted">נשארו לך החודש</p><p style="font-size:26px;font-weight:700">${credLabel(cr.total)}</p></div>
        <a class="btn gold" href="#/plans">${sub && sub.status === 'active' ? 'המנוי שלי' : 'למנויים 👠'}</a>
      </div>
      <p class="xs ${sub ? 'gold-l' : 'muted'}">${subLine}</p>
    </div>

    <div class="stack-s">
      <div class="row between"><h2>השיעורים שלי</h2><a href="#/schedule" class="btn ghost sm" style="color:var(--gold)">למערכת</a></div>
      ${mine.length ? mine.map(x => { const d = new Date(x.s.starts_at); return `<div class="card"><div class="row between">
          <div><h3>${dayName(d)} ${dm(d)} · ${hm(d)}</h3><p class="small muted">${esc(x.s.title)}</p></div>
          <span class="gold" style="font-weight:600">${x.status === 'booked' ? 'רשומה' : 'בהמתנה'}</span></div></div>`; }).join('')
        : `<div class="card" style="align-items:center;text-align:center"><span style="font-size:30px">👠</span><p class="muted">עוד לא נרשמת לשיעור. הרצפה מחכה לך.</p><a class="btn primary" href="#/schedule">לבחור שיעור</a></div>`}
    </div>

    <a class="card" href="#/about" style="text-decoration:none;color:inherit;flex-direction:row;align-items:center;gap:14px">
      <img src="yuval.jpg" alt="" style="width:52px;height:52px;border-radius:26px;border:1px solid var(--gold);object-fit:cover;object-position:50% 20%">
      <span class="grow"><h3>קצת עליי</h3><span class="small muted">מי אני, ולמה הקמתי את המרחב הזה</span></span></a>
    <a class="btn outline block" target="_blank" rel="noopener" href="#/arrive">איך מגיעים 📍</a>
    <p class="xs muted center" style="margin-top:-6px">${esc(CFG.address)}</p>
  </div>`, 'home');
  bind('#more', 'click', () => { msgShift++; ROUTES.home(); });
  bindPush(() => ROUTES.home());
};

/* ───────────────────────── schedule ───────────────────────── */
ROUTES.schedule = async () => {
  loading(); showTabs('schedule');
  const s = await upcoming();
  const [b, counts, cr] = await Promise.all([myBookings(), s.length ? sb.rpc('session_counts', { ids: s.map(x => x.id) }) : [], credits()]);
  const mine = Object.fromEntries(b.map(x => [x.session_id, x]));
  const cnt = Object.fromEntries((counts || []).map(x => [x.session_id, x]));
  const groups = [];
  s.forEach(x => { const d = new Date(x.starts_at); const label = `יום ${dayName(d)}, ${dm(d)}`; const g = groups.find(y => y.label === label); g ? g.items.push(x) : groups.push({ label, items: [x] }); });

  render(`<div class="stack">
    <div class="stack-s" style="gap:4px"><h1>מערכת שיעורים</h1><p class="muted">נשארו לך ${credLabel(cr.total)} החודש</p></div>
    ${groups.length ? '' : '<div class="card"><p class="muted center">עוד אין שיעורים פתוחים להרשמה.</p></div>'}
    ${groups.map(g => `<div class="stack-s"><h3 class="gold" style="font-size:18px">${g.label}</h3>${g.items.map(x => {
      const my = mine[x.id], st = my && my.status, booked = st === 'booked', wait = st === 'waitlist';
      const c = cnt[x.id] || { booked: 0, waiting: 0 }, left = x.capacity - c.booked, full = !booked && left <= 0;
      const a = new Date(x.starts_at), e = new Date(x.ends_at), by = new Date(a.getTime() - 8 * 36e5);
      let spots = 'יש מקום', cls = 'muted';
      if (booked) { spots = `רשומה · ביטול חינם עד ${dayName(by)} ${hm(by)}`; cls = 'gold-l'; }
      else if (wait) { const o = WAIT.find(w => w.h === Number(my.wait_until_hours)); spots = 'ברשימת המתנה' + (o ? ' · ' + o.label : ''); cls = 'gold-l'; }
      else if (full) spots = 'השיעור מלא · אפשר להמתין';
      else if (left <= 3) { spots = left === 1 ? 'נשאר מקום אחרון!' : `נשארו ${left} מקומות אחרונים`; cls = 'hot'; }
      const label = booked || wait ? 'ביטול' : full ? 'להמתנה' : 'להירשם';
      const act = booked || wait ? 'cancel' : full ? 'wait' : 'book';
      return `<div class="card"><div class="row">
        <div class="time"><b>${hm(a)}</b><span class="xs muted">–${hm(e)}</span></div>
        <div class="grow"><h3>${esc(x.title)}</h3><p class="xs ${cls}">${spots}</p></div>
        <button class="btn ${act === 'book' ? 'primary' : 'outline'} sm" data-act="${act}" data-id="${x.id}" data-st="${st || ''}">${label}</button>
      </div></div>`;
    }).join('')}</div>`).join('')}
    <p class="xs muted">ביטול עד 8 שעות לפני השיעור מחזיר את השיעור למנוי. פחות מ־8 שעות לפני, אפשר לבטל רק אם יש מישהי ברשימת ההמתנה שתיכנס במקומך.</p>
  </div>`, 'schedule');

  const byId = Object.fromEntries(s.map(x => [x.id, x]));
  bind('[data-act]', 'click', e => {
    const btn = e.currentTarget, x = byId[btn.dataset.id], act = btn.dataset.act;
    if (act === 'book') busy(btn, () => book(x));
    if (act === 'wait') waitSheet(x);
    if (act === 'cancel') {
      const wait = btn.dataset.st === 'waitlist', hrs = (new Date(x.starts_at) - Date.now()) / 36e5;
      confirmSheet(wait ? 'לצאת מרשימת ההמתנה?' : 'לבטל את ההרשמה?',
        wait ? '' : hrs >= 8 ? 'השיעור יחזור למנוי שלך.' : 'פחות מ־8 שעות לשיעור: אפשר לבטל רק אם יש מישהי ברשימת ההמתנה שתיכנס במקומך.',
        'כן, לבטל', async () => {
          try { await sb.rpc('cancel_booking', { s: x.id }); toast(wait ? 'יצאת מרשימת ההמתנה' : 'ההרשמה בוטלה'); }
          catch (err) { toast(errText(err), 5000); }
          ROUTES.schedule();
        }, true);
    }
  });
};

async function book(x, waitHours) {
  try {
    const r = await sb.rpc('book_session', { s: x.id, wait_hours: waitHours ?? null });
    toast(r === 'waitlist' ? 'נכנסת לרשימת ההמתנה 🔔' : 'נרשמת! נתראה על הרצפה 💋');
    ROUTES.schedule();
  } catch (e) {
    const m = errText(e);
    if (m.includes('אין שיעורים')) {
      sheet(`<h2>אין שיעורים במנוי</h2><p class="soft">כדי להירשם צריך מנוי פעיל או שיעור בודד 👠</p>
        <a class="btn gold block" href="#/plans" data-close>למנויים</a><button class="btn ghost block" data-close>סגירה</button>`);
    } else toast(m, 5000);
  }
}

function waitSheet(x) {
  let h = 2, ack = false;
  const draw = el => {
    const o = WAIT.find(w => w.h === h);
    el.innerHTML = `<h2>רשימת המתנה 🔔</h2><p class="soft">השיעור מלא. עד מתי את רוצה לחכות למקום?</p>
      <div class="wait-grid" role="radiogroup">${WAIT.map(w => `<button class="btn ${w.h === h ? 'gold' : 'outline'}" role="radio" aria-checked="${w.h === h}" data-h="${w.h}">${w.label}</button>`).join('')}</div>
      <div class="card flat"><p class="small" style="color:#F0D6B0"><b>חשוב לדעת:</b> אם מתפנה מקום עד ${o.short}, את נרשמת לשיעור אוטומטית, יורד שיעור מהמנוי ונשלחת אלייך התראה לטלפון. חשוב שההתראות יהיו מופעלות. פחות מ־8 שעות לפני השיעור אי אפשר לבטל, אלא אם יש מישהי אחרת ברשימת ההמתנה.</p></div>
      <label class="check"><input type="checkbox" id="ack" ${ack ? 'checked' : ''}><span>הבנתי ואני מסכימה</span></label>
      <button class="btn primary block" id="join" ${ack ? '' : 'disabled'}>${ack ? 'להצטרף לרשימת ההמתנה' : 'צריך לאשר כדי להצטרף'}</button>
      <button class="btn ghost block" data-close>ביטול</button>`;
    $$('[data-h]', el).forEach(b => b.addEventListener('click', () => { h = Number(b.dataset.h); draw(el); }));
    $('#ack', el).addEventListener('change', e => { ack = e.target.checked; draw(el); });
    $$('[data-close]', el).forEach(b => b.addEventListener('click', () => { $('#sheet-root').innerHTML = ''; }));
    $('#join', el).addEventListener('click', e => busy(e.currentTarget, async () => { $('#sheet-root').innerHTML = ''; await book(x, h); }));
  };
  sheet('', el => draw(el));
  pushState().then(st => { const el = $('.sheet'); if (!el || st === 'on' || st === 'unsupported') return;
    el.insertAdjacentHTML('afterbegin', pushCard(st, true)); bindPush(() => { const c = $('.sheet [data-push]'); if (c) c.closest('.card').remove(); }); }).catch(() => {});
}

/* ───────────────────────── journey ───────────────────────── */
ROUTES.journey = async () => {
  loading(); showTabs('journey');
  const [n, vids] = await Promise.all([attended(), sb.select('videos', `select=*&user_id=eq.${sb.uid}&order=created_at`)]);
  const urls = await sb.signUrls(vids.map(v => v.storage_path)).catch(() => []);
  vids.forEach((v, i) => { v.url = urls[i]; });
  const liked = vids.filter(v => v.liked), before = liked[0], after = liked.length > 1 ? liked[liked.length - 1] : null;
  const next = MILESTONES.find(([k]) => n < k);
  const vbox = (v, label, empty, now) => `<div class="stack-s" style="gap:6px"><div class="vid ${now ? 'now' : ''}">${v && v.url ? `<video src="${esc(v.url)}" controls playsinline preload="metadata"></video>` : `<span class="empty">${empty}</span>`}</div>
    <span class="xs ${now ? 'gold-l' : 'muted'}">${label} · ${v ? dm(new Date(v.created_at)) : '—'}</span></div>`;

  render(`<div class="stack">
    <div class="stack-s" style="gap:4px"><h1>המסע שלי 🐆</h1><p class="muted">כל שיעור הוא עוד צעד אל עצמך</p></div>
    <div class="card">
      <div class="row" style="align-items:baseline"><span style="font-size:46px;font-weight:700;color:var(--gold);line-height:1">${n}</span><span style="font-size:17px">שיעורים שרקדת</span></div>
      <div class="milestones">${MILESTONES.map(([k, name]) => `<div><div class="dot ${n >= k ? 'on' : ''}">${k}</div><small>${name}</small></div>`).join('')}</div>
      <p class="small gold-l">${next ? (next[0] - n === 1 ? `עוד שיעור אחד ל"${next[1]}"` : `עוד ${next[0] - n} שיעורים ל"${next[1]}"`) : 'הגעת לכל אבני הדרך. מלכה 👑'}</p>
    </div>
    <div class="stack-s"><h2>לפני ← עכשיו</h2><p class="small muted">הסרטון הראשון שסימנת בלב מופיע כ"לפני", והאחרון שסימנת מופיע כ"עכשיו".</p>
      <div class="compare">${vbox(before, 'לפני', 'סמני בלב את הסרטון הראשון שלך')}${vbox(after, 'עכשיו', 'כשתסמני סרטון נוסף, הוא יופיע כאן', true)}</div></div>
    ${liked.length ? `<div class="stack-s"><h2>הסרטונים שאהבתי ❤</h2><div class="grid3">${liked.map(v => `<button class="thumb liked" data-open="${v.id}">▶<span class="xs muted">${dm(new Date(v.created_at))}</span></button>`).join('')}</div></div>` : ''}
    <div class="stack-s"><h2>כל הסרטונים מהשיעורים</h2>
      ${vids.length ? `<div class="grid3">${vids.map(v => `<div class="thumb ${v.liked ? 'liked' : ''}" data-open="${v.id}" role="button" tabindex="0" aria-label="צפייה בסרטון מ־${dm(new Date(v.created_at))}">▶<span class="xs muted">${dm(new Date(v.created_at))}</span>
        <button class="heart" data-like="${v.id}" aria-label="${v.liked ? 'הסרת לייק' : 'לייק'}" aria-pressed="${v.liked}">${v.liked ? '❤️' : '🤍'}</button></div>`).join('')}</div>`
        : '<p class="small muted">עוד אין כאן סרטונים.</p>'}
    </div>
    <div class="card"><h3>להעלות סרטון שלי 🎥</h3>
      <p class="small soft">צילמת את עצמך בשיעור? העלי לכאן ותראי את ההתקדמות שלך לאורך הזמן. הסרטונים פרטיים: רק את ויובל רואות אותם. גם יובל יכולה להעלות לכאן סרטונים שלך.</p>
      <label class="btn primary block">בחירת סרטון<input type="file" accept="video/*" id="myvid" hidden></label>
      <p class="xs muted">עד 50MB לסרטון (בערך דקה בטלפון).</p></div>
  </div>`, 'journey');

  const byId = Object.fromEntries(vids.map(v => [v.id, v]));
  const like = async v => { await sb.update('videos', `id=eq.${v.id}`, { liked: !v.liked, liked_at: v.liked ? null : nowIso() }); ROUTES.journey(); };
  bind('[data-like]', 'click', e => { e.stopPropagation(); like(byId[e.currentTarget.dataset.like]).catch(err => toast(errText(err))); });
  bind('#myvid', 'change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (f.size > 50 * 1024 * 1024) return toast('הסרטון גדול מדי (מעל 50MB). נסי סרטון קצר יותר', 5000);
    const label = e.target.closest('label'); label.innerHTML = '<span class="spinner"></span> מעלה…';
    const ext = (f.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
    const path = `${sb.uid}/${Date.now()}.${ext}`;
    sb.upload(path, f).then(() => sb.insert('videos', { user_id: sb.uid, storage_path: path }))
      .then(() => { toast('הסרטון עלה 🖤'); ROUTES.journey(); })
      .catch(err => { toast('ההעלאה נכשלה: ' + errText(err), 5000); ROUTES.journey(); });
  });
  bind('[data-open]', 'click', e => {
    const v = byId[e.currentTarget.dataset.open];
    sheet(`${v.url ? `<video src="${esc(v.url)}" controls playsinline autoplay></video>` : '<p class="muted">הסרטון לא זמין</p>'}
      <button class="btn ${v.liked ? 'gold' : 'outline'} block" id="lk">${v.liked ? '❤ במסע שלי' : '🤍 להוסיף למסע'}</button>
      <button class="btn ghost block" data-close>סגירה</button>`, (el, close) => {
      $('#lk', el).addEventListener('click', ev => busy(ev.currentTarget, async () => { await like(v); close(); }));
    });
  });
};

/* ───────────────────────── profile ───────────────────────── */
ROUTES.profile = async () => {
  const p = S.profile, until = p.health_signed_at ? new Date(new Date(p.health_signed_at).getTime() + 2 * 365 * 864e5) : null;
  const tg = (field, label, sub) => `<div class="list-row"><div class="grow"><p>${label}</p><p class="xs muted">${sub}</p></div>
    <button class="toggle" role="switch" aria-label="${label}" aria-checked="${!!p[field]}" data-field="${field}"></button></div>`;
  const wa = whatsappLink('היי יובל 🖤');
  render(`<div class="stack">
    <h1>הפרופיל שלי</h1>
    <div class="card"><div class="row">
      <span style="width:56px;height:56px;border-radius:28px;background:var(--burgundy);color:#F0D6B0;display:flex;align-items:center;justify-content:center;font-size:24px">${esc(firstName(p).charAt(0))}</span>
      <div class="grow"><h3 style="font-size:18px">${esc(p.display_name)}</h3><p class="small muted">${esc(p.phone || (sb.session.user && sb.session.user.email) || '')}</p></div>
      <button class="btn ghost sm" id="edit">עריכה</button></div></div>
    <a class="btn outline block" href="#/plans">המנוי שלי</a>
    <div id="pushbox"></div>
    <div class="stack-s"><h2>צילום בשיעורים</h2><div class="card" style="padding-top:4px;padding-bottom:4px">
      ${tg('photo_social_ok', 'שיתוף ברשתות של הסטודיו', 'רק באישור שלך לכל פרסום')}</div></div>
    <div class="stack-s"><h2>שאלות נפוצות</h2><div class="card" style="padding-top:4px;padding-bottom:4px">
      ${FAQ.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${linky(a)}</p></details>`).join('')}</div></div>
    <div class="stack-s"><h2>מסמכים וחתימות</h2><div class="card" style="padding-top:4px;padding-bottom:4px">
      <div class="list-row"><span>הצהרת בריאות</span><span class="small gold">${until ? 'בתוקף עד ' + dmy(until) : 'טרם נחתמה'}</span></div>
      <div class="list-row"><span>תקנון ומדיניות ביטולים</span><button class="btn ghost sm" data-legal="terms">לקריאה</button></div>
      <div class="list-row"><span>מדיניות פרטיות</span><button class="btn ghost sm" data-legal="privacy">לקריאה</button></div></div></div>
    ${wa ? `<a class="btn primary block" target="_blank" rel="noopener" href="${wa}">שאלה? כתבי ליובל בוואטסאפ</a>` : ''}
    <div class="row" style="justify-content:center;gap:20px"><button class="btn ghost" id="out">התנתקות</button><button class="btn ghost" id="del">מחיקת החשבון</button></div>
  </div>`, 'profile');

  pushState().then(st => { const box = $('#pushbox'); if (!box) return;
    box.innerHTML = st === 'on' ? '<div class="card"><div class="row between"><h3>🔔 התראות לטלפון</h3><span class="gold-l small">מופעלות במכשיר הזה ✓</span></div></div>' : pushCard(st);
    bindPush(() => ROUTES.profile()); }).catch(() => {});
  bind('[data-field]', 'click', e => {
    const f = e.currentTarget.dataset.field, v = !S.profile[f];
    S.profile[f] = v;
    e.currentTarget.setAttribute('aria-checked', String(v));
    sb.update('profiles', `id=eq.${sb.uid}`, { [f]: v }).then(loadProfile).catch(err => { toast(errText(err)); ROUTES.profile(); });
  });
  bind('[data-legal]', 'click', e => legalSheet(e.currentTarget.dataset.legal));
  bind('#edit', 'click', () => sheet(`<h2>עריכת פרטים</h2>
      <label class="field"><span>שם מלא או שם חיבה</span><input type="text" id="n" value="${esc(p.display_name)}"></label>
      <label class="field"><span>טלפון</span><input class="ltr" type="tel" id="ph" value="${esc(p.phone || '')}"></label>
      <button class="btn primary block" id="save">שמירה</button><button class="btn ghost block" data-close>ביטול</button>`, (el, close) => {
    $('#save', el).addEventListener('click', ev => busy(ev.currentTarget, async () => {
      const n = $('#n', el).value.trim(); if (!n) return toast('צריך שם');
      await sb.update('profiles', `id=eq.${sb.uid}`, { display_name: n, phone: $('#ph', el).value.trim() || null });
      await loadProfile(); close(); ROUTES.profile();
    }));
  }));
  bind('#out', 'click', async () => { await sb.signOut(); S.profile = null; location.hash = ''; route(); });
  bind('#del', 'click', () => confirmSheet('למחוק את החשבון?', 'כל הפרטים, ההרשמות והסרטונים שלך יימחקו לצמיתות. אי אפשר לבטל את זה.', 'כן, למחוק', async () => {
    try { await sb.rpc('delete_my_account'); sb.save(null); S.profile = null; location.hash = ''; route(); toast('החשבון נמחק'); }
    catch (err) { toast(errText(err)); }
  }, true));
};

/* ───────────────────────── plans / my subscription ───────────────────────── */
ROUTES.plans = async () => {
  loading(); showTabs('home');
  const [packs, sub, cr] = await Promise.all([sb.select('packages', 'select=*&active=eq.true&order=sort'), mySubscription(), credits()]);
  const active = sub && sub.status === 'active';
  const single = (packs.find(x => x.kind === 'single') || { price_ils: 65 }).price_ils;
  const ask = p => p.pay_url || whatsappLink(`היי יובל, אני רוצה להצטרף ל${p.title} (₪${p.price_ils}${p.kind === 'monthly' ? ' לחודש' : ''}) 👠`);
  render(`<div class="stack">
    <a class="btn ghost" href="#/home" style="align-self:flex-start">› חזרה</a>
    <h1>${active ? 'המנוי שלי' : 'מנויים'}</h1>
    ${sub ? `<div class="card ${active ? 'wine' : ''}">
      <p class="xs" style="color:#F0D6B0">${active ? 'מנוי פעיל' : 'המנוי בוטל'}</p>
      <h2 style="color:var(--warm)">${esc(sub.packages.title)}</h2>
      <p style="color:var(--warm)">נשארו לך החודש: <b>${credLabel(cr.total)}</b></p>
      <p class="small" style="color:#E8C9A0">${active ? `החידוש הבא: ${dmy(new Date(sub.period_end))}` : `השיעורים זמינים עד ${dmy(new Date(sub.period_end))}. אין חיובים נוספים.`}</p>
      ${active ? '<button class="btn ghost" id="cancel" style="color:#F0D6B0;align-self:flex-start">ביטול המנוי</button>' : ''}
    </div>` : `<p class="muted">יש לך עכשיו ${credLabel(cr.total)}.</p>`}
    ${packs.map(p => `<div class="card"><div class="row between">
      <div class="grow"><h3 style="font-size:18px">${esc(p.title)}</h3>
        <p class="small muted">${p.kind === 'monthly' ? `${p.classes} שיעורים בחודש · ₪${Math.round(p.price_ils / p.classes)} לשיעור` : 'בתוקף ל־30 יום'}</p>
        ${p.kind === 'monthly' && p.classes * single > p.price_ils ? `<p class="xs gold-l" style="font-weight:600">${Math.round(100 - 100 * p.price_ils / (p.classes * single))}% הנחה לעומת שיעור בודד</p>` : ''}</div>
      <div class="center"><p style="font-size:22px;font-weight:700">₪${p.price_ils}</p><p class="xs muted">${p.kind === 'monthly' ? 'לחודש' : 'חד־פעמי'}</p></div></div>
      ${ask(p) ? `<a class="btn gold block" target="_blank" rel="noopener" href="${ask(p)}">${active && sub.package_id === p.id ? 'המנוי הנוכחי שלך' : p.kind === 'monthly' ? (active ? 'מעבר למנוי הזה' : 'להצטרפות') : 'לרכישה'}</a>`
        : '<p class="xs muted">קישור התשלום יעלה כאן בקרוב.</p>'}
    </div>`).join('')}
    <p class="xs muted">המנוי מתחדש אוטומטית בכל חודש בהוראת קבע. שיעורים שלא נוצלו פגים בסוף החודש. אפשר לבטל בכל עת, והביטול נכנס לתוקף תוך 3 ימי עסקים, לפי חוק הגנת הצרכן.</p>
  </div>`, 'home');
  bind('#cancel', 'click', () => confirmSheet('לבטל את המנוי?', `לא יהיו חיובים נוספים. השיעורים שכבר שילמת עליהם זמינים עד ${dmy(new Date(sub.period_end))}.`, 'כן, לבטל את המנוי', async () => {
    try { await sb.rpc('cancel_my_subscription'); toast('המנוי בוטל. נתראה על הרצפה 🖤', 4000); } catch (e) { toast(errText(e)); }
    ROUTES.plans();
  }, true));
};

/* ───────────────────────── about ───────────────────────── */
ROUTES.about = () => {
  render(`<div class="stack">
    <a class="btn ghost" href="#/home" style="align-self:flex-start">› חזרה</a>
    <img src="yuval.jpg" alt="יובל" style="width:100%;aspect-ratio:1;object-fit:cover;object-position:50% 25%;border-radius:22px;border:1px solid var(--gold)">
    <h1>היי, אני יובל 🖤</h1>
    <p style="font-size:17px;color:#E8DCD2">בשיעורים שלי העקבים הם רק ההתחלה. מה שאנחנו באמת מתרגלות זה אהבה עצמית, קבלה, שחרור שליטה והתמסרות: לגוף, למוזיקה ולרגע.</p>
    <p style="font-size:17px;color:#E8DCD2">המרחב שלנו פתוח, חושני ובטוח. אין כאן נכון או לא נכון, אין השוואות, ואין צורך בניסיון. יש רק אותך, כמו שאת.</p>
    <div class="stack-s"><h2>קצת ממני על הרצפה 👠</h2>
      <video src="dance1.mp4" poster="dance1.jpg" controls muted playsinline loop preload="none" style="width:100%;border-radius:18px;border:1px solid var(--line, #3a2a2e);background:#000"></video>
      <video src="dance2.mp4" poster="dance2.jpg" controls muted playsinline loop preload="none" style="width:100%;border-radius:18px;border:1px solid var(--line, #3a2a2e);background:#000"></video></div>
  </div>`, 'home');
};

/* ───────────────────────── how to get there ───────────────────────── */
ROUTES.arrive = () => {
  render(`<div class="stack">
    <a class="btn ghost" href="#/home" style="align-self:flex-start">› חזרה</a>
    <h1>איך מגיעים 📍</h1>
    <p class="soft">${esc(CFG.address)}</p>
    <a class="btn gold block" target="_blank" rel="noopener" href="${CFG.maps}">פתיחה במפות</a>
    <a class="btn outline block" target="_blank" rel="noopener" href="https://waze.com/ul?q=${encodeURIComponent(CFG.address)}&navigate=yes">ניווט בוויז</a>
    <div class="stack-s"><h2>1. מהרחוב אל הכניסה</h2>
      <video src="arrive1.mp4" poster="arrive1.jpg" controls playsinline preload="none" style="width:100%;border-radius:18px;background:#000"></video></div>
    <div class="stack-s"><h2>2. מהכניסה אל הסטודיו</h2>
      <video src="arrive2.mp4" poster="arrive2.jpg" controls playsinline preload="none" style="width:100%;border-radius:18px;background:#000"></video></div>
    ${whatsappLink('היי יובל, אני בדרך ולא מוצאת 🙈') ? `<a class="btn outline block" target="_blank" rel="noopener" href="${whatsappLink('היי יובל, אני בדרך ולא מוצאת 🙈')}">לא מוצאת? כתבי ליובל</a>` : ''}
  </div>`, 'home');
};

/* ───────────────────────── admin (Yuval) ───────────────────────── */
let adminClient = null;
ROUTES.admin = async () => {
  loading(); showTabs(null);
  await seedMessages();
  const sess = await sb.select('class_sessions', `select=*&starts_at=gte.${new Date(Date.now() - 6 * 36e5).toISOString()}&cancelled=eq.false&order=starts_at&limit=12`);
  const [book, clients, packs, subs, packsLeft, decl] = await Promise.all([
    sess.length ? sb.select('bookings', `select=id,session_id,status,joined_at,profiles(display_name)&session_id=in.(${sess.map(x => x.id).join(',')})&status=in.(booked,waitlist)&order=joined_at`) : [],
    sb.select('profiles', 'select=id,display_name,phone,age,intro,photo_journey_ok,photo_social_ok&order=display_name'),
    sb.select('packages', 'select=*&active=eq.true&order=sort'),
    sb.select('subscriptions', `select=*,packages(title)&status=eq.active`),
    sb.select('credit_packs', `select=user_id,remaining&expires_at=gt.${nowIso()}`),
    sb.select('health_declarations', 'select=user_id,needs_doctor,doctor_approved_at,signed_at,notes,answers&order=signed_at'),
  ]);
  const lastDecl = {}; decl.forEach(d => { lastDecl[d.user_id] = d; });
  const waitDoc = clients.filter(x => lastDecl[x.id] && lastDecl[x.id].needs_doctor && !lastDecl[x.id].doctor_approved_at);
  const roster = {}; book.forEach(b => (roster[b.session_id] = roster[b.session_id] || []).push(b));
  const subOf = Object.fromEntries(subs.map(s => [s.user_id, s]));
  const left = {}; packsLeft.forEach(p => { left[p.user_id] = (left[p.user_id] || 0) + p.remaining; });
  const c = adminClient && clients.find(x => x.id === adminClient);

  render(`<div class="stack">
    <div class="row between"><h1>ניהול 🐆</h1><a class="btn ghost" href="#/home">› חזרה</a></div>
    ${waitDoc.length ? `<div class="card" style="border-color:var(--gold)"><h3>מחכות לאישור 🩺</h3><p class="xs muted">סימנו "כן" בהצהרת הבריאות (צריך אישור רופא), או שהן מתחת לגיל 18 (צריך אישור הורה). אחרי שקיבלת את האישור, לחצי "אישור" והן יוכלו להירשם.</p>
      ${waitDoc.map(x => `<div class="list-row"><span>${esc(x.display_name)}</span><button class="btn gold sm" data-doc="${x.id}">אישור</button></div>`).join('')}</div>` : ''}
    <button class="btn outline block" id="tue">הוספת שיעורי ראשון ל־8 שבועות</button>
    ${sess.map(s => {
      const r = roster[s.id] || [], bk = r.filter(x => x.status === 'booked'), wt = r.filter(x => x.status === 'waitlist'), d = new Date(s.starts_at);
      return `<div class="card">
        <div class="row between"><div><h3>${dayName(d)} ${dm(d)} · ${hm(d)}</h3><p class="small muted">${esc(s.title)}</p></div>
          <span style="font-size:24px;font-weight:700;color:var(--gold)">${bk.length}/${s.capacity}</span></div>
        <p class="xs gold-l">${wt.length ? wt.length + ' ממתינות' : Math.max(0, s.capacity - bk.length) + ' מקומות פנויים'}</p>
        <div class="cap"><span class="small soft">מקומות בשיעור</span><div class="row" style="gap:6px">
          <button class="btn outline icon sm" data-cap="${s.id}" data-v="${s.capacity + 1}" aria-label="להוסיף מקום">+</button>
          <b style="min-width:30px;text-align:center">${s.capacity}</b>
          <button class="btn outline icon sm" data-cap="${s.id}" data-v="${Math.max(0, s.capacity - 1)}" aria-label="להוריד מקום">−</button></div></div>
        <details><summary class="btn ghost sm">מי מגיעה?</summary>
          ${r.length ? r.map(x => `<div class="list-row" style="min-height:38px"><span>${esc(x.profiles && x.profiles.display_name)}</span><span class="xs muted">${x.status === 'waitlist' ? 'רשימת המתנה' : ''}</span></div>`).join('') : '<p class="small muted">עוד אין נרשמות.</p>'}
          <button class="btn ghost sm danger" data-cancel="${s.id}">ביטול השיעור</button></details>
      </div>`;
    }).join('')}

    <div class="card">
      <h2>לקוחות (${clients.length})</h2>
      <div class="chips">${clients.map(x => `<button class="chip" aria-pressed="${x.id === adminClient}" data-client="${x.id}">${esc(x.display_name)}</button>`).join('')}</div>
      ${c ? `<div class="stack-s">
        <p class="small muted">${esc(c.phone || '')} · נשארו ${credLabel(left[c.id] || 0)} · ${subOf[c.id] ? 'מנוי: ' + esc(subOf[c.id].packages.title) + ', מתחדש ' + dmy(new Date(subOf[c.id].period_end)) : 'אין מנוי פעיל'}</p>
        ${(() => { const d = lastDecl[c.id], i = c.intro || {}, yes = d ? HEALTH_Q.filter(([k]) => d.answers && d.answers[k]).map(([, q]) => q) : [];
          return `<div class="card flat stack-s" style="gap:6px">
            ${c.age ? `<p class="small">גיל: ${esc(c.age)}${c.age < 18 ? ' · <span class="gold-l">צריך אישור הורה</span>' : ''}</p>` : ''}
            ${i.danced ? `<p class="small">רקדה פעם: ${esc(i.danced)}</p>` : ''}
            ${i.why && i.why.length ? `<p class="small">מה מושך אותה: ${esc(i.why.join(', '))}</p>` : ''}
            ${i.source ? `<p class="small">הגיעה דרך: ${esc(i.source)}</p>` : ''}
            ${yes.length ? `<p class="small gold-l">ענתה "כן" על: ${esc(yes.join(' | '))}</p>` : ''}
            ${d && d.notes ? `<p class="small">כתבה לך: ${esc(d.notes)}</p>` : ''}</div>`; })()}
        <h3>הפעלת מנוי (אחרי הוראת קבע ב־UPAY)</h3>
        ${packs.filter(p => p.kind === 'monthly').map(p => `<button class="btn outline block" data-sub="${p.id}">${esc(p.title)} · ₪${p.price_ils} לחודש</button>`).join('')}
        ${subOf[c.id] ? `<button class="btn ghost block" data-endsub="${subOf[c.id].id}">ביטול המנוי שלה</button>` : ''}
        <h3>שיעור בודד (אחרי תשלום)</h3>
        ${packs.filter(p => p.kind === 'single').map(p => `<button class="btn outline block" data-single="${p.id}">${esc(p.title)} · ₪${p.price_ils}</button>`).join('')}
        <h3>סרטון למסע</h3>
        <label class="btn primary block">בחירת סרטון<input type="file" accept="video/*" id="vid" hidden></label>
        <p class="xs muted">צילום לרשתות: ${c.photo_social_ok ? 'מאשרת ✓' : 'לא מאשרת'}</p>
      </div>` : '<p class="small muted">בחרי לקוחה כדי להפעיל מנוי, לטעון שיעור בודד או להעלות סרטון.</p>'}
    </div>
  </div>`, null);

  const again = () => ROUTES.admin();
  bind('[data-client]', 'click', e => { adminClient = e.currentTarget.dataset.client; again(); });
  bind('[data-cap]', 'click', e => busy(e.currentTarget, async () => { await sb.rpc('admin_set_capacity', { s: e.currentTarget.dataset.cap, cap: Number(e.currentTarget.dataset.v) }); again(); }));
  bind('[data-cancel]', 'click', e => { const id = e.currentTarget.dataset.cancel; confirmSheet('לבטל את השיעור?', 'כל הרשומות יקבלו את השיעור בחזרה.', 'כן, לבטל', async () => { await sb.rpc('admin_cancel_session', { s: id }); again(); }, true); });
  bind('[data-doc]', 'click', e => busy(e.currentTarget, async () => { await sb.rpc('admin_approve_doctor', { u: e.currentTarget.dataset.doc }); toast('אושר ✓ היא יכולה להירשם לשיעורים'); again(); }));
  bind('#tue', 'click', e => busy(e.currentTarget, async () => { const n = await addTuesdays(sess); toast(n ? `נוספו ${n} שיעורים` : 'כל השיעורים כבר קיימים'); again(); }));
  bind('[data-sub]', 'click', e => { const p = packs.find(x => x.id === Number(e.currentTarget.dataset.sub));
    confirmSheet('להפעיל מנוי?', `${p.title} ל${c.display_name}. השיעורים של החודש ייטענו עכשיו, והמנוי יתחדש אוטומטית כל חודש.`, 'הפעלה', async () => {
      try { await sb.rpc('admin_start_subscription', { u: c.id, pkg: p.id }); toast('המנוי הופעל ✓'); } catch (err) { toast(errText(err)); } again(); }); });
  bind('[data-endsub]', 'click', e => { const id = e.currentTarget.dataset.endsub;
    confirmSheet('לבטל את המנוי שלה?', 'לא יהיו חידושים נוספים. מה שכבר נטען נשאר עד סוף החודש.', 'ביטול המנוי', async () => { await sb.rpc('admin_cancel_subscription', { sub: id }); again(); }, true); });
  bind('[data-single]', 'click', e => { const p = packs.find(x => x.id === Number(e.currentTarget.dataset.single));
    confirmSheet('לטעון שיעור בודד?', `${p.title} ל${c.display_name}`, 'לטעון', async () => {
      await sb.insert('credit_packs', { user_id: c.id, package_id: p.id, total: p.classes, remaining: p.classes, expires_at: new Date(Date.now() + p.valid_days * 864e5).toISOString(), payment_ref: 'ידני' });
      toast('נטען ✓'); again(); }); });
  bind('#vid', 'change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const label = e.target.closest('label'); label.innerHTML = '<span class="spinner"></span> מעלה…';
    const ext = (f.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
    const path = `${c.id}/${Date.now()}.${ext}`;
    sb.upload(path, f).then(() => sb.insert('videos', { user_id: c.id, storage_path: path }))
      .then(() => { toast(`הסרטון עלה ✓ ${c.display_name} תראה אותו במסע שלה`, 4000); again(); })
      .catch(err => { toast('ההעלאה נכשלה: ' + errText(err), 5000); again(); });
  });
};

async function addTuesdays(existing) {
  const have = new Set(existing.map(s => new Date(s.starts_at).getTime()));
  const rows = [], d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((0 - d.getDay() + 7) % 7));
  for (let w = 0; w < 8; w++) {
    const day = new Date(d); day.setDate(d.getDate() + 7 * w);
    for (const [h, m, eh, em, level] of [[19, 0, 20, 15, 'מתחילות'], [20, 30, 21, 45, 'בינוני']]) {
      const a = new Date(day); a.setHours(h, m, 0, 0); const b = new Date(day); b.setHours(eh, em, 0, 0);
      if (a > new Date() && !have.has(a.getTime())) rows.push({ title: `עקבים · ${level}`, level, starts_at: a.toISOString(), ends_at: b.toISOString(), capacity: 12 });
    }
  }
  if (rows.length) await sb.insert('class_sessions', rows);
  return rows.length;
}

// First admin visit: load the 400 daily messages.
async function seedMessages() {
  try {
    if (await sb.count('daily_messages', 'select=id')) return;
    const all = await (await fetch('messages.json')).json();
    const rows = all.map((m, i) => ({ kind: m.type, body: m.text, sort: i + 1 }));
    for (let i = 0; i < rows.length; i += 100) await sb.insert('daily_messages', rows.slice(i, i + 100));
    toast('400 המשפטים היומיים נטענו ✓');
  } catch (e) { toast('טעינת המשפטים נכשלה: ' + errText(e)); }
}

/* ───────────────────────── start ───────────────────────── */
(async function start() {
  sb.load();
  swReady();
  const fromLink = await sb.fromUrl();
  if (fromLink && fromLink.error) { route(); setTimeout(() => toast('הקישור לא תקף יותר. נסי שוב'), 300); return; }
  if (fromLink && fromLink.type === 'recovery') { location.hash = '#/reset'; return; }
  if (fromLink) setTimeout(() => toast('המייל אושר 🖤'), 400);
  if (!location.hash) location.hash = '#/home'; else route();
})();
