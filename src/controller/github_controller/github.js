import GithubService from "../../services/github/github_ser.js";
import fs from "fs";
import path from "path";

class GithubController {

  static cloneTemplate = async (req, res) => {
    const { type, appName } = req.body;
    console.log(type, appName)
    try {
      const result = await GithubService.createAppFromTemplate(type, appName)
      console.log("Template cloned to:", result.workingDir)
      console.log("Building file tree for:", result.projectId)
      // const tree = GithubController.buildTree(result.workingDir)
      // console.log("File tree built successfully for:", result.projectId)
      //const tree = GithubController.buildTree(result.workingDir);

      res.status(200).json({
        result,
       // tree

      })
    } catch (e) {
      res.status(400).json({ failed: true, error: e, MESSAGE: 'Failed to clone template' })
    }
  }

  static codeBaseTransfer = async (req, res) => {
    const { owner, repo, newOwner, token } = req.body;

    try {
      const result = await GithubService.transferRepo(owner, repo, newOwner, token)
      res.status(200).json({
        success: true,
        result
      })
    } catch (er) {
      res.status(400).json(er)
    }
  }

  static buildTree = (dir, depth = 0, maxDepth = 8, skip = ["node_modules", ".git"]) => {
  if (!dir) throw new Error("No directory provided to buildTree");
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    return items
      .filter(item => !skip.includes(item.name))
      .map(item => {
        const fullPath = path.join(dir, item.name);
        const relativePath = path.relative('/workspace', fullPath).replace(/\\/g, "/");

        if (item.isDirectory()) {
          const children = depth < maxDepth ? GithubController.buildTree(fullPath, depth + 1, maxDepth, skip) : [];
          return {
            type: "folder",
            name: item.name,
            filePath: relativePath || item.name,
            children
          };
        } else {
          let size = 0;
          try { size = fs.statSync(fullPath).size } catch {}
          return {
            type: "file",
            name: item.name,
            filePath: relativePath || item.name,
            size
          };
        }
      });
  } catch (e) {
    console.error("Failed to build file tree for", dir, e);
    throw new Error("Failed to build file tree: " + e.message);
  }
};

// get file by path
static getFileContent = async (req, res) => {
  const  filePath  = req.query.filePath;
 console.log(filePath)
  try {
    const content = await GithubService.getFileContent(filePath);
    res.status(200).json({
      success: true,
      content
    })
  } catch (e) {
    res.status(400).json({
      success: false,
      error: e.message
    })
  }}
  // update file content
  static updateFileContent = async (req, res) => {
    const { filePath, content } = req.body;
    const fullPath = path.join('/workspaces', filePath);
    try {
      fs.writeFileSync(fullPath, content, "utf8");
      res.status(200).json({
        success: true,
        message: "File updated successfully"
      })
    } catch (e) {
      res.status(400).json({
        success: false,
        error: e.message
      })
    }
  }
  
}

export default GithubController