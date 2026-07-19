function calculateStickUp() {
  // Ambil nilai tipe pipa dari dropdown
  const pipeTypeSelect = document.getElementById('pipeType');
  const rodLength = parseFloat(pipeTypeSelect.value); // 3 atau 1.5

  const rodCount = parseInt(document.getElementById('rodCount').value);
  const md = parseFloat(document.getElementById('md').value);

  if (isNaN(rodLength) || isNaN(rodCount) || isNaN(md)) {
    document.getElementById('stickUpResult').innerText =
      'Mohon isi semua kolom dengan angka yang valid.';
    return;
  }

  const totalString = rodLength * rodCount; // L_string
  const stickUp = totalString - md;        // L_stickup

  let message =
    `Panjang pipa per batang = ${rodLength.toFixed(2)} m\n` +
    `Jumlah pipa = ${rodCount}\n` +
    `Total panjang string = ${totalString.toFixed(2)} m\n` +
    `Stick up (teoritis) = ${stickUp.toFixed(2)} m`;

  if (stickUp < 0) {
    message += '\nPERINGATAN: Stick up negatif. Cek MD, tally pipa, atau referensi elevasi.';
  }

  document.getElementById('stickUpResult').innerText = message;
}

function calculateRodCount() {
  // Ambil nilai tipe pipa dari dropdown Mode 2
  const pipeTypeSelect2 = document.getElementById('pipeType2');
  const rodLength = parseFloat(pipeTypeSelect2.value); // 3 atau 1.5

  const md = parseFloat(document.getElementById('md2').value);
  const stickUpMeasured = parseFloat(document.getElementById('stickUpMeasured').value);

  if (isNaN(rodLength) || isNaN(md) || isNaN(stickUpMeasured)) {
    document.getElementById('rodCountResult').innerText =
      'Mohon isi semua kolom dengan angka yang valid.';
    return;
  }

  const totalString = md + stickUpMeasured;    // L_string
  const nTheoretical = totalString / rodLength;

  let message =
    `Panjang pipa per batang = ${rodLength.toFixed(2)} m\n` +
    `Total panjang string = ${totalString.toFixed(2)} m\n` +
    `Jumlah pipa teoritis = ${nTheoretical.toFixed(2)}\n` +
    `Dibulatkan terdekat = ${Math.round(nTheoretical)}`;

  document.getElementById('rodCountResult').innerText = message;
}
