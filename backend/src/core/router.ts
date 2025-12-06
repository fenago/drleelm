import { chatRoutes } from "./routes/chat";
import { quizRoutes } from "./routes/quiz";
import { flashcardRoutes } from "./routes/flashcards";
import { smartnotesRoutes } from "./routes/notes";
import { podcastRoutes } from "./routes/podcast";
import { examRoutes } from "./routes/examlab";
import { transcriberRoutes } from "./routes/transcriber";
import { plannerRoutes } from "./routes/planner";
import { debateRoutes } from "./routes/debate";
import { companionRoutes } from "./routes/companion";
import { settingsRoutes } from "./routes/settings";
import { modelsRoutes } from "./routes/models";

export function registerRoutes(app: any) {
  // Health check endpoint - simple ping to verify backend is running
  app.get("/health", (_req: any, res: any) => {
    res.send({ ok: true, status: "up", timestamp: Date.now() });
  });

  chatRoutes(app);
  quizRoutes(app);
  examRoutes(app);
  podcastRoutes(app);
  flashcardRoutes(app);
  smartnotesRoutes(app);
  transcriberRoutes(app);
  plannerRoutes(app);
  debateRoutes(app);
  companionRoutes(app);
  settingsRoutes(app);
  modelsRoutes(app);
}
