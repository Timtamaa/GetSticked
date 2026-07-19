function calculateStickUp() {
  const pipeTypeSelect = document.getElementById('pipeType');
  const L = parseFloat(pipeTypeSelect.value); // 3 atau 1.5

  const n = parseInt(document.getElementById('rodCount').value);
  const D = parseFloat(document.getElementById('depth').value);

  const resultElement = document.getElementById('stickUpResult');

  // Validasi dasar
  if (isNaN(L) || isNaN(n) || isNaN(D)) {
    resultElement.innerText = 'Mohon isi semua kolom (L, n, D) dengan angka yang valid.';
    return;
  }

  if (n < 0 || D < 0) {
    resultElement.innerText = 'n dan D tidak boleh bernilai negatif.';
    return;
  }

  // Rumus: S = (n × L) − D
  const rawS = n * L - D;
  const maxStickUp = 260;
  let S = rawS;

  if (S > maxStickUp) {
    S = maxStickUp;
  }

  // Susun teks hasil
  let message =
    `Input:\n` +
    `• L (jenis pipa) = ${L.toFixed(2)} m\n` +
    `• n (jumlah pipa) = ${n}\n` +
    `• D (kedalaman aktual) = ${D.toFixed(2)} m\n\n` +
    `Perhitungan:\n` +
    `S = (n × L) − D\n` +
    `S = (${n} × ${L.toFixed(2)}) − ${D.toFixed(2)} = ${rawS.toFixed(2)} m\n`;

  if (rawS > maxStickUp) {
    message +=
      `\nNilai S melebihi batas maksimum ${maxStickUp} m, ` +
      `maka S dipotong menjadi ${S.toFixed(2)} m.`;
  } else if (rawS < 0) {
    message +=
      `\nPERINGATAN: S negatif. Cek kembali n, L, dan D ` +
      `(mungkin ada salah input atau referensi kedalaman).`;
  }

  message += `\n\nStick up (S) yang digunakan = ${S.toFixed(2)} m`;

  resultElement.innerText = message;
}
