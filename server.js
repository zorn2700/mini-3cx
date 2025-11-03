const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { registerUser, loginUser } = require('./database');

app.use(express.static(__dirname));
app.use(express.json()); // لقراءة JSON من الطلبات

const users = {}; // { socket.id: { id, username, name } }

io.on('connection', (socket) => {
  console.log('مستخدم متصل:', socket.id);

  // تسجيل الدخول
  socket.on('login', ({ username, password }, callback) => {
    loginUser(username, password, (err, user) => {
      if (err) return callback({ success: false, message: err.message });
      users[socket.id] = { ...user, socketId: socket.id };
      io.emit('users', Object.values(users).filter(u => u.socketId !== socket.id));
      callback({ success: true, user: { name: user.name } });
    });
  });

  // تسجيل مستخدم جديد
  socket.on('register', ({ username, password, name }, callback) => {
    registerUser(username, password, name, (err) => {
      if (err) return callback({ success: false, message: 'اسم المستخدم موجود مسبقًا' });
      callback({ success: true, message: 'تم إنشاء الحساب! يمكنك تسجيل الدخول الآن.' });
    });
  });

  // باقي الكود (المكالمات والدردشة)
  socket.on('call', (targetId) => {
    io.to(targetId).emit('offer', { from: users[socket.id].name, fromId: socket.id });
  });

  socket.on('offer', (data) => {
    io.to(data.to).emit('offer', { from: users[socket.id].name, fromId: socket.id, offer: data.offer });
  });

  socket.on('answer', (data) => {
    io.to(data.to).emit('answer', { answer: data.answer });
  });

  socket.on('candidate', (data) => {
    io.to(data.to).emit('candidate', { candidate: data.candidate });
  });

  socket.on('message', (msg) => {
    io.emit('message', { name: users[socket.id].name, msg });
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
      console.log(`${users[socket.id].name} غادر`);
      delete users[socket.id];
      io.emit('users', Object.values(users));
    }
  });
});
// إضافة ping للحفاظ على الخادم نشيطًا (لـ Render free tier)
setInterval(() => {
  http.get('http://localhost:' + PORT + '/health', (res) => {
    res.resume();
  });
}, 300000); // كل 5 دقائق

// أضف route للـ health check
app.get('/health', (req, res) => {
  res.send('OK');
});

// استخدم PORT من البيئة (Render يحدد PORT)
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`الخادم يعمل على http://localhost:${PORT}`);
});