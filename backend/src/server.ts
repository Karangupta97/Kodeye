import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { connectDB } from "./db/supabase";
import githubRoutes from "./routes/github";
import apiRoutes from "./routes/api";

const app = express();
const PORT = env.port;

app.use(
	cors({
		origin: env.frontendUrl,
		credentials: true,
	})
);

app.use("/api/github/webhook", express.raw({ type: "application/json" }));

app.get("/", (_req: Request, res: Response) => {
	res.json({ message: "Kodeye backend running" });
});

app.get("/health", (_req: Request, res: Response) => {
	try {
		connectDB();
		res.json({ status: "ok", db: "connected" });
	} catch (_error) {
		res.status(500).json({ status: "error", db: "disconnected" });
	}
});

app.use("/api/github", githubRoutes);
app.use(express.json({ limit: "2mb" }));
app.use("/api", apiRoutes);

app.use(
	(err: Error, _req: Request, res: Response, _next: NextFunction) => {
		logger.error("Unhandled server error", { error: err.message });
		res.status(500).json({ error: "Internal server error" });
	}
);

try {
	connectDB();
	logger.info("Supabase connected");
} catch (error) {
	logger.error("Failed to connect Supabase", { error });
}

app.listen(PORT, () => {
	logger.info(`Server running on http://localhost:${PORT}`);
});
