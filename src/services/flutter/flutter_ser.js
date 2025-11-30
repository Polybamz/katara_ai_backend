import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import simpleGit from "simple-git";
import { Octokit } from "@octokit/rest";

const FLUTTER_CMD = process.env.FLUTTER_BIN || "flutter";
const ANDROID_HOME = process.env.ANDROID_HOME || "/usr/lib/android-sdk";
const WORKSPACE = process.env.WORKSPACE || "/workspace";

function makeEnvForSdk() {
  const env = { ...process.env };
  env.PATH = [
    path.dirname(process.env.FLUTTER_BIN || "/usr/local/flutter/bin"),
    `${ANDROID_HOME}/platform-tools`,
    `${ANDROID_HOME}/cmdline-tools/bin`,
    env.PATH || ""
  ].join(":");
  env.ANDROID_HOME = ANDROID_HOME;
  return env;
}

function runCmd(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: opts.cwd || WORKSPACE,
      env: makeEnvForSdk(),
      shell: false
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      if (opts.stream) opts.stream.write(s);
    });

    proc.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      if (opts.stream) opts.stream.write(s);
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

export class FlutterManager {
  constructor(workspace = WORKSPACE, githubToken) {
    this.workspace = workspace;
    this.github = new Octokit({ auth: githubToken });
  }

  async createApp(appName, parentPath = this.workspace, githubOpts = null) {
    if (!appName) throw new Error("appName required");

    const targetPath = path.join(parentPath, appName);
    if (fs.existsSync(targetPath)) throw new Error("target exists");

    // 1️⃣ Create the Flutter app
    const result = await runCmd(FLUTTER_CMD, ["create", appName], { cwd: parentPath });

    // 2️⃣ If GitHub options are provided, push to GitHub
    if (githubOpts) {
      const { owner, repoName, privateRepo = false } = githubOpts;

      // Create repo via GitHub API
      await this.github.repos.createForAuthenticatedUser({
        name: repoName || appName,
        private: privateRepo
      });

      // Initialize Git and push
      const git = simpleGit(targetPath);
      await git.init();
      await git.add(".");
      await git.commit("Initial Flutter app commit");
      await git.addRemote("origin", `https://github.com/${owner}/${repoName || appName}.git`);
      await git.push("origin", "master");
    }

    return result;
  }

  async pubGet(projectPath) {
    if (!projectPath) throw new Error("projectPath required");
    return await runCmd(FLUTTER_CMD, ["pub", "get"], { cwd: projectPath });
  }

  async build(projectPath, target = "apk") {
    if (!projectPath) throw new Error("projectPath required");

    const args = target === "appbundle" ? ["build", "appbundle"] : ["build", "apk"];
    return await runCmd(FLUTTER_CMD, args, { cwd: projectPath });
  }

  async run(projectPath, deviceId, mode = "debug", stream) {
    if (!projectPath) throw new Error("projectPath required");

    const args = ["run", `--${mode}`];
    if (deviceId) args.push("-d", deviceId);

    return await runCmd(FLUTTER_CMD, args, { cwd: projectPath, stream });
  }

  async adb(args = []) {
    if (!Array.isArray(args)) throw new Error("args must be array");
    return await runCmd("adb", args, {});
  }
}
 