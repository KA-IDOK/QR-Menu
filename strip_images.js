import fs from 'fs';
const content = fs.readFileSync('menu-data.json', 'utf8');
const data = JSON.parse(content);
if (data.categories) {
  data.categories.forEach(cat => {
    if (cat.items) {
      cat.items.forEach(item => {
        if (item.image && item.image.startsWith('data:image')) {
          item.image = ''; // Strip large base64 images
        }
      });
    }
  });
}
fs.writeFileSync('menu-data.json', JSON.stringify(data, null, 2));
console.log('Stripped images from menu-data.json');
