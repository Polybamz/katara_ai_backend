import OpenAI from "openai";
import { callFunction } from "../../functions/call_function.js";
import { LLMSchemas } from "../../functions/files_dir_function.js";
import { systemInstruction, executorSystem, plannerSystem , fixerSystem, kataraCore} from "../../config/system_instruction.js";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildTools() {
  return [
    { type: "function", function: LLMSchemas.schema_get_file_info },
    { type: "function", function: LLMSchemas.schema_get_file_content },
    { type: "function", function: LLMSchemas.schema_write_file },
    { type: "function", function: LLMSchemas.schema_delete_directory },
    { type: "function", function: LLMSchemas.schema_delete_file },
    { type: "function", function: LLMSchemas.schema_event_log }
  ];
}

export class AgentPipeline {
  // 🧠 Planner
  static async plan(userPrompt, onEvent = () => { },) {
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content: plannerSystem + "\n\n" + kataraCore,
        },
        { role: "user", content: userPrompt },
      ],
    });

    return JSON.parse(response.output_text);
  }

  // ⚙️ Executor
  static async execute(plan, workingDirectory, verboseFlag = false, onEvent = () => { },) {
    const messages = [
      {
        role: "system",
        content: `${executorSystem}:\n${JSON.stringify(plan, null, 2)}` + "\n\n" + kataraCore,
      },
    ];

    const tools = buildTools();

    for (let i = 0; i < 20; i++) {
      const response = await client.responses.create({
        model: "gpt-4.1",
        input: messages,
        tools,
      });

      const toolCalls =
        response.output?.filter((i) => i.type === "tool_call") || [];

      messages.push({
        role: "assistant",
        content: response.output_text || "",
        tool_calls: toolCalls,
      });

      let functionCalled = false;

      for (const call of toolCalls) {
        functionCalled = true;

        const result = await callFunction(
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
          content: JSON.stringify(result),
        });
      }

      if (!functionCalled) {
        return response.output_text;
      }
    }
  }

  // 🧪 Validator
  static async validate(workingDirectory, onEvent = () => { },) {
    try {
      const result = await callFunction({
        name: "run_command",
        arguments: { command: "npm run build" },
        
      },

    workingDirectory
    );

      return { success: true, output: result };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  }

  // 🔧 Fixer
  static async fix(error, workingDirectory, verboseFlag = false, onEvent = () => { },) {
    const tools = buildTools();

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content: `${fixerSystem}\n Error: ${error}`,
        },
      ],
      tools,
    });

    const toolCalls =
      response.output?.filter((i) => i.type === "tool_call") || [];

    for (const call of toolCalls) {
      await callFunction(
        {
          name: call.name,
          arguments: call.arguments,
        },
        workingDirectory
      );
    }
  }
}



export async function createAppAgent(
  userPrompt,
  workingDirectory,
  verboseFlag = false,
  onEvent = () => { },
) {
  onEvent("🧠 Planning...");
  const plan = await AgentPipeline.plan(userPrompt, onEvent , );

  if (verboseFlag) {
    console.log("PLAN:", plan);
  }

  console.log("⚙️ Executing...");
  await AgentPipeline.execute(plan, workingDirectory, verboseFlag);

  const maxFixLoops = 5;

  for (let i = 0; i < maxFixLoops; i++) {
    console.log("🧪 Validating...");
    const result = await AgentPipeline.validate(workingDirectory, onEvent);

    if (result.success) {
      console.log("✅ Build successful!");
      return "App built successfully";
    }

    console.log("❌ Error detected. Fixing...");
    await AgentPipeline.fix(result.error, workingDirectory, verboseFlag, onEvent,);
  }

  throw new Error("Failed after multiple fix attempts");
}
