import express, { Request, Response } from "express";
import printRouter from "./routes/print-queue";
import printUser from "./routes/user";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

app.use("/api/print-queue", printRouter);
app.use("/api", printUser);

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
