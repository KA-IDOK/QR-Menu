import { GoogleGenAI } from "@google/genai";

export const generateMenuItemImage = async (itemName: string, categoryName: string, description: string | null) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const prompt = `A professional, high-quality, appetizing food photography of ${itemName} from the ${categoryName} category. ${description || ''}. Studio lighting, clean background, restaurant style presentation.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No image generated');
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
};

export const generateCategoryImage = async (categoryName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const prompt = `A professional, high-quality, artistic photography representing the ${categoryName} category of a cafe menu. Minimalist, clean aesthetic, studio lighting, high-end restaurant vibe.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No image generated');
  } catch (error) {
    console.error('Error generating category image:', error);
    throw error;
  }
};
