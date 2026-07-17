import express from "express";
import cors from "cors";
import { productsRouter } from "./routes/products.js";
import { stackRouter } from "./routes/stack.js";
import { importExportRouter } from "./routes/importExport.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { notificationsRouter } from "./routes/notifications.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", productsRouter);
  app.use("/api", stackRouter);
  app.use("/api", importExportRouter);
  app.use("/api", dashboardRouter);
  app.use("/api", notificationsRouter);

  app.use(errorHandler);

  return app;
}
