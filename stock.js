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
          delete window[callback];
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

  const usableBalance =
    Number(
      summary.usableBalance ??
      summary.currentBalance ??
      0
    );

  if (
    mode
  ) {

    if (
      stockData.trackingActive
    ) {

      if (
        usableBalance <= 0
      ) {

        mode.textContent =
          Number(
            summary.expiredBalance || 0
          ) > 0
            ?
            '🚫 TIADA STOK BOLEH GUNA — stok yang tinggal telah luput.'
            :
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

  renderFefoPanel();

  renderExpiryAlerts();

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

  if (!box) {
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

  const physicalBalance =
    Number(
      summary.currentBalance || 0
    );

  const usableBalance =
    Number(
      summary.usableBalance ??
      physicalBalance
    );

  const expiredBalance =
    Number(
      summary.expiredBalance || 0
    );

  if (
    usableBalance <= 0
  ) {

    box.className =
      'smart-stock-alert empty';

    if (
      expiredBalance > 0
    ) {

      box.textContent =
        '🚫 TIADA STOK BOLEH GUNA — ' +
        expiredBalance +
        ' unit yang tinggal telah luput. Asingkan stok luput dan tambah stok baharu.';

    }
    else {

      box.textContent =
        '🚫 STOK SUSU HABIS — Pengagihan telah disekat. Tambah stok susu dengan segera.';

    }

    return;
  }

  if (
    summary.lowStock
  ) {

    box.className =
      'smart-stock-alert low';

    box.textContent =
      '⚠️ STOK RENDAH — Baki boleh guna tinggal ' +
      usableBalance +
      ' unit. Sila rancang penambahan stok.';

    return;
  }

  box.className =
    'smart-stock-alert normal';

  box.textContent =
    '✅ STOK MENCUKUPI — Baki boleh guna ' +
    usableBalance +
    ' unit.';

}


/* =========================================================
   FEFO — FIRST EXPIRED, FIRST OUT
========================================================= */

function renderFefoPanel() {

  ensureFefoPanel_();

  const box =
    document.getElementById(
      'fefoPanel'
    );

  if (!box) {
    return;
  }

  const fefo =
    stockData &&
    stockData.fefo
      ?
      stockData.fefo
      :
      null;

  const summary =
    stockData &&
    stockData.summary
      ?
      stockData.summary
      :
      {};

  const usableBalance =
    Number(
      summary.usableBalance ??
      summary.currentBalance ??
      0
    );

  const expiredBalance =
    Number(
      summary.expiredBalance || 0
    );

  if (
    !stockData ||
    !stockData.trackingActive
  ) {

    box.className =
      'fefo-panel';

    box.innerHTML =
      '<h2>🥛 FEFO — Gunakan Dahulu</h2>' +
      '<div class="fefo-message">' +
      'ℹ️ Penjejakan stok belum aktif.' +
      '</div>';

    return;
  }

  if (
    !fefo ||
    usableBalance <= 0
  ) {

    box.className =
      'fefo-panel danger';

    box.innerHTML =
      '<h2>🥛 FEFO — Gunakan Dahulu</h2>' +
      '<div class="fefo-message">' +
      (
        expiredBalance > 0
          ?
          '🚫 Tiada stok selamat untuk diagihkan. ' +
          expiredBalance +
          ' unit yang tinggal telah luput.'
          :
          '🚫 Tiada stok yang boleh diagihkan.'
      ) +
      '</div>';

    return;
  }

  const expiryText =
    fefo.expiryDate
      ?
      (
        fefo.displayExpiryDate ||
        formatDateMs(
          fefo.expiryDate
        )
      )
      :
      'Tiada tarikh luput';

  const daysText =
    fefo.daysToExpiry === null ||
    fefo.daysToExpiry === undefined
      ?
      ''
      :
      (
        ' • ' +
        fefo.daysToExpiry +
        ' hari lagi'
      );

  box.className =
    fefo.daysToExpiry !== null &&
    fefo.daysToExpiry <= 30
      ?
      'fefo-panel warning'
      :
      'fefo-panel active';

  box.innerHTML =
    '<h2>🥛 FEFO — GUNAKAN DAHULU</h2>' +

    '<div class="fefo-grid">' +

      '<div class="fefo-item">' +
        '<span>Batch</span>' +
        '<strong>' +
          esc(
            fefo.batch || '-'
          ) +
        '</strong>' +
      '</div>' +

      '<div class="fefo-item">' +
        '<span>Tarikh Luput</span>' +
        '<strong>' +
          esc(
            expiryText
          ) +
        '</strong>' +
      '</div>' +

      '<div class="fefo-item">' +
        '<span>Baki Batch</span>' +
        '<strong>' +
          esc(
            fefo.remaining || 0
          ) +
          ' unit' +
        '</strong>' +
      '</div>' +

      '<div class="fefo-item">' +
        '<span>Status</span>' +
        '<strong>' +
          (
            fefo.expiryDate
              ?
              'Guna terlebih dahulu' +
              esc(
                daysText
              )
              :
              'Guna selepas batch bertarikh luput'
          ) +
        '</strong>' +
      '</div>' +

    '</div>';

}


/* =========================================================
   CIPTA PANEL FEFO SECARA AUTOMATIK
========================================================= */

function ensureFefoPanel_() {

  if (
    document.getElementById(
      'fefoPanel'
    )
  ) {
    return;
  }

  if (
    !document.getElementById(
      'fefoDynamicStyle'
    )
  ) {

    const style =
      document.createElement(
        'style'
      );

    style.id =
      'fefoDynamicStyle';

    style.textContent =
      `
      .fefo-panel {
        margin-bottom: 20px;
        padding: 18px;
        border-radius: 16px;
        background: #eff6ff;
        border: 2px solid #bfdbfe;
        color: #1e3a8a;
      }

      .fefo-panel h2 {
        margin: 0 0 14px;
        color: inherit;
        font-size: 21px;
      }

      .fefo-panel.active {
        background: #f0fdf4;
        border-color: #86efac;
        color: #166534;
      }

      .fefo-panel.warning {
        background: #fffbeb;
        border-color: #fcd34d;
        color: #92400e;
      }

      .fefo-panel.danger {
        background: #fef2f2;
        border-color: #fca5a5;
        color: #991b1b;
      }

      .fefo-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }

      .fefo-item {
        background: rgba(255,255,255,.72);
        border-radius: 12px;
        padding: 13px;
      }

      .fefo-item span {
        display: block;
        font-size: 12px;
        opacity: .78;
        margin-bottom: 5px;
      }

      .fefo-item strong {
        display: block;
        font-size: 16px;
      }

      .fefo-message {
        font-weight: 700;
      }

      @media (max-width: 850px) {
        .fefo-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 550px) {
        .fefo-grid {
          grid-template-columns: 1fr;
        }
      }
      `;

    document.head
      .appendChild(
        style
      );

  }

  const panel =
    document.createElement(
      'section'
    );

  panel.id =
    'fefoPanel';

  panel.className =
    'fefo-panel';

  const expiryBox =
    document.getElementById(
      'expiryAlertBox'
    );

  const smartBox =
    document.getElementById(
      'smartStockAlert'
    );

  if (
    expiryBox &&
    expiryBox.parentNode
  ) {

    expiryBox.parentNode
      .insertBefore(
        panel,
        expiryBox
      );

  }
  else if (
    smartBox &&
    smartBox.parentNode
  ) {

    smartBox.parentNode
      .insertBefore(
        panel,
        smartBox.nextSibling
      );

  }
  else {

    const main =
      document.querySelector(
        'main'
      );

    if (
      main
    ) {

      main.insertBefore(
        panel,
        main.firstChild
      );

    }

  }

}


/* =========================================================
   PEMANTAUAN TARIKH LUPUT
========================================================= */

function renderExpiryAlerts() {

  const box =
    document.getElementById(
      'expiryAlertBox'
    );

  const text =
    document.getElementById(
      'expiryAlertText'
    );

  const list =
    document.getElementById(
      'expiryAlertList'
    );

  if (
    !box ||
    !text ||
    !list
  ) {
    return;
  }

  const batches =
    stockData &&
    Array.isArray(
      stockData.batches
    )
      ?
      stockData.batches
          .filter(
            function (item) {

              return (
                Number(
                  item.remaining || 0
                ) > 0
                &&
                item.expiryDate
              );

            }
          )
      :
      [];

  const expired =
    batches.filter(
      function (item) {
        return item.expired === true;
      }
    );

  const nearExpiry =
    batches.filter(
      function (item) {

        return (
          item.expired !== true &&
          Number(
            item.daysToExpiry
          ) >= 0 &&
          Number(
            item.daysToExpiry
          ) <= 30
        );

      }
    );

  list.innerHTML = '';

  if (
    expired.length
  ) {

    box.className =
      'expiry-alert danger';

    text.innerHTML =
      '🚫 <strong>AMARAN:</strong> ' +
      expired.length +
      ' batch aktif telah melepasi tarikh luput.';

    expired.forEach(
      function (item) {

        const li =
          document.createElement(
            'li'
          );

        li.textContent =
          'Batch ' +
          item.batch +
          ' — baki ' +
          item.remaining +
          ' unit — luput ' +
          (
            item.displayExpiryDate ||
            formatDateMs(
              item.expiryDate
            )
          );

        list.appendChild(
          li
        );

      }
    );

    nearExpiry.forEach(
      function (item) {

        const li =
          document.createElement(
            'li'
          );

        li.textContent =
          'Batch ' +
          item.batch +
          ' — baki ' +
          item.remaining +
          ' unit — akan luput ' +
          (
            item.displayExpiryDate ||
            formatDateMs(
              item.expiryDate
            )
          ) +
          ' (' +
          item.daysToExpiry +
          ' hari lagi)';

        list.appendChild(
          li
        );

      }
    );

    return;
  }

  if (
    nearExpiry.length
  ) {

    box.className =
      'expiry-alert warning';

    text.innerHTML =
      '⚠️ <strong>STOK HAMPIR LUPUT:</strong> ' +
      nearExpiry.length +
      ' batch aktif akan luput dalam tempoh 30 hari.';

    nearExpiry.forEach(
      function (item) {

        const li =
          document.createElement(
            'li'
          );

        li.textContent =
          'Batch ' +
          item.batch +
          ' — baki ' +
          item.remaining +
          ' unit — ' +
          (
            item.displayExpiryDate ||
            formatDateMs(
              item.expiryDate
            )
          ) +
          ' (' +
          item.daysToExpiry +
          ' hari lagi)';

        list.appendChild(
          li
        );

      }
    );

    return;
  }

  box.className =
    'expiry-alert ok';

  text.textContent =
    batches.length
      ?
      '✅ Tiada batch aktif yang akan luput dalam 30 hari.'
      :
      'ℹ️ Tiada batch aktif bertarikh luput untuk dipantau.';

}


/* =========================================================
   KIRA HARI KE TARIKH LUPUT
========================================================= */

function daysUntilExpiry(
  dateText
) {

  const parts =
    String(
      dateText || ''
    )
    .split('-');

  if (
    parts.length !== 3
  ) {
    return 999999;
  }

  const expiry =
    new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
      23,
      59,
      59
    );

  const now =
    new Date();

  const diff =
    expiry.getTime() -
    now.getTime();

  return Math.ceil(
    diff /
    (
      1000 *
      60 *
      60 *
      24
    )
  );

}


/* =========================================================
   FORMAT TARIKH
========================================================= */

function formatDateMs(
  dateText
) {

  const parts =
    String(
      dateText || ''
    )
    .split('-');

  if (
    parts.length !== 3
  ) {
    return dateText || '-';
  }

  return (
    parts[2] +
    '/' +
    parts[1] +
    '/' +
    parts[0]
  );

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

  if (!tbody) {
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
          colspan="10"
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
                  item.displayExpiryDate ||
                  item.expiryDate ||
                  '-'
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
