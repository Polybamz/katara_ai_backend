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

  // ─────────────────────────────────────────────
  // 1. CREATE PROJECT FROM TEMPLATE
  // ─────────────────────────────────────────────
//   static async createAppFromTemplate(type, appName) {

//     if (!TEMPLATES[type]) {
//       throw new Error(`Unsupported template type: ${type}`);
//     }

//     const template = TEMPLATES[type];
//     const projectId = `${appName}-${Date.now()}`;

//     const target = path.join(WORKSPACE, projectId);
//  console.log("Cloning template:", template, "to", target)
//     try {
//       // 1. Clone template
//       await simpleGit().clone(template, target, ["--branch", 'main']);

//       // 2. Remove template git history
//       const gitDir = path.join(target, ".git");
//       if (fs.existsSync(gitDir)) {
//         fs.rmSync(gitDir, { recursive: true, force: true });
//       }

//       // 3. Fresh git
//       const git = simpleGit(target);
//       await git.init();

//       // 4. Rename package / identifiers
//       await this.replaceProjectName(target, appName);

//       return {
//         projectId,
//         workingDir: target,
//       };

//     } catch (e) {
//       console.error("Template creation failed:", e);
//       throw e;
//     }
//   }
static async createAppFromTemplate(type, appName) {

  if (!TEMPLATES[type]) {
    throw new Error(`Unsupported template type: ${type}`);
  }

  const template = TEMPLATES[type];
  const projectId = `${appName}-${Date.now()}`;
  const target = path.join(WORKSPACE, projectId);
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
    }).clone(authedTemplate, target, ["--branch", "main"]);
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
    return {
      projectId,
      workingDir: target,
    };

  } catch (e) {
    throw e;
  }
}
// get file content from working en by file path
static async getFileContent(filePath) {
  try {
    const fullPath = path.join( filePath);
    const content = fs.readFileSync(fullPath, "utf-8");
    return content;
  } catch (e) {
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
        .replace(/com.example.template/g, `com.katara.${name}`);

      fs.writeFileSync(file, updated);
    }
  }

  // ─────────────────────────────────────────────
  // 3. PUBLISH TO GITHUB
  // ─────────────────────────────────────────────
  static async publishToGithub(projectId, repoUrl, token = GITHUB_TOKEN) {

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
}

export default GithubService;
