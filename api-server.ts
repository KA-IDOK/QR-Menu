import express from "express";
import Database from "better-sqlite3";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001; // API runs on 3001 during dev

const dbPath = path.resolve(process.cwd(), "menu.db");
console.log(`[API SERVER] Initializing database at: ${dbPath}`);
const db = new Database(dbPath);

// Initialize database tables if they don't exist
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

// Default Menu Data for Seeding
const defaultMenuData = [
  {
    name: "Specialty Espresso",
    items: [
      { name: "Brewed Coffee", price_hot: 100, price_cold: 120, description: "Classic brewed coffee" },
      { name: "White Chocolate Mocha", price_cold: 180, description: "Sweet and creamy mocha" },
      { name: "Caramel Macchiato", price_cold: 180, description: "Layers of espresso and caramel" },
      { name: "Classic Spanish Latte", price_hot: 175, price_cold: 200, description: "Sweetened with condensed milk" },
      { name: "Seasalt Caramel Latte", price_hot: 175, price_cold: 200, description: "Perfect balance of sweet and salty" },
      { name: "Hazelnut Latte", price_hot: 175, price_cold: 200, description: "Nutty and aromatic" }
    ]
  },
  {
    name: "Juices & Fruit Teas",
    items: [
      { name: "Green Apple Fruit Tea", price_fixed: 150 },
      { name: "Melon Fruit Tea", price_fixed: 150 },
      { name: "Hibiscus Lemonade", price_fixed: 150 },
      { name: "Green Apple Yakult", price_fixed: 190 },
      { name: "Melon Yakult", price_fixed: 190 }
    ]
  },
  {
    name: "Coffee Roasters",
    items: [
      { name: "Filtered Coffee", price_fixed: 100 },
      { name: "Espresso / Black", price_fixed: 100 },
      { name: "White", price_fixed: 100 },
      { name: "White Brew", price_fixed: 120 },
      { name: "Cold Brew", price_fixed: 120 }
    ]
  },
  {
    name: "Smoothies & Frappes",
    items: [
      { name: "Blueberry Smoothie", price_fixed: 160 },
      { name: "Strawberry Smoothie", price_fixed: 160 },
      { name: "Java Chip Frappe", price_fixed: 200 }
    ]
  },
  {
    name: "Non-Espresso",
    items: [
      { name: "Matcha Latte", price_fixed: 180 },
      { name: "Ube Latte", price_fixed: 180 },
      { name: "Strawberry Matcha Latte", price_fixed: 200 },
      { name: "Ube Matcha Latte", price_fixed: 200 }
    ]
  },
  {
    name: "Comfort Food",
    items: [
      { name: "Siomai Rice Bowl", price_fixed: 149 },
      { name: "Longganisa with Egg", price_fixed: 179 },
      { name: "Bistek Tagalog", price_fixed: 199 },
      { name: "Burger Steak", price_fixed: 249 },
      { name: "Chicken Torikatsu", price_fixed: 249 },
      { name: "Spam with Egg", price_fixed: 249 }
    ]
  }
];

// Auto-seed if empty
const catCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as any;
if (catCount.count === 0) {
  console.log("[API SERVER] Database is empty, seeding default data...");
  const insertCat = db.prepare("INSERT INTO categories (name) VALUES (?)");
  const insertItem = db.prepare(`
    INSERT INTO items (category_id, name, price_hot, price_cold, price_fixed, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data) => {
    for (const cat of data) {
      const catId = insertCat.run(cat.name).lastInsertRowid;
      for (const item of cat.items) {
        insertItem.run(
          catId, 
          item.name, 
          item.price_hot || null, 
          item.price_cold || null, 
          item.price_fixed || null, 
          item.description || ""
        );
      }
    }
  });
  transaction(defaultMenuData);
}

// Migrations
try { db.exec("ALTER TABLE items ADD COLUMN image TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE items ADD COLUMN addons TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE order_items ADD COLUMN selected_addons TEXT"); } catch (e) {}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

// Helper to notify all clients of updates
const notifyUpdate = (type: string, data?: any) => {
  console.log(`[SOCKET] Notifying update: ${type}`);
  io.emit(type, data);
};

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", server: "standalone-api" });
});

app.get("/api/menu", (req, res) => {
  try {
    const categories = db.prepare("SELECT * FROM categories").all();
    const menu = categories.map((cat: any) => {
      const items = db.prepare("SELECT * FROM items WHERE category_id = ?").all(cat.id);
      return { ...cat, items };
    });
    res.json(menu);
  } catch (err) {
    console.error("API Error /menu:", err);
    res.status(500).json({ error: "Internal server error" });
  }
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

  try {
    const orderId = transaction({ user_email, total, items });
    notifyUpdate("order_created", { id: orderId, user_email });
    res.json({ id: orderId, success: true });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.get("/api/orders", (req, res) => {
  const email = req.query.email || req.query.customerId;
  if (!email) return res.status(400).json({ error: "Email required" });
  const orders = db.prepare("SELECT * FROM orders WHERE user_email = ? ORDER BY created_at DESC").all(email);
  const ordersWithItems = orders.map((order: any) => {
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
    return { ...order, items: items.map((i: any) => ({ ...i, selected_addons: i.selected_addons ? JSON.parse(i.selected_addons) : [] })) };
  });
  res.json(ordersWithItems);
});

app.get("/api/admin/orders", (req, res) => {
  const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  const ordersWithItems = orders.map((order: any) => {
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
    return { ...order, items: items.map((i: any) => ({ ...i, selected_addons: i.selected_addons ? JSON.parse(i.selected_addons) : [] })) };
  });
  res.json(ordersWithItems);
});

app.put("/api/admin/orders/:id", (req, res) => {
  const { id } = req.params;
  const { status, is_paid } = req.body;
  db.prepare("UPDATE orders SET status = ?, is_paid = ? WHERE id = ?").run(status, is_paid, id);
  notifyUpdate("order_updated", { id, status, is_paid });
  res.json({ success: true });
});

app.post("/api/categories", (req, res) => {
  const { name } = req.body;
  try {
    const info = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
    notifyUpdate("menu_updated");
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
  notifyUpdate("menu_updated");
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
  notifyUpdate("menu_updated");
  res.json({ success: true });
});

app.delete("/api/items/:id", (req, res) => {
  db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
  notifyUpdate("menu_updated");
  res.json({ success: true });
});

app.put("/api/orders/:id/pay", (req, res) => {
  db.prepare("UPDATE orders SET is_paid = 1, status = 'completed' WHERE id = ?").run(req.params.id);
  notifyUpdate("order_updated", { id: req.params.id, status: 'completed', is_paid: 1 });
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
      const catId = insertCat.run(cat.name).lastInsertRowid;
      for (const item of cat.items) {
        const hot = item.prices?.hot || (typeof item.price === 'object' ? item.price.hot : null);
        const cold = item.prices?.cold || (typeof item.price === 'object' ? item.price.cold : null);
        const fixed = typeof item.price === 'number' ? item.price : null;
        insertItem.run(catId, item.name, hot, cold, fixed, item.description || "");
      }
    }
  });

  transaction(categories);
  notifyUpdate("menu_updated");
  res.json({ success: true });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[API SERVER] Running on http://localhost:${PORT}`);
});
