import fs from 'fs';
const stats = fs.statSync('menu-data.json');
console.log(`File size: ${stats.size} bytes`);
const fd = fs.openSync('menu-data.json', 'r');
const buffer = Buffer.alloc(100);
fs.readSync(fd, buffer, 0, 100, Math.max(0, stats.size - 100));
console.log(`Last 100 chars: ${buffer.toString()}`);
fs.closeSync(fd);
