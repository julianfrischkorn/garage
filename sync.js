/* Speichern: zuerst auf dem Gerät, dann Abgleich mit einer Datei im versteckten App-Ordner von Google Drive.
   Zusammenführen pro Fahrzeug: die neuere Fassung gewinnt, Verlaufseinträge beider Geräte bleiben erhalten. */
const Sync = (() => {
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const FILE = 'garage.json';
  const KEY_DATA = 'mg.data', KEY_TOKEN = 'mg.token', KEY_LINKED = 'mg.linked', KEY_LAST = 'mg.lastSync';
  const clientId = (window.GARAGE_CONFIG && window.GARAGE_CONFIG.googleClientId || '').trim();

  const mem = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  let onChange = () => {}, onStatus = () => {};
  let tokenClient = null, pending = null, fileId = null;
  let busy = false, again = false, timer = null;
  let status = 'idle';

  function setStatus(s, detail) { status = s; onStatus(s, detail); }
  const linked = () => !!mem.get(KEY_LINKED);
  function token() {
    const t = mem.get(KEY_TOKEN);
    return t && t.exp > Date.now() + 60e3 ? t.value : null;
  }

  /* ---------- Zusammenführen ---------- */
  function mergeCar(x, y) {
    const [n, o] = (x.updated || 0) >= (y.updated || 0) ? [x, y] : [y, x];
    const logDel = {...(o.logDel || {}), ...(n.logDel || {})};
    const byId = new Map();
    for (const e of o.log || []) byId.set(e.id, e);
    for (const e of n.log || []) byId.set(e.id, e);
    return {...n, logDel, log: [...byId.values()].filter(e => !logDel[e.id])};
  }
  function merge(a, b) {
    const deleted = {...(b.deleted || {})};
    for (const [id, ts] of Object.entries(a.deleted || {})) deleted[id] = Math.max(ts, deleted[id] || 0);
    const A = new Map((a.cars || []).map(c => [c.id, c])), B = new Map((b.cars || []).map(c => [c.id, c]));
    const cars = [];
    for (const id of new Set([...A.keys(), ...B.keys()])) {
      const ca = A.get(id), cb = B.get(id);
      const c = ca && cb ? mergeCar(ca, cb) : (ca || cb);
      if (deleted[id] && deleted[id] >= (c.updated || 0)) continue;
      cars.push(c);
    }
    cars.sort((p, q) => (p.order || 0) - (q.order || 0));
    return {version: 3, cars, deleted};
  }

  /* ---------- Google-Anmeldung ---------- */
  function gisReady() { return !!(window.google && google.accounts && google.accounts.oauth2); }
  function initClient() {
    if (tokenClient || !clientId || !gisReady()) return !!tokenClient;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId, scope: SCOPE,
      callback: r => {
        const p = pending; pending = null;
        if (r && r.access_token) {
          mem.set(KEY_TOKEN, {value: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000});
          mem.set(KEY_LINKED, true);
          p && p.resolve(r.access_token);
        } else p && p.reject(new Error((r && r.error) || 'Anmeldung abgebrochen'));
      },
      error_callback: err => { const p = pending; pending = null; p && p.reject(new Error(err && err.type || 'popup')); }
    });
    return true;
  }
  // Muss direkt aus einem Antippen heraus aufgerufen werden, sonst blockt der Browser das Anmeldefenster.
  function requestToken() {
    return new Promise((resolve, reject) => {
      if (!initClient()) { reject(new Error('Google-Anmeldung lädt noch')); return; }
      pending = {resolve, reject};
      tokenClient.requestAccessToken({prompt: linked() ? '' : 'consent'});
    });
  }

  /* ---------- Drive ---------- */
  class AuthError extends Error {}
  async function api(url, opts = {}) {
    const t = token(); if (!t) throw new AuthError('kein Zugang');
    const r = await fetch(url, {...opts, headers: {...(opts.headers || {}), Authorization: 'Bearer ' + t}});
    if (r.status === 401 || r.status === 403) { mem.del(KEY_TOKEN); throw new AuthError('Zugang abgelaufen'); }
    if (!r.ok) throw new Error('Drive antwortet mit ' + r.status);
    return r;
  }
  async function pull() {
    if (!fileId) {
      const q = encodeURIComponent(`name='${FILE}'`);
      const r = await api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)`);
      const files = (await r.json()).files || [];
      if (!files.length) return null;
      fileId = files[0].id;
    }
    const r = await api(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    return r.json();
  }
  async function push(data) {
    const body = JSON.stringify(data);
    if (fileId) {
      await api(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body});
      return;
    }
    const boundary = 'mg' + Date.now();
    const meta = JSON.stringify({name: FILE, parents: ['appDataFolder']});
    const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {method: 'POST', headers: {'Content-Type': 'multipart/related; boundary=' + boundary}, body: multipart});
    fileId = (await r.json()).id;
  }

  async function run() {
    if (busy) { again = true; return; }
    if (!clientId) { setStatus('local'); return; }
    if (!token()) { setStatus(linked() ? 'tap' : 'unlinked'); return; }
    if (!navigator.onLine) { setStatus('offline'); return; }
    busy = true; setStatus('syncing');
    try {
      const remote = await pull();
      const local = load();
      const merged = remote ? merge(local, remote) : local;
      const changedHere = JSON.stringify(merged) !== JSON.stringify(local);
      if (changedHere) { mem.set(KEY_DATA, merged); onChange(merged); }
      if (!remote || JSON.stringify(merged) !== JSON.stringify(merge(remote, {cars: []}))) await push(merged);
      mem.set(KEY_LAST, Date.now());
      setStatus('ok');
    } catch (e) {
      setStatus(e instanceof AuthError ? 'tap' : (navigator.onLine ? 'error' : 'offline'), e.message);
    } finally {
      busy = false;
      if (again) { again = false; run(); }
    }
  }

  /* ---------- Öffentliche Seite ---------- */
  function load() { return mem.get(KEY_DATA) || {version: 3, cars: [], deleted: {}}; }
  function save(data) {
    mem.set(KEY_DATA, data);
    clearTimeout(timer); timer = setTimeout(run, 1500);
    if (status === 'ok' || status === 'idle') setStatus('pending');
  }
  // Aus einem Antippen: holt bei Bedarf neuen Zugang und gleicht ab.
  function connect() {
    if (!clientId) { setStatus('local'); return Promise.resolve(); }
    if (token()) return run();
    return requestToken().then(run, e => { setStatus(linked() ? 'tap' : 'unlinked', e.message); });
  }
  function disconnect() {
    const t = token();
    if (t && gisReady()) google.accounts.oauth2.revoke(t, () => {});
    mem.del(KEY_TOKEN); mem.del(KEY_LINKED); fileId = null; setStatus('unlinked');
  }
  function start(handlers) {
    onChange = handlers.onChange || onChange; onStatus = handlers.onStatus || onStatus;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    window.addEventListener('online', run);
    window.addEventListener('offline', () => setStatus('offline'));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); });
    const wait = setInterval(() => { if (gisReady() || !clientId) { clearInterval(wait); initClient(); } }, 300);
    run();
  }
  return {start, load, save, connect, disconnect, merge, get enabled() { return !!clientId; },
    get linked() { return linked(); }, get lastSync() { return mem.get(KEY_LAST); }};
})();
