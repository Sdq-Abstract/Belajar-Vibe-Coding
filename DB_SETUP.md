# Local PostgreSQL Database Setup for Belajar Vibe Coding

## 1. Install PostgreSQL (Windows)
- **Option A – Native installer**
  1. Download the installer from https://www.postgresql.org/download/windows/.
  2. Run the installer and follow the wizard (default port **5432**, set a password for the `postgres` super‑user).
  3. After installation, add the `psql` bin directory (e.g. `C:\Program Files\PostgreSQL\15\bin`) to your **PATH** environment variable.

- **Option B – Docker (quick & isolated)**
  ```powershell
  docker run -d \
    --name pg-belajar \
    -e POSTGRES_PASSWORD=YourSecretPassword \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_DB=belajar_vibe \
    -p 5432:5432 \
    postgres:16-alpine
  ```
  This starts a PostgreSQL container listening on `localhost:5432`.

## 2. Create a database (if you used the native installer)
Open a **PowerShell** window and run:
```powershell
psql -U postgres -c "CREATE DATABASE belajar_vibe;"
```
You will be prompted for the password you set during installation.

## 3. Add a `.env` file to the project root
Create a file named **`.env`** (or edit the existing one) with the connection string:
```
DATABASE_URL=postgresql://postgres:YourSecretPassword@localhost:5432/belajar_vibe
PORT=3000
```
- If you used Docker, keep the same values (`localhost` works because the container maps the port to the host).
- The project reads this variable in `src/db/index.ts`.

## 4. Generate and apply the schema with Drizzle‑Kit
The project already contains a simple `users` table in `src/schema.ts`.
Run the following commands from the repository root:
```powershell
# Generate migration files (optional, shows what will be applied)
bun run db:generate

# Apply the migration to the local DB (creates the tables)
bun run db:push
```
If everything is configured correctly you should see output similar to:
```
✅  Applied 1 migration(s)
```
The tables defined in `src/schema.ts` are now created in the `belajar_vibe` database.

## 5. Verify the setup
You can connect with `psql` to list the tables:
```powershell
psql -U postgres -d belajar_vibe -c "\dt"
```
You should see a `users` table.

## 6. Run the server
```powershell
bun run dev
```
Visit `http://localhost:3000/health` – you should receive `{ "status": "ok" }`.

---
**Tip:** Keep the `.env` file out of version control (`.gitignore` already contains it). For production use a stronger password and a dedicated DB user.
