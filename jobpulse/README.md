# JobPulse

Job hunting dashboard: track company career sites, scrape listings (Greenhouse / Lever / custom), match roles to your profile with Claude, and draft cover letters.

## Local setup

```bash
cd jobpulse
npm install
cp .env.example .env.local
# Edit .env.local: DATABASE_URL and ANTHROPIC_API_KEY
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## GitHub (do not commit secrets)

- **Never** commit `.env`, `.env.local`, `.env *`, or `*.db`. Only **`.env.example`** (no real keys) belongs in git.
- Before the first push, verify nothing sensitive is staged:

  ```bash
  git status
  git diff --staged
  ```

- If you ever committed a key, rotate it in the provider (Anthropic, etc.) and use `git filter-repo` or BFG to purge history.

## Deploy on Vercel

1. Push this repository to GitHub (from the **repo root** or a repo that contains `jobpulse/`).
2. In [Vercel](https://vercel.com/new) → **Import** the repo.
3. Set **Root Directory** to `jobpulse`.
4. Under **Environment Variables**, add (Production / Preview as needed):
   - `DATABASE_URL` — for a quick demo you can use `file:./dev.db`, but SQLite on serverless is **not durable** (data resets). For a real deployment use a hosted database (e.g. [Neon](https://neon.tech), [Turso](https://turso.tech), or Vercel Postgres) and point `DATABASE_URL` at it; run migrations against that URL locally or in a CI step.
   - `ANTHROPIC_API_KEY` — your Anthropic API key (same as local).

5. Deploy. The default **Build Command** uses `npm run build` (`prisma generate && next build`).

**Note:** `postinstall` runs `prisma generate` so the Prisma client is available during the Vercel build.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma deploy](https://www.prisma.io/docs/guides/deployment)
