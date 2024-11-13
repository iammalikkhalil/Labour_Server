import express from "express";
import cors from "cors";

import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.js";
import profileRoute from "./routes/profileRoutes.js";
import serviceRoute from "./routes/serviceRoute.js";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory path for the current module (for ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Define routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoute);

// Routes
app.use("/api/service", serviceRoute);

// Serve static files from the "uploads" directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Custom error handler (placed after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
