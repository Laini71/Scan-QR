const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';


let reportData = null;


/* =====================================================
   START
===================================================== */

window.addEventListener(
  'load',
  function () {

    setTodayDate();

    loadReport();

  }
);


/* =====================================================
   SET TARIKH HARI INI
===================================================== */

function setTodayDate() {

  const input =
    document.getElementById(
      'reportDateInput'
    );


  if (!input) {
    return;
  }


  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      '0'
    );


  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );


  input.value =
    year +
    '-' +
    month +
    '-' +
    day;

}


/* =====================================================
   JSONP
===================================================== */

function callAppsScript(params) {

  return new Promise(
    function (resolve, reject) {

      const callbackName =
        'reportApi_' +
        Date.now() +
        '_' +
        Math.floor(
          Math.random() * 100000
        );


      const script =
        document.createElement(
          'script'
        );


      const timeout =
        setTimeout(
          function () {

            cleanup();

            reject(
              new Error(
                'Server tidak memberi respons.'
              )
            );

          },
          15000
        );


      window[callbackName] =
        function (result) {

          clearTimeout(
            timeout
          );

          cleanup();

          resolve(
            result
          );

        };


      function cleanup() {

        try {
          delete window[callbackName];
        } catch (e) {}


        if (
          script.parentNode
        ) {

          script.parentNode
            .removeChild(
              script
            );

        }

      }


      const query =
        new URLSearchParams();


      Object.keys(
        params
      ).forEach(
        function (key) {

          query.set(
            key,
            params[key] ?? ''
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

          clearTimeout(
            timeout
          );

          cleanup();

          reject(
            new Error(
              'Gagal menghubungi server.'
            )
          );

        };


      document.body
        .appendChild(
          script
        );

    }
  );

}


/* =====================================================
   LOAD REPORT
===================================================== */

async function loadReport() {

  const date =
    document
      .getElementById(
        'reportDateInput'
      )
      .value;


  if (!date) {

    alert(
      'Sila pilih tarikh laporan.'
    );

    return;

  }


  setStatus(
    '⏳ Mengambil laporan ' +
    date +
    '...'
  );


  try {

    const result =
      await callAppsScript({
        action:
          'report',
        date:
          date
      });


    if (
      !result ||
      !result.success
    ) {

      throw new Error(
        result &&
        result.message
          ? result.message
          : 'Laporan gagal dimuatkan.'
      );

    }


    reportData =
      result;


    renderReport();


    setStatus(
      '✅ Laporan berjaya dimuatkan.'
    );

  }

  catch (error) {

    console.error(
      error
    );


    setStatus(
      '❌ ' +
      error.message
    );

  }

}


/* =====================================================
   RENDER REPORT
===================================================== */

function renderReport() {

  if (!reportData) {
    return;
  }


  const summary =
    reportData.summary || {};


  document
    .getElementById(
      'displayDate'
    )
    .textContent =
      reportData.displayDate || '-';


  document
    .getElementById(
      'generatedAt'
    )
    .textContent =
      reportData.generatedAt || '-';


  document
    .getElementById(
      'totalActive'
    )
    .textContent =
      summary.totalActive || 0;


  document
    .getElementById(
      'totalTaken'
    )
    .textContent =
      summary.distributed || 0;


  document
    .getElementById(
      'totalPending'
    )
    .textContent =
      summary.pending || 0;


  document
    .getElementById(
      'percentage'
    )
    .textContent =
      (
        summary.percentage ||
        0
      ) +
      '%';


  renderClassStats();

  renderTaken();

  renderPending();

}


/* =====================================================
   STATISTIK KELAS
===================================================== */

function renderClassStats() {

  const tbody =
    document.getElementById(
      'classTable'
    );


  const data =
    reportData &&
    reportData.byClass
      ? reportData.byClass
      : [];


  if (!data.length) {

    tbody.innerHTML =
      `
      <tr>
        <td colspan="5" class="center">
          Tiada data kelas.
        </td>
      </tr>
      `;

    return;

  }


  tbody.innerHTML =
    data.map(
      function (item) {

        return `
          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  item.className
                )}
              </strong>
            </td>

            <td class="center">
              ${item.total || 0}
            </td>

            <td class="center">
              <span class="badge badge-success">
                ${item.taken || 0}
              </span>
            </td>

            <td class="center">
              <span class="badge badge-warning">
                ${item.pending || 0}
              </span>
            </td>

            <td class="center">
              <strong>
                ${item.percentage || 0}%
              </strong>
            </td>

          </tr>
        `;

      }
    )
    .join('');

}


/* =====================================================
   SUDAH AMBIL
===================================================== */

function renderTaken() {

  if (!reportData) {
    return;
  }


  const keyword =
    document
      .getElementById(
        'takenSearch'
      )
      .value
      .trim()
      .toLowerCase();


  const students =
    (
      reportData
        .distributedStudents ||
      []
    )
    .filter(
      function (student) {

        const text =
          (
            String(
              student.name || ''
            ) +
            ' ' +
            String(
              student.className || ''
            ) +
            ' ' +
            String(
              student.studentId || ''
            )
          )
          .toLowerCase();


        return (
          !keyword ||
          text.includes(
            keyword
          )
        );

      }
    );


  const tbody =
    document.getElementById(
      'takenTable'
    );


  if (!students.length) {

    tbody.innerHTML =
      `
      <tr>
        <td colspan="6" class="center">
          Tiada murid mengambil susu pada tarikh ini.
        </td>
      </tr>
      `;

    return;

  }


  tbody.innerHTML =
    students.map(
      function (student, index) {

        return `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  student.name
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                student.className
              )}
            </td>

            <td>
              ${escapeHtml(
                student.studentId
              )}
            </td>

            <td>
              ${escapeHtml(
                student.time || '-'
              )}
            </td>

            <td>
              ${escapeHtml(
                student.teacher || '-'
              )}
            </td>

          </tr>
        `;

      }
    )
    .join('');

}


/* =====================================================
   BELUM AMBIL
===================================================== */

function renderPending() {

  if (!reportData) {
    return;
  }


  const keyword =
    document
      .getElementById(
        'pendingSearch'
      )
      .value
      .trim()
      .toLowerCase();


  const students =
    (
      reportData
        .pendingStudents ||
      []
    )
    .filter(
      function (student) {

        const text =
          (
            String(
              student.name || ''
            ) +
            ' ' +
            String(
              student.className || ''
            ) +
            ' ' +
            String(
              student.studentId || ''
            )
          )
          .toLowerCase();


        return (
          !keyword ||
          text.includes(
            keyword
          )
        );

      }
    );


  const tbody =
    document.getElementById(
      'pendingTable'
    );


  if (!students.length) {

    tbody.innerHTML =
      `
      <tr>
        <td colspan="5" class="center">
          🎉 Semua murid sudah mengambil susu.
        </td>
      </tr>
      `;

    return;

  }


  tbody.innerHTML =
    students.map(
      function (student, index) {

        return `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  student.name
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                student.className
              )}
            </td>

            <td>
              ${escapeHtml(
                student.studentId
              )}
            </td>

            <td>
              <span class="badge badge-warning">
                BELUM AMBIL
              </span>
            </td>

          </tr>
        `;

      }
    )
    .join('');

}


/* =====================================================
   STATUS
===================================================== */

function setStatus(
  text
) {

  const element =
    document.getElementById(
      'reportStatus'
    );


  if (element) {

    element.textContent =
      text;

  }

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
  value
) {

  return String(
    value || ''
  )
  .replace(
    /&/g,
    '&amp;'
  )
  .replace(
    /</g,
    '&lt;'
  )
  .replace(
    />/g,
    '&gt;'
  )
  .replace(
    /"/g,
    '&quot;'
  )
  .replace(
    /'/g,
    '&#039;'
  );

}
