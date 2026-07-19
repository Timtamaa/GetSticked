function calculateStickUp() {
  // Ambil nilai input
  const n1 = parseInt(document.getElementById('rodCount3').value);
  const n2 = parseInt(document.getElementById('rodCount15').value);
  const D = parseFloat(document.getElementById('depth').value);

  const resultElement = document.getElementById('stickUpResult');

  // Validasi: semua harus angka dan tidak negatif
  if (isNaN(n1) || isNaN(n2) || isNaN(D)) {
    resultElement.innerText = 'Mohon isi semua kolom (n₁, n₂, D) dengan angka yang valid.';
    resultElement.className = 'result-text';
    return;
  }

  if (n1 < 0 || n2 < 0 || D < 0) {
    resultElement.innerText = 'n₁, n₂, dan D tidak boleh bernilai negatif.';
    resultElement.className = 'result-text';
    return;
  }

  // Konstanta
  const L1 = 3.0;   // pipa 3m
  const L2 = 1.5;   // pipa 1.5m
  const BARREL = 2.60;

  // Rumus: S = (n1*L1 + n2*L2) - D + BARREL
  const totalPanjangPipa = n1 * L1 + n2 * L2;
  const rawS = totalPanjangPipa - D + BARREL;

  const BATAS_AMAN = 2.6;

  // Susun pesan hasil
  let message =
    `Input:\n` +
    `• n₁ (pipa 3m) = ${n1}\n` +
    `• n₂ (pipa 1.5m) = ${n2}\n` +
    `• D (kedalaman) = ${D.toFixed(2)} m\n` +
    `• Panjang barrel = ${BARREL.toFixed(2)} m\n\n` +
    `Perhitungan:\n` +
    `S = (n₁ × 3.0 + n₂ × 1.5) − D + 2.60\n` +
    `S = (${n1} × 3.0 + ${n2} × 1.5) − ${D.toFixed(2)} + 2.60\n` +
    `S = (${(n1*3.0).toFixed(2)} + ${(n2*1.5).toFixed(2)}) − ${D.toFixed(2)} + 2.60\n` +
    `S = ${totalPanjangPipa.toFixed(2)} − ${D.toFixed(2)} + 2.60 = ${rawS.toFixed(2)} m\n`;

  let isWarning = false;
  if (rawS > BATAS_AMAN) {
    isWarning = true;
    message +=
      `\n⚠️ PERINGATAN: Stick up (S) = ${rawS.toFixed(2)} m melebihi batas aman ${BATAS_AMAN} m. ` +
      `Periksa kembali input atau lakukan penyesuaian lapangan.`;
  } else if (rawS < 0) {
    message +=
      `\n⚠️ PERINGATAN: S negatif. Cek kembali n₁, n₂, dan D ` +
      `(mungkin ada salah input atau referensi kedalaman).`;
  }

  message += `\n\nStick up (S) yang digunakan = ${rawS.toFixed(2)} m`;

  resultElement.innerText = message;
  resultElement.className = 'result-text' + (isWarning ? ' warning-text' : '');
}
