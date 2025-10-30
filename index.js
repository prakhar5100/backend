const express = require("express");
const cors = require("cors");

const app = express();

// ✅ Allow any frontend to access this backend (open CORS)
app.use(
  cors({
    origin: "*", // <-- allows requests from any domain
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware to parse JSON requests
app.use(express.json());

// Optional logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- In-memory "database" ---
const users = []; // Each user: { id, name, email, password }

// --- Helper function to create dummy tokens ---
const makeToken = (email) =>
  Buffer.from(`${email}:${Date.now()}`).toString("base64");

// --- Routes ---

// Health check
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

// Signup
app.post("/api/signup", (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password required" });
  }

  const exists = users.find((u) => u.email === email.toLowerCase());
  if (exists) return res.status(409).json({ error: "User already exists" });

  const user = {
    id: users.length + 1,
    name,
    email: email.toLowerCase(),
    password,
  };

  users.push(user);

  const token = makeToken(user.email);
  res.status(201).json({
    message: "User created",
    user: { id: user.id, name: user.name, email: user.email },
    token,
  });
});


// Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = users.find(
    (u) => u.email === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = makeToken(user.email);
  res.json({
    message: "Logged in",
    user: { id: user.id, name: user.name, email: user.email },
    token,
  });
});

// Protected home route
app.get("/api/home", (req, res) => {
  const auth = req.headers["authorization"] || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = auth.split(" ")[1];
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const email = decoded.split(":")[0];
    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    res.json({
      message: `Welcome back, ${user.name}!`,
      user: { name: user.name, email: user.email },
    });
  } catch {
    res.status(401).json({ error: "Invalid token format" });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
});
