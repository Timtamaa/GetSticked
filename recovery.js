/* ==========================================================
   RECOVERY SAMPLE — input panjang sampel aktual per meteran

   Aturan (interval default 1 m = 100 %):
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
const INTERVAL = 1; // meter

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

/* Bagi kedalaman menjadi baris per meter; baris terakhir boleh parsial */
function generateRows(td) {
  const n = Math.ceil(td / INTERVAL - 1e-9);
  const list = [];
  for (let i = 0; i < n; i++) {
    const from = i * INTERVAL;
    const to = round(Math.min((i + 1) * INTERVAL, td), 4);
    list.push({ from, to, len: round(to - from, 4), value: '', sample: null, result: null });
  }
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
    targetDepth: $('recTargetDepth'), unit: $('recUnit'), basis: $('recBasis'),
    buildBtn: $('recBuildBtn'), fillBtn: $('recFillBtn'), clearBtn: $('recClearBtn'),
    errorBox: $('recErrorBox'), statusLamp: $('recStatusLamp'), statusText: $('recStatusText'),
    outRecovery: $('recOutRecovery'), outRecoverySub: $('recOutRecoverySub'),
    outLossTotal: $('recOutLossTotal'),
    outFilled: $('recOutFilled'), outFull: $('recOutFull'), outSwell: $('recOutSwell'),
    outLossCount: $('recOutLossCount'), outCore: $('recOutCore'), outLowest: $('recOutLowest'),
    tableBody: $('recBody'),
  };

  let rows = [];
  let refs = [];
  let currentUnit = els.unit.value;

  function setStatus(state, text) {
    els.statusLamp.classList.remove('ready', 'error');
    if (state) els.statusLamp.classList.add(state);
    els.statusText.textContent = text;
  }

  function showError(msg) {
    els.errorBox.hidden = false;
    els.errorBox.textContent = msg;
    setStatus('error', 'INPUT TIDAK VALID');
  }

  function emptyTable() {
    els.tableBody.innerHTML =
      '<tr><td colspan="5" class="empty-row">Isi kedalaman lalu tekan “Buat Baris Per Meter”.</td></tr>';
  }

  function setStatusTag(td, cls, text) {
    td.innerHTML = '';
    if (!cls) { td.textContent = '—'; td.style.color = 'var(--text-dim)'; return; }
    td.style.color = '';
    const tag = document.createElement('span');
    tag.className = 'event-tag ' + cls;
    tag.textContent = text;
    td.appendChild(tag);
  }

  function buildTable() {
    els.tableBody.innerHTML = '';
    refs = rows.map((r, i) => {
      const tr = document.createElement('tr');

      const tdRange = document.createElement('td');
      tdRange.className = 'meter-cell';
      tdRange.textContent = `${r.from} – ${fmtN(r.to, r.to % 1 === 0 ? 0 : 2)} m`;

      const tdIn = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.className = 'sample-input';
      input.dataset.idx = i;
      input.placeholder = '0';
      input.autocomplete = 'off';
      input.value = r.value;
      input.setAttribute('aria-label', `Panjang sampel meter ${r.from} sampai ${r.to}`);
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

      [tdRange, tdIn, tdRead, tdRec, tdStatus].forEach((td) => tr.appendChild(td));
      els.tableBody.appendChild(tr);
      return { tr, input, tdRead, recText, barFill, tdStatus };
    });
    rows.forEach((_, i) => updateRow(i));
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
    if (s.filled === 0) {
      els.outRecovery.textContent = '—';
      els.outRecoverySub.textContent = rows.length ? 'isi panjang sampel' : 'belum ada data';
      els.outLossTotal.textContent = '—';
      els.outFilled.textContent = rows.length ? `0 / ${rows.length}` : '—';
      els.outFull.textContent = '—';
      els.outSwell.textContent = '—';
      els.outLossCount.textContent = '—';
      els.outCore.textContent = '—';
      els.outLowest.textContent = '—';
      setStatus(null, rows.length ? 'MENUNGGU DATA SAMPEL' : 'MENUNGGU INPUT');
      return;
    }
    els.outRecovery.textContent = fmtN(s.recovery, 2);
    els.outRecoverySub.textContent = `% rata-rata dari ${fmtN(s.sumLen)} m terisi`;
    els.outLossTotal.textContent = fmtN(s.lossTotal);
    els.outFilled.textContent = `${s.filled} / ${s.totalRows}`;
    els.outFull.textContent = `${s.full} meter`;
    els.outSwell.textContent = `${s.swelling} meter (+${fmtN(s.swellExcess)} m)`;
    els.outLossCount.textContent = `${s.loss} meter (−${fmtN(s.lossTotal)} m)`;
    els.outCore.textContent = `${fmtN(s.coreTotal)} m`;
    els.outLowest.textContent = `${fmtN(s.lowest.recovery, 2)} % @ ${s.lowest.from}–${fmtN(s.lowest.to, s.lowest.to % 1 === 0 ? 0 : 2)} m`;
    setStatus('ready', s.filled === s.totalRows ? 'SEMUA METER TERISI' : 'SEBAGIAN TERISI');
  }

  function updateAll() {
    rows.forEach((_, i) => updateRow(i));
    updateSummary();
  }

  /* ---- aksi ---- */
  function build() {
    els.errorBox.hidden = true;
    const raw = String(els.targetDepth.value).trim().replace(',', '.');
    const td = raw === '' ? NaN : Number(raw);
    if (!Number.isFinite(td) || td <= 0) {
      showError('Masukkan kedalaman lubang (meter) yang valid.');
      return;
    }
    if (Math.ceil(td) > 1000) {
      showError('Kedalaman terlalu besar (maks. 1000 m).');
      return;
    }
    const old = new Map(rows.map((r) => [`${r.from}-${r.to}`, r.value]));
    rows = generateRows(td);
    rows.forEach((r) => {
      const prev = old.get(`${r.from}-${r.to}`);
      if (prev !== undefined) r.value = prev;
    });
    buildTable();
    updateSummary();
    if (refs[0]) refs[0].input.focus();
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

  /* Ganti satuan bawaan: angka tanpa suffix ikut dikonversi agar
     panjang fisiknya tidak berubah. Angka ber-suffix tidak disentuh. */
  function changeUnit() {
    const next = els.unit.value;
    if (next === currentUnit) return;
    const mult = next === 'cm' ? 100 : 0.01;
    rows.forEach((r, i) => {
      if (/^\s*[0-9]+(?:[.,][0-9]+)?\s*$/.test(r.value)) {
        const n = Number(r.value.trim().replace(',', '.'));
        r.value = String(round(n * mult, 4)).replace('.', ',');
        refs[i].input.value = r.value;
      }
    });
    currentUnit = next;
    updateAll();
  }

  /* ---- event ---- */
  els.buildBtn.addEventListener('click', build);
  els.fillBtn.addEventListener('click', fillEmptyWithFull);
  els.clearBtn.addEventListener('click', clearAll);
  els.unit.addEventListener('change', changeUnit);
  els.basis.addEventListener('change', updateAll);
  els.targetDepth.addEventListener('keydown', (e) => { if (e.key === 'Enter') build(); });

  els.tableBody.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.classList.contains('sample-input')) return;
    const i = Number(el.dataset.idx);
    rows[i].value = el.value;
    updateRow(i);
    updateSummary();
  });

  /* Enter = pindah ke meteran berikutnya */
  els.tableBody.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.classList.contains('sample-input')) return;
    e.preventDefault();
    const next = refs[Number(e.target.dataset.idx) + 1];
    if (next) next.input.focus();
  });

  emptyTable();
  updateSummary();
}

if (typeof document !== 'undefined') initUI();
if (typeof module !== 'undefined') {
  module.exports = { intervalResult, generateRows, summarize, parseSample };
}
