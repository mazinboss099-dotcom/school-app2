const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = process.env.FIREBASE_CREDENTIALS
  ? JSON.parse(process.env.FIREBASE_CREDENTIALS)
  : require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const ADMIN_PASSWORD = 'school2026';
const ADMIN_TOKEN = 'admin-secret-token-2026';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

console.log('DIRNAME IS:', __dirname);
console.log('FRONTEND PATH WOULD BE:', path.join(__dirname, '..', 'frontend'));

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin', 'index.html'));
});

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'غير مصرح لك بالدخول' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ error: 'كلمة السر غلط' });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, grade, parentPhone, studentPhone } = req.body;

  if (!name || !grade || !parentPhone) {
    return res.status(400).json({ error: 'من فضلك املأ كل البيانات المطلوبة' });
  }

  const newStudent = {
    name,
    grade,
    parentPhone,
    studentPhone: studentPhone || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await db.collection('students').add(newStudent);
    const savedStudent = { id: docRef.id, ...newStudent };
    io.emit('new-registration', savedStudent);
    res.json({ success: true, message: 'تم إرسال طلب التسجيل بنجاح، سيتم مراجعته من الإدارة' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حصل خطأ في حفظ البيانات' });
  }
});

app.get('/api/students', requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('students').get();
    const students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حصل خطأ في جلب البيانات' });
  }
});

app.post('/api/students/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;

  try {
    const docRef = db.collection('students').doc(req.params.id);
    await docRef.update({ status });
    const updated = await docRef.get();
    const student = { id: updated.id, ...updated.data() };
    io.emit('status-updated', student);
    res.json({ success: true, student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حصل خطأ في تحديث الحالة' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`السيرفر شغال على http://localhost:${PORT}`);
});