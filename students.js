const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';


let allStudents = [];

let bulkStudents = [];

let bulkImportRunning = false;


/* =========================================================
   START
========================================================= */

window.addEventListener(
  'load',
  function () {

    loadStudents();

  }
);


/* =========================================================
   JSONP
========================================================= */

function callAppsScript(params) {

  return new Promise(
    function (resolve, reject) {

      const callbackName =
        'studentApi_' +
        Date.now() +
        '_' +
        Math.floor(
          Math.random() * 100000
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


      window[callbackName] =
        function (result) {

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
            callbackName
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
      ).forEach(
        function (key) {

          query.set(
            key,
            params[key] ?? ''
          );

        }
      );


      query.set(
        'callback',
        callbackName
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
   LOAD SEMUA MURID
========================================================= */

async function loadStudents() {

  setStatus(
    '⏳ Mengambil data murid...'
  );


  try {

    const result =
      await callAppsScript({
        action:
          'studentsAll'
      });


    if (
      !result ||
      !result.success
    ) {

      throw new Error(
        result &&
        result.message
          ? result.message
          : 'Data murid gagal dimuatkan.'
      );

    }


    allStudents =
      result.students || [];


    sortStudents();

    renderStudents();


    const activeCount =
      allStudents.filter(
        function (student) {

          return (
            student.status ===
            'AKTIF'
          );

        }
      ).length;


    const inactiveCount =
      allStudents.length -
      activeCount;


    setStatus(
      '✅ Jumlah Murid: ' +
      allStudents.length +
      ' | Aktif: ' +
      activeCount +
      ' | Tidak Aktif: ' +
      inactiveCount
    );

  }

  catch (error) {

    console.error(
      error
    );


    setStatus(
      '❌ ' +
      error.message
    );

  }

}


/* =========================================================
   SORT MURID
========================================================= */

function sortStudents() {

  allStudents.sort(
    function (a, b) {

      const classCompare =
        String(
          a.className || ''
        )
        .localeCompare(
          String(
            b.className || ''
          ),
          undefined,
          {
            numeric: true
          }
        );


      if (
        classCompare !== 0
      ) {

        return classCompare;

      }


      return String(
        a.name || ''
      )
      .localeCompare(
        String(
          b.name || ''
        )
      );

    }
  );

}


/* =========================================================
   SIMPAN / EDIT MURID
========================================================= */

async function saveStudent() {

  const studentId =
    document
      .getElementById(
        'studentId'
      )
      .value
      .trim();


  const name =
    document
      .getElementById(
        'studentName'
      )
      .value
      .trim();


  const className =
    document
      .getElementById(
        'studentClass'
      )
      .value
      .trim();


  const year =
    document
      .getElementById(
        'studentYear'
      )
      .value;


  const gender =
    document
      .getElementById(
        'studentGender'
      )
      .value;


  const noKp =
    document
      .getElementById(
        'studentNoKp'
      )
      .value
      .trim();


  const notes =
    document
      .getElementById(
        'studentNotes'
      )
      .value
      .trim();


  if (!name) {

    alert(
      'Sila masukkan nama murid.'
    );

    document
      .getElementById(
        'studentName'
      )
      .focus();

    return;

  }


  if (!className) {

    alert(
      'Sila masukkan kelas murid.'
    );

    document
      .getElementById(
        'studentClass'
      )
      .focus();

    return;

  }


  const params = {

    action:
      studentId
        ? 'studentUpdate'
        : 'studentAdd',

    studentId:
      studentId,

    name:
      name,

    className:
      className,

    year:
      year,

    gender:
      gender,

    noKp:
      noKp,

    notes:
      notes

  };


  setStatus(
    studentId
      ? '⏳ Mengemas kini murid...'
      : '⏳ Menambah murid...'
  );


  try {

    const result =
      await callAppsScript(
        params
      );


    if (
      !result ||
      !result.success
    ) {

      throw new Error(
        result &&
        result.message
          ? result.message
          : 'Data murid gagal disimpan.'
      );

    }


    alert(
      '✅ ' +
      result.message
    );


    resetForm();

    await loadStudents();

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

}


/* =========================================================
   IMPORT MURID PUKAL
   PARSE / PREVIEW
========================================================= */

function previewBulkStudents() {

  if (bulkImportRunning) {
    return;
  }


  const textarea =
    document.getElementById(
      'bulkStudentData'
    );


  if (!textarea) {

    alert(
      'Ruangan Import Murid Pukal tidak dijumpai.'
    );

    return;

  }


  const raw =
    String(
      textarea.value || ''
    )
    .trim();


  if (!raw) {

    alert(
      'Sila paste data murid daripada Excel atau Google Sheets terlebih dahulu.'
    );

    textarea.focus();

    return;

  }


  const parsed =
    parseBulkStudentData(
      raw
    );


  bulkStudents =
    parsed.students;


  renderBulkPreview(
    parsed
  );


  if (
    parsed.students.length === 0
  ) {

    setBulkStatus(
      '❌ Tiada data murid yang sah untuk diimport.'
    );

    return;

  }


  setBulkStatus(
    '👁️ Preview selesai. ' +
    parsed.students.length +
    ' rekod dikesan. Sila semak data sebelum tekan IMPORT MURID.'
  );

}


/* =========================================================
   PARSE DATA EXCEL / GOOGLE SHEETS
========================================================= */

function parseBulkStudentData(raw) {

  const lines =
    String(
      raw || ''
    )
    .replace(
      /\r/g,
      ''
    )
    .split('\n')
    .filter(
      function (line) {

        return String(
          line || ''
        ).trim() !== '';

      }
    );


  const result = {

    students: [],

    invalid: [],

    headerDetected: false

  };


  if (
    lines.length === 0
  ) {

    return result;

  }


  const firstColumns =
    splitBulkLine_(
      lines[0]
    );


  const headerMap =
    detectBulkHeader_(
      firstColumns
    );


  let startIndex = 0;


  if (
    headerMap.isHeader
  ) {

    result.headerDetected =
      true;

    startIndex = 1;

  }


  for (
    let i = startIndex;
    i < lines.length;
    i++
  ) {

    const columns =
      splitBulkLine_(
        lines[i]
      );


    let student;


    if (
      result.headerDetected
    ) {

      student =
        buildBulkStudentFromHeader_(
          columns,
          headerMap
        );

    }
    else {

      student =
        buildBulkStudentByPosition_(
          columns
        );

    }


    student.sourceRow =
      i + 1;


    student.name =
      normalizeBulkText_(
        student.name
      );


    student.className =
      normalizeBulkText_(
        student.className
      );


    student.gender =
      normalizeBulkGender_(
        student.gender
      );


    student.noKp =
      normalizeBulkNoKp_(
        student.noKp
      );


    student.notes =
      String(
        student.notes || ''
      )
      .trim();


    student.year =
      normalizeBulkYear_(
        student.year,
        student.className
      );


    const errors = [];


    if (
      !student.name
    ) {

      errors.push(
        'Nama kosong'
      );

    }


    if (
      !student.className
    ) {

      errors.push(
        'Kelas kosong'
      );

    }


    if (
      student.gender &&
      student.gender !== 'LELAKI' &&
      student.gender !== 'PEREMPUAN'
    ) {

      errors.push(
        'Jantina tidak dikenali'
      );

    }


    student.valid =
      errors.length === 0;


    student.errors =
      errors;


    result.students.push(
      student
    );


    if (
      !student.valid
    ) {

      result.invalid.push(
        student
      );

    }

  }


  return result;

}


/* =========================================================
   PECAH BARIS IMPORT
========================================================= */

function splitBulkLine_(line) {

  const text =
    String(
      line || ''
    );


  /*
    Copy daripada Excel / Google Sheets
    biasanya menggunakan TAB.
  */

  if (
    text.includes('\t')
  ) {

    return text
      .split('\t')
      .map(
        function (value) {

          return String(
            value || ''
          ).trim();

        }
      );

  }


  /*
    Sokongan tambahan untuk data dipisahkan
    dengan semicolon.
  */

  if (
    text.includes(';')
  ) {

    return text
      .split(';')
      .map(
        function (value) {

          return String(
            value || ''
          ).trim();

        }
      );

  }


  /*
    Sokongan asas CSV.
  */

  return parseSimpleCsvLine_(
    text
  );

}


/* =========================================================
   PARSE CSV RINGKAS
========================================================= */

function parseSimpleCsvLine_(line) {

  const values = [];

  let current = '';

  let inQuotes = false;


  for (
    let i = 0;
    i < line.length;
    i++
  ) {

    const char =
      line[i];


    if (
      char === '"'
    ) {

      if (
        inQuotes &&
        line[i + 1] === '"'
      ) {

        current += '"';

        i++;

      }
      else {

        inQuotes =
          !inQuotes;

      }

    }
    else if (
      char === ',' &&
      !inQuotes
    ) {

      values.push(
        current.trim()
      );

      current = '';

    }
    else {

      current += char;

    }

  }


  values.push(
    current.trim()
  );


  return values;

}/* =========================================================
   KESAN HEADER IMPORT
========================================================= */

function detectBulkHeader_(columns) {

  const map = {

    isHeader: false,

    name: -1,

    className: -1,

    year: -1,

    gender: -1,

    noKp: -1,

    notes: -1

  };


  columns.forEach(
    function (column, index) {

      const header =
        normalizeHeaderText_(
          column
        );


      if (
        header === 'NAMA' ||
        header === 'NAMA MURID' ||
        header === 'NAMAMURID' ||
        header === 'NAME' ||
        header === 'STUDENT NAME'
      ) {

        map.name =
          index;

        map.isHeader =
          true;

      }


      if (
        header === 'KELAS' ||
        header === 'CLASS'
      ) {

        map.className =
          index;

        map.isHeader =
          true;

      }


      if (
        header === 'TAHUN' ||
        header === 'YEAR'
      ) {

        map.year =
          index;

        map.isHeader =
          true;

      }


      if (
        header === 'JANTINA' ||
        header === 'GENDER'
      ) {

        map.gender =
          index;

        map.isHeader =
          true;

      }


      if (
        header === 'NO KP' ||
        header === 'NO. KP' ||
        header === 'NO_KP' ||
        header === 'NOKP' ||
        header === 'MYKID' ||
        header === 'NO MYKID' ||
        header === 'NO. MYKID' ||
        header === 'NO KP MYKID' ||
        header === 'NO. KP / MYKID' ||
        header === 'NO KP / MYKID'
      ) {

        map.noKp =
          index;

        map.isHeader =
          true;

      }


      if (
        header === 'CATATAN' ||
        header === 'NOTES' ||
        header === 'NOTE'
      ) {

        map.notes =
          index;

        map.isHeader =
          true;

      }

    }
  );


  /*
    Elakkan baris biasa tersalah dianggap header.
    Sekurang-kurangnya NAMA atau KELAS perlu dikesan.
  */

  if (
    map.name === -1 &&
    map.className === -1
  ) {

    map.isHeader =
      false;

  }


  return map;

}


/* =========================================================
   NORMALIZE HEADER
========================================================= */

function normalizeHeaderText_(value) {

  return String(
    value || ''
  )
  .trim()
  .toUpperCase()
  .replace(
    /\s+/g,
    ' '
  );

}


/* =========================================================
   BINA MURID BERDASARKAN HEADER
========================================================= */

function buildBulkStudentFromHeader_(
  columns,
  map
) {

  return {

    name:
      getBulkColumn_(
        columns,
        map.name
      ),

    className:
      getBulkColumn_(
        columns,
        map.className
      ),

    year:
      getBulkColumn_(
        columns,
        map.year
      ),

    gender:
      getBulkColumn_(
        columns,
        map.gender
      ),

    noKp:
      getBulkColumn_(
        columns,
        map.noKp
      ),

    notes:
      getBulkColumn_(
        columns,
        map.notes
      )

  };

}


/* =========================================================
   BINA MURID TANPA HEADER
   SUSUNAN:
   NAMA | KELAS | TAHUN | JANTINA | NO KP | CATATAN
========================================================= */

function buildBulkStudentByPosition_(
  columns
) {

  return {

    name:
      columns[0] || '',

    className:
      columns[1] || '',

    year:
      columns[2] || '',

    gender:
      columns[3] || '',

    noKp:
      columns[4] || '',

    notes:
      columns[5] || ''

  };

}


/* =========================================================
   AMBIL NILAI KOLUM
========================================================= */

function getBulkColumn_(
  columns,
  index
) {

  if (
    index === -1 ||
    index === undefined ||
    index === null
  ) {

    return '';

  }


  return String(
    columns[index] || ''
  )
  .trim();

}


/* =========================================================
   NORMALIZE TEKS
========================================================= */

function normalizeBulkText_(value) {

  return String(
    value || ''
  )
  .trim()
  .replace(
    /\s+/g,
    ' '
  )
  .toUpperCase();

}


/* =========================================================
   NORMALIZE NO KP / MYKID
========================================================= */

function normalizeBulkNoKp_(value) {

  return String(
    value || ''
  )
  .trim()
  .replace(
    /\s+/g,
    ''
  )
  .replace(
    /-/g,
    ''
  );

}


/* =========================================================
   NORMALIZE JANTINA
========================================================= */

function normalizeBulkGender_(value) {

  const gender =
    String(
      value || ''
    )
    .trim()
    .toUpperCase();


  if (!gender) {

    return '';

  }


  if (
    gender === 'L' ||
    gender === 'LELAKI' ||
    gender === 'MALE' ||
    gender === 'M'
  ) {

    return 'LELAKI';

  }


  if (
    gender === 'P' ||
    gender === 'PEREMPUAN' ||
    gender === 'FEMALE' ||
    gender === 'F'
  ) {

    return 'PEREMPUAN';

  }


  return gender;

}


/* =========================================================
   NORMALIZE / AUTO TAHUN
========================================================= */

function normalizeBulkYear_(
  year,
  className
) {

  let value =
    String(
      year || ''
    )
    .trim();


  /*
    Jika kolum Tahun mengandungi
    "TAHUN 1", tukar kepada "1".
  */

  value =
    value
      .replace(
        /TAHUN/gi,
        ''
      )
      .trim();


  if (
    /^[1-6]$/.test(
      value
    )
  ) {

    return value;

  }


  /*
    Jika Tahun kosong,
    cuba ambil nombor pertama daripada kelas.
    Contoh:
    1A -> 1
    6B -> 6
  */

  const classMatch =
    String(
      className || ''
    )
    .trim()
    .match(
      /^([1-6])/
    );


  if (
    classMatch
  ) {

    return classMatch[1];

  }


  return value;

}


/* =========================================================
   PREVIEW DATA IMPORT
========================================================= */

function renderBulkPreview(
  parsed
) {

  const wrap =
    document.getElementById(
      'bulkPreviewWrap'
    );


  const summary =
    document.getElementById(
      'bulkPreviewSummary'
    );


  const tbody =
    document.getElementById(
      'bulkPreviewTable'
    );


  if (
    !wrap ||
    !summary ||
    !tbody
  ) {

    return;

  }


  wrap.style.display =
    'block';


  const total =
    parsed.students.length;


  const validCount =
    parsed.students.filter(
      function (student) {

        return student.valid;

      }
    ).length;


  const invalidCount =
    total -
    validCount;


  const duplicateCount =
    countBulkLocalDuplicates_(
      parsed.students
    );


  summary.innerHTML =
    '📋 Rekod dikesan: <strong>' +
    total +
    '</strong>' +

    ' &nbsp; | &nbsp; ' +

    '✅ Sah: <strong>' +
    validCount +
    '</strong>' +

    ' &nbsp; | &nbsp; ' +

    '⚠️ Duplicate awal: <strong>' +
    duplicateCount +
    '</strong>' +

    ' &nbsp; | &nbsp; ' +

    '❌ Tidak sah: <strong>' +
    invalidCount +
    '</strong>' +

    (
      parsed.headerDetected
        ? ' &nbsp; | &nbsp; 🧾 Header dikesan'
        : ' &nbsp; | &nbsp; ℹ️ Tiada header'
    );


  tbody.innerHTML = '';


  if (
    total === 0
  ) {

    tbody.innerHTML =
      `
      <tr>
        <td
          colspan="7"
          style="
            text-align:center;
            padding:25px;
          "
        >
          Tiada data murid.
        </td>
      </tr>
      `;

    return;

  }


  const duplicateKeys =
    buildBulkDuplicateKeys_(
      parsed.students
    );


  parsed.students.forEach(
    function (student, index) {

      const row =
        document.createElement(
          'tr'
        );


      const duplicate =
        isBulkStudentDuplicate_(
          student,
          duplicateKeys
        );


      let statusText =
        '✅ SAH';


      if (
        !student.valid
      ) {

        statusText =
          '❌ ' +
          (
            student.errors.join(
              ', '
            ) ||
            'Data tidak sah'
          );

        row.className =
          'bulk-row-invalid';

      }
      else if (
        duplicate
      ) {

        statusText =
          '⚠️ DUPLICATE';

      }


      row.innerHTML =
        `
        <td>
          ${index + 1}
        </td>

        <td>
          <strong>
            ${escapeHtml(
              student.name || '-'
            )}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            student.className || '-'
          )}
        </td>

        <td>
          ${escapeHtml(
            student.year || '-'
          )}
        </td>

        <td>
          ${escapeHtml(
            student.gender || '-'
          )}
        </td>

        <td>
          ${escapeHtml(
            student.noKp || '-'
          )}
        </td>

        <td>
          ${escapeHtml(
            statusText
          )}
        </td>
        `;


      tbody.appendChild(
        row
      );

    }
  );

}


/* =========================================================
   KIRA DUPLICATE AWAL
========================================================= */

function countBulkLocalDuplicates_(
  students
) {

  const duplicateKeys =
    buildBulkDuplicateKeys_(
      students
    );


  let count = 0;


  students.forEach(
    function (student) {

      if (
        isBulkStudentDuplicate_(
          student,
          duplicateKeys
        )
      ) {

        count++;

      }

    }
  );


  return count;

}


/* =========================================================
   BINA PETA DUPLICATE
========================================================= */

function buildBulkDuplicateKeys_(
  students
) {

  const noKpCounts = {};

  const nameClassCounts = {};


  students.forEach(
    function (student) {

      const noKp =
        normalizeBulkNoKp_(
          student.noKp
        );


      const nameClass =
        normalizeBulkText_(
          student.name
        ) +
        '|' +
        normalizeBulkText_(
          student.className
        );


      if (noKp) {

        noKpCounts[noKp] =
          (
            noKpCounts[noKp] ||
            0
          ) + 1;

      }


      if (
        student.name &&
        student.className
      ) {

        nameClassCounts[
          nameClass
        ] =
          (
            nameClassCounts[
              nameClass
            ] ||
            0
          ) + 1;

      }

    }
  );


  return {

    noKpCounts:
      noKpCounts,

    nameClassCounts:
      nameClassCounts

  };

}


/* =========================================================
   SEMAK DUPLICATE DALAM DATA PASTE
========================================================= */

function isBulkStudentDuplicate_(
  student,
  duplicateKeys
) {

  const noKp =
    normalizeBulkNoKp_(
      student.noKp
    );


  if (
    noKp &&
    duplicateKeys.noKpCounts[
      noKp
    ] > 1
  ) {

    return true;

  }


  const nameClass =
    normalizeBulkText_(
      student.name
    ) +
    '|' +
    normalizeBulkText_(
      student.className
    );


  if (
    student.name &&
    student.className &&
    duplicateKeys.nameClassCounts[
      nameClass
    ] > 1
  ) {

    return true;

  }


  /*
    Semak juga dengan data murid
    yang sudah ada dalam sistem.
  */

  const existingDuplicate =
    allStudents.some(
      function (existing) {

        const existingNoKp =
          normalizeBulkNoKp_(
            existing.noKp
          );


        if (
          noKp &&
          existingNoKp &&
          noKp === existingNoKp
        ) {

          return true;

        }


        const existingNameClass =
          normalizeBulkText_(
            existing.name
          ) +
          '|' +
          normalizeBulkText_(
            existing.className
          );


        return (
          nameClass ===
          existingNameClass
        );

      }
    );


  return existingDuplicate;

}


/* =========================================================
   IMPORT MURID PUKAL
========================================================= */

async function importBulkStudents() {

  if (
    bulkImportRunning
  ) {

    return;

  }


  /*
    Baca semula textarea setiap kali Import ditekan
    supaya data terkini digunakan.
  */

  const textarea =
    document.getElementById(
      'bulkStudentData'
    );


  if (!textarea) {

    alert(
      'Ruangan Import Murid Pukal tidak dijumpai.'
    );

    return;

  }


  const raw =
    String(
      textarea.value || ''
    )
    .trim();


  if (!raw) {

    alert(
      'Sila paste data murid terlebih dahulu.'
    );

    textarea.focus();

    return;

  }


  const parsed =
    parseBulkStudentData(
      raw
    );


  bulkStudents =
    parsed.students;


  renderBulkPreview(
    parsed
  );


  const validStudents =
    bulkStudents.filter(
      function (student) {

        return student.valid;

      }
    );


  if (
    validStudents.length === 0
  ) {

    setBulkStatus(
      '❌ Tiada rekod yang sah untuk diimport.'
    );

    return;

  }


  const confirmed =
    confirm(
      'Import ' +
      validStudents.length +
      ' rekod murid sekarang?\n\n' +
      'Sistem akan menyemak duplicate sekali lagi di server sebelum menyimpan.'
    );


  if (!confirmed) {

    return;

  }


  bulkImportRunning =
    true;


  setBulkButtonsDisabled_(
    true
  );


  showBulkProgress_(
    0,
    validStudents.length,
    'Memulakan import...'
  );


  setBulkStatus(
    '⏳ Import murid sedang dijalankan. Jangan tutup halaman ini.'
  );


  /*
    JSONP menggunakan GET.
    Kita pecahkan kepada batch kecil supaya URL
    tidak terlalu panjang.
  */

  const BATCH_SIZE = 10;


  let importedTotal = 0;

  let skippedTotal = 0;

  let invalidTotal = 0;

  let processedTotal = 0;

  const skippedDetails = [];

  const invalidDetails = [];


  try {

    for (
      let start = 0;
      start < validStudents.length;
      start += BATCH_SIZE
    ) {

      const chunk =
        validStudents.slice(
          start,
          start + BATCH_SIZE
        );


      const cleanChunk =
        chunk.map(
          function (student) {

            return {

              name:
                student.name,

              className:
                student.className,

              year:
                student.year,

              gender:
                student.gender,

              noKp:
                student.noKp,

              notes:
                student.notes

            };

          }
        );


      const fromNumber =
        start + 1;


      const toNumber =
        Math.min(
          start + chunk.length,
          validStudents.length
        );


      showBulkProgress_(
        processedTotal,
        validStudents.length,
        'Mengimport murid ' +
        fromNumber +
        '–' +
        toNumber +
        ' daripada ' +
        validStudents.length +
        '...'
      );


      const result =
        await callAppsScript({

          action:
            'studentBulkImport',

          students:
            JSON.stringify(
              cleanChunk
            )

        });


      if (
        !result ||
        !result.success
      ) {

        throw new Error(
          result &&
          result.message
            ? result.message
            : 'Import murid gagal.'
        );

      }


      const summary =
        result.summary || {};


      importedTotal +=
        Number(
          summary.imported ||
          result.imported ||
          0
        );


      skippedTotal +=
        Number(
          summary.skipped ||
          result.skippedCount ||
          0
        );


      invalidTotal +=
        Number(
          summary.invalid ||
          result.invalidCount ||
          0
        );


      if (
        Array.isArray(
          result.skipped
        )
      ) {

        result.skipped.forEach(
          function (item) {

            skippedDetails.push(
              item
            );

          }
        );

      }


      if (
        Array.isArray(
          result.invalid
        )
      ) {

        result.invalid.forEach(
          function (item) {

            invalidDetails.push(
              item
            );

          }
        );

      }


      processedTotal +=
        chunk.length;


      showBulkProgress_(
        processedTotal,
        validStudents.length,
        'Selesai ' +
        processedTotal +
        ' daripada ' +
        validStudents.length +
        ' rekod.'
      );

    }


    await loadStudents();


    showBulkProgress_(
      validStudents.length,
      validStudents.length,
      '✅ Import selesai.'
    );


    showBulkImportResult_({

      imported:
        importedTotal,

      skipped:
        skippedTotal,

      invalid:
        invalidTotal +
        parsed.invalid.length,

      skippedDetails:
        skippedDetails,

      invalidDetails:
        invalidDetails

    });


    setStatus(
      '✅ Import murid selesai. Senarai murid telah dikemas kini.'
    );

  }

  catch (error) {

    console.error(
      error
    );


    setBulkStatus(
      '❌ Import terhenti: ' +
      error.message +
      '<br><br>' +
      'Rekod yang sudah berjaya disimpan sebelum ralat tidak akan hilang. ' +
      'Jika import dibuat semula, server akan menyemak duplicate.'
    );


    alert(
      '❌ Import murid terhenti.\n\n' +
      error.message
    );

  }

  finally {

    bulkImportRunning =
      false;


    setBulkButtonsDisabled_(
      false
    );

  }

}/* =========================================================
   PAPAR PROGRESS IMPORT
========================================================= */

function showBulkProgress_(
  processed,
  total,
  text
) {

  const wrap =
    document.getElementById(
      'bulkProgressWrap'
    );


  const textEl =
    document.getElementById(
      'bulkProgressText'
    );


  const bar =
    document.getElementById(
      'bulkProgressBar'
    );


  if (wrap) {

    wrap.style.display =
      'block';

  }


  if (textEl) {

    textEl.textContent =
      text || '';

  }


  let percentage = 0;


  if (
    total > 0
  ) {

    percentage =
      Math.round(
        (
          Number(processed || 0) /
          Number(total)
        ) * 100
      );

  }


  percentage =
    Math.max(
      0,
      Math.min(
        100,
        percentage
      )
    );


  if (bar) {

    bar.style.width =
      percentage + '%';

  }

}


/* =========================================================
   STATUS IMPORT
========================================================= */

function setBulkStatus(
  html
) {

  const el =
    document.getElementById(
      'bulkStatus'
    );


  if (!el) {
    return;
  }


  el.style.display =
    'block';


  el.innerHTML =
    html || '';

}


/* =========================================================
   ENABLE / DISABLE BUTTON IMPORT
========================================================= */

function setBulkButtonsDisabled_(
  disabled
) {

  [
    'btnBulkPreview',
    'btnBulkImport',
    'btnBulkClear'
  ].forEach(
    function (id) {

      const button =
        document.getElementById(
          id
        );


      if (button) {

        button.disabled =
          Boolean(
            disabled
          );

      }

    }
  );

}


/* =========================================================
   KEPUTUSAN IMPORT
========================================================= */

function showBulkImportResult_(
  data
) {

  const imported =
    Number(
      data.imported || 0
    );


  const skipped =
    Number(
      data.skipped || 0
    );


  const invalid =
    Number(
      data.invalid || 0
    );


  let html =
    `
    <div>
      <strong>
        ✅ Import Murid Pukal Selesai
      </strong>
    </div>

    <div class="bulk-result-grid">

      <div class="bulk-result-item">
        <strong>
          ${imported}
        </strong>
        Berjaya
      </div>

      <div class="bulk-result-item">
        <strong>
          ${skipped}
        </strong>
        Duplicate / Dilangkau
      </div>

      <div class="bulk-result-item">
        <strong>
          ${invalid}
        </strong>
        Tidak Sah
      </div>

    </div>
    `;


  if (
    data.skippedDetails &&
    data.skippedDetails.length > 0
  ) {

    html +=
      `
      <details
        style="
          margin-top:14px;
        "
      >

        <summary
          style="
            cursor:pointer;
            font-weight:bold;
          "
        >
          ⚠️ Lihat rekod duplicate / dilangkau
        </summary>

        <div
          style="
            margin-top:10px;
            max-height:220px;
            overflow:auto;
          "
        >
      `;


    data.skippedDetails.forEach(
      function (item) {

        const name =
          item.name ||
          item.NAMA ||
          '-';


        const reason =
          item.reason ||
          item.message ||
          'Duplicate / dilangkau';


        html +=
          `
          <div
            style="
              padding:7px 0;
              border-bottom:1px solid #e5e7eb;
            "
          >
            ${escapeHtml(name)}
            —
            ${escapeHtml(reason)}
          </div>
          `;

      }
    );


    html +=
      `
        </div>

      </details>
      `;

  }


  if (
    data.invalidDetails &&
    data.invalidDetails.length > 0
  ) {

    html +=
      `
      <details
        style="
          margin-top:12px;
        "
      >

        <summary
          style="
            cursor:pointer;
            font-weight:bold;
          "
        >
          ❌ Lihat rekod tidak sah
        </summary>

        <div
          style="
            margin-top:10px;
            max-height:220px;
            overflow:auto;
          "
        >
      `;


    data.invalidDetails.forEach(
      function (item) {

        const name =
          item.name ||
          item.NAMA ||
          '-';


        const reason =
          item.reason ||
          item.message ||
          'Data tidak sah';


        html +=
          `
          <div
            style="
              padding:7px 0;
              border-bottom:1px solid #e5e7eb;
            "
          >
            ${escapeHtml(name)}
            —
            ${escapeHtml(reason)}
          </div>
          `;

      }
    );


    html +=
      `
        </div>

      </details>
      `;

  }


  setBulkStatus(
    html
  );

}


/* =========================================================
   KOSONGKAN IMPORT
========================================================= */

function clearBulkImport() {

  if (
    bulkImportRunning
  ) {

    return;

  }


  const textarea =
    document.getElementById(
      'bulkStudentData'
    );


  if (textarea) {

    textarea.value = '';

  }


  bulkStudents = [];


  const status =
    document.getElementById(
      'bulkStatus'
    );


  if (status) {

    status.innerHTML = '';

    status.style.display =
      'none';

  }


  const progressWrap =
    document.getElementById(
      'bulkProgressWrap'
    );


  if (progressWrap) {

    progressWrap.style.display =
      'none';

  }


  const progressBar =
    document.getElementById(
      'bulkProgressBar'
    );


  if (progressBar) {

    progressBar.style.width =
      '0%';

  }


  const previewWrap =
    document.getElementById(
      'bulkPreviewWrap'
    );


  if (previewWrap) {

    previewWrap.style.display =
      'none';

  }


  const previewSummary =
    document.getElementById(
      'bulkPreviewSummary'
    );


  if (previewSummary) {

    previewSummary.innerHTML =
      'Belum ada data untuk dipaparkan.';

  }


  const previewTable =
    document.getElementById(
      'bulkPreviewTable'
    );


  if (previewTable) {

    previewTable.innerHTML =
      `
      <tr>

        <td
          colspan="7"
          style="
            text-align:center;
            padding:25px;
          "
        >
          Tiada preview.
        </td>

      </tr>
      `;

  }


  if (textarea) {

    textarea.focus();

  }

}


/* =========================================================
   PAPAR SENARAI MURID
========================================================= */

function renderStudents() {

  const keyword =
    document
      .getElementById(
        'searchInput'
      )
      .value
      .trim()
      .toLowerCase();


  const statusFilter =
    document
      .getElementById(
        'statusFilter'
      )
      .value;


  const filtered =
    allStudents.filter(
      function (student) {

        const text =
          (
            String(
              student.studentId || ''
            ) +
            ' ' +
            String(
              student.qrId || ''
            ) +
            ' ' +
            String(
              student.name || ''
            ) +
            ' ' +
            String(
              student.className || ''
            ) +
            ' ' +
            String(
              student.noKp || ''
            )
          )
          .toLowerCase();


        const keywordMatch =
          !keyword ||
          text.includes(
            keyword
          );


        const statusMatch =
          !statusFilter ||
          student.status ===
          statusFilter;


        return (
          keywordMatch &&
          statusMatch
        );

      }
    );


  const tbody =
    document.getElementById(
      'studentTable'
    );


  tbody.innerHTML = '';


  if (
    filtered.length === 0
  ) {

    tbody.innerHTML =
      `
      <tr>
        <td colspan="7">
          Tiada murid dijumpai.
        </td>
      </tr>
      `;

    return;

  }


  filtered.forEach(
    function (student, index) {

      const active =
        String(
          student.status || ''
        ).toUpperCase() ===
        'AKTIF';


      const row =
        document.createElement(
          'tr'
        );


      row.innerHTML =
        `
        <td>
          ${index + 1}
        </td>

        <td>
          ${escapeHtml(
            student.studentId
          )}
        </td>

        <td>
          <strong>
            ${escapeHtml(
              student.name
            )}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            student.className
          )}
        </td>

        <td>
          ${escapeHtml(
            student.gender || '-'
          )}
        </td>

        <td>

          <span
            class="badge ${
              active
                ? 'badge-active'
                : 'badge-inactive'
            }"
          >
            ${
              active
                ? 'AKTIF'
                : 'TIDAK AKTIF'
            }
          </span>

        </td>

        <td>

          <button
            class="small-btn edit-btn"
            onclick="editStudent(
              '${escapeJs(
                student.studentId
              )}'
            )"
          >
            ✏️ Edit
          </button>

          <button
            class="small-btn status-btn"
            onclick="changeStatus(
              '${escapeJs(
                student.studentId
              )}',
              '${
                active
                  ? 'TIDAK AKTIF'
                  : 'AKTIF'
              }'
            )"
          >
            ${
              active
                ? '🚫 Nyahaktif'
                : '✅ Aktifkan'
            }
          </button>

        </td>
        `;


      tbody.appendChild(
        row
      );

    }
  );

}


/* =========================================================
   EDIT MURID
========================================================= */

function editStudent(
  studentId
) {

  const student =
    allStudents.find(
      function (item) {

        return (
          String(
            item.studentId || ''
          ) ===
          String(
            studentId || ''
          )
        );

      }
    );


  if (!student) {

    alert(
      'Data murid tidak dijumpai.'
    );

    return;

  }


  document
    .getElementById(
      'studentId'
    )
    .value =
      student.studentId || '';


  document
    .getElementById(
      'studentName'
    )
    .value =
      student.name || '';


  document
    .getElementById(
      'studentClass'
    )
    .value =
      student.className || '';


  document
    .getElementById(
      'studentYear'
    )
    .value =
      student.year || '';


  document
    .getElementById(
      'studentGender'
    )
    .value =
      student.gender || '';


  document
    .getElementById(
      'studentNoKp'
    )
    .value =
      student.noKp || '';


  document
    .getElementById(
      'studentNotes'
    )
    .value =
      student.notes || '';


  document
    .getElementById(
      'formTitle'
    )
    .innerText =
      '✏️ Edit Murid - ' +
      (
        student.studentId ||
        ''
      );


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}


/* =========================================================
   TUKAR STATUS
========================================================= */

async function changeStatus(
  studentId,
  newStatus
) {

  const student =
    allStudents.find(
      function (item) {

        return (
          item.studentId ===
          studentId
        );

      }
    );


  const studentName =
    student &&
    student.name
      ? student.name
      : studentId;


  const message =
    newStatus ===
    'AKTIF'

      ? 'Aktifkan semula ' +
        studentName +
        '?'

      : 'Nyahaktifkan ' +
        studentName +
        '?';


  if (
    !confirm(
      message
    )
  ) {

    return;

  }


  setStatus(
    '⏳ Mengemas kini status murid...'
  );


  try {

    const result =
      await callAppsScript({

        action:
          'studentStatus',

        studentId:
          studentId,

        status:
          newStatus

      });


    if (
      !result ||
      !result.success
    ) {

      throw new Error(
        result &&
        result.message
          ? result.message
          : 'Status murid gagal dikemas kini.'
      );

    }


    alert(
      '✅ ' +
      result.message
    );


    await loadStudents();

  }

  catch (error) {

    console.error(
      error
    );


    alert(
      '❌ ' +
      error.message
    );


    setStatus(
      '❌ ' +
      error.message
    );

  }

}


/* =========================================================
   RESET FORM
========================================================= */

function resetForm() {

  document
    .getElementById(
      'studentId'
    )
    .value = '';


  document
    .getElementById(
      'studentName'
    )
    .value = '';


  document
    .getElementById(
      'studentClass'
    )
    .value = '';


  document
    .getElementById(
      'studentYear'
    )
    .value = '';


  document
    .getElementById(
      'studentGender'
    )
    .value = '';


  document
    .getElementById(
      'studentNoKp'
    )
    .value = '';


  document
    .getElementById(
      'studentNotes'
    )
    .value = '';


  document
    .getElementById(
      'formTitle'
    )
    .innerText =
      '➕ Tambah Murid';

}


/* =========================================================
   UTIL
========================================================= */

function setStatus(
  text
) {

  const el =
    document.getElementById(
      'status'
    );


  if (el) {

    el.innerText =
      text;

  }

}


function escapeHtml(
  value
) {

  return String(
    value || ''
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


function escapeJs(
  value
) {

  return String(
    value || ''
  )

    .replace(
      /\\/g,
      '\\\\'
    )

    .replace(
      /'/g,
      "\\'"
    );

}
