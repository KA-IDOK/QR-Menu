import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!ai) {
    console.log("DEBUG: process.env keys:", Object.keys(process.env));
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function extractMenuFromImage(base64Image: string) {
  const response = await getAiClient().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: `Extract the menu items from this image and return them as a JSON object. 
            The structure should be:
            {
              "categories": [
                {
                  "name": "Category Name",
                  "items": [
                    {
                      "name": "Item Name",
                      "price": 100, // Use a single price if only one is listed, or an object if multiple (e.g., hot/cold)
                      "prices": { "hot": 100, "cold": 120 }, // Optional: if multiple prices exist
                      "description": "Optional description",
                      "addons": [ { "name": "Addon Name", "price": 30 } ] // Optional: list of add-ons
                    }
                  ]
                }
              ]
            }
            Include all items, categories, prices, and add-ons accurately.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
}
