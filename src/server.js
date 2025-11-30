import githubRouter from "./routes/github/github.js";
import express from 'express'
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("Hello World!");
})

app.use("/api/github", githubRouter);

app.listen(5000, () => {
  console.log("Server started on port 3000");
});