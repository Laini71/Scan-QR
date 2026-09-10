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
    function (
      resolve,
      reject
    ) {

      const callbackName =
        'dashboardCallback_' +
        Date.now() +
        '_' +
        Math.floor(
          Math.random() *
          100000
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


      window[
        callbackName
      ] =
        function (
          result
        ) {

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

          delete window[
            callbackName
          ];

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
        function (
          key
        ) {

          query.set(
            key,
            params[key]
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
              'Tidak dapat menghubungi server.'
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
   LOAD DASHBOARD
===================================================== */

async function loadDashboard() {

  const status =
    document.getElementById(
      'systemStatus'
    );


  status.innerText =
    '⏳ Mengemas kini dashboard...';


  try {

    const result =
      await callAppsScript({
        action:
          'dashboard'
      });


    if (
      !result ||
      !result.success
    ) {

      throw new Error(
        result &&
        result.message
          ? result.message
          : 'Data dashboard tidak dapat dimuatkan.'
      );

    }


    dashboardData =
      result;


    renderSummary();

    renderClassStats();

    renderTaken();

    renderPending();


    status.innerText =
      '✅ Data dikemas kini • ' +
      result.date +
      ' • ' +
      result.timestamp;

  }

  catch (error) {

    console.error(
      error
    );


    status.innerText =
      '❌ ' +
      error.message;

  }

}


/* =====================================================
   SUMMARY
===================================================== */

function renderSummary() {

  const summary =
    dashboardData.summary;


  setText(
    'totalActive',
    summary.totalActive
  );


  setText(
    'distributedCount',
    summary.distributed
  );


  setText(
    'pendingCount',
    summary.pending
  );


  setText(
    'percentage',
    summary.percentage +
    '%'
  );

}


/* =====================================================
   CLASS
===================================================== */

function renderClassStats() {

  const tbody =
    document.getElementById(
      'classTable'
    );


  tbody.innerHTML =
    '';


  dashboardData.byClass
    .forEach(
      function (
        item
      ) {

        const row =
          document.createElement(
            'tr'
          );


        row.innerHTML =
          `
          <td>
            <strong>
              ${escapeHtml(item.className)}
            </strong>
          </td>

          <td>
            ${item.total}
          </td>

          <td>
            ${item.taken}
          </td>

          <td>
            ${item.pending}
          </td>

          <td>

            <div>
              ${item.percentage}%
            </div>

            <div class="progress">

              <div
                class="progress-bar"
                style="width:${item.percentage}%">
              </div>

            </div>

          </td>
          `;


        tbody.appendChild(
          row
        );

      }
    );

}


/* =====================================================
   SUDAH AMBIL
===================================================== */

function renderTaken() {

  if (!dashboardData) {
    return;
  }


  const keyword =
    String(
      document
        .getElementById(
          'takenSearch'
        )
        .value || ''
    )
      .trim()
      .toLowerCase();


  const records =
    dashboardData
      .distributedStudents
      .filter(
        function (
          item
        ) {

          const text =
            (
              item.name +
              ' ' +
              item.className
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


  tbody.innerHTML =
    '';


  if (
    records.length === 0
  ) {

    tbody.innerHTML =
      `
      <tr>
        <td colspan="4">
          Tiada rekod.
        </td>
      </tr>
      `;

    return;

  }


  records.forEach(
    function (
      item,
      index
    ) {

      const row =
        document.createElement(
          'tr'
        );


      row.innerHTML =
        `
        <td>
          ${index + 1}
        </td>

        <td>
          ${escapeHtml(item.name)}
        </td>

        <td>
          ${escapeHtml(item.className)}
        </td>

        <td>
          ${escapeHtml(item.time)}
        </td>
        `;


      tbody.appendChild(
        row
      );

    }
  );

}


/* =====================================================
   BELUM AMBIL
===================================================== */

function renderPending() {

  if (!dashboardData) {
    return;
  }


  const keyword =
    String(
      document
        .getElementById(
          'pendingSearch'
        )
        .value || ''
    )
      .trim()
      .toLowerCase();


  const records =
    dashboardData
      .pendingStudents
      .filter(
        function (
          item
        ) {

          const text =
            (
              item.name +
              ' ' +
              item.className
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


  tbody.innerHTML =
    '';


  if (
    records.length === 0
  ) {

    tbody.innerHTML =
      `
      <tr>
        <td colspan="4">
          Semua murid sudah mengambil susu.
        </td>
      </tr>
      `;

    return;

  }


  records.forEach(
    function (
      item,
      index
    ) {

      const row =
        document.createElement(
          'tr'
        );


      row.innerHTML =
        `
        <td>
          ${index + 1}
        </td>

        <td>
          ${escapeHtml(item.name)}
        </td>

        <td>
          ${escapeHtml(item.className)}
        </td>

        <td>
          ${escapeHtml(item.studentId)}
        </td>
        `;


      tbody.appendChild(
        row
      );

    }
  );

}


/* =====================================================
   UTIL
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

    element.innerText =
      value;

  }

}


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
