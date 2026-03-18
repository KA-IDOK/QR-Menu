import fs from 'fs';
const data = JSON.parse(fs.readFileSync('menu-data.json', 'utf8'));

console.log('Categories:');
data.categories.forEach(cat => {
    console.log(`- ${cat.name}`);
    console.log('  Items:');
    cat.items.forEach(item => {
        console.log(`    * ${item.name}`);
    });
});
