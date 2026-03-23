import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL or SUPABASE_KEY is missing from environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const menuDataPath = path.resolve(process.cwd(), "menu-data.json");

const syncMenuToFile = async () => {
  try {
    console.log("Fetching categories...");
    const { data: categories, error: catError } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (catError) throw catError;
    
    console.log(`Found ${categories.length} categories.`);
    
    const menu = await Promise.all(categories.map(async (cat: any) => {
      console.log(`Fetching items for category: ${cat.name}`);
      const { data: items, error: itemError } = await supabase.from('items').select('*').eq('category_id', cat.id).order('sort_order', { ascending: true });
      if (itemError) throw itemError;
      return { ...cat, items };
    }));
    
    fs.writeFileSync(menuDataPath, JSON.stringify({ categories: menu }, null, 2));
    console.log("Menu synced to menu-data.json successfully.");
  } catch (err) {
    console.error("Error syncing menu to file:", err);
  }
};

syncMenuToFile();
