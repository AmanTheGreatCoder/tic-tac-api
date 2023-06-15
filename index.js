const http = require('http');
const { v4 } = require('uuid');
const WebSocket = require('ws');
const app = require('express')();

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = {};
const games = {};

wss.on('connection', (connection) => {
  console.log('Client Connected');
  const id = v4();
  clients[id] = connection;
  let payload = {
    method: 'connect',
    clientId: id,
  };
  connection.send(JSON.stringify(payload));

  connection.on('open', () => {
    console.log('connection open');
  });

  connection.on('close', () => {
    console.log('connection closed');
  });

  connection.on('message', (res) => {
    try {
      const data = JSON.parse(res?.toString('utf-8'));
      let clientId = data?.clientId;
      let gameId = data?.gameId;
      console.log('Message Recieved', data);
      if (data?.method === 'create') {
        clientId = data.clientId;
        gameId = v4().substring(0, 4);
        games[gameId] = {
          id: gameId,
          clientIds: [clientId],
        };
        const payload = {
          method: 'create',
          game: games[gameId],
        };
        const con = clients[clientId];
        con.send(JSON.stringify(payload));
      }

      if (data?.method === 'join') {
        const con = clients[clientId];
        if (games[gameId]) {
          games[gameId].clientIds.push(clientId);
          con.send(JSON.stringify(games[gameId]));
        } else {
          // game Id does not exits
        }
      }

      if (data.method === 'gameData') {
        const payload = {
          method: 'gameData',
          game: games[gameId],
        };
        const con = clients[clientId];
        con.send(JSON.stringify(payload));
      }

      if (data.method === 'tileClick') {
      }
    } catch (err) {
      console.log('error in message method', err);
    }
  });
});

server.listen(8080, () => {
  console.log('Server Listening on 8080');
});
