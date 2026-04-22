import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import simpleGit from "simple-git";
//import { Octokit } from "@octokit/rest";
// import { FLUTTER_CMD,  WORKSPACE } from "../../config/config.js";
 const ANDROID_HOME = process.env.ANDROID_HOME || "/usr/lib/android-sdk"
 const FLUTTER_CMD = process.env.FLUTTER_BIN || "flutter"
 const WORKSPACE = process.env.WORKSPACE || "/workspaces"
 const APPETIZE_API_TOKEN = process.env.APPETIZE_API_TOKEN ||  null

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
    this.github = ''//new Octokit({ auth: githubToken });
  }
   


  static async pubGet(projectPath) {
    try {
          await runCmd(FLUTTER_CMD, ["pub", "get"], { cwd: projectPath });

    } catch(er){
      throw  er
    }
  }

  static async buildAPK(projectPath, target = "apk") {
    try {
      if (!projectPath) throw new Error("projectPath required");
      await this.pubGet(projectPath)
    const args = target === "appbundle" ? ["build", "appbundle"] : ["build", "apk"];
    const apk = await runCmd(FLUTTER_CMD, args, { cwd: projectPath });
    console.log(apk)
    const result = this.uploadAPk(projectPath)
    return result
    } catch(er){
      console.log(er)
      return 'Error: ' + er
    }
  }
  static uploadAPk = async (projectPath, publicKey = null, platform = 'andriod') => {
    try {
      const apkFilePath = path.join(projectPath,'build', 'app','outputs', 'flutter-apk','app-release.apk')
      const formData = new FormData()
      formData.append('file', fs.createReadStream(apkFilePath));
      formData.append('platform', platform)
      const header = {
        ...formData.getHeaders(),
        "Authorization": `Bareer ${APPETIZE_API_TOKEN}`
      }
      let url;
      if (publicKey) {
        url = `https://api.appetize.io/v1/apps/${publicKey}`
      } else {
        url = `https://api.appetize.io/v1/apps`

      }
      const response = await axios.put(url, formData, { header })
      const newPublicKey = response.data.publicKey;
      const appUrl = `https://appetize.io/app/${newPublicKey}`
      return {
        publicKey: newPublicKey,
        appUrl
      }

    } catch (e) {
      throw e.message

    }
  }

}
 
