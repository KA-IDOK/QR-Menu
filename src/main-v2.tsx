import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import socket from './lib/socket.ts';

console.log("Frontend initializing...");
fetch('/api/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: "Frontend initializing via FETCH", origin: window.location.origin })
}).catch(e => console.error("Fetch log failed:", e));

document.body.innerHTML += '<div style="position:fixed;top:0;left:0;background:red;color:white;z-index:9999;padding:10px;">FRONTEND LOADED</div>';
console.log("Origin:", window.location.origin);
socket.emit('client_log', { message: "Frontend initializing...", origin: window.location.origin });

socket.on('server_ping', (data) => {
  console.log("Received server ping:", data);
  socket.emit('client_pong', { time: Date.now(), received: data.time });
});

socket.on('test_event', (data) => {
  console.log("Received test event:", data);
  socket.emit('client_log', { message: "Received test event", data });
});

fetch('/api/health')
  .then(r => r.json())
  .then(d => {
    console.log("Health check success:", d);
    socket.emit('client_log', { message: "Health check success", data: d });
  })
  .catch(e => {
    console.error("Health check failed:", e);
    socket.emit('client_error', { message: "Health check failed", error: e.message });
  });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
