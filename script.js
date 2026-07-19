function calculateStickUp() {
  const pipeTypeSelect = document.getElementById('pipeType');
  const L = parseFloat(pipeTypeSelect.value); // 3 atau 1.5

  const n = parseInt(document.getElementById('rodCount').value);
  const D = parseFloat(document.getElementById('depth').value);

  const resultElement = document.getElementById('stickUpResult');

  // Validasi dasar
  if (isNaN(L) || isNaN(n) || isNaN(D)) {
    resultElement.innerText = 'Mohon isi semua kolom (L, n, D) dengan angka yang valid.';
    resultElement.className = 'result-text'; // reset class
    return;
  }

  if (n < 0 || D < 0) {
    resultElement.innerText = 'n dan D tidak boleh bernilai negatif.';
    resultElement.className = 'result-text';
    return;
  }

  // Rumus: S = (n × L) − D
  const rawS = n * L - D;
  const BATAS_AMAN = 2.6;

  // Susun teks hasil (selalu tampilkan nilai asli)
  let message =
    `Input:\n` +
    `• L (jenis pipa) = ${L.toFixed(2)} m\n` +
    `• n (jumlah pipa) = ${n}\n` +
    `• D (kedalaman aktual) = ${D.toFixed(2)} m\n\n` +
    `Perhitungan:\n` +
    `S = (n × L) − D\n` +
    `S = (${n} × ${L.toFixed(2)}) − ${D.toFixed(2)} = ${rawS.toFixed(2)} m\n`;

  // Cek apakah S > 2.6 m → tambahkan peringatan
  let isWarning = false;
  if (rawS > BATAS_AMAN) {
    isWarning = true;
    message +=
      `\n⚠️ PERINGATAN: Stick up (S) = ${rawS.toFixed(2)} m melebihi batas aman ${BATAS_AMAN} m. ` +
      `Periksa kembali input atau lakukan penyesuaian lapangan.`;
  } else if (rawS < 0) {
    message +=
      `\n⚠️ PERINGATAN: S negatif. Cek kembali n, L, dan D ` +
      `(mungkin ada salah input atau referensi kedalaman).`;
  }

  message += `\n\nStick up (S) yang digunakan = ${rawS.toFixed(2)} m`;

  // Tampilkan hasil dengan class tambahan jika peringatan
  resultElement.innerText = message;
  resultElement.className = 'result-text' + (isWarning ? ' warning-text' : '');
}
