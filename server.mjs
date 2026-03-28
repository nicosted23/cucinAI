import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

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
      return res.status(400).json({
        error: "Devi inviare esattamente 3 ingredienti."
      });
    }

    const prompt = `
Sei uno chef creativo, tecnico e pratico, specializzato nel trasformare pochi ingredienti in ricette originali, realistiche e ben spiegate.

Il tuo compito è generare ESATTAMENTE 3 ricette diverse tra loro usando principalmente questi 3 ingredienti:
${ingredients.join(", ")}.

PARAMETRI DA RISPETTARE:
- Ingredienti obbligatori: ${ingredients.join(", ")}
- Tempo massimo: ${maxTime} minuti
- Difficoltà richiesta: ${difficulty}
- Lingua: italiano

OBIETTIVO:
Creare 3 ricette che siano:
- innovative ma realizzabili in una cucina normale
- diverse davvero tra loro per tecnica, consistenza, idea e risultato finale
- appetitose, coerenti e credibili
- facili da capire e utili da eseguire

REGOLE FONDAMENTALI:
1. Usa davvero tutti e 3 gli ingredienti principali in ogni ricetta.
2. Non ripetere la stessa idea con piccole variazioni.
3. Evita ricette banali, troppo generiche, inutilmente gourmet o poco realistiche.
4. Evita ricette troppo simili tra loro per cottura, struttura o presentazione.
5. Le ricette devono sembrare create da uno chef pratico, non da un testo casuale.
6. Ogni ricetta deve avere una propria identità chiara.
7. Non usare ingredienti extra strani, costosi o difficili da trovare.
8. Puoi usare solo ingredienti base da dispensa comuni, come:
   olio extravergine, sale, pepe, acqua, burro, latte, farina, pangrattato, aglio, cipolla, limone, erbe aromatiche comuni, parmigiano, spezie base.
9. Se una ricetta richiede un extra importante, deve essere comune e giustificato.
10. Scrivi in modo chiaro, concreto, pratico, ordinato.

VARIAZIONE IN BASE ALLA DIFFICOLTÀ:
- Se la difficoltà è "facile":
  - proponi ricette molto accessibili
  - pochi passaggi
  - tecniche semplici
  - strumenti comuni
  - risultato buono e veloce
- Se la difficoltà è "media":
  - proponi ricette più curate
  - tecniche leggermente più interessanti
  - maggiore attenzione a consistenze, equilibrio e rifinitura
- Se la difficoltà è "difficile":
  - proponi ricette più tecniche, creative e strutturate
  - passaggi più raffinati
  - maggiore profondità culinaria
  - combinazioni più originali
  - impiattamento e costruzione più evoluti
  - ma sempre realistiche da eseguire in casa da una persona motivata

COME DEVONO ESSERE LE 3 RICETTE:
- La ricetta 1 deve essere la più immediata e comfort.
- La ricetta 2 deve avere un’idea più creativa o una tecnica diversa.
- La ricetta 3 deve essere la più originale, sorprendente o elegante.
- Tutte e 3 devono rientrare nel tempo massimo richiesto.

PER OGNI RICETTA:
- crea un titolo forte, invogliante e diverso dalle altre
- indica tempo reale stimato
- indica difficoltà coerente con quella richiesta
- indica porzioni
- specifica gli ingredienti principali usati
- specifica gli ingredienti extra di dispensa
- scrivi passaggi numerati, pratici e molto chiari
- fai capire bene ordine, tecnica e risultato atteso
- inserisci dettagli utili che migliorano davvero l’esecuzione
- evita frasi vaghe come "cuoci quanto basta" o "fai normalmente"
- spiega in modo preciso ma non prolisso

QUALITÀ DELLE SPIEGAZIONI:
Le istruzioni devono essere:
- pratiche
- precise
- leggibili
- concrete
- facili da seguire mentre si cucina
- senza teoria inutile
- senza ripetizioni

EVITA ASSOLUTAMENTE:
- ricette duplicate o quasi uguali
- titoli banali
- istruzioni generiche
- risultati improbabili
- abbinamenti senza senso
- ingredienti non coerenti
- ricette troppo simili tra loro
- varianti pigre della stessa preparazione

IMPORTANTE:
Prima di rispondere, controlla mentalmente che le 3 ricette siano davvero diverse per:
- tecnica
- struttura
- esperienza finale
- stile del piatto

Restituisci il risultato nello schema JSON richiesto, senza testo fuori formato.
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

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("Server avviato su http://localhost:" + port);
});