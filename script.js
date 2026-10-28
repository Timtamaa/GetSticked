/* ==========================================================
   Get S(t)ick — Kalkulator Pengeboran Nikel Laterit
   Satu file: stick-up + recovery + navigasi antar halaman.
   ========================================================== */

/* ==========================================================
   1. UTILITAS BERSAMA
   ========================================================== */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function fmt(n) {
  return n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ==========================================================
   2. STICK-UP — FUNGSI MURNI
   ========================================================== */
function simulateStickUp(targetDepth, cb, interval, safeMin, standardLen, supportLen, maxSupport, useSupport) {
  if (isNaN(targetDepth) || targetDepth <= 0) {
    return { error: 'Kedalaman target harus lebih besar dari 0.' };
  }
  if (cb <= 0 || interval <= 0 || standardLen <= 0 || (useSupport && supportLen <= 0)) {
    return { error: 'Semua panjang komponen dan interval harus lebih besar dari 0.' };
  }
  if (isNaN(safeMin) || safeMin < 0) safeMin = 0;
  if (isNaN(maxSupport) || maxSupport < 1) maxSupport = 1;

  const N = Math.round(targetDepth / interval);
  if (N <= 0) {
    return { error: 'Kedalaman target terlalu kecil untuk satu interval pengeboran.' };
  }

  let state = cb;
  let activeSupport = 0;
  let supportUsedLifetime = 0;
  let standardCount = 0;
  const sequence = [];

  for (let m = 1; m <= N; m++) {
    const events = [];
    let guard = 0;

    while (state - interval < safeMin - 1e-9 && guard < 500) {
      if (useSupport && activeSupport < maxSupport) {
        state += supportLen;
        activeSupport++;
        supportUsedLifetime++;
        events.push(`+ Pipa opsional (${supportLen.toFixed(1)} m)`);

        if (activeSupport >= maxSupport) {
          const standardEquiv = round2((activeSupport * supportLen) / standardLen);
          standardCount += standardEquiv;
          events.push(`Tukar ${activeSupport} pipa opsional → ${fmt(standardEquiv)} pipa standar`);
          activeSupport = 0;
        }
      } else {
        state += standardLen;
        standardCount += 1;
        events.push(`+ Pipa standar (${standardLen.toFixed(1)} m)`);
      }
      guard++;
    }

    state -= interval;
    sequence.push({ meter: round2(m * interval), stickUp: round2(state), events });
  }

  return {
    finalStickUp: round2(state),
    lastMeter: round2(N * interval),
    sequence,
    activeSupport,
    standardCount: round2(standardCount),
    supportUsedLifetime,
    cb, targetDepth,
  };
}

/* ==========================================================
   2b. STICK-UP — UI
   ========================================================== */
function initStickUpUI() {
  const els = {
    targetDepth: document.getElementById('targetDepth'),
    useSupport: document.getElementById('useSupport'),
    advToggle: document.getElementById('advToggle'),
    advancedPanel: document.getElementById('advancedPanel'),
    cbLength: document.getElementById('cbLength'),
    interval: document.getElementById('interval'),
    safeMin: document.getElementById('safeMin'),
    standardLen: document.getElementById('standardLen'),
    supportLen: document.getElementById('supportLen'),
    maxSupport: document.getElementById('maxSupport'),
    errorBox: document.getElementById('errorBox'),
    statusLamp: document.getElementById('statusLamp'),
    statusText: document.getElementById('statusText'),
    outStickUp: document.getElementById('outStickUp'),
    outLastMeter: document.getElementById('outLastMeter'),
    outPipeCount: document.getElementById('outPipeCount'),
    outStandard: document.getElementById('outStandard'),
    outActiveSupport: document.getElementById('outActiveSupport'),
    outCB: document.getElementById('outCB'),
    outSupportUsedTotal: document.getElementById('outSupportUsedTotal'),
  };
  if (!els.targetDepth) return;

  els.advToggle.addEventListener('click', () => {
    const isOpen = els.advancedPanel.classList.toggle('open');
    els.advToggle.textContent = isOpen ? 'Pengaturan lanjutan ⌃' : 'Pengaturan lanjutan ⌄';
  });

  function setStatus(state, text) {
    els.statusLamp.classList.remove('ready', 'error');
    if (state) els.statusLamp.classList.add(state);
    els.statusText.textContent = text;
  }
  function showError(msg) {
    els.errorBox.hidden = false;
    els.errorBox.textContent = msg;
    setStatus('error', 'INPUT TIDAK VALID');
    clearOutputs();
  }
  function clearOutputs() {
    els.outStickUp.textContent = '—';
    els.outLastMeter.textContent = '—';
    els.outPipeCount.textContent = '—';
    els.outStandard.textContent = '—';
    els.outActiveSupport.textContent = '—';
    els.outCB.textContent = '—';
    els.outSupportUsedTotal.textContent = '—';
  }

  function runCalculation() {
    els.errorBox.hidden = true;
    const targetDepth = parseFloat(els.targetDepth.value);
    const useSupport = els.useSupport.checked;
    const cb = parseFloat(els.cbLength.value);
    const interval = parseFloat(els.interval.value);
    const safeMin = parseFloat(els.safeMin.value);
    const standardLen = parseFloat(els.standardLen.value);
    const supportLen = parseFloat(els.supportLen.value);
    const maxSupport = parseFloat(els.maxSupport.value);

    if (isNaN(targetDepth) || targetDepth <= 0) {
      showError('Masukkan kedalaman target (meter) terlebih dahulu.');
      return;
    }

    const result = simulateStickUp(targetDepth, cb, interval, safeMin, standardLen, supportLen, maxSupport, useSupport);
    if (result.error) { showError(result.error); return; }

    els.outStickUp.textContent = fmt(result.finalStickUp);
    els.outLastMeter.textContent = fmt(result.lastMeter);
    els.outStandard.textContent = `${fmt(result.standardCount)} batang`;
    els.outActiveSupport.textContent = `${result.activeSupport} batang`;
    els.outCB.textContent = `${fmt(cb)} m`;
    els.outSupportUsedTotal.textContent = `${result.supportUsedLifetime} batang`;
    els.outPipeCount.textContent = fmt(round2(result.standardCount + result.activeSupport + 1));

    setStatus('ready', 'SIMULASI SELESAI');
  }

  let autoCalcTimer = null;
  function scheduleAutoCalculate() {
    clearTimeout(autoCalcTimer);
    autoCalcTimer = setTimeout(handleAutoCalculate, 150);
  }
  function handleAutoCalculate() {
    if (els.targetDepth.value.trim() === '') {
      els.errorBox.hidden = true;
      clearOutputs();
      setStatus(null, 'MENUNGGU INPUT');
      return;
    }
    runCalculation();
  }

  els.targetDepth.addEventListener('input', scheduleAutoCalculate);
  els.useSupport.addEventListener('change', scheduleAutoCalculate);
  [els.cbLength, els.interval, els.safeMin, els.standardLen, els.supportLen, els.maxSupport]
    .forEach(el => el.addEventListener('input', scheduleAutoCalculate));
}

/* ==========================================================
   3. RECOVERY — FUNGSI MURNI
   ========================================================== */
const REC_EPS = 1e-9;
const REC_INTERVAL = 1;
const MAX_INTERVALS = 500;

function recRound(n, d) {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
}
function recFmt(n, d) {
  if (d === undefined) d = 2;
  return n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function parseSample(str, defaultUnit) {
  if (str === undefined || str === null) return null;
  const s = String(str).trim();
  if (s === '') return null;
  const m = s.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(cm|m)?$/i);
  if (!m) return NaN;
  const n = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(n)) return NaN;
  const unit = m[2] ? m[2].toLowerCase() : defaultUnit;
  return unit === 'cm' ? n / 100 : n;
}

function intervalResult(intervalLen, sampleLen, basis) {
  const diff = sampleLen - intervalLen;
  if (diff >= -REC_EPS) {
    return {
      recovery: 100,
      status: diff > REC_EPS ? 'swelling' : 'full',
      loss: 0,
      excess: Math.max(0, diff),
      lossPct: 0,
    };
  }
  const loss = intervalLen - sampleLen;
  const base = basis === 'interval' ? intervalLen : sampleLen;
  const lossPct = base > REC_EPS ? (loss / base) * 100 : Infinity;
  const recovery = Math.max(0, 100 - lossPct);
  return { recovery, status: 'loss', loss, excess: 0, lossPct };
}

function makeRow(index, value) {
  return {
    value: value || '', len: REC_INTERVAL,
    from: index * REC_INTERVAL, to: (index + 1) * REC_INTERVAL,
    sample: null, result: null,
  };
}
function renumber(rows) {
  rows.forEach((r, i) => { r.from = i * REC_INTERVAL; r.to = (i + 1) * REC_INTERVAL; });
}
function generateRows(n) {
  const list = [];
  for (let i = 0; i < n; i++) list.push(makeRow(i));
  return list;
}

function summarize(rows) {
  const s = {
    totalRows: rows.length, filled: 0, sumLen: 0, sumRecLen: 0, coreTotal: 0,
    full: 0, swelling: 0, swellExcess: 0, loss: 0, lossTotal: 0,
    lowest: null, recovery: null,
  };
  rows.forEach((r) => {
    const res = r.result;
    if (!res) return;
    s.filled++;
    s.sumLen += r.len;
    s.sumRecLen += res.recovery * r.len;
    s.coreTotal += r.sample;
    if (res.status === 'full') s.full++;
    if (res.status === 'swelling') { s.swelling++; s.swellExcess += res.excess; }
    if (res.status === 'loss') { s.loss++; s.lossTotal += res.loss; }
    if (!s.lowest || res.recovery < s.lowest.recovery) {
      s.lowest = { recovery: res.recovery, from: r.from, to: r.to };
    }
  });
  if (s.sumLen > 0) s.recovery = s.sumRecLen / s.sumLen;
  return s;
}

function scaleExtent(rows) {
  let maxLen = REC_INTERVAL;
  let maxSample = 0;
  rows.forEach((r) => {
    if (r.len > maxLen) maxLen = r.len;
    if (r.sample !== null && r.sample > maxSample) maxSample = r.sample;
  });
  const need = Math.ceil(maxSample * 10 - 1e-9) / 10;
  return Math.max(maxLen * 1.25, need);
}

function laneGeometry(len, sample, ext) {
  const pct = (m) => recRound((m / ext) * 100, 3);
  const g = { framePct: pct(len), markPct: pct(len), corePct: 0,
              lossLeft: 0, lossWidth: 0, swellLeft: 0, swellWidth: 0 };
  if (sample === null) return g;
  g.corePct = pct(Math.min(sample, len));
  if (sample < len - REC_EPS) {
    g.lossLeft = pct(sample);
    g.lossWidth = pct(len - sample);
  } else if (sample > len + REC_EPS) {
    g.swellLeft = pct(len);
    g.swellWidth = pct(sample - len);
  }
  return g;
}

function rulerHtml(ext) {
  let ticks = '';
  const steps = Math.floor(ext / 0.25 + 1e-9);
  for (let k = 0; k <= steps; k++) {
    const m = k * 0.25;
    const major = k % 2 === 0;
    const label = Math.abs(m - REC_INTERVAL) < REC_EPS ? '1 m' : recFmt(m, Number.isInteger(m) ? 0 : 1);
    ticks += `<i class="ill-tick${major ? ' major' : ''}" style="left:${recRound((m / ext) * 100, 3)}%">` +
             (major ? `<span>${label}</span>` : '') + '</i>';
  }
  return `<span class="ill-rh">Interval</span><div class="ill-ruler-track">${ticks}</div>` +
         '<span class="ill-rh r">Hasil</span>';
}

function laneHtml(r, ext) {
  const label = `${r.from}–${r.to} m`;
  const g = laneGeometry(r.len, r.sample, ext);
  const res = r.result;
  const invalid = r.sample === null && String(r.value).trim() !== '';
  let status = 'empty';
  let aria = `Interval ${label}: belum diisi`;
  let val = '<b>—</b>';

  if (invalid) {
    status = 'invalid';
    aria = `Interval ${label}: isian tidak valid`;
    val = '<b>tidak valid</b>';
  } else if (res) {
    status = res.status;
    const parts = [`sampel ${recFmt(r.sample)} m`];
    if (res.status === 'loss') parts.push(`core loss ${recFmt(res.loss)} m`);
    if (res.status === 'swelling') parts.push(`swelling ${recFmt(res.excess)} m`);
    parts.push(`recovery ${recFmt(res.recovery)}%`);
    aria = `Interval ${label}: ${parts.join(', ')}`;
    val = `<b>${recFmt(r.sample)} m</b><span>${recFmt(res.recovery)} %</span>`;
  }

  const core = g.corePct > 0
    ? `<div class="ill-core ${status === 'loss' ? 'loss' : 'ok'}${g.swellWidth > 0 ? ' joined' : ''}" style="width:${g.corePct}%"></div>`
    : '';
  const loss = g.lossWidth > 0
    ? `<div class="ill-loss${g.corePct > 0 ? '' : ' solo'}" style="left:${g.lossLeft}%;width:${g.lossWidth}%" title="Core loss ${recFmt(res ? res.loss : 0)} m"></div>`
    : '';
  const swell = g.swellWidth > 0
    ? `<div class="ill-swell" style="left:${g.swellLeft}%;width:${g.swellWidth}%" title="Swelling +${recFmt(res ? res.excess : 0)} m"></div>`
    : '';

  return `<div class="ill-lane" role="img" aria-label="${aria}" data-status="${status}">` +
         `<span class="ill-label">${label}</span>` +
         `<div class="ill-track"><div class="ill-frame" style="width:${g.framePct}%"></div>` +
         `${core}${loss}${swell}<div class="ill-mark" style="left:${g.markPct}%"></div></div>` +
         `<span class="ill-val ${status}">${val}</span></div>`;
}

/* ==========================================================
   3b. RECOVERY — UI
   ========================================================== */
function initRecoveryUI() {
  const $ = (id) => document.getElementById(id);
  const els = {
    count: $('recCount'), unit: $('recUnit'), basis: $('recBasis'),
    applyBtn: $('recApplyBtn'), fillBtn: $('recFillBtn'), clearBtn: $('recClearBtn'),
    addBtn: $('recAddBtn'), removeBtn: $('recRemoveBtn'), undoBtn: $('recUndoBtn'),
    errorBox: $('recErrorBox'), statusLamp: $('recStatusLamp'), statusText: $('recStatusText'),
    outRecovery: $('recOutRecovery'), outRecoverySub: $('recOutRecoverySub'),
    outLossTotal: $('recOutLossTotal'), outDepth: $('recOutDepth'),
    outFilled: $('recOutFilled'), outFull: $('recOutFull'), outSwell: $('recOutSwell'),
    outLossCount: $('recOutLossCount'), outCore: $('recOutCore'), outLowest: $('recOutLowest'),
    tableBody: $('recBody'),
    ill: $('recIllustration'), ruler: $('recRuler'),
  };
  if (!els.count) return;

  let rows = generateRows(5);
  let refs = [];
  let undoStack = [];
  let currentUnit = els.unit.value;

  function setStatus(state, text) {
    els.statusLamp.classList.remove('ready', 'error');
    if (state) els.statusLamp.classList.add(state);
    els.statusText.textContent = text;
  }
  function showNote(msg) { els.errorBox.hidden = false; els.errorBox.textContent = msg; }
  function clearNote() { els.errorBox.hidden = true; }

  function setStatusTag(td, cls, text) {
    td.innerHTML = '';
    if (!cls) { td.textContent = '—'; td.style.color = 'var(--text-dim)'; return; }
    td.style.color = '';
    const tag = document.createElement('span');
    tag.className = 'event-tag ' + cls;
    tag.textContent = text;
    td.appendChild(tag);
  }

  function actionButton(act, idx, label, title, extraClass, disabled) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'row-btn' + (extraClass ? ' ' + extraClass : '');
    b.dataset.act = act;
    b.dataset.idx = idx;
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    if (disabled) b.disabled = true;
    return b;
  }

  function render(focusIdx) {
    renumber(rows);
    els.tableBody.innerHTML = '';
    refs = rows.map((r, i) => {
      const tr = document.createElement('tr');

      const tdRange = document.createElement('td');
      tdRange.className = 'meter-cell';
      tdRange.textContent = `${r.from} – ${r.to} m`;

      const tdIn = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.className = 'sample-input';
      input.dataset.idx = i;
      input.placeholder = '0';
      input.autocomplete = 'off';
      input.value = r.value;
      input.setAttribute('aria-label', `Panjang sampel interval ${r.from} sampai ${r.to} meter`);
      tdIn.appendChild(input);

      const tdRead = document.createElement('td');
      tdRead.className = 'read-cell';

      const tdRec = document.createElement('td');
      const recText = document.createElement('span');
      recText.className = 'rec-text';
      const bar = document.createElement('div');
      bar.className = 'rec-bar';
      const barFill = document.createElement('span');
      bar.appendChild(barFill);
      tdRec.appendChild(recText);
      tdRec.appendChild(bar);

      const tdStatus = document.createElement('td');

      const tdAct = document.createElement('td');
      tdAct.className = 'row-actions';
      tdAct.appendChild(actionButton('insert', i, '+', `Sisipkan interval baru di bawah ${r.from}–${r.to} m`, '', false));
      tdAct.appendChild(actionButton('remove', i, '×', `Hapus interval ${r.from}–${r.to} m`, 'danger', rows.length <= 1));

      [tdRange, tdIn, tdRead, tdRec, tdStatus, tdAct].forEach((td) => tr.appendChild(td));
      els.tableBody.appendChild(tr);
      return { tr, input, tdRead, recText, barFill, tdStatus };
    });
    rows.forEach((_, i) => updateRow(i));
    updateSummary();

    els.count.value = rows.length;
    els.undoBtn.disabled = undoStack.length === 0;
    els.removeBtn.disabled = rows.length <= 1;
    els.addBtn.disabled = rows.length >= MAX_INTERVALS;

    if (focusIdx !== undefined && focusIdx !== null && refs[focusIdx]) refs[focusIdx].input.focus();
  }

  function updateRow(i) {
    const r = rows[i];
    const t = refs[i];
    t.input.classList.remove('invalid');
    t.barFill.style.width = '0%';
    t.barFill.className = '';

    const sample = parseSample(r.value, els.unit.value);
    r.sample = null;
    r.result = null;

    if (sample === null) {
      t.tdRead.textContent = '—';
      t.recText.textContent = '—';
      setStatusTag(t.tdStatus, null);
      return;
    }
    if (Number.isNaN(sample)) {
      t.input.classList.add('invalid');
      t.tdRead.textContent = '?';
      t.recText.textContent = '—';
      setStatusTag(t.tdStatus, 'st-invalid', 'Tidak valid');
      return;
    }

    r.sample = sample;
    const res = intervalResult(r.len, sample, els.basis.value);
    r.result = res;

    t.tdRead.textContent = `${recFmt(sample)} m`;
    t.recText.textContent = `${recFmt(res.recovery, 2)} %`;
    t.barFill.style.width = `${Math.min(100, res.recovery)}%`;

    if (res.status === 'full') {
      t.barFill.className = 'ok';
      setStatusTag(t.tdStatus, 'st-full', 'Penuh');
    } else if (res.status === 'swelling') {
      t.barFill.className = 'ok';
      setStatusTag(t.tdStatus, 'st-swell', `Swelling +${recFmt(res.excess)} m`);
    } else {
      setStatusTag(t.tdStatus, 'st-loss', `Loss −${recFmt(res.loss)} m (${recFmt(res.lossPct, 1)}%)`);
    }
  }

  function renderIllustration() {
    const ext = scaleExtent(rows);
    els.ruler.innerHTML = rulerHtml(ext);
    els.ill.innerHTML = rows.map((r) => laneHtml(r, ext)).join('');
  }

  function updateSummary() {
    renderIllustration();
    const s = summarize(rows);
    els.outDepth.textContent = `${rows.length} m (${rows.length} interval)`;
    if (s.filled === 0) {
      els.outRecovery.textContent = '—';
      els.outRecoverySub.textContent = 'isi panjang sampel';
      els.outLossTotal.textContent = '—';
      els.outFilled.textContent = `0 / ${rows.length}`;
      els.outFull.textContent = '—';
      els.outSwell.textContent = '—';
      els.outLossCount.textContent = '—';
      els.outCore.textContent = '—';
      els.outLowest.textContent = '—';
      setStatus(null, 'MENUNGGU DATA SAMPEL');
      return;
    }
    els.outRecovery.textContent = recFmt(s.recovery, 2);
    els.outRecoverySub.textContent = `% rata-rata dari ${recFmt(s.sumLen)} m terisi`;
    els.outLossTotal.textContent = recFmt(s.lossTotal);
    els.outFilled.textContent = `${s.filled} / ${s.totalRows}`;
    els.outFull.textContent = `${s.full} interval`;
    els.outSwell.textContent = `${s.swelling} interval (+${recFmt(s.swellExcess)} m)`;
    els.outLossCount.textContent = `${s.loss} interval (−${recFmt(s.lossTotal)} m)`;
    els.outCore.textContent = `${recFmt(s.coreTotal)} m`;
    els.outLowest.textContent = `${recFmt(s.lowest.recovery, 2)} % @ ${s.lowest.from}–${s.lowest.to} m`;
    setStatus('ready', s.filled === s.totalRows ? 'SEMUA INTERVAL TERISI' : 'SEBAGIAN TERISI');
  }

  function updateAll() {
    rows.forEach((_, i) => updateRow(i));
    updateSummary();
  }

  function pushUndo(items) {
    undoStack.push(items);
    if (undoStack.length > 30) undoStack.shift();
  }
  function addRow() {
    if (rows.length >= MAX_INTERVALS) { showNote(`Jumlah interval maksimum ${MAX_INTERVALS}.`); return; }
    clearNote();
    rows.push(makeRow(rows.length));
    render(rows.length - 1);
  }
  function insertAfter(i) {
    if (rows.length >= MAX_INTERVALS) { showNote(`Jumlah interval maksimum ${MAX_INTERVALS}.`); return; }
    clearNote();
    rows.splice(i + 1, 0, makeRow(i + 1));
    render(i + 1);
  }
  function removeAt(i) {
    if (rows.length <= 1) { showNote('Minimal harus ada 1 interval.'); return; }
    clearNote();
    const [row] = rows.splice(i, 1);
    pushUndo([{ index: i, row }]);
    render(Math.min(i, rows.length - 1));
  }
  function removeLast() { removeAt(rows.length - 1); }

  function setCount(n) {
    if (n > rows.length) {
      const first = rows.length;
      while (rows.length < n) rows.push(makeRow(rows.length));
      render(first);
    } else if (n < rows.length) {
      const items = rows.slice(n).map((row, k) => ({ index: n + k, row }));
      rows.length = n;
      pushUndo(items);
      render(n - 1);
    }
  }
  function applyCount() {
    const raw = String(els.count.value).trim().replace(',', '.');
    const n = raw === '' ? NaN : Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > MAX_INTERVALS) {
      showNote(`Jumlah interval harus bilangan bulat 1–${MAX_INTERVALS}.`);
      els.count.value = rows.length;
      return;
    }
    clearNote();
    if (n === rows.length) return;
    setCount(n);
  }
  function undo() {
    const items = undoStack.pop();
    if (!items) return;
    clearNote();
    items.forEach(({ index, row }) => rows.splice(Math.min(index, rows.length), 0, row));
    render(items[0] ? Math.min(items[0].index, rows.length - 1) : null);
  }

  function fillEmptyWithFull() {
    rows.forEach((r, i) => {
      if (parseSample(r.value, els.unit.value) === null) {
        r.value = `${String(r.len).replace('.', ',')}m`;
        refs[i].input.value = r.value;
      }
    });
    updateAll();
  }
  function clearAll() {
    rows.forEach((r, i) => { r.value = ''; refs[i].input.value = ''; });
    updateAll();
  }

  function changeUnit() {
    const next = els.unit.value;
    if (next === currentUnit) return;
    const mult = next === 'cm' ? 100 : 0.01;
    const convert = (r) => {
      if (/^\s*[0-9]+(?:[.,][0-9]+)?\s*$/.test(r.value)) {
        r.value = String(recRound(Number(r.value.trim().replace(',', '.')) * mult, 4)).replace('.', ',');
      }
    };
    rows.forEach(convert);
    undoStack.forEach((items) => items.forEach(({ row }) => convert(row)));
    rows.forEach((r, i) => { refs[i].input.value = r.value; });
    currentUnit = next;
    updateAll();
  }

  els.applyBtn.addEventListener('click', applyCount);
  els.count.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCount(); });
  els.addBtn.addEventListener('click', addRow);
  els.removeBtn.addEventListener('click', removeLast);
  els.undoBtn.addEventListener('click', undo);
  els.fillBtn.addEventListener('click', fillEmptyWithFull);
  els.clearBtn.addEventListener('click', clearAll);
  els.unit.addEventListener('change', changeUnit);
  els.basis.addEventListener('change', updateAll);

  els.tableBody.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.classList.contains('sample-input')) return;
    const i = Number(el.dataset.idx);
    rows[i].value = el.value;
    updateRow(i);
    updateSummary();
  });
  els.tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest ? e.target.closest('button[data-act]') : null;
    if (!btn || btn.disabled) return;
    const i = Number(btn.dataset.idx);
    if (btn.dataset.act === 'insert') insertAfter(i);
    else if (btn.dataset.act === 'remove') removeAt(i);
  });
  els.tableBody.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.classList.contains('sample-input')) return;
    e.preventDefault();
    const i = Number(e.target.dataset.idx);
    if (i < rows.length - 1) {
      refs[i + 1].input.focus();
    } else {
      const v = parseSample(rows[i].value, els.unit.value);
      if (v !== null && !Number.isNaN(v)) addRow();
    }
  });

  render();
}

/* ==========================================================
   3c. SAMPLE TURN — swelling aktual & recovery material lunak (SM)
   Asumsi: HM tidak bisa swelling (panjang terbaca = panjang asli),
   seluruh selisih terhadap interval ditanggung oleh SM.
     SM seharusnya = Interval − Σ HM
     Σ SM terbaca > SM seharusnya → swelling SM = selisihnya, Rec SM = 100%
     Σ SM terbaca < SM seharusnya → loss SM = selisihnya,
         Rec SM = 100% − (loss ÷ pembagi × 100%)
         (pembagi: core aktual = SM terbaca, interval = SM seharusnya)
   Tiap lapisan SM mendapat porsi tebal sebenarnya proporsional terhadap
   panjang terbacanya (batas asli antar-lapisan SM tidak diketahui).
   ========================================================== */
const ST_MAX_LAYERS = 50;
const ST_MAX_BOXES = 12;

function stFmtNum(m, unit) {
  if (unit === 'cm') {
    const v = Math.round(m * 1000) / 10;
    return v.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }
  return m.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function stFmtLen(m, unit) {
  return `${stFmtNum(m, unit)} ${unit === 'cm' ? 'cm' : 'm'}`;
}

/* layers: [{ type: 'HM' | 'SM', len: meter }] dalam urutan core tray */
function stCalc(layers, basis) {
  if (!layers || layers.length === 0) return null;
  const I = REC_INTERVAL;
  let hm = 0, sm = 0, smCount = 0;
  layers.forEach((l) => {
    if (l.type === 'HM') hm += l.len;
    else { sm += l.len; smCount++; }
  });
  const total = hm + sm;
  if (hm > I + REC_EPS) return { error: 'hm-over', hm, sm, total };

  const smExpected = Math.max(0, I - hm);

  const evaluate = (measured, expected) => {
    const d = measured - expected;
    if (expected <= REC_EPS) {
      return measured > REC_EPS
        ? { status: 'swelling', swelling: measured, loss: 0, swellPct: null, lossPct: 0, recovery: null }
        : { status: 'full', swelling: 0, loss: 0, swellPct: null, lossPct: 0, recovery: null };
    }
    if (d >= -REC_EPS) {
      return {
        status: d > REC_EPS ? 'swelling' : 'full',
        swelling: Math.max(0, d), loss: 0,
        swellPct: d > REC_EPS ? (d / expected) * 100 : 0,
        lossPct: 0, recovery: 100,
      };
    }
    const loss = -d;
    const base = basis === 'interval' ? expected : measured;
    const lossPct = base > REC_EPS ? (loss / base) * 100 : Infinity;
    return { status: 'loss', swelling: 0, loss, swellPct: null, lossPct, recovery: Math.max(0, 100 - lossPct) };
  };

  const out = {
    interval: I, hm, sm, total, smExpected, hasSM: smCount > 0,
    status: 'no-sm', swelling: 0, loss: 0, swellPct: null, lossPct: 0,
    recovery: null, expansion: null,
    trayExcess: Math.max(0, total - I), trayLoss: Math.max(0, I - total),
    perLayer: [],
  };
  if (out.hasSM) {
    Object.assign(out, evaluate(sm, smExpected));
    out.expansion = smExpected > REC_EPS ? sm / smExpected : null;
  }
  layers.forEach((l) => {
    if (l.type === 'HM') {
      out.perLayer.push({ type: 'HM', measured: l.len, actual: l.len, status: 'hm' });
      return;
    }
    const share = sm > REC_EPS ? l.len / sm : 1 / smCount;
    const actual = smExpected * share;
    out.perLayer.push(Object.assign({ type: 'SM', measured: l.len, actual }, evaluate(l.len, actual)));
  });
  return out;
}

/* Susun lapisan ke corebox berurutan; panjang di atas satu interval
   "pindah" ke corebox berikutnya (ditandai over = true). */
function stBoxes(layers, total, maxBoxes) {
  const I = REC_INTERVAL;
  const nBoxes = Math.max(1, Math.ceil(total / I - REC_EPS));
  const shown = Math.min(nBoxes, maxBoxes || ST_MAX_BOXES);
  const boxes = [];
  for (let k = 0; k < shown; k++) boxes.push({ index: k, pieces: [], used: 0 });
  let pos = 0;
  layers.forEach((l) => {
    const start = pos;
    const end = pos + l.len;
    pos = end;
    for (let k = 0; k < shown; k++) {
      const a = Math.max(start, k * I);
      const b = Math.min(end, (k + 1) * I);
      if (b - a > REC_EPS) {
        boxes[k].pieces.push({ type: l.type, label: l.label, left: a - k * I, len: b - a, over: k > 0 });
        boxes[k].used += b - a;
      }
    }
  });
  return { boxes, hidden: nBoxes - shown };
}

function stRulerHtml(unit) {
  let ticks = '';
  for (let k = 0; k <= 4; k++) {
    const m = (k / 4) * REC_INTERVAL;
    const label = unit === 'cm' ? recFmt(m * 100, 0) : recFmt(m, 2);
    const pos = k === 4 ? ' style="left:auto;right:4px"' : '';
    ticks += `<i class="ill-tick major" style="left:${k * 25}%"><span${pos}>${label}</span></i>`;
  }
  return '<span class="ill-rh">Corebox</span>' +
         `<div class="ill-ruler-track">${ticks}</div>` +
         `<span class="ill-rh r">Isi (${unit === 'cm' ? 'cm' : 'm'})</span>`;
}

function stLaneHtml(box, total, unit) {
  const I = REC_INTERVAL;
  const pct = (m) => recRound((m / I) * 100, 3);
  const segs = box.pieces.map((p) => {
    const w = pct(p.len);
    return `<div class="st-seg ${p.type === 'HM' ? 'hm' : 'sm'}${p.over ? ' over' : ''}" ` +
           `style="left:${pct(p.left)}%;width:${w}%" title="${p.label} · ${stFmtLen(p.len, unit)}">` +
           `${w >= 9 ? p.label : ''}</div>`;
  }).join('');

  let loss = '';
  let cls = '';
  let sub = 'penuh';
  let aria = `Corebox ${box.index + 1}: ${stFmtLen(box.used, unit)}`;
  if (box.index === 0 && total < I - REC_EPS) {
    loss = `<div class="ill-loss${total > REC_EPS ? '' : ' solo'}" style="left:${pct(total)}%;width:${pct(I - total)}%" ` +
           `title="Core loss ${stFmtLen(I - total, unit)}"></div>`;
    cls = 'loss';
    sub = 'core loss';
    aria += `, core loss ${stFmtLen(I - total, unit)}`;
  }
  let val = `<b>${stFmtNum(box.used, unit)}</b><span>${sub}</span>`;
  if (box.index > 0) {
    cls = 'swelling';
    val = `<b>+${stFmtNum(box.used, unit)}</b><span>swelling</span>`;
    aria += ', kelebihan (swelling) dari corebox sebelumnya';
  }
  return `<div class="ill-lane" role="img" aria-label="${aria}">` +
         `<span class="ill-label">Box ${box.index + 1}</span>` +
         `<div class="ill-track"><div class="ill-frame" style="width:100%"></div>${segs}${loss}</div>` +
         `<span class="ill-val ${cls}">${val}</span></div>`;
}

function stTagHtml(p, unit) {
  if (p.status === 'hm') return '<span class="event-tag st-hm">HM · tetap</span>';
  if (p.status === 'swelling') {
    const pct = p.swellPct !== null ? ` (${recFmt(p.swellPct, 1)}%)` : '';
    return `<span class="event-tag st-swell">+${stFmtLen(p.swelling, unit)}${pct}</span>`;
  }
  if (p.status === 'loss') {
    const pct = Number.isFinite(p.lossPct) ? ` (${recFmt(p.lossPct, 1)}%)` : '';
    return `<span class="event-tag st-loss">−${stFmtLen(p.loss, unit)}${pct}</span>`;
  }
  return '<span class="event-tag st-full">Pas</span>';
}

function initSampleTurnUI() {
  const $ = (id) => document.getElementById(id);
  const els = {
    unit: $('stUnit'), basis: $('stBasis'), body: $('stBody'), thLen: $('stThLen'),
    addBtn: $('stAddBtn'), removeBtn: $('stRemoveBtn'), undoBtn: $('stUndoBtn'), clearBtn: $('stClearBtn'),
    note: $('stNote'), lamp: $('stStatusLamp'), statusText: $('stStatusText'),
    cardLabel: $('stCardLabel'), cardValue: $('stCardValue'), cardSub: $('stCardSub'),
    recValue: $('stRecValue'), recSub: $('stRecSub'),
    outHM: $('stOutHM'), outSM: $('stOutSM'), outExp: $('stOutExp'), outTotal: $('stOutTotal'),
    outOverLabel: $('stOutOverLabel'), outOver: $('stOutOver'), outFactor: $('stOutFactor'),
    detailBody: $('stDetailBody'), ill: $('stIllustration'), ruler: $('stRuler'),
  };
  if (!els.body) return;

  let rows = [
    { type: 'HM', value: '' }, { type: 'SM', value: '' },
    { type: 'HM', value: '' }, { type: 'SM', value: '' },
  ];
  let refs = [];
  let undoStack = [];
  let currentUnit = els.unit.value;

  const opposite = (t) => (t === 'HM' ? 'SM' : 'HM');
  function labelFor(i) {
    let n = 0;
    for (let k = 0; k <= i; k++) if (rows[k].type === rows[i].type) n++;
    return `${rows[i].type} ${n}`;
  }
  function setStatus(state, text) {
    els.lamp.classList.remove('ready', 'error');
    if (state) els.lamp.classList.add(state);
    els.statusText.textContent = text;
  }
  function showNote(msg) { els.note.hidden = false; els.note.textContent = msg; }
  function clearNote() { els.note.hidden = true; }

  function actionBtn(act, label, title, extra, disabled) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'row-btn' + (extra ? ' ' + extra : '');
    b.dataset.act = act;
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    if (disabled) b.disabled = true;
    return b;
  }

  function render(focusIdx) {
    els.body.innerHTML = '';
    refs = rows.map((r, i) => {
      const tr = document.createElement('tr');
      tr.dataset.idx = i;

      const tdLabel = document.createElement('td');
      const chip = document.createElement('span');
      tdLabel.appendChild(chip);

      const tdIn = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.className = 'sample-input';
      input.placeholder = '0';
      input.autocomplete = 'off';
      input.value = r.value;
      tdIn.appendChild(input);

      const tdType = document.createElement('td');
      const group = document.createElement('div');
      group.className = 'type-toggle';
      group.setAttribute('role', 'group');
      const btns = ['HM', 'SM'].map((t) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'type-btn ' + t.toLowerCase();
        b.dataset.type = t;
        b.textContent = t;
        group.appendChild(b);
        return b;
      });
      tdType.appendChild(group);

      const tdAct = document.createElement('td');
      tdAct.className = 'row-actions';
      tdAct.appendChild(actionBtn('insert', '+', 'Sisipkan lapisan baru di bawah lapisan ini', '', rows.length >= ST_MAX_LAYERS));
      tdAct.appendChild(actionBtn('remove', '×', 'Hapus lapisan ini', 'danger', rows.length <= 1));

      [tdLabel, tdIn, tdType, tdAct].forEach((td) => tr.appendChild(td));
      els.body.appendChild(tr);
      return { chip, input, group, btns };
    });

    els.undoBtn.disabled = undoStack.length === 0;
    els.removeBtn.disabled = rows.length <= 1;
    els.addBtn.disabled = rows.length >= ST_MAX_LAYERS;
    updateAll();
    if (focusIdx !== undefined && focusIdx !== null && refs[focusIdx]) refs[focusIdx].input.focus();
  }

  function clearResults() {
    els.cardLabel.textContent = 'Swelling SM Aktual';
    els.cardValue.textContent = '—';
    els.cardSub.textContent = 'isi panjang sampel';
    els.recValue.textContent = '—';
    els.recSub.textContent = 'persen';
    [els.outHM, els.outSM, els.outExp, els.outTotal, els.outOver, els.outFactor].forEach((e) => { e.textContent = '—'; });
    els.outOverLabel.textContent = 'Kelebihan / kekurangan panjang';
    els.detailBody.innerHTML = '<tr><td colspan="4" class="st-empty">Isi panjang sampel untuk melihat rincian.</td></tr>';
  }

  function drawIllustration(layers, total, unit) {
    if (layers.length === 0) {
      els.ruler.innerHTML = '';
      els.ill.innerHTML = '<p class="ill-empty">Isi panjang sampel untuk melihat ilustrasi.</p>';
      return;
    }
    const { boxes, hidden } = stBoxes(layers, total, ST_MAX_BOXES);
    els.ruler.innerHTML = stRulerHtml(unit);
    els.ill.innerHTML = boxes.map((b) => stLaneHtml(b, total, unit)).join('') +
      (hidden > 0 ? `<p class="ill-empty">+ ${hidden} corebox lagi tidak digambar.</p>` : '');
  }

  function updateAll() {
    const unit = els.unit.value;
    els.thLen.textContent = `Panjang (${unit === 'cm' ? 'cm' : 'm'})`;
    const layers = [];
    let invalid = 0;

    rows.forEach((r, i) => {
      const t = refs[i];
      const label = labelFor(i);
      t.chip.textContent = label;
      t.chip.className = 'st-chip ' + (r.type === 'HM' ? 'hm' : 'sm');
      t.input.setAttribute('aria-label', `Panjang lapisan ${label}`);
      t.group.setAttribute('aria-label', `Jenis lapisan ${label}`);
      t.btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === r.type)));
      t.input.classList.remove('invalid');

      const v = parseSample(r.value, unit);
      if (v === null) return;
      if (Number.isNaN(v)) { t.input.classList.add('invalid'); invalid++; return; }
      layers.push({ type: r.type, len: v, label });
    });

    if (invalid > 0) {
      showNote(`${invalid} isian panjang tidak valid. Contoh yang benar: 25, 0,25m, atau 25cm.`);
      clearResults();
      drawIllustration([], 0, unit);
      setStatus('error', 'ISIAN TIDAK VALID');
      return;
    }
    clearNote();

    const calc = stCalc(layers, els.basis.value);
    if (!calc) {
      clearResults();
      drawIllustration([], 0, unit);
      setStatus(null, 'MENUNGGU DATA SAMPEL');
      return;
    }

    const total = layers.reduce((a, l) => a + l.len, 0);
    drawIllustration(layers, total, unit);

    if (calc.error) {
      clearResults();
      showNote(`Total HM ${stFmtLen(calc.hm, unit)} melebihi interval ${stFmtLen(REC_INTERVAL, unit)}. HM tidak bisa swelling, cek kembali panjang atau jenis lapisan.`);
      setStatus('error', 'HM MELEBIHI INTERVAL');
      return;
    }

    const unitName = unit === 'cm' ? 'cm' : 'meter';
    if (!calc.hasSM) {
      els.cardLabel.textContent = 'Swelling SM Aktual';
      els.cardValue.textContent = '—';
      els.cardSub.textContent = 'belum ada lapisan SM';
      els.recValue.textContent = '—';
      els.recSub.textContent = 'persen';
    } else if (calc.status === 'loss') {
      els.cardLabel.textContent = 'Core Loss SM Aktual';
      els.cardValue.textContent = stFmtNum(calc.loss, unit);
      els.cardSub.textContent = `${unitName}` + (Number.isFinite(calc.lossPct) ? ` · ${recFmt(calc.lossPct, 1)}% dari pembagi` : '');
    } else {
      els.cardLabel.textContent = 'Swelling SM Aktual';
      els.cardValue.textContent = stFmtNum(calc.swelling, unit);
      els.cardSub.textContent = `${unitName}` + (calc.status === 'full'
        ? ' · SM pas, tanpa swelling'
        : (calc.swellPct !== null ? ` · ${recFmt(calc.swellPct, 1)}% dari tebal SM seharusnya` : ''));
    }
    if (calc.hasSM) {
      els.recValue.textContent = calc.recovery === null ? '—' : recFmt(calc.recovery, 2);
      els.recSub.textContent = calc.status === 'swelling' ? 'persen · swelling dihitung 100%' : 'persen';
    }

    els.outHM.textContent = stFmtLen(calc.hm, unit);
    els.outSM.textContent = stFmtLen(calc.sm, unit);
    els.outExp.textContent = stFmtLen(calc.smExpected, unit);
    els.outTotal.textContent = `${stFmtLen(calc.total, unit)} dari ${stFmtLen(calc.interval, unit)}`;
    if (calc.trayExcess > REC_EPS) {
      els.outOverLabel.textContent = 'Kelebihan → corebox berikutnya';
      els.outOver.textContent = `+${stFmtLen(calc.trayExcess, unit)}`;
    } else if (calc.trayLoss > REC_EPS) {
      els.outOverLabel.textContent = 'Panjang kurang dari interval';
      els.outOver.textContent = `−${stFmtLen(calc.trayLoss, unit)}`;
    } else {
      els.outOverLabel.textContent = 'Kelebihan / kekurangan panjang';
      els.outOver.textContent = '—';
    }
    els.outFactor.textContent = calc.expansion === null ? '—' : `${recFmt(calc.expansion, 2)}×`;

    els.detailBody.innerHTML = calc.perLayer.map((p, k) => {
      const lab = layers[k].label;
      const cls = p.type === 'HM' ? 'hm' : 'sm';
      return `<tr><td><span class="st-chip ${cls}">${lab}</span></td>` +
             `<td>${stFmtLen(p.measured, unit)}</td>` +
             `<td>${stFmtLen(p.actual, unit)}</td>` +
             `<td>${stTagHtml(p, unit)}</td></tr>`;
    }).join('');

    if (!calc.hasSM) setStatus(null, 'BELUM ADA LAPISAN SM');
    else if (calc.status === 'swelling') setStatus('ready', 'SWELLING SM TERDETEKSI');
    else if (calc.status === 'loss') setStatus('ready', 'ADA CORE LOSS SM');
    else setStatus('ready', 'SM PAS');
  }

  function pushUndo(items) {
    undoStack.push(items);
    if (undoStack.length > 30) undoStack.shift();
  }
  function addRow() {
    if (rows.length >= ST_MAX_LAYERS) { showNote(`Jumlah lapisan maksimum ${ST_MAX_LAYERS}.`); return; }
    rows.push({ type: rows.length ? opposite(rows[rows.length - 1].type) : 'HM', value: '' });
    render(rows.length - 1);
  }
  function insertAfter(i) {
    if (rows.length >= ST_MAX_LAYERS) { showNote(`Jumlah lapisan maksimum ${ST_MAX_LAYERS}.`); return; }
    rows.splice(i + 1, 0, { type: opposite(rows[i].type), value: '' });
    render(i + 1);
  }
  function removeAt(i) {
    if (rows.length <= 1) { showNote('Minimal harus ada 1 lapisan.'); return; }
    const [row] = rows.splice(i, 1);
    pushUndo([{ index: i, row }]);
    render(Math.min(i, rows.length - 1));
  }
  function undo() {
    const items = undoStack.pop();
    if (!items) return;
    items.forEach(({ index, row }) => rows.splice(Math.min(index, rows.length), 0, row));
    render(Math.min(items[0].index, rows.length - 1));
  }
  function clearAll() {
    rows.forEach((r, i) => { r.value = ''; refs[i].input.value = ''; });
    updateAll();
  }
  function changeUnit() {
    const next = els.unit.value;
    if (next === currentUnit) return;
    const mult = next === 'cm' ? 100 : 0.01;
    const convert = (r) => {
      if (/^\s*[0-9]+(?:[.,][0-9]+)?\s*$/.test(r.value)) {
        r.value = String(recRound(Number(r.value.trim().replace(',', '.')) * mult, 4)).replace('.', ',');
      }
    };
    rows.forEach(convert);
    undoStack.forEach((items) => items.forEach(({ row }) => convert(row)));
    rows.forEach((r, i) => { refs[i].input.value = r.value; });
    currentUnit = next;
    updateAll();
  }

  els.addBtn.addEventListener('click', addRow);
  els.removeBtn.addEventListener('click', () => removeAt(rows.length - 1));
  els.undoBtn.addEventListener('click', undo);
  els.clearBtn.addEventListener('click', clearAll);
  els.unit.addEventListener('change', changeUnit);
  els.basis.addEventListener('change', updateAll);

  els.body.addEventListener('input', (e) => {
    if (!e.target.classList.contains('sample-input')) return;
    const i = Number(e.target.closest('tr').dataset.idx);
    rows[i].value = e.target.value;
    updateAll();
  });
  els.body.addEventListener('click', (e) => {
    const tb = e.target.closest ? e.target.closest('button.type-btn') : null;
    if (tb) {
      const i = Number(tb.closest('tr').dataset.idx);
      rows[i].type = tb.dataset.type;
      updateAll();
      return;
    }
    const btn = e.target.closest ? e.target.closest('button[data-act]') : null;
    if (!btn || btn.disabled) return;
    const i = Number(btn.closest('tr').dataset.idx);
    if (btn.dataset.act === 'insert') insertAfter(i);
    else if (btn.dataset.act === 'remove') removeAt(i);
  });
  els.body.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.classList.contains('sample-input')) return;
    e.preventDefault();
    const i = Number(e.target.closest('tr').dataset.idx);
    if (i < rows.length - 1) refs[i + 1].input.focus();
    else {
      const v = parseSample(rows[i].value, els.unit.value);
      if (v !== null && !Number.isNaN(v)) addRow();
    }
  });

  render();
}

/* ==========================================================
   4. NAVIGASI
   ========================================================== */
function initNav() {
  const PAGES = {
    stickup:  { title: 'Get S(t)ick — Kalkulator Pengeboran Nikel Laterit' },
    recovery: { title: 'Recovery Sample — Get S(t)ick' },
    sampleturn: { title: 'Sample Turn — Get S(t)ick' },
  };
  const DEFAULT_PAGE = 'stickup';
  const links = document.querySelectorAll('.nav-link[data-page]');
  if (links.length === 0) return;

  function showPage() {
    let key = window.location.hash.replace('#', '');
    if (!PAGES[key]) key = DEFAULT_PAGE;

    Object.keys(PAGES).forEach((k) => {
      const el = document.getElementById('page-' + k);
      if (el) el.hidden = (k !== key);
    });
    links.forEach((a) => {
      const active = a.dataset.page === key;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = PAGES[key].title;
  }

  window.addEventListener('hashchange', showPage);
  showPage();
}

/* ==========================================================
   5. BOOTSTRAP
   ========================================================== */
function bootstrap() {
  initStickUpUI();
  initRecoveryUI();
  initSampleTurnUI();
  initNav();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}

/* Untuk keperluan unit test (Node/Jest) */
if (typeof module !== 'undefined') {
  module.exports = {
    simulateStickUp,
    parseSample, intervalResult, generateRows, makeRow, renumber, summarize,
    scaleExtent, laneGeometry, laneHtml, rulerHtml,
    stCalc, stBoxes, stFmtNum, stFmtLen,
  };
}