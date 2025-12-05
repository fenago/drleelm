import { handleSmartNotes } from "../../services/smartnotes";
import { emitToAll } from "../../utils/chat/ws";
import { withTimeout } from "../../utils/quiz/promise";
import { createJob, setJobRunning, setJobDone, setJobError, getJob } from "../../utils/jobs/status";
import { config } from "../../config/env";
import crypto from "crypto";
import path from "path";

const ns = new Map<string, Set<any>>();
const nlog = (...a: any) => console.log("[smartnotes]", ...a);

export function smartnotesRoutes(app: any) {
  app.ws("/ws/smartnotes", (ws: any, req: any) => {
    const u = new URL(req.url, "http://localhost");
    const id = u.searchParams.get("noteId");
    if (!id) return ws.close(1008, "noteId required");

    let s = ns.get(id);
    if (!s) {
      s = new Set();
      ns.set(id, s);
    }
    s.add(ws);

    nlog("ws open", id, "clients:", s.size);
    ws.send(JSON.stringify({ type: "ready", noteId: id }));

    ws.on("error", (e: any) => nlog("ws err", id, e?.message || e));
    ws.on("close", () => {
      s!.delete(ws);
      if (s!.size === 0) ns.delete(id);
      nlog("ws close", id, "left:", s!.size);
    });

    const iv = setInterval(() => {
      try {
        if (ws.readyState === 1)
          ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
      } catch {}
    }, 15000);
    ws.on("close", () => clearInterval(iv));
  });

  app.post("/smartnotes", async (req: any, res: any) => {
    try {
      const { topic, notes, filePath } = req.body || {};
      if (!topic && !notes && !filePath) {
        return res
          .status(400)
          .send({ ok: false, error: "Provide topic, notes, or filePath" });
      }

      const noteId = crypto.randomUUID();
      nlog("start", noteId, "input:", { topic, notes, filePath });

      res
        .status(202)
        .send({ ok: true, noteId, stream: `/ws/smartnotes?noteId=${noteId}` });

      createJob(noteId);
      setImmediate(async () => {
        try {
          setJobRunning(noteId);
          emitToAll(ns.get(noteId), { type: "phase", value: "generating" });
          const result = await withTimeout(
            handleSmartNotes({ topic, notes, filePath }),
            120000,
            "handleSmartNotes"
          );
          const fileUrl = `${config.url}/storage/smartnotes/${path.basename(result.file)}`;
          nlog("generated", noteId, result.file);
          setJobDone(noteId, { file: fileUrl });
          emitToAll(ns.get(noteId), {
            type: "file",
            file: fileUrl,
          });
          emitToAll(ns.get(noteId), { type: "done" });
          nlog("done", noteId);
        } catch (e: any) {
          const errMsg = e?.message || "failed";
          nlog("error", noteId, errMsg);
          setJobError(noteId, errMsg);
          emitToAll(ns.get(noteId), {
            type: "error",
            error: errMsg,
          });
        }
      });
    } catch (e: any) {
      nlog("500 route err", e?.message || e);
      res.status(500).send({ ok: false, error: e?.message || "internal" });
    }
  });

  app.get("/smartnotes/:id/status", (req: any, res: any) => {
    const id = req.params.id;
    const job = getJob(id);
    if (!job) {
      return res.status(404).send({ ok: false, error: "not found" });
    }
    res.send({
      ok: true,
      noteId: id,
      status: job.status,
      result: job.status === "done" ? job.result : undefined,
      error: job.status === "error" ? job.error : undefined
    });
  });
}
