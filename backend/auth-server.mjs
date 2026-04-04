import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, "data", "users.json");

function ensureUsersFile() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, "[]", "utf8");
  }
}

function readUsers() {
  ensureUsersFile();

  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Errore lettura users.json:", error);
    return [];
  }
}

function writeUsers(users) {
  ensureUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function generateId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    preferences: user.preferences || {
      foodPreferences: [],
      intolerances: [],
      goal: "",
      fitnessMode: false
    },
    stats: {
      savedRecipesCount: Array.isArray(user.savedRecipes) ? user.savedRecipes.length : 0,
      shoppingListsCount: Array.isArray(user.shoppingLists) ? user.shoppingLists.length : 0,
      weeklyMenusCount: Array.isArray(user.weeklyMenus) ? user.weeklyMenus.length : 0
    }
  };
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function getUserFromToken(req) {
  const token = getTokenFromRequest(req);

  if (!token) return null;

  const users = readUsers();
  return users.find((user) => user.authToken === token && user.isActive !== false) || null;
}

function requireAuth(req, res, next) {
  const user = getUserFromToken(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Accesso non autorizzato."
    });
  }

  req.user = user;
  next();
}

function mergeUniqueItems(existing = [], incoming = []) {
  const safeExisting = Array.isArray(existing) ? existing : [];
  const safeIncoming = Array.isArray(incoming) ? incoming : [];

  const map = new Map();

  [...safeExisting, ...safeIncoming].forEach((item, index) => {
    const key =
      item?.id ||
      item?.uuid ||
      item?.title ||
      item?.name ||
      JSON.stringify(item) ||
      String(index);

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Auth server CucinAI attivo."
  });
});

app.post("/api/auth/register", (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    const cleanName = String(name || "").trim();
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = String(password || "");

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: "Nome, email e password sono obbligatori."
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "La password deve contenere almeno 6 caratteri."
      });
    }

    const users = readUsers();
    const existingUser = users.find((user) => user.email === cleanEmail);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Esiste già un account con questa email."
      });
    }

    const now = new Date().toISOString();
    const authToken = generateToken();

    const newUser = {
      id: generateId(),
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(cleanPassword),
      role: "user",
      plan: "free",
      subscriptionStatus: "none",
      isActive: true,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      authToken,
      preferences: {
        foodPreferences: [],
        intolerances: [],
        goal: "",
        fitnessMode: false
      },
      savedRecipes: [],
      shoppingLists: [],
      weeklyMenus: []
    };

    users.push(newUser);
    writeUsers(users);

    return res.status(201).json({
      success: true,
      message: "Account creato con successo.",
      token: authToken,
      user: sanitizeUser(newUser)
    });
  } catch (error) {
    console.error("Errore register:", error);
    return res.status(500).json({
      success: false,
      message: "Errore interno durante la registrazione."
    });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body || {};

    const cleanEmail = normalizeEmail(email);
    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: "Email e password sono obbligatorie."
      });
    }

    const users = readUsers();
    const userIndex = users.findIndex((user) => user.email === cleanEmail);

    if (userIndex === -1) {
      return res.status(401).json({
        success: false,
        message: "Credenziali non valide."
      });
    }

    const user = users[userIndex];
    const passwordHash = hashPassword(cleanPassword);

    if (user.passwordHash !== passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Credenziali non valide."
      });
    }

    const now = new Date().toISOString();
    const newToken = generateToken();

    users[userIndex].authToken = newToken;
    users[userIndex].lastLoginAt = now;
    users[userIndex].updatedAt = now;

    writeUsers(users);

    return res.json({
      success: true,
      message: "Accesso effettuato con successo.",
      token: newToken,
      user: sanitizeUser(users[userIndex])
    });
  } catch (error) {
    console.error("Errore login:", error);
    return res.status(500).json({
      success: false,
      message: "Errore interno durante il login."
    });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  return res.json({
    success: true,
    user: sanitizeUser(req.user)
  });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  try {
    const users = readUsers();
    const userIndex = users.findIndex((user) => user.id === req.user.id);

    if (userIndex !== -1) {
      users[userIndex].authToken = null;
      users[userIndex].updatedAt = new Date().toISOString();
      writeUsers(users);
    }

    return res.json({
      success: true,
      message: "Logout effettuato con successo."
    });
  } catch (error) {
    console.error("Errore logout:", error);
    return res.status(500).json({
      success: false,
      message: "Errore interno durante il logout."
    });
  }
});

app.get("/api/account", requireAuth, (req, res) => {
  return res.json({
    success: true,
    account: sanitizeUser(req.user)
  });
});

app.post("/api/account/import-local-data", requireAuth, (req, res) => {
  try {
    const {
      savedRecipes = [],
      shoppingLists = [],
      weeklyMenus = []
    } = req.body || {};

    const users = readUsers();
    const userIndex = users.findIndex((user) => user.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Utente non trovato."
      });
    }

    users[userIndex].savedRecipes = mergeUniqueItems(
      users[userIndex].savedRecipes,
      savedRecipes
    );

    users[userIndex].shoppingLists = mergeUniqueItems(
      users[userIndex].shoppingLists,
      shoppingLists
    );

    users[userIndex].weeklyMenus = mergeUniqueItems(
      users[userIndex].weeklyMenus,
      weeklyMenus
    );

    users[userIndex].updatedAt = new Date().toISOString();

    writeUsers(users);

    return res.json({
      success: true,
      message: "Dati locali importati correttamente.",
      user: sanitizeUser(users[userIndex])
    });
  } catch (error) {
    console.error("Errore import local data:", error);
    return res.status(500).json({
      success: false,
      message: "Errore interno durante l'importazione dei dati."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Auth server CucinAI attivo su http://localhost:${PORT}`);
});