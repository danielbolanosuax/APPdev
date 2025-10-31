import "dotenv/config";
import express from "express";
import cors from "cors";
import { SuggestRequest, SuggestResponse } from "./types.js";
import { pickCandidates } from "./recipes/match.js";
import { generateSuggest } from "./llm/llmClient.js";
import { validateSuggest } from "./recipes/validate.js";
import { fetchOFF } from "./scanner/offClient.js";
import { computeScore } from "./scanner/score.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/recipes/suggest", async (req, res) => {
  try {
    const body = req.body as SuggestRequest;
    if (!Array.isArray(body.pantry) || body.pantry.length === 0) {
      return res.status(400).json({ error: "pantry requerido: string[]" });
    }
    const candidates = pickCandidates(body.pantry, body.dietary, 6);
    const out = await generateSuggest(body.pantry, candidates, body);
    const valid = validateSuggest(out);
    res.json(valid satisfies SuggestResponse);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "error" });
  }
});

const scanCache = new Map<string, unknown>();

app.get("/api/scan/:barcode", async (req, res) => {
  try {
    const code = req.params.barcode;
    if (!/^\d{8,14}$/.test(code)) return res.status(400).json({ error: "barcode inválido" });
    if (scanCache.has(code)) return res.json(scanCache.get(code));
    const off = await fetchOFF(code);
    if (off.status !== 1) return res.status(404).json({ error: "producto no encontrado" });
    const scored = computeScore(off);
    const result = { product: scored, alternatives: [] as unknown[] };
    scanCache.set(code, result);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "error" });
  }
});

const PORT = Number(process.env.PORT ?? 8080);
app.listen(PORT, () => console.log(`Smart Pantry API en http://localhost:${PORT}`));
