const DASH_STOCK_API_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';


window.addEventListener(
  'load',
  function () {
    loadDashboardStock();
  }
);


function dashboardStockApi(params) {

  return new Promise(
    function (resolve, reject) {

      const callback =
        'dashStock_' +
        Date.now() +
        '_' +
        Math.floor(
          Math.random() * 100000
        );

      const script =
        document.createElement('script');

      const timer =
        setTimeout(
          function () {

            cleanup();

            reject(
              new Error(
                'Server stok tidak memberi respons.'
              )
            );

          },
          15000
        );


      window[callback] =
        function (data) {

          clearTimeout(timer);

          cleanup();

          resolve(data);

        };


      function cleanup() {

        try {
          delete window[callback];
        }
        catch (e) {}


        if (script.parentNode) {

          script.parentNode
            .removeChild(script);

        }

      }


      const query =
        new URLSearchParams();


      Object.keys(params)
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
        DASH_STOCK_API_URL +
        '?' +
        query.toString();


      script.onerror =
        function () {

          clearTimeout(timer);

          cleanup();

          reject(
            new Error(
              'Gagal menghubungi modul stok.'
            )
          );

        };


      document.body
        .appendChild(script);

    }
  );

}


/* =========================================================
   AMBIL DATA STOK UNTUK DASHBOARD
========================================================= */

async function loadDashboardStock() {

  try {

    const result =
      await dashboardStockApi({
        action:
          'stockDashboard'
      });


    if (
      !result ||
      !result.success
    ) {

      throw new Error(
        result &&
        result.message
          ? result.message
          : 'Data stok gagal dimuatkan.'
      );

    }


    const summary =
      result.summary || {};


    setDashStockText(
      'dashStockBalance',
      summary.currentBalance || 0
    );


    setDashStockText(
      'dashStockIn',
      summary.totalIn || 0
    );


    setDashStockText(
      'dashStockTodayOut',
      summary.todayOut || 0
    );


    renderDashboardStockStatus(
      result
    );

  }
  catch (error) {

    console.error(
      error
    );


    setDashStockText(
      'dashStockStatus',
      'GAGAL MUAT'
    );

  }

}


/* =========================================================
   PAPAR STATUS STOK
========================================================= */

function renderDashboardStockStatus(data) {

  const summary =
    data.summary || {};


  const card =
    document.getElementById(
      'dashStockStatusCard'
    );


  const status =
    document.getElementById(
      'dashStockStatus'
    );


  if (
    !card ||
    !status
  ) {

    return;

  }


  if (
    !data.trackingActive
  ) {

    card.className =
      'stock-card';


    status.textContent =
      'BELUM AKTIF';


    return;

  }


  const balance =
    Number(
      summary.currentBalance || 0
    );


  if (
    balance <= 0
  ) {

    card.className =
      'stock-card status-empty';


    status.textContent =
      '🚫 STOK HABIS';


    return;

  }


  if (
    summary.lowStock
  ) {

    card.className =
      'stock-card status-low';


    status.textContent =
      '⚠️ STOK RENDAH';


    return;

  }


  card.className =
    'stock-card status-normal';


  status.textContent =
    '✅ STOK MENCUKUPI';

}


/* =========================================================
   HELPER PAPAR TEKS
========================================================= */

function setDashStockText(
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
