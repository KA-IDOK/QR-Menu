import fs from 'fs';
const content = fs.readFileSync('menu-data.json', 'utf8');
try {
  JSON.parse(content);
  console.log('JSON is valid');
} catch (e) {
  console.log(e.message);
  const match = e.message.match(/position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    const start = Math.max(0, pos - 50);
    const end = Math.min(content.length, pos + 50);
    console.log(`Context around position ${pos}:`);
    console.log(content.substring(start, end));
  }
}
