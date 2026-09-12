const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';

let dashboardData = null;


/* =========================================================
   MULA SISTEM
========================================================= */

window.addEventListener(
  'load',
  function () {

    loadDashboard();

  }
);


/* =========================================================
   API JSONP
========================================================= */

function callDashboardApi(params) {

  return new Promise(
    function (resolve, reject) {

      const callback =
        'dashboardApi_' +
        Date.now() +
        '_' +
        Math.floor(
          Math.random() * 100000
        );


      const script =
        document.createElement(
          'script'
        );


      const timer =
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


      window[callback] =
        function (result) {

          clearTimeout(
            timer
          );

          cleanup();

          resolve(
            result
          );

        };


      function cleanup() {

        try {

          delete window[
            callback
          ];

        }
        catch (e) {}


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
      )
      .forEach(
        function (key) {

          query.set(
            key,
            params[key] ?? ''
          );

        }
      );


      query.set(
        'callback',
        callback
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
            timer
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


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

  setDashboardStatus(
    '⏳ Mengambil data dashboard...'
  );


  try {

    const result =
      await callDashboardApi({
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
          ?
          result.message
          :
          'Data dashboard gagal dimuatkan.'
      );

    }


    dashboardData =
      result;


    renderDashboard();


    setDashboardStatus(
      '✅ Data dashboard berjaya dimuatkan.'
    );


    if (
      typeof loadDashboardStock ===
      'function'
    ) {

      loadDashboardStock();

    }

  }
  catch (error) {

    console.error(
      error
    );


    setDashboardStatus(
      '❌ ' +
      error.message
    );

  }

}


/* =========================================================
   PAPAR DASHBOARD
========================================================= */

function renderDashboard() {

  if (
    !dashboardData
  ) {

    return;

  }


  const summary =
    dashboardData.summary || {};


  setText(
    'reportDate',
    dashboardData.date || '-'
  );


  setText(
    'lastUpdate',
    dashboardData.timestamp || '-'
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


  const percentage =
    Number(
      summary.percentage || 0
    );


  setText(
    'percentage',
    percentage + '%'
  );


  const progressBar =
    document.getElementById(
      'progressBar'
    );


  if (
    progressBar
  ) {

    progressBar.style.width =
      percentage + '%';

  }


  setText(
    'progressText',
    percentage + '%'
  );


  renderClassTable();


  populateClassFilters();


  renderTakenStudents();


  renderPendingStudents();

}


/* =========================================================
   STATISTIK MENGIKUT KELAS
========================================================= */

function renderClassTable() {

  const tbody =
    document.getElementById(
      'classTable'
    );


  if (
    !tbody
  ) {

    return;

  }


  const data =
    dashboardData &&
    dashboardData.byClass
      ?
      dashboardData.byClass
      :
      [];


  if (
    !data.length
  ) {

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
                  ${esc(
                    item.className
                  )}
                </strong>
              </td>

              <td class="center">
                ${esc(
                  item.total
                )}
              </td>

              <td class="center">
                ${esc(
                  item.taken
                )}
              </td>

              <td class="center">
                ${esc(
                  item.pending
                )}
              </td>

              <td class="center">

                <span class="badge ${
                  item.percentage >= 100
                    ?
                    'badge-success'
                    :
                    'badge-warning'
                }">

                  ${esc(
                    item.percentage
                  )}%

                </span>

              </td>

            </tr>
          `;

        }
      )
      .join('');

}


/* =========================================================
   SENARAI KELAS UNTUK FILTER
========================================================= */

function populateClassFilters() {

  const classes =
    (
      dashboardData &&
      dashboardData.byClass
        ?
        dashboardData.byClass
        :
        []
    )
    .map(
      function (item) {

        return item.className;

      }
    );


  const taken =
    document.getElementById(
      'takenClassFilter'
    );


  const pending =
    document.getElementById(
      'pendingClassFilter'
    );


  populateSelect(
    taken,
    classes
  );


  populateSelect(
    pending,
    classes
  );

}


function populateSelect(
  select,
  classes
) {

  if (
    !select
  ) {

    return;

  }


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
    classes.includes(
      current
    )
  ) {

    select.value =
      current;

  }

}


/* =========================================================
   MURID SUDAH AMBIL SUSU
========================================================= */

function renderTakenStudents() {

  const tbody =
    document.getElementById(
      'takenTable'
    );


  if (
    !tbody
  ) {

    return;

  }


  const searchElement =
    document.getElementById(
      'takenSearch'
    );


  const classElement =
    document.getElementById(
      'takenClassFilter'
    );


  const search =
    searchElement
      ?
      searchElement.value
        .trim()
        .toLowerCase()
      :
      '';


  const className =
    classElement
      ?
      classElement.value
      :
      '';


  const data =
    (
      dashboardData &&
      dashboardData
        .distributedStudents
        ?
        dashboardData
          .distributedStudents
        :
        []
    )
    .filter(
      function (item) {

        const text =
          (
            String(
              item.name || ''
            ) +
            ' ' +
            String(
              item.className || ''
            )
          )
          .toLowerCase();


        return (

          (
            !search ||
            text.includes(
              search
            )
          )

          &&

          (
            !className ||
            item.className ===
            className
          )

        );

      }
    );


  if (
    !data.length
  ) {

    tbody.innerHTML =
      `
      <tr>
        <td
          colspan="6"
          class="center"
        >
          Tiada murid direkodkan.
        </td>
      </tr>
      `;

    return;

  }


  tbody.innerHTML =
    data
      .map(
        function (
          item,
          index
        ) {

          return `
            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                <strong>
                  ${esc(
                    item.name
                  )}
                </strong>
              </td>

              <td>
                ${esc(
                  item.className
                )}
              </td>

              <td>
                ${esc(
                  item.studentId
                )}
              </td>

              <td>
                ${esc(
                  item.time
                )}
              </td>

              <td>
                ${esc(
                  item.teacher || '-'
                )}
              </td>

            </tr>
          `;

        }
      )
      .join('');

}


/* =========================================================
   MURID BELUM AMBIL
========================================================= */

function renderPendingStudents() {

  const tbody =
    document.getElementById(
      'pendingTable'
    );


  if (
    !tbody
  ) {

    return;

  }


  const searchElement =
    document.getElementById(
      'pendingSearch'
    );


  const classElement =
    document.getElementById(
      'pendingClassFilter'
    );


  const search =
    searchElement
      ?
      searchElement.value
        .trim()
        .toLowerCase()
      :
      '';


  const className =
    classElement
      ?
      classElement.value
      :
      '';


  const data =
    (
      dashboardData &&
      dashboardData
        .pendingStudents
        ?
        dashboardData
          .pendingStudents
        :
        []
    )
    .filter(
      function (item) {

        const text =
          (
            String(
              item.name || ''
            ) +
            ' ' +
            String(
              item.className || ''
            )
          )
          .toLowerCase();


        return (

          (
            !search ||
            text.includes(
              search
            )
          )

          &&

          (
            !className ||
            item.className ===
            className
          )

        );

      }
    );


  if (
    !data.length
  ) {

    tbody.innerHTML =
      `
      <tr>

        <td
          colspan="5"
          class="center"
        >
          Tiada murid belum ambil susu.
        </td>

      </tr>
      `;

    return;

  }


  tbody.innerHTML =
    data
      .map(
        function (
          item,
          index
        ) {

          return `
            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                <strong>
                  ${esc(
                    item.name
                  )}
                </strong>
              </td>

              <td>
                ${esc(
                  item.className
                )}
              </td>

              <td>
                ${esc(
                  item.studentId
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


/* =========================================================
   STATUS DASHBOARD
========================================================= */

function setDashboardStatus(
  text
) {

  const element =
    document.getElementById(
      'dashboardStatus'
    );


  if (
    element
  ) {

    element.textContent =
      text;

  }

}


/* =========================================================
   HELPER
========================================================= */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (
    element
  ) {

    element.textContent =
      value;

  }

}


function esc(
  value
) {

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
