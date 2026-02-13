import chokidar from "chokidar";
import simpleGit from "simple-git";
import fs from "fs";

const WORKSPACE = process.env.WORKSPACE || "/workspaces";

class GitSync {
  constructor() {
    this.watchers = new Map(); // projectId -> { watcher, timer, isSyncing }
    this.debounceMs = Number(process.env.GIT_SYNC_DEBOUNCE_MS || 2000);
    this.gitUser = {
      name: process.env.GIT_USER_NAME || "katara-bot",
      email: process.env.GIT_USER_EMAIL || "katara@local",
    };
  }

  startWatch(projectId, projectPath) {
    if (!fs.existsSync(projectPath)) throw new Error("projectPath not found: " + projectPath);
    if (this.watchers.has(projectId)) return;

    const git = simpleGit(projectPath);
    const state = { watcher: null, timer: null, isSyncing: false };

    const watcher = chokidar.watch(projectPath, {
      ignored: /(^|[\\/])\.(git|idea|vscode)|node_modules|dist|build/,
      persistent: true,
      ignoreInitial: true,
      depth: 6,
    });

    const schedule = () => {
      if (state.isSyncing) return;
      if (state.timer) clearTimeout(state.timer);
      state.timer = setTimeout(async () => {
        await this._commitAndPush(projectId, projectPath, git, state);
      }, this.debounceMs);
    };

    watcher.on("add", schedule).on("change", schedule).on("unlink", schedule).on("addDir", schedule).on("unlinkDir", schedule);

    state.watcher = watcher;
    this.watchers.set(projectId, state);
  }

  stopWatch(projectId) {
    const state = this.watchers.get(projectId);
    if (!state) return;
    if (state.timer) clearTimeout(state.timer);
    state.watcher.close();
    this.watchers.delete(projectId);
  }

  async _commitAndPush(projectId, projectPath, git, state) {
    state.isSyncing = true;
    try {
      await git.addConfig("user.name", this.gitUser.name);
      await git.addConfig("user.email", this.gitUser.email);
      await git.add(".");
      const status = await git.status();
      const hasChanges = (status.files && status.files.length > 0) || !status.isClean?.();
      if (!hasChanges) return;
      const message = `Auto-sync: local changes (${new Date().toISOString()})`;
      await git.commit(message);
      // push (use token-auth remote or ensure origin configured)
      await git.push("origin", "main", {"-u": null});
      // optionally emit an event/log
      console.log(`[GitSync] pushed ${projectId}`);
    } catch (e) {
      console.error(`[GitSync] commit/push failed for ${projectId}:`, e.message || e);
    } finally {
      state.isSyncing = false;
    }
  }

  // Called by webhook route when remote changed
  async pullRemote(projectId, projectPath) {
    const state = this.watchers.get(projectId);
    if (state) {
      // pause watcher while pulling to avoid loop
      state.isSyncing = true;
      try {
        const git = simpleGit(projectPath);
        await git.fetch();
        // try rebase first, fallback to merge
        try {
          await git.pull("origin", "main", { "--rebase": "true" });
        } catch (_) {
          await git.pull("origin", "main");
        }
      } finally {
        state.isSyncing = false;
      }
    } else {
      // no watcher: do a one-off pull
      try {
        const git = simpleGit(projectPath);
        await git.pull("origin", "main");
      } catch (e) {
        console.error("[GitSync] pull failed (no watcher):", e.message || e);
        throw e;
      }
    }
  }
  // git push origin main -u
  async pushRemote(  projectPath, repoUrl, token, projectId) {
    const watcherState = this.watchers.get(projectId);
    if (watcherState) {
      // pause watcher while pushing to avoid loop
      watcherState.isSyncing = true;
      try {
        const git = simpleGit(projectPath);
        await git.addConfig("credential.https://github.com.username", "katara-bot");
        await git.addConfig("credential.https://github.com.password", token);
        await git.addConfig("user.name", "katara-bot");
        await git.addConfig("user.email", "katara@local");
        await git.add(".");
        const status = await git.status();
        const hasChanges = (status.files && status.files.length > 0) || !status.isClean?.();
        if (!hasChanges) return;
        const message = `Auto-sync: local changes (${new Date().toISOString()})`;
        await git.commit(message);
        // add token-auth remote and push
        const authedRemote = repoUrl.replace("https://", `https://${token}@`);
        await git.remote(["add", "origin", authedRemote]);
        await git.push("origin", "main", {"-u": null});
        // optionally emit an event/log
        console.log(`[GitSync] pushed ${projectId}`);
      } catch (e) {
        console.error(`[GitSync] push failed for ${projectId}:`, e.message || e);
        throw e;
      } finally {
        watcherState.isSyncing = false;
        }
    } else {
        // no watcher: do a one-off push
        try {
            const git = simpleGit(projectPath);
            await git.addConfig("credential.https://github.com.username", "katara-bot");
            await git.addConfig("credential.https://github.com.password", token);
            await git.addConfig("user.name", "katara-bot");
            await git.addConfig("user.email", "katara@local");
            await git.add(".");
            const status = await git.status();
            const hasChanges = (status.files && status.files.length > 0) || !status.isClean?.();
            if (!hasChanges) return;
            const message = `Auto-sync: local changes (${new Date().toISOString()})`;
            await git.commit(message);
            // add token-auth remote and push
            const authedRemote = repoUrl.replace("https://", `https://${token}@`);
            await git.remote(["add", "origin", authedRemote]);
            await git.push("origin", "main", {"-u": null});
            // optionally emit an event/log
            console.log(`[GitSync] pushed ${projectId}`);
        } catch (e) {
            console.error(`[GitSync] push failed for ${projectId}:`, e.message || e);
            throw e;
        } finally {
            watcherState.isSyncing = false;
        }
    }
    
};}

export default new GitSync();