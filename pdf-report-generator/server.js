import express from "express";

const app = express();
const port = process.env.PORT || 3100;

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(port, () => console.log(`PDF report API listening at http://localhost:${port}`));
