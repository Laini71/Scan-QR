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

        if (script.parentNode) {

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
   PAPAR DATA STOK — VERSI BARU
========================================================= */

function renderStock() {

  if (!stockData) {
    return;
  }

  const summary =
    stockData.summary || {};


  // ======================================================
  // NILAI STOK
  // ======================================================

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

  const todayOut =
    Number(
      summary.todayOut || 0
    );


  // ======================================================
  // KAD STOK ASAL
  // ======================================================

  setText(
    'currentBalance',
    physicalBalance
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
    todayOut
  );

  setText(
    'generatedAt',
    stockData.generatedAt || '-'
  );


  // ======================================================
  // PANEL RINGKASAN BARU
  // ======================================================

  renderStockSummarySuper_(
    physicalBalance,
    usableBalance,
    expiredBalance,
    todayOut,
    summary
  );


  // ======================================================
  // STATUS PENJEJAKAN
  // ======================================================

  const mode =
    document.getElementById(
      'trackingMode'
    );

  if (mode) {

    if (stockData.trackingActive) {

      if (usableBalance <= 0) {

        mode.textContent =
          expiredBalance > 0
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


  // ======================================================
  // MODUL ASAL DIKEKALKAN
  // ======================================================

  renderSmartStockAlert(
    summary,
    stockData
  );

  renderFefoPanel();

  renderExpiryAlerts();

  renderTransactions();

}


/* =========================================================
   PANEL RINGKASAN STOK SUPER
========================================================= */

function renderStockSummarySuper_(
  physicalBalance,
  usableBalance,
  expiredBalance,
  todayOut,
  summary
) {

  // ======================================================
  // CSS PANEL
  // ======================================================

  if (
    !document.getElementById(
      'superStockStyle'
    )
  ) {

    const style =
      document.createElement(
        'style'
      );

    style.id =
      'superStockStyle';

    style.textContent = `

      #superStockSummary {
        margin: 20px 0;
      }

      .super-stock-title {
        font-size: 23px;
        font-weight: 800;
        color: #075985;
        margin-bottom: 15px;
      }

      .super-stock-grid {
        display: grid;
        grid-template-columns:
          repeat(5, 1fr);
        gap: 14px;
      }

      .super-stock-card {
        background: #ffffff;
        border-radius: 18px;
        padding: 20px;
        box-shadow:
          0 5px 18px
          rgba(0,0,0,.08);
        border-top:
          5px solid #0284c7;
      }

      .super-stock-card.usable {
        border-top-color: #16a34a;
      }

      .super-stock-card.expired {
        border-top-color: #dc2626;
      }

      .super-stock-card.today {
        border-top-color: #7c3aed;
      }

      .super-stock-card.status {
        border-top-color: #f59e0b;
      }

      .super-stock-icon {
        font-size: 30px;
        margin-bottom: 8px;
      }

      .super-stock-label {
        color: #64748b;
        font-size: 14px;
        font-weight: 700;
      }

      .super-stock-value {
        margin-top: 8px;
        font-size: 31px;
        font-weight: 900;
        color: #172033;
      }

      .super-stock-unit {
        margin-top: 5px;
        color: #94a3b8;
        font-size: 12px;
      }

      .super-status-ok {
        color: #15803d;
        font-size: 19px;
      }

      .super-status-low {
        color: #d97706;
        font-size: 19px;
      }

      .super-status-empty {
        color: #dc2626;
        font-size: 19px;
      }

      .super-stock-info {
        margin-top: 15px;
        padding: 16px 18px;
        border-radius: 14px;
        font-weight: 600;
        line-height: 1.6;
      }

      .super-stock-info.ok {
        background: #ecfdf5;
        border: 2px solid #86efac;
        color: #166534;
      }

      .super-stock-info.warning {
        background: #fff7ed;
        border: 2px solid #fdba74;
        color: #9a3412;
      }

      @media (max-width: 1000px) {

        .super-stock-grid {
          grid-template-columns:
            repeat(2, 1fr);
        }

      }

      @media (max-width: 600px) {

        .super-stock-grid {
          grid-template-columns:
            1fr;
        }

      }

    `;

    document.head
      .appendChild(
        style
      );

  }


  // ======================================================
  // CIPTA PANEL
  // ======================================================

  let panel =
    document.getElementById(
      'superStockSummary'
    );

  if (!panel) {

    panel =
      document.createElement(
        'section'
      );

    panel.id =
      'superStockSummary';


    const smartBox =
      document.getElementById(
        'smartStockAlert'
      );

    if (
      smartBox &&
      smartBox.parentNode
    ) {

      smartBox.parentNode
        .insertBefore(
          panel,
          smartBox
        );

    }

    else {

      const container =
        document.querySelector(
          '.container'
        );

      if (container) {

        container.insertBefore(
          panel,
          container.firstChild
        );

      }

    }

  }


  // ======================================================
  // TENTUKAN STATUS
  // ======================================================

  let statusText =
    'MENCUKUPI';

  let statusClass =
    'super-status-ok';


  if (
    usableBalance <= 0
  ) {

    statusText =
      'STOK HABIS';

    statusClass =
      'super-status-empty';

  }

  else if (
    summary.lowStock
  ) {

    statusText =
      'STOK RENDAH';

    statusClass =
      'super-status-low';

  }


  // ======================================================
  // PENERANGAN STOK
  // ======================================================

  let infoClass =
    'ok';

  let infoText =
    '';


  if (
    expiredBalance > 0
  ) {

    infoClass =
      'warning';

    infoText =
      'ℹ️ <strong>PENERANGAN STOK:</strong> ' +
      'Baki keseluruhan ialah <strong>' +
      esc(physicalBalance) +
      ' unit</strong>. ' +
      'Daripada jumlah tersebut, <strong>' +
      esc(expiredBalance) +
      ' unit telah luput</strong> dan tidak boleh diagihkan. ' +
      'Baki sebenar yang boleh digunakan ialah <strong>' +
      esc(usableBalance) +
      ' unit</strong>.';

  }

  else {

    infoText =
      '✅ <strong>STATUS STOK:</strong> ' +
      'Tiada stok luput. ' +
      'Kesemua <strong>' +
      esc(usableBalance) +
      ' unit</strong> stok semasa boleh digunakan.';

  }


  // ======================================================
  // PAPAR PANEL
  // ======================================================

  panel.innerHTML = `

    <div class="super-stock-title">
      📊 Ringkasan Stok Semasa
    </div>

    <div class="super-stock-grid">


      <div class="super-stock-card">

        <div class="super-stock-icon">
          📦
        </div>

        <div class="super-stock-label">
          Baki Keseluruhan
        </div>

        <div class="super-stock-value">
          ${esc(physicalBalance)}
        </div>

        <div class="super-stock-unit">
          unit dalam rekod
        </div>

      </div>


      <div class="super-stock-card usable">

        <div class="super-stock-icon">
          🥛
        </div>

        <div class="super-stock-label">
          Baki Boleh Guna
        </div>

        <div class="super-stock-value">
          ${esc(usableBalance)}
        </div>

        <div class="super-stock-unit">
          unit boleh diagihkan
        </div>

      </div>


      <div class="super-stock-card expired">

        <div class="super-stock-icon">
          🚫
        </div>

        <div class="super-stock-label">
          Stok Luput
        </div>

        <div class="super-stock-value">
          ${esc(expiredBalance)}
        </div>

        <div class="super-stock-unit">
          unit tidak boleh digunakan
        </div>

      </div>


      <div class="super-stock-card today">

        <div class="super-stock-icon">
          🥤
        </div>

        <div class="super-stock-label">
          Agihan Hari Ini
        </div>

        <div class="super-stock-value">
          ${esc(todayOut)}
        </div>

        <div class="super-stock-unit">
          unit telah diagihkan
        </div>

      </div>


      <div class="super-stock-card status">

        <div class="super-stock-icon">
          ⚠️
        </div>

        <div class="super-stock-label">
          Status Stok
        </div>

        <div
          class="super-stock-value ${statusClass}"
        >
          ${statusText}
        </div>

        <div class="super-stock-unit">
          berdasarkan stok boleh guna
        </div>

      </div>


    </div>


    <div
      class="super-stock-info ${infoClass}"
    >
      ${infoText}
    </div>

  `;

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

  ensureFefoPanel();

  const panel =
    document.getElementById(
      'fefoPanel'
    );

  if (!panel) {
    return;
  }

  if (
    !stockData ||
    !stockData.trackingActive
  ) {

    panel.className =
      'fefo-panel';

    panel.innerHTML =
      `
      <div class="fefo-title">
        🥛 FEFO — Gunakan Dahulu
      </div>

      <div class="fefo-empty">
        ℹ️ Penjejakan stok belum aktif.
      </div>
      `;

    return;
  }


  const batches =
    getFefoBatches();


  if (!batches.length) {

    panel.className =
      'fefo-panel danger';

    panel.innerHTML =
      `
      <div class="fefo-title">
        🥛 FEFO — Gunakan Dahulu
      </div>

      <div class="fefo-empty">
        🚫 Tiada stok yang boleh diagihkan.
      </div>
      `;

    return;
  }


  const first =
    batches[0];

  const days =
    getDaysUntilExpiry(
      first.expiryDate
    );


  let statusClass =
    'safe';

  let statusText =
    '✅ MASIH BAIK';


  if (
    days <= 3
  ) {

    statusClass =
      'danger';

    statusText =
      '🚨 HAMPIR LUPUT';

  }

  else if (
    days <= 7
  ) {

    statusClass =
      'warning';

    statusText =
      '⚠️ GUNA SEGERA';

  }


  panel.className =
    'fefo-panel ' +
    statusClass;


  panel.innerHTML =
    `

    <div class="fefo-title">
      🥛 FEFO — Gunakan Dahulu
    </div>


    <div class="fefo-main">


      <div>

        <div class="fefo-label">
          Batch Keutamaan
        </div>

        <div class="fefo-value">
          ${esc(
            first.batch || '-'
          )}
        </div>

      </div>


      <div>

        <div class="fefo-label">
          Tarikh Luput
        </div>

        <div class="fefo-value">
          ${esc(
            first.displayExpiryDate ||
            formatDateMs(
              first.expiryDate
            )
          )}
        </div>

      </div>


      <div>

        <div class="fefo-label">
          Baki Batch
        </div>

        <div class="fefo-value">
          ${esc(
            first.balance
          )} unit
        </div>

      </div>


      <div>

        <div class="fefo-label">
          Status
        </div>

        <div
          class="fefo-status ${statusClass}"
        >
          ${statusText}
        </div>

      </div>


    </div>


    <div class="fefo-note">
      📌 Gunakan stok batch ini terlebih dahulu
      sebelum batch yang mempunyai tarikh luput
      lebih lewat.
    </div>

    `;

}


/* =========================================================
   CIPTA PANEL FEFO
========================================================= */

function ensureFefoPanel() {

  if (
    document.getElementById(
      'fefoPanel'
    )
  ) {

    return;

  }


  if (
    !document.getElementById(
      'fefoStyle'
    )
  ) {

    const style =
      document.createElement(
        'style'
      );


    style.id =
      'fefoStyle';


    style.textContent =
      `

      .fefo-panel {

        background:
          #ffffff;

        border-radius:
          18px;

        padding:
          20px;

        margin:
          20px 0;

        box-shadow:
          0 5px 18px
          rgba(0,0,0,.08);

        border-left:
          7px solid #0284c7;

      }


      .fefo-panel.safe {

        border-left-color:
          #16a34a;

      }


      .fefo-panel.warning {

        border-left-color:
          #f59e0b;

      }


      .fefo-panel.danger {

        border-left-color:
          #dc2626;

      }


      .fefo-title {

        font-size:
          21px;

        font-weight:
          800;

        color:
          #075985;

        margin-bottom:
          15px;

      }


      .fefo-main {

        display:
          grid;

        grid-template-columns:
          repeat(4, 1fr);

        gap:
          15px;

      }


      .fefo-main > div {

        background:
          #f8fafc;

        border-radius:
          12px;

        padding:
          14px;

      }


      .fefo-label {

        color:
          #64748b;

        font-size:
          12px;

        font-weight:
          700;

        margin-bottom:
          6px;

      }


      .fefo-value {

        color:
          #172033;

        font-size:
          17px;

        font-weight:
          800;

      }


      .fefo-status {

        font-size:
          14px;

        font-weight:
          800;

      }


      .fefo-status.safe {

        color:
          #15803d;

      }


      .fefo-status.warning {

        color:
          #d97706;

      }


      .fefo-status.danger {

        color:
          #dc2626;

      }


      .fefo-note {

        margin-top:
          15px;

        padding:
          12px 14px;

        border-radius:
          10px;

        background:
          #eff6ff;

        color:
          #1e40af;

        font-size:
          13px;

        font-weight:
          600;

      }


      .fefo-empty {

        padding:
          15px;

        border-radius:
          10px;

        background:
          #f8fafc;

        font-weight:
          700;

      }


      @media (
        max-width: 800px
      ) {

        .fefo-main {

          grid-template-columns:
            repeat(2, 1fr);

        }

      }


      @media (
        max-width: 500px
      ) {

        .fefo-main {

          grid-template-columns:
            1fr;

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


  if (
    expiryBox &&
    expiryBox.parentNode
  ) {

    expiryBox.parentNode
      .insertBefore(
        panel,
        expiryBox
      );

    return;

  }


  const smartBox =
    document.getElementById(
      'smartStockAlert'
    );


  if (
    smartBox &&
    smartBox.parentNode
  ) {

    smartBox.parentNode
      .insertBefore(
        panel,
        smartBox.nextSibling
      );

    return;

  }


  const container =
    document.querySelector(
      '.container'
    );


  if (container) {

    container.appendChild(
      panel
    );

  }

}


/* =========================================================
   DAPATKAN SENARAI BATCH FEFO
========================================================= */

function getFefoBatches() {

  if (!stockData) {
    return [];
  }


  let batches =
    [];


  if (
    Array.isArray(
      stockData.batches
    )
  ) {

    batches =
      stockData.batches.slice();

  }

  else if (
    Array.isArray(
      stockData.batchSummary
    )
  ) {

    batches =
      stockData.batchSummary.slice();

  }

  else if (
    Array.isArray(
      stockData.stockBatches
    )
  ) {

    batches =
      stockData.stockBatches.slice();

  }


  batches =
    batches.filter(
      function (item) {

        const balance =
          Number(
            item.balance || 0
          );

        const expiryDate =
          String(
            item.expiryDate || ''
          ).trim();


        if (
          balance <= 0
        ) {

          return false;

        }


        if (
          !expiryDate
        ) {

          return true;

        }


        const days =
          getDaysUntilExpiry(
            expiryDate
          );


        return (
          days >= 0
        );

      }
    );


  batches.sort(
    function (a, b) {

      const aDate =
        String(
          a.expiryDate || ''
        );

      const bDate =
        String(
          b.expiryDate || ''
        );


      if (
        !aDate &&
        !bDate
      ) {

        return 0;

      }


      if (!aDate) {
        return 1;
      }


      if (!bDate) {
        return -1;
      }


      return (
        aDate.localeCompare(
          bDate
        )
      );

    }
  );


  return batches;

}


/* =========================================================
   PEMANTAUAN TARIKH LUPUT
========================================================= */

function renderExpiryAlerts() {

  ensureExpiryAlertBox();


  const box =
    document.getElementById(
      'expiryAlertBox'
    );


  if (!box) {
    return;
  }


  const batches =
    getAllStockBatches_();


  if (
    !batches.length
  ) {

    box.innerHTML =
      `

      <div class="expiry-title">
        📅 Pemantauan Tarikh Luput
      </div>

      <div class="expiry-empty">
        Tiada maklumat batch stok.
      </div>

      `;

    return;

  }


  const sorted =
    batches
      .slice()
      .sort(
        function (a, b) {

          const aDate =
            String(
              a.expiryDate || ''
            );

          const bDate =
            String(
              b.expiryDate || ''
            );


          if (
            !aDate &&
            !bDate
          ) {
            return 0;
          }


          if (!aDate) {
            return 1;
          }


          if (!bDate) {
            return -1;
          }


          return aDate.localeCompare(
            bDate
          );

        }
      );


  const rows =
    sorted
      .map(
        function (item) {

          const balance =
            Number(
              item.balance || 0
            );

          const expiry =
            String(
              item.expiryDate || ''
            );


          let badge =
            'TIADA TARIKH';

          let badgeClass =
            'neutral';


          if (expiry) {

            const days =
              getDaysUntilExpiry(
                expiry
              );


            if (days < 0) {

              badge =
                '🚫 LUPUT';

              badgeClass =
                'expired';

            }

            else if (
              days <= 3
            ) {

              badge =
                '🚨 ' +
                days +
                ' HARI';

              badgeClass =
                'danger';

            }

            else if (
              days <= 7
            ) {

              badge =
                '⚠️ ' +
                days +
                ' HARI';

              badgeClass =
                'warning';

            }

            else {

              badge =
                '✅ ' +
                days +
                ' HARI';

              badgeClass =
                'safe';

            }

          }


          return `

            <tr>

              <td>
                ${esc(
                  item.batch || '-'
                )}
              </td>

              <td>
                <strong>
                  ${esc(
                    balance
                  )}
                </strong>
              </td>

              <td>
                ${esc(
                  item.displayExpiryDate ||
                  formatDateMs(
                    expiry
                  )
                )}
              </td>

              <td>
                <span
                  class="expiry-badge ${badgeClass}"
                >
                  ${badge}
                </span>
              </td>

            </tr>

          `;

        }
      )
      .join('');


  box.innerHTML =
    `

    <div class="expiry-title">
      📅 Pemantauan Tarikh Luput
    </div>


    <div class="expiry-table-wrap">

      <table class="expiry-table">

        <thead>

          <tr>

            <th>
              Batch
            </th>

            <th>
              Baki
            </th>

            <th>
              Tarikh Luput
            </th>

            <th>
              Status
            </th>

          </tr>

        </thead>


        <tbody>
          ${rows}
        </tbody>

      </table>

    </div>

    `;

}


/* =========================================================
   CIPTA KOTAK PEMANTAUAN LUPUT
========================================================= */

function ensureExpiryAlertBox() {

  if (
    document.getElementById(
      'expiryAlertBox'
    )
  ) {

    return;

  }


  if (
    !document.getElementById(
      'expiryAlertStyle'
    )
  ) {

    const style =
      document.createElement(
        'style'
      );


    style.id =
      'expiryAlertStyle';


    style.textContent =
      `

      #expiryAlertBox {

        background:
          #ffffff;

        margin:
          20px 0;

        padding:
          20px;

        border-radius:
          18px;

        box-shadow:
          0 5px 18px
          rgba(0,0,0,.08);

      }


      .expiry-title {

        font-size:
          21px;

        font-weight:
          800;

        color:
          #075985;

        margin-bottom:
          15px;

      }


      .expiry-table-wrap {

        overflow-x:
          auto;

      }


      .expiry-table {

        width:
          100%;

        border-collapse:
          collapse;

      }


      .expiry-table th,
      .expiry-table td {

        padding:
          12px;

        border-bottom:
          1px solid #e2e8f0;

        text-align:
          left;

      }


      .expiry-table th {

        background:
          #f8fafc;

        color:
          #475569;

        font-size:
          13px;

      }


      .expiry-badge {

        display:
          inline-block;

        padding:
          6px 10px;

        border-radius:
          999px;

        font-size:
          12px;

        font-weight:
          800;

      }


      .expiry-badge.safe {

        background:
          #dcfce7;

        color:
          #166534;

      }


      .expiry-badge.warning {

        background:
          #fef3c7;

        color:
          #92400e;

      }


      .expiry-badge.danger {

        background:
          #fee2e2;

        color:
          #b91c1c;

      }


      .expiry-badge.expired {

        background:
          #7f1d1d;

        color:
          #ffffff;

      }


      .expiry-badge.neutral {

        background:
          #e2e8f0;

        color:
          #475569;

      }


      .expiry-empty {

        padding:
          15px;

        border-radius:
          10px;

        background:
          #f8fafc;

        color:
          #64748b;

        font-weight:
          600;

      }

      `;


    document.head
      .appendChild(
        style
      );

  }


  const box =
    document.createElement(
      'section'
    );


  box.id =
    'expiryAlertBox';


  const transactionTable =
    document.getElementById(
      'transactionTable'
    );


  if (
    transactionTable
  ) {

    const section =
      transactionTable.closest(
        'section'
      );


    if (
      section &&
      section.parentNode
    ) {

      section.parentNode
        .insertBefore(
          box,
          section
        );

      return;

    }

  }


  const container =
    document.querySelector(
      '.container'
    );


  if (container) {

    container.appendChild(
      box
    );

  }

}


/* =========================================================
   DAPATKAN SEMUA BATCH
========================================================= */

function getAllStockBatches_() {

  if (!stockData) {
    return [];
  }


  if (
    Array.isArray(
      stockData.batches
    )
  ) {

    return stockData.batches;

  }


  if (
    Array.isArray(
      stockData.batchSummary
    )
  ) {

    return stockData.batchSummary;

  }


  if (
    Array.isArray(
      stockData.stockBatches
    )
  ) {

    return stockData.stockBatches;

  }


  return [];

}


/* =========================================================
   KIRA HARI SEBELUM LUPUT
========================================================= */

function getDaysUntilExpiry(
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
      Number(
        parts[0]
      ),
      Number(
        parts[1]
      ) - 1,
      Number(
        parts[2]
      ),
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


  if (button) {

    button.disabled =
      true;

    button.textContent =
      '⏳ MENYIMPAN...';

  }


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

    if (button) {

      button.disabled =
        false;

      button.textContent =
        '📦 SIMPAN STOK MASUK';

    }

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
   REFRESH DATA
========================================================= */

async function refreshStock() {

  await loadStock();

}


/* =========================================================
   CARI / FILTER TRANSAKSI
========================================================= */

function filterTransactions() {

  renderTransactions();

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


  if (element) {

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


  if (element) {

    element.textContent =
      value;

  }

}


/* =========================================================
   SET INPUT VALUE
========================================================= */

function setInputValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

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
