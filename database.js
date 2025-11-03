const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// إنشاء أو فتح قاعدة البيانات
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) console.error('خطأ في قاعدة البيانات:', err);
  else console.log('تم الاتصال بقاعدة البيانات');
});

// إنشاء جدول المستخدمين إذا لم يكن موجودًا
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL
    )
  `);
});

// دالة لإضافة مستخدم جديد
function registerUser(username, password, name, callback) {
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return callback(err);
    db.run(
      `INSERT INTO users (username, password, name) VALUES (?, ?, ?)`,
      [username, hash, name],
      function (err) {
        callback(err, this ? this.lastID : null);
      }
    );
  });
}

// دالة للتحقق من تسجيل الدخول
function loginUser(username, password, callback) {
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err || !user) return callback(err || new Error('المستخدم غير موجود'));
    bcrypt.compare(password, user.password, (err, match) => {
      if (match) callback(null, { id: user.id, username: user.username, name: user.name });
      else callback(new Error('كلمة المرور خاطئة'));
    });
  });
}

module.exports = { registerUser, loginUser, db };