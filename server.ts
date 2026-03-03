import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const db = new Database("menu.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    price_hot INTEGER,
    price_cold INTEGER,
    price_fixed INTEGER,
    description TEXT,
    available INTEGER DEFAULT 1,
    image TEXT,
    addons TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    total INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    is_paid INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    menu_item_id INTEGER,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    type TEXT NOT NULL,
    selected_addons TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`);

// Migration: Add image column if it doesn't exist (for existing databases)
try {
  db.exec("ALTER TABLE items ADD COLUMN image TEXT");
} catch (e) {}

// Migration: Add addons column if it doesn't exist
try {
  db.exec("ALTER TABLE items ADD COLUMN addons TEXT");
} catch (e) {}

// Migration: Add selected_addons column if it doesn't exist
try {
  db.exec("ALTER TABLE order_items ADD COLUMN selected_addons TEXT");
} catch (e) {}

// Seed initial data if empty
const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
if (categoryCount.count === 0) {
  const beverageAddons = JSON.stringify([
    { name: "Hazelnut / Vanilla", price: 30, available: true },
    { name: "White Chocolate", price: 30, available: true },
    { name: "Espresso Shot", price: 80, available: true }
  ]);
  const foodAddons = JSON.stringify([
    { name: "Rice", price: 30, available: true }
  ]);
  const sodaAddons = JSON.stringify([
    { name: "Hazelnut", price: 30, available: true },
    { name: "Vanilla", price: 30, available: true },
    { name: "White chocolate", price: 30, available: true },
    { name: "Espresso Shot", price: 80, available: true }
  ]);

  const seedData = [
    {
      name: "SPECIALTY ESPRESSO BEVERAGES",
      items: [
        { name: "Brewed Coffee", price_hot: 100, price_cold: 120 },
        { name: "White Chocolate Mocha", price_cold: 180 },
        { name: "Caramel Macchiato", price_cold: 180 },
        { name: "Classic Spanish Latte", price_hot: 175, price_cold: 200 },
        { name: "Seasalt Caramel Latte", price_hot: 175, price_cold: 200 },
        { name: "Hazelnut Latte", price_hot: 175, price_cold: 200 }
      ]
    },
    {
      name: "BODEGA X LINEAR COFFEE ROASTERS",
      items: [
        { name: "Filtered Coffee", price_fixed: 100 },
        { name: "Espresso / Black", price_fixed: 100 },
        { name: "White", price_fixed: 100 },
        { name: "White Brew", price_fixed: 120 },
        { name: "Cold Brew", price_fixed: 120 }
      ]
    },
    {
      name: "NON-ESPRESSO BEVERAGES",
      items: [
        { name: "Matcha Latte", price_fixed: 180 },
        { name: "Ube Latte", price_fixed: 180 },
        { name: "Strawberry Matcha Latte", price_fixed: 200 },
        { name: "Ube Matcha Latte", price_fixed: 200 }
      ]
    },
    {
      name: "HOT TEA",
      items: [
        { name: "Pure Chamomile", price_fixed: 120 },
        { name: "English Breakfast", price_fixed: 120 },
        { name: "Green Tea", price_fixed: 120 }
      ]
    },
    {
      name: "COMFORT FOOD",
      items: [
        { name: "Siomai Rice Bowl", price_fixed: 149 },
        { name: "Longganisa with Egg", price_fixed: 179 },
        { name: "Bistek Tagalog", price_fixed: 199 },
        { name: "Burger Steak", price_fixed: 249 },
        { name: "Chicken Torikatsu", price_fixed: 249 },
        { name: "Spam with Egg", price_fixed: 249 }
      ]
    },
    {
      name: "SWEET TREATS",
      items: [
        { name: "Chocolate Chip Cookie", price_fixed: 90 },
        { name: "Red Velvet Cookie", price_fixed: 90 },
        { name: "Biscoff Cookie", price_fixed: 90 },
        { name: "Mango Graham", price_fixed: 170 },
        { name: "Tiramisu", price_fixed: 190 },
        { name: "Basque Burnt Cheesecake", price_fixed: 190 }
      ]
    },
    {
      name: "JUICES & FRUIT TEAS",
      items: [
        { name: "Green Apple Fruit Tea", price_fixed: 150 },
        { name: "Melon Fruit Tea", price_fixed: 150 },
        { name: "Hibiscus Lemonade", price_fixed: 150 },
        { name: "Green Apple Yakult", price_fixed: 190 },
        { name: "Melon Yakult", price_fixed: 190 }
      ]
    },
    {
      name: "SMOOTHIES & FRAPPES",
      items: [
        { name: "Blueberry Smoothie", price_fixed: 160 },
        { name: "Strawberry Smoothie", price_fixed: 160 },
        { name: "Java Chip Frappe", price_fixed: 200 }
      ]
    },
    {
      name: "SODA POP",
      items: [
        { name: "Strawberry Soda", price_fixed: 160, addons: sodaAddons },
        { name: "Blueberry Soda", price_fixed: 160, addons: sodaAddons },
        { name: "Butterfly Pea Peach Soda", price_fixed: 200, addons: sodaAddons }
      ]
    },
    {
      name: "QUICK BITES",
      items: [
        { name: "Siopao", price_fixed: 59, addons: foodAddons },
        { name: "Fries (BBQ / Sour Cream)", price_fixed: 159, addons: foodAddons },
        { name: "Chicken Nuggets", price_fixed: 179, addons: foodAddons },
        { name: "Korean Ramen with Egg", price_fixed: 199, addons: foodAddons },
        { name: "Mama's Lasagna with Bread", price_fixed: 199, addons: foodAddons }
      ]
    }
  ];

  const insertCategory = db.prepare("INSERT INTO categories (name) VALUES (?)");
  const insertItem = db.prepare(`
    INSERT INTO items (category_id, name, price_hot, price_cold, price_fixed, addons)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const cat of seedData) {
      const catInfo = insertCategory.run(cat.name);
      for (const item of cat.items) {
        const i = item as any;
        // Use foodAddons for QUICK BITES, sodaAddons for others
        const itemAddons = cat.name === "QUICK BITES" ? foodAddons : sodaAddons;
        
        insertItem.run(
          catInfo.lastInsertRowid,
          i.name,
          i.price_hot || null,
          i.price_cold || null,
          i.price_fixed || null,
          itemAddons
        );
      }
    }
  })();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/menu", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    const menu = categories.map((cat: any) => {
      const items = db.prepare("SELECT * FROM items WHERE category_id = ?").all(cat.id);
      return { ...cat, items };
    });
    res.json(menu);
  });

  app.post("/api/categories", (req, res) => {
    const { name } = req.body;
    try {
      const info = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
      res.json({ id: info.lastInsertRowid, name });
    } catch (e) {
      res.status(400).json({ error: "Category already exists" });
    }
  });

  app.post("/api/items", (req, res) => {
    const { category_id, name, price_hot, price_cold, price_fixed, description, image, addons } = req.body;
    const info = db.prepare(`
      INSERT INTO items (category_id, name, price_hot, price_cold, price_fixed, description, image, addons)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(category_id, name, price_hot, price_cold, price_fixed, description, image, addons);
    res.json({ id: info.lastInsertRowid, ...req.body });
  });

  app.put("/api/items/:id", (req, res) => {
    const { id } = req.params;
    const { name, price_hot, price_cold, price_fixed, description, available, image, addons } = req.body;
    db.prepare(`
      UPDATE items 
      SET name = ?, price_hot = ?, price_cold = ?, price_fixed = ?, description = ?, available = ?, image = ?, addons = ?
      WHERE id = ?
    `).run(name, price_hot, price_cold, price_fixed, description, available, image, addons, id);
    res.json({ success: true });
  });

  app.delete("/api/items/:id", (req, res) => {
    db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Order Routes
  app.get("/api/orders", (req, res) => {
    const { email, customerId } = req.query;
    const identifier = customerId || email;
    if (!identifier) return res.status(400).json({ error: "Identifier required" });

    const orders = db.prepare("SELECT * FROM orders WHERE user_email = ? ORDER BY created_at DESC").all(identifier);
    const ordersWithItems = orders.map((order: any) => {
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
      const itemsWithAddons = items.map((item: any) => ({
        ...item,
        selected_addons: item.selected_addons ? JSON.parse(item.selected_addons) : []
      }));
      return { ...order, items: itemsWithAddons };
    });
    res.json(ordersWithItems);
  });

  app.post("/api/orders", (req, res) => {
    const { user_email, total, items } = req.body;
    
    const insertOrder = db.prepare("INSERT INTO orders (user_email, total) VALUES (?, ?)");
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, type, selected_addons)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((orderData) => {
      const info = insertOrder.run(orderData.user_email, orderData.total);
      const orderId = info.lastInsertRowid;
      for (const item of orderData.items) {
        const selectedAddonsJson = item.selectedAddons ? JSON.stringify(item.selectedAddons) : null;
        insertOrderItem.run(orderId, item.id, item.name, item.price, item.quantity, item.type, selectedAddonsJson);
      }
      return orderId;
    });

    const orderId = transaction({ user_email, total, items });
    res.json({ id: orderId, success: true });
  });

  app.put("/api/orders/:id/pay", (req, res) => {
    db.prepare("UPDATE orders SET is_paid = 1, status = 'completed' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/orders", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    const ordersWithItems = orders.map((order: any) => {
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
      const itemsWithAddons = items.map((item: any) => ({
        ...item,
        selected_addons: item.selected_addons ? JSON.parse(item.selected_addons) : []
      }));
      return { ...order, items: itemsWithAddons };
    });
    res.json(ordersWithItems);
  });

  app.put("/api/admin/orders/:id", (req, res) => {
    const { id } = req.params;
    const { status, is_paid } = req.body;
    db.prepare("UPDATE orders SET status = ?, is_paid = ? WHERE id = ?").run(status, is_paid, id);
    res.json({ success: true });
  });

  app.post("/api/seed", (req, res) => {
    const { categories } = req.body;
    
    const deleteItems = db.prepare("DELETE FROM items");
    const deleteCats = db.prepare("DELETE FROM categories");
    
    const insertCat = db.prepare("INSERT INTO categories (name) VALUES (?)");
    const insertItem = db.prepare(`
      INSERT INTO items (category_id, name, price_hot, price_cold, price_fixed, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((data) => {
      deleteItems.run();
      deleteCats.run();
      for (const cat of data) {
        const catInfo = insertCat.run(cat.name);
        const catId = catInfo.lastInsertRowid;
        for (const item of cat.items) {
          const hot = item.prices?.hot || (typeof item.price === 'object' ? item.price.hot : null);
          const cold = item.prices?.cold || (typeof item.price === 'object' ? item.price.cold : null);
          const fixed = typeof item.price === 'number' ? item.price : null;
          insertItem.run(catId, item.name, hot, cold, fixed, item.description || "");
        }
      }
    });

    transaction(categories);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  // Auto-seed if empty
  const count = db.prepare("SELECT COUNT(*) as count FROM categories").get() as any;
  if (count.count === 0) {
    console.log("Database empty, seeding initial menu...");
    const initialData = [
      {
        name: "Specialty Espresso",
        items: [
          { name: "Brewed Coffee", price: { hot: 100, cold: 120 } },
          { name: "White Chocolate Mocha", price: { cold: 180 } },
          { name: "Caramel Macchiato", price: { cold: 180 } },
          { name: "Classic Spanish Latte", price: { hot: 175, cold: 200 } },
          { name: "Seasalt Caramel Latte", price: { hot: 175, cold: 200 } },
          { name: "Hazelnut Latte", price: { hot: 175, cold: 200 } }
        ]
      },
      {
        name: "Juices & Fruit Teas",
        items: [
          { name: "Green Apple Fruit Tea", price: 150 },
          { name: "Melon Fruit Tea", price: 150 },
          { name: "Hibiscus Lemonade", price: 150 },
          { name: "Green Apple Yakult", price: 190 },
          { name: "Melon Yakult", price: 190 }
        ]
      },
      {
        name: "Coffee Roasters",
        items: [
          { name: "Filtered Coffee", price: 100 },
          { name: "Espresso / Black", price: 100 },
          { name: "White", price: 100 },
          { name: "White Brew", price: 120 },
          { name: "Cold Brew", price: 120 }
        ]
      },
      {
        name: "Smoothies & Frappes",
        items: [
          { name: "Blueberry Smoothie", price: 160 },
          { name: "Strawberry Smoothie", price: 160 },
          { name: "Java Chip Frappe", price: 200 }
        ]
      },
      {
        name: "Non-Espresso",
        items: [
          { name: "Matcha Latte", price: 180 },
          { name: "Ube Latte", price: 180 },
          { name: "Strawberry Matcha Latte", price: 200 },
          { name: "Ube Matcha Latte", price: 200 }
        ]
      },
      {
        name: "Soda Pop",
        items: [
          { name: "Strawberry Soda", price: 160 },
          { name: "Blueberry Soda", price: 160 },
          { name: "Butterfly Pea Peach Soda", price: 200 }
        ]
      },
      {
        name: "Hot Tea",
        items: [
          { name: "Pure Chamomile", price: 120 },
          { name: "English Breakfast", price: 120 },
          { name: "Green Tea", price: 120 }
        ]
      },
      {
        name: "Comfort Food",
        items: [
          { name: "Siomai Rice Bowl", price: 149 },
          { name: "Longganisa with Egg", price: 179 },
          { name: "Bistek Tagalog", price: 199 },
          { name: "Burger Steak", price: 249 },
          { name: "Chicken Torikatsu", price: 249 },
          { name: "Spam with Egg", price: 249 }
        ]
      },
      {
        name: "Quick Bites",
        items: [
          { name: "Siopao", price: 59 },
          { name: "Fries (BBQ / Sour Cream)", price: 159 },
          { name: "Chicken Nuggets", price: 179 },
          { name: "Korean Ramen with Egg", price: 199 },
          { name: "Mama's Lasagna with Bread", price: 199 }
        ]
      },
      {
        name: "Sweet Treats",
        items: [
          { name: "Chocolate Chip Cookie", price: 90 },
          { name: "Red Velvet Cookie", price: 90 },
          { name: "Biscoff Cookie", price: 90 },
          { name: "Mango Graham", price: 170 },
          { name: "Tiramisu", price: 190 },
          { name: "Basque Burnt Cheesecake", price: 190 }
        ]
      }
    ];

    const insertCat = db.prepare("INSERT INTO categories (name) VALUES (?)");
    const insertItem = db.prepare(`
      INSERT INTO items (category_id, name, price_hot, price_cold, price_fixed, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const cat of initialData) {
        const catId = insertCat.run(cat.name).lastInsertRowid;
        for (const item of cat.items) {
          const hot = typeof item.price === 'object' ? item.price.hot : null;
          const cold = typeof item.price === 'object' ? item.price.cold : null;
          const fixed = typeof item.price === 'number' ? item.price : null;
          insertItem.run(catId, item.name, hot, cold, fixed, "");
        }
      }
    })();
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
