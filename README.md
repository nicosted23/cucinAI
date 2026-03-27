# CucinaAI page

## Avvio

```bash
npm install
cp .env.example .env
# inserisci la tua OPENAI_API_KEY nel file .env
export OPENAI_API_KEY="la_tua_chiave"
npm start
```

Poi apri:

```bash
http://localhost:3000
```

## File

- `index.html` → pagina frontend
- `server.mjs` → backend Express con endpoint `/api/recipe`
- `package.json` → dipendenze
- `.env.example` → esempio variabili ambiente

## Note

- Se il backend non è raggiungibile, la pagina mostra una demo locale.
- Non mettere la chiave API nel frontend.
