/* ==========================================================
   RECOVERY SAMPLE — satu kolom isian per interval, jumlah
   interval fleksibel (tambah, kurangi, sisipkan, hapus)

   Aturan (1 interval = 1 m = 100 %):
   - Sampel ≥ interval (pas / swelling) → Rec = 100 %
   - Sampel < interval (core loss):
         Loss = Interval − Sampel
         Rec  = 100 % − (Loss ÷ Pembagi × 100 %)
     Pembagi dapat dipilih: "Core aktual" (panjang sampel yang
     terambil) atau "Interval". Rec dibatasi minimum 0 %.
   - Rec rata-rata = Σ (Rec × panjang interval) ÷ Σ panjang interval
     (sama dengan rata-rata biasa bila semua interval 1 m)
   - Swelling tidak menutupi loss di interval lain.
   ========================================================== */

const EPS = 1e-9;
const INTERVAL = 1;       // meter
const MAX_INTERVALS = 500;

/* ---------- fungsi murni (tanpa DOM) ---------- */
function round(n, d) {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
}

function fmtN(n, d) {
  if (d === undefined) d = 2;
  return n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/*
  Baca panjang sampel dan kembalikan dalam METER.
  "85"     -> satuan bawaan (cm / m sesuai pilihan)
  "85cm"   -> 0.85
  "1,25m"  -> 1.25
  kosong   -> null ; tidak valid -> NaN
*/
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

/* intervalLen & sampleLen dalam meter; basis: 'core' | 'interval' */
function intervalResult(intervalLen, sampleLen, basis) {
  const diff = sampleLen - intervalLen;
  if (diff >= -EPS) {
    return {
      recovery: 100,
      status: diff > EPS ? 'swelling' : 'full',
      loss: 0,
      excess: Math.max(0, diff),
      lossPct: 0,
    };
  }
  const loss = intervalLen - sampleLen;
  const base = basis === 'interval' ? intervalLen : sampleLen;
  const lossPct = base > EPS ? (loss / base) * 100 : Infinity;
  const recovery = Math.max(0, 100 - lossPct);
  return { recovery, status: 'loss', loss, excess: 0, lossPct };
}

/* Satu baris interval; from/to diisi ulang oleh renumber() */
function makeRow(index, value) {
  return {
    value: value || '', len: INTERVAL,
    from: index * INTERVAL, to: (index + 1) * INTERVAL,
    sample: null, result: null,
  };
}

function renumber(rows) {
  rows.forEach((r, i) => { r.from = i * INTERVAL; r.to = (i + 1) * INTERVAL; });
}

function generateRows(n) {
  const list = [];
  for (let i = 0; i < n; i++) list.push(makeRow(i));
  return list;
}

/* Ringkasan hanya dari baris yang terisi dan valid */
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

/* ---------- UI ---------- */
function initUI() {
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
  };

  let rows = generateRows(5);
  let refs = [];
  let undoStack = [];           // tiap entri: [{ index, row }, ...]
  let currentUnit = els.unit.value;

  function setStatus(state, text) {
    els.statusLamp.classList.remove('ready', 'error');
    if (state) els.statusLamp.classList.add(state);
    els.statusText.textContent = text;
  }

  function showNote(msg) {
    els.errorBox.hidden = false;
    els.errorBox.textContent = msg;
  }
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

  /* Bangun ulang seluruh tabel dari `rows` (nilai input ikut terbawa) */
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

    t.tdRead.textContent = `${fmtN(sample)} m`;
    t.recText.textContent = `${fmtN(res.recovery, 2)} %`;
    t.barFill.style.width = `${Math.min(100, res.recovery)}%`;

    if (res.status === 'full') {
      t.barFill.className = 'ok';
      setStatusTag(t.tdStatus, 'st-full', 'Penuh');
    } else if (res.status === 'swelling') {
      t.barFill.className = 'ok';
      setStatusTag(t.tdStatus, 'st-swell', `Swelling +${fmtN(res.excess)} m`);
    } else {
      setStatusTag(t.tdStatus, 'st-loss', `Loss −${fmtN(res.loss)} m (${fmtN(res.lossPct, 1)}%)`);
    }
  }

  function updateSummary() {
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
    els.outRecovery.textContent = fmtN(s.recovery, 2);
    els.outRecoverySub.textContent = `% rata-rata dari ${fmtN(s.sumLen)} m terisi`;
    els.outLossTotal.textContent = fmtN(s.lossTotal);
    els.outFilled.textContent = `${s.filled} / ${s.totalRows}`;
    els.outFull.textContent = `${s.full} interval`;
    els.outSwell.textContent = `${s.swelling} interval (+${fmtN(s.swellExcess)} m)`;
    els.outLossCount.textContent = `${s.loss} interval (−${fmtN(s.lossTotal)} m)`;
    els.outCore.textContent = `${fmtN(s.coreTotal)} m`;
    els.outLowest.textContent = `${fmtN(s.lowest.recovery, 2)} % @ ${s.lowest.from}–${s.lowest.to} m`;
    setStatus('ready', s.filled === s.totalRows ? 'SEMUA INTERVAL TERISI' : 'SEBAGIAN TERISI');
  }

  function updateAll() {
    rows.forEach((_, i) => updateRow(i));
    updateSummary();
  }

  /* ---- ubah jumlah interval ---- */
  function pushUndo(items) {
    undoStack.push(items);
    if (undoStack.length > 30) undoStack.shift();
  }

  function addRow() {
    if (rows.length >= MAX_INTERVALS) {
      showNote(`Jumlah interval maksimum ${MAX_INTERVALS}.`);
      return;
    }
    clearNote();
    rows.push(makeRow(rows.length));
    render(rows.length - 1);
  }

  function insertAfter(i) {
    if (rows.length >= MAX_INTERVALS) {
      showNote(`Jumlah interval maksimum ${MAX_INTERVALS}.`);
      return;
    }
    clearNote();
    rows.splice(i + 1, 0, makeRow(i + 1));
    render(i + 1);
  }

  function removeAt(i) {
    if (rows.length <= 1) {
      showNote('Minimal harus ada 1 interval.');
      return;
    }
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

  /* ---- aksi isian ---- */
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

  /* Ganti satuan bawaan: angka tanpa suffix ikut dikonversi agar
     panjang fisiknya tidak berubah. Angka ber-suffix tidak disentuh. */
  function changeUnit() {
    const next = els.unit.value;
    if (next === currentUnit) return;
    const mult = next === 'cm' ? 100 : 0.01;
    const convert = (r) => {
      if (/^\s*[0-9]+(?:[.,][0-9]+)?\s*$/.test(r.value)) {
        r.value = String(round(Number(r.value.trim().replace(',', '.')) * mult, 4)).replace('.', ',');
      }
    };
    rows.forEach(convert);
    // baris yang sedang tersimpan di tumpukan urungkan ikut dikonversi
    undoStack.forEach((items) => items.forEach(({ row }) => convert(row)));
    rows.forEach((r, i) => { refs[i].input.value = r.value; });
    currentUnit = next;
    updateAll();
  }

  /* ---- event ---- */
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

  /* Enter = ke interval berikutnya; di interval terakhir yang sudah
     terisi valid, Enter menambah interval baru (praktis saat kedalaman
     belum pasti) */
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

if (typeof document !== 'undefined') initUI();
if (typeof module !== 'undefined') {
  module.exports = { intervalResult, generateRows, makeRow, renumber, summarize, parseSample };
}
