import githubRouter from "./routes/github/github.js";
import modelroute from "./routes/ai-route/route.js";
import express from 'express';
const cors = require('cors');

// This allows ALL origins (good for testing, narrow it down for production)
app.use(cors()); 

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.sendFile('../index.html');
})

app.use("/api/v1/github", (req, res, next) => {
    console.log(`Received request for ${req.path}`);
    next();
}, githubRouter);
app.use("/api/v1/ai", modelroute);

app.listen(5000, () => {
  console.log(`Serer running on port 5000`);
});

