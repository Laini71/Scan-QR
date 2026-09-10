const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';

let allStudents = [];


/* =====================================================
   MULA
===================================================== */

window.addEventListener('load', function () {
  loadStudents();
});


/* =====================================================
   HUBUNGI APPS SCRIPT MELALUI JSONP
===================================================== */

function callAppsScript(params) {

  return new Promise(function (resolve, reject) {

    const callbackName =
      'qrStudents_' +
      Date.now() +
      '_' +
      Math.floor(Math.random() * 100000);

    const script =
      document.createElement('script');

    const timeout =
      setTimeout(function () {

        cleanup();

        reject(
          new Error('Server tidak memberi respons.')
        );

      }, 15000);


    window[callbackName] = function (result) {

      clearTimeout(timeout);

      cleanup();

      resolve(result);

    };


    function cleanup() {

      try {
        delete window[callbackName];
      } catch (e) {}

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

    }


    const query =
      new URLSearchParams();


    Object.keys(params).forEach(function (key) {

      query.set(
        key,
        params[key]
      );

    });


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


    script.onerror = function () {

      clearTimeout(timeout);

      cleanup();

      reject(
        new Error('Gagal menghubungi server.')
      );

    };


    document.body.appendChild(script);

  });

}


/* =====================================================
   AMBIL SENARAI MURID
===================================================== */

async function loadStudents() {

  const status =
    document.getElementById('status');


  try {

    status.innerText =
      '⏳ Sedang mengambil data murid...';


    const result =
      await callAppsScript({
        action: 'students'
      });


    if (
      !result ||
      !result.success
    ) {

      throw new Error(
        result && result.message
          ? result.message
          : 'Tidak dapat mengambil data murid.'
      );

    }


    allStudents =
      result.students || [];


    sortStudents();

    createClassFilter();

    renderStudents(allStudents);


    status.innerText =
      '✅ Jumlah murid aktif: ' +
      allStudents.length;

  }

  catch (error) {

    console.error(error);

    status.innerText =
      '❌ ' +
      error.message;


    document.getElementById('qrGrid').innerHTML =
      '<div class="loading">' +
      'Tidak dapat memuatkan data murid.' +
      '</div>';

  }

}


/* =====================================================
   SUSUN MURID
===================================================== */

function sortStudents() {

  allStudents.sort(function (a, b) {

    const classCompare =
      String(a.className || '')
        .localeCompare(
          String(b.className || ''),
          undefined,
          {
            numeric: true
          }
        );


    if (classCompare !== 0) {
      return classCompare;
    }


    return String(a.name || '')
      .localeCompare(
        String(b.name || '')
      );

  });

}


/* =====================================================
   SENARAI KELAS
===================================================== */

function createClassFilter() {

  const select =
    document.getElementById('classFilter');


  const classes =
    [
      ...new Set(
        allStudents
          .map(function (student) {
            return student.className;
          })
          .filter(Boolean)
      )
    ];


  classes.sort(function (a, b) {

    return String(a).localeCompare(
      String(b),
      undefined,
      {
        numeric: true
      }
    );

  });


  classes.forEach(function (className) {

    const option =
      document.createElement('option');

    option.value =
      className;

    option.textContent =
      className;

    select.appendChild(option);

  });

}


/* =====================================================
   TAPIS MURID
===================================================== */

function applyFilter() {

  const className =
    document
      .getElementById('classFilter')
      .value;


  const keyword =
    document
      .getElementById('searchInput')
      .value
      .trim()
      .toLowerCase();


  const filtered =
    allStudents.filter(function (student) {

      const classMatch =
        !className ||
        student.className === className;


      const nameMatch =
        !keyword ||
        String(student.name || '')
          .toLowerCase()
          .includes(keyword);


      return (
        classMatch &&
        nameMatch
      );

    });


  renderStudents(filtered);


  document
    .getElementById('status')
    .innerText =
      'Dipaparkan: ' +
      filtered.length +
      ' daripada ' +
      allStudents.length +
      ' murid';

}


/* =====================================================
   PAPARKAN KAD QR
===================================================== */

function renderStudents(students) {

  const grid =
    document.getElementById('qrGrid');


  grid.innerHTML = '';


  if (students.length === 0) {

    grid.innerHTML =
      '<div class="loading">' +
      'Tiada murid dijumpai.' +
      '</div>';

    return;

  }


  students.forEach(function (student) {

    const card =
      document.createElement('div');


    card.className =
      'qr-card';


    card.innerHTML =
      `
        <div class="school-name">
          SK TUN FUAD
        </div>

        <div class="card-title">
          KAD QR PROGRAM SUSU SEKOLAH
        </div>

        <div class="qr-image"></div>

        <div class="student-name">
          ${escapeHtml(student.name)}
        </div>

        <div class="student-class">
          Kelas:
          ${escapeHtml(student.className)}
        </div>

        <div class="student-id">
          ID:
          ${escapeHtml(student.studentId)}
        </div>

        <div class="qr-id">
          ${escapeHtml(student.qrId)}
        </div>
      `;


    grid.appendChild(card);


    const qrBox =
      card.querySelector('.qr-image');


    new QRCode(
      qrBox,
      {
        text:
          String(student.qrId || ''),

        width:
          170,

        height:
          170,

        correctLevel:
          QRCode.CorrectLevel.H
      }
    );

  });

}


/* =====================================================
   KESELAMATAN PAPARAN
===================================================== */

function escapeHtml(value) {

  return String(value || '')

    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')

    .replace(/>/g, '&gt;')

    .replace(/"/g, '&quot;')

    .replace(/'/g, '&#039;');

}
