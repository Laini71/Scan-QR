/* ============================================================
   SISTEM PENGAGIHAN SUSU QR SK TUN FUAD 2026
   FRONTEND - GITHUB PAGES
============================================================ */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';


let html5QrCode = null;
let scannerRunning = false;
let processing = false;

let lastQr = '';
let lastQrTime = 0;


/* ============================================================
   APABILA HALAMAN DIBUKA
============================================================ */

window.addEventListener('load', function () {
  checkSystem();
});


/* ============================================================
   HUBUNGI GOOGLE APPS SCRIPT MENGGUNAKAN JSONP
============================================================ */

function callAppsScript(params) {

  return new Promise(function (resolve, reject) {

    const callbackName =
      'sktfCallback_' +
      Date.now() +
      '_' +
      Math.floor(Math.random() * 100000);


    const script =
      document.createElement('script');


    let finished = false;


    const timeout =
      setTimeout(function () {

        if (finished) {
          return;
        }

        finished = true;

        cleanup();

        reject(
          new Error(
            'Server tidak memberi respons.'
          )
        );

      }, 15000);


    window[callbackName] =
      function (result) {

        if (finished) {
          return;
        }

        finished = true;

        clearTimeout(timeout);

        cleanup();

        resolve(result);

      };


    function cleanup() {

      try {
        delete window[callbackName];
      } catch (error) {
        window[callbackName] = undefined;
      }


      if (
        script &&
        script.parentNode
      ) {

        script.parentNode.removeChild(
          script
        );

      }

    }


    const query =
      new URLSearchParams();


    Object.keys(params).forEach(
      function (key) {

        query.set(
          key,
          String(params[key])
        );

      }
    );


    query.set(
      'callback',
      callbackName
    );


    query.set(
      '_',
      Date.now()
    );


    script.src =
      APPS_SCRIPT_URL +
      '?' +
      query.toString();


    script.onerror =
      function () {

        if (finished) {
          return;
        }

        finished = true;

        clearTimeout(timeout);

        cleanup();

        reject(
          new Error(
            'Tidak dapat menghubungi Google Apps Script.'
          )
        );

      };


    document.body.appendChild(
      script
    );

  });

}


/* ============================================================
   SEMAK SAMBUNGAN SISTEM
============================================================ */

async function checkSystem() {

  const dot =
    document.getElementById(
      'systemDot'
    );


  const status =
    document.getElementById(
      'systemStatus'
    );


  if (!dot || !status) {
    return;
  }


  try {

    const result =
      await callAppsScript({
        action: 'ping'
      });


    if (
      result &&
      result.success
    ) {

      dot.className =
        'dot online';


      status.innerText =
        'Sistem online dan sedia digunakan';

    }

    else {

      throw new Error(
        result && result.message
          ? result.message
          : 'Server tidak dapat dihubungi.'
      );

    }

  }

  catch (error) {

    console.error(
      'PING ERROR:',
      error
    );


    dot.className =
      'dot offline';


    status.innerText =
      'Tidak dapat menghubungi server';

  }

}


/* ============================================================
   MULAKAN SCANNER QR
============================================================ */

async function startScanner() {

  if (scannerRunning) {
    return;
  }


  hideResult();


  const btnStart =
    document.getElementById(
      'btnStart'
    );


  const btnStop =
    document.getElementById(
      'btnStop'
    );


  try {

    if (
      typeof Html5Qrcode ===
      'undefined'
    ) {

      throw new Error(
        'Library QR Scanner tidak berjaya dimuatkan.'
      );

    }


    /*
     * Browser akan meminta kebenaran kamera di sini.
     */
    const cameras =
      await Html5Qrcode.getCameras();


    if (
      !cameras ||
      cameras.length === 0
    ) {

      throw new Error(
        'Tiada kamera dikesan pada peranti ini.'
      );

    }


    console.log(
      'Senarai kamera:',
      cameras
    );


    /*
     * Pilih kamera belakang jika telefon mempunyai
     * lebih daripada satu kamera.
     */
    let selectedCamera =
      cameras[0];


    const rearCamera =
      cameras.find(
        function (camera) {

          const label =
            String(
              camera.label || ''
            ).toLowerCase();


          return (
            label.includes('back') ||
            label.includes('rear') ||
            label.includes('environment')
          );

        }
      );


    if (rearCamera) {

      selectedCamera =
        rearCamera;

    }


    console.log(
      'Kamera dipilih:',
      selectedCamera
    );


    /*
     * Bersihkan scanner lama jika ada.
     */
    if (html5QrCode) {

      try {
        await html5QrCode.clear();
      } catch (error) {
        console.log(error);
      }

    }


    html5QrCode =
      new Html5Qrcode(
        'reader'
      );


    const config = {

      fps: 10,

      qrbox:
        function (
          viewfinderWidth,
          viewfinderHeight
        ) {

          const minimumEdge =
            Math.min(
              viewfinderWidth,
              viewfinderHeight
            );


          let qrboxSize =
            Math.floor(
              minimumEdge * 0.72
            );


          if (qrboxSize > 280) {
            qrboxSize = 280;
          }


          if (qrboxSize < 180) {
            qrboxSize = 180;
          }


          return {

            width: qrboxSize,

            height: qrboxSize

          };

        },

      aspectRatio: 1.0

    };


    await html5QrCode.start(

      selectedCamera.id,

      config,

      onScanSuccess,

      onScanFailure

    );


    scannerRunning =
      true;


    if (btnStart) {
      btnStart.disabled = true;
    }


    if (btnStop) {
      btnStop.disabled = false;
    }

  }

  catch (error) {

    console.error(
      'CAMERA ERROR:',
      error
    );


    scannerRunning =
      false;


    if (btnStart) {
      btnStart.disabled = false;
    }


    if (btnStop) {
      btnStop.disabled = true;
    }


    let message =
      'Kamera tidak dapat dibuka.';


    const errorName =
      String(
        error && error.name
          ? error.name
          : ''
      );


    const errorText =
      String(
        error &&
        (
          error.message ||
          error
        )
          ? (
              error.message ||
              error
            )
          : ''
      );


    if (
      errorName === 'NotAllowedError' ||
      errorText
        .toLowerCase()
        .includes('permission')
    ) {

      message =
        'Kebenaran kamera belum diberikan. Sila pilih Allow / Benarkan kamera untuk laman ini.';

    }

    else if (
      errorName === 'NotFoundError'
    ) {

      message =
        'Tiada kamera dikesan pada peranti ini.';

    }

    else if (
      errorName === 'NotReadableError'
    ) {

      message =
        'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain yang menggunakan kamera.';

    }

    else if (errorText) {

      message =
        'Kamera tidak dapat dibuka: ' +
        errorText;

    }


    showError(
      message
    );

  }

}


/* ============================================================
   HENTIKAN SCANNER
============================================================ */

async function stopScanner() {

  if (
    !scannerRunning ||
    !html5QrCode
  ) {

    return;

  }


  try {

    await html5QrCode.stop();


    try {
      await html5QrCode.clear();
    } catch (error) {
      console.log(error);
    }

  }

  catch (error) {

    console.error(
      'STOP CAMERA ERROR:',
      error
    );

  }


  scannerRunning =
    false;

  html5QrCode =
    null;


  const btnStart =
    document.getElementById(
      'btnStart'
    );


  const btnStop =
    document.getElementById(
      'btnStop'
    );


  if (btnStart) {
    btnStart.disabled = false;
  }


  if (btnStop) {
    btnStop.disabled = true;
  }

}


/* ============================================================
   QR BERJAYA DIBACA
============================================================ */

function onScanSuccess(
  decodedText
) {

  if (processing) {
    return;
  }


  const qr =
    String(
      decodedText || ''
    ).trim();


  if (!qr) {
    return;
  }


  const now =
    Date.now();


  /*
   * Elak QR sama dihantar berkali-kali dalam masa 4 saat.
   */
  if (
    qr === lastQr &&
    (
      now -
      lastQrTime
    ) < 4000
  ) {

    return;

  }


  lastQr =
    qr;


  lastQrTime =
    now;


  console.log(
    'QR dikesan:',
    qr
  );


  processQr(
    qr
  );

}


/* ============================================================
   SCAN FAILURE
   Dibiarkan kosong supaya tidak spam error semasa kamera
   masih mencari QR.
============================================================ */

function onScanFailure(error) {
}


/* ============================================================
   UJIAN MANUAL
============================================================ */

function manualScan() {

  const input =
    document.getElementById(
      'manualQr'
    );


  if (!input) {
    return;
  }


  const qr =
    String(
      input.value || ''
    ).trim();


  if (!qr) {

    showError(
      'Sila masukkan QR ID murid.'
    );

    return;

  }


  processQr(
    qr
  );

}


/* ============================================================
   PROSES QR
============================================================ */

async function processQr(
  qrId
) {

  if (processing) {
    return;
  }


  processing =
    true;


  hideResult();


  const loading =
    document.getElementById(
      'loadingBox'
    );


  if (loading) {

    loading.classList.remove(
      'hidden'
    );

  }


  try {

    const result =
      await callAppsScript({

        action:
          'scan',

        qrId:
          qrId,

        teacherName:
          'GURU SKTF',

        device:
          navigator.userAgent ||
          'GITHUB PAGES'

      });


    console.log(
      'SERVER RESULT:',
      result
    );


    displayResult(
      result
    );

  }

  catch (error) {

    console.error(
      'SCAN SERVER ERROR:',
      error
    );


    showError(
      error.message ||
      'Gagal menghubungi server.'
    );

  }

  finally {

    processing =
      false;


    if (loading) {

      loading.classList.add(
        'hidden'
      );

    }

  }

}


/* ============================================================
   PAPAR KEPUTUSAN
============================================================ */

function displayResult(
  result
) {

  const box =
    document.getElementById(
      'resultBox'
    );


  if (!box) {
    return;
  }


  box.className =
    'result';


  /*
   * BERJAYA
   */
  if (
    result &&
    result.status ===
    'SUCCESS'
  ) {

    box.classList.add(
      'result-success'
    );


    setText(
      'resultIcon',
      '✅'
    );


    setText(
      'resultTitle',
      'SUSU BERJAYA DIBERIKAN'
    );


    setText(
      'studentName',
      result.student
        ? result.student.name
        : ''
    );


    setText(
      'studentClass',
      result.student
        ? 'Kelas: ' +
          result.student.className
        : ''
    );


    setText(
      'resultTime',
      'Masa: ' +
      (
        result.time ||
        '-'
      )
    );


    setText(
      'resultMessage',
      '🥛 Pengagihan telah direkodkan.'
    );

  }


  /*
   * SUDAH AMBIL
   */
  else if (
    result &&
    result.status ===
    'DUPLICATE'
  ) {

    box.classList.add(
      'result-duplicate'
    );


    setText(
      'resultIcon',
      '⚠️'
    );


    setText(
      'resultTitle',
      'SUSU SUDAH DIAMBIL'
    );


    setText(
      'studentName',
      result.student
        ? result.student.name
        : ''
    );


    setText(
      'studentClass',
      result.student
        ? 'Kelas: ' +
          result.student.className
        : ''
    );


    setText(
      'resultTime',
      'Masa pengambilan pertama: ' +
      (
        result.firstDistributionTime ||
        '-'
      )
    );


    setText(
      'resultMessage',
      'Pengambilan kali kedua tidak dibenarkan.'
    );

  }


  /*
   * ERROR / QR TIDAK SAH
   */
  else {

    box.classList.add(
      'result-error'
    );


    setText(
      'resultIcon',
      '❌'
    );


    setText(
      'resultTitle',
      'SCAN TIDAK BERJAYA'
    );


    setText(
      'studentName',
      ''
    );


    setText(
      'studentClass',
      ''
    );


    setText(
      'resultTime',
      ''
    );


    setText(
      'resultMessage',
      result &&
      result.message
        ? result.message
        : 'QR tidak sah.'
    );

  }


  box.classList.remove(
    'hidden'
  );


  setTimeout(
    hideResult,
    5000
  );

}


/* ============================================================
   PAPAR ERROR
============================================================ */

function showError(
  message
) {

  displayResult({

    status:
      'ERROR',

    message:
      message

  });

}


/* ============================================================
   SEMBUNYIKAN KEPUTUSAN
============================================================ */

function hideResult() {

  const box =
    document.getElementById(
      'resultBox'
    );


  if (box) {

    box.classList.add(
      'hidden'
    );

  }

}


/* ============================================================
   SET TEKS
============================================================ */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.innerText =
      value || '';

  }

}
