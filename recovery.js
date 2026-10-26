/* ==========================================================
   RECOVERY SAMPLE — hitung recovery per interval dan per lubang

   Aturan:
   - Sampel = interval          → 100 %
   - Sampel > interval (swelling) → tetap 100 % (kelebihan tidak
                                    dihitung sebagai recovery)
   - Sampel < interval (core loss) → recovery = sampel ÷ interval × 100 %

   Recovery lubang = Σ min(sampel, interval) ÷ Σ interval × 100 %
   (dibobot panjang interval; swelling di satu interval tidak
   menutupi core loss di interval lain)
   ========================================================== */

const EPS = 1e-9;

/* ---------- fungsi murni (tanpa DOM) ---------- */
function round(n, d) {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
}

function fmtN(n, d) {
  if (d === undefined) d = 2;
  return n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/* "1,25" / "1.25" -> 1.25 ; kosong -> null ; bukan angka -> NaN */
function parseNum(str) {
  if (str === undefined || str === null) return null;
  const s = String(str).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/* intervalLen & sampleLen dalam meter */
function intervalResult(intervalLen, sampleLen) {
  const counted = Math.min(sampleLen, intervalLen);
  const diff = sampleLen - intervalLen;
  let status = 'full';
  if (diff > EPS) status = 'swelling';
  else if (diff < -EPS) status = 'loss';
  return {
    counted,
    recovery: (counted / intervalLen) * 100,
    status,
    loss: Math.max(0, intervalLen - sampleLen),
    excess: Math.max(0, diff),
  };
}

/* Bagi kedalaman target menjadi interval; interval terakhir boleh parsial */
function generateRows(td, interval) {
  const n = Math.ceil(td / interval - 1e-9);
  const list = [];
  for (let i = 0; i < n; i++) {
    const from = round(i * interval, 4);
    const to = round(Math.min((i + 1) * interval, td), 4);
    list.push({ from, to, len: round(to - from, 4), value: '', result: null });
  }
  return list;
}

/* Ringkasan hanya dari baris yang sudah terisi dan valid */
function summarize(rows, lowThreshold) {
  const s = {
    totalRows: rows.length, filled: 0, sumLen: 0, sumCounted: 0,
    full: 0, swelling: 0, swellExcess: 0, loss: 0, lossTotal: 0,
    low: 0, lowest: null, recovery: null,
  };
  rows.forEach((r) => {
    const res = r.result;
    if (!res) return;
    s.filled++;
    s.sumLen += r.len;
    s.sumCounted += res.counted;
    if (res.status === 'full') s.full++;
    if (res.status === 'swelling') { s.swelling++; s.swellExcess += res.excess; }
    if (res.status === 'loss') { s.loss++; s.lossTotal += res.loss; }
    if (res.recovery < lowThreshold - EPS) s.low++;
    if (!s.lowest || res.recovery < s.lowest.recovery) {
      s.lowest = { recovery: res.recovery, from: r.from, to: r.to };
    }
  });
  if (s.sumLen > 0) s.recovery = (s.sumCounted / s.sumLen) * 100;
  return s;
}

/* ---------- UI ---------- */
function initUI() {
  const $ = (id) => document.getElementById(id);
  const els = {
    targetDepth: $('targetDepth'), interval: $('interval'), unit: $('unit'),
    lowThreshold: $('lowThreshold'),
    buildBtn: $('buildBtn'), fillBtn: $('fillBtn'), clearBtn: $('clearBtn'),
    errorBox: $('errorBox'), statusLamp: $('statusLamp'), statusText: $('statusText'),
    outRecovery: $('outRecovery'), outRecoverySub: $('outRecoverySub'),
    outLossTotal: $('outLossTotal'),
    outFilled: $('outFilled'), outFull: $('outFull'), outSwell: $('outSwell'),
    outLossCount: $('outLossCount'), outLow: $('outLow'), outLowest: $('outLowest'),
    tableBody: $('recBody'),
  };

  let rows = [];
  let refs = [];
  let currentUnit = 'm';

  const factor = () => (els.unit.value === 'cm' ? 100 : 1);
  const threshold = () => {
    const t = parseNum(els.lowThreshold.value);
    return t === null || Number.isNaN(t) ? 0 : t;
  };

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
      '<tr><td colspan="5" class="empty-row">Isi kedalaman lalu tekan “Buat Tabel Interval”.</td></tr>';
  }

  function buildTable() {
    els.tableBody.innerHTML = '';
    refs = rows.map((r, i) => {
      const tr = document.createElement('tr');

      const tdRange = document.createElement('td');
      tdRange.textContent = `${fmtN(r.from)} – ${fmtN(r.to)}`;

      const tdLen = document.createElement('td');
      tdLen.textContent = `${fmtN(r.len)} m`;

      const tdIn = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.className = 'sample-input';
      input.dataset.idx = i;
      input.placeholder = '0';
      input.value = r.value;
      input.setAttribute('aria-label', `Panjang sampel ${fmtN(r.from)} sampai ${fmtN(r.to)} m`);
      tdIn.appendChild(input);

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

      [tdRange, tdLen, tdIn, tdRec, tdStatus].forEach((td) => tr.appendChild(td));
      els.tableBody.appendChild(tr);
      return { tr, input, recText, barFill, tdStatus };
    });
    rows.forEach((_, i) => updateRow(i));
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

  function updateRow(i) {
    const r = rows[i];
    const t = refs[i];
    t.tr.classList.remove('low');
    t.input.classList.remove('invalid');
    t.barFill.style.width = '0%';
    t.barFill.className = '';

    const raw = parseNum(r.value);
    if (raw === null) {
      r.result = null;
      t.recText.textContent = '—';
      setStatusTag(t.tdStatus, null);
      return;
    }
    if (Number.isNaN(raw) || raw < 0) {
      r.result = null;
      t.input.classList.add('invalid');
      t.recText.textContent = '—';
      setStatusTag(t.tdStatus, 'st-invalid', 'Tidak valid');
      return;
    }

    const res = intervalResult(r.len, raw / factor());
    r.result = res;
    t.recText.textContent = `${fmtN(res.recovery, 1)} %`;
    t.barFill.style.width = `${Math.min(100, res.recovery)}%`;

    if (res.status === 'full') {
      t.barFill.className = 'ok';
      setStatusTag(t.tdStatus, 'st-full', 'Penuh');
    } else if (res.status === 'swelling') {
      t.barFill.className = 'ok';
      setStatusTag(t.tdStatus, 'st-swell', `Swelling +${fmtN(res.excess)} m`);
    } else {
      setStatusTag(t.tdStatus, 'st-loss', `Core loss −${fmtN(res.loss)} m`);
    }
    if (res.recovery < threshold() - EPS) t.tr.classList.add('low');
  }

  function updateSummary() {
    const s = summarize(rows, threshold());
    if (s.filled === 0) {
      els.outRecovery.textContent = '—';
      els.outRecoverySub.textContent = rows.length ? 'isi panjang sampel' : 'belum ada data';
      els.outLossTotal.textContent = '—';
      els.outFilled.textContent = rows.length ? `0 / ${rows.length}` : '—';
      els.outFull.textContent = '—';
      els.outSwell.textContent = '—';
      els.outLossCount.textContent = '—';
      els.outLow.textContent = '—';
      els.outLowest.textContent = '—';
      setStatus(null, rows.length ? 'MENUNGGU DATA SAMPEL' : 'MENUNGGU INPUT');
      return;
    }
    els.outRecovery.textContent = fmtN(s.recovery, 1);
    els.outRecoverySub.textContent = `% dari ${fmtN(s.sumLen)} m terisi`;
    els.outLossTotal.textContent = fmtN(s.lossTotal);
    els.outFilled.textContent = `${s.filled} / ${s.totalRows}`;
    els.outFull.textContent = `${s.full} interval`;
    els.outSwell.textContent = `${s.swelling} interval (+${fmtN(s.swellExcess)} m)`;
    els.outLossCount.textContent = `${s.loss} interval`;
    els.outLow.textContent = `${s.low} interval`;
    els.outLowest.textContent = `${fmtN(s.lowest.recovery, 1)} % @ ${fmtN(s.lowest.from)}–${fmtN(s.lowest.to)} m`;
    if (s.filled === s.totalRows) setStatus('ready', 'SEMUA INTERVAL TERISI');
    else setStatus('ready', 'SEBAGIAN TERISI');
  }

  function updateAll() {
    rows.forEach((_, i) => updateRow(i));
    updateSummary();
  }

  /* ---- aksi ---- */
  function build() {
    els.errorBox.hidden = true;
    const td = parseNum(els.targetDepth.value);
    const interval = parseNum(els.interval.value);
    if (td === null || Number.isNaN(td) || td <= 0) {
      showError('Masukkan kedalaman lubang (meter) yang valid.');
      return;
    }
    if (interval === null || Number.isNaN(interval) || interval <= 0) {
      showError('Interval pengeboran harus lebih besar dari 0.');
      return;
    }
    if (Math.ceil(td / interval) > 2000) {
      showError('Jumlah interval terlalu banyak (maks. 2000). Perbesar interval atau kecilkan kedalaman.');
      return;
    }

    const old = new Map(rows.map((r) => [`${r.from}-${r.to}`, r.value]));
    rows = generateRows(td, interval);
    rows.forEach((r) => {
      const prev = old.get(`${r.from}-${r.to}`);
      if (prev !== undefined) r.value = prev;
    });
    buildTable();
    updateSummary();
  }

  function fillEmptyWithFull() {
    rows.forEach((r, i) => {
      if (parseNum(r.value) === null) {
        r.value = String(round(r.len * factor(), 4)).replace('.', ',');
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
    rows.forEach((r, i) => {
      const n = parseNum(r.value);
      if (n !== null && !Number.isNaN(n)) {
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
  els.lowThreshold.addEventListener('input', updateAll);
  els.targetDepth.addEventListener('keydown', (e) => { if (e.key === 'Enter') build(); });

  els.tableBody.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.classList.contains('sample-input')) return;
    const i = Number(el.dataset.idx);
    rows[i].value = el.value;
    updateRow(i);
    updateSummary();
  });

  /* Enter = pindah ke baris berikutnya (praktis untuk input cepat) */
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
  module.exports = { intervalResult, generateRows, summarize, parseNum };
}
