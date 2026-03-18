import fs from 'fs';

const menuPath = 'menu-data.json';
const data = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

const categoryOrder = [
    "SPECIALTY ESPRESSO BEVERAGES",
    "BODEGA X LINEAR COFFEE ROASTERS",
    "NON-ESPRESSO BEVERAGES",
    "HOT TEA",
    "COMFORT FOOD",
    "SWEET TREATS",
    "JUICES & FRUIT TEAS",
    "SMOOTHIES & FRAPPES"
];

const itemOrders = {
    "SPECIALTY ESPRESSO BEVERAGES": ["Brewed Coffee", "White Chocolate Mocha", "Caramel Macchiato", "Classic Spanish Latte", "Seasalt Caramel Latte", "Hazelnut Latte"],
    "BODEGA X LINEAR COFFEE ROASTERS": ["Filtered Coffee", "Espresso / Black", "White", "White Brew", "Cold Brew"],
    "NON-ESPRESSO BEVERAGES": ["Matcha Latte", "Ube Latte", "Strawberry Matcha Latte", "Ube Matcha Latte"],
    "HOT TEA": ["Pure Chamomile", "English Breakfast", "Green Tea"],
    "COMFORT FOOD": ["Siomai Rice Bowl", "Longganisa with Egg", "Bistek Tagalog", "Burger Steak", "Chicken Torikatsu", "Spam with Egg"],
    "SWEET TREATS": ["Cookies", "Chocolate Chip", "Red Velvet", "Biscoff", "Desserts", "Mango Graham", "Tiramisu", "Basque Burnt Cheesecake"],
    "JUICES & FRUIT TEAS": ["Green Apple Fruit Tea", "Melon Fruit Tea", "Hibiscus Lemonade", "Green Apple Yakult", "Melon Yakult"],
    "SMOOTHIES & FRAPPES": ["Blueberry Smoothie", "Strawberry Smoothie", "Java Chip Frappe"]
};

// Sort categories
data.categories.sort((a, b) => {
    let indexA = categoryOrder.indexOf(a.name);
    let indexB = categoryOrder.indexOf(b.name);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    return indexA - indexB;
});

// Sort items within each category
data.categories.forEach(cat => {
    const order = itemOrders[cat.name];
    if (order) {
        cat.items.sort((a, b) => {
            let indexA = order.indexOf(a.name);
            let indexB = order.indexOf(b.name);
            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;
            return indexA - indexB;
        });
    }
});

fs.writeFileSync(menuPath, JSON.stringify(data, null, 2));
console.log('Menu reordered successfully.');
