
import "dotenv/config";
import process from "process";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

import { systemInstruction } from "../../config/system_instruction.js";
import { callFunction } from "../../functions/call_function.js";
import { LLMSchemas } from "../../functions/files_dir_function.js";

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildTools() {
  return [
    {
      name: LLMSchemas.schema_get_file_info.name,
      description: LLMSchemas.schema_get_file_info.description,
      input_schema: LLMSchemas.schema_get_file_info.parameters,
    },
    {
      name: LLMSchemas.schema_get_file_content.name,
      description: LLMSchemas.schema_get_file_content.description,
      input_schema: LLMSchemas.schema_get_file_content.parameters,
    },
    {
      name: LLMSchemas.schema_write_file.name,
      description: LLMSchemas.schema_write_file.description,
      input_schema: LLMSchemas.schema_write_file.parameters,
    },
    {
      name: LLMSchemas.schema_delete_directory.name,
      description: LLMSchemas.schema_delete_directory.description,
      input_schema: LLMSchemas.schema_delete_directory.parameters,
    },
    {
      name: LLMSchemas.schema_delete_file.name,
      description: LLMSchemas.schema_delete_file.description,
      input_schema: LLMSchemas.schema_delete_file.parameters,
    },
  ];
}

async function createClaudeChat(prompt, verboseFlag = false, workingDirectory) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error("Missing ANTHROPIC_API_KEY");
    process.exit(1);
  }

  const systemPrompt =
    systemInstruction ||
    `You are a helpful AI coding agent.
You can:
- List files and directories
- Read file contents
- Write or overwrite files`;

  const messages = [
    {
      role: "user",
      content: [{ type: "text", text: prompt }],
    },
  ];

  const tools = buildTools();
  const maxIters = 20;

  for (let i = 0; i < maxIters; i++) {
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-latest",
      system: systemPrompt,
      messages,
      tools,
      max_tokens: 4096,
    });

    if (verboseFlag) {
      console.log("Response:", response);
    }

    // Push assistant response
    messages.push({
      role: "assistant",
      content: response.content,
    });

    let functionCalled = false;

    for (const block of response.content) {
      if (block.type === "tool_use") {
        functionCalled = true;

        const toolResult = await callFunction(
          {
            name: block.name,
            arguments: block.input,
          },
          verboseFlag,
          workingDirectory
        );

        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(toolResult),
            },
          ],
        });
      }
    }

    if (!functionCalled) {
      const finalText = response.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      console.log(finalText);
      return finalText;
    }
  }
}

async function createStreamChat(
  prompt,
  verboseFlag = false,
  workingDirectory,
  onEvent = () => {},
  onError = () => {},
  onEnd = () => {},
  onData = () => {},
  onResult = () => {}
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    onError("Missing ANTHROPIC_API_KEY");
    return;
  }

  const systemPrompt =
    systemInstruction ||
    `You are a helpful AI coding agent.`;

  const messages = [
    {
      role: "user",
      content: [{ type: "text", text: prompt }],
    },
  ];

  const tools = buildTools();
  const maxIters = 20;

  for (let i = 0; i < maxIters; i++) {
    const stream = await anthropic.messages.stream({
      model: "claude-3-7-sonnet-latest",
      system: systemPrompt,
      messages,
      tools,
      max_tokens: 4096,
    });

    let fullResponse = [];

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta?.text) {
          onData(event.delta.text);
        }
      }

      if (event.type === "content_block_start") {
        fullResponse.push(event.content_block);
      }
    }

    const finalMessage = await stream.finalMessage();

    messages.push({
      role: "assistant",
      content: finalMessage.content,
    });

    let functionCalled = false;

    for (const block of finalMessage.content) {
      if (block.type === "tool_use") {
        functionCalled = true;

        const toolResult = await callFunction(
          {
            name: block.name,
            arguments: block.input,
          },
          verboseFlag,
          workingDirectory
        );

        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(toolResult),
            },
          ],
        });
      }
    }

    if (!functionCalled) {
      const finalText = finalMessage.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      onResult(finalText);
      return;
    }
  }
}
