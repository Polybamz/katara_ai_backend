// // ...existing code...
// import {WebSocket, WebSocketServer} from "ws";
// import { createStreamChat } from "../services/ai-models-serice/gemini-ser.js";
// // import { validateWorkingDir } from "../services/github/filing_helper.js"; // optional helper to validate paths
// import path from "path";
// import fs from "fs";


// const validateWorkingDir = (workingDirectory) => {
//   if (typeof workingDirectory !== "string" || !workingDirectory.trim()) {
//     throw new Error("invalid workingDirectory: must be a non-empty string");
//   }

//   // prevent null bytes
//   if (workingDirectory.includes("\0")) {
//     throw new Error("invalid workingDirectory");
//   }

//   const projectRoot = path.resolve(process.cwd());
//   const resolved = path.resolve(projectRoot, workingDirectory);
//   const relative = path.relative(projectRoot, resolved);

//   // if relative starts with '..' the resolved path is outside projectRoot
//   if (relative === "" || (!relative.startsWith(".."+path.sep) && !relative.startsWith(".."))) {
//     // optional: ensure target exists and is a directory
//     if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
//       throw new Error("invalid workingDirectory: path does not exist or is not a directory");
//     }
//     return resolved;
//   }

//   throw new Error("invalid workingDirectory: outside project root");
// };

// export default function attachGeminiWebsocket(server, options = {}) {
//   console.log('///////////////////////////////////////////////')
//   const basePath = options.path || "/ws/gemini";
//   console.log('GGGGGGGGGGGGGGGGGGGGGGGGGG',basePath)
//   const wss = new WebSocketServer({ server, path: basePath });
//   console.log('HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',wss)
//   function safeSend(ws, obj) {
//     if (ws.readyState === WebSocket.OPEN) {
//       try { ws.send(JSON.stringify(obj)); } catch (e) { /* ignore */ }
//     }
//   }

//   wss.on("connection", (ws, req) => {
//     ws.isBusy = false;
//     safeSend(ws, { type: "welcome", message: "connected to gemini" });

//     ws.on("message", async (raw) => {
//       if (ws.isBusy) {
//         return safeSend(ws, { type: "error", message: "another chat running on this connection" });
//       }

//       let msg;
//       try { msg = JSON.parse(String(raw)); } catch (e) {
//         return safeSend(ws, { type: "error", message: "invalid JSON" });
//       }

//       if (msg?.type !== "chat" || !msg.prompt) {
//         return safeSend(ws, { type: "error", message: "send { type: 'chat', prompt, verboseFlag?, workingDirectory? }" });
//       }

//       // optional: validate workingDirectory to prevent escapes
//       try {
//         if (msg.workingDirectory) validateWorkingDir(msg.workingDirectory);
//       } catch (e) {
//         return safeSend(ws, { type: "error", message: "invalid workingDirectory" });
//       }

//       ws.isBusy = true;

//       const onEvent = (event) => safeSend(ws, { type: "event", event });
//       const onError = (err) => safeSend(ws, { type: "error", message: err?.message || String(err) });
//       const onEnd = () => safeSend(ws, { type: "end" });
//       const onData = (data) => safeSend(ws, { type: "data", data });
//       const onResult = (result) => safeSend(ws, { type: "result", result });
//       const onProgress = (progress) => safeSend(ws, { type: "progress", progress });
//          console.log('metadata: ',msg.prompt,
//           !!msg.verboseFlag,
//           msg.workingDirectory)
//       try {
//         const final = await createStreamChat(
//           msg.prompt,
//           !!msg.verboseFlag,
//           msg.workingDirectory,
//           onEvent,
//           onError,
//           onEnd,
//           onData,
//           onResult,
//           onProgress
//         );
//         safeSend(ws, { type: "final", text: final ?? null });
//       } catch (err) {
//         onError(err);
//       } finally {
//         ws.isBusy = false;
//         onEnd();
//       }
//     });

//     ws.on("close", () => { /* cleanup if needed */ });
//   });

//   return wss;
// }

import { WebSocketServer, WebSocket } from "ws";
import { createStreamChat } from "../services/ai-models-serice/gemini-ser.js";
import path from "path";
import fs from "fs";
// import { type } from "os";

const validateWorkingDir = (workingDirectory) => {
  if (typeof workingDirectory !== "string" || !workingDirectory.trim()) {
    throw new Error("invalid workingDirectory");
  }

  if (workingDirectory.includes("\0")) {
    throw new Error("invalid workingDirectory");
  }

  const projectRoot = path.resolve(process.cwd());
  const resolved = path.resolve(projectRoot, workingDirectory);
  const relative = path.relative(projectRoot, resolved);

  if (relative.startsWith("..")) {
    throw new Error("invalid workingDirectory");
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
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

    safeSend(ws, { type: "welcome", message: "...." });
    console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@')
    ws.on("message", async (raw) => {
      console.log('///////////////////////////////////', raw)
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
    console.log(';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;')
    // console.log(ws)
    ws.on('error', (er)=> {
      console.log('%%%%%%%%%%%%%%%%%%%%%%%%',er)
      safeSend({type: 'error', message: er})
    } )

    ws.on("close", () => {
       wss.clients.forEach(client => console.log("Client disconnected. Active:", client));

      if (ws.abortController) {
        ws.abortController.abort();
      }
    });
  });

  return wss;
}