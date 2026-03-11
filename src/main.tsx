import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import socket from './lib/socket.ts';

console.log("Frontend initializing...");
socket.emit('client_log', { message: "Frontend initializing..." });

window.onerror = (msg, url, line, col, error) => {
  socket.emit('client_error', { msg, url, line, col, error: error?.stack });
  return false;
};

fetch('/api/health').then(r => r.json()).then(d => {
  console.log("Health check:", d);
  socket.emit('client_log', { message: "Health check success", data: d });
}).catch(e => {
  console.error("Health check failed:", e);
  socket.emit('client_error', { message: "Health check failed", error: e.message });
});
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
console.log("Frontend render called.");
