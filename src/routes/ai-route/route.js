import express from 'express';
import GeminiController from '../../controller/ai-models-controller/gemini-controller.js';
const router = express.Router();

router.post('/gemini/chat', GeminiController.chat);

export default router;