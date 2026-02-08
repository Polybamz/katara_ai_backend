import { createGeminiChat } from "../../services/ai-models-serice/gemini-ser.js";

class GeminiController {
  static async chat(req, res) {
    try {
      const { messages,verboseFlag, workingDirectory  } = req.body;
      const response = await createGeminiChat(messages, verboseFlag, workingDirectory);
      return res.status(200).json({ response });
    } catch (error) {
      console.log(error);
      return res.status(500).json(error.message);
    }
  }
}

export default GeminiController;