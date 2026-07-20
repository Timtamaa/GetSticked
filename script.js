/* ==========================================================
   STICK-UP GAUGE
   Cut diasumsikan 0 (recovery core sempurna) sesuai skenario:
     TD = Panjang Pipa + CB - Stick Up
     Stick Up = Panjang Pipa + CB - TD
     Panjang Pipa Perlu = TD - CB

   Strategi pemilihan pipa: maksimalkan pipa tipe A (lebih
   panjang) dahulu untuk meminimalkan jumlah sambungan, sisanya
   diisi pipa tipe B, sehingga total panjang pipa >= kebutuhan
   dengan kelebihan (= stick up) sekecil mungkin.

   Penyesuaian praktis: kalau stick up hasil hitung masih di
   bawah batas minimum (default 1.5 m), tambahkan pipa tipe B
   satu per satu (maksimal 2 kali) sampai stick up berada pada
   rentang yang praktis dijepit di lapangan.
   ========================================================== */

const MAX_ADJUSTMENTS = 2;

const els = {
  targetDepth: document.getElementById('targetDepth'),
  calcBtn: document.getElementById('calcBtn'),
  advToggle: document.getElementById('advToggle'),
  advancedPanel: document.getElementById('advancedPanel'),
  cbLength: document.getElementById('cbLength'),
  pipeA: document.getElementById('pipeA'),
  pipeB: document.getElementById('pipeB'),
  minStickUp: document.getElementById('minStickUp'),
  adjustNote: document.getElementById('adjustNote'),
  errorBox: document.getElementById('errorBox'),
  statusLamp: document.getElementById('statusLamp'),
  statusText: document.getElementById('statusText'),
  outStickUp: document.getElementById('outStickUp'),
  outPipeCount: document.getElementById('outPipeCount'),
  outPipeA: document.getElementById('outPipeA'),
  outPipeB: document.getElementById('outPipeB'),
  outCB: document.getElementById('outCB'),
  outTotalString: document.getElementById('outTotalString'),
  pipeALenLabel: document.getElementById('pipeALenLabel'),
  pipeBLenLabel: document.getElementById('pipeBLenLabel'),
};

/* ---------- advanced settings toggle ---------- */
els.advToggle.addEventListener('click', () => {
  const isOpen = els.advancedPanel.classList.toggle('open');
  els.advToggle.textContent = isOpen ? 'Pengaturan lanjutan ⌃' : 'Pengaturan lanjutan ⌄';
});

/* ---------- core calculation ---------- */
function computeStickUp(targetDepth, cb, lenA, lenB, minStickUp) {
  const pipeNeeded = targetDepth - cb;

  if (pipeNeeded <= 0) {
    return { error: `Kedalaman target harus lebih besar dari panjang Core Barrel (${cb} m).` };
  }
  if (lenA <= 0 || lenB <= 0 || cb <= 0) {
    return { error: 'Semua panjang komponen harus lebih besar dari 0.' };
  }
  if (minStickUp < 0 || isNaN(minStickUp)) minStickUp = 0;

  // Prefer pipe A (assumed the longer rod) to minimize joint count.
  const longer = Math.max(lenA, lenB);
  const shorter = Math.min(lenA, lenB);
  const longerIsA = longer === lenA;

  let nLonger = Math.floor(pipeNeeded / longer);
  let remainder = pipeNeeded - nLonger * longer;

  let nShorter = 0;
  if (remainder > 1e-9) {
    nShorter = Math.ceil(remainder / shorter - 1e-9);
  }

  let totalPipe = nLonger * longer + nShorter * shorter;
  let stickUp = totalPipe - pipeNeeded;

  // Practical adjustment: a very short stick up can't be gripped safely
  // in the field, so keep adding one more short pipe until stick up
  // clears the minimum practical threshold (e.g. 0.10 m + 1.5 m pipe -> 1.60 m).
  // Capped at MAX_ADJUSTMENTS — if still short after that, stop and flag it.
  let adjustments = 0;
  while (stickUp < minStickUp && adjustments < MAX_ADJUSTMENTS) {
    nShorter += 1;
    totalPipe += shorter;
    stickUp = totalPipe - pipeNeeded;
    adjustments++;
  }
  const belowMinAfterCap = stickUp < minStickUp;

  const nA = longerIsA ? nLonger : nShorter;
  const nB = longerIsA ? nShorter : nLonger;
  const pipeRods = nA + nB;
  const pipeCount = pipeRods + 1; // Core Barrel counted as 1 component in total pipe count

  return {
    stickUp: round2(stickUp),
    nA, nB,
    pipeRods,
    pipeCount,
    totalPipe: round2(totalPipe),
    cb, lenA, lenB,
    targetDepth,
    minStickUp,
    adjustments,
    belowMinAfterCap,
    shorterLen: shorter,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function fmt(n) {
  return n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------- UI wiring ---------- */
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
  els.outPipeCount.textContent = '—';
  els.outPipeA.textContent = '—';
  els.outPipeB.textContent = '—';
  els.outCB.textContent = '—';
  els.outTotalString.textContent = '—';
  els.adjustNote.hidden = true;
}

function runCalculation() {
  els.errorBox.hidden = true;

  const targetDepth = parseFloat(els.targetDepth.value);
  const cb = parseFloat(els.cbLength.value);
  const lenA = parseFloat(els.pipeA.value);
  const lenB = parseFloat(els.pipeB.value);
  const minStickUp = parseFloat(els.minStickUp.value);

  els.pipeALenLabel.textContent = isNaN(lenA) ? '3.0' : lenA.toFixed(1);
  els.pipeBLenLabel.textContent = isNaN(lenB) ? '1.5' : lenB.toFixed(1);

  if (isNaN(targetDepth) || targetDepth <= 0) {
    showError('Masukkan kedalaman target (meter) terlebih dahulu.');
    return;
  }

  const result = computeStickUp(targetDepth, cb, lenA, lenB, minStickUp);

  if (result.error) {
    showError(result.error);
    return;
  }

  els.outStickUp.textContent = fmt(result.stickUp);
  els.outPipeCount.textContent = result.pipeCount;
  els.outPipeA.textContent = `${result.nA} batang`;
  els.outPipeB.textContent = `${result.nB} batang`;
  els.outCB.textContent = `${fmt(cb)} m`;
  els.outTotalString.textContent = `${fmt(result.totalPipe + cb)} m`;

  if (result.adjustments > 0 && !result.belowMinAfterCap) {
    els.adjustNote.hidden = false;
    els.adjustNote.classList.remove('warn');
    els.adjustNote.textContent = `Disesuaikan otomatis: ditambahkan ${result.adjustments} pipa tipe B (${result.shorterLen.toFixed(1)} m) karena stick up awal berada di bawah batas minimum ${fmt(result.minStickUp)} m.`;
  } else if (result.belowMinAfterCap) {
    els.adjustNote.hidden = false;
    els.adjustNote.classList.add('warn');
    els.adjustNote.textContent = `Sudah ditambahkan ${result.adjustments} pipa tipe B (batas maksimum), tapi stick up (${fmt(result.stickUp)} m) masih di bawah batas minimum ${fmt(result.minStickUp)} m. Cek ulang manual di lapangan.`;
  } else {
    els.adjustNote.hidden = true;
  }

  setStatus('ready', 'PERHITUNGAN SELESAI');
}

els.calcBtn.addEventListener('click', runCalculation);
els.targetDepth.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runCalculation();
});
