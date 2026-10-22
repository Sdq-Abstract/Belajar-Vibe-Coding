// src/routes.ts
import { Elysia } from "elysia";
import { db } from "./db";
import { schema } from "./schema";

export const routes = new Elysia({
  name: "routes",
})
  .get("/health", () => ({ status: "ok" }))
  .get("/users", async () => {
    const users = await db.state.db.select().from(schema.users);
    return users;
  })
  .post("/users", async ({ body }) => {
    // Expect body: { name: string, email: string }
    const inserted = await db.state.db.insert(schema.users).values(body).returning();
    return inserted[0];
  });
