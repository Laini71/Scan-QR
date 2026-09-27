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
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'numeric'
    }).formatToParts(now);

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
   JSONP API
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
          new Error('Server tidak memberi respons.')
        );

      }, 20000);


    window[callback] = function (result) {

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

    Object.keys(params).forEach(function (key) {
      query.set(
        key,
        params[key] ?? ''
      );
    });

    query.set('callback', callback);
    query.set('_', Date.now());

    script.src =
      STOCK_REPORT_API_URL +
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


/* =========================================================
   LOAD LAPORAN
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


  /*
    Reset paparan stok semasa dahulu.
  */

  resetCurrentStockDisplay();


  try {

    /* ================================
       1. LAPORAN BULANAN
    ================================= */

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
      Paparkan data laporan bulanan dahulu.
    */

    renderStockReport();


    /* ================================
       2. DASHBOARD STOK SEMASA
    ================================= */

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
          'stockDashboard gagal:',
          dashboardResult
        );

        stockDashboardData = null;

        renderCurrentStockUnavailable();

        /*
          Walaupun stockDashboard gagal,
          cuba bina batch daripada transaksi.
        */

        renderBatchSummary();
      }

    }
    catch (dashboardError) {

      console.error(
        'stockDashboard error:',
        dashboardError
      );

      stockDashboardData = null;

      renderCurrentStockUnavailable();

      renderBatchSummary();
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
   RESET PAPARAN
========================================================= */

function resetCurrentStockDisplay() {

  setTextAny(
    [
      'currentPhysicalBalance',
      'currentStockBalance',
      'currentBalance',
      'reportCurrentBalance'
    ],
    '-'
  );

  setTextAny(
    [
      'currentUsableBalance',
      'usableStockBalance',
      'usableBalance',
      'reportUsableBalance'
    ],
    '-'
  );

  setTextAny(
    [
      'currentExpiredBalance',
      'expiredStockBalance',
      'expiredBalance',
      'reportExpiredBalance'
    ],
    '-'
  );

  setTextAny(
    [
      'currentFefoBatch',
      'reportFefoBatch'
    ],
    '-'
  );

  setTextAny(
    [
      'currentFefoExpiry',
      'reportFefoExpiry'
    ],
    '-'
  );

  setTextAny(
    [
      'fefoBatch',
      'fefoPriorityBatch',
      'priorityBatch'
    ],
    '-'
  );

  setTextAny(
    [
      'fefoExpiry',
      'fefoPriorityExpiry',
      'priorityExpiry'
    ],
    '-'
  );

  setTextAny(
    [
      'fefoRemaining',
      'fefoPriorityBalance',
      'priorityBalance'
    ],
    '-'
  );

  setTextAny(
    [
      'fefoStatus',
      'fefoPriorityStatus',
      'priorityStatus'
    ],
    '-'
  );
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


  /*
    ID sebenar stock-report.html:
    currentPhysicalBalance
    currentUsableBalance
    currentExpiredBalance
  */

  setTextAny(
    [
      'currentPhysicalBalance',
      'currentStockBalance',
      'currentBalance',
      'reportCurrentBalance'
    ],
    physicalBalance
  );


  setTextAny(
    [
      'currentUsableBalance',
      'usableStockBalance',
      'usableBalance',
      'reportUsableBalance'
    ],
    usableBalance
  );


  setTextAny(
    [
      'currentExpiredBalance',
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
        'reportFefoBatch'
      ],
      '-'
    );

    setTextAny(
      [
        'currentFefoExpiry',
        'reportFefoExpiry'
      ],
      '-'
    );

    setTextAny(
      [
        'fefoBatch',
        'fefoPriorityBatch',
        'priorityBatch'
      ],
      '-'
    );

    setTextAny(
      [
        'fefoExpiry',
        'fefoPriorityExpiry',
        'priorityExpiry'
      ],
      '-'
    );

    setTextAny(
      [
        'fefoRemaining',
        'fefoPriorityBalance',
        'priorityBalance'
      ],
      '-'
    );

    setTextAny(
      [
        'fefoStatus',
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
      'reportFefoBatch'
    ],
    batch
  );


  setTextAny(
    [
      'currentFefoExpiry',
      'reportFefoExpiry'
    ],
    expiry
  );


  setTextAny(
    [
      'fefoBatch',
      'fefoPriorityBatch',
      'priorityBatch'
    ],
    batch
  );


  setTextAny(
    [
      'fefoExpiry',
      'fefoPriorityExpiry',
      'priorityExpiry'
    ],
    expiry
  );


  setTextAny(
    [
      'fefoRemaining',
      'fefoPriorityBalance',
      'priorityBalance'
    ],
    remaining + ' unit'
  );


  const status =
    getFefoDisplayStatus(
      fefo,
      expiry,
      remaining
    );


  setTextAny(
    [
      'fefoStatus',
      'fefoPriorityStatus',
      'priorityStatus'
    ],
    status
  );
}


function getFefoDisplayStatus(
  fefo,
  expiry,
  remaining
) {

  if (remaining <= 0) {
    return 'HABIS';
  }

  if (
    fefo.expired === true ||
    fefo.isExpired === true
  ) {
    return 'LUPUT';
  }

  const normalized =
    normalizeDateForSort(expiry);

  if (
    normalized !== '9999-12-31' &&
    normalized <= malaysiaTodayIso()
  ) {
    return 'LUPUT';
  }

  return 'MASIH BAIK';
}/* =========================================================
   RINGKASAN HARIAN
========================================================= */

function renderDailySummary() {

  const tbody =
    document.getElementById('dailySummaryBody');

  if (!tbody) {
    return;
  }


  const rows =
    getDailyRowsFromReport();


  if (!rows.length) {

    tbody.innerHTML =
      '<tr>' +
        '<td colspan="4" style="text-align:center;padding:20px;">' +
          'Tiada rekod harian untuk bulan ini.' +
        '</td>' +
      '</tr>';

    return;
  }


  tbody.innerHTML =
    rows.map(function (row) {

      return (
        '<tr>' +

          '<td>' +
            esc(formatStockDate(row.date)) +
          '</td>' +

          '<td>' +
            esc(numberValue(row.stockIn)) +
          '</td>' +

          '<td>' +
            esc(numberValue(row.stockOut)) +
          '</td>' +

          '<td>' +
            esc(numberValue(row.closingBalance)) +
          '</td>' +

        '</tr>'
      );

    }).join('');
}


/* =========================================================
   DAPATKAN DATA RINGKASAN HARIAN
========================================================= */

function getDailyRowsFromReport() {

  if (!stockReportData) {
    return [];
  }


  const possibleArrays = [

    stockReportData.daily,

    stockReportData.dailySummary,

    stockReportData.byDate,

    stockReportData.days,

    stockReportData.reportDaily

  ];


  let source = [];


  for (
    let i = 0;
    i < possibleArrays.length;
    i++
  ) {

    if (
      Array.isArray(possibleArrays[i]) &&
      possibleArrays[i].length
    ) {

      source =
        possibleArrays[i];

      break;
    }
  }


  /*
    Kalau server sudah beri ringkasan harian,
    gunakan terus.
  */

  if (source.length) {

    return source.map(function (item) {

      return {

        date:
          item.date ||
          item.tarikh ||
          item.DATE ||
          '',

        stockIn:
          firstNumber(
            item.stockIn,
            item.totalIn,
            item.in,
            item.masuk,
            0
          ),

        stockOut:
          firstNumber(
            item.stockOut,
            item.totalOut,
            item.out,
            item.keluar,
            0
          ),

        closingBalance:
          firstNumber(
            item.closingBalance,
            item.balance,
            item.baki,
            item.endBalance,
            0
          )

      };

    });
  }


  /*
    Jika server tidak beri ringkasan harian,
    bina sendiri daripada transaksi.
  */

  const transactions =
    getMonthlyTransactions();


  if (!transactions.length) {
    return [];
  }


  const map = {};


  transactions
    .slice()
    .sort(function (a, b) {

      return (
        transactionTimestamp(a) -
        transactionTimestamp(b)
      );

    })
    .forEach(function (tx) {

      const date =
        getTransactionDate(tx);

      if (!date) {
        return;
      }


      if (!map[date]) {

        map[date] = {
          date: date,
          stockIn: 0,
          stockOut: 0,
          closingBalance: 0
        };
      }


      const type =
        normalizeTransactionType(tx);


      const quantity =
        Math.abs(
          firstNumber(
            tx.quantity,
            tx.jumlah,
            tx.amount,
            tx.qty,
            0
          )
        );


      if (type === 'MASUK') {

        map[date].stockIn +=
          quantity;
      }


      if (type === 'KELUAR') {

        map[date].stockOut +=
          quantity;
      }


      map[date].closingBalance =
        firstNumber(
          tx.balance,
          tx.baki,
          tx.currentBalance,
          map[date].closingBalance
        );

    });


  return Object.keys(map)
    .sort()
    .map(function (date) {
      return map[date];
    });
}


/* =========================================================
   RINGKASAN PENGGUNAAN BATCH
========================================================= */

function renderBatchSummary() {

  const tbody =
    document.getElementById('batchSummaryBody');

  if (!tbody) {
    return;
  }


  const rows =
    buildBatchSummaryRows();


  if (!rows.length) {

    tbody.innerHTML =
      '<tr>' +
        '<td colspan="6" style="text-align:center;padding:20px;">' +
          'Tiada data batch untuk dipaparkan.' +
        '</td>' +
      '</tr>';

    return;
  }


  tbody.innerHTML =
    rows.map(function (row) {

      const statusClass =
        getBatchStatusClass(
          row.status
        );


      return (
        '<tr>' +

          '<td>' +
            esc(row.batch) +
          '</td>' +

          '<td>' +
            esc(
              formatStockDate(
                row.expiryDate
              )
            ) +
          '</td>' +

          '<td>' +
            esc(
              numberValue(
                row.stockIn
              )
            ) +
          '</td>' +

          '<td>' +
            esc(
              numberValue(
                row.stockUsed
              )
            ) +
          '</td>' +

          '<td>' +
            esc(
              numberValue(
                row.remaining
              )
            ) +
          '</td>' +

          '<td>' +
            '<span class="' +
              statusClass +
            '">' +
              esc(row.status) +
            '</span>' +
          '</td>' +

        '</tr>'
      );

    }).join('');
}


/* =========================================================
   BINA DATA BATCH
========================================================= */

function buildBatchSummaryRows() {

  /*
    Keutamaan pertama:
    gunakan data batch daripada stockDashboard.
  */

  const dashboardBatches =
    getDashboardBatches();


  if (dashboardBatches.length) {

    return dashboardBatches
      .map(function (batch) {

        const batchName =
          cleanBatchValue(
            batch.batch ||
            batch.batchNo ||
            batch.name ||
            '-'
          );


        const expiryDate =
          batch.expiryDate ||
          batch.displayExpiryDate ||
          batch.expiry ||
          '';


        const stockIn =
          firstNumber(
            batch.stockIn,
            batch.totalIn,
            batch.received,
            batch.quantityIn,
            batch.originalQuantity,
            batch.quantity,
            0
          );


        const remaining =
          firstNumber(
            batch.remaining,
            batch.balance,
            batch.usableRemaining,
            batch.currentBalance,
            0
          );


        let stockUsed =
          firstNumber(
            batch.stockUsed,
            batch.used,
            batch.totalOut,
            batch.quantityOut,
            NaN
          );


        if (!Number.isFinite(stockUsed)) {

          stockUsed =
            Math.max(
              0,
              stockIn - remaining
            );
        }


        return {

          batch:
            batchName,

          expiryDate:
            expiryDate,

          stockIn:
            stockIn,

          stockUsed:
            stockUsed,

          remaining:
            remaining,

          status:
            determineBatchStatus(
              batch,
              expiryDate,
              remaining
            )

        };

      })
      .sort(compareBatchSummaryRows);
  }


  /*
    Fallback:
    bina daripada semua transaksi yang
    tersedia pada laporan.
  */

  return buildBatchSummaryFromTransactions();
}


/* =========================================================
   AMBIL SENARAI BATCH DASHBOARD
========================================================= */

function getDashboardBatches() {

  if (!stockDashboardData) {
    return [];
  }


  const candidates = [

    stockDashboardData.batches,

    stockDashboardData.batchInventory,

    stockDashboardData.inventory,

    stockDashboardData.lots,

    stockDashboardData.stockBatches

  ];


  for (
    let i = 0;
    i < candidates.length;
    i++
  ) {

    if (
      Array.isArray(candidates[i]) &&
      candidates[i].length
    ) {

      return candidates[i];
    }
  }


  return [];
}


/* =========================================================
   FALLBACK BATCH DARIPADA TRANSAKSI
========================================================= */

function buildBatchSummaryFromTransactions() {

  const transactions =
    getMonthlyTransactions();


  if (!transactions.length) {
    return [];
  }


  const map = {};


  transactions
    .slice()
    .sort(function (a, b) {

      return (
        transactionTimestamp(a) -
        transactionTimestamp(b)
      );

    })
    .forEach(function (tx) {

      const batch =
        cleanBatchValue(
          tx.batch ||
          tx.batchNo ||
          tx.BATCH ||
          ''
        );


      /*
        Rekod lama yang tiada batch
        tidak dimasukkan dalam ringkasan batch.
      */

      if (
        !batch ||
        batch === '-'
      ) {
        return;
      }


      if (!map[batch]) {

        map[batch] = {

          batch: batch,

          expiryDate: '',

          stockIn: 0,

          stockUsed: 0,

          remaining: 0,

          status: '-'

        };
      }


      const expiry =
        tx.expiryDate ||
        tx.tarikhLuput ||
        tx.expiry ||
        tx.TARIKH_LUPUT ||
        '';


      if (
        expiry &&
        !map[batch].expiryDate
      ) {

        map[batch].expiryDate =
          expiry;
      }


      const quantity =
        Math.abs(
          firstNumber(
            tx.quantity,
            tx.jumlah,
            tx.amount,
            tx.qty,
            0
          )
        );


      const type =
        normalizeTransactionType(tx);


      if (type === 'MASUK') {

        map[batch].stockIn +=
          quantity;
      }


      if (type === 'KELUAR') {

        map[batch].stockUsed +=
          quantity;
      }

    });


  return Object.keys(map)
    .map(function (batchName) {

      const row =
        map[batchName];


      row.remaining =
        Math.max(
          0,
          row.stockIn -
          row.stockUsed
        );


      row.status =
        determineBatchStatus(
          {},
          row.expiryDate,
          row.remaining
        );


      return row;

    })
    .sort(compareBatchSummaryRows);
}


/* =========================================================
   STATUS BATCH
========================================================= */

function determineBatchStatus(
  batch,
  expiryDate,
  remaining
) {

  if (remaining <= 0) {
    return 'HABIS';
  }


  if (
    batch.expired === true ||
    batch.isExpired === true
  ) {

    return 'LUPUT';
  }


  const normalized =
    normalizeDateForSort(
      expiryDate
    );


  if (
    normalized !== '9999-12-31' &&
    normalized <= malaysiaTodayIso()
  ) {

    return 'LUPUT';
  }


  if (
    normalized === '9999-12-31'
  ) {

    return 'TIADA TARIKH';
  }


  const days =
    daysUntilStockExpiry(
      normalized
    );


  if (
    days >= 0 &&
    days <= 7
  ) {

    return 'HAMPIR LUPUT';
  }


  return 'MASIH BAIK';
}


/* =========================================================
   SUSUNAN BATCH — FEFO
========================================================= */

function compareBatchSummaryRows(a, b) {

  /*
    Batch yang masih berbaki dahulu.
  */

  const aEmpty =
    Number(a.remaining) <= 0;

  const bEmpty =
    Number(b.remaining) <= 0;


  if (
    aEmpty !== bEmpty
  ) {

    return aEmpty ? 1 : -1;
  }


  /*
    Kemudian susun mengikut tarikh luput
    paling awal dahulu.
  */

  const aDate =
    normalizeDateForSort(
      a.expiryDate
    );

  const bDate =
    normalizeDateForSort(
      b.expiryDate
    );


  if (aDate < bDate) {
    return -1;
  }


  if (aDate > bDate) {
    return 1;
  }


  return String(a.batch)
    .localeCompare(
      String(b.batch)
    );
}


/* =========================================================
   CLASS STATUS BATCH
========================================================= */

function getBatchStatusClass(status) {

  const value =
    String(status || '')
      .toUpperCase();


  if (
    value === 'MASIH BAIK'
  ) {

    return 'status-good';
  }


  if (
    value === 'HAMPIR LUPUT'
  ) {

    return 'status-warning';
  }


  if (
    value === 'LUPUT'
  ) {

    return 'status-danger';
  }


  if (
    value === 'HABIS'
  ) {

    return 'status-empty';
  }


  return 'status-neutral';
}


/* =========================================================
   TRANSAKSI BULANAN
========================================================= */

function renderMonthlyTransactions() {

  const tbody =
    document.getElementById(
      'monthlyTransactionBody'
    );

  if (!tbody) {
    return;
  }


  const transactions =
    getMonthlyTransactions();


  if (!transactions.length) {

    tbody.innerHTML =
      '<tr>' +
        '<td colspan="11" style="text-align:center;padding:20px;">' +
          'Tiada transaksi stok untuk bulan ini.' +
        '</td>' +
      '</tr>';

    return;
  }


  const sorted =
    transactions
      .slice()
      .sort(function (a, b) {

        return (
          transactionTimestamp(b) -
          transactionTimestamp(a)
        );

      });


  tbody.innerHTML =
    sorted.map(function (tx, index) {

      const type =
        normalizeTransactionType(tx);


      const quantity =
        Math.abs(
          firstNumber(
            tx.quantity,
            tx.jumlah,
            tx.amount,
            tx.qty,
            0
          )
        );


      const signedQuantity =
        type === 'KELUAR'
          ? '-' + quantity
          : '+' + quantity;


      const typeClass =
        type === 'KELUAR'
          ? 'type-out'
          : 'type-in';


      const batch =
        cleanBatchValue(
          tx.batch ||
          tx.batchNo ||
          tx.BATCH ||
          '-'
        );


      const expiry =
        formatStockDate(
          tx.expiryDate ||
          tx.tarikhLuput ||
          tx.expiry ||
          tx.TARIKH_LUPUT ||
          ''
        );


      return (
        '<tr>' +

          '<td>' +
            (index + 1) +
          '</td>' +

          '<td>' +
            esc(
              formatStockDate(
                getTransactionDate(tx)
              )
            ) +
          '</td>' +

          '<td>' +
            esc(
              getTransactionTime(tx)
            ) +
          '</td>' +

          '<td>' +
            '<span class="' +
              typeClass +
            '">' +
              esc(type) +
            '</span>' +
          '</td>' +

          '<td>' +
            esc(signedQuantity) +
          '</td>' +

          '<td>' +
            esc(
              firstNumber(
                tx.balance,
                tx.baki,
                tx.currentBalance,
                0
              )
            ) +
          '</td>' +

          '<td>' +
            esc(batch) +
          '</td>' +

          '<td>' +
            esc(expiry) +
          '</td>' +

          '<td>' +
            esc(
              tx.teacher ||
              tx.guru ||
              tx.GURU ||
              '-'
            ) +
          '</td>' +

          '<td>' +
            esc(
              tx.reference ||
              tx.rujukan ||
              tx.RUJUKAN ||
              '-'
            ) +
          '</td>' +

          '<td>' +
            esc(
              tx.notes ||
              tx.catatan ||
              tx.CATATAN ||
              '-'
            ) +
          '</td>' +

        '</tr>'
      );

    }).join('');
}


/* =========================================================
   DAPATKAN TRANSAKSI BULANAN
========================================================= */

function getMonthlyTransactions() {

  if (!stockReportData) {
    return [];
  }


  const candidates = [

    stockReportData.transactions,

    stockReportData.records,

    stockReportData.data,

    stockReportData.monthlyTransactions,

    stockReportData.transactionList

  ];


  for (
    let i = 0;
    i < candidates.length;
    i++
  ) {

    if (
      Array.isArray(candidates[i])
    ) {

      return candidates[i];
    }
  }


  return [];
}


/* =========================================================
   TRANSAKSI — TARIKH
========================================================= */

function getTransactionDate(tx) {

  return (
    tx.date ||
    tx.tarikh ||
    tx.DATE ||
    tx.TARIKH ||
    ''
  );
}


/* =========================================================
   TRANSAKSI — MASA
========================================================= */

function getTransactionTime(tx) {

  const value =
    tx.time ||
    tx.masa ||
    tx.TIME ||
    tx.MASA ||
    '';


  if (!value) {
    return '-';
  }


  /*
    Jika nilai masa lama tersimpan sebagai
    Date object/string penuh, ambil masa sahaja.
  */

  const date =
    parseAnyStockDate(value);


  if (
    date &&
    String(value).length > 8
  ) {

    try {

      return new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone: 'Asia/Kuala_Lumpur',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }
      ).format(date);

    }
    catch (error) {}
  }


  return String(value);
}


/* =========================================================
   NORMALIZE JENIS TRANSAKSI
========================================================= */

function normalizeTransactionType(tx) {

  const raw =
    String(
      tx.type ||
      tx.jenis ||
      tx.TYPE ||
      tx.JENIS ||
      ''
    )
      .trim()
      .toUpperCase();


  if (
    raw === 'OUT' ||
    raw === 'KELUAR' ||
    raw === 'AGIH' ||
    raw === 'DISTRIBUTION'
  ) {

    return 'KELUAR';
  }


  return 'MASUK';
}


/* =========================================================
   TIMESTAMP TRANSAKSI
========================================================= */

function transactionTimestamp(tx) {

  const timestamp =
    tx.timestamp ||
    tx.TIMESTAMP ||
    '';


  if (timestamp) {

    const parsed =
      parseAnyStockDate(timestamp);

    if (parsed) {
      return parsed.getTime();
    }
  }


  const date =
    getTransactionDate(tx);


  const time =
    getTransactionTime(tx);


  const normalizedDate =
    normalizeDateForSort(date);


  if (
    normalizedDate !== '9999-12-31'
  ) {

    const parsed =
      new Date(
        normalizedDate +
        'T' +
        (
          /^\d{1,2}:\d{2}/.test(time)
            ? time
            : '00:00:00'
        ) +
        '+08:00'
      );


    if (!isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }


  return 0;
}


/* =========================================================
   PAPAR JIKA DASHBOARD TIDAK DAPAT DIBACA
========================================================= */

function renderCurrentStockUnavailable() {

  setTextAny(
    [
      'currentPhysicalBalance',
      'currentStockBalance',
      'currentBalance',
      'reportCurrentBalance'
    ],
    '-'
  );


  setTextAny(
    [
      'currentUsableBalance',
      'usableStockBalance',
      'usableBalance',
      'reportUsableBalance'
    ],
    '-'
  );


  setTextAny(
    [
      'currentExpiredBalance',
      'expiredStockBalance',
      'expiredBalance',
      'reportExpiredBalance'
    ],
    '-'
  );


  setTextAny(
    [
      'currentFefoBatch',
      'reportFefoBatch'
    ],
    '-'
  );


  setTextAny(
    [
      'currentFefoExpiry',
      'reportFefoExpiry'
    ],
    '-'
  );
}/* =========================================================
   FORMAT TARIKH STOK
========================================================= */

function formatStockDate(value) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '-';
  }


  /*
    Jika sudah Date object.
  */

  if (
    Object.prototype.toString.call(value) ===
    '[object Date]'
  ) {

    if (isNaN(value.getTime())) {
      return '-';
    }


    return new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: 'Asia/Kuala_Lumpur',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    ).format(value);
  }


  const text =
    String(value).trim();


  if (!text) {
    return '-';
  }


  /*
    Format:
    yyyy-MM-dd
  */

  const isoDate =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (isoDate) {

    return (
      isoDate[3] +
      '/' +
      isoDate[2] +
      '/' +
      isoDate[1]
    );
  }


  /*
    Format ISO penuh:
    2026-08-31T16:00:00.000Z

    Penting:
    Jangan terus ambil 31/08/2026,
    kerana dalam waktu Malaysia nilainya
    mungkin sebenarnya 01/09/2026.
  */

  if (
    /^\d{4}-\d{2}-\d{2}T/.test(text)
  ) {

    const parsedIso =
      new Date(text);


    if (!isNaN(parsedIso.getTime())) {

      return new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone: 'Asia/Kuala_Lumpur',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }
      ).format(parsedIso);
    }
  }


  /*
    Sudah dd/MM/yyyy
  */

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(text)
  ) {

    return text;
  }


  /*
    Cuba format Date string lama:
    Tue Sep 01 2026 00:00:00 GMT+0800 ...
  */

  const parsed =
    parseAnyStockDate(text);


  if (parsed) {

    try {

      return new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone: 'Asia/Kuala_Lumpur',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }
      ).format(parsed);

    }
    catch (error) {}
  }


  return text;
}


/* =========================================================
   PARSE TARIKH PELBAGAI FORMAT
========================================================= */

function parseAnyStockDate(value) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }


  if (
    Object.prototype.toString.call(value) ===
    '[object Date]'
  ) {

    return isNaN(value.getTime())
      ? null
      : value;
  }


  const text =
    String(value).trim();


  if (!text) {
    return null;
  }


  /*
    dd/MM/yyyy
  */

  const displayMatch =
    text.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );


  if (displayMatch) {

    const day =
      Number(displayMatch[1]);

    const month =
      Number(displayMatch[2]);

    const year =
      Number(displayMatch[3]);


    const date =
      new Date(
        year,
        month - 1,
        day,
        12,
        0,
        0
      );


    return isNaN(date.getTime())
      ? null
      : date;
  }


  /*
    yyyy-MM-dd
  */

  const isoDateMatch =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (isoDateMatch) {

    const year =
      Number(isoDateMatch[1]);

    const month =
      Number(isoDateMatch[2]);

    const day =
      Number(isoDateMatch[3]);


    const date =
      new Date(
        year,
        month - 1,
        day,
        12,
        0,
        0
      );


    return isNaN(date.getTime())
      ? null
      : date;
  }


  /*
    ISO penuh / JavaScript Date string.
  */

  const parsed =
    new Date(text);


  return isNaN(parsed.getTime())
    ? null
    : parsed;
}


/* =========================================================
   NORMALIZE TARIKH UNTUK SUSUNAN
   OUTPUT: yyyy-MM-dd
========================================================= */

function normalizeDateForSort(value) {

  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === '-'
  ) {

    return '9999-12-31';
  }


  const text =
    String(value).trim();


  /*
    yyyy-MM-dd
  */

  const isoDate =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (isoDate) {

    return (
      isoDate[1] +
      '-' +
      isoDate[2] +
      '-' +
      isoDate[3]
    );
  }


  /*
    dd/MM/yyyy
  */

  const displayDate =
    text.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );


  if (displayDate) {

    return (
      displayDate[3] +
      '-' +
      displayDate[2] +
      '-' +
      displayDate[1]
    );
  }


  const parsed =
    parseAnyStockDate(value);


  if (!parsed) {
    return '9999-12-31';
  }


  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).formatToParts(parsed);


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
   TARIKH MALAYSIA HARI INI
========================================================= */

function malaysiaTodayIso() {

  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).formatToParts(
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
   KIRA HARI SEBELUM LUPUT
========================================================= */

function daysUntilStockExpiry(
  normalizedExpiry
) {

  if (
    !normalizedExpiry ||
    normalizedExpiry === '9999-12-31'
  ) {

    return 999999;
  }


  const expiryParts =
    normalizedExpiry.split('-');


  if (expiryParts.length !== 3) {
    return 999999;
  }


  const today =
    malaysiaTodayIso();


  const todayParts =
    today.split('-');


  const expiryUtc =
    Date.UTC(
      Number(expiryParts[0]),
      Number(expiryParts[1]) - 1,
      Number(expiryParts[2])
    );


  const todayUtc =
    Date.UTC(
      Number(todayParts[0]),
      Number(todayParts[1]) - 1,
      Number(todayParts[2])
    );


  return Math.floor(
    (
      expiryUtc -
      todayUtc
    ) /
    86400000
  );
}


/* =========================================================
   BERSIHKAN NILAI BATCH
========================================================= */

function cleanBatchValue(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return '-';
  }


  const text =
    String(value).trim();


  if (!text) {
    return '-';
  }


  /*
    Ada rekod ujian lama yang tersimpan
    sebagai tarikh di kolum batch.

    Contoh:
    Tue Sep 01 2026 00:00:00 GMT+0800...
    atau
    2026-08-31T16:00:00.000Z

    Kita tidak padam data Google Sheets.
    Kita hanya kemaskan paparannya.
  */

  const looksLikeLongDate =
    /GMT[+-]\d{4}/i.test(text) ||
    /^[A-Z][a-z]{2}\s[A-Z][a-z]{2}\s\d{2}\s\d{4}/
      .test(text);


  const looksLikeIsoDateTime =
    /^\d{4}-\d{2}-\d{2}T\d{2}:/
      .test(text);


  if (
    looksLikeLongDate ||
    looksLikeIsoDateTime
  ) {

    const parsed =
      parseAnyStockDate(text);


    if (parsed) {

      const parts =
        new Intl.DateTimeFormat(
          'en-CA',
          {
            timeZone: 'Asia/Kuala_Lumpur',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }
        ).formatToParts(parsed);


      const map = {};


      parts.forEach(function (part) {

        map[part.type] =
          part.value;
      });


      return (
        'DATA-LAMA-' +
        map.year +
        map.month +
        map.day
      );
    }


    return 'DATA-LAMA';
  }


  return text;
}


/* =========================================================
   NOMBOR SELAMAT
========================================================= */

function numberValue(value) {

  const number =
    Number(value);


  return Number.isFinite(number)
    ? number
    : 0;
}


/* =========================================================
   AMBIL NOMBOR PERTAMA YANG SAH
========================================================= */

function firstNumber() {

  for (
    let i = 0;
    i < arguments.length;
    i++
  ) {

    const raw =
      arguments[i];


    if (
      raw === null ||
      raw === undefined ||
      raw === ''
    ) {

      continue;
    }


    const number =
      Number(raw);


    if (Number.isFinite(number)) {
      return number;
    }
  }


  return 0;
}


/* =========================================================
   SET TEXT PADA SATU ID
========================================================= */

function setText(id, value) {

  const element =
    document.getElementById(id);


  if (element) {
    element.textContent = value;
  }
}


/* =========================================================
   SET TEXT PADA BEBERAPA ID
========================================================= */

function setTextAny(ids, value) {

  if (!Array.isArray(ids)) {
    return;
  }


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

function setReportStatus(text) {

  const element =
    document.getElementById(
      'reportStatus'
    );


  if (element) {
    element.textContent = text;
  }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(value) {

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
   REFRESH LAPORAN
========================================================= */

function refreshStockReport() {

  loadStockReport();
}


/* =========================================================
   CETAK / SIMPAN PDF
========================================================= */

function printStockReport() {

  window.print();
}


/* =========================================================
   TAMBAH CSS STATUS SECARA AUTOMATIK
========================================================= */

function ensureStockReportStyles() {

  if (
    document.getElementById(
      'stockReportDynamicStyles'
    )
  ) {
    return;
  }


  const style =
    document.createElement('style');


  style.id =
    'stockReportDynamicStyles';


  style.textContent = `

    .type-in,
    .type-out,
    .status-good,
    .status-warning,
    .status-danger,
    .status-empty,
    .status-neutral {

      display: inline-block;

      padding: 5px 10px;

      border-radius: 999px;

      font-size: 12px;

      font-weight: 800;

      white-space: nowrap;
    }


    .type-in,
    .status-good {

      background: #dcfce7;

      color: #166534;
    }


    .type-out,
    .status-danger {

      background: #fee2e2;

      color: #991b1b;
    }


    .status-warning {

      background: #fef3c7;

      color: #92400e;
    }


    .status-empty {

      background: #e5e7eb;

      color: #374151;
    }


    .status-neutral {

      background: #e0f2fe;

      color: #075985;
    }

  `;


  document.head.appendChild(style);
}


/* =========================================================
   PASTIKAN CSS DIMASUKKAN
========================================================= */

ensureStockReportStyles();


/* =========================================================
   TAMAT STOCK-REPORT.JS FINAL V2
   SISTEM PENGAGIHAN SUSU QR
   SK TUN FUAD 2026
========================================================= */
