import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../frontend");

app.use(cors());
app.use(express.json());
app.use(express.static(frontendPath));

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
    const maxTimeRaw = String(req.body.maxTime || "qualsiasi");
const difficultyRaw = String(req.body.difficulty || "qualsiasi");

const maxTime = maxTimeRaw === "qualsiasi" ? null : Number(maxTimeRaw);
const difficulty = difficultyRaw === "qualsiasi" ? null : difficultyRaw;

    if (ingredients.length !== 3) {
      return res.status(400).json({
        error: "Devi inviare esattamente 3 ingredienti."
      });
    }

   const prompt = `
Sei uno chef pratico, creativo e preciso.

Genera ESATTAMENTE 3 ricette diverse tra loro usando principalmente questi 3 ingredienti:
${ingredients.join(", ")}.

PARAMETRI:
- Ingredienti obbligatori: ${ingredients.join(", ")}
- Tempo massimo: ${maxTime ? `${maxTime} minuti` : "qualsiasi, ma resta pratico e realistico"}
- Difficoltà richiesta: ${difficulty ? difficulty : "qualsiasi"}
- Lingua: italiano

OBIETTIVO:
Crea 3 ricette:
- realmente fattibili in una cucina di casa
- diverse tra loro per idea, tecnica e risultato
- appetitose, chiare e credibili
- pratiche da seguire
- non ripetitive

REGOLE:
1. Usa davvero tutti e 3 gli ingredienti principali in ogni ricetta.
2. Non proporre ricette quasi uguali tra loro.
3. Evita ricette banali, poco realistiche o troppo simili.
4. Puoi aggiungere solo ingredienti extra comuni da dispensa.
5. Gli ingredienti devono essere scritti con quantità realistiche e precise.
6. Ogni ricetta deve avere massimo 5 passaggi chiari e concreti.
7. Le spiegazioni devono essere pratiche, non lunghe.
8. Non aggiungere testo fuori dal JSON richiesto.

GESTIONE DELLA DIFFICOLTÀ:
- facile = pochi passaggi, tecniche semplici, strumenti comuni
- media = maggiore cura e combinazioni più interessanti
- difficile = più tecnica, più struttura, ma sempre realistica
- qualsiasi = scegli liberamente il livello più adatto alla ricetta

STRUTTURA DELLE 3 RICETTE:
- Ricetta 1: più semplice e immediata
- Ricetta 2: più creativa
- Ricetta 3: più originale o elegante

Per ogni ricetta restituisci:
- titolo
- tempo in minuti
- difficoltà
- porzioni
- lista completa ingredienti con quantità
- procedimento in 5 passaggi massimo

Se è stato indicato un tempo massimo preciso, rispettalo.
Se il tempo è qualsiasi, resta comunque entro un tempo realistico da cucina domestica.

`;


    const response = await client.responses.create({
      model: "gpt-5.4",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "recipe_response",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              recipes: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    time_minutes: { type: "number" },
                    difficulty: { type: "string" },
                    servings: { type: "number" },
                    ingredients: {
  type: "array",
  minItems: 3,
  items: { type: "string" }
},
   steps: {
    type: "array",
    minItems: 3,
    maxItems: 5,
    items: { type: "string" }
  }
},             
                  required: [
  "title",
  "time_minutes",
  "difficulty",
  "servings",
  "ingredients",
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
app.post("/api/search-recipes", async (req, res) => {
  try {
    const query = String(req.body.query || "").trim();
    const maxTimeRaw = String(req.body.maxTime || "qualsiasi");
    const difficultyRaw = String(req.body.difficulty || "qualsiasi");
    const mode = String(req.body.mode || "qualsiasi");

    const maxTime = maxTimeRaw === "qualsiasi" ? null : Number(maxTimeRaw);
    const difficulty = difficultyRaw === "qualsiasi" ? null : difficultyRaw;

    if (!query) {
      return res.status(400).json({
        error: "Inserisci una ricerca valida."
      });
    }

    const prompt = `
Sei uno chef pratico, creativo e preciso.

Genera ESATTAMENTE 3 ricette diverse tra loro in base a questa richiesta:
"${query}"

PARAMETRI:
- Tempo massimo: ${maxTime ? `${maxTime} minuti` : "qualsiasi, ma resta realistico"}
- Difficoltà: ${difficulty ? difficulty : "qualsiasi"}
- Modalità: ${mode}

REGOLE:
- Le ricette devono essere realistiche e fattibili a casa
- Devono essere diverse tra loro
- Devono avere ingredienti con quantità precise
- Devono avere massimo 5 passaggi chiari
- Se la modalità è fitness, vegetariano, senza-glutine o economico, rispettala davvero
- Restituisci solo JSON valido
`;

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "search_recipe_response",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              recipes: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    time_minutes: { type: "number" },
                    difficulty: { type: "string" },
                    servings: { type: "number" },
                    ingredients: {
                      type: "array",
                      minItems: 3,
                      items: { type: "string" }
                    },
                    steps: {
                      type: "array",
                      minItems: 3,
                      maxItems: 5,
                      items: { type: "string" }
                    }
                  },
                  required: [
                    "title",
                    "time_minutes",
                    "difficulty",
                    "servings",
                    "ingredients",
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
      error: "Errore nella ricerca delle ricette.",
      details: error?.message || "Errore sconosciuto"
    });
  }
});

app.post("/api/generate-recipe-image", async (req, res) => {
  try {
    const recipe = req.body.recipe;

    if (!recipe || !recipe.title) {
      return res.status(400).json({
        error: "Ricetta non valida per la generazione dell'immagine."
      });
    }

    const imagePrompt = `
Foto professionale di un piatto cucinato chiamato "${recipe.title}".
Stile food photography premium, realistico, appetitoso, luce naturale, impiattamento moderno, alta qualità, cucina reale, dettaglio ricco, molto invitante.
`;

    const imageResponse = await client.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      size: "1024x1024"
    });

    const imageBase64 = imageResponse.data[0].b64_json;
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Errore nella generazione dell'immagine.",
      details: error?.message || "Errore sconosciuto"
    });
  }
});
const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("Server avviato su http://localhost:" + port);
});