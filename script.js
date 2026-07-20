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
   ========================================================== */

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
  svg: document.getElementById('stringDiagram'),
};

const SVG_NS = 'http://www.w3.org/2000/svg';

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
  let adjustments = 0;
  while (stickUp < minStickUp && adjustments < 500) {
    nShorter += 1;
    totalPipe += shorter;
    stickUp = totalPipe - pipeNeeded;
    adjustments++;
  }

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
  drawDiagram(null);
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

  if (result.adjustments > 0) {
    els.adjustNote.hidden = false;
    els.adjustNote.textContent = `Disesuaikan otomatis: ditambahkan ${result.adjustments} pipa tipe B (${result.shorterLen.toFixed(1)} m) karena stick up awal berada di bawah batas minimum ${fmt(result.minStickUp)} m.`;
  } else {
    els.adjustNote.hidden = true;
  }

  setStatus('ready', 'PERHITUNGAN SELESAI');
  drawDiagram(result);
}

els.calcBtn.addEventListener('click', runCalculation);
els.targetDepth.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runCalculation();
});

/* ---------- SVG borehole / string diagram ---------- */
function drawDiagram(result) {
  const svg = els.svg;
  svg.innerHTML = '';

  const W = 220, H = 460;
  const groundY = 70;          // fixed ground line position
  const bottomMargin = 20;
  const topMargin = 14;

  // Ground line + label (always drawn)
  addLine(svg, 20, groundY, W - 20, groundY, 'var(--text-muted)', 1.5);
  addText(svg, W - 20, groundY - 8, 'PERMUKAAN TANAH', 'end', 9, 'var(--text-muted)');

  if (!result) {
    addText(svg, W / 2, H / 2, 'Isi kedalaman untuk melihat ilustrasi', 'middle', 10.5, 'var(--text-dim)');
    return;
  }

  const stickUp = Math.max(result.stickUp, 0);
  const segments = buildSegments(result); // ordered top(surface-most) -> bottom(bit)

  // vertical space available below ground for buried segments
  const availBelow = H - groundY - bottomMargin;
  const availAbove = groundY - topMargin;

  const MIN_PX = 16; // minimum px per segment so thin ones stay legible

  // stick-up block (above ground)
  const stickUpPx = stickUp > 0.001 ? Math.max(MIN_PX, Math.min(availAbove, (stickUp / totalPhysicalLength(result)) * (availAbove + availBelow))) : 0;
  const stickUpY = groundY - stickUpPx;

  if (stickUpPx > 0) {
    drawSegment(svg, 70, stickUpY, 80, stickUpPx, colorFor('stickup'), 'STICK UP');
    addText(svg, W - 20, stickUpY + stickUpPx / 2 + 3, `${fmt(stickUp)} m`, 'end', 10, 'var(--accent-a)', true);
  }

  // buried segments, scaled to fit availBelow with minimum px each
  const totalLenBelow = segments.reduce((s, seg) => s + seg.len, 0);
  const rawScale = availBelow / totalLenBelow;
  let pxHeights = segments.map(seg => Math.max(MIN_PX, seg.len * rawScale));
  const sumPx = pxHeights.reduce((a, b) => a + b, 0);
  if (sumPx > availBelow) {
    const factor = availBelow / sumPx;
    pxHeights = pxHeights.map(h => Math.max(10, h * factor));
  }

  let cursorY = groundY;
  segments.forEach((seg, i) => {
    const h = pxHeights[i];
    drawSegment(svg, 70, cursorY, 80, h, colorFor(seg.type), null);
    if (h > 13) {
      addText(svg, W / 2, cursorY + h / 2 + 3, seg.label, 'middle', 9, '#1B1D1E', true);
    }
    cursorY += h;
  });

  // bit marker at bottom
  const bitY = cursorY;
  drawBit(svg, 110, bitY);

  // legend
  drawLegend(svg, H - 6);
}

function totalPhysicalLength(result) {
  return result.stickUp + result.totalPipe + result.cb;
}

function buildSegments(result) {
  // Order: rods closest to surface first (arbitrary for illustration),
  // core barrel always last (closest to the bit).
  const segs = [];
  for (let i = 0; i < result.nA; i++) {
    segs.push({ type: 'a', len: result.lenA, label: `${result.lenA.toFixed(1)}m` });
  }
  for (let i = 0; i < result.nB; i++) {
    segs.push({ type: 'b', len: result.lenB, label: `${result.lenB.toFixed(1)}m` });
  }
  segs.push({ type: 'cb', len: result.cb, label: 'CB' });
  return segs;
}

function colorFor(type) {
  switch (type) {
    case 'stickup': return '#F2B705';
    case 'a': return '#C4622D';
    case 'b': return '#8A4A2A';
    case 'cb': return '#8D9497';
    default: return '#666';
  }
}

function drawSegment(svg, x, y, w, h, fill, label) {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', w);
  rect.setAttribute('height', Math.max(h - 1.5, 1));
  rect.setAttribute('fill', fill);
  rect.setAttribute('stroke', '#1B1D1E');
  rect.setAttribute('stroke-width', '1');
  rect.setAttribute('rx', '1.5');
  svg.appendChild(rect);
}

function drawBit(svg, cx, y) {
  const tri = document.createElementNS(SVG_NS, 'polygon');
  const points = `${cx - 20},${y} ${cx + 20},${y} ${cx},${y + 16}`;
  tri.setAttribute('points', points);
  tri.setAttribute('fill', '#F2B705');
  svg.appendChild(tri);
}

function addLine(svg, x1, y1, x2, y2, stroke, width) {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.setAttribute('stroke', stroke.startsWith('var') ? getComputedColor(stroke) : stroke);
  line.setAttribute('stroke-width', width);
  line.setAttribute('stroke-dasharray', '4 3');
  svg.appendChild(line);
}

function addText(svg, x, y, text, anchor, size, fill, bold) {
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', x);
  t.setAttribute('y', y);
  t.setAttribute('text-anchor', anchor);
  t.setAttribute('font-size', size);
  t.setAttribute('font-family', "'JetBrains Mono', monospace");
  t.setAttribute('fill', fill.startsWith('var') ? getComputedColor(fill) : fill);
  if (bold) t.setAttribute('font-weight', '700');
  t.textContent = text;
  svg.appendChild(t);
}

function drawLegend(svg, y) {
  const items = [
    { c: '#F2B705', l: 'Stick up' },
    { c: '#C4622D', l: 'Pipa A' },
    { c: '#8A4A2A', l: 'Pipa B' },
    { c: '#8D9497', l: 'Core barrel' },
  ];
  let x = 14;
  items.forEach(item => {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y - 8);
    rect.setAttribute('width', 8);
    rect.setAttribute('height', 8);
    rect.setAttribute('fill', item.c);
    rect.setAttribute('rx', 1.5);
    svg.appendChild(rect);
    addText(svg, x + 12, y, item.l, 'start', 8, '#8D9497');
    x += item.l.length * 5.4 + 26;
  });
}

function getComputedColor(varRef) {
  const varName = varRef.match(/--[a-zA-Z-]+/)[0];
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#888';
}

/* initial empty diagram */
drawDiagram(null);
