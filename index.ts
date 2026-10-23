import { Elysia } from "elysia";
import { db } from "./src/db/index.ts";
import { usersRoute } from "./src/routes/users-route.ts";

const app = new Elysia()
  .use(db)
  .use(usersRoute)
  .get("/", () => ({ message: "Server is up" }))
  .get("/health", () => ({ status: "ok" }));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT);

console.log(`Server running at http://localhost:${PORT}`);

export type App = typeof app;
export { app };
