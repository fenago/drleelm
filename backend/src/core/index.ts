import cors from 'cors';
import server from '../utils/server/server'
import { registerRoutes } from './router'
import { loggerMiddleware } from './middleware'
// Import config to ensure env vars are loaded (handles both dev and production)
import { config } from '../config/env'

const app = server()

app.use(loggerMiddleware)
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.options('*', cors());
app.use(app.serverStatic("/storage", "./storage"))

registerRoutes(app)

// Health check endpoint for Docker/DO App Platform
app.get("/health", (_: any, res: any) => {
  res.send({ status: "ok", timestamp: new Date().toISOString() })
})

app.listen(config.port, () => {
  console.log(`[DrLeeLM] running on ${config.baseUrl}`)
})