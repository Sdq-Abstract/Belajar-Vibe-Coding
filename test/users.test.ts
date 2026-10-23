import { describe, expect, it, beforeEach } from "bun:test";
import { app } from "../index.ts";
import { dbClient } from "../src/db/index.ts";
import { schema } from "../src/schema.ts";
import { eq } from "drizzle-orm";

describe("User Registration API (POST /api/users)", () => {
  const testEmail = "test-ibnu@localhost";

  beforeEach(async () => {
    // Bersihkan user pengujian jika ada
    await dbClient.delete(schema.users).where(eq(schema.users.email, testEmail));
  });

  it("berhasil mendaftarkan user baru dan password ter-hash", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ibnu",
          email: testEmail,
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ data: "OK" });

    // Pastikan user tersimpan di database dan password di-hash (bukan plaintext)
    const savedUser = await dbClient
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, testEmail));

    expect(savedUser.length).toBe(1);
    const user = savedUser[0]!;
    expect(user.name).toBe("Ibnu");
    expect(user.password).not.toBe("rahasia");
    const isPasswordValid = await Bun.password.verify("rahasia", user.password);
    expect(isPasswordValid).toBe(true);
  });

  it("gagal mendaftarkan user jika email sudah terdaftar", async () => {
    // Daftarkan pertama kali
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ibnu",
          email: testEmail,
          password: "rahasia",
        }),
      })
    );

    // Coba daftarkan kedua kali dengan email yang sama
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ibnu 2",
          email: testEmail,
          password: "password123",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Email sudah terdaftar" });
  });
});
