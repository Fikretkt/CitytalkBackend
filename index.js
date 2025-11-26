const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // Güvenlik için production'da domainini yaz
});

// Veri Tabanı (RAM)
let users = {};
let messages = [];
let rooms = [];
let vibes = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 1. LOGIN
  socket.on('login', ({ nickname, status, coords }, callback) => {
    const user = {
      id: socket.id,
      nickname,
      status,
      city: 'Istanbul', // Gerçek uygulamada coords'dan şehir bulma buraya eklenir
      isOnline: true,
      avatarUrl: `https://ui-avatars.com/api/?name=${nickname}&background=111&color=00F0FF`,
      coords
    };
    users[socket.id] = user;
    socket.join(user.city); // Kullanıcıyı şehir odasına al
    
    // Cevap dön
    callback(user);
    
    // Herkese haber ver
    io.to(user.city).emit('sync_data', { users, messages, rooms, vibes });
  });

  // 2. MESAJ
  socket.on('sendMessage', (msgData) => {
    const msg = { ...msgData, id: `msg_${Date.now()}`, timestamp: Date.now() };
    messages.push(msg);
    // 500 mesajdan sonrasını sil (RAM şişmesin)
    if(messages.length > 500) messages.shift(); 
    
    io.emit('sync_data', { users, messages, rooms, vibes });
  });

  // 3. ODA & VIBE (Benzer mantıkla...)
  // ... (Kodun geri kalanı MockServer mantığıyla aynıdır)

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('sync_data', { users, messages, rooms, vibes });
  });
});

server.listen(3000, () => {
  console.log('CityTalk Grid Online on port 3000');
});
