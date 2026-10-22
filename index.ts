// src/index.ts
import { Elysia } from "elysia";
import { db } from "./src/db/index.ts";
import { routes } from "./src/routes.ts";

const app = new Elysia()
  .use(db)
  .use(routes)
  .get("/", () => ({ message: "Server is up" }));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT);

console.log(`🚀 Server running at http://localhost:${PORT}`);
