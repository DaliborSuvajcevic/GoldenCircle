'use strict';
/* THE GOLDEN CIRCLE app
   Sopstveni podaci: localStorage "gc:v1" (ime, tema, poslednji unos kalkulatora).
   Čita i piše PROCESS podatke ("process:day:YYYY-MM-DD", "process:settings") u istom formatu kao Process.
   Samo čita Golden Trading Journal ("gtj:v2"). Ništa se ne šalje na server. */
{
const $ = s => document.querySelector(s);
const view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf = (n, d = 0) => Number(n).toLocaleString('sr-Latn-RS', {minimumFractionDigits: d, maximumFractionDigits: d});
const LINKS = {
  process: 'https://daliborsuvajcevic.github.io/Process/',
  journal: 'https://daliborsuvajcevic.github.io/Golden-trading-journal/',
  snake: 'https://daliborsuvajcevic.github.io/snake/',
  card: 'https://daliborsuvajcevic.github.io/digital-card/',
  instagram: 'https://www.instagram.com/onegoldenboyy/',
  starter: 'https://goldenboyy.gumroad.com/l/xvexk',
  masterclass: 'https://goldenboyy.gumroad.com/l/nwidl',
  clarity: 'https://goldenboyy.gumroad.com/l/wfoepq'
};
const CHEV = '<svg class="chev" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
const CHECK = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>';

/* ---------- storage ---------- */
const read = (k, fb = null) => { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast('Čuvanje nije uspelo'); return false; } };
const GC = 'gc:v1';
const gc = Object.assign({theme: 'dark', beta: 0, calc: {}, name: ''}, read(GC, {}));
const cleanName = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 40);
const saveGc = () => write(GC, gc);

/* ---------- datumi (lokalno vreme uređaja, isto kao Process) ---------- */
const dkey = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const addDays = (k, n) => { const d = new Date(k + 'T12:00'); d.setDate(d.getDate() + n); return dkey(d); };
const today = () => dkey(new Date());

/* ---------- PROCESS (isti model kao DaliborSuvajcevic/Process) ---------- */
const P = 'process:';
const DEF_SET = {minDay: 70, template: [{name:'Trading analiza',cat:'Trading'},{name:'Journal',cat:'Trading'},{name:'Backtesting',cat:'Trading'},{name:'Trening',cat:'Zdravlje'},{name:'Rad na projektu',cat:'Rad'},{name:'Čitanje / edukacija',cat:'Učenje'}]};
const Q = [['good','Šta sam danas uradio dobro?'],['better','Šta sam mogao bolje?'],['learned','Šta sam danas naučio?'],['distract','Šta mi je odvlačilo pažnju?'],['next','Koji je jedan konkretan korak za sutra?']];
const EMPTY_REVIEW = {good:'',better:'',learned:'',distract:'',next:''};
const pSettings = () => { const s = read(P + 'settings'); return s && Array.isArray(s.template) ? {minDay: Math.min(100, Math.max(1, +s.minDay || 70)), template: s.template.filter(t => t && typeof t.name === 'string')} : structuredClone(DEF_SET); };
const pDay = k => { const d = read(P + 'day:' + k); if (d && Array.isArray(d.tasks)) { d.review = {...EMPTY_REVIEW, ...d.review}; return d; } return null; };
/* Novi dan počinje bez zadataka: korisnik sam dodaje svoje. */
const pNew = k => ({tasks: [], review: {...EMPTY_REVIEW}, mood: 0, energy: 0, discipline: 0, focus: 0, skipped: false, score: 0, createdAt: new Date().toISOString(), updatedAt: ''});
const doneN = d => d.tasks.filter(t => t.status === 'done').length;
const pct = d => d.tasks.length ? doneN(d) / d.tasks.length * 100 : 0;
const rv = d => Object.values(d.review).filter(v => String(v).trim()).length;
const okDay = (k, min) => { const d = pDay(k); return !!d && !d.skipped && pct(d) >= min; };
const pScore = (d, k) => { const min = pSettings().minDay; let w = 0; for (let i = 0; i < 7; i++) if (okDay(addDays(k, -i), min)) w++; return Math.round(pct(d) * .5 + d.discipline * 2 + d.focus + rv(d) * 2 + w / 7 * 10); };
const pSave = (k, d) => { d.updatedAt = new Date().toISOString(); d.score = pScore(d, k); return write(P + 'day:' + k, d); };
const streak = () => { const min = pSettings().minDay; let k = okDay(today(), min) ? today() : addDays(today(), -1), n = 0; while (okDay(k, min) && n < 3650) { n++; k = addDays(k, -1); } return n; };
const week = () => { const a = []; for (let i = 0; i < 7; i++) { const d = pDay(addDays(today(), -i)); if (d && !d.skipped) a.push(pct(d)); } return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null; };

/* ---------- GOLDEN TRADING JOURNAL (samo čitanje, "gtj:v2") ---------- */
const rMul = (e, s, p, dir) => { const r = Math.abs(e - s); if (!r) return 0; return (dir === 'Long' ? p - e : e - p) / r; };
const realR = t => t.result === 'BE' ? 0 : t.exitPrice != null ? rMul(t.entry, t.stopLoss, t.exitPrice, t.direction) : t.result === 'Win' ? rMul(t.entry, t.stopLoss, t.takeProfit, t.direction) : -1;
const journal = () => {
  const doc = read('gtj:v2');
  if (!doc || !Array.isArray(doc.trades)) return null;
  const s = doc.settings || {};
  const trades = doc.trades.filter(t => t && typeof t.date === 'string');
  const pnl = t => (Number(realR(t)) || 0) * (Number(t.riskAmount) || 0);
  const tt = trades.filter(t => t.date.slice(0, 10) === today());
  const start = Number(doc.startingBalance);
  return {
    started: Number.isFinite(start) && doc.startingBalance !== null,
    balance: Number.isFinite(start) ? start + trades.reduce((a, t) => a + pnl(t), 0) : null,
    todayCount: tt.length,
    todayRisk: tt.reduce((a, t) => a + (Number(t.riskPercent) || 0), 0),
    todayPnl: tt.reduce((a, t) => a + pnl(t), 0),
    maxTrades: Number(s.maxTradesPerDay) || 5,
    maxLoss: Number(s.maxDailyLossPercent) || 5,
    last: [...trades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  };
};

/* ---------- sesije, vreme Srbije ---------- */
const SESS = [{name: 'London', from: 9 * 60, to: 12 * 60}, {name: 'New York', from: 15 * 60, to: 18 * 60}];
const belgrade = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Belgrade', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date()).map(x => [x.type, x.value]));
  return {day: p.weekday, min: +p.hour * 60 + +p.minute};
};
const dur = m => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const sessions = () => {
  const {day, min} = belgrade();
  const weekend = day === 'Sat' || day === 'Sun';
  const noTrade = weekend ? 'Vikend: tržište je zatvoreno.' : day === 'Mon' ? 'Ponedeljak: po tvojim pravilima se ne trguje.' : day === 'Fri' ? 'Petak: po tvojim pravilima se ne trguje.' : '';
  const list = SESS.map(s => {
    const on = !noTrade && min >= s.from && min < s.to;
    const state = noTrade ? 'Bez trgovanja' : on ? `Aktivna · još ${dur(s.to - min)}` : min < s.from ? `Počinje za ${dur(s.from - min)}` : 'Završena';
    return {...s, on, state, range: `${hm(s.from)}–${hm(s.to)}`};
  });
  return {noTrade, list, active: list.find(s => s.on), next: list.find(s => !noTrade && min < s.from)};
};

/* ---------- kalkulator (XAU/USD, isto kao Gold Risk Calculator) ---------- */
const PIP_VALUE_PER_LOT = 100 * 0.10; // 100 oz × 0,10 $ = 10 $ po pipu po lotu
const calc = (bal, riskPct, sl) => {
  if (!(bal > 0) || !(riskPct > 0) || !(sl > 0)) return null;
  const target = bal * riskPct / 100;
  const lots = Math.floor(target / (sl * PIP_VALUE_PER_LOT) / 0.01 + 1e-9) * 0.01;
  const risk = lots * sl * PIP_VALUE_PER_LOT;
  return {target, lots, risk, tp: risk * 3};
};

/* ---------- sadržaj ---------- */
const STANDARDS = ['Disciplina pre motivacije.', 'Doslednost pre trenutnog entuzijazma.', 'Standardi pre izgovora.', 'Izvršenje pre beskrajnog planiranja.', 'Dugoročno razmišljanje pre brzog zadovoljstva.', 'Lična odgovornost, bez izgovora.'];
const dayOfYear = () => { const n = new Date(); return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 864e5); };
const CAMPAIGN = {start: '2026-11-19', days: 30, end: '2026-12-18', offerEnd: '2026-12-30', spots: 10};
const DM = 'https://ig.me/m/onegoldenboyy';
const OFFERS = [
  {id: 'beta', name: 'Masterclass + mentorstvo', price: '150 €', old: '', when: 'Samo za prvih 10 kupaca, uz kod PRVIH10', tag: 'PRVIH 10', code: 'PRVIH10', url: 'https://goldenboyy.gumroad.com/l/nwidl/PRVIH10', cta: 'Kupi za 150 €',
   inc: ['Golden Masterclass, kompletna trading strategija', 'Mesec dana mentorstva, 3 puta nedeljno po 1 sat', 'Samo 10 mesta']},
  {id: 'main', name: 'Masterclass', price: '250 €', old: '300 €', when: 'Cena važi do 30.12.', tag: 'DO 30.12.', url: 'https://goldenboyy.gumroad.com/l/nwidl', cta: 'Kupi za 250 €',
   inc: ['Golden Masterclass, kompletna trading strategija', 'Jedan dan, jedan sat mentorstva', 'Cena 250 € umesto 300 €, samo do 30.12.']}
];
const offerOpen = () => { const t = today(); return t >= CAMPAIGN.start && t <= CAMPAIGN.offerEnd; };
const campaign = () => {
  const t = today();
  if (t < CAMPAIGN.start || t > CAMPAIGN.offerEnd) return null;
  const n = Math.round((new Date(t + 'T12:00') - new Date(CAMPAIGN.start + 'T12:00')) / 864e5) + 1;
  return {day: Math.min(n, CAMPAIGN.days), over: n > CAMPAIGN.days};
};

/* ---------- delovi UI ---------- */
const top = (title) => `<header class="top">
  <a class="brand" href="#pocetna"><img src="crown.png" alt="The Golden Circle kruna">${title ? '' : 'THE GOLDEN CIRCLE'}</a>
  ${title ? `<span class="eyebrow">${title}</span>` : ''}
  <a class="round" href="#meni" aria-label="Otvori meni"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></a>
</header>`;

const taskList = (d) => {
  const firstTodo = d.tasks.findIndex(t => t.status === 'todo');
  if (!d.tasks.length) return '<p class="empty">Nema zadataka. Dodaj ono što danas moraš da završiš.</p>';
  return d.tasks.map((t, i) => {
    const cls = t.status === 'done' ? 'done' : t.status === 'skip' ? 'skip' : i === firstTodo ? 'next' : '';
    const meta = t.status === 'skip' ? 'Preskočen' : i === firstTodo ? `Sledeći${t.cat ? ' · ' + esc(t.cat) : ''}` : esc(t.cat || '');
    return `<div class="task ${cls}">
      <button class="chk" data-a="toggle" data-i="${i}" aria-pressed="${t.status === 'done'}" aria-label="${t.status === 'done' ? 'Vrati zadatak' : 'Završi zadatak'}: ${esc(t.name)}">${CHECK}</button>
      <span class="t"><b>${esc(t.name)}</b>${meta ? `<small>${meta}</small>` : ''}</span>
      <button class="del" data-a="del" data-i="${i}" aria-label="Obriši zadatak: ${esc(t.name)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>`;
  }).join('');
};

/* korak za danas, iz jučerašnjeg večernjeg pregleda */
const stepFromYesterday = () => {
  const y = addDays(today(), -1), yd = pDay(y);
  const step = yd && String(yd.review.next || '').trim();
  if (!step || gc.stepDismissed === y) return null;
  const t = pDay(today());
  if (t && t.tasks.some(x => x.name.trim().toLowerCase() === step.slice(0, 120).toLowerCase())) return null;
  return step;
};
const stepCard = () => {
  const s = stepFromYesterday();
  if (!s) return '';
  return `<section class="card hi" aria-label="Korak od juče">
    <div class="row"><span class="eyebrow">KORAK OD JUČE</span>
      <button class="del" data-a="step-dismiss" aria-label="Sakrij korak od juče" style="margin:-10px -10px -10px 0"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <p class="quote" style="font-size:19px">${esc(s)}</p>
    <button class="btn" data-a="step-add">Dodaj kao zadatak</button>
  </section>`;
};

/* ---------- ekrani ---------- */
const screens = {
  pocetna() {
    const h = new Date().getHours();
    const hi = h < 12 ? 'Dobro jutro' : h < 18 ? 'Dobar dan' : 'Dobro veče';
    const d = pDay(today()) || pNew(today());
    const p = Math.round(pct(d));
    const s = sessions(), j = journal(), c = campaign();
    const sessLine = s.noTrade ? `<span class="pill muted">${s.noTrade}</span>` : s.active ? `<span class="pill gold"><i class="dot"></i>${s.active.name} sesija aktivna</span>` : s.next ? `<span class="pill muted">${s.next.name} za ${dur(s.next.from - belgrade().min)}</span>` : '<span class="pill muted">Sesije završene</span>';
    const dateStr = new Date().toLocaleDateString('sr-Latn-RS', {weekday: 'long', day: 'numeric', month: 'long'});
    return `${top()}
    <div><div class="date">${dateStr}</div><h1>${hi}, ${esc(gc.name)}.</h1></div>

    ${stepCard()}

    <section class="card inv" aria-label="Standard dana">
      <div class="row"><span class="eyebrow">STANDARD DANA</span><b>${d.tasks.length ? `${doneN(d)} / ${d.tasks.length}` : 'Bez zadataka'}</b></div>
      <p class="quote">${STANDARDS[dayOfYear() % STANDARDS.length]}</p>
      <div class="track" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="Završeno danas"><i style="width:${p}%"></i></div>
      <a class="link" href="#disciplina">${d.tasks.length ? 'Otvori zadatke' : 'Dodaj zadatke za danas'}</a>
    </section>

    <section class="card" aria-label="Trading danas">
      <div class="row"><span class="eyebrow">TRADING · XAU/USD</span>${sessLine}</div>
      <div class="stats">
        <div class="stat"><span>Sesija</span><b>${s.active ? s.active.range : s.next ? s.next.range : '–'}</b></div>
        <div class="stat"><span>Trejdovi</span><b>${j ? `${j.todayCount} / ${j.maxTrades}` : '–'}</b></div>
        <div class="stat"><span>Rizik</span><b>${j ? `${nf(j.todayRisk, 1)}% / ${nf(j.maxLoss)}%` : '–'}</b></div>
      </div>
      ${j ? '' : '<p class="empty">Dnevnik nema podataka na ovom uređaju.</p>'}
      <a class="link" href="#trading">Kalkulator i dnevnik</a>
    </section>

    ${c ? (() => { return `<a class="card hi offer-card" href="#masterclass" aria-label="Golden Masterclass, pogledaj ponudu">
      <div class="row"><span class="eyebrow">MASTERCLASS KAMPANJA</span><span style="font-size:13px">${c.over ? 'Poslednji dani' : `Dan ${c.day} / ${CAMPAIGN.days}`}</span></div>
      <div class="row" style="align-items:flex-end"><span><span class="serif" style="font-size:22px;display:block">Golden Masterclass</span><span class="muted" style="font-size:13px">Prvih 10: 150 € · zatim 250 € do 30.12.</span></span>
        <span class="big gold" style="font-size:28px;white-space:nowrap">od 150 €</span></div>
      <div class="track"><i style="width:${c.day / CAMPAIGN.days * 100}%"></i></div>
      <span class="row"><span class="link">Pogledaj šta dobijaš</span>${CHEV}</span>
    </a>`; })() : ''}

    <div class="tiles">
      <a class="tile" href="#disciplina"><b>Disciplina</b><span>Zadaci, pregled dana, niz</span></a>
      <a class="tile" href="#trading"><b>Trading</b><span>Rizik, sesije, dnevnik</span></a>
      <a class="tile" href="#biznis"><b>Biznis</b><span>Proizvodi i ponude</span></a>
      <a class="tile" href="#krug"><b>Krug</b><span>Brend, akademija, igra</span></a>
    </div>`;
  },

  disciplina() {
    const k = today();
    const d = pDay(k) || pNew(k);
    const w = week();
    return `${top('PROCESS')}
    <div><h1>Disciplina</h1><p class="sub">Izvršenje pre planiranja.</p></div>
    <div class="stats">
      <div class="card" style="padding:14px;gap:2px"><span class="muted" style="font-size:11px">Danas</span><b style="font-size:20px">${doneN(d)} / ${d.tasks.length}</b></div>
      <div class="card" style="padding:14px;gap:2px"><span class="muted" style="font-size:11px">Niz</span><b class="gold" style="font-size:20px">${streak()} ${streak() === 1 ? 'dan' : 'dana'}</b></div>
      <div class="card" style="padding:14px;gap:2px"><span class="muted" style="font-size:11px">Nedelja</span><b style="font-size:20px">${w == null ? '–' : w + '%'}</b></div>
    </div>
    ${stepCard()}
    <section style="display:flex;flex-direction:column;gap:10px" aria-label="Zadaci za danas">
      <span class="eyebrow">ZADACI ZA DANAS</span>
      ${taskList(d)}
      <form class="add" data-f="add">
        <label class="sr" for="nt" style="position:absolute;left:-9999px">Novi zadatak</label>
        <input class="field" id="nt" maxlength="120" placeholder="Novi zadatak" autocomplete="off">
        <button class="btn" type="submit" aria-label="Dodaj zadatak">Dodaj</button>
      </form>
    </section>
    <section class="card inv" aria-label="Večernji pregled">
      ${d.reviewDone ? `<div class="row"><span class="eyebrow">DAN ZAVRŠEN</span><button class="link" data-a="review-edit" style="border:0">Izmeni</button></div>
      <p class="quote">${doneN(d)} od ${d.tasks.length} ${d.tasks.length === 1 ? 'zadatka' : 'zadataka'} · ${rv(d)} od 5 odgovora</p>
      ${Q.filter(([id]) => String(d.review[id]).trim()).map(([id, q]) => `<div style="display:flex;flex-direction:column;gap:4px"><span class="muted" style="font-size:12px">${q}</span><span style="white-space:pre-line">${esc(d.review[id])}</span></div>`).join('')}
      ${String(d.review.next).trim() ? '<span class="muted" style="font-size:12px">Sutra te korak čeka na Početnoj.</span>' : ''}`
      : `<span class="eyebrow">VEČERNJI PREGLED</span>
      ${Q.map(([id, q]) => `<label class="q">${q}<textarea class="field" data-r="${id}" rows="2" maxlength="1000">${esc(d.review[id])}</textarea></label>`).join('')}
      <button class="btn" data-a="review-done">Završi dan</button>
      <span class="muted" style="font-size:12px">Odgovori se čuvaju dok kucaš. Korak za sutra ti se sutra prikazuje na Početnoj.</span>`}
    </section>
    <a class="btn ghost" href="${LINKS.process}">Otvori ceo Process</a>`;
  },

  trading() {
    const s = sessions(), j = journal();
    const bal = gc.calc.balance ?? (j && j.balance > 0 ? Math.round(j.balance * 100) / 100 : '');
    const risk = gc.calc.risk ?? 1, sl = gc.calc.sl ?? 200;
    return `${top('XAU / USD')}
    <h1>Trading</h1>
    ${s.noTrade ? `<p class="warn">${s.noTrade}</p>` : ''}
    <div class="sessions">${s.list.map(x => `<div class="sess ${x.on ? 'on' : ''}"><span>${x.name}</span><b>${x.range}</b><small>${x.state}</small></div>`).join('')}</div>

    <section class="card" aria-label="Kalkulator rizika">
      <span class="eyebrow">KALKULATOR RIZIKA</span>
      <div class="inputs">
        <label>Balans ($)<input class="field" id="c-bal" inputmode="decimal" value="${esc(bal)}" placeholder="10000"></label>
        <label>Rizik (%)<input class="field" id="c-risk" inputmode="decimal" value="${esc(risk)}"></label>
        <label>SL (pipa)<input class="field" id="c-sl" inputmode="decimal" value="${esc(sl)}"></label>
      </div>
      <div id="c-out"></div>
      ${j && j.balance > 0 && gc.calc.balance == null ? '<span class="muted" style="font-size:12px">Balans je preuzet iz dnevnika.</span>' : ''}
    </section>

    <section class="card" aria-label="Dnevnik">
      <div class="row"><span class="eyebrow">DNEVNIK</span><a class="link" href="#dnevnik">Ceo dnevnik</a></div>
      ${j ? `<div class="stats">
          <div class="stat"><span>Danas</span><b>${j.todayCount} / ${j.maxTrades}</b></div>
          <div class="stat"><span>Rizik danas</span><b>${nf(j.todayRisk, 1)}%</b></div>
          <div class="stat"><span>P/L danas</span><b>${j.todayPnl >= 0 ? '+' : '−'}${nf(Math.abs(j.todayPnl), 2)} $</b></div>
        </div>
        ${j.last.length ? j.last.map(t => `<div class="row" style="font-size:13px"><span>${esc(t.date.slice(0, 10).split('-').reverse().join('.'))} · ${esc(t.direction || '')}</span><b class="${t.result === 'Win' ? 'gold' : ''}">${esc(t.result || '')}</b></div>`).join('') : '<p class="empty">Nema unosa.</p>'}`
        : '<p class="empty">Dnevnik nema podataka na ovom uređaju. Unosi se pojavljuju ovde kad aplikacija i dnevnik rade na istoj adresi.</p>'}
      <a class="btn ghost" href="#dnevnik">Novi unos</a>
    </section>
    <p class="muted" style="font-size:12px;margin:0">Alati su edukativni i nisu finansijski savet. Proveri vrednosti kod brokera pre ulaska.</p>`;
  },

  biznis() {
    return `${top('BIZNIS')}
    <div><h1>Biznis</h1><p class="sub">Proizvodi The Golden Circle.</p></div>
    <section class="list" aria-label="Proizvodi">
      <span class="eyebrow">PROIZVODI</span>
      <a class="item" href="#masterclass"><span class="t"><b>Golden Masterclass</b><small>Prvih 10: 150 € · do 30.12.: 250 €</small></span><span class="p">250 €</span></a>
      <a class="item" href="${LINKS.clarity}"><span class="t"><b>Golden Clarity</b><small>PDF za kreatore · Gumroad</small></span><span class="p">19,99 €</span></a>
      <a class="item" href="${LINKS.starter}"><span class="t"><b>Golden Starter Kit</b><small>Forex za početnike · Gumroad</small></span><span class="p">Besplatno</span></a>
    </section>`;
  },

  krug() {
    const pillars = ['MINDSET', 'DISCIPLINE', 'SKILLS', 'CREATION', 'FREEDOM'];
    return `<header class="top"><span></span><a class="round" href="#meni" aria-label="Otvori meni"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></a></header>
    <div class="hero"><img src="crown.png" alt="The Golden Circle kruna"><h1>Build the person.<br>Build the life.</h1></div>
    <section class="card" aria-label="Put">
      <span class="eyebrow">PUT</span>
      <div class="path">${pillars.map((p, i) => `<div><i>${i + 1}</i><span>${p}</span></div>`).join('')}</div>
    </section>
    <section class="list" aria-label="Ekosistem">
      <div class="item dashed"><span class="t"><b class="serif" style="font-size:17px">THE CODE</b><small>Set the standard. Live by the code.</small></span><span class="tag">USKORO</span></div>
      <div class="item dashed"><span class="t"><b class="serif" style="font-size:17px">Akademija</b><small>Analize uživo, strategija, članstvo</small></span><span class="tag">USKORO</span></div>
      <a class="item" href="${LINKS.snake}"><span class="t"><b class="serif" style="font-size:17px">Snake</b><small>Igraj</small></span>${CHEV}</a>
    </section>
    <div class="tiles">
      <a class="tile" href="${LINKS.instagram}"><span>Instagram</span><b style="font:500 14px Inter">@onegoldenboyy</b></a>
      <a class="tile" href="${LINKS.card}"><span>Kontakt</span><b style="font:500 14px Inter">Digitalna kartica</b></a>
    </div>`;
  },

  masterclass() {
    const c = campaign(), open = offerOpen();
    return `<header class="top"><a class="round" href="#${esc(lastTab)}" aria-label="Nazad"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></a>
      <span class="eyebrow">MASTERCLASS</span><img src="crown.png" alt="The Golden Circle kruna"></header>
    <div><h1>Golden Masterclass</h1><p class="sub">Forex edukacija i mentorstvo · The Golden Circle</p></div>
    ${c ? `<section class="card" aria-label="Trajanje kampanje">
      <div class="row"><span class="eyebrow">KAMPANJA</span><span style="font-size:13px">${c.over ? 'Završena 18.12.' : `Dan ${c.day} od ${CAMPAIGN.days}`}</span></div>
      <div class="track"><i style="width:${c.day / CAMPAIGN.days * 100}%"></i></div>
      <span class="muted" style="font-size:12px">Kampanja traje od 19.11. do 18.12. Ponuda važi do 30.12.</span>
    </section>` : '<p class="warn">Ponuda je završena.</p>'}
    ${OFFERS.map(x => {
      return `<section class="card ${x.id === 'beta' ? 'hi' : ''}" aria-label="${x.name}" style="${open ? '' : 'opacity:.55'}">
        <div class="row"><span class="eyebrow">${x.name.toUpperCase()}</span><span class="tag">${x.tag}</span></div>
        <div class="row" style="align-items:baseline;justify-content:flex-start;gap:12px"><span class="big gold">${x.price}</span>${x.old ? `<s class="muted">${x.old}</s>` : ''}</div>
        <span class="muted" style="font-size:13px">${x.when}</span>
        <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">${x.inc.map(i => `<li>${i}</li>`).join('')}</ul>
        ${x.code ? `<div class="row" style="border-top:1px solid var(--line);padding-top:12px"><span class="muted" style="font-size:13px">Kod se primenjuje sam</span><b class="gold" style="letter-spacing:.08em">${x.code}</b></div>` : ''}
        ${open ? `<a class="btn ${x.id === 'beta' ? '' : 'ghost'}" href="${x.url}">${x.cta}</a>` : ''}
      </section>`;
    }).join('')}
    ${open ? `<a class="link" style="align-self:center" href="${DM}">Pitanja? Piši na Instagramu</a>` : ''}
    <p class="muted" style="font-size:12px;margin:0">Edukativni sadržaj, nije finansijski savet. Trgovanje nosi rizik gubitka uloženog kapitala.</p>`;
  },

  dnevnik() {
    return `<div class="embed-top"><a class="round" href="#trading" aria-label="Nazad na Trading"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></a>
      <span class="eyebrow">TRADING JOURNAL</span><img src="crown.png" alt="The Golden Circle kruna" style="width:30px;height:30px;object-fit:contain"></div>
    <iframe class="embed" src="${LINKS.journal}" title="Golden Trading Journal" loading="eager"></iframe>`;
  },

  prijava() {
    return `<div class="hero" style="padding-top:12vh">
      <img src="crown.png" alt="The Golden Circle kruna" style="width:88px;height:88px">
      <span class="eyebrow gold">THE GOLDEN CIRCLE</span>
      <h1>Dobro došli.</h1>
      <p class="sub" style="max-width:300px">Build the person. Build the life.</p>
    </div>
    <form class="card" data-f="login" style="margin-top:8px">
      <label for="name" style="display:flex;flex-direction:column;gap:8px;font-weight:500">Kako se zoveš?
        <input class="field" id="name" maxlength="40" autocomplete="given-name" autocapitalize="words" placeholder="Tvoje ime" required>
      </label>
      <button class="btn" type="submit">Uđi</button>
    </form>
    <p class="muted" style="font-size:12px;text-align:center;margin:0">Ime i svi podaci ostaju samo na ovom uređaju.<br><a href="legal.html#privatnost">Politika privatnosti</a> · <a href="legal.html#uslovi">Uslovi korišćenja</a></p>`;
  },

  meni() {
    const dark = gc.theme !== 'light';
    return `<header class="top"><img src="crown.png" alt="The Golden Circle kruna"><span class="eyebrow">MENI</span>
      <a class="round" href="#${esc(lastTab)}" aria-label="Zatvori meni"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a></header>
    <h1>Podešavanja</h1>
    <section style="display:flex;flex-direction:column;gap:10px" aria-label="Profil">
      <span class="eyebrow">PROFIL</span>
      <form class="card" data-f="rename">
        <label for="rn" style="display:flex;flex-direction:column;gap:8px;font-weight:500">Ime
          <input class="field" id="rn" maxlength="40" autocomplete="given-name" value="${esc(gc.name)}" required>
        </label>
        <button class="btn ghost" type="submit">Sačuvaj ime</button>
      </form>
    </section>
    <section style="display:flex;flex-direction:column;gap:10px" aria-label="Izgled">
      <span class="eyebrow">IZGLED</span>
      <div class="card"><b style="font-weight:500">Režim prikaza</b>
        <div class="seg" role="group" aria-label="Režim prikaza">
          <button data-a="theme" data-v="dark" aria-pressed="${dark}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>Tamni</button>
          <button data-a="theme" data-v="light" aria-pressed="${!dark}"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>Svetli</button>
        </div>
      </div>
    </section>
    <section style="display:flex;flex-direction:column;gap:10px" aria-label="Pravno">
      <span class="eyebrow">PRAVNO</span>
      <div class="menu">
        <a href="legal.html#privatnost">Politika privatnosti${CHEV}</a>
        <a href="legal.html#uslovi">Uslovi korišćenja${CHEV}</a>
      </div>
    </section>
    <div class="foot"><span class="gold" style="letter-spacing:.2em;font-weight:600">THE GOLDEN CIRCLE</span><span>Verzija 0.1</span></div>`;
  }
};

/* ---------- ruter ---------- */
const TABS = ['pocetna', 'disciplina', 'trading', 'biznis', 'krug'];
let current = 'pocetna', lastTab = 'pocetna', wanted = '';
const render = (keepScroll) => {
  const y = window.scrollY;
  view.innerHTML = screens[current]();
  document.body.classList.toggle('menu-open', current === 'meni' || current === 'prijava');
  document.body.classList.toggle('embed-open', current === 'dnevnik');
  document.documentElement.classList.toggle('nobar', ['meni', 'prijava', 'dnevnik'].includes(current));
  const act = current === 'dnevnik' ? 'trading' : current === 'masterclass' ? 'biznis' : current;
  document.querySelectorAll('.tabbar a').forEach(a => a.dataset.tab === act ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  if (current === 'trading') updateCalc();
  if (keepScroll) window.scrollTo(0, y);
};
const route = () => {
  const h = location.hash.slice(1);
  current = ['meni', 'masterclass', 'dnevnik'].includes(h) || TABS.includes(h) ? h : 'pocetna';
  if (!gc.name) { if (current !== 'pocetna') wanted = current; current = 'prijava'; }
  if (TABS.includes(current)) lastTab = current;
  render();
  window.scrollTo(0, 0);
};

/* ---------- akcije ---------- */
let tt;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); };
const mutateToday = fn => { const k = today(); const d = pDay(k) || pNew(k); fn(d); pSave(k, d); };
const applyTheme = () => { document.documentElement.dataset.theme = gc.theme === 'light' ? 'light' : 'dark'; document.querySelector('meta[name=theme-color]').content = gc.theme === 'light' ? '#F7F3EA' : '#111111'; };

const num = id => { const v = String($(id)?.value ?? '').replace(/\s/g, '').replace(',', '.'); return v === '' ? NaN : Number(v); };
function updateCalc() {
  const out = $('#c-out'); if (!out) return;
  const r = calc(num('#c-bal'), num('#c-risk'), num('#c-sl'));
  if (!r) { out.innerHTML = '<p class="empty">Unesi balans, rizik i stop loss.</p>'; return; }
  if (r.lots < 0.01) { out.innerHTML = `<p class="warn">Rizik od ${nf(r.target, 2)} $ je manji od minimalne pozicije 0.01 lot za ovaj SL.</p>`; return; }
  out.innerHTML = `<div class="result">
    <div><span class="muted" style="font-size:11px">Veličina pozicije</span><div class="big gold">${r.lots.toFixed(2)} lot</div></div>
    <div class="r"><span>Rizik <b>${nf(r.risk, 2)} $</b></span><span>TP 1:3 <b>${nf(r.tp, 2)} $</b></span><span class="muted">1 pip = 0,10 $</span></div>
  </div>`;
}

view.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'review-done') {
    clearTimeout(rt);
    mutateToday(d => { view.querySelectorAll('textarea[data-r]').forEach(t => { d.review[t.dataset.r] = t.value; }); d.reviewDone = true; });
    render(true); toast('Dan je završen');
  } else if (a === 'review-edit') {
    mutateToday(d => { d.reviewDone = false; }); render(true);
  } else if (a === 'step-add') {
    const s = stepFromYesterday(); if (!s) return;
    mutateToday(d => d.tasks.unshift({id: Date.now(), name: s.slice(0, 120), cat: '', prio: 2, status: 'todo', dur: '', note: ''}));
    render(true); toast('Korak je dodat kao zadatak');
  } else if (a === 'step-dismiss') {
    gc.stepDismissed = addDays(today(), -1); saveGc(); render(true);
  } else if (a === 'del') {
    const i = +b.dataset.i;
    mutateToday(d => { d.tasks.splice(i, 1); });
    render(true); toast('Zadatak obrisan');
  } else if (a === 'toggle') {
    const i = +b.dataset.i;
    mutateToday(d => { const t = d.tasks[i]; if (t) t.status = t.status === 'done' ? 'todo' : 'done'; });
    render(true);
  } else if (a === 'theme') {
    gc.theme = b.dataset.v === 'light' ? 'light' : 'dark'; saveGc(); applyTheme(); render(true);
  }
});
view.addEventListener('submit', e => {
  const f = e.target.dataset.f;
  if (f === 'login' || f === 'rename') {
    e.preventDefault();
    const n = cleanName($(f === 'login' ? '#name' : '#rn').value);
    if (!n) return;
    gc.name = n; saveGc();
    if (f === 'login') { const to = wanted || 'pocetna'; wanted = ''; location.hash = to; route(); } else { toast('Ime je sačuvano'); }
    return;
  }
  if (f !== 'add') return;
  e.preventDefault();
  const n = $('#nt').value.trim(); if (!n) return;
  mutateToday(d => d.tasks.push({id: Date.now(), name: n.slice(0, 120), cat: '', prio: 2, status: 'todo', dur: '', note: ''}));
  render(true); $('#nt')?.focus(); toast('Zadatak dodat');
});
let rt;
view.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.r) {
    clearTimeout(rt);
    const id = t.dataset.r, v = t.value;
    rt = setTimeout(() => mutateToday(d => { d.review[id] = v; }), 400);
  } else if (t.id && t.id.startsWith('c-')) {
    const map = {'c-bal': 'balance', 'c-risk': 'risk', 'c-sl': 'sl'};
    const v = num('#' + t.id);
    gc.calc[map[t.id]] = Number.isFinite(v) ? v : undefined;
    if (map[t.id] === 'balance' && t.value.trim() === '') delete gc.calc.balance;
    saveGc(); updateCalc();
  }
});

/* osvežavanje: tajmeri sesija i promene iz drugih alata */
const idle = () => !view.contains(document.activeElement) || document.activeElement === view;
setInterval(() => { if ((current === 'pocetna' || current === 'trading') && idle()) render(true); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && idle()) render(true); });
window.addEventListener('storage', e => { if (e.key && (e.key.startsWith('process:') || e.key === 'gtj:v2') && idle()) render(true); });
window.addEventListener('hashchange', route);

applyTheme();
route();
}
