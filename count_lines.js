import fs from 'fs';

const content = fs.readFileSync('menu-data.json', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
