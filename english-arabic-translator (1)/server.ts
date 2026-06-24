import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Translation Endpoint
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required for translation" });
  }

  try {
    const ai = getAIClient();
    
    // Construct rich context instructions
    const systemInstruction = `You are "Tarjim AI", an elite, professional translation engine and language assistant specializing in high-fidelity translations between English, Arabic, and other supported world languages.
Your goal is to provide a highly accurate, natural, context-aware translation. Never perform a literal word-for-word translation. Handle slang, cultural context, idioms, and regional syntax beautifully.

CRITICAL SCRIPT & LANGUAGE SWAPPING INSTRUCTION:
1. Detect the actual script of the input text:
   - If the input text contains Arabic letters (e.g., characters from the range \\u0600-\\u06FF like "مرحبا", "الترجمة غلط"), the true input language is ARABIC.
   - If the input text contains Latin characters (e.g. English text like "Hello", "The translation is wrong"), the true input language is ENGLISH (or the corresponding Latin script language).
2. Dynamic target language swapping:
   - If the detected input language is ARABIC and the selected Target is Arabic ("ar"), you MUST set the Target Language to english ("en").
   - If the detected input language is ENGLISH / Latin and the selected Target is English ("en"), you MUST set the Target Language to Arabic ("ar").
3. Perform the actual translation on the text into the correct Target Language.
4. Output the result strictly in JSON. Make the transliteration/pronunciation clear and phonetic to help users read the translation aloud.`;

    const prompt = `Translate the following text.
User Selected Source: "${sourceLang || 'Auto-detect'}"
User Requested Target: "${targetLang}"

Text to translate:
"""
${text}
"""

Please translate correctly based on the rules. If the input is Arabic and target is Arabic, translate it to English. If the input is English/Latin and target is English, translate it to Arabic.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: {
              type: Type.STRING,
              description: "The primary translated text."
            },
            transliteration: {
              type: Type.STRING,
              description: "A phonetic guide / transliteration of the translated text (with vowel markings/accent hints) to help users pronounce it correctly."
            },
            explanation: {
              type: Type.STRING,
              description: "Brief vocabulary notes, alternate meanings, cultural notes, or blank if none."
            }
          },
          required: ["translatedText"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response content from translation model");
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Translation API error:", error);
    res.status(500).json({
      error: error.message || "Failed to process translation",
      details: error.toString()
    });
  }
});

// Text-to-Speech Endpoint (Optional premium feature powered by Gemini TTS)
app.post("/api/tts", async (req, res) => {
  const { text, lang } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required for speech synthesis" });
  }

  try {
    const ai = getAIClient();

    // Select suitable voice
    // Prebuilt options: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    // Kore is slightly softer/warmer, Zephyr is clear and direct
    const voiceName = lang === "ar" ? "Kore" : "Zephyr";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Speak this text naturally in ${lang === "ar" ? "Arabic" : "English"}: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio, mimeType: "audio/pcm;rate=24000" });
    } else {
      res.status(500).json({ error: "The TTS model did not return any audio data." });
    }
  } catch (error: any) {
    console.error("TTS API error:", error);
    res.status(500).json({
      error: error.message || "Failed to process voice synthesis"
    });
  }
});

// Setup Vite & Static Files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Tarjim Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
