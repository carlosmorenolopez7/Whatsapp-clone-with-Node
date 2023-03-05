const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const fileInput = document.getElementById('fileInput');

const { username, room, userImage } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();
socket.emit('joinRoom', { username, room });

socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

socket.on('typingMessage', message => {
  document.getElementById('typing').innerText = message;
});

socket.on('showButton', show => {
  document.getElementById('backToPublic').style.display = show ? 'block' : 'none';
});

const input = document.getElementById('msg');

input.addEventListener('input', () => {
  socket.emit('typing', input.value.length > 0);
  setTimeout(() => {
    socket.emit('typing', false);
  }, 5000);
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    socket.emit('userImage', {
      name: file.name,
      data: reader.result
    });
  };
});

socket.on('userImage', (userImage) => {
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = userImage.username;
  p.innerHTML += `<span>${userImage.time}</span>`;
  div.appendChild(p);
  const img = document.createElement('img');
  img.src = userImage.data;
  img.width = 200;
  img.height = 200;
  div.appendChild(img);
  document.querySelector('#users').appendChild(div);
});

socket.on("file", (fileData) => {
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = fileData.username;
  p.innerHTML += `<span>${fileData.time}</span>`;
  div.appendChild(p);
  const a = document.createElement('a');
  a.href = './public/uploads/' + fileData.name;
  a.innerText = fileData.name;
  div.appendChild(a);
  document.querySelector('.chat-messages').appendChild(div);
});

socket.on('imagen', (fileData) => {
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = fileData.username;
  p.innerHTML += `<span>${fileData.time}</span>`;
  div.appendChild(p);
  const img = document.createElement('img');
  img.src = './public/uploads/' + fileData.name;
  img.width = 200;
  img.height = 200;
  div.appendChild(img);
  document.querySelector('.chat-messages').appendChild(div);
});

socket.on('message', (message) => {
  outputMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if(fileInput.files.length > 0){
    const file = fileInput.files[0];
    console.log(file.type)
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const fileData  = {
        name: file.name,
        type: file.type,
        data: reader.result
      };
      socket.emit('file', fileData);
    };
  }
  socket.emit('typing', false);
  setTimeout(() => {
    socket.emit('typing', false);
  }, 3000);

  let msg = e.target.elements.msg.value;
  msg = msg.trim();

  if (!msg) {
    return false;
  }

  socket.emit('chatMessage', msg);
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = message.username;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  const para = document.createElement('p');
  para.classList.add('text');
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector('.chat-messages').appendChild(div);
}

function outputRoomName(room) {
  roomName.innerText = room;
}

function backToRoom() {
  socket.emit('backToPublic');
}

function outputUsers(users, image) {
  userList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.innerText = user.username;
    li.className = 'userOnList';
    li.id = user.username;
    userList.appendChild(li);
  });
}

document.getElementById('users').addEventListener('click', (e) => {
  const userId = e.target.id;
  if (userId) {
    socket.emit('privateChat', userId);
  }
});


document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('¿Abandonar chat?');
  if (leaveRoom) {
    window.location = '../index.html';
  } else {
  }
});
