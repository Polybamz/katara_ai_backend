import { WebSocketServer, WebSocket } from "ws";
import { createStreamChat } from "../services/ai-models-serice/gemini-ser.js";
import path from "path";
import fs from "fs";

const validateWorkingDir = (workingDirectory) => {
  console.log('workingDirectory',workingDirectory)
  if (typeof workingDirectory !== "string" || !workingDirectory.trim()) {
        console.log('invalid workingDirectory 1')
    throw new Error("invalid workingDirectory");
  }

  if (workingDirectory.includes("\0")) {
        console.log('invalid workingDirectory 2')
    throw new Error("invalid workingDirectory");
  }

   const projectRoot = path.resolve(process.cwd());
   const resolved = path.resolve(projectRoot, workingDirectory);
  // const relative = path.relative(projectRoot, resolved);

  // if (relative.startsWith("..")) {
  //       console.log('invalid workingDirectory 3',workingDirectory, resolved, relative)
  //   throw new Error("invalid workingDirectory");
  // }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        console.log('invalid workingDirectory 4')
    throw new Error("invalid workingDirectory");
  }

  return resolved;
};

export default function attachGeminiWebsocket(server) {
  // Prevent multiple instances
  if (server._geminiWss) {
    return server._geminiWss;
  }

  const wss = new WebSocketServer({
    server,
    path: "/ws/gemini",
  });

  server._geminiWss = wss;

  function safeSend(ws, obj) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  wss.on("connection", (ws) => {
    console.log("Client connected. Active:", wss.clients.size);
    ws.isBusy = false
    ws.abortController = null;
      

    safeSend(ws, { type: "welcome", message: "..." });
    ws.on("message", async (raw) => {
      if (ws.isBusy) {
        return safeSend(ws, {
          type: "error",
          message: "another chat running on this connection",
        });
      }

      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return safeSend(ws, { type: "error", message: "invalid JSON" });
      }

      if (msg?.type !== "chat" || !msg.prompt) {
        return safeSend(ws, {
          type: "error",
          message: "send { type: 'chat', prompt }",
        });
      }

      try {
        if (msg.workingDirectory) {
          validateWorkingDir(msg.workingDirectory);
        }
      } catch (err) {
        return safeSend(ws, { type: "error", message: err.message });
      }

      ws.isBusy = true;
      ws.abortController = new AbortController();

      const onEvent = (event) =>
        safeSend(ws, { type: "event", event });

      const onError = (err) =>
        safeSend(ws, { type: "error", message: err?.message });

      const onData = (data) =>
        safeSend(ws, { type: "data", data });

      const onResult = (result) =>
        safeSend(ws, { type: "result", result });

      const onProgress = (progress) =>
        safeSend(ws, { type: "progress", progress });
    console.log(msg.prompt)
      try {
        const final = await createStreamChat(
          msg.prompt,
          !!msg.verboseFlag,
          msg.workingDirectory,
          onEvent,
          onError,
          () => {},
          onData,
          onResult,
          onProgress,
          ws.abortController.signal
        );

        safeSend(ws, { type: "final", text: final ?? null });
      } catch (err) {
        onError(err);
      } finally {
        ws.isBusy = false;
      }
    });
    // console.log(';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;')
    // console.log(ws)
    ws.on('error', (er)=> {
      console.log('%%%%%%%%%%%%%%%%%%%%%%%%',er)
      safeSend({type: 'error', message: er})
    } )
    console.log("Client connected. Active:", wss.clients.size);
    ws.on("close", () => {
      // wss.clients.forEach(client => console.log("Client disconnected. Active:", client));
       safeSend({type: 'error', message:'Closed'})
      if (ws.abortController) {
        ws.abortController.abort();
      }
    });
  });

  return wss;
}