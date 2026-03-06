import { io } from 'socket.io-client';

// In development, the API runs on port 3001 and Vite proxies /api to it.
// However, Socket.io needs to connect to the server directly or through the same proxy.
// Since Vite is on 3000 and proxies to 3001, we can try connecting to the same origin.
const socket = io(window.location.origin, {
  path: '/socket.io',
  transports: ['websocket', 'polling']
});

export default socket;
