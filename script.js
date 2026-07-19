function calculateStickUp() {
  const rodLength = parseFloat(document.getElementById('rodLength').value);
  const rodCount = parseInt(document.getElementById('rodCount').value);
  const md = parseFloat(document.getElementById('md').value);

  if (isNaN(rodLength) || isNaN(rodCount) || isNaN(md)) {
    document.getElementById('stickUpResult').innerText = 'Please fill all fields with valid numbers.';
    return;
  }

  const totalString = rodLength * rodCount; // L_string
  const stickUp = totalString - md;        // L_stickup

  let message = `Total string length = ${totalString.toFixed(2)} m\n` +
                `Stick up (theoretical) = ${stickUp.toFixed(2)} m`;

  if (stickUp < 0) {
    message += '\nWarning: Negative stick up. Check MD, rod tally, or reference elevation.';
  }

  document.getElementById('stickUpResult').innerText = message;
}

function calculateRodCount() {
  const rodLength = parseFloat(document.getElementById('rodLength2').value);
  const md = parseFloat(document.getElementById('md2').value);
  const stickUpMeasured = parseFloat(document.getElementById('stickUpMeasured').value);

  if (isNaN(rodLength) || isNaN(md) || isNaN(stickUpMeasured)) {
    document.getElementById('rodCountResult').innerText = 'Please fill all fields with valid numbers.';
    return;
  }

  const totalString = md + stickUpMeasured;    // L_string
  const nTheoretical = totalString / rodLength;

  let message = `Total string length = ${totalString.toFixed(2)} m\n` +
                `Theoretical rod count = ${nTheoretical.toFixed(2)}`;

  message += `\nRounded rod count (nearest) = ${Math.round(nTheoretical)}`;

  document.getElementById('rodCountResult').innerText = message;
}