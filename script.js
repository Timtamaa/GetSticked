function calculateStickUp() {
  // Ambil nilai dari form
  const pipeTypeSelect = document.getElementById('pipeType');
  const L = parseFloat(pipeTypeSelect.value); // 3 atau 1.5

  const n = parseInt(document.getElementById('rodCount').value);
  const D = parseFloat(document.getElementById('depth').value);

  const resultElement = document.getElementById('stickUpResult');

  // Validasi input dasar
  if (isNaN(L) || isNaN(n) || isNaN(D)) {
    resultElement.innerText = 'Mohon isi semua kolom dengan angka yang valid.';
    return;
  }

  if (n < 0 || D < 0) {
    resultElement.innerText = 'Jumlah pipa dan kedalaman tidak boleh negatif.';
    return;
  }

  // Rumus: S = (n × L) − D
  const rawStickUp = n * L - D;
  let S = rawStickUp;

  // Terapkan batas maksimum 260
  const maxStickUp = 260;
  if (S > maxStickUp) {
    S = maxStickUp;
  }

  // Bangun pesan hasil
  let message =
    `L (panjang pipa per batang) = ${L.toFixed(2)} m\n` +
    `n (jumlah pipa) = ${n}\n` +
    `D (kedalaman aktual) = ${D.toFixed(2)} m\n` +
    `Stick up (S = n×L − D) = ${rawStickUp.toFixed(2)} m`;

  if (rawStickUp > maxStickUp) {
    message += `\nDibatasi ke maksimum ${maxStickUp} m → nilai yang dipakai: ${S.toFixed(2)} m`;
  } else if (rawStickUp < 0) {
    message += '\nPERINGATAN: Stick up negatif. Cek kembali n, L, dan D (kemungkinan salah input atau referensi kedalaman).';
  }

  // Tampilkan hasil akhir (dengan batas maksimum)
  message += `\n\nStick up final (setelah batas maksimum) = ${S.toFixed(2)} m`;

  resultElement.innerText = message;
}
