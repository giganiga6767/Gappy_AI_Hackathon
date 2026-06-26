import express from "express";
import cors from "cors";
import studentRoutes from "./routes/student.routes";
import enterpriseRoutes from "./routes/enterprise.routes";
import agentRoutes from "./routes/agent.routes";
import digestRoutes from "./routes/digest.routes";
import { errorHandler } from "./middleware/errorHandler";

export function startServer(port: number): Promise<void> {
  const app = express();

  app.use(express.json());

  app.use(
    cors({
      origin: ["http://localhost:3000", "http://localhost:19211"],
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Dual-Persona Work & Study API Runtime",
    });
  });

  app.use("/api/student", studentRoutes);
  app.use("/api/enterprise", enterpriseRoutes);
  app.use("/api/agent", agentRoutes);
  app.use("/api/digest", digestRoutes);

  app.use(errorHandler);

  return new Promise((resolve, reject) => {
    try {
      app.listen(port, () => {
        console.log(`[Express API Server] Running cleanly on http://localhost:${port}`);
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}
