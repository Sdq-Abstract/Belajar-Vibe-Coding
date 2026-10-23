# Issue: Registrasi User Baru

## Deskripsi

Implementasikan fitur registrasi user baru dengan endpoint `POST /api/users`.  
Fitur ini mencakup pembuatan tabel `users` yang baru (menggantikan skema yang sudah ada), hashing password menggunakan bcrypt, dan validasi duplikasi email.

---

## Stack Teknologi

| Komponen | Teknologi |
|---|---|
| Runtime | Bun |
| Framework | Elysia.js |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Password Hashing | `Bun.password` (bcrypt bawaan Bun) |

---

## Perubahan Skema Database

### Tabel: `users`

File yang diubah: `src/schema.ts`

> [!IMPORTANT]
> Skema yang ada saat ini **tidak memiliki kolom `password` dan `created_at`**. Kamu harus menambahkan kedua kolom ini.

Definisi tabel baru:

| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | `serial` (integer auto increment) | Primary Key |
| `name` | `varchar(255)` | NOT NULL |
| `email` | `varchar(255)` | NOT NULL, UNIQUE |
| `password` | `varchar(255)` | NOT NULL |
| `created_at` | `timestamp` | DEFAULT now() |

Contoh kode Drizzle ORM untuk `src/schema.ts`:

```typescript
import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schema = {
  users,
};
```

---

## Struktur Folder yang Diharapkan

Setelah implementasi, folder `src/` harus memiliki struktur berikut:

```
src/
├── db/
│   └── index.ts        # (sudah ada, tidak perlu diubah)
├── routes/
│   └── users-route.ts  # (BARU - dipindah & diubah dari src/routes.ts)
├── service/
│   └── user-service.ts # (BARU)
└── schema.ts           # (diubah - tambah kolom password & created_at)
```

> [!WARNING]
> File `src/routes.ts` yang lama akan **digantikan** oleh `src/routes/users-route.ts`. Pastikan `index.ts` di root project di-update juga untuk menggunakan route yang baru.

---

## Spesifikasi API

### Endpoint

```
POST /api/users
```

### Request Body

```json
{
  "name": "Ibnu",
  "email": "ibnu@localhost",
  "password": "rahasia"
}
```

### Response Body (Sukses) — HTTP 201

```json
{
  "data": "OK"
}
```

### Response Body (Gagal — Email sudah terdaftar) — HTTP 400

```json
{
  "error": "Email sudah terdaftar"
}
```

---

## Tahapan Implementasi

Ikuti langkah-langkah berikut **secara berurutan**.

---

### Langkah 1 — Install Dependency

Bcrypt sudah tersedia secara native di Bun melalui `Bun.password`, **tidak perlu install library tambahan**.

---

### Langkah 2 — Update Skema Database (`src/schema.ts`)

Buka file [`src/schema.ts`](src/schema.ts) dan tambahkan kolom `password` dan `createdAt`:

```typescript
// src/schema.ts
import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schema = {
  users,
};
```

---

### Langkah 3 — Jalankan Migrasi Database

Setelah skema diubah, jalankan perintah berikut di terminal untuk membuat dan menerapkan file migrasi:

```bash
bun run db:generate
bun run db:migrate
```

> [!NOTE]
> Perintah `db:generate` akan membuat file SQL di folder `drizzle/`.  
> Perintah `db:migrate` akan menerapkan perubahan ke database PostgreSQL.

---

### Langkah 4 — Buat User Service (`src/service/user-service.ts`)

Buat folder `src/service/` lalu buat file `user-service.ts`.

File ini berisi **logika bisnis** untuk registrasi user:
1. Cek apakah email sudah terdaftar di database.
2. Jika sudah ada → lempar error dengan pesan `"Email sudah terdaftar"`.
3. Jika belum ada → hash password menggunakan `Bun.password.hash()`.
4. Simpan user baru ke database.

```typescript
// src/service/user-service.ts
import { db } from "../db/index.ts";
import { users, schema } from "../schema.ts";
import { eq } from "drizzle-orm";

export type RegisterUserRequest = {
  name: string;
  email: string;
  password: string;
};

export async function registerUser(request: RegisterUserRequest): Promise<void> {
  // 1. Cek apakah email sudah terdaftar
  const existingUser = await db.state.db
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
  await db.state.db.insert(schema.users).values({
    name: request.name,
    email: request.email,
    password: hashedPassword,
  });
}
```

> [!IMPORTANT]
> **Catatan untuk implementor:**
> `Bun.password.hash()` menggunakan bcrypt secara default. Hasilnya adalah string hash yang aman untuk disimpan ke database.
> 
> Perhatikan `db.state.db` — ini adalah cara mengakses Drizzle client dari Elysia plugin yang sudah ada di `src/db/index.ts`. Namun, karena service ini dipanggil dari route handler yang sudah punya akses context Elysia, kamu perlu **meneruskan instance `db`** ke dalam service, atau menggunakan Drizzle client secara langsung. Lihat Langkah 5 untuk detailnya.

---

### Langkah 5 — Buat Users Route (`src/routes/users-route.ts`)

Buat folder `src/routes/` lalu buat file `users-route.ts`.

File ini berisi **definisi endpoint** Elysia dan memanggil service yang sudah dibuat:

```typescript
// src/routes/users-route.ts
import { Elysia, t } from "elysia";
import { registerUser } from "../service/user-service.ts";

export const usersRoute = new Elysia({ prefix: "/api" })
  .post(
    "/users",
    async ({ body, set }) => {
      try {
        await registerUser(body);
        set.status = 201;
        return { data: "OK" };
      } catch (error) {
        set.status = 400;
        return { error: (error as Error).message };
      }
    },
    {
      // Validasi request body menggunakan Elysia type system
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    }
  );
```

---

### Langkah 6 — Update `src/service/user-service.ts` untuk Menerima DB Instance

> [!NOTE]
> Karena `db` di project ini adalah Elysia plugin (bukan singleton langsung), cara yang paling bersih adalah membuat Drizzle client tersendiri di service, atau mengekspor `dbClient` dari `src/db/index.ts` agar bisa diimpor langsung.

Tambahkan ekspor `dbClient` di [`src/db/index.ts`](src/db/index.ts):

```typescript
// src/db/index.ts — tambahkan baris ekspor berikut
export { dbClient }; // ekspor agar bisa dipakai di service
```

Lalu update `src/service/user-service.ts` untuk mengimpor `dbClient` langsung:

```typescript
// src/service/user-service.ts — gunakan dbClient langsung
import { dbClient } from "../db/index.ts";
import { schema } from "../schema.ts";
import { eq } from "drizzle-orm";

// ... sisa kode sama seperti di atas, ganti db.state.db → dbClient
```

---

### Langkah 7 — Update `index.ts` di Root Project

Buka [`index.ts`](index.ts) di root project dan ganti penggunaan `routes` lama dengan `usersRoute` yang baru:

```typescript
// index.ts
import { Elysia } from "elysia";
import { db } from "./src/db/index.ts";
import { usersRoute } from "./src/routes/users-route.ts";

const app = new Elysia()
  .use(db)
  .use(usersRoute)
  .get("/", () => ({ message: "Server is up" }));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT);

console.log(`Server running at http://localhost:${PORT}`);
```

> [!NOTE]
> File `src/routes.ts` yang lama (`GET /health` dan `GET /users`) bisa dihapus atau dipertahankan jika masih diperlukan. Koordinasikan dengan senior developer.

---

### Langkah 8 — Test Manual dengan cURL

Setelah server berjalan (`bun run dev`), test endpoint dengan perintah berikut:

**Test registrasi berhasil:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Ibnu", "email": "ibnu@localhost", "password": "rahasia"}'
```

Expected response (HTTP 201):
```json
{ "data": "OK" }
```

**Test email duplikat (kirim request yang sama dua kali):**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Ibnu", "email": "ibnu@localhost", "password": "rahasia"}'
```

Expected response (HTTP 400):
```json
{ "error": "Email sudah terdaftar" }
```

---

## Checklist Implementasi

Centang setiap item setelah selesai:

- [ ] `src/schema.ts` — Tambah kolom `password` dan `created_at`
- [ ] Jalankan `bun run db:generate` dan `bun run db:migrate`
- [ ] Buat folder `src/service/`
- [ ] Buat file `src/service/user-service.ts`
- [ ] Buat folder `src/routes/`
- [ ] Buat file `src/routes/users-route.ts`
- [ ] Update `src/db/index.ts` — ekspor `dbClient`
- [ ] Update `index.ts` root — gunakan `usersRoute`
- [ ] Test manual dengan cURL — registrasi sukses ✅
- [ ] Test manual dengan cURL — email duplikat ✅

---

## Catatan Penting

> [!CAUTION]
> - **Jangan pernah** menyimpan password plaintext ke database. Selalu gunakan `Bun.password.hash()` sebelum menyimpan.
> - **Jangan** mengembalikan field `password` dari database ke response API manapun.
> - Pastikan kolom `email` memiliki constraint `UNIQUE` di database (sudah ada di skema Drizzle, tapi pastikan migrasi berhasil dijalankan).
