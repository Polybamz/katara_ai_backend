import simpleGit from "simple-git";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const TEMPLATES = {
  flutter: "https://github.com/katara-template/flutter-clean-bloc.git",
  react_native: "https://github.com/katara-template/rn-redux.git",
  next: "https://github.com/katara-template/next-ts.git",
};

const WORKSPACE = process.env.WORKSPACE || "/workspaces";
const token = process.env.GITHUB_TOKEN;

class GithubService {

  // generate 18 character id
  static generateId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 30; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  // ─────────────────────────────────────────────
  // 1. CREATE PROJECT FROM TEMPLATE
  // ─────────────────────────────────────────────


// ...existing code...
static async createAppFromTemplate(type, appName) {

  if (!TEMPLATES[type]) {
    throw new Error(`Unsupported template type: ${type}`);
  }
  const id = this.generateId();
  const template = TEMPLATES[type];
  const projectId = `${id}`;
  const target = path.join(WORKSPACE, projectId, appName);
  console.log(target, WORKSPACE, process.env.WORKSPACE )
  try {
    
    console.log("Using token:", token ? "Yes" : "No");
    const authedTemplate = token
      ? template.replace("https://", `https://${token}@`)
      : template;
    // 1. Clone template
    await simpleGit({
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0"
      }
    }).clone(authedTemplate, target, ["--branch", "main", "--depth", "1"]);
    // 2. Remove template git history
    const gitDir = path.join(target, ".git");
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }
    // 3. Fresh git
    const git = simpleGit(target);
    await git.init();
    // 4. Rename package / identifiers
    await this.replaceProjectName(target, appName);

    // Commit initial project contents on main
    console.log("Committing initial project...");
    await git.addConfig("user.name", process.env.GIT_USER_NAME || "katara-bot");
    await git.addConfig("user.email", process.env.GIT_USER_EMAIL || "katara@local");
    await git.add(".");
    try { await git.checkoutLocalBranch("main"); } catch (_) {}
    await git.commit("Initial commit from Katara template");

    // If token provided, create a new GitHub repo and push the code to it
    let repoInfo = null;
    if (token) {
      console.log("Creating GitHub repo and pushing code...");
      try {
        // create GitHub repo
        repoInfo = await this.createGithubRepo(projectId, token);
         console.log("Repo created:", repoInfo.html_url);
        // prepare authed remote url for push
        const remoteUrl = repoInfo.clone_url; // https://github.com/owner/repo.git
        const authedRemote = remoteUrl.replace("https://", `https://${token}@`);

        // ensure no existing origin, then add remote and push
        try { await git.removeRemote("origin"); } catch (_) {
          console.log("No existing remote to remove, proceeding...");
        }
        await git.addRemote("origin", authedRemote);
        try { await git.branch(["-M", "main"]); } catch (_) {
          console.log("Branch rename failed (maybe already main), proceeding...");
        }
        await git.push(["-u", "origin", "main"]);
        console.log("Code pushed to GitHub repo.");
      } catch (e) {
        console.error("Failed to create or push to GitHub repo:", e);
        repoInfo = null;
      }
    }

    return {
      projectId,
      appName,
      workingDir: target,
      repo: repoInfo ? { html_url: repoInfo.html_url, clone_url: repoInfo.clone_url } : null,
    };

  } catch (e) {
    console.log(e)
    throw e;
  }
}
// ...existing code...
// get file content from working en by file path
static async getFileContent(filePath) {
  try {
    const fullPath = path.join( filePath);
    const content = fs.readFileSync(fullPath, "utf-8");
    return content;
  } catch (e) {
    console.log('error bbbbbbbbbbbbbbbbbbbbbb', e)
    throw e
  }
}

  // ─────────────────────────────────────────────
  // 2. REPLACE TEMPLATE IDENTIFIERS
  // ─────────────────────────────────────────────
  static async replaceProjectName(dir, name) {

    const files = this.getAllFiles(dir);

    for (const file of files) {
      if (file.includes("node_modules") || file.includes(".git")) continue;

      let content = fs.readFileSync(file, "utf-8");

      const updated = content
        .replace(/template_app/g, name)
        .replace(/com.example.flutter-template/g, `com.kataraBuild.${name}`);

      fs.writeFileSync(file, updated);
    }
  }

  // ─────────────────────────────────────────────
  // 3. PUBLISH TO GITHUB
  // ─────────────────────────────────────────────
  static async publishToGithub(projectId, repoUrl) {

    const projectPath = path.join(WORKSPACE, projectId);

    try {
      const git = simpleGit(projectPath);

      // Remove any old git
      const gitDir = path.join(projectPath, ".git");
      if (fs.existsSync(gitDir)) {
        fs.rmSync(gitDir, { recursive: true, force: true });
      }

      await git.init();

      await git.add(".");
      await git.commit("Initial commit from Katara template");

      const authedUrl = repoUrl.replace(
        "https://",
        `https://${token}@`
      );

      await git.addRemote("origin", authedUrl);

      await git.push(["-u", "origin", "main"]);

      return { success: true };

    } catch (e) {
      console.error("Publish failed:", e);
      throw e;
    }
  }

  // ─────────────────────────────────────────────
  // 4. CREATE GITHUB REPO (FIXED ENDPOINT)
  // ─────────────────────────────────────────────
  static async createGithubRepo(name, token) {

    const res = await fetch(
      "https://api.github.com/user/repos",
      {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          name,
          private: true,
          auto_init: false,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    return res.json();
  }

  // ─────────────────────────────────────────────
  // 5. UTIL: GET ALL FILES
  // ─────────────────────────────────────────────
  static getAllFiles(dir, files = []) {

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const full = path.join(dir, item);

      if (fs.statSync(full).isDirectory()) {
        this.getAllFiles(full, files);
      } else {
        files.push(full);
      }
    }

    return files;
  }

  // ─────────────────────────────────────────────
  // 6. TRANSFER REPO (FUTURE)
  // ─────────────────────────────────────────────
  static async transferRepo(owner, repo, newOwner, token) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/transfer`,
        {
          method: "POST",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({
            new_owner: newOwner,
        }
      )});

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

        return res.json();
    } catch (e) {
      console.error("Transfer failed:", e);
      throw e;
        }
    
  }

  // pull from github to local (future)
  static async pullFromGithub( repoUrl, projectPath) {
    try {
      const git = simpleGit(projectPath);
      await git.pull(repoUrl, "main");
      return { success: true };
    } catch (e) {
      console.error("Pull failed:", e);
      throw e;
    }
  }
  // clode and sa
  static async cloneToPath(repoUrl, workingDir){
    try{
      const target = workingDir.split("/")[0]+'/'+workingDir.split("/")[1]
      const authedTemplate = token
      ? repoUrl.replace("https://", `https://${token}@`)
      : repoUrl;
      // 1. Clone template
    await simpleGit({
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0"
      }
    }).clone(authedTemplate, target, ["--branch", "main", "--depth", "1"]);
    }catch(er){}
  }
}

export default GithubService;
