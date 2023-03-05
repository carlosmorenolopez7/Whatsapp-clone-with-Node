const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');
const express = require('express');
const fileUpload = require('express-fileupload');
const formatoMsg = require('./public/js/message.js');
const { userJoin, getCurrentUser, userLeave, getRoomUsers, getUserTypingStatus, setUserTypingStatus } = require('./public/js/user.js');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const autoMsg = 'Mensaje del servidor';
const users = {};
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);
    socket.emit('message', formatoMsg(autoMsg, 'Bienvenid@ al chat'));
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatoMsg(autoMsg, `${user.username} se unió al chat`)
      );

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  socket.on('privateChat', userId => {
    const selectedUser = userId
    if (selectedUser) {
      const user = getCurrentUser(socket.id);
      const roomId = `private_chat_${selectedUser.id}`;
      socket.leave(user.room);
      socket.join(roomId);
      io.to(roomId).emit(
        'message',
        formatoMsg(autoMsg, `${user.username} se unió al chat privado`)
      );
  
      io.to(roomId).emit('roomUsers', {
        room: roomId,
        users: getRoomUsers(roomId)
      });
  
      io.to(roomId).emit('showButton', true);
    }
  });   

  socket.on('backToPublic', () => {
    const user = getCurrentUser(socket.id);
    socket.leave(user.room);
    socket.join(user.room);
    user.room = "public_chat";
    io.to(user.room).emit('showButton', false);
  });

  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    if (user) {
      if (user.room.includes("private_chat")) {
        io.to(user.room).emit('message', formatoMsg(user.username, msg));
      }
      else {
        io.to(user.room).emit('message', formatoMsg(user.username, msg));
      }
    }
  });

  socket.on("profilePicture", (fileData) => {
    const base64Data = fileData.data.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const filePath = `./public/uploads/profileImg/${fileData.name}`;
  
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
      if(err) {
        console.log(err);
      } else {
        const user = getCurrentUser(socket.id);
        if (user) {
          io.to(user.room).emit('imagen', `<img src="${filePath}" width="200" height="200">`);
        }
      }
    });
  });

  socket.on('file', (fileData) => {
    const base64Data = fileData.data.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const filePath = `./public/uploads/${fileData.name}`;
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
      if (err) {
        console.log(err);
      } else {
        const user = getCurrentUser(socket.id);
        if (user) {
          if (fileData.type.includes("image")) {
            io.to(user.room).emit('imagen', formatoMsg(user.username, `<img src="${filePath}" width="200" height="200">`));
          }
          else if (fileData.type.includes("video")) {
            io.to(user.room).emit('imagen', formatoMsg(user.username, `<video src="${filePath}" width="200" height="200" controls></video>`));
          }
          if (user.room.includes("private_chat")) {
            io.to(user.room).emit('message', formatoMsg(user.username, fileData.name));
          }
          else {
            io.to(user.room).emit('message', formatoMsg(user.username, fileData.name));
          }
        }
      }
    });
  });

  socket.on('typing', isTyping => {
    const user = getCurrentUser(socket.id);
    setUserTypingStatus(user.id, user.room, isTyping);

    const usersTyping = getRoomUsers(user.room)
      .filter(user => getUserTypingStatus(user.id, user.room))
      .map(user => user.username)
      .join(', ');

    io.to(user.room).emit('typingMessage', usersTyping ? `${usersTyping} está escribiendo...` : '');
  });

  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatoMsg(autoMsg, `${user.username} ha abandonado la sala`)
      );

      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
