const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';

let historyData = null;

window.addEventListener('load', function () {
  setDefaultDates();
  loadHistory();
});

function getMalaysiaDateParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const map = {};
  parts.forEach(function (part) {
    map[part.type] = part.value;
  });

  return { year: map.year, month: map.month, day: map.day };
}

function setDefaultDates() {
  const p = getMalaysiaDateParts();
  document.getElementById('startDate').value = p.year + '-' + p.month + '-01';
  document.getElementById('endDate').value = p.year + '-' + p.month + '-' + p.day;
}

function setTodayRange() {
  const p = getMalaysiaDateParts();
  const today = p.year + '-' + p.month + '-' + p.day;
  document.getElementById('startDate').value = today;
  document.getElementById('endDate').value = today;
  loadHistory();
}

function setThisMonthRange() {
  setDefaultDates();
  loadHistory();
}

function callAppsScript(params) {
  return new Promise(function (resolve, reject) {
    const callbackName = 'historyApi_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    const script = document.createElement('script');

    const timeout = setTimeout(function () {
      cleanup();
      reject(new Error('Server tidak memberi respons.'));
    }, 15000);

    window[callbackName] = function (result) {
      clearTimeout(timeout);
      cleanup();
      resolve(result);
    };

    function cleanup() {
      try { delete window[callbackName]; } catch (e) {}
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    const query = new URLSearchParams();
    Object.keys(params).forEach(function (key) {
      query.set(key, params[key] ?? '');
    });

    query.set('callback', callbackName);
    query.set('_', Date.now());

    script.src = APPS_SCRIPT_URL + '?' + query.toString();

    script.onerror = function () {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Gagal menghubungi server.'));
    };

    document.body.appendChild(script);
  });
}

async function loadHistory() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!startDate || !endDate) {
    alert('Sila pilih tarikh mula dan tarikh akhir.');
    return;
  }

  if (startDate > endDate) {
    alert('Tarikh mula tidak boleh selepas tarikh akhir.');
    return;
  }

  setStatus('⏳ Mengambil rekod ' + startDate + ' hingga ' + endDate + '...');

  try {
    const result = await callAppsScript({
      action: 'history',
      start: startDate,
      end: endDate
    });

    if (!result || !result.success) {
      throw new Error(result && result.message ? result.message : 'Rekod gagal dimuatkan.');
    }

    historyData = result;
    populateClassFilter();
    renderAll();
    setStatus('✅ Rekod berjaya dimuatkan.');
  } catch (error) {
    console.error(error);
    setStatus('❌ ' + error.message + ' Pastikan History.gs disimpan dan deployment Apps Script dibuat New version.');
  }
}

function renderAll() {
  if (!historyData) return;

  const summary = historyData.summary || {};

  document.getElementById('rangeText').textContent =
    (historyData.displayStartDate || '-') + ' hingga ' + (historyData.displayEndDate || '-');

  document.getElementById('generatedAt').textContent = historyData.generatedAt || '-';
  document.getElementById('totalRecords').textContent = summary.totalRecords || 0;
  document.getElementById('uniqueStudents').textContent = summary.uniqueStudents || 0;
  document.getElementById('totalDays').textContent = summary.totalDays || 0;
  document.getElementById('totalClasses').textContent = summary.totalClasses || 0;

  renderDaily();
  renderByClass();
  renderRecords();
}

function renderDaily() {
  const tbody = document.getElementById('dailyTable');
  const data = historyData && historyData.daily ? historyData.daily : [];

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="center">Tiada rekod dalam julat tarikh ini.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(function (item, index) {
    return '<tr>' +
      '<td>' + (index + 1) + '</td>' +
      '<td>' + escapeHtml(item.displayDate) + '</td>' +
      '<td class="center"><strong>' + (item.total || 0) + '</strong></td>' +
      '</tr>';
  }).join('');
}

function renderByClass() {
  const tbody = document.getElementById('classTable');
  const data = historyData && historyData.byClass ? historyData.byClass : [];

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="center">Tiada rekod kelas.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(function (item, index) {
    return '<tr>' +
      '<td>' + (index + 1) + '</td>' +
      '<td><strong>' + escapeHtml(item.className) + '</strong></td>' +
      '<td class="center">' + (item.total || 0) + '</td>' +
      '</tr>';
  }).join('');
}

function populateClassFilter() {
  const select = document.getElementById('classFilter');
  const current = select.value;

  const classes = Array.from(new Set(
    (historyData.records || []).map(function (item) {
      return item.className;
    }).filter(Boolean)
  )).sort(function (a, b) {
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });

  select.innerHTML = '<option value="">Semua Kelas</option>';

  classes.forEach(function (className) {
    const option = document.createElement('option');
    option.value = className;
    option.textContent = className;
    select.appendChild(option);
  });

  if (classes.includes(current)) select.value = current;
}

function renderRecords() {
  if (!historyData) return;

  const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
  const classFilter = document.getElementById('classFilter').value;

  const records = (historyData.records || []).filter(function (item) {
    const text = (
      String(item.name || '') + ' ' +
      String(item.studentId || '') + ' ' +
      String(item.className || '') + ' ' +
      String(item.teacher || '') + ' ' +
      String(item.displayDate || '')
    ).toLowerCase();

    return (!keyword || text.includes(keyword)) &&
      (!classFilter || item.className === classFilter);
  });

  const tbody = document.getElementById('recordTable');

  if (!records.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="center">Tiada rekod ditemui.</td></tr>';
    return;
  }

  tbody.innerHTML = records.map(function (item, index) {
    return '<tr>' +
      '<td>' + (index + 1) + '</td>' +
      '<td>' + escapeHtml(item.displayDate) + '</td>' +
      '<td>' + escapeHtml(item.time) + '</td>' +
      '<td><strong>' + escapeHtml(item.name) + '</strong></td>' +
      '<td>' + escapeHtml(item.className) + '</td>' +
      '<td>' + escapeHtml(item.studentId) + '</td>' +
      '<td>' + escapeHtml(item.teacher || '-') + '</td>' +
      '<td><span class="badge">BERJAYA</span></td>' +
      '</tr>';
  }).join('');
}

function exportCsv() {
  if (!historyData || !historyData.records || !historyData.records.length) {
    alert('Tiada rekod untuk dieksport.');
    return;
  }

  const rows = [[
    'Bil', 'Tarikh', 'Masa', 'Nama Murid',
    'Kelas', 'ID Murid', 'Guru', 'Device'
  ]];

  historyData.records.forEach(function (item, index) {
    rows.push([
      index + 1,
      item.displayDate || '',
      item.time || '',
      item.name || '',
      item.className || '',
      item.studentId || '',
      item.teacher || '',
      item.device || ''
    ]);
  });

  const csv = '\uFEFF' + rows.map(function (row) {
    return row.map(csvCell).join(',');
  }).join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'Rekod_Susu_' + historyData.startDate + '_hingga_' + historyData.endDate + '.csv';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? '').replace(/"/g, '""');
  return '"' + text + '"';
}

function setStatus(text) {
  const el = document.getElementById('historyStatus');
  if (el) el.textContent = text;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
