const STOCK_REPORT_API_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';

let stockReportData = null;
let stockDashboardData = null;


/* =========================================================
   MULA SISTEM
========================================================= */

window.addEventListener('load', async function () {

  setupStockReportFilters();

  await loadStockReport();

});


/* =========================================================
   SET BULAN & TAHUN
========================================================= */

function setupStockReportFilters() {

  const now = new Date();

  const malaysiaParts =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: 'numeric'
      }
    ).formatToParts(now);

  const map = {};

  malaysiaParts.forEach(function (part) {
    map[part.type] = part.value;
  });

  const currentYear = Number(map.year);
  const currentMonth = Number(map.month);

  const yearSelect =
    document.getElementById('yearSelect');

  if (yearSelect) {

    yearSelect.innerHTML = '';

    for (
      let year = currentYear - 3;
      year <= currentYear + 1;
      year++
    ) {

      const option =
        document.createElement('option');

      option.value = year;
      option.textContent = year;

      yearSelect.appendChild(option);
    }

    yearSelect.value = currentYear;
  }

  const monthSelect =
    document.getElementById('monthSelect');

  if (monthSelect) {
    monthSelect.value = currentMonth;
  }

}


/* =========================================================
   PANGGIL API APPS SCRIPT - JSONP
========================================================= */

function stockReportApi(params) {

  return new Promise(function (resolve, reject) {

    const callback =
      'stockReport_' +
      Date.now() +
      '_' +
      Math.floor(Math.random() * 100000);

    const script =
      document.createElement('script');

    const timeout =
      setTimeout(function () {

        cleanup();

        reject(
          new Error(
            'Server tidak memberi respons.'
          )
        );

      }, 20000);


    window[callback] =
      function (result) {

        clearTimeout(timeout);

        cleanup();

        resolve(result);

      };


    function cleanup() {

      try {
        delete window[callback];
      }
      catch (error) {}

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

    }


    const query =
      new URLSearchParams();

    Object.keys(params)
      .forEach(function (key) {

        query.set(
          key,
          params[key] ?? ''
        );

      });


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

        clearTimeout(timeout);

        cleanup();

        reject(
          new Error(
            'Gagal menghubungi server.'
          )
        );

      };


    document.body.appendChild(script);

  });

}


/* =========================================================
   LOAD SEMUA DATA LAPORAN
========================================================= */

async function loadStockReport() {

  const monthElement =
    document.getElementById('monthSelect');

  const yearElement =
    document.getElementById('yearSelect');


  if (!monthElement || !yearElement) {

    console.error(
      'Filter bulan/tahun tidak dijumpai.'
    );

    return;
  }


  const month =
    Number(monthElement.value);

  const year =
    Number(yearElement.value);


  setReportStatus(
    '⏳ Mengambil laporan stok...'
  );


  try {

    /*
      1. LAPORAN BULANAN
    */

    const reportResult =
      await stockReportApi({
        action: 'stockReport',
        year: year,
        month: month
      });


    if (
      !reportResult ||
      !reportResult.success
    ) {

      throw new Error(
        reportResult &&
        reportResult.message
          ? reportResult.message
          : 'Laporan stok gagal dimuatkan.'
      );

    }


    stockReportData =
      reportResult;


    /*
      Papar laporan bulanan dahulu.
      Jadi laporan masih boleh digunakan
      walaupun dashboard stok bermasalah.
    */

    renderStockReport();


    /*
      2. DATA STOK SEMASA + FEFO
    */

    try {

      const dashboardResult =
        await stockReportApi({
          action: 'stockDashboard'
        });


      if (
        dashboardResult &&
        dashboardResult.success
      ) {

        stockDashboardData =
          dashboardResult;

        renderCurrentStockSummary();

        renderCurrentFefo();

        renderBatchSummary();

      }
      else {

        console.warn(
          'Data stockDashboard tidak berjaya:',
          dashboardResult
        );

        renderCurrentStockUnavailable();

      }

    }
    catch (dashboardError) {

      console.error(
        'stockDashboard error:',
        dashboardError
      );

      renderCurrentStockUnavailable();

    }


    setReportStatus(
      '✅ Laporan stok berjaya dimuatkan.'
    );

  }
  catch (error) {

    console.error(error);

    setReportStatus(
      '❌ ' + error.message
    );

  }

}


/* =========================================================
   PAPAR LAPORAN BULANAN
========================================================= */

function renderStockReport() {

  if (!stockReportData) {
    return;
  }


  const summary =
    stockReportData.summary || {};

  const period =
    stockReportData.period || {};


  setText(
    'periodTitle',
    '📊 Laporan ' +
    (period.label || '-')
  );


  setText(
    'openingBalance',
    numberValue(summary.openingBalance)
  );

  setText(
    'totalIn',
    numberValue(summary.totalIn)
  );

  setText(
    'totalOut',
    numberValue(summary.totalOut)
  );

  setText(
    'closingBalance',
    numberValue(summary.closingBalance)
  );

  setText(
    'transactionCount',
    numberValue(summary.transactionCount)
  );


  renderDailySummary();

  renderMonthlyTransactions();

}


/* =========================================================
   RINGKASAN STOK SEMASA
========================================================= */

function renderCurrentStockSummary() {

  const data =
    stockDashboardData || {};

  const summary =
    data.summary || {};


  const physicalBalance =
    firstNumber(
      summary.currentBalance,
      summary.physicalBalance,
      data.currentBalance,
      data.physicalBalance
    );


  const usableBalance =
    firstNumber(
      summary.usableBalance,
      data.usableBalance,
      physicalBalance
    );


  const expiredBalance =
    firstNumber(
      summary.expiredBalance,
      data.expiredBalance,
      0
    );


  setTextAny(
    [
      'currentStockBalance',
      'currentBalance',
      'reportCurrentBalance'
    ],
    physicalBalance
  );


  setTextAny(
    [
      'usableStockBalance',
      'usableBalance',
      'reportUsableBalance'
    ],
    usableBalance
  );


  setTextAny(
    [
      'expiredStockBalance',
      'expiredBalance',
      'reportExpiredBalance'
    ],
    expiredBalance
  );

}


/* =========================================================
   FEFO SEMASA
========================================================= */

function renderCurrentFefo() {

  const data =
    stockDashboardData || {};

  const summary =
    data.summary || {};

  const fefo =
    data.fefo ||
    summary.fefo ||
    null;


  if (!fefo) {

    setTextAny(
      [
        'currentFefoBatch',
        'fefoBatch',
        'reportFefoBatch'
      ],
      '-'
    );

    setTextAny(
      [
        'currentFefoExpiry',
        'fefoExpiry',
        'reportFefoExpiry'
      ],
      '-'
    );

    setTextAny(
      [
        'fefoPriorityBatch',
        'priorityBatch'
      ],
      '-'
    );

    setTextAny(
      [
        'fefoPriorityExpiry',
        'priorityExpiry'
      ],
      '-'
    );

    setTextAny(
      [
        'fefoPriorityBalance',
        'priorityBalance'
      ],
      '-'
    );

    setTextAny(
      [
        'fefoPriorityStatus',
        'priorityStatus'
      ],
      '-'
    );

    return;
  }


  const batch =
    cleanBatchValue(
      fefo.batch ||
      fefo.batchNo ||
      fefo.name ||
      '-'
    );


  const expiry =
    formatStockDate(
      fefo.displayExpiryDate ||
      fefo.expiryDate ||
      fefo.expiry ||
      ''
    );


  const remaining =
    firstNumber(
      fefo.remaining,
      fefo.balance,
      fefo.quantity,
      0
    );


  setTextAny(
    [
      'currentFefoBatch',
      'fefoBatch',
      'reportFefoBatch'
    ],
    batch
  );


  setTextAny(
    [
      'currentFefoExpiry',
      'fefoExpiry',
      'reportFefoExpiry'
    ],
    expiry
  );


  setTextAny(
    [
      'fefoPriorityBatch',
      'priorityBatch'
    ],
    batch
  );


  setTextAny(
    [
      'fefoPriorityExpiry',
      'priorityExpiry'
    ],
    expiry
  );


  setTextAny(
    [
      'fefoPriorityBalance',
      'priorityBalance'
    ],
    remaining + ' unit'
  );


  setTextAny(
    [
      'fefoPriorityStatus',
      'priorityStatus'
    ],
    'MASIH BAIK'
  );

}


/* =========================================================
   RINGKASAN PENGGUNAAN BATCH
========================================================= */

function renderBatchSummary() {

  const tbody =
    findElementByIds([
      'batchSummaryTable',
      'batchTable',
      'batchUsageTable'
    ]);


  if (!tbody) {

    console.warn(
      'Jadual Ringkasan Penggunaan Batch tidak dijumpai.'
    );

    return;
  }


  const dashboard =
    stockDashboardData || {};


  let batches =
    Array.isArray(dashboard.batches)
      ? dashboard.batches
      : [];


  /*
    Jika backend tidak menghantar batches,
    bina ringkasan berdasarkan transaksi.
  */

  if (!batches.length) {

    batches =
      buildBatchSummaryFromTransactions();

  }


  if (!batches.length) {

    tbody.innerHTML =
      `
        <tr>
          <td colspan="6" class="center">
            Tiada maklumat batch.
          </td>
        </tr>
      `;

    return;
  }


  tbody.innerHTML =
    batches
      .map(function (item) {

        const batch =
          cleanBatchValue(
            item.batch ||
            item.batchNo ||
            item.name ||
            '-'
          );


        const expiry =
          formatStockDate(
            item.displayExpiryDate ||
            item.expiryDate ||
            item.expiry ||
            ''
          );


        const stockIn =
          firstNumber(
            item.stockIn,
            item.totalIn,
            item.received,
            item.originalQuantity,
            item.quantity,
            0
          );


        const used =
          firstNumber(
            item.stockOut,
            item.totalOut,
            item.used,
            item.distributed,
            Math.max(
              0,
              stockIn -
              firstNumber(
                item.remaining,
                item.balance,
                stockIn
              )
            )
          );


        const remaining =
          firstNumber(
            item.remaining,
            item.balance,
            Math.max(
              0,
              stockIn - used
            )
          );


        const status =
          getBatchStatus(
            item,
            expiry,
            remaining
          );


        return `
          <tr>

            <td>
              <strong>
                ${esc(batch)}
              </strong>
            </td>

            <td>
              ${esc(expiry)}
            </td>

            <td class="center">
              <strong>
                ${esc(stockIn)}
              </strong>
            </td>

            <td class="center">
              <strong>
                ${esc(used)}
              </strong>
            </td>

            <td class="center">
              <strong>
                ${esc(remaining)}
              </strong>
            </td>

            <td class="center">
              ${batchStatusBadge(status)}
            </td>

          </tr>
        `;

      })
      .join('');

}


/* =========================================================
   FALLBACK - BINA BATCH DARIPADA TRANSAKSI
========================================================= */

function buildBatchSummaryFromTransactions() {

  const transactions =
    stockReportData &&
    Array.isArray(stockReportData.transactions)
      ? stockReportData.transactions
      : [];


  const map = {};


  transactions.forEach(function (item) {

    const batch =
      cleanBatchValue(
        item.batch || ''
      );


    if (
      !batch ||
      batch === '-'
    ) {
      return;
    }


    if (!map[batch]) {

      map[batch] = {
        batch: batch,
        expiryDate:
          item.expiryDate ||
          item.displayExpiryDate ||
          '',
        stockIn: 0,
        stockOut: 0,
        remaining: 0
      };

    }


    const quantity =
      Math.abs(
        Number(item.quantity) || 0
      );


    if (item.type === 'MASUK') {

      map[batch].stockIn +=
        quantity;

    }
    else if (item.type === 'KELUAR') {

      map[batch].stockOut +=
        quantity;

    }


    if (
      !map[batch].expiryDate &&
      (
        item.expiryDate ||
        item.displayExpiryDate
      )
    ) {

      map[batch].expiryDate =
        item.expiryDate ||
        item.displayExpiryDate;

    }

  });


  return Object.keys(map)
    .map(function (key) {

      const item =
        map[key];

      item.remaining =
        Math.max(
          0,
          item.stockIn -
          item.stockOut
        );

      return item;

    })
    .sort(function (a, b) {

      const dateA =
        normalizeDateForSort(
          a.expiryDate
        );

      const dateB =
        normalizeDateForSort(
          b.expiryDate
        );

      return dateA.localeCompare(dateB);

    });

}


/* =========================================================
   RINGKASAN HARIAN
========================================================= */

function renderDailySummary() {

  const tbody =
    document.getElementById(
      'dailyTable'
    );


  if (!tbody) {
    return;
  }


  const data =
    stockReportData &&
    stockReportData.daily
      ? stockReportData.daily
      : [];


  if (!data.length) {

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
      .map(function (item) {

        return `
          <tr>

            <td>
              ${esc(
                item.displayDate || '-'
              )}
            </td>

            <td class="center">
              <strong>
                ${esc(
                  numberValue(
                    item.stockIn
                  )
                )}
              </strong>
            </td>

            <td class="center">
              <strong>
                ${esc(
                  numberValue(
                    item.stockOut
                  )
                )}
              </strong>
            </td>

            <td class="center">
              <strong>
                ${esc(
                  numberValue(
                    item.closingBalance
                  )
                )}
              </strong>
            </td>

          </tr>
        `;

      })
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


  if (!tbody) {
    return;
  }


  const data =
    stockReportData &&
    stockReportData.transactions
      ? stockReportData.transactions
      : [];


  if (!data.length) {

    tbody.innerHTML =
      `
        <tr>
          <td
            colspan="11"
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
      .map(function (
        item,
        index
      ) {

        const badgeClass =
          item.type === 'MASUK'
            ? 'badge in'
            : 'badge out';


        const sign =
          item.type === 'MASUK'
            ? '+'
            : '-';


        const expiry =
          formatStockDate(
            item.displayExpiryDate ||
            item.expiryDate ||
            ''
          );


        const batch =
          cleanBatchValue(
            item.batch || '-'
          );


        return `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${esc(
                item.displayDate || '-'
              )}
            </td>

            <td>
              ${esc(
                item.time || '-'
              )}
            </td>

            <td>
              <span
                class="${badgeClass}"
              >
                ${esc(
                  item.type || '-'
                )}
              </span>
            </td>

            <td>
              <strong>
                ${sign}${esc(
                  Math.abs(
                    Number(
                      item.quantity
                    ) || 0
                  )
                )}
              </strong>
            </td>

            <td>
              <strong>
                ${esc(
                  numberValue(
                    item.balance
                  )
                )}
              </strong>
            </td>

            <td>
              ${esc(batch)}
            </td>

            <td>
              ${esc(expiry)}
            </td>

            <td>
              ${esc(
                item.teacher || '-'
              )}
            </td>

            <td>
              ${esc(
                item.reference || '-'
              )}
            </td>

            <td>
              ${esc(
                item.notes || '-'
              )}
            </td>

          </tr>
        `;

      })
      .join('');

}


/* =========================================================
   JIKA DASHBOARD STOK TIDAK DAPAT DIMUATKAN
========================================================= */

function renderCurrentStockUnavailable() {

  setTextAny(
    [
      'currentStockBalance',
      'currentBalance',
      'reportCurrentBalance'
    ],
    '-'
  );

  setTextAny(
    [
      'usableStockBalance',
      'usableBalance',
      'reportUsableBalance'
    ],
    '-'
  );

  setTextAny(
    [
      'expiredStockBalance',
      'expiredBalance',
      'reportExpiredBalance'
    ],
    '-'
  );

  setTextAny(
    [
      'currentFefoBatch',
      'fefoBatch',
      'reportFefoBatch'
    ],
    '-'
  );

  setTextAny(
    [
      'currentFefoExpiry',
      'fefoExpiry',
      'reportFefoExpiry'
    ],
    '-'
  );


  const tbody =
    findElementByIds([
      'batchSummaryTable',
      'batchTable',
      'batchUsageTable'
    ]);


  if (tbody) {

    tbody.innerHTML =
      `
        <tr>
          <td
            colspan="6"
            class="center"
          >
            Data batch semasa tidak dapat dimuatkan.
          </td>
        </tr>
      `;

  }

}


/* =========================================================
   STATUS BATCH
========================================================= */

function getBatchStatus(
  item,
  expiry,
  remaining
) {

  if (
    item.expired === true ||
    item.isExpired === true
  ) {
    return 'LUPUT';
  }


  if (remaining <= 0) {
    return 'HABIS';
  }


  const normalized =
    normalizeDateForSort(expiry);


  if (
    normalized !== '9999-12-31'
  ) {

    const today =
      malaysiaTodayIso();


    if (
      normalized <= today
    ) {
      return 'LUPUT';
    }

  }


  return 'BAIK';

}


function batchStatusBadge(
  status
) {

  if (status === 'LUPUT') {

    return `
      <span
        style="
          display:inline-block;
          padding:5px 10px;
          border-radius:999px;
          background:#fee2e2;
          color:#991b1b;
          font-weight:800;
          font-size:12px;
        "
      >
        LUPUT
      </span>
    `;

  }


  if (status === 'HABIS') {

    return `
      <span
        style="
          display:inline-block;
          padding:5px 10px;
          border-radius:999px;
          background:#e5e7eb;
          color:#374151;
          font-weight:800;
          font-size:12px;
        "
      >
        HABIS
      </span>
    `;

  }


  return `
    <span
      style="
        display:inline-block;
        padding:5px 10px;
        border-radius:999px;
        background:#dcfce7;
        color:#166534;
        font-weight:800;
        font-size:12px;
      "
    >
      BAIK
    </span>
  `;

}


/* =========================================================
   FORMAT TARIKH
========================================================= */

function formatStockDate(value) {

  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === '-'
  ) {
    return '-';
  }


  const text =
    String(value).trim();


  /*
    Sudah dalam format dd/mm/yyyy
  */

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      text
    )
  ) {
    return text;
  }


  /*
    yyyy-mm-dd
  */

  const isoMatch =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );


  if (isoMatch) {

    return (
      isoMatch[3] +
      '/' +
      isoMatch[2] +
      '/' +
      isoMatch[1]
    );

  }


  /*
    Date string lama Apps Script
  */

  const date =
    new Date(text);


  if (
    !Number.isNaN(
      date.getTime()
    )
  ) {

    try {

      return new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone:
            'Asia/Kuala_Lumpur',

          day:
            '2-digit',

          month:
            '2-digit',

          year:
            'numeric'
        }
      ).format(date);

    }
    catch (error) {}

  }


  return text;

}


/* =========================================================
   BERSIHKAN NILAI BATCH LAMA
========================================================= */

function cleanBatchValue(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '-';
  }


  const text =
    String(value).trim();


  /*
    Jika data lama tersimpan sebagai Date object/string,
    jangan paparkan ayat panjang GMT.
  */

  if (
    /GMT[+-]\d{4}/i.test(text) ||
    /^[A-Z][a-z]{2}\s[A-Z][a-z]{2}\s\d{2}\s\d{4}/.test(
      text
    )
  ) {

    const date =
      new Date(text);


    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {

      return (
        'DATA-LAMA-' +
        new Intl.DateTimeFormat(
          'en-CA',
          {
            timeZone:
              'Asia/Kuala_Lumpur',

            year:
              'numeric',

            month:
              '2-digit',

            day:
              '2-digit'
          }
        )
        .format(date)
        .replace(
          /-/g,
          ''
        )
      );

    }

  }


  return text;

}


/* =========================================================
   TARIKH UNTUK SUSUNAN
========================================================= */

function normalizeDateForSort(
  value
) {

  if (
    !value ||
    value === '-'
  ) {
    return '9999-12-31';
  }


  const text =
    String(value).trim();


  const isoMatch =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );


  if (isoMatch) {

    return (
      isoMatch[1] +
      '-' +
      isoMatch[2] +
      '-' +
      isoMatch[3]
    );

  }


  const displayMatch =
    text.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );


  if (displayMatch) {

    return (
      displayMatch[3] +
      '-' +
      displayMatch[2] +
      '-' +
      displayMatch[1]
    );

  }


  const date =
    new Date(text);


  if (
    !Number.isNaN(
      date.getTime()
    )
  ) {

    const parts =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Kuala_Lumpur',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit'
        }
      ).format(date);

    return parts;

  }


  return '9999-12-31';

}


/* =========================================================
   TARIKH MALAYSIA HARI INI
========================================================= */

function malaysiaTodayIso() {

  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Asia/Kuala_Lumpur',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit'
      }
    )
    .formatToParts(
      new Date()
    );


  const map = {};


  parts.forEach(function (part) {

    map[part.type] =
      part.value;

  });


  return (
    map.year +
    '-' +
    map.month +
    '-' +
    map.day
  );

}


/* =========================================================
   UTILITI NOMBOR
========================================================= */

function numberValue(
  value
) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;

}


function firstNumber() {

  for (
    let i = 0;
    i < arguments.length;
    i++
  ) {

    const value =
      Number(
        arguments[i]
      );


    if (
      Number.isFinite(value)
    ) {
      return value;
    }

  }


  return 0;

}


/* =========================================================
   CARI ELEMENT BERDASARKAN BEBERAPA ID
========================================================= */

function findElementByIds(
  ids
) {

  for (
    let i = 0;
    i < ids.length;
    i++
  ) {

    const element =
      document.getElementById(
        ids[i]
      );


    if (element) {
      return element;
    }

  }


  return null;

}


/* =========================================================
   SET TEXT PADA MANA-MANA ID YANG WUJUD
========================================================= */

function setTextAny(
  ids,
  value
) {

  ids.forEach(function (id) {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = value;
    }

  });

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


  if (element) {
    element.textContent = text;
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
    document.getElementById(id);


  if (element) {
    element.textContent = value;
  }

}


/* =========================================================
   CETAK / PDF
========================================================= */

function printStockReport() {

  window.print();

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


/* =========================================================
   TAMAT STOCK-REPORT.JS
========================================================= */
