
import { FilingClass } from "./files_dir_function.js";

 const workingDir = process.env.WORKING_DIRECTORY || process.env.WORKSPACE || "workspaces";

function coerceToString(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // common protobuf-like wrappers
  if (typeof v === "object") {
    if (typeof v.path === "string") return v.path;
    if (typeof v.file_path === "string") return v.file_path;
    if (typeof v.stringValue === "string") return v.stringValue;
    if (typeof v.value === "string") return v.value;
    // if it's a simple object, try JSON -> but avoid passing object to path.resolve
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  return String(v);
}

export async function callFunction(functionCall, verbose = false, workingDirectory = workingDir) {
  if (verbose) {
    console.log(
      `Calling function: ${functionCall.name}(${JSON.stringify(
        functionCall.arguments ?? functionCall.args ?? functionCall
      )})`
    );
  } else {
    console.log(`Calling function: ${functionCall.name}`);
  }

  let result;

  // normalize args: handle args as object or JSON string
  let args = functionCall.arguments ?? functionCall.args ?? {};
  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
    } catch (e) {
      // leave as-is string; will coerce below
      args = { value: args };
    }
  }

  try {
    switch (functionCall.name) {
      case "get_file_info": {
        const directory = coerceToString(args.directory ?? args.path ?? ".");
        result = FilingClass.get_file_info(workingDirectory, directory);
        break;
      }

      case "get_files_content": {
        const file_path = coerceToString(args.file_path ?? args.path ?? args.file ?? "");
        result = FilingClass.get_file_content(workingDirectory, file_path);
        break;
      }

      case "write_file": {
        const file_path = coerceToString(args.file_path ?? args.path ?? args.file ?? "");
        const content = typeof args.content === "string" ? args.content : coerceToString(args.content);
        result = FilingClass.write_file(workingDirectory, file_path, content);
        break;
      }

      case "run_python_file": {
        result = { error: "run_python_file not implemented" };
        break;
      }
      case "delete_file": {
        const file_path = coerceToString(args.file_path ?? args.path ?? args.file ?? "");
        result = FilingClass.delete_file(workingDirectory, file_path);
        break;
      }
      case "delete_directory": {
        const directory = coerceToString(args.directory ?? args.path ?? ".");
        result = FilingClass.delete_directory(workingDirectory, directory);
        break;
      }

      default: {
        result = { error: `Unknown function ${functionCall.name}` };
      }
    }
  } catch (err) {
    result = { error: err?.message || String(err) };
  }

  return {
    role: "tool",
    parts: [
      {
        functionResponse: {
          name: functionCall.name,
          response: {
            result,
          },
        },
      },
    ],
  };
}

// default export for other import
export default callFunction;
