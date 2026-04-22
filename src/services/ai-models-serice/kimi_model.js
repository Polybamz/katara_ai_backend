import "dotenv/config";
import process from "process";
import OpenAI from "openai";

import { systemInstruction } from "../../config/system_instruction.js";
import { callFunction } from "../../functions/call_function.js";
import { LLMSchemas } from "../../functions/files_dir_function.js";

const client = new OpenAI({
  apiKey: process.env.KIMI_API_KEY,
  baseURL: "https://api.moonshot.cn/v1", // Kimi endpoint
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

async function createKimiChat(prompt, verboseFlag = false, workingDirectory) {
  const apiKey = process.env.KIMI_API_KEY;

  if (!apiKey) {
    console.error("Missing KIMI_API_KEY");
    process.exit(1);
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
    const response = await client.chat.completions.create({
      model: "moonshot-v1-128k",
      messages,
      tools,
      temperature: 0.2,
    });

    if (verboseFlag) {
      console.log("Response:", JSON.stringify(response, null, 2));
    }

    const message = response.choices[0].message;

    let functionCalled = false;

    // Push assistant message
    messages.push(message);

    if (message.tool_calls) {
      for (const call of message.tool_calls) {
        functionCalled = true;

        const toolResult = await callFunction(
          {
            name: call.function.name,
            arguments: JSON.parse(call.function.arguments),
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
    }

    if (!functionCalled) {
      const finalText = message.content;
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
  const apiKey = process.env.KIMI_API_KEY;

  if (!apiKey) {
    onError("Missing KIMI_API_KEY");
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
    const stream = await client.chat.completions.create({
      model: "moonshot-v1-128k",
      messages,
      tools,
      stream: true,
    });

    let fullText = "";
    let toolCalls = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0].delta;

      if (delta?.content) {
        fullText += delta.content;
        onData(delta.content);
      }

      if (delta?.tool_calls) {
        toolCalls = delta.tool_calls;
      }
    }

    messages.push({
      role: "assistant",
      content: fullText,
      tool_calls: toolCalls,
    });

    let functionCalled = false;

    for (const call of toolCalls || []) {
      functionCalled = true;

      const toolResult = await callFunction(
        {
          name: call.function.name,
          arguments: JSON.parse(call.function.arguments),
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
