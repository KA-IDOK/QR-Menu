
console.log("Environment Keys:", Object.keys(process.env));
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "Present" : "Missing");
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY ? "Present" : "Missing");
console.log("VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL ? "Present" : "Missing");
console.log("VITE_SUPABASE_KEY:", process.env.VITE_SUPABASE_KEY ? "Present" : "Missing");
