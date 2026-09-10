const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';

let stockData = null;


/* =========================================================
   MULA SISTEM
========================================================= */

window.addEventListener(
  'load',
  function () {

    loadStock();

  }
);


/* =========================================================
   PANGGIL API APPS SCRIPT GUNA JSONP
========================================================= */

function callApi(params) {

  return new Promise(
    function (resolve, reject) {

      const callback =
        'stockApi_' +
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
        catch (e) {

        }


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
   AMBIL DATA STOK
========================================================= */

async function loadStock() {

  setStatus(
    '⏳ Mengambil data stok...'
  );


  try {

    const result =
      await callApi({
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
          ?
          result.message
          :
          'Data stok gagal dimuatkan.'
      );

    }


    stockData =
      result;


    renderStock();


    setStatus(
      '✅ Data stok berjaya dimuatkan.'
    );

  }
  catch (error) {

    console.error(
      error
    );


    setStatus(
      '❌ ' +
      error.message +
      ' Pastikan Stock.gs dan Code.gs sudah di-deploy sebagai New version.'
    );

  }

}


/* =========================================================
   PAPAR RINGKASAN STOK
========================================================= */

function renderStock() {

  if (
    !stockData
  ) {

    return;

  }


  const summary =
    stockData.summary || {};


  document
    .getElementById(
      'currentBalance'
    )
    .textContent =
      summary.currentBalance || 0;


  document
    .getElementById(
      'totalIn'
    )
    .textContent =
      summary.totalIn || 0;


  document
    .getElementById(
      'totalOut'
    )
    .textContent =
      summary.totalOut || 0;


  document
    .getElementById(
      'todayOut'
    )
    .textContent =
      summary.todayOut || 0;


  document
    .getElementById(
      'generatedAt'
    )
    .textContent =
      stockData.generatedAt || '-';


  const mode =
    document.getElementById(
      'trackingMode'
    );


  if (
    stockData.trackingActive
  ) {

    if (
      summary.lowStock
    ) {

      mode.textContent =
        '⚠️ AKTIF — STOK RENDAH';


      mode.className =
        'mode low';

    }
    else {

      mode.textContent =
        '✅ PENJEJAKAN STOK AKTIF';


      mode.className =
        'mode active';

    }

  }
  else {

    mode.textContent =
      'ℹ️ PENJEJAKAN BELUM AKTIF — tambah stok pertama untuk mula menjejak.';


    mode.className =
      'mode';

  }


  renderTransactions();

}


/* =========================================================
   SIMPAN STOK MASUK
========================================================= */

async function saveStockIn() {

  const quantity =
    Number(
      document
        .getElementById(
          'quantity'
        )
        .value
    );


  const batch =
    document
      .getElementById(
        'batch'
      )
      .value
      .trim();


  const expiryDate =
    document
      .getElementById(
        'expiryDate'
      )
      .value;


  const teacher =
    document
      .getElementById(
        'teacher'
      )
      .value
      .trim()
      ||
      'GURU SKTF';


  const reference =
    document
      .getElementById(
        'reference'
      )
      .value
      .trim();


  const notes =
    document
      .getElementById(
        'notes'
      )
      .value
      .trim();


  if (
    !quantity ||
    quantity <= 0
  ) {

    alert(
      'Masukkan jumlah stok yang betul.'
    );

    return;

  }


  const button =
    document.getElementById(
      'btnSaveStock'
    );


  button.disabled =
    true;


  button.textContent =
    '⏳ MENYIMPAN...';


  setStatus(
    '⏳ Menambah stok...'
  );


  try {

    const result =
      await callApi({

        action:
          'stockIn',

        quantity:
          quantity,

        batch:
          batch,

        expiryDate:
          expiryDate,

        teacher:
          teacher,

        reference:
          reference,

        notes:
          notes

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
          'Stok gagal ditambah.'
      );

    }


    alert(
      '✅ Stok berjaya ditambah.\n\n' +
      'Baki stok sekarang: ' +
      result.balance +
      ' unit'
    );


    resetStockForm();


    await loadStock();

  }
  catch (error) {

    console.error(
      error
    );


    setStatus(
      '❌ ' +
      error.message
    );


    alert(
      '❌ ' +
      error.message
    );

  }
  finally {

    button.disabled =
      false;


    button.textContent =
      '📦 SIMPAN STOK MASUK';

  }

}


/* =========================================================
   RESET BORANG
========================================================= */

function resetStockForm() {

  document
    .getElementById(
      'quantity'
    )
    .value =
      '';


  document
    .getElementById(
      'batch'
    )
    .value =
      '';


  document
    .getElementById(
      'expiryDate'
    )
    .value =
      '';


  document
    .getElementById(
      'reference'
    )
    .value =
      '';


  document
    .getElementById(
      'notes'
    )
    .value =
      '';

}


/* =========================================================
   PAPAR REKOD TRANSAKSI
========================================================= */

function renderTransactions() {

  const tbody =
    document.getElementById(
      'transactionTable'
    );


  const search =
    document
      .getElementById(
        'searchInput'
      )
      .value
      .trim()
      .toLowerCase();


  const type =
    document
      .getElementById(
        'typeFilter'
      )
      .value;


  const transactions =
    (
      stockData &&
      stockData.transactions
        ?
        stockData.transactions
        :
        []
    );


  const data =
    transactions
      .filter(
        function (item) {

          const text =
            (
              String(
                item.displayDate || ''
              )
              +
              ' '
              +
              String(
                item.type || ''
              )
              +
              ' '
              +
              String(
                item.batch || ''
              )
              +
              ' '
              +
              String(
                item.teacher || ''
              )
              +
              ' '
              +
              String(
                item.reference || ''
              )
              +
              ' '
              +
              String(
                item.notes || ''
              )
            )
            .toLowerCase();


          const matchSearch =
            !search ||
            text.includes(
              search
            );


          const matchType =
            !type ||
            item.type === type;


          return (
            matchSearch &&
            matchType
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
          colspan="9"
          class="center"
        >
          Tiada transaksi stok.
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
                  item.batch || '-'
                )}
              </td>

              <td>
                ${esc(
                  item.teacher || '-'
                )}
              </td>

              <td>
                ${esc(
                  item.notes || '-'
                )}
              </td>

            </tr>
          `;

        }
      )
      .join('');

}


/* =========================================================
   STATUS SISTEM
========================================================= */

function setStatus(
  text
) {

  const element =
    document.getElementById(
      'stockStatus'
    );


  if (
    element
  ) {

    element.textContent =
      text;

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
