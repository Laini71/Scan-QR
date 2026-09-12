const STOCK_REPORT_API_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';


let stockReportData = null;


/* =========================================================
   MULA SISTEM
========================================================= */

window.addEventListener(
  'load',
  function () {

    setupStockReportFilters();

    loadStockReport();

  }
);


/* =========================================================
   SET BULAN & TAHUN
========================================================= */

function setupStockReportFilters() {

  const now =
    new Date();


  const malaysiaParts =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone:
          'Asia/Kuala_Lumpur',

        year:
          'numeric',

        month:
          'numeric'
      }
    )
    .formatToParts(
      now
    );


  const map = {};


  malaysiaParts.forEach(
    function (part) {

      map[
        part.type
      ] =
        part.value;

    }
  );


  const currentYear =
    Number(
      map.year
    );


  const currentMonth =
    Number(
      map.month
    );


  const yearSelect =
    document.getElementById(
      'yearSelect'
    );


  if (
    yearSelect
  ) {

    yearSelect.innerHTML =
      '';


    for (
      let year =
        currentYear - 3;

      year <=
        currentYear + 1;

      year++
    ) {

      const option =
        document.createElement(
          'option'
        );


      option.value =
        year;


      option.textContent =
        year;


      yearSelect.appendChild(
        option
      );

    }


    yearSelect.value =
      currentYear;

  }


  const monthSelect =
    document.getElementById(
      'monthSelect'
    );


  if (
    monthSelect
  ) {

    monthSelect.value =
      currentMonth;

  }

}


/* =========================================================
   PANGGIL API APPS SCRIPT
========================================================= */

function stockReportApi(
  params
) {

  return new Promise(
    function (
      resolve,
      reject
    ) {

      const callback =
        'stockReport_' +
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
        callback
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
            callback
          ];

        }
        catch (
          error
        ) {}


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
        function (
          key
        ) {

          query.set(
            key,
            params[
              key
            ] ?? ''
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
        STOCK_REPORT_API_URL +
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


/* =========================================================
   LOAD LAPORAN STOK
========================================================= */

async function loadStockReport() {

  const monthElement =
    document.getElementById(
      'monthSelect'
    );


  const yearElement =
    document.getElementById(
      'yearSelect'
    );


  if (
    !monthElement ||
    !yearElement
  ) {

    console.error(
      'Filter bulan/tahun tidak dijumpai.'
    );

    return;

  }


  const month =
    Number(
      monthElement.value
    );


  const year =
    Number(
      yearElement.value
    );


  setReportStatus(
    '⏳ Mengambil laporan stok...'
  );


  try {

    const result =
      await stockReportApi({

        action:
          'stockReport',

        year:
          year,

        month:
          month

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
          'Laporan stok gagal dimuatkan.'
      );

    }


    stockReportData =
      result;


    renderStockReport();


    setReportStatus(
      '✅ Laporan stok berjaya dimuatkan.'
    );

  }
  catch (
    error
  ) {

    console.error(
      error
    );


    setReportStatus(
      '❌ ' +
      error.message
    );

  }

}


/* =========================================================
   PAPAR LAPORAN
========================================================= */

function renderStockReport() {

  if (
    !stockReportData
  ) {

    return;

  }


  const summary =
    stockReportData.summary ||
    {};


  const period =
    stockReportData.period ||
    {};


  setText(
    'periodTitle',
    '📊 Laporan ' +
    (
      period.label ||
      '-'
    )
  );


  setText(
    'openingBalance',
    summary.openingBalance ||
    0
  );


  setText(
    'totalIn',
    summary.totalIn ||
    0
  );


  setText(
    'totalOut',
    summary.totalOut ||
    0
  );


  setText(
    'closingBalance',
    summary.closingBalance ||
    0
  );


  setText(
    'transactionCount',
    summary.transactionCount ||
    0
  );


  renderDailySummary();


  renderMonthlyTransactions();

}


/* =========================================================
   RINGKASAN HARIAN
========================================================= */

function renderDailySummary() {

  const tbody =
    document.getElementById(
      'dailyTable'
    );


  if (
    !tbody
  ) {

    return;

  }


  const data =
    stockReportData &&
    stockReportData.daily
      ?
      stockReportData.daily
      :
      [];


  if (
    !data.length
  ) {

    tbody.innerHTML =
      `
      <tr>

        <td
          colspan="4"
          class="center"
        >
          Tiada transaksi untuk bulan ini.
        </td>

      </tr>
      `;


    return;

  }


  tbody.innerHTML =
    data
      .map(
        function (
          item
        ) {

          return `
            <tr>

              <td>
                ${esc(
                  item.displayDate
                )}
              </td>


              <td class="center">

                <strong>
                  ${esc(
                    item.stockIn
                  )}
                </strong>

              </td>


              <td class="center">

                <strong>
                  ${esc(
                    item.stockOut
                  )}
                </strong>

              </td>


              <td class="center">

                <strong>
                  ${esc(
                    item.closingBalance
                  )}
                </strong>

              </td>

            </tr>
          `;

        }
      )
      .join('');

}


/* =========================================================
   TRANSAKSI BULANAN
========================================================= */

function renderMonthlyTransactions() {

  const tbody =
    document.getElementById(
      'transactionTable'
    );


  if (
    !tbody
  ) {

    return;

  }


  const data =
    stockReportData &&
    stockReportData.transactions
      ?
      stockReportData.transactions
      :
      [];


  if (
    !data.length
  ) {

    tbody.innerHTML =
      `
      <tr>

        <td
          colspan="10"
          class="center"
        >
          Tiada transaksi untuk bulan ini.
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

          const badgeClass =
            item.type ===
            'MASUK'
              ?
              'badge in'
              :
              'badge out';


          const sign =
            item.type ===
            'MASUK'
              ?
              '+'
              :
              '-';


          return `
            <tr>

              <td>
                ${index + 1}
              </td>


              <td>
                ${esc(
                  item.displayDate
                )}
              </td>


              <td>
                ${esc(
                  item.time
                )}
              </td>


              <td>

                <span
                  class="${badgeClass}"
                >

                  ${esc(
                    item.type
                  )}

                </span>

              </td>


              <td>

                <strong>

                  ${sign}${esc(
                    item.quantity
                  )}

                </strong>

              </td>


              <td>

                <strong>
                  ${esc(
                    item.balance
                  )}
                </strong>

              </td>


              <td>
                ${esc(
                  item.batch ||
                  '-'
                )}
              </td>


              <td>
                ${esc(
                  item.teacher ||
                  '-'
                )}
              </td>


              <td>
                ${esc(
                  item.reference ||
                  '-'
                )}
              </td>


              <td>
                ${esc(
                  item.notes ||
                  '-'
                )}
              </td>

            </tr>
          `;

        }
      )
      .join('');

}


/* =========================================================
   STATUS LAPORAN
========================================================= */

function setReportStatus(
  text
) {

  const element =
    document.getElementById(
      'reportStatus'
    );


  if (
    element
  ) {

    element.textContent =
      text;

  }

}


/* =========================================================
   SET TEXT
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


/* =========================================================
   KESELAMATAN PAPARAN HTML
========================================================= */

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
