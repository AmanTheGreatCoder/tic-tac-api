const http = require('http');
const { v4 } = require('uuid');
const WebSocket = require('ws');
const app = require('express')();

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 8080;

const clients = {};
const games = {};
const initialBoard = [0, 0, 0, 0, 0, 0, 0, 0, 0];

wss.on('connection', (connection) => {
	console.log('Client Connected');
	const id = v4();
	clients[id] = connection;
	connection.send(
		JSON.stringify({
			method: 'connect',
			clientId: id,
		})
	);

	connection.on('open', () => {
		console.log('connection open');
	});

	connection.on('close', (res) => {
		console.log('connection closed');
	});

	connection.on('message', (res) => {
		try {
			const data = JSON.parse(res?.toString('utf-8'));
			let clientId;
			let gameId;
			console.log('Message Recieved', data);
			if (data?.method === 'create') {
				clientId = data.clientId;
				// gameId = v4().substring(0, 4);
				gameId = '1382';
				games[gameId] = {
					id: gameId,
					clientIds: [clientId],
					state: {
						board: initialBoard,
						turn: null,
						gameOver: false,
					},
				};
				const payload = {
					method: 'create',
					game: games[gameId],
				};
				const con = clients[clientId];
				con.send(JSON.stringify(payload));
			}

			if (data?.method === 'join') {
				clientId = data.clientId;
				gameId = data.gameId;

				if (games[gameId]) {
					if (!games[gameId].clientIds.includes(clientId)) {
						if (games[gameId].clientIds.length === 2) {
							sendError(
								'Sorry you can not join the game. Max Player Limit Reached',
								clientId
							);
							return;
						}
						games[gameId].clientIds.push(clientId);
						games[gameId].state.turn =
							games[gameId].clientIds[Math.round(Math.random())];
					}
					const payload = {
						method: 'join',
						game: games[gameId],
					};
					console.log('sending payload in join method ', payload);
					sendDataToClients(gameId, payload);
				} else {
					sendError(`There is no game with id: ${gameId}`, clientId);
				}
			}

			if (data.method === 'gameData') {
				clientId = data.clientId;
				gameId = data.gameId;
				sendGameData(gameId);
			}

			if (data.method === 'close') {
				gameId = data.gameId;
				clientId = data.clientId;
				delete clients[clientId];
				const index = games[gameId].clientIds.indexOf(clientId);
				if (index > -1) {
					games[gameId].clientIds.splice(index, 1);
					sendGameData(gameId);
				}
			}

			if (data.method === 'gameOver') {
				gameId = data.gameId;
				const game = games[gameId];
				game.state.gameOver = true;
				const payload = {
					method: 'gameOver',
					game: games[gameId],
				};
				sendDataToClients(gameId, payload);
			}

			if (data.method === 'reset') {
				gameId = data.gameId;
				games[gameId].state.board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
				games[gameId].state.gameOver = false;
				sendGameData(gameId);
				sendDataToClients(gameId, { method: 'reset' });
			}

			if (data.method === 'tileClick') {
				gameId = data.gameId;
				clientId = data.clientId;
				const index = data.index;
				const game = games[gameId];
				const clIndex = game.clientIds.indexOf(clientId);
				if (game.state.board[index] === 0) {
					if (clIndex === 0) {
						game.state.board[index] = 1;
					} else if (clIndex === 1) {
						game.state.board[index] = 2;
					}

					if (game.state.turn === game.clientIds[0]) {
						game.state.turn = game.clientIds[1];
					} else {
						game.state.turn = game.clientIds[0];
					}
				}
				sendGameData(gameId);
			}
		} catch (err) {
			console.log('error in message method', err);
		}
	});
});

function sendGameData(gameId) {
	const payload = {
		method: 'gameData',
		game: games[gameId],
	};

	sendDataToClients(gameId, payload);
}

function sendDataToClients(gameId, payload) {
	const connections = games[gameId].clientIds;
	for (let i = 0; i < connections.length; i++) {
		console.log('sending data to client ', connections[i]);
		clients[connections[i]].send(JSON.stringify(payload));
	}
}

function sendError(msg, clientId) {
	console.log('sending error');
	const payload = {
		method: 'error',
		message: msg,
	};

	const client = clients[clientId];
	client.send(JSON.stringify(payload));
}

server.listen(PORT, () => {
	console.log('Server Listening on 8080');
});
