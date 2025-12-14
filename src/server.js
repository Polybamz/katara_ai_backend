import githubRouter from "./routes/github/github.js";
import modelroute from "./routes/ai-route/route.js";
import express from 'express'
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("Running Katara AI Backend");
})

app.use("/api/github", githubRouter);
app.use("/api/ai", modelroute);

app.listen(5000, () => {
  console.log("Server started on port 5000");
});