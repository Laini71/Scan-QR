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
   PANGGIL API APPS SCRIPT
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

          clearTimeout(timer);

          cleanup();

          resolve(result);

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
        APPS_SCRIPT_URL +
        '?' +
        query.toString();


      script.onerror =
        function () {

          clearTimeout(timer);

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
   LOAD DATA STOK
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
   PAPAR DATA STOK
========================================================= */

function renderStock() {

  if (
    !stockData
  ) {

    return;

  }


  const summary =
    stockData.summary || {};


  setText(
    'currentBalance',
    summary.currentBalance || 0
  );


  setText(
    'totalIn',
    summary.totalIn || 0
  );


  setText(
    'totalOut',
    summary.totalOut || 0
  );


  setText(
    'todayOut',
    summary.todayOut || 0
  );


  setText(
    'generatedAt',
    stockData.generatedAt || '-'
  );


  const mode =
    document.getElementById(
      'trackingMode'
    );


  if (
    mode
  ) {

    if (
      stockData.trackingActive
    ) {


      if (
        Number(
          summary.currentBalance || 0
        ) <= 0
      ) {

        mode.textContent =
          '🚫 STOK HABIS — Pengagihan akan disekat.';


        mode.className =
          'mode low';

      }


      else if (
        summary.lowStock
      ) {

        mode.textContent =
          '⚠️ PENJEJAKAN AKTIF — STOK RENDAH';


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

  }


  renderSmartStockAlert(
    summary,
    stockData
  );


  renderTransactions();

}


/* =========================================================
   AMARAN STOK PINTAR
========================================================= */

function renderSmartStockAlert(
  summary,
  data
) {

  const box =
    document.getElementById(
      'smartStockAlert'
    );


  if (
    !box
  ) {

    return;

  }


  if (
    !data ||
    !data.trackingActive
  ) {

    box.className =
      'smart-stock-alert';


    box.textContent =
      'ℹ️ Penjejakan stok belum aktif. Tambah stok pertama untuk mula menjejak.';


    return;

  }


  const balance =
    Number(
      summary.currentBalance || 0
    );


  if (
    balance <= 0
  ) {

    box.className =
      'smart-stock-alert empty';


    box.textContent =
      '🚫 STOK SUSU HABIS — Pengagihan telah disekat. Tambah stok susu dengan segera.';


    return;

  }


  if (
    summary.lowStock
  ) {

    box.className =
      'smart-stock-alert low';


    box.textContent =
      '⚠️ STOK RENDAH — Baki tinggal ' +
      balance +
      ' unit. Sila rancang penambahan stok.';


    return;

  }


  box.className =
    'smart-stock-alert normal';


  box.textContent =
    '✅ STOK MENCUKUPI — Baki semasa ' +
    balance +
    ' unit.';

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
   RESET BORANG STOK
========================================================= */

function resetStockForm() {

  setInputValue(
    'quantity',
    ''
  );


  setInputValue(
    'batch',
    ''
  );


  setInputValue(
    'expiryDate',
    ''
  );


  setInputValue(
    'reference',
    ''
  );


  setInputValue(
    'notes',
    ''
  );

}


/* =========================================================
   UJIAN STOK HABIS
   TIDAK MENGUBAH DATA SEBENAR
========================================================= */

async function testOutOfStock() {

  const button =
    document.getElementById(
      'btnTestOutOfStock'
    );


  const box =
    document.getElementById(
      'testOutOfStockResult'
    );


  if (
    !button ||
    !box
  ) {

    alert(
      'Komponen Ujian Stok Habis tidak dijumpai dalam stock.html.'
    );

    return;

  }


  button.disabled =
    true;


  button.textContent =
    '⏳ MENGUJI...';


  box.className =
    'test-result show';


  box.innerHTML =
    '⏳ Sedang menjalankan simulasi baki stok 0...';


  try {

    const result =
      await callApi({
        action:
          'stockTestOutOfStock'
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
          'Ujian gagal.'
      );

    }


    const stock =
      result.stock || {};


    if (
      stock.status ===
        'OUT_OF_STOCK'
      &&
      stock.allowed ===
        false
      &&
      result.dataChanged ===
        false
    ) {

      box.className =
        'test-result show blocked';


      box.innerHTML =
        '✅ <strong>UJIAN BERJAYA</strong>' +
        '<br><br>' +

        '🚫 Sistem menolak pengagihan apabila baki = 0.' +
        '<br>' +

        'Status: <strong>OUT_OF_STOCK</strong>' +
        '<br>' +

        'Baki simulasi: <strong>0</strong>' +
        '<br>' +

        'Data sebenar diubah: <strong>TIDAK</strong>' +
        '<br><br>' +

        esc(
          stock.message || ''
        );

    }
    else {

      throw new Error(
        'Keputusan ujian tidak seperti dijangka.'
      );

    }

  }
  catch (error) {

    console.error(
      error
    );


    box.className =
      'test-result show blocked';


    box.innerHTML =
      '❌ Ujian gagal: ' +
      esc(
        error.message
      );

  }
  finally {

    button.disabled =
      false;


    button.textContent =
      '🧪 UJI STOK HABIS';

  }

}


/* =========================================================
   PAPAR TRANSAKSI STOK
========================================================= */

function renderTransactions() {

  const tbody =
    document.getElementById(
      'transactionTable'
    );


  if (
    !tbody
  ) {

    return;

  }


  const searchElement =
    document.getElementById(
      'searchInput'
    );


  const typeElement =
    document.getElementById(
      'typeFilter'
    );


  const search =
    searchElement
      ?
      searchElement.value
        .trim()
        .toLowerCase()
      :
      '';


  const type =
    typeElement
      ?
      typeElement.value
      :
      '';


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
    transactions.filter(
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


        return (

          (
            !search ||
            text.includes(
              search
            )
          )

          &&

          (
            !type ||
            item.type === type
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
   STATUS
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


function setInputValue(
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

    element.value =
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
