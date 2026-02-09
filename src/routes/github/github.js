import express from "express";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs";
import GithubController from "../../controller/github_controller/github.js";

const router = express.Router();
const WORKSPACE = process.env.WORKSPACE || "/workspace"; // Folder inside container/server

//
// ------------------------------------------
// 🚀 1. CLONE REPOSITORY (like local machine)
// ------------------------------------------



router.post('/clone-template', GithubController.cloneTemplate );

router.post("/clone-repo", async (req, res) => {
  const { repoUrl, projectName, branch } = req.body;

  if (!repoUrl || !projectName) {
    return res.status(400).json({ error: "repoUrl and projectName required" });
  }

  const projectPath = path.join(WORKSPACE, projectName);

  try {
    // Delete previous project if exists
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }

    const git = simpleGit();
    await git.clone(repoUrl, projectPath, branch ? ["--branch", branch] : []);

    // Build tree
    const buildTree = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      return items.map((item) => {
        const fullPath = path.join(dir, item.name);
        const relativePath = fullPath.replace(WORKSPACE + "/", "");

        if (item.isDirectory()) {
          return {
            type: "folder",
            name: item.name,
            filePath: relativePath,
            children: buildTree(fullPath)
          };
        } else {
          return {
            type: "file",
            name: item.name,
            filePath: relativePath
          };
        }
      });
    };

    const structure = buildTree(projectPath);

    return res.json({
      success: true,
      message: "Repository cloned successfully",
      projectName,
      rootPath: projectPath,
      tree: structure
    });

  } catch (error) {
    console.error("Clone error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// ------------------------------------------
// 📄 2. READ ANY FILE FROM THE CLONED PROJECT
// ------------------------------------------

router.get("/file", GithubController.getFileContent);
// router.get("/file", 
//   async (req, res) => {
//   const { projectName, filePath } = req.body;

//   if (!projectName || !filePath) {
//     return res.status(400).json({
//       error: "projectName and filePath are required"
//     });
//   }

//   const fullPath = path.join(WORKSPACE, projectName, filePath);

//   // Check if file exists
//   if (!fs.existsSync(fullPath)) {
//     return res.status(404).json({
//       error: "File not found"
//     });
//   }

//   try {
//     const fileContent = fs.readFileSync(fullPath, "utf8");

//     return res.json({
//       success: true,
//       projectName,
//       filePath,
//       content: fileContent
//     });

//   } catch (error) {
//     console.error("File read error:", error);
//     return res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

export default router;
