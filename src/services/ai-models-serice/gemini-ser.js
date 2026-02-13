
import "dotenv/config";
import process from "process";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemInstruction } from "../../config/system_instruction.js";
// import { log, info, warn, error, progress } from "../../../utils/logger.js";

// Tool router + schemas
import { callFunction } from "../../functions/call_function.js";
import { LLMSchemas } from "../../functions/files_dir_function.js";

dotenv.config();



async function createGeminiChat(prompt, verboseFlag = false, workingDirectory ) {
  const geminiApiKey = process.env.GOOGLE_GENAI_API_KEY;

  if (!geminiApiKey) {
    console.error("Missing GOOGLE_GENAI_API_KEY");
    process.exit(1);
  }

  console.log("Gemini API Key:", geminiApiKey);
  console.log('Promt: ',prompt, ',\n -- verbose: ', verboseFlag)
  // console.log(systemInstruction)

  const systemPrompt = systemInstruction || `
You are a helpful AI coding agent.

When a user asks a question or makes a request, make a function call plan. You can perform the following operations:

- List files and directories
- Read file contents
- Write or overwrite files

All paths you provide should be relative to the working directory. You do not need to specify the working directory in your function calls as it is automatically injected for security reasons.
`;

  // if (process.argv.length < 3) {
  //   console.error("You need a prompt");
  //   process.exit(1);
  // }

  // const prompt = process.argv[2];
  // const verboseFlag = process.argv.includes("--verbose");

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(geminiApiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    tools: [
      {
        functionDeclarations: [
          LLMSchemas.schema_get_file_info,
          LLMSchemas.schema_get_file_content,
          LLMSchemas.schema_write_file,
          LLMSchemas.schema_delete_directory,
          LLMSchemas.schema_delete_file,
        ],
      },
    ],
    systemInstruction: systemPrompt,
  });

  // Message history
  const messages = [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const maxIters = 20;

  for (let i = 0; i < maxIters; i++) {
    const result = await model.generateContent({
      contents: messages,
    });

    const response = result.response;

    if (!response) {
      console.error("No response from model.");
      return "No response from model.";
    }

    if (verboseFlag) {
      // info("User prompt:", prompt)
      console.log("User prompt:", prompt);
      console.log("Generated text:", response.text());
      console.log("Usage:", response.usageMetadata);
    }

    // Append model message to history
    if (response.candidates) {
      for (const candidate of response.candidates) {
        if (candidate?.content) {
          messages.push(candidate.content);
        }
      }
    }

    // Handle function calls
    const parts =
      response.candidates?.[0]?.content?.parts ?? [];

    let functionCalled = false;

    for (const part of parts) {
      if (part.functionCall) {
        functionCalled = true;

        const toolResult = await callFunction(
          part.functionCall,
          verboseFlag, 
          workingDirectory
        );

        if (verboseFlag) {
          console.log("Tool result:", toolResult);
        }

        messages.push({
          role: "tool",
          parts: [
            {
              functionResponse: {
                name: part.functionCall.name,
                response: toolResult,
              },
            },
          ],
        });
      }
    }

    // No tools called → final answer
    if (!functionCalled) {
      console.log(response.text());
      return response.text() ;
    }
  }
}

export { createGeminiChat };

// // Run when executed directly
// if (process.argv[1] && process.argv[1].endsWith("gemini-ser.js")) {
//   (async () => {
//     try {
//       console.log("gemini-ser: starting");
//       await createGeminiChat('hey', true);
//       console.log("gemini-ser: finished");
//     } catch (err) {
//       console.error("gemini-ser: fatal error:", err?.message || err);
//       process.exit(1);
//     }
//   })();
// }
