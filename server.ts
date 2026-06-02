import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/extract-schedule", upload.single('file'), async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable in settings." });
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const mimeType = req.file.mimetype;
    const base64Data = req.file.buffer.toString("base64");
    const { trainingName, angkatan } = req.body;

    const filePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const prompt = `Extract the training schedule from the provided document.
Output a JSON array of schedule entries.
The document may be a training program schedule (e.g., Latsar CPNS, PKP, dll).
For each schedule entry, extract:
- dayNumber: The numerical day of the training (e.g., 1, 2, 3...)
- date: The date of the session in YYYY-MM-DD format. Assume the year from the document if available, or the current year (2026).
- startTime: Session start time in HH:mm format.
- endTime: Session end time in HH:mm format.
- subject: The objective, topic, or agenda (Mata Pelatihan / Agenda).
- jp: Jam Pelajaran (lessons hours / JP). If not specified, leave blank or 0.
- instructors: Array of instructor names (Tenaga Pengajar). Remove any prefix/titles like "Ir.", "Dr." if you want, but retaining them is fine too.
- type: 'Synchronous', 'Asynchronous', 'Ceramah', 'Dinamika Kelompok', or 'Lainnya' based on the text. Default to 'Synchronous' if it says Sync, or 'Asynchronous' if Async.

Return ONLY the JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts: [filePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dayNumber: { type: Type.INTEGER, description: "Day number of the training" },
              date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
              startTime: { type: Type.STRING, description: "HH:mm" },
              endTime: { type: Type.STRING, description: "HH:mm" },
              subject: { type: Type.STRING, description: "Mata Pelatihan / Agenda" },
              jp: { type: Type.NUMBER, description: "JP value" },
              instructors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of instructor names" },
              type: { type: Type.STRING, description: "Synchronous, Asynchronous, Ceramah, Dinamika Kelompok, or Lainnya" },
            },
            required: ["dayNumber", "date", "startTime", "endTime", "subject", "type"],
          },
        },
      },
    });

    try {
      const jsonResponse = JSON.parse(response.text?.trim() || "[]");
      // Map it slightly to include trainingName and angkatan which the user selected
      const mappedSchedules = jsonResponse.map((item: any) => ({
        ...item,
        trainingName,
        angkatan,
      }));
      res.json({ schedules: mappedSchedules });
    } catch (e) {
      res.status(500).json({ error: "Failed to parse model output" });
    }
  } catch (error: any) {
    let errMsg = error.message || "Something went wrong";
    if (errMsg.includes("API key not valid") || errMsg.includes("INVALID_ARGUMENT")) {
      errMsg = "Invalid Gemini API Key. Please click the Settings menu and set a valid API key.";
      console.warn("Extraction warning:", errMsg);
    } else {
      console.error("Extraction error:", error);
    }
    res.status(500).json({ error: errMsg });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
