// src/routes/github.js
import express from "express";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs";

const router = express.Router();

const WORKSPACE = "/workspace"; // inside Docker

router.post("/clone-repo", async (req, res) => {
  const { repoUrl, projectName, branch } = req.body;

  if (!repoUrl || !projectName)
    return res.status(400).json({ error: "repoUrl and projectName required" });

  const projectPath = path.join(WORKSPACE, projectName);

  try {
    // Delete old folder if exists
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }

    const git = simpleGit();

    await git.clone(repoUrl, projectPath, branch ? ["--branch", branch] : []);

    // Read repo as file tree
    const readDirRecursive = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      let result = {};

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          result[entry.name] = readDirRecursive(fullPath);
        } else {
          result[entry.name] = fs.readFileSync(fullPath, "utf8");
        }
      }

      return result;
    };

    const fileTree = readDirRecursive(projectPath);

    return res.json({
      success: true,
      message: "Repository cloned successfully",
      projectName,
      files: fileTree
    });

  } catch (error) {
    console.error("Clone error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// GET /github/repo-info?user=polycarp&repo=katara

router.get("/repo-info", async (req, res) => {
  const { user, repo } = req.query;

  if (!user || !repo)
    return res.status(400).json({ error: "Missing user or repo" });

  try {
    const apiUrl = `https://api.github.com/repos/${user}/${repo}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.message === "Not Found") {
      return res.status(404).json({ error: "Repo not found" });
    }

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/list-repos/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=200`
    );

    const repos = await response.json();

    res.json({ success: true, repos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post("/import-folder", async (req, res) => {
  const { githubPath, saveTo, token } = req.body;

  if (!githubPath || !saveTo)
    return res.status(400).json({ error: "githubPath and saveTo required" });

  try {
    const headers = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const response = await fetch(githubPath, { headers });
    const content = await response.json();

    if (!Array.isArray(content))
      return res.status(400).json({ error: "Invalid folder path" });

    for (let file of content) {
      if (file.type === "file") {
        const fileData = await fetch(file.download_url).then((r) => r.text());
        fs.writeFileSync(path.join(saveTo, file.name), fileData);
      }
    }

    res.json({ success: true, message: "Folder imported successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/pull", async (req, res) => {
  const { projectName } = req.body;

  const projectPath = `/workspace/${projectName}`;

  try {
    const git = simpleGit(projectPath);
    await git.pull();

    res.json({ success: true, message: "Project updated" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


/// transfer repo ownership

router.post("/transfer-repo", async (req, res) => {
  const { repoUrl, newOwner } = req.body;

  if (!repoUrl || !newOwner)
    return res.status(400).json({ error: "repoUrl and newOwner required" });

  try {
    const apiUrl = `https://api.github.com/repos/${repoUrl.split("/")[3]}/${repoUrl.split("/")[4]}`;

    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${process.env.GITHUB_TOKEN}`
      },
      body: JSON.stringify({
        new_owner: newOwner
      })
    });

    const data = await response.json();

    if (data.message === "Not Found") {
      return res.status(404).json({ error: "Repo not found" });
    }

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


export default router;
