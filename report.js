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
   JSONP — SAMBUNGAN APPS SCRIPT
===================================================== */

function callAppsScript(params) {

  return new Promise(
    function (resolve, reject) {

      const callbackName =
        'reportApi_' +
        Date.now() +
        '_' +
        Math.floor(
          Math.random() * 1000000
        );

      const script =
        document.createElement(
          'script'
        );

      let finished =
        false;


      function cleanup() {

        if (
          script.parentNode
        ) {

          script.parentNode
            .removeChild(
              script
            );

        }

        try {

          delete window[
            callbackName
          ];

        }
        catch (e) {

          window[
            callbackName
          ] = undefined;

        }

      }


      const timeout =
        setTimeout(
          function () {

            if (finished) {
              return;
            }

            finished =
              true;

            cleanup();

            reject(
              new Error(
                'Server tidak memberi respons selepas 20 saat.'
              )
            );

          },
          20000
        );


      window[
        callbackName
      ] =
        function (result) {

          if (finished) {
            return;
          }

          finished =
            true;

          clearTimeout(
            timeout
          );

          cleanup();

          resolve(
            result
          );

        };


      script.onerror =
        function () {

          if (finished) {
            return;
          }

          finished =
            true;

          clearTimeout(
            timeout
          );

          cleanup();

          reject(
            new Error(
              'Gagal menghubungi Google Apps Script.'
            )
          );

        };


      const query =
        new URLSearchParams();


      Object.keys(
        params || {}
      )
      .forEach(
        function (key) {

          query.set(
            key,
            String(
              params[key] ?? ''
            )
          );

        }
      );


      query.set(
        'callback',
        callbackName
      );


      query.set(
        '_',
        String(
          Date.now()
        )
      );


      const requestUrl =
        APPS_SCRIPT_URL +
        '?' +
        query.toString();


      console.log(
        'Report API:',
        requestUrl
      );


      script.async =
        true;


      script.src =
        requestUrl;


      document.head
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

  const dateInput =
    document.getElementById(
      'reportDateInput'
    );

  if (!dateInput) {

    console.error(
      'reportDateInput tidak dijumpai.'
    );

    return;

  }


  const date =
    dateInput.value;


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


    console.log(
      'Report Result:',
      result
    );


    if (
      !result ||
      !result.success
    ) {

      throw new Error(
        result &&
        result.message
          ?
          result.message
          :
          'Laporan gagal dimuatkan.'
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
      'REPORT ERROR:',
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


  setText(
    'displayDate',
    reportData.displayDate || '-'
  );


  setText(
    'generatedAt',
    reportData.generatedAt || '-'
  );


  setText(
    'totalActive',
    summary.totalActive || 0
  );


  setText(
    'totalTaken',
    summary.distributed || 0
  );


  setText(
    'totalPending',
    summary.pending || 0
  );


  setText(
    'percentage',
    (
      summary.percentage || 0
    ) +
    '%'
  );


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


  if (!tbody) {
    return;
  }


  const data =
    reportData &&
    reportData.byClass
      ?
      reportData.byClass
      :
      [];


  if (!data.length) {

    tbody.innerHTML =
      `
      <tr>

        <td
          colspan="5"
          class="center"
        >
          Tiada data kelas.
        </td>

      </tr>
      `;

    return;

  }


  tbody.innerHTML =
    data
      .map(
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

                <span
                  class="badge badge-success"
                >
                  ${item.taken || 0}
                </span>

              </td>

              <td class="center">

                <span
                  class="badge badge-warning"
                >
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
   MURID SUDAH AMBIL
===================================================== */

function renderTaken() {

  if (!reportData) {
    return;
  }


  const searchInput =
    document.getElementById(
      'takenSearch'
    );


  const keyword =
    searchInput
      ?
      searchInput.value
        .trim()
        .toLowerCase()
      :
      '';


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
            )
            +
            ' ' +
            String(
              student.className || ''
            )
            +
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


  if (!tbody) {
    return;
  }


  if (!students.length) {

    tbody.innerHTML =
      `
      <tr>

        <td
          colspan="6"
          class="center"
        >
          Tiada murid mengambil susu pada tarikh ini.
        </td>

      </tr>
      `;

    return;

  }


  tbody.innerHTML =
    students
      .map(
        function (
          student,
          index
        ) {

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
   MURID BELUM AMBIL
===================================================== */

function renderPending() {

  if (!reportData) {
    return;
  }


  const searchInput =
    document.getElementById(
      'pendingSearch'
    );


  const keyword =
    searchInput
      ?
      searchInput.value
        .trim()
        .toLowerCase()
      :
      '';


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
            )
            +
            ' ' +
            String(
              student.className || ''
            )
            +
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


  if (!tbody) {
    return;
  }


  if (!students.length) {

    tbody.innerHTML =
      `
      <tr>

        <td
          colspan="5"
          class="center"
        >
          🎉 Semua murid sudah mengambil susu.
        </td>

      </tr>
      `;

    return;

  }


  tbody.innerHTML =
    students
      .map(
        function (
          student,
          index
        ) {

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

                <span
                  class="badge badge-warning"
                >
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

function setStatus(text) {

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
   SET TEXT
===================================================== */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value;

  }

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

  return String(
    value ?? ''
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
