import express from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import GitSync from "../../services/github/git_watcher.js";

const router = express.Router();
const WORKSPACE = process.env.WORKSPACE || "/workspaces";
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

function verifySignature(req) {
  if (!WEBHOOK_SECRET) return true;
  const sig = req.get("x-hub-signature-256") || "";
  const body = JSON.stringify(req.body);
  const hmac = "sha256=" + crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(sig));
}

router.post("/webhook", express.json(), async (req, res) => {
  try {
    if (!verifySignature(req)) return res.status(401).send("invalid signature");
    const event = req.get("x-github-event");
    if (event !== "push") return res.status(200).send("ignored");

    const repoName = req.body?.repository?.name;
    if (!repoName) return res.status(400).send("no repo");

    const projectPath = path.join(WORKSPACE, repoName);
    if (!fs.existsSync(projectPath)) return res.status(404).send("project not found");

    // trigger pull
    await GitSync.pullRemote(repoName, projectPath);
    res.status(200).send("pulled");
  } catch (e) {
    console.error("webhook error:", e);
    res.status(500).send("error");
  }
});

export default router;