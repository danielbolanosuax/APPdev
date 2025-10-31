import { SuggestRequest, SuggestResponse, Recipe } from "../types.js";

type LLMProvider = "ollama" | "openai";

const provider = (process.env.LLM_PROVIDER as LLMProvider) ?? "ollama";
const model = process.env.LLM_MODEL ?? "phi3:3.8b-instruct-q4_K_M";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

const SYSTEM_STYLE = `
Eres un chef español cercano y con chispa. No uses ni menciones marcas ni nombres de personas reales.
Estilo: breve, práctico, humor blanco, refranes suaves, tips de aprovechamiento y seguridad alimentaria.
Devuelve SOLO JSON válido conforme al esquema pedido, sin texto extra.
`;

const buildPrompt = (pantry: string[], candidates: Recipe[], req: SuggestRequest) => {
  const schema = `
Devuelve un JSON con este esquema:
{
  "persona": "chef-cercano",
  "recipes": [
    {
      "id": "string",
      "title": "string",
      "reason": "string",
      "ingredients_needed": ["string"],
      "substitutions": ["string"],
      "steps": ["string"],
      "time_minutes": 0,
      "servings": 0,
      "warnings": ["string"],
      "tips": ["string"]
    }
  ]
}`;
  const ctx = {
    pantry,
    servings: req.servings ?? 2,
    dietary: req.dietary ?? {},
    candidates: candidates.map((c) => ({
      id: c.id,
      title: c.title,
      ingredients: c.ingredients,
      steps: c.steps,
      time_minutes: c.time_minutes,
      servings: c.servings,
      allergens: c.allergens ?? [],
      tags: c.tags ?? [],
    })),
  };
  return `Contexto:\n${JSON.stringify(ctx, null, 2)}\n\n${schema}\nRespeta cantidades y tiempos realistas. No inventes datos de alérgenos si no están en el contexto.`;
};

async function callOllama(prompt: string) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: `${SYSTEM_STYLE}\n${prompt}`, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = (await res.json()) as { response: string };
  return data.response;
}

async function callOpenAI(prompt: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_STYLE },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as any;
  return data.choices[0].message.content as string;
}

export async function generateSuggest(
  pantry: string[],
  candidates: Recipe[],
  req: SuggestRequest,
): Promise<SuggestResponse> {
  const prompt = buildPrompt(pantry, candidates, req);
  const raw = provider === "openai" ? await callOpenAI(prompt) : await callOllama(prompt);
  try {
    return JSON.parse(raw) as SuggestResponse;
  } catch {
    const match = raw.match(/\{[\s\S]*\}$/);
    if (!match) throw new Error("LLM devolvió salida no JSON");
    return JSON.parse(match[0]) as SuggestResponse;
  }
}
