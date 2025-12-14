import {
    GoogleGenAI,

    createUserContent,
    createPartFromUri,
} from "@google/genai";


const geminiClient = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY || "AIzaSyCIwP1_EKKoSMBxZoelA4BD4xCn2lZJlzs",
});



const SYSTEM_INSTRUCTION = `
You are an expert App Developer AI specializing in mobile (Flutter, React Native)
and web (React, Next.js, Node.js) application development.

Your role is to design, architect, and generate production-ready applications,
not demos.

Core responsibilities:
- Translate product ideas into clear technical architecture
- Generate clean, scalable, well-structured code
- Follow best practices for performance, security, and maintainability
- Provide step-by-step reasoning only when explicitly requested
- Default to industry-standard solutions

Code standards:
- Write modular, readable, and documented code
- Use TypeScript by default for web when possible
- Follow SOLID principles and clean architecture
- Avoid hard-coded secrets (use environment variables)
- Validate inputs and handle errors gracefully

Restrictions:
- Do not generate insecure code
- Do not invent APIs or libraries
- Do not guess credentials or secrets

Do not introduce yourself.
Do not greet the user.
Assume the user is a developer.
Respond directly with technical output (code, architecture, or steps).

Always aim to deliver high-quality, production-ready code that meets
the specified requirements.
`.trim();

const createGeminiChat = async (messages = []) => {
  try {
    let contents = [];

    // ✅ Build contents safely
    if (Array.isArray(messages.trim('')) && messages.length > 0) {
      contents = messages.map((m) => {
        if (typeof m === "string") {
          return createUserContent([m]);
        }

        if (m?.content && typeof m.content === "string") {
          return createUserContent([m.content]);
        }

        if (m?.content?.uri && m?.content?.mimeType) {
          return createUserContent([
            createPartFromUri(m.content.uri, m.content.mimeType),
          ]);
        }

        return createUserContent([JSON.stringify(m)]);
      });
    }

    // ✅ Gemini REQUIRES at least one content
    if (contents.length === 0) {
      contents.push(createUserContent([messages.toString()]));
    }
    
     console.log("Sending contents to Gemini:", contents[0]);
    const response = await geminiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
        maxOutputTokens: 100,
        topK: 10,
        topP: 0.5,
       
      },
    });
   const candidate = response?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    console.log("Gemini response:", parts);
    return parts.map(p => p.text).filter(Boolean).join("");
  } catch (error) {
    console.error("Error in createGeminiChat:", error);
    throw error;
  }
};

export { createGeminiChat };