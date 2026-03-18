import fs from 'fs';

const stats = fs.statSync('menu-data.json');
const bufferSize = 10;
const buffer = Buffer.alloc(bufferSize);

const fd = fs.openSync('menu-data.json', 'r');
fs.readSync(fd, buffer, 0, bufferSize, stats.size - bufferSize);
fs.closeSync(fd);

console.log('Last 10 characters (hex):', buffer.toString('hex'));
console.log('Last 10 characters (utf8):', buffer.toString('utf8'));
