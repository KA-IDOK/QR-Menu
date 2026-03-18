import "dotenv/config";
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
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

console.log("[SERVER] Supabase URL:", supabaseUrl ? "Present" : "Missing");
console.log("[SERVER] Supabase Key:", supabaseKey ? "Present" : "Missing");

if (!supabaseUrl || !supabaseKey) {
  console.warn("[SERVER] WARNING: Supabase credentials missing. Running in fallback mode with local JSON.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to upload base64 image to Supabase Storage
const uploadBase64ToStorage = async (base64Str: string, folder: string, filenamePrefix: string): Promise<string> => {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return base64Str;
  }

  try {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Str;
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = contentType.split('/')[1] || 'png';
    const filePath = `${folder}/${filenamePrefix}_${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error("[Storage] Upload error:", error);
      return base64Str; // Fallback to base64 if upload fails
    }

    const { data: publicUrlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("[Storage] Exception during upload:", err);
    return base64Str;
  }
};

// Helper to sync database to JSON file for "code permanence"
const syncMenuToFile = async () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[SERVER] Supabase not configured, skipping syncMenuToFile");
    return;
  }
  try {
    const { data: categories, error: catError } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (catError) throw catError;
    
    const menu = await Promise.all(categories.map(async (cat: any) => {
      const { data: items, error: itemError } = await supabase.from('items').select('*').eq('category_id', cat.id).order('sort_order', { ascending: true });
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

  let cachedMenu: any = null;

  // Load initial menu from file if it exists
  try {
    if (fs.existsSync(menuDataPath)) {
      const fileData = fs.readFileSync(menuDataPath, 'utf8');
      const parsed = JSON.parse(fileData);
      cachedMenu = parsed.categories || parsed;
      console.log("[SERVER] Initialized cachedMenu from menu-data.json");
    }
  } catch (err) {
    console.error("[SERVER] Error loading initial menu-data.json:", err);
  }

  // Helper to notify all clients of updates
  const notifyUpdate = (type: string, data?: any) => {
    console.log(`[SOCKET] Notifying update: ${type}`);
    if (type === "menu_updated") {
      cachedMenu = null;
    }
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
      if (cachedMenu) {
        console.log(`[API] Returning cached menu`);
        return res.json(cachedMenu);
      }

      // If no cache, try fetching from Supabase
      if (supabaseUrl && supabaseKey) {
        const [categoriesRes, itemsRes] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order', { ascending: true }),
          supabase.from('items').select('*').order('sort_order', { ascending: true })
        ]);

        if (!categoriesRes.error && !itemsRes.error) {
          const categories = categoriesRes.data || [];
          const items = itemsRes.data || [];

          const menu = categories.map((cat: any) => {
            return {
              ...cat,
              items: items.filter((item: any) => item.category_id === cat.id)
            };
          });
          
          console.log(`[API] /menu returning ${menu.length} categories (fetched from DB)`);
          cachedMenu = menu;
          return res.json(menu);
        } else {
          console.error("[API] Supabase error fetching menu:", categoriesRes.error || itemsRes.error);
        }
      } else {
        console.warn("[API] Supabase not configured, cannot fetch fresh menu");
      }

      // Fallback to file if DB fails or is not configured
      if (fs.existsSync(menuDataPath)) {
        const fileData = fs.readFileSync(menuDataPath, 'utf8');
        const parsed = JSON.parse(fileData);
        const menu = parsed.categories || parsed;
        cachedMenu = menu;
        console.log("[API] Returning menu from menu-data.json (fallback)");
        return res.json(menu);
      }

      throw new Error("Menu data not available (DB failed and no local file)");
    } catch (err: any) {
      console.error("[API] Error /menu:", err);
      res.status(500).json({ 
        error: "Internal server error", 
        details: err.message || String(err) 
      });
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
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase not configured");
      }
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
    } catch (err: any) {
      console.error("[API] Error fetching orders:", err);
      res.status(500).json({ error: "Internal server error", details: err.message || String(err) });
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
    } catch (err: any) {
      console.error("[API] Error fetching admin orders:", err);
      res.status(500).json({ error: "Internal server error", details: err.message || String(err) });
    }
  });

  // Body Parsing Middleware - ONLY AFTER GET ROUTES
  app.use(express.json({ limit: '50mb' }));

  app.post("/api/categories", async (req, res) => {
    let { name, image, sort_order } = req.body;
    console.log(`[API] Create category: ${name}`);
    try {
      if (image && image.startsWith('data:image')) {
        image = await uploadBase64ToStorage(image, 'categories', `cat_${Date.now()}`);
      }

      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, image, sort_order }])
        .select();
      if (error) throw error;
      
      notifyUpdate("menu_updated");
      await syncMenuToFile();
      res.json(data[0]);
    } catch (err: any) {
      console.error("[API] Error creating category:", err);
      res.status(400).json({ error: "Category already exists or invalid data", details: err.message || String(err) });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    const { id } = req.params;
    let { name, image, sort_order } = req.body;
    try {
      if (image && image.startsWith('data:image')) {
        image = await uploadBase64ToStorage(image, 'categories', `cat_${id}`);
      }

      const updateData: any = { image };
      if (name) updateData.name = name;
      if (sort_order !== undefined) updateData.sort_order = sort_order;
      
      const { error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
      
      notifyUpdate("menu_updated");
      await syncMenuToFile();
      res.json({ success: true });
    } catch (err: any) {
      console.error("[API] Error updating category:", err);
      res.status(500).json({ error: "Internal server error", details: err.message || String(err) });
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      let { category_id, name, price_hot, price_cold, price_fixed, description, image, sort_order } = req.body;
      let { addons } = req.body;

      if (image && image.startsWith('data:image')) {
        image = await uploadBase64ToStorage(image, 'items', `item_${Date.now()}`);
      }

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
        .insert([{ category_id, name, price_hot, price_cold, price_fixed, description, image, addons, sort_order }])
        .select();
      if (error) throw error;

      notifyUpdate("menu_updated");
      await syncMenuToFile();
      res.json(data[0]);
    } catch (err: any) {
      console.error("[API] Error creating item:", err);
      res.status(500).json({ error: "Internal server error", details: err.message || String(err) });
    }
  });

  app.put("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let { name, price_hot, price_cold, price_fixed, description, available, image, addons, sort_order } = req.body;
      console.log(`[API] PUT /api/items/${id} | Body keys: ${Object.keys(req.body)} | Image length: ${image?.length}`);
      
      if (image && image.startsWith('data:image')) {
        image = await uploadBase64ToStorage(image, 'items', `item_${id}`);
      }

      const { error } = await supabase
        .from('items')
        .update({ name, price_hot, price_cold, price_fixed, description, available, image, addons, sort_order })
        .eq('id', id);
      if (error) throw error;
      
      notifyUpdate("menu_updated");
      await syncMenuToFile();
      res.json({ success: true });
    } catch (err: any) {
      console.error("[API] Error updating item:", err);
      res.status(500).json({ error: "Internal server error", details: err.message || String(err) });
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', req.params.id);
      if (error) throw error;
      
      notifyUpdate("menu_updated");
      await syncMenuToFile();
      res.json({ success: true });
    } catch (err: any) {
      console.error("[API] Error deleting item:", err);
      res.status(500).json({ error: "Internal server error", details: err.message || String(err) });
    }
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
    } catch (err: any) {
      console.error("[API] Error creating order:", err);
      res.status(500).json({ error: "Internal server error", details: err.message || String(err) });
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
    } catch (err: any) {
      console.error("Sync error:", err);
      res.status(500).json({ error: "Failed to sync to file", details: err.message || String(err) });
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
