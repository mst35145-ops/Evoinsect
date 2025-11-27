import { GoogleGenAI, Type } from "@google/genai";
import { InsectStats, Language, UserPreferences } from "../types";
import { GEMINI_MODEL } from "../constants";

export const analyzeInsectDrawing = async (
  base64Image: string, 
  lang: Language,
  prefs: UserPreferences
): Promise<InsectStats> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Remove data URL prefix if present
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  const langName = lang === 'ru' ? 'Russian' : 'English';

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this drawing of a fictional insect for a biology simulation game. 
            Based on its visual features (wings, legs, mandibles, body shape), determine its biological statistics.
            Be creative with the name and description in ${langName} language.
            
            Return JSON matching the schema.`,
          },
        ],
      },
      config: {
        systemInstruction: "You are an expert entomologist for a sci-fi ecosystem simulator.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: `Scientific or fun name in ${langName}` },
            description: { type: Type.STRING, description: `Short biological description in ${langName} (max 20 words)` },
            diet: { type: Type.STRING, enum: ["HERBIVORE", "CARNIVORE", "OMNIVORE"] },
            speed: { type: Type.NUMBER, description: "Movement speed, 1 (slow) to 10 (fast)" },
            size: { type: Type.NUMBER, description: "Physical size, 1 (tiny) to 10 (huge)" },
            reproductionRate: { type: Type.NUMBER, description: "How often it breeds, 1 (rare) to 10 (frequent)" },
            lifespan: { type: Type.NUMBER, description: "How long it lives, 1 (short) to 10 (long)" },
            colorHex: { type: Type.STRING, description: "Dominant hex color of the insect for UI usage" },
          },
          required: ["name", "description", "diet", "speed", "size", "reproductionRate", "lifespan", "colorHex"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const result = JSON.parse(text) as InsectStats;

    // Apply manual overrides
    if (prefs.diet !== 'AUTO') {
        result.diet = prefs.diet;
    }

    return result;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Fallback stats in case of error
    return {
      name: lang === 'ru' ? "Неизвестный Жук" : "Unknown Bug",
      description: lang === 'ru' 
        ? "ИИ не смог распознать существо, но оно живое."
        : "AI could not recognize the creature, but it is alive.",
      diet: prefs.diet !== 'AUTO' ? prefs.diet : "OMNIVORE",
      speed: 5,
      size: 5,
      reproductionRate: 5,
      lifespan: 5,
      colorHex: "#4ade80",
    };
  }
};