import githubRouter from "./routes/github/github.js";
import modelroute from "./routes/ai-route/route.js";
import attachGeminiWebsocket from "./websockets/gemini_ws.js";
import http from "http";

import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;

// This allows ALL origins (good for testing, narrow it down for production)


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors()); 

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.get("/", (req, res) => {
    res.send('Running katara Backend');
})

app.use("/api/v1/github", (req, res, next) => {
    console.log(`Received request for ${req.path}`);
    next();
}, githubRouter);
app.use("/api/v1/ai", modelroute);

const server = http.createServer(app);
attachGeminiWebsocket(server, { path: "/ws/gemini" });

server.listen(PORT,"0.0.0.0");

