import "dotenv/config";
import process from "process";
import OpenAI from "openai";

import { systemInstruction } from "../../config/system_instruction.js";
import { callFunction } from "../../functions/call_function.js";
import { LLMSchemas } from "../../functions/files_dir_function.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildTools() {
  return [
    {
      type: "function",
      function: LLMSchemas.schema_get_file_info,
    },
    {
      type: "function",
      function: LLMSchemas.schema_get_file_content,
    },
    {
      type: "function",
      function: LLMSchemas.schema_write_file,
    },
    {
      type: "function",
      function: LLMSchemas.schema_delete_directory,
    },
    {
      type: "function",
      function: LLMSchemas.schema_delete_file,
    },
  ];
}

async function createChatGPTChat(prompt, verboseFlag = false, workingDirectory) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY");
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
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const tools = buildTools();
  const maxIters = 20;

  for (let i = 0; i < maxIters; i++) {
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: messages,
      tools,
    });

    if (verboseFlag) {
      console.log("Response:", JSON.stringify(response, null, 2));
    }

    let functionCalled = false;

    const toolCalls =
      response.output?.filter((item) => item.type === "tool_call") || [];

    // Append assistant message
    messages.push({
      role: "assistant",
      content: response.output_text || "",
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      functionCalled = true;

      const toolResult = await callFunction(
        {
          name: call.name,
          arguments: call.arguments,
        },
        verboseFlag,
        workingDirectory
      );

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(toolResult),
      });
    }

    if (!functionCalled) {
      const finalText = response.output_text;
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
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    onError("Missing OPENAI_API_KEY");
    return;
  }

  const systemPrompt =
    systemInstruction ||
    `You are a helpful AI coding agent.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const tools = buildTools();
  const maxIters = 20;

  for (let i = 0; i < maxIters; i++) {
    const stream = await client.responses.stream({
      model: "gpt-4.1",
      input: messages,
      tools,
    });

    let fullText = "";

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        fullText += event.delta;
        onData(event.delta);
      }

      if (event.type === "response.error") {
        onError(event.error);
      }
    }

    const finalResponse = await stream.finalResponse();

    const toolCalls =
      finalResponse.output?.filter((item) => item.type === "tool_call") || [];

    messages.push({
      role: "assistant",
      content: fullText,
      tool_calls: toolCalls,
    });

    let functionCalled = false;

    for (const call of toolCalls) {
      functionCalled = true;

      const toolResult = await callFunction(
        {
          name: call.name,
          arguments: call.arguments,
        },
        verboseFlag,
        workingDirectory
      );

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(toolResult),
      });
    }

    if (!functionCalled) {
      onResult(fullText);
      return;
    }
  }
}
