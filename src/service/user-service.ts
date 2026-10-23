import { dbClient } from "../db/index.ts";
import { schema } from "../schema.ts";
import { eq } from "drizzle-orm";

export type RegisterUserRequest = {
  name: string;
  email: string;
  password: string;
};

export async function registerUser(request: RegisterUserRequest): Promise<void> {
  // 1. Cek apakah email sudah terdaftar
  const existingUser = await dbClient
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, request.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("Email sudah terdaftar");
  }

  // 2. Hash password menggunakan bcrypt (via Bun built-in)
  const hashedPassword = await Bun.password.hash(request.password);

  // 3. Simpan user baru ke database
  try {
    await dbClient.insert(schema.users).values({
      name: request.name,
      email: request.email,
      password: hashedPassword,
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      throw new Error("Email sudah terdaftar");
    }
    throw err;
  }
}
