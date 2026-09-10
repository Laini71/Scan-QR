const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbytIw-xa_0FdLtZFfeRpLil3lrYjnNKo0jYJsN5dY5icdxSmHEXnH6ugDbz5Enn9P8-fA/exec';


let allStudents = [];


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

        } catch (e) {}


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
