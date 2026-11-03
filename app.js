/* ---------- Grundlagen ---------- */
const KAT = [['Öl & Filter','#c08a00'],['Filter','#1c8fd6'],['Bremsen','#d6336c'],['Zündung','#2f9e44'],['Riemen','#7950f2'],['Getriebe','#e8590c'],['Klimaanlage','#15aabf'],['Fahrwerk','#ae3ec9'],['Elektrik','#66a80f'],['Karosserie','#868e96'],['TÜV','#5c6670'],['Sonstiges','#9aa1a8']];
const KAT_COLOR = Object.fromEntries(KAT);
const KAT_WORDS = [['getriebe','Getriebe'],['öl','Öl & Filter'],['filter','Filter'],['brems','Bremsen'],['zünd','Zündung'],['riemen','Riemen'],['kette','Riemen'],['klima','Klimaanlage'],['koppel','Fahrwerk'],['dämpfer','Fahrwerk'],['feder','Fahrwerk'],['querlenker','Fahrwerk'],['spurstange','Fahrwerk'],['batterie','Elektrik'],['lampe','Elektrik'],['birne','Elektrik'],['rost','Karosserie'],['lack','Karosserie'],['tüv','TÜV'],['hauptunters','TÜV']];
// Welche Wörter in einer Arbeit welchen Wartungspunkt zurücksetzen
const ITEM_WORDS = [[['ölwechsel','motoröl','ölfilter'],'ölwechsel'],[['getriebeöl','getriebe'],'getriebe'],[['bremsflüssigkeit'],'bremsflüssigkeit'],[['zündkerze'],'zündkerze'],[['luftfilter'],'luftfilter'],[['pollenfilter','innenraumfilter'],'pollenfilter'],[['benzinfilter','kraftstofffilter'],'benzinfilter'],[['zahnriemen'],'zahnriemen'],[['keilrippenriemen','keilriemen'],'keilrippenriemen'],[['steuerkette'],'steuerkette'],[['tüv','hauptuntersuchung'],'tüv']];
const SWATCHES = ['#003087','#1a5276','#cc0000','#7a1f2b','#2f6b3a','#c2701c','#5a4a8a','#3d4650','#b8a67a'];
const DAY = 864e5;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const num = v => { if (v === null || v === undefined || v === '') return null; const s = String(v).replace(/[.\s]/g, ''); return Number.isFinite(+s) ? +s : null; };
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isMonth = s => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s);
const fk = n => Math.round(n).toLocaleString('de-DE');
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const fd = s => s ? pd(s).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric'}) : '';
const fm = d => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const clamp = x => Math.max(0, Math.min(1, x));
const mem = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
function dur(days) {
  if (days < 45) return days === 1 ? '1 Tag' : `${days} Tage`;
  const m = Math.round(days / 30.44);
  return m < 24 ? `${m} Mon.` : `${(Math.round(m / 6) / 2).toLocaleString('de-DE')} Jahre`;
}
function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16), L = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
  return L > 0.62 ? '#15191e' : '#ffffff';
}
function ago(ts) {
  if (!ts) return '';
  const m = Math.round((Date.now() - ts) / 60e3);
  if (m < 1) return 'gerade eben'; if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60); if (h < 24) return `vor ${h} Std.`;
  return new Date(ts).toLocaleDateString('de-DE');
}

/* ---------- Datenform ---------- */
function normItem(it) {
  const kind = it.kind || (it.tuev || it.due ? 'due' : 'interval');
  return {id: String(it.id || uid()), name: String(it.name || ''), kind,
    km_int: num(it.km_int), time_yr: typeof it.time_yr === 'number' ? it.time_yr : num(it.time_yr), last_km: num(it.last_km),
    last_date: isDate(it.last_date) ? it.last_date : null, due: isMonth(it.due) ? it.due : null, months: num(it.months) || 24};
}
function normCar(c, i) {
  let notes = String(c.notes || '');
  if (Array.isArray(c.alerts) && c.alerts.length) notes = c.alerts.join('\n') + (notes ? '\n' + notes : '');
  return {
    id: String(c.id || uid()), order: Number.isFinite(c.order) ? c.order : (i || 0),
    name: String(c.name || 'Fahrzeug'), sub: String(c.sub || ''),
    color: /^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : '#3d4650',
    km: num(c.km) || null, notes,
    items: (c.items || []).map(normItem),
    tech: (c.tech || []).map(s => ({s: String(s.s || ''), rows: (s.rows || []).map(r => ({l: String(r.l || ''), v: String(r.v || '')}))})),
    log: (c.log || []).map(e => ({id: String(e.id || uid()), date: isDate(e.date) ? e.date : iso(today()), km: num(e.km),
      work: String(e.work || ''), kat: String(e.kat || 'Sonstiges'), note: String(e.note || '')})),
    logDel: c.logDel && typeof c.logDel === 'object' ? c.logDel : {},
    updated: c.updated || 0
  };
}
function normData(d) {
  const list = Array.isArray(d) ? d : (d && d.cars) || [];
  return {version: 3, cars: list.map(normCar), deleted: (d && d.deleted) || {}};
}
function newCar() {
  const blank = l => ({l, v: ''});
  return normCar({id: uid(), order: Math.max(-1, ...data.cars.map(c => c.order)) + 1, name: '', color: SWATCHES[data.cars.length % SWATCHES.length],
    items: [
      {name: 'Ölwechsel', km_int: 15000, time_yr: 1}, {name: 'Bremsflüssigkeit', time_yr: 2},
      {name: 'Luftfilter', km_int: 30000, time_yr: 2}, {name: 'Zündkerzen', km_int: 30000, time_yr: 4},
      {name: 'TÜV / HU', kind: 'due'}
    ],
    tech: [{s: 'Fahrzeug', rows: ['FIN / VIN', 'HSN / TSN', 'Erstzulassung', 'Motorcode', 'Reifengröße'].map(blank)},
           {s: 'Motoröl', rows: ['Ölsorte', 'Ölmenge'].map(blank)}]});
}

/* ---------- Wartungsstatus ---------- */
function status(it, carKm) {
  const r = {state: 'ok', main: '', target: '', pct: null, left: Infinity};
  if (it.kind === 'due') {
    if (!it.due) { r.state = 'unknown'; r.main = 'Termin fehlt'; return r; }
    const [y, m] = it.due.split('-').map(Number), end = new Date(y, m, 0);
    const days = Math.round((end - today()) / DAY);
    r.target = `fällig ${String(m).padStart(2, '0')}/${y}`;
    r.state = days < 0 ? 'bad' : days <= 60 ? 'warn' : 'ok';
    r.main = days < 0 ? `${dur(-days)} überfällig` : `noch ${dur(days)}`;
    r.pct = clamp(1 - days / ((it.months || 24) * 30.44)); r.left = days;
    return r;
  }
  if (!it.km_int && !it.time_yr) {
    r.state = 'watch';
    r.main = it.last_date ? `zuletzt ${fd(it.last_date)}` : 'ohne Intervall';
    if (it.last_km != null) r.target = `bei ${fk(it.last_km)} km`;
    return r;
  }
  if (it.last_km == null && !it.last_date) { r.state = 'unknown'; r.main = 'noch nie eingetragen'; return r; }
  const parts = [], tg = [], fr = [];
  let kmLeft = null, days = null;
  if (it.km_int && it.last_km != null) {
    const at = it.last_km + it.km_int; tg.push(`${fk(at)} km`);
    if (carKm != null) { kmLeft = at - carKm; fr.push((carKm - it.last_km) / it.km_int); }
  }
  if (it.time_yr && it.last_date) {
    const dd = pd(it.last_date); dd.setMonth(dd.getMonth() + Math.round(it.time_yr * 12));
    tg.push(fm(dd)); days = Math.round((dd - today()) / DAY); fr.push(1 - days / (it.time_yr * 365.25));
  }
  if (kmLeft != null) parts.push(kmLeft > 0 ? `noch ${fk(kmLeft)} km` : `${fk(-kmLeft)} km drüber`);
  if (days != null) parts.push(days > 0 ? `noch ${dur(days)}` : `${dur(-days)} drüber`);
  const bad = (kmLeft != null && kmLeft <= 0) || (days != null && days <= 0);
  const warn = (kmLeft != null && kmLeft <= 2000) || (days != null && days <= 90);
  r.state = bad ? 'bad' : warn ? 'warn' : 'ok';
  r.main = parts.length ? parts.join(' · ') : (it.km_int && carKm == null ? 'km-Stand fehlt' : 'Angaben fehlen');
  if (!parts.length) r.state = 'unknown';
  if (tg.length) r.target = `fällig bei ${tg.join(' oder ')}`;
  r.pct = fr.length ? clamp(Math.max(...fr)) : null;
  return r;
}
const RANK = {bad: 0, warn: 1, unknown: 2, ok: 3, watch: 4};
const PILL = {bad: 'Fällig', warn: 'Bald', unknown: 'Offen', ok: 'OK', watch: 'Beob.'};
const countBad = c => c.items.filter(it => status(it, c.km).state === 'bad').length;

/* ---------- Zustand ---------- */
let data = normData(Sync.load());
let cur = mem.get('mg.cur');
const ui = {tab: mem.get('mg.tab') || 'over', showOk: false, q: '', kat: null};
let syncState = 'idle';

const sortCars = () => data.cars.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
const car = () => data.cars.find(c => c.id === cur) || data.cars[0] || null;
function persist() { Sync.save(data); if (syncState === 'tap') Sync.connect(); }
function commit(c, opts = {}) { c.updated = Date.now(); persist(); if (opts.render !== false) render(); }
function removeCar(id) {
  data.cars = data.cars.filter(c => c.id !== id);
  data.deleted[id] = Date.now();
  if (cur === id) cur = data.cars[0]?.id || null;
  persist(); render();
}

const SYNC_TEXT = {
  idle: ['Lädt …', ''], local: ['Nur auf diesem Gerät', 'warn'], unlinked: ['Mit Drive verbinden', 'cta'],
  tap: ['Drive: antippen', 'cta'], pending: ['Wird gesichert …', ''], syncing: ['Gleicht ab …', ''],
  ok: ['Gesichert', 'ok'], offline: ['Offline · wird nachgeholt', 'warn'], error: ['Abgleich fehlgeschlagen', 'bad']
};
function showSync(s) {
  syncState = s;
  const [t, cls] = SYNC_TEXT[s] || SYNC_TEXT.ok, el = $('#sync');
  el.textContent = t; el.className = 'sync ' + cls;
  el.title = s === 'ok' && Sync.lastSync ? `Zuletzt abgeglichen ${ago(Sync.lastSync)}` : '';
}

/* ---------- Anzeige ---------- */
let renderPending = false;
function render() {
  if (document.activeElement && document.activeElement.id === 'notes') { renderPending = true; return; }
  sortCars();
  const c = car();
  if (c) { cur = c.id; mem.set('mg.cur', cur); }
  $('#cars').innerHTML = data.cars.map(x => {
    const n = countBad(x);
    return `<button class="chip" type="button" data-act="car" data-id="${esc(x.id)}" aria-pressed="${x.id === cur}">
      <span class="sw" style="background:${x.color}"></span>${esc(x.name)}${n ? `<span class="cnt" title="${n} fällig">${n}</span>` : ''}</button>`;
  }).join('');
  $('#dock').hidden = !c;
  if (!c) { $('#main').innerHTML = blankView(); return; }
  const tabs = [['over', 'Übersicht', ''], ['log', 'Verlauf', c.log.length], ['tech', 'Datenblatt', '']];
  $('#main').innerHTML = headView(c) +
    `<div class="tabs" role="tablist">${tabs.map(([k, t, n]) => `<button class="tab" type="button" role="tab" data-act="tab" data-tab="${k}" aria-selected="${ui.tab === k}">${t}${n !== '' ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div>` +
    (ui.tab === 'log' ? logView(c) : ui.tab === 'tech' ? techView(c) : maintView(c) + notesView(c));
}
function blankView() {
  return `<div class="blank"><h2>Noch kein Fahrzeug</h2>
    <p>Leg dein erstes Auto an oder spiel ein Backup ein. Wenn du Google Drive verbindest, kommen Fahrzeuge von deinen anderen Geräten von selbst.</p>
    <div class="row"><button class="primary inline" data-act="new-car" type="button">Fahrzeug anlegen</button>
    <button class="secondary" data-act="import" type="button">Backup einspielen</button></div></div>`;
}
function headView(c) {
  const digits = c.km != null ? String(Math.round(c.km)).padStart(6, '0').split('') : '––––––'.split('');
  const st = c.items.map(it => status(it, c.km).state);
  const nb = st.filter(s => s === 'bad').length, nw = st.filter(s => s === 'warn').length;
  const tally = [nb && `<span class="t-bad">${nb} fällig</span>`, nw && `<span>${nw} bald</span>`, !nb && !nw && `<span>Alles im Plan</span>`].filter(Boolean).join('');
  return `<section class="head" style="--car:${c.color};--car-ink:${inkOn(c.color)}">
    <div><div class="head-name">${esc(c.name)}</div>${c.sub ? `<div class="head-sub">${esc(c.sub)}</div>` : ''}</div>
    <button class="head-edit" type="button" data-act="edit-car">Bearbeiten</button>
    <div class="odo">
      <button class="odo-btn" type="button" data-act="km" aria-label="Kilometerstand ändern">
        <span class="odo-digits">${digits.map(d => `<span>${d}</span>`).join('')}</span>
        <span><span class="odo-unit">KM</span><span class="odo-hint">${c.km != null ? 'antippen zum Ändern' : 'km-Stand eintragen'}</span></span>
      </button>
      <div class="tally">${tally}</div>
    </div></section>`;
}
function mrow(it, s) {
  return `<button class="mrow s-${s.state}" type="button" data-act="item" data-id="${esc(it.id)}">
    <span class="pill">${PILL[s.state]}</span>
    <span class="mline"><span class="mname">${esc(it.name)}</span><span class="mmain num">${esc(s.main)}</span></span>
    <span class="mtarget num"><span>${esc(s.target)}</span>${s.pct != null ? `<span class="meter"><i style="width:${Math.round(s.pct * 100)}%"></i></span>` : ''}</span>
  </button>`;
}
function maintView(c) {
  const rows = c.items.map(it => ({it, s: status(it, c.km)}))
    .sort((a, b) => RANK[a.s.state] - RANK[b.s.state] || (b.s.pct ?? 0) - (a.s.pct ?? 0));
  const urgent = rows.filter(r => r.s.state === 'bad' || r.s.state === 'warn');
  const open = rows.filter(r => r.s.state === 'unknown');
  const fine = rows.filter(r => r.s.state === 'ok' || r.s.state === 'watch');
  let h = `<section class="block"><div class="block-h"><h2>Als Nächstes</h2><small>${c.items.length} Wartungspunkte</small></div>`;
  if (!c.items.length) return h + `<p class="empty">Noch keine Wartungspunkte. Über „Bearbeiten“ legst du Intervalle an.</p></section>`;
  if (urgent.length) h += urgent.map(r => mrow(r.it, r.s)).join('');
  else {
    const next = fine.filter(r => r.s.state === 'ok').sort((a, b) => (b.s.pct ?? 0) - (a.s.pct ?? 0))[0];
    h += `<div class="calm"><b>Nichts fällig.</b>${next ? `<span>Als Nächstes: ${esc(next.it.name)}, ${esc(next.s.main)}.</span>` : ''}</div>`;
  }
  if (open.length) h += `<div class="group-label">Noch ohne Angaben</div>` + open.map(r => mrow(r.it, r.s)).join('');
  if (fine.length) {
    h += `<button class="more" type="button" data-act="toggle-ok"><span>${fine.length} in Ordnung</span><span>${ui.showOk ? 'ausblenden ▴' : 'anzeigen ▾'}</span></button>`;
    if (ui.showOk) h += fine.map(r => mrow(r.it, r.s)).join('');
  }
  return h + `<p class="tip">Punkt antippen, um ihn als erledigt einzutragen.</p></section>`;
}
function notesView(c) {
  return `<section class="block"><div class="block-h"><h2>Notizen</h2><small>Teile, To-dos</small></div>
    <textarea class="notes" id="notes" placeholder="z. B. Bremsbeläge VA bestellen, Radlager hinten links prüfen">${esc(c.notes)}</textarea></section>`;
}
function logView(c) {
  const used = [...new Set(c.log.map(e => e.kat))];
  const kats = KAT.map(k => k[0]).filter(k => used.includes(k)).concat(used.filter(k => !KAT_COLOR[k]));
  if (!c.log.length) return `<section class="block"><div class="block-h"><h2>Verlauf</h2></div><p class="empty">Noch nichts eingetragen. Unten auf „Arbeit eintragen“ tippen.</p></section>`;
  return `<section class="block"><div class="filters">
      <input class="search" id="q" type="search" placeholder="Suchen, z. B. Bremse oder Mahle" value="${esc(ui.q)}" autocomplete="off" aria-label="Verlauf durchsuchen">
      ${kats.length > 1 ? `<div class="kats">${kats.map(k => `<button class="kat" type="button" data-act="kat" data-kat="${esc(k)}" aria-pressed="${ui.kat === k}"><span class="dot" style="background:${KAT_COLOR[k] || '#9aa1a8'}"></span>${esc(k)}</button>`).join('')}</div>` : ''}
    </div><div id="log-list">${logList(c)}</div></section>`;
}
function logList(c) {
  const q = ui.q.trim().toLowerCase();
  const hits = c.log.filter(e => (!ui.kat || e.kat === ui.kat) && (!q || (e.work + ' ' + e.note + ' ' + e.kat).toLowerCase().includes(q)))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.km ?? 0) - (a.km ?? 0));
  if (!hits.length) return `<p class="empty" style="padding-top:12px">Nichts gefunden.</p>`;
  let h = '', year = null, last = null;
  const visits = [];
  for (const e of hits) {
    if (last && last.date === e.date && last.km === e.km) last.list.push(e);
    else { last = {date: e.date, km: e.km, list: [e]}; visits.push(last); }
  }
  for (const v of visits) {
    const y = v.date.slice(0, 4);
    if (y !== year) { h += `<div class="year">${y}</div>`; year = y; }
    h += `<div class="visit"><div class="visit-d num">${fd(v.date).slice(0, 6)}<small>${v.km != null ? fk(v.km) + ' km' : 'km unbekannt'}</small></div>
      <ul>${v.list.map(e => `<li><button class="work" type="button" data-act="log" data-id="${esc(e.id)}">
        <span class="dot" style="background:${KAT_COLOR[e.kat] || '#9aa1a8'}" title="${esc(e.kat)}"></span>
        <span><span class="work-t">${esc(e.work)}</span>${e.note ? `<span class="work-n">${esc(e.note)}</span>` : ''}</span></button></li>`).join('')}</ul></div>`;
  }
  return h;
}
function techView(c) {
  let h = `<section class="block"><div class="block-h"><h2>Datenblatt</h2><button class="link" type="button" data-act="edit-car">Bearbeiten</button></div>`;
  if (!c.tech.length) return h + `<p class="empty">Noch keine technischen Daten.</p></section>`;
  return h + c.tech.map(s => `<div class="sheet-sec"><h3>${esc(s.s)}</h3><dl>${s.rows.map(r =>
    `<dt>${esc(r.l)}</dt><dd>${r.v ? `<button class="copy" type="button" data-act="copy" data-v="${esc(r.v)}" data-l="${esc(r.l)}">${esc(r.v)}</button>` : '<div class="missing">fehlt noch</div>'}</dd>`).join('')}</dl></div>`).join('') +
    `<p class="tip">Wert antippen, um ihn zu kopieren, etwa die FIN für eine Teilebestellung.</p></section>`;
}

/* ---------- Blätter (Formulare) ---------- */
const sheet = $('#sheet');
let sheetCtx = null;
function openSheet(html, ctx) {
  sheetCtx = ctx || {};
  sheet.innerHTML = `<div class="panel" role="dialog" aria-modal="true">${html}</div>`;
  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  const f = sheet.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 30);
}
function closeSheet() { sheet.hidden = true; sheet.innerHTML = ''; sheetCtx = null; document.body.style.overflow = ''; }
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
const head = (t, sub) => `<div class="panel-h"><div><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="x" type="button" data-act="close" aria-label="Schließen">×</button></div>`;

function arm(b, label) {
  if (b.classList.contains('armed')) return true;
  b.dataset.label = b.textContent; b.textContent = label || 'Wirklich?'; b.classList.add('armed');
  setTimeout(() => { if (b.isConnected) { b.classList.remove('armed'); b.textContent = b.dataset.label; } }, 3500);
  return false;
}
function toast(t) {
  const el = $('#toast'); el.textContent = t; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2400);
}

/* Arbeit eintragen */
function guessKat(w) { w = w.toLowerCase(); for (const [k, v] of KAT_WORDS) if (w.includes(k)) return v; return null; }
function guessItems(c, w) {
  w = w.toLowerCase(); const hit = new Set();
  for (const [words, key] of ITEM_WORDS) {
    if (!words.some(x => w.includes(x))) continue;
    if (key === 'ölwechsel' && w.includes('getriebe')) continue;
    c.items.filter(it => it.name.toLowerCase().includes(key)).forEach(it => hit.add(it.id));
  }
  c.items.forEach(it => { if (it.name.length > 3 && w.includes(it.name.toLowerCase())) hit.add(it.id); });
  return hit;
}
function entrySheet(entryId, itemId) {
  const c = car(); if (!c) return;
  const e = entryId ? c.log.find(x => x.id === entryId) : null;
  const it = itemId ? c.items.find(x => x.id === itemId) : null;
  const work = e ? e.work : it ? (it.kind === 'due' ? 'TÜV / HU bestanden' : it.name) : '';
  const pre = it ? new Set([it.id]) : new Set();
  const kat = e ? e.kat : (guessKat(work) || 'Sonstiges');
  const works = [...new Set(data.cars.flatMap(x => x.log.map(l => l.work)))].sort();
  openSheet(`${head(e ? 'Eintrag ändern' : 'Arbeit eintragen', esc(c.name))}
    <label class="f"><span>Was wurde gemacht?</span><input id="e-work" list="e-works" value="${esc(work)}" placeholder="z. B. Ölwechsel, Bremsbeläge VA" ${e || it ? '' : 'autofocus'} autocomplete="off"><span class="err" id="e-err" hidden>Bitte eintragen, was gemacht wurde.</span></label>
    <datalist id="e-works">${works.map(w => `<option value="${esc(w)}">`).join('')}</datalist>
    <div class="row2">
      <label class="f"><span>Datum</span><input id="e-date" type="date" value="${e ? e.date : iso(today())}"></label>
      <label class="f"><span>km-Stand</span><input id="e-km" class="num" inputmode="numeric" value="${e ? (e.km ?? '') : (c.km ?? '')}" placeholder="z. B. 171200"></label>
    </div>
    <label class="f"><span>Kategorie</span><select id="e-kat">${KAT.map(([k]) => `<option${k === kat ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
    ${c.items.length ? `<fieldset><legend>Zählt als erledigt für</legend><div class="toggles" id="e-items">${c.items.map(x =>
      `<label class="toggle"><input type="checkbox" id="e-it-${esc(x.id)}" value="${esc(x.id)}"${pre.has(x.id) ? ' checked' : ''}><span>${esc(x.name)}</span></label>`).join('')}</div>
      <p class="hint">Markierte Punkte starten mit diesem Datum und km-Stand neu.${c.items.some(x => x.kind === 'due') ? ' TÜV springt 2 Jahre weiter.' : ''}</p></fieldset>` : ''}
    <label class="f"><span>Notiz (optional)</span><textarea id="e-note" placeholder="z. B. Castrol 5W-30, 3,9 l, Mahle-Filter">${esc(e ? e.note : '')}</textarea></label>
    <div class="actions">${e ? `<button class="danger" type="button" data-act="e-del">Löschen</button><span class="spacer"></span>` : ''}
      <button class="secondary" type="button" data-act="close">Abbrechen</button>
      <button class="primary inline" type="button" data-act="e-save">Speichern</button></div>`, {kind: 'entry', entryId, touched: !!(e || it)});
  if (!e && !it) {
    $('#e-items')?.addEventListener('change', () => { sheetCtx.touched = true; });
    $('#e-work').addEventListener('input', ev => {
      const w = ev.target.value, k = guessKat(w);
      if (k) $('#e-kat').value = k;
      if (!sheetCtx.touched) { const hit = guessItems(c, w); c.items.forEach(x => { const cb = document.getElementById('e-it-' + x.id); if (cb) cb.checked = hit.has(x.id); }); }
    });
  }
}
function saveEntry() {
  const c = car(), work = $('#e-work').value.trim();
  if (!work) { $('#e-err').hidden = false; $('#e-work').focus(); return; }
  const date = isDate($('#e-date').value) ? $('#e-date').value : iso(today());
  const km = num($('#e-km').value);
  const entry = {date, km, work, kat: $('#e-kat').value, note: $('#e-note').value.trim()};
  if (sheetCtx.entryId) Object.assign(c.log.find(x => x.id === sheetCtx.entryId), entry);
  else c.log.push({id: uid(), ...entry});
  const done = [];
  sheet.querySelectorAll('#e-items input:checked').forEach(cb => {
    const it = c.items.find(x => x.id === cb.value); if (!it) return;
    if (it.kind === 'due') { const d = pd(date); d.setMonth(d.getMonth() + (it.months || 24)); it.due = iso(d).slice(0, 7); }
    else if (!it.last_date || date >= it.last_date) { it.last_date = date; if (km != null) it.last_km = km; }
    done.push(it.name);
  });
  if (km != null && km > (c.km || 0)) c.km = km;
  commit(c); closeSheet();
  toast(done.length ? `Eingetragen · ${done.join(', ')} neu gestartet` : 'Eingetragen');
}

/* km-Stand */
function kmSheet() {
  const c = car();
  openSheet(`${head('Kilometerstand', esc(c.name))}
    <label class="f"><span>Aktueller Tachostand</span><input id="k-km" class="big-km num" inputmode="numeric" value="${c.km ?? ''}" placeholder="0" autofocus></label>
    <p class="hint">${c.km != null ? `Bisher ${fk(c.km)} km.` : 'Wird für alle km-Intervalle gebraucht.'}</p>
    <div class="actions"><button class="secondary" type="button" data-act="close">Abbrechen</button><button class="primary inline" type="button" data-act="k-save">Speichern</button></div>`, {kind: 'km'});
  $('#k-km').addEventListener('keydown', e => { if (e.key === 'Enter') acts['k-save'](); });
}

/* Fahrzeug bearbeiten */
function carSheet(draft, isNew) {
  if (draft) sheetCtx = {kind: 'car', draft, isNew};
  const d = sheetCtx.draft;
  const scroll = sheet.querySelector('.panel')?.scrollTop || 0;
  const itemsHtml = d.items.map((it, i) => `<div class="ed">
      <div class="ed-top"><label class="f"><span>Bezeichnung</span><input id="ci-n-${i}" data-f="items.${i}.name" value="${esc(it.name)}" placeholder="z. B. Ölwechsel"></label>
        <label class="f" style="flex:0 0 132px"><span>Art</span><select id="ci-k-${i}" data-f="items.${i}.kind" data-rerender>
          <option value="interval"${it.kind === 'interval' ? ' selected' : ''}>Intervall</option><option value="due"${it.kind === 'due' ? ' selected' : ''}>Fester Termin</option></select></label>
        <button class="icon-del" type="button" data-act="c-del-item" data-i="${i}" aria-label="Punkt löschen">✕</button></div>
      ${it.kind === 'due'
        ? `<div class="row2"><label class="f"><span>Fällig im Monat</span><input id="ci-d-${i}" type="month" data-f="items.${i}.due" value="${it.due || ''}"></label>
           <label class="f"><span>Danach alle … Monate</span><input id="ci-m-${i}" class="num" inputmode="numeric" data-f="items.${i}.months" data-t="num" value="${it.months || 24}"></label></div>`
        : `<div class="row4">
          <label class="f"><span>alle … km</span><input id="ci-ki-${i}" class="num" inputmode="numeric" data-f="items.${i}.km_int" data-t="num" value="${it.km_int ?? ''}" placeholder="–"></label>
          <label class="f"><span>alle … Jahre</span><input id="ci-yi-${i}" class="num" inputmode="decimal" data-f="items.${i}.time_yr" data-t="yr" value="${it.time_yr ?? ''}" placeholder="–"></label>
          <label class="f"><span>zuletzt bei km</span><input id="ci-lk-${i}" class="num" inputmode="numeric" data-f="items.${i}.last_km" data-t="num" value="${it.last_km ?? ''}" placeholder="–"></label>
          <label class="f"><span>zuletzt am</span><input id="ci-ld-${i}" type="date" data-f="items.${i}.last_date" value="${it.last_date || ''}"></label></div>`}
    </div>`).join('');
  const techHtml = d.tech.map((s, i) => `<div class="ed">
      <div class="ed-top"><label class="f"><span>Abschnitt</span><input id="ct-s-${i}" data-f="tech.${i}.s" value="${esc(s.s)}" placeholder="z. B. Motoröl"></label>
        <button class="icon-del" type="button" data-act="c-del-sec" data-i="${i}" aria-label="Abschnitt löschen">✕</button></div>
      ${s.rows.map((r, j) => `<div class="trow"><input id="ct-l-${i}-${j}" data-f="tech.${i}.rows.${j}.l" value="${esc(r.l)}" placeholder="Bezeichnung" aria-label="Bezeichnung">
        <input id="ct-v-${i}-${j}" data-f="tech.${i}.rows.${j}.v" value="${esc(r.v)}" placeholder="Wert" aria-label="Wert">
        <button class="icon-del" type="button" data-act="c-del-row" data-i="${i}" data-j="${j}" aria-label="Zeile löschen">✕</button></div>`).join('')}
      <button class="add" type="button" data-act="c-add-row" data-i="${i}">+ Zeile</button></div>`).join('');
  openSheet(`${head(sheetCtx.isNew ? 'Neues Fahrzeug' : 'Fahrzeug bearbeiten', sheetCtx.isNew ? 'Name reicht für den Anfang' : esc(d.name))}
    <label class="f"><span>Name</span><input id="c-name" data-f="name" value="${esc(d.name)}" placeholder="z. B. Volvo V40" ${sheetCtx.isNew ? 'autofocus' : ''}><span class="err" id="c-err" hidden>Bitte einen Namen eingeben.</span></label>
    <label class="f"><span>Untertitel</span><input id="c-sub" data-f="sub" value="${esc(d.sub)}" placeholder="z. B. EZ 1999 · B4164S2 · 109 PS"></label>
    <div class="row2"><label class="f"><span>km-Stand</span><input id="c-km" class="num" inputmode="numeric" data-f="km" data-t="num" value="${d.km ?? ''}"></label>
      <div class="f"><span>Farbe</span><div class="swatches">${SWATCHES.map((s, i) => `<label><input type="radio" name="c-color" id="c-col-${i}" value="${s}" data-f="color"${s.toLowerCase() === d.color.toLowerCase() ? ' checked' : ''}><span style="background:${s}"></span></label>`).join('')}
        <input type="color" id="c-color" data-f="color" value="${d.color}" aria-label="Eigene Farbe"></div></div></div>
    <div class="edit-h">Wartungspunkte</div>
    <p class="hint">Bei „Intervall“ zählt, was zuerst eintritt: km oder Jahre. Beides leer lassen, wenn etwas nur beobachtet wird, etwa die Steuerkette.</p>
    ${itemsHtml}<button class="add" type="button" data-act="c-add-item">+ Wartungspunkt</button>
    <div class="edit-h">Datenblatt</div>
    ${techHtml}<button class="add" type="button" data-act="c-add-sec">+ Abschnitt</button>
    <div class="actions">${sheetCtx.isNew ? '' : `<button class="danger" type="button" data-act="c-del-car">Fahrzeug löschen</button><span class="spacer"></span>`}
      <button class="secondary" type="button" data-act="close">Abbrechen</button>
      <button class="primary inline" type="button" data-act="c-save">Speichern</button></div>`, sheetCtx);
  sheet.querySelector('.panel').scrollTop = scroll;
}
function setPath(o, path, v) {
  const k = path.split('.'); let t = o;
  for (let i = 0; i < k.length - 1; i++) t = t[k[i]];
  t[k[k.length - 1]] = v;
}
sheet.addEventListener('input', e => {
  const el = e.target; if (!sheetCtx || sheetCtx.kind !== 'car' || !el.dataset.f) return;
  let v = el.value;
  if (el.dataset.t === 'num') v = num(v);
  if (el.dataset.t === 'yr') v = v.trim() === '' ? null : (parseFloat(v.replace(',', '.')) || null);
  if (el.type === 'date' || el.type === 'month') v = v || null;
  setPath(sheetCtx.draft, el.dataset.f, v);
  if (el.dataset.f === 'color') { sheet.querySelectorAll('[name=c-color]').forEach(r => { r.checked = r.value === v; }); const cp = $('#c-color'); if (cp && el !== cp) cp.value = v; }
  if (el.hasAttribute('data-rerender')) carSheet();
});

/* Mehr */
function menuSheet() {
  const c = car();
  let where;
  if (!Sync.enabled) where = `<b>Nur auf diesem Gerät.</b><span>Der Abgleich über Google Drive ist noch nicht eingerichtet (Google-Client-ID fehlt in config.js). Lade zur Sicherheit ab und zu ein Backup herunter.</span>`;
  else if (!Sync.linked) where = `<b>Google Drive ist nicht verbunden.</b><span>Verbinde Drive, damit Handy und PC dieselben Daten haben. Die App legt nur eine eigene, versteckte Datei an und sieht deine anderen Dateien nicht.</span>`;
  else where = `<b>Gesichert in deinem Google Drive.</b><span>Die Daten liegen auf diesem Gerät und in einer versteckten App-Datei in deinem Drive.${Sync.lastSync ? ` Zuletzt abgeglichen ${ago(Sync.lastSync)}.` : ''}</span>`;
  openSheet(`${head('Mehr')}
    <div class="menu">
      ${c ? `<button type="button" data-act="edit-car"><b>${esc(c.name)} bearbeiten</b><small>Name, Farbe, Wartungspunkte, Datenblatt</small></button>` : ''}
      <button type="button" data-act="new-car"><b>Fahrzeug hinzufügen</b><small>Mit üblichen Wartungspunkten als Vorlage</small></button>
      ${Sync.enabled ? (Sync.linked
        ? `<button type="button" data-act="sync"><b>Jetzt abgleichen</b><small>Holt den neuesten Stand aus Google Drive</small></button>`
        : `<button type="button" data-act="sync"><b>Mit Google Drive verbinden</b><small>Einmal mit deinem Google-Konto anmelden</small></button>`) : ''}
      <button type="button" data-act="export"><b>Backup herunterladen</b><small>Alle Fahrzeuge als JSON-Datei</small></button>
      <button type="button" data-act="import"><b>Backup einspielen</b><small>Auch Backups der alten Garage-App und der Claude-Version</small></button>
      ${Sync.linked ? `<button type="button" data-act="unlink"><b>Drive trennen</b><small>Daten bleiben auf diesem Gerät</small></button>` : ''}
    </div>
    <div class="note-box">${where}</div>`, {kind: 'menu'});
}
function importSheet(incoming) {
  openSheet(`${head('Backup einspielen')}
    <p style="margin:0">Gefunden: <b>${incoming.map(c => esc(c.name)).join(', ')}</b> mit zusammen ${incoming.reduce((n, c) => n + c.log.length, 0)} Einträgen.</p>
    <div class="note-box">Einspielen ersetzt alle Fahrzeuge, die jetzt in der App sind${data.cars.length ? ` (${data.cars.map(c => esc(c.name)).join(', ')})` : ''}, auch auf deinen anderen Geräten.</div>
    <div class="actions"><button class="secondary" type="button" data-act="close">Abbrechen</button><button class="primary inline" type="button" data-act="import-go">Ersetzen</button></div>`, {kind: 'import', incoming});
}
$('#import-file').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = normData(JSON.parse(r.result));
      if (!d.cars.length) throw 0;
      importSheet(d.cars);
    } catch (err) { toast('Die Datei ist kein Garage-Backup.'); }
  };
  r.readAsText(f);
});

/* ---------- Aktionen ---------- */
const acts = {
  car: b => { cur = b.dataset.id; ui.showOk = false; ui.q = ''; ui.kat = null; render(); window.scrollTo({top: 0}); },
  tab: b => { ui.tab = b.dataset.tab; mem.set('mg.tab', ui.tab); render(); },
  kat: b => { ui.kat = ui.kat === b.dataset.kat ? null : b.dataset.kat; render(); },
  km: () => kmSheet(),
  entry: () => entrySheet(),
  item: b => entrySheet(null, b.dataset.id),
  log: b => entrySheet(b.dataset.id),
  'toggle-ok': () => { ui.showOk = !ui.showOk; render(); },
  copy: b => {
    const v = b.dataset.v, l = b.dataset.l;
    const done = () => toast(`${l} kopiert`);
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, () => toast(v));
    else toast(v);
  },
  menu: () => menuSheet(),
  sync: () => { if (!sheet.hidden) closeSheet(); if (!Sync.enabled) { menuSheet(); return; } Sync.connect(); },
  unlink: b => { if (!arm(b, 'Wirklich trennen?')) return; Sync.disconnect(); closeSheet(); toast('Drive getrennt'); },
  close: () => closeSheet(),
  'e-save': () => saveEntry(),
  'e-del': b => {
    if (!arm(b, 'Wirklich löschen?')) return;
    const c = car(); c.log = c.log.filter(x => x.id !== sheetCtx.entryId); c.logDel[sheetCtx.entryId] = Date.now();
    commit(c); closeSheet(); toast('Eintrag gelöscht');
  },
  'k-save': () => { const c = car(), v = num($('#k-km').value); c.km = v; commit(c); closeSheet(); toast(v != null ? `${fk(v)} km gespeichert` : 'km-Stand entfernt'); },
  'edit-car': () => { const c = car(); if (c) carSheet(clone(c), false); },
  'new-car': () => carSheet(newCar(), true),
  'c-add-item': () => { sheetCtx.draft.items.push(normItem({name: ''})); carSheet(); $('#ci-n-' + (sheetCtx.draft.items.length - 1))?.focus(); },
  'c-del-item': b => { if (!arm(b, 'Löschen')) return; sheetCtx.draft.items.splice(+b.dataset.i, 1); carSheet(); },
  'c-add-sec': () => { sheetCtx.draft.tech.push({s: '', rows: [{l: '', v: ''}]}); carSheet(); $('#ct-s-' + (sheetCtx.draft.tech.length - 1))?.focus(); },
  'c-del-sec': b => { if (!arm(b, 'Löschen')) return; sheetCtx.draft.tech.splice(+b.dataset.i, 1); carSheet(); },
  'c-add-row': b => { const s = sheetCtx.draft.tech[+b.dataset.i]; s.rows.push({l: '', v: ''}); carSheet(); $(`#ct-l-${b.dataset.i}-${s.rows.length - 1}`)?.focus(); },
  'c-del-row': b => { sheetCtx.draft.tech[+b.dataset.i].rows.splice(+b.dataset.j, 1); carSheet(); },
  'c-save': () => {
    const d = sheetCtx.draft;
    d.name = d.name.trim();
    if (!d.name) { $('#c-err').hidden = false; $('#c-name').focus(); return; }
    d.items = d.items.filter(it => it.name.trim()).map(it => ({...it, name: it.name.trim()}));
    d.tech = d.tech.map(s => ({s: s.s.trim() || 'Allgemein', rows: s.rows.filter(r => r.l.trim() || r.v.trim())})).filter(s => s.rows.length);
    const c = normCar(d), i = data.cars.findIndex(x => x.id === c.id);
    if (i >= 0) data.cars[i] = c; else data.cars.push(c);
    delete data.deleted[c.id];
    cur = c.id; const isNew = sheetCtx.isNew; closeSheet(); commit(c); toast(isNew ? 'Fahrzeug angelegt' : 'Gespeichert');
  },
  'c-del-car': b => { if (!arm(b, `${sheetCtx.draft.name} wirklich löschen?`)) return; const id = sheetCtx.draft.id; closeSheet(); removeCar(id); toast('Fahrzeug gelöscht'); },
  export: () => {
    const blob = new Blob([JSON.stringify({app: 'Meine Garage', version: 3, exported: new Date().toISOString(), cars: data.cars}, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `garage_${iso(today())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
  import: () => $('#import-file').click(),
  'import-go': () => {
    const incoming = sheetCtx.incoming, ids = new Set(incoming.map(c => c.id)), now = Date.now();
    for (const c of data.cars) if (!ids.has(c.id)) data.deleted[c.id] = now;
    incoming.forEach(c => { c.updated = now; delete data.deleted[c.id]; });
    data.cars = incoming;
    cur = incoming[0].id; closeSheet(); persist(); render(); toast(`${incoming.length} Fahrzeuge eingespielt`);
  }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const f = acts[b.dataset.act]; if (f) { e.preventDefault(); f(b, e); }
});

/* Suche im Verlauf und Notizen */
let notesTimer = null;
document.addEventListener('input', e => {
  if (e.target.id === 'q') { ui.q = e.target.value; const c = car(); if (c) $('#log-list').innerHTML = logList(c); return; }
  if (e.target.id !== 'notes') return;
  const c = car(); if (!c) return;
  c.notes = e.target.value;
  clearTimeout(notesTimer); notesTimer = setTimeout(() => { notesTimer = null; commit(c, {render: false}); }, 900);
});
document.addEventListener('focusout', e => {
  if (e.target.id !== 'notes') return;
  if (notesTimer) { clearTimeout(notesTimer); notesTimer = null; const c = car(); if (c) commit(c, {render: false}); }
  if (renderPending) { renderPending = false; setTimeout(render, 0); }
});

/* ---------- Start ---------- */
render();
Sync.start({
  onChange: d => { data = normData(d); render(); },
  onStatus: s => showSync(s)
});
