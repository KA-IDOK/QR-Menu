import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateMenuItemImage(name: string, category: string, description?: string) {
  const prompt = `A high-quality, professional food photography shot of ${name} (${description || ''}) from the ${category} category. 
  The style should be minimalist, clean, and appetizing, suitable for a modern cafe menu. 
  Soft natural lighting, shallow depth of field, on a neutral background.`;

  const response = await ai.models.generateContent({
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

  const response = await ai.models.generateContent({
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
