import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("."));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normalizeIngredients(ingredients = []) {
  return ingredients
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
}

app.post("/api/recipe", async (req, res) => {
  try {
    const ingredients = normalizeIngredients(req.body.ingredients);
    const maxTime = Number(req.body.maxTime || 20);
    const difficulty = String(req.body.difficulty || "facile");

    if (ingredients.length !== 3) {
      return res.status(400).json({ error: "Devi inviare esattamente 3 ingredienti." });
    }

    const prompt = `
Sei uno chef pratico e realistico.
Genera esattamente 2 ricette italiane usando principalmente questi 3 ingredienti: ${ingredients.join(", ")}.

Regole obbligatorie:
- tempo massimo: ${maxTime} minuti
- difficoltà desiderata: ${difficulty}
- puoi aggiungere solo ingredienti base di dispensa: olio, sale, pepe, acqua, aglio, cipolla, limone, pangrattato
- non inventare ingredienti premium o strani
- i passaggi devono essere chiari, brevi e realistici
- ogni ricetta deve essere davvero cucinabile in casa
- scrivi tutto in italiano
`;

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "recipe_response",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              recipes: {
                type: "array",
                minItems: 2,
                maxItems: 2,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    time_minutes: { type: "number" },
                    difficulty: { type: "string" },
                    servings: { type: "number" },
                    ingredients_used: {
                      type: "array",
                      items: { type: "string" }
                    },
                    extra_pantry: {
                      type: "array",
                      items: { type: "string" }
                    },
                    steps: {
                      type: "array",
                      minItems: 3,
                      items: { type: "string" }
                    }
                  },
                  required: [
                    "title",
                    "time_minutes",
                    "difficulty",
                    "servings",
                    "ingredients_used",
                    "extra_pantry",
                    "steps"
                  ]
                }
              }
            },
            required: ["recipes"]
          }
        }
      }
    });

    const data = JSON.parse(response.output_text);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Errore nella generazione della ricetta.",
      details: error?.message || "Errore sconosciuto"
    });
  }
});

app.listen(port, () => {
  console.log(`Server avviato su http://localhost:${port}`);
});
