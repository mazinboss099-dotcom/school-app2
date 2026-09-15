const API_BASE = '';
let adminToken = localStorage.getItem('adminToken') || '';

const loginBox = document.getElementById('loginBox');
const dashboard = document.getElementById('dashboard');

// لو فيه توكين محفوظ من قبل، ادخل على طول
if (adminToken) {
  showDashboard();
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const password = document.getElementById('password').value;
  const msg = document.getElementById('loginMessage');

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const result = await res.json();

    if (res.ok) {
      adminToken = result.token;
      localStorage.setItem('adminToken', adminToken);
      showDashboard();
    } else {
      msg.textContent = result.error;
    }
  } catch (err) {
    msg.textContent = 'حصل خطأ في الاتصال بالسيرفر';
  }
});

function showDashboard() {
  loginBox.style.display = 'none';
  dashboard.style.display = 'block';
  loadStudents();
}

async function loadStudents() {
  const list = document.getElementById('studentsList');
  list.innerHTML = 'جاري التحميل...';

  try {
    const res = await fetch('/api/students', {
      headers: { 'x-admin-token': adminToken }
    });

    if (res.status === 401) {
      localStorage.removeItem('adminToken');
      location.reload();
      return;
    }

    const students = await res.json();

    if (students.length === 0) {
      list.innerHTML = '<p style="text-align:center">لا توجد طلبات تسجيل حتى الآن</p>';
      return;
    }

    list.innerHTML = students.map(renderStudentCard).join('');

    document.querySelectorAll('.approve-btn').forEach((btn) => {
      btn.addEventListener('click', () => updateStatus(btn.dataset.id, 'approved'));
    });
    document.querySelectorAll('.reject-btn').forEach((btn) => {
      btn.addEventListener('click', () => updateStatus(btn.dataset.id, 'rejected'));
    });
  } catch (err) {
    list.innerHTML = 'حصل خطأ في تحميل البيانات';
  }
}

function renderStudentCard(s) {
  const statusText = { pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' };
  return `
    <div class="student-card">
      <h3>${s.name}</h3>
      <p>الصف: ${s.grade}</p>
      <p>هاتف ولي الأمر: ${s.parentPhone}</p>
      <p>هاتف الطالب: ${s.studentPhone || '-'}</p>
      <span class="status ${s.status}">${statusText[s.status]}</span>
      ${s.status === 'pending' ? `
        <div class="actions">
          <button class="approve-btn" data-id="${s.id}">قبول</button>
          <button class="reject-btn" data-id="${s.id}">رفض</button>
        </div>
      ` : ''}
    </div>
  `;
}

async function updateStatus(id, status) {
  try {
    await fetch(`/api/students/${id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      },
      body: JSON.stringify({ status })
    });
    loadStudents();
  } catch (err) {
    alert('حصل خطأ في تحديث الحالة');
  }
}