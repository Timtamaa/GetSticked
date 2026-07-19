function calculateStickUp() {
  // Ambil nilai input
  const n1 = parseInt(document.getElementById('rodCount3').value);
  const n2 = parseInt(document.getElementById('rodCount15').value);
  const D = parseFloat(document.getElementById('depth').value);

  const resultElement = document.getElementById('stickUpResult');

  // Validasi
  if (isNaN(n1) || isNaN(n2) || isNaN(D)) {
    resultElement.innerText = 'Mohon isi semua kolom (n₁, n₂, D) dengan angka yang valid.';
    resultElement.className = 'result-text';
    return;
  }

  if (n1 < 0 || n2 < 0 || D < 0) {
    resultElement.innerText = 'Nilai tidak boleh negatif.';
    resultElement.className = 'result-text';
    return;
  }

  // Konstanta
  const PANJANG_BARREL = 2.60;
  const BATAS_AMAN = 2.60; // batas untuk S? atau untuk stick up di atas barrel? kita pakai untuk S

  // Hitung total panjang pipa
  const totalPanjangPipa = n1 * 3 + n2 * 1.5;

  // Hitung S
  const S = totalPanjangPipa - D + PANJANG_BARREL;

  // Susun pesan hasil
  let message =
    `Input:\n` +
    `• n₁ (pipa 3m) = ${n1}\n` +
    `• n₂ (pipa 1.5m) = ${n2}\n` +
    `• D (kedalaman) = ${D.toFixed(2)} m\n\n` +
    `Perhitungan:\n` +
    `Total panjang pipa = (${n1} × 3) + (${n2} × 1.5) = ${totalPanjangPipa.toFixed(2)} m\n` +
    `S = total panjang pipa − D + barrel\n` +
    `S = ${totalPanjangPipa.toFixed(2)} − ${D.toFixed(2)} + ${PANJANG_BARREL.toFixed(2)} = ${S.toFixed(2)} m\n`;

  // Peringatan jika S > batas aman atau negatif
  let isWarning = false;
  if (S > BATAS_AMAN) {
    isWarning = true;
    message += `\n⚠️ PERINGATAN: Stick up (S) = ${S.toFixed(2)} m melebihi batas aman ${BATAS_AMAN} m. Periksa kembali input.`;
  } else if (S < 0) {
    isWarning = true;
    message += `\n⚠️ PERINGATAN: S negatif (${S.toFixed(2)} m). Cek kembali kedalaman atau jumlah pipa.`;
  }

  message += `\n\nStick up (S) yang digunakan = ${S.toFixed(2)} m`;

  resultElement.innerText = message;
  resultElement.className = 'result-text' + (isWarning ? ' warning-text' : '');
}
