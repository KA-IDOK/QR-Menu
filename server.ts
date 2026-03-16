import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const menuDataPath = path.resolve(process.cwd(), "menu-data.json");

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("[SERVER] FATAL ERROR: SUPABASE_URL and SUPABASE_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("[SERVER] Supabase client initialized.");

// Helper to sync database to JSON file for "code permanence"
const syncMenuToFile = async () => {
  try {
    const { data: categories, error: catError } = await supabase.from('categories').select('*');
    if (catError) throw catError;
    
    const menu = await Promise.all(categories.map(async (cat: any) => {
      const { data: items, error: itemError } = await supabase.from('items').select('*').eq('category_id', cat.id);
      if (itemError) throw itemError;
      return { ...cat, items };
    }));
    
    fs.writeFileSync(menuDataPath, JSON.stringify({ categories: menu }, null, 2));
    console.log("[SERVER] Menu synced to menu-data.json");
  } catch (err) {
    console.error("[SERVER] Error syncing menu to file:", err);
  }
};

async function startServer() {
  console.log("[SERVER] startServer() called");
  console.log("[SERVER] process.cwd():", process.cwd());
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Helper to notify all clients of updates
  const notifyUpdate = (type: string, data?: any) => {
    console.log(`[SOCKET] Notifying update: ${type}`);
    io.emit(type, data);
  };

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);
  });

  console.log(`--- Server Starting ---`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`isProd: ${isProd}`);
  console.log(`Port: ${PORT}`);
  console.log(`Working Directory: ${process.cwd()}`);
  console.log(`-----------------------`);

  // Global Request Logger - MUST BE FIRST
  app.use((req, res, next) => {
    const logLine = `[GLOBAL LOG] ${new Date().toISOString()} | ${req.method} ${req.url} | Origin: ${req.headers.origin}\n`;
    console.log(logLine.trim());
    try {
      fs.appendFileSync(path.resolve(process.cwd(), "server.log"), logLine);
    } catch (e) {
      console.error("[SERVER] Error writing to log:", e);
    }
    next();
  });

  // API Cache Control and Content Type
  app.use("/api", (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.type('json'); // Ensure all /api responses are JSON
    next();
  });

  // API Routes - GET routes first (no body parsing needed)
  app.get("/api/health", (req, res) => {
    console.log(`[API] Health check: ${req.method} ${req.url}`);
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  const getMenu = async (req: any, res: any) => {
    console.log(`[API] HIT: getMenu | Method: ${req.method} | URL: ${req.url}`);
    try {
      const { data: categories, error: catError } = await supabase.from('categories').select('*');
      if (catError) throw catError;
      
      const menu = await Promise.all(categories.map(async (cat: any) => {
        const { data: items, error: itemError } = await supabase.from('items').select('*').eq('category_id', cat.id);
        if (itemError) throw itemError;
        return { ...cat, items };
      }));
      
      console.log(`[API] /menu returning ${menu.length} categories`);
      res.json(menu);
    } catch (err) {
      console.error("[API] Error /menu:", err);
      res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err)) });
    }
  };

  app.get("/api/menu", getMenu);
  app.get("/api/menu/", getMenu);

  app.get("/api/orders", async (req, res) => {
    const { email, customerId } = req.query;
    const identifier = customerId || email;
    console.log(`[API] Get orders for: ${identifier}`);
    
    if (!identifier) return res.status(400).json({ error: "Identifier required" });

    try {
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_email', identifier)
        .order('created_at', { ascending: false });
      if (orderError) throw orderError;

      const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
        const { data: items, error: itemError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        if (itemError) throw itemError;
        
        const itemsWithAddons = items.map((item: any) => ({
          ...item,
          selected_addons: item.selected_addons ? (typeof item.selected_addons === 'string' ? JSON.parse(item.selected_addons) : item.selected_addons) : []
        }));
        return { ...order, items: itemsWithAddons };
      }));
      res.json(ordersWithItems);
    } catch (err) {
      console.error("[API] Error fetching orders:", err);
      res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err)) });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    try {
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (orderError) throw orderError;

      const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
        const { data: items, error: itemError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        if (itemError) throw itemError;
        
        const itemsWithAddons = items.map((item: any) => ({
          ...item,
          selected_addons: item.selected_addons ? (typeof item.selected_addons === 'string' ? JSON.parse(item.selected_addons) : item.selected_addons) : []
        }));
        return { ...order, items: itemsWithAddons };
      }));
      res.json(ordersWithItems);
    } catch (err) {
      console.error("[API] Error fetching admin orders:", err);
      res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err)) });
    }
  });

  // Body Parsing Middleware - ONLY AFTER GET ROUTES
  app.use(express.json({ limit: '50mb' }));

  app.post("/api/categories", async (req, res) => {
    const { name, image } = req.body;
    console.log(`[API] Create category: ${name}`);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, image }])
        .select();
      if (error) throw error;
      
      notifyUpdate("menu_updated");
      await syncMenuToFile();
      res.json(data[0]);
    } catch (e) {
      console.error("[API] Error creating category:", e);
      res.status(400).json({ error: "Category already exists or invalid data" });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    const { id } = req.params;
    const { name, image } = req.body;
    try {
      const updateData: any = { image };
      if (name) updateData.name = name;
      
      const { error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
      
      notifyUpdate("menu_updated");
      await syncMenuToFile();
      res.json({ success: true });
    } catch (e) {
      console.error("[API] Error updating category:", e);
      res.status(500).json({ error: "Internal server error", details: e instanceof Error ? e.message : (typeof e === 'object' ? JSON.stringify(e) : String(e)) });
    }
  });

  app.post("/api/items", async (req, res) => {
    const { category_id, name, price_hot, price_cold, price_fixed, description, image } = req.body;
    let { addons } = req.body;

    // Default addons if not provided
    if (!addons) {
      const { data: category } = await supabase.from('categories').select('name').eq('id', category_id).single();
      if (category) {
        const catName = category.name;
        if (catName === "SPECIALTY ESPRESSO BEVERAGES" || catName === "BODEGA X LINEAR COFFEE ROASTERS") {
          addons = [
            { name: "Hazelnut", price: 30, available: true },
            { name: "Vanilla", price: 30, available: true },
            { name: "White chocolate", price: 30, available: true },
            { name: "Espresso Shot", price: 80, available: true }
          ];
        } else if (catName === "QUICK BITES" || catName === "COMFORT FOOD") {
          addons = [{ name: "Rice", price: 30, available: true }];
        } else {
          addons = null;
        }
      }
    }

    const { data, error } = await supabase
      .from('items')
      .insert([{ category_id, name, price_hot, price_cold, price_fixed, description, image, addons }])
      .select();
    if (error) throw error;

    notifyUpdate("menu_updated");
    await syncMenuToFile();
    res.json(data[0]);
  });

  app.put("/api/items/:id", async (req, res) => {
    const { id } = req.params;
    const { name, price_hot, price_cold, price_fixed, description, available, image, addons } = req.body;
    console.log(`[API] PUT /api/items/${id} | Body keys: ${Object.keys(req.body)} | Image length: ${image?.length}`);
    
    const { error } = await supabase
      .from('items')
      .update({ name, price_hot, price_cold, price_fixed, description, available, image, addons })
      .eq('id', id);
    if (error) throw error;
    
    notifyUpdate("menu_updated");
    await syncMenuToFile();
    res.json({ success: true });
  });

  app.delete("/api/items/:id", async (req, res) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    
    notifyUpdate("menu_updated");
    await syncMenuToFile();
    res.json({ success: true });
  });

  // Order Routes
  app.post("/api/orders", async (req, res) => {
    const { user_email, total, items, payment_method } = req.body;
    
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{ user_email, total, payment_method }])
        .select()
        .single();
      if (orderError) throw orderError;
      
      const orderId = order.id;
      
      const orderItems = items.map((item: any) => ({
        order_id: orderId,
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        type: item.type,
        selected_addons: item.selectedAddons
      }));
      
      const { error: itemError } = await supabase
        .from('order_items')
        .insert(orderItems);
      if (itemError) throw itemError;
      
      notifyUpdate("order_created", { id: orderId, user_email });
      res.json({ id: orderId, success: true });
    } catch (err) {
      console.error("[API] Error creating order:", err);
      res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err)) });
    }
  });

  app.put("/api/orders/:id/pay", async (req, res) => {
    const { error } = await supabase
      .from('orders')
      .update({ is_paid: true, status: 'completed' })
      .eq('id', req.params.id);
    if (error) throw error;
    
    notifyUpdate("order_updated", { id: req.params.id, status: 'completed', is_paid: true });
    res.json({ success: true });
  });

  app.put("/api/admin/orders/:id", async (req, res) => {
    const { id } = req.params;
    const { status, is_paid } = req.body;
    const { error } = await supabase
      .from('orders')
      .update({ status, is_paid })
      .eq('id', id);
    if (error) throw error;
    
    notifyUpdate("order_updated", { id, status, is_paid });
    res.json({ success: true });
  });

  app.post("/api/admin/sync", (req, res) => {
    try {
      syncMenuToFile();
      res.json({ success: true });
    } catch (err) {
      console.error("Sync error:", err);
      res.status(500).json({ error: "Failed to sync to file", details: err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err)) });
    }
  });

  app.post("/api/seed", async (req, res) => {
    const { categories } = req.body;
    
    try {
      // Delete existing data
      await supabase.from('order_items').delete().neq('id', 0);
      await supabase.from('orders').delete().neq('id', 0);
      await supabase.from('items').delete().neq('id', 0);
      await supabase.from('categories').delete().neq('id', 0);
      
      const beverageAddons = [
        { name: "Hazelnut", price: 30, available: true },
        { name: "Vanilla", price: 30, available: true },
        { name: "White chocolate", price: 30, available: true },
        { name: "Espresso Shot", price: 80, available: true }
      ];
      const foodAddons = [{ name: "Rice", price: 30, available: true }];

      for (const cat of categories) {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .insert([{ name: cat.name, image: cat.image || null }])
          .select()
          .single();
        if (catError) throw catError;
        
        const catId = catData.id;
        
        const itemsToInsert = cat.items.map((item: any) => {
          const hot = item.prices?.hot || (typeof item.price === 'object' ? item.price.hot : null);
          const cold = item.prices?.cold || (typeof item.price === 'object' ? item.price.cold : null);
          const fixed = typeof item.price === 'number' ? item.price : null;
          
          let itemAddons = (cat.name === "QUICK BITES" || cat.name === "COMFORT FOOD") ? foodAddons : beverageAddons;
          if (cat.name === "SWEET TREATS") {
            itemAddons = null;
          }
          
          return {
            category_id: catId,
            name: item.name,
            price_hot: hot,
            price_cold: cold,
            price_fixed: fixed,
            description: item.description || "",
            image: item.image || null,
            addons: itemAddons
          };
        });
        
        const { error: itemError } = await supabase.from('items').insert(itemsToInsert);
        if (itemError) throw itemError;
      }

      notifyUpdate("menu_updated");
      await syncMenuToFile();
      res.json({ success: true });
    } catch (err) {
      console.error("Seed error:", err);
      res.status(500).json({ error: "Failed to seed database", details: err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err)) });
    }
  });

  // Catch-all for API routes to prevent falling through to Vite/SPA fallback
  app.all("/api/*", (req, res) => {
    console.log(`API 404: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "API route not found", 
      method: req.method, 
      url: req.url 
    });
  });

  // Vite middleware for development
  if (!isProd) {
    console.log("Using Vite middleware for development...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: {
          // AI Studio specific: watch is often restricted
          usePolling: true,
          interval: 100
        }
      },
      appType: "spa",
    });
    
    // Log requests that reach Vite
    app.use((req, res, next) => {
      if (req.url.startsWith('/api')) {
        console.warn(`[WARN] API request reached Vite middleware: ${req.method} ${req.url}`);
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    console.log(`Serving static files from: ${distPath}`);
    
    if (!fs.existsSync(distPath)) {
      console.error("CRITICAL: 'dist' folder not found! Did you run 'npm run build'?");
    }

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      console.log(`[SPA FALLBACK] ${req.method} ${req.url}`);
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("index.html not found in dist folder. Please check your build.");
      }
    });
  }

  // Auto-seed if empty - REMOVED redundant block
  // The seeding is now handled at the top level of the module for consistency.

  console.log("Vite middleware and API routes configured. Starting listener...");
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

console.log("[SERVER] Initializing startServer()...");
startServer().catch(err => {
  console.error("[SERVER] FATAL ERROR DURING STARTUP:", err);
  process.exit(1);
});
