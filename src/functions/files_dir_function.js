import fs from "fs";
import path from "path";

// import {  WORKSPACE } from "../config/config.js";

// const WORKSPACE_DIR = WORKSPACE || process.env.WORKING_DIRECTORY || "workspace";
import simpleGit from "simple-git";

const ANDROID_HOME =  process.env.ANDROID_HOME || "/usr/lib/android-sdk"
const FLUTTER_CMD =  process.env.FLUTTER_BIN || "flutter"
const WORKSPACE = process.env.WORKSPACE || "/workspaces"
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

// ...existing code...
class FilingClass {
  static _resolveWorkingDir(working_directory) {
    const WORKSPACE = process.env.WORKSPACE || process.cwd();
    return path.isAbsolute(working_directory)
      ? path.resolve(working_directory)
      : path.resolve(WORKSPACE, working_directory);
  }

  static _safeJoin(absWorkingDir, subPath = "") {
    // Prevent subPath from being treated as absolute and escaping the working dir
    const rel = String(subPath || "").replace(/^[\\/]+/, "");
    const joined = path.join(absWorkingDir, rel);
    const resolved = path.resolve(joined);
    if (!resolved.startsWith(absWorkingDir)) {
      throw new Error("Path is outside the working directory");
    }
    return resolved;
  }

  static get_file_info = (working_directory, directory = ".") => {
    const absWorkingDir = FilingClass._resolveWorkingDir(working_directory);
    try {
      const absDirPath = FilingClass._safeJoin(absWorkingDir, directory);
      if (!fs.existsSync(absDirPath)) return { error: "Directory does not exist" };

      const items = fs.readdirSync(absDirPath, { withFileTypes: true });
      return items.map((item) => ({
        name: item.name,
        type: item.isDirectory() ? "directory" : "file",
      }));
    } catch (e) {
      return { error: e.message };
    }
  };

  static get_file_content = (working_directory, file_path) => {
    const absWorkingDir = FilingClass._resolveWorkingDir(working_directory);
    try {
      const absFilePath = FilingClass._safeJoin(absWorkingDir, file_path);
      if (!fs.existsSync(absFilePath)) return { error: "File does not exist" };

      const content = fs.readFileSync(absFilePath, "utf8");
      return { content };
    } catch (e) {
      return { error: e.message };
    }
  };

  static write_file = (working_directory, file_path, content) => {
    const absWorkingDir = FilingClass._resolveWorkingDir(working_directory);
    try {
      const absFilePath = FilingClass._safeJoin(absWorkingDir, file_path);
      const parentDir = path.dirname(absFilePath);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(absFilePath, content, "utf8");
      return { success: true, file_path, characters_written: content.length };
    } catch (e) {
      return { error: e.message };
    }
  };

  static create_flutter_app = (working_directory, app_name) => {
    const absWorkingDir = FilingClass._resolveWorkingDir(working_directory);
    try {
      const result = spawnSync("flutter", ["create", "--project-name", app_name], {
        cwd: absWorkingDir,
        stdio: "inherit",
      });
      if (result.error) return { error: result.error.message };
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  };

  static generate_apk = (file_path) => {};
  // delete a file
  static delete_file = (working_directory, file_path) => {
    const absWorkingDir = FilingClass._resolveWorkingDir(working_directory);
    try {
      const absFilePath = FilingClass._safeJoin(absWorkingDir, file_path);
      if (!fs.existsSync(absFilePath)) return { error: "File does not exist" };
      fs.rmSync(absFilePath, { recursive: true, force: true });
      return { success: true, file_path };
    } catch (e) {
      return { error: e.message };
    }
  };
  // delete a directory
  static delete_directory = (working_directory, dir_path) => {
    const absWorkingDir = FilingClass._resolveWorkingDir(working_directory);
    try {
      const absDirPath = FilingClass._safeJoin(absWorkingDir, dir_path);
      if (!fs.existsSync(absDirPath)) return { error: "Directory does not exist" };
      fs.rmSync(absDirPath, { recursive: true, force: true });
      return { success: true, dir_path };
    } catch (e) {
      return { error: e.message };
    }}

    /// install flutter pub dependencies
    static install_flutter_dependencies = (working_directory) => {
      const absWorkingDir = FilingClass._resolveWorkingDir(working_directory);
      try {
        const result = spawnSync(FLUTTER_CMD, ["pub", "get"], {
          cwd: absWorkingDir,
          env: makeEnvForSdk(),
          stdio: "inherit",
        });
        if (result.error) return { error: result.error.message };
        return { success: true };
      } catch (e) {
        return { error: e.message };
      }
    };
}
// ...existing code...

// class FilingClass {
//   static get_file_info = (working_directory, directory) => {
//     const absWorkingDir = path.resolve(working_directory);
//     const absDirPath = path.resolve(working_directory, directory);

//     if (!absDirPath.startsWith(absWorkingDir)) {
//       return { error: "Directory is outside the working directory" };
//     }

//     if (!fs.existsSync(absDirPath)) {
//       return { error: "Directory does not exist" };
//     }

//     try {
//       const items = fs.readdirSync(absDirPath, { withFileTypes: true });

//       return items.map((item) => ({
//         name: item.name,
//         type: item.isDirectory() ? "directory" : "file",
//       }));
//     } catch (e) {
//       return { error: e.message };
//     }
//   };

//   static get_file_content = (working_directory, file_path) => {
//     const absWorkingDir = path.resolve(working_directory);
//     const absFilePath = path.resolve(working_directory, file_path);

//     if (!absFilePath.startsWith(absWorkingDir)) {
//       return { error: "File is outside the working directory" };
//     }

//     if (!fs.existsSync(absFilePath)) {
//       return { error: "File does not exist" };
//     }

//     try {
//       const content = fs.readFileSync(absFilePath, "utf8");
//       return { content };
//     } catch (e) {
//       return { error: e.message };
//     }
//   };

//   static write_file = (working_directory, file_path, content) => {
//     const absWorkingDir = path.resolve(working_directory);
//     const absFilePath = path.resolve(working_directory, file_path);

//     if (!absFilePath.startsWith(absWorkingDir)) {
//       return { error: "File path is outside the working directory" };
//     }

//     const parentDir = path.dirname(absFilePath);

//     try {
//       if (!fs.existsSync(parentDir)) {
//         fs.mkdirSync(parentDir, { recursive: true });
//       }

//       fs.writeFileSync(absFilePath, content, "utf8");

//       return {
//         success: true,
//         file_path,
//         characters_written: content.length,
//       };
//     } catch (e) {
//       return { error: e.message };
//     }
//   };

//   // CREATE FLUTTER APP IN THE WORKSPACE IN THE DOCKER CONTAINER
//   static create_flutter_app = (working_directory, app_name) => {
//     const absWorkingDir = path.resolve(working_directory);
//     const absAppDir = path.resolve(working_directory, app_name);

//     if (!absAppDir.startsWith(absWorkingDir)) {
//       return { error: "App directory is outside the working directory" };
//     }

//     try {
//       const result = spawnSync(
//         "flutter",
//         ["create", "--project-name", app_name],
//         {
//           cwd: absWorkingDir,
//           stdio: "inherit",
//         }
//       );

//         if (result.error) {
//           return { error: result.error.message };
//         }

//         return { success: true };
//     } catch (e) {
//       return { error: e.message };
//     }
// }
// /// generate apk
//  static generate_apk = (file_path) =>{}
  
// }

// class FilingClass {
//   static BASE_DIR = process.env.WORKSPACE_DIR || 'workspaces';

//   static resolveSafe(working_directory, target) {
//     const base = path.resolve(working_directory || this.BASE_DIR);
//     const resolved = path.resolve(base, target);
      
//     if (!resolved.startsWith(base)) {
//       return { error: "Path traversal blocked" };
//     }

//     return resolved;
//   }

//   static get_file_info = (working_directory, directory) => {
//     console.log("Getting file info for directory:", directory);
//     console.log("Working directory:", working_directory);
//     const absDirPath = this.resolveSafe(working_directory, directory);
//     if (absDirPath.error) return absDirPath;
//     console.log("Absolute directory path:", absDirPath);
//     if (!fs.existsSync(absDirPath)) {
//       console.log("Directory does not exist:", absDirPath);
//       // create directory
      
//       return { error: "Directory does not exist" };
//     }
//   console.log("Directory exists. Reading contents...");
//     try {
//       const items = fs.readdirSync(absDirPath, { withFileTypes: true });

//       return items.map((item) => ({
//         name: item.name,
//         type: item.isDirectory() ? "directory" : "file",
//       }));
//     } catch (e) {
//       return { error: e.message };
//     }
//   };

//   static get_file_content = (working_directory, file_path) => {
//     const absFilePath = this.resolveSafe(working_directory, file_path);
//     if (absFilePath.error) return absFilePath;

//     if (!fs.existsSync(absFilePath)) {
//       return { error: "File does not exist" };
//     }

//     try {
//       return { content: fs.readFileSync(absFilePath, "utf8") };
//     } catch (e) {
//       return { error: e.message };
//     }
//   };

//   static write_file = (working_directory, file_path, content) => {
//     const absFilePath = this.resolveSafe(working_directory, file_path);
//     if (absFilePath.error) return absFilePath;

//     const parentDir = path.dirname(absFilePath);

//     try {
//       if (!fs.existsSync(parentDir)) {
//         fs.mkdirSync(parentDir, { recursive: true });
//       }

//       fs.writeFileSync(absFilePath, content, "utf8");

//       return {
//         success: true,
//         file_path,
//         characters_written: content.length,
//       };
//     } catch (e) {
//       return { error: e.message };
//     }
//   };
// }


class LLMSchemas {
  static schema_get_file_info = {
    name: "get_file_info",
    description: "List files and folders in a directory",
    parameters: {
      type: "OBJECT",
      properties: {
        directory: {
          type: "STRING",
          description:
            "Directory path relative to the working directory",
        },
      },
      required: ["directory"],
    },
  };

  static schema_get_file_content = {
    name: "get_file_content",
    description: "Read the contents of a file",
    parameters: {
      type: "OBJECT",
      properties: {
        file_path: {
          type: "STRING",
          description:
            "File path relative to the working directory",
        },
      },
      required: ["file_path"],
    },
  };

  static schema_write_file = {
    name: "write_file",
    description:
      "Create or overwrite a file in the working directory",
    parameters: {
      type: "OBJECT",
      properties: {
        file_path: {
          type: "STRING",
          description:
            "File path relative to the working directory",
        },
        content: {
          type: "STRING",
          description: "Content to write into the file",
        },
      },
      required: ["file_path", "content"],
    },
  };

  static schema_delete_file = {
    name: "delete_file",
    description: "Delete a file in the working directory, if it exists or is a directory, delete it recursively and if the file is not needed for the project, delete it to free up space",
    parameters: {
      type: "OBJECT",
      properties: {
        file_path: {
          type: "STRING",
          description:
            "File path relative to the working directory",
        },
      },
      required: ["file_path"],
    },
  };

  static schema_delete_directory = {
    name: "delete_directory",
    description: "Delete a directory in the working directory, if it exists or is a file, delete it and if the directory is not needed for the project, delete it to free up space",
    parameters: {
      type: "OBJECT",
      properties: {
        dir_path: {
          type: "STRING",
          description:
            "Directory path relative to the working directory",
        },
      },
      required: ["dir_path"],
    },
  };


}
export { FilingClass, LLMSchemas };


// console.log(FilingClass.get_file_info('/WORKSPACE', 'Flutter'))
// console.log('===========================\n\n\n\n')