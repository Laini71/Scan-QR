const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';


let dashboardData = null;


/* =====================================================
   START
===================================================== */

window.addEventListener(
  'load',
  function () {
    loadDashboard();
  }
);


/* =====================================================
   JSONP
===================================================== */

function callAppsScript(params) {

  return new Promise(
    function (resolve, reject) {

      const callbackName =
        'dashboardApi_' +
        Date.now() +
        '_' +
        Math.floor(
          Math.random() * 100000
        );


      const script =
        document.createElement('script');


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


      Object.keys(params).forEach(
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

          clearTimeout(timeout);

          cleanup();

          reject(
            new Error(
              'Gagal menghubungi server.'
            )
          );

        };


      document.body.appendChild(script);

    }
  );

}


/* =====================================================
   LOAD DASHBOARD
===================================================== */

async function loadDashboard() {

  setStatus(
    '⏳ Mengambil data dashboard...'
  );


  try {

    const result =
      await callAppsScript({
        action: 'dashboard'
      });


    if (
      !result ||
      !result.success
    ) {

      throw new Error(
        result &&
        result.message
          ? result.message
          : 'Dashboard gagal dimuatkan.'
      );

    }


    dashboardData =
      result;


    renderDashboard();


    setStatus(
      '✅ Dashboard berjaya dikemas kini.'
    );

  }

  catch (error) {

    console.error(error);

    setStatus(
      '❌ ' +
      error.message
    );

  }

}


/* =====================================================
   RENDER DASHBOARD
===================================================== */

function renderDashboard() {

  if (!dashboardData) {
    return;
  }


  const summary =
    dashboardData.summary || {};


  document.getElementById(
    'reportDate'
  ).textContent =
    dashboardData.date || '-';


  document.getElementById(
    'lastUpdate'
  ).textContent =
    dashboardData.timestamp || '-';


  document.getElementById(
    'totalActive'
  ).textContent =
    summary.totalActive || 0;


  document.getElementById(
    'totalTaken'
  ).textContent =
    summary.distributed || 0;


  document.getElementById(
    'totalPending'
  ).textContent =
    summary.pending || 0;


  const percentage =
    Number(
      summary.percentage || 0
    );


  document.getElementById(
    'percentage'
  ).textContent =
    percentage + '%';


  document.getElementById(
    'progressText'
  ).textContent =
    percentage + '% selesai';


  document.getElementById(
    'progressBar'
  ).style.width =
    Math.min(
      100,
      Math.max(
        0,
        percentage
      )
    ) + '%';


  renderClassStats();

  buildClassFilters();

  renderTakenStudents();

  renderPendingStudents();

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
    dashboardData.byClass || [];


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
   FILTER KELAS
===================================================== */

function buildClassFilters() {

  const classes =
    (dashboardData.byClass || [])
      .map(
        function (item) {
          return item.className;
        }
      );


  fillClassSelect(
    'takenClassFilter',
    classes
  );


  fillClassSelect(
    'pendingClassFilter',
    classes
  );

}


function fillClassSelect(
  elementId,
  classes
) {

  const select =
    document.getElementById(
      elementId
    );


  const current =
    select.value;


  select.innerHTML =
    '<option value="">Semua Kelas</option>';


  classes.forEach(
    function (className) {

      const option =
        document.createElement(
          'option'
        );


      option.value =
        className;


      option.textContent =
        className;


      select.appendChild(
        option
      );

    }
  );


  if (
    classes.includes(current)
  ) {

    select.value =
      current;

  }

}


/* =====================================================
   SUDAH AMBIL
===================================================== */

function renderTakenStudents() {

  if (!dashboardData) {
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


  const classFilter =
    document
      .getElementById(
        'takenClassFilter'
      )
      .value;


  const students =
    (
      dashboardData
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


        const searchMatch =
          !keyword ||
          text.includes(keyword);


        const classMatch =
          !classFilter ||
          student.className ===
          classFilter;


        return (
          searchMatch &&
          classMatch
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
          Tiada rekod dijumpai.
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

function renderPendingStudents() {

  if (!dashboardData) {
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


  const classFilter =
    document
      .getElementById(
        'pendingClassFilter'
      )
      .value;


  const students =
    (
      dashboardData
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


        const searchMatch =
          !keyword ||
          text.includes(keyword);


        const classMatch =
          !classFilter ||
          student.className ===
          classFilter;


        return (
          searchMatch &&
          classMatch
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

function setStatus(text) {

  const element =
    document.getElementById(
      'dashboardStatus'
    );


  if (element) {
    element.textContent = text;
  }

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

  return String(
    value || ''
  )
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

}
