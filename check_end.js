import fs from 'fs';

const fd = fs.openSync('menu-data.json', 'r');
const stats = fs.statSync('menu-data.json');
const bufferSize = 1000;
const buffer = Buffer.alloc(bufferSize);

const position = Math.max(0, stats.size - bufferSize);
fs.readSync(fd, buffer, 0, bufferSize, position);
fs.closeSync(fd);

console.log('Last 1000 characters of menu-data.json:');
console.log(buffer.toString('utf8'));
