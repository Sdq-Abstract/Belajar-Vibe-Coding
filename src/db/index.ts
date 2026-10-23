import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Elysia } from "elysia";
import * as schema from "../schema";

// Initialize PostgreSQL pool using DATABASE_URL from .env
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Drizzle client
export const dbClient = drizzle(pool, { schema });

/**
 * Elysia plugin that injects the Drizzle client into the context.
 * Usage: app.use(dbPlugin)
 */
export const db = new Elysia({
  name: "db",
}).state("db", dbClient);
