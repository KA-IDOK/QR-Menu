import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateMenuItemImage(name: string, category: string, description?: string) {
  const prompt = `A high-quality, professional food photography shot of ${name} (${description || ''}) from the ${category} category. 
  The style should be minimalist, clean, and appetizing, suitable for a modern cafe menu. 
  Soft natural lighting, shallow depth of field, on a neutral background.`;

  const response = await getAiClient().models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ parts: [{ text: prompt }] }],
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  // Fallback to a placeholder if generation fails
  return `https://picsum.photos/seed/${encodeURIComponent(name)}/800/600`;
}

export async function generateCategoryImage(name: string) {
  const prompt = `A professional, aesthetic photography shot representing the ${name} category for a cafe menu. 
  Minimalist, clean, and high-quality. Soft natural lighting.`;

  const response = await getAiClient().models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ parts: [{ text: prompt }] }],
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  return `https://picsum.photos/seed/${encodeURIComponent(name)}/800/600`;
}
