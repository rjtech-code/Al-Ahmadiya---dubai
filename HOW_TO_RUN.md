# Project kaise chalayein (step by step)

Yeh project do hisson mein chalta hai, aur dono ka ek saath chalna zaroori hai:

| Hissa | Kya karta hai | Address |
|---|---|---|
| **API** (backend, `apps/api`) | Database, login, payment, live class server | http://localhost:4000/api/v1 |
| **Website** (frontend, `apps/web`) | Public site + admin panel | http://localhost:3000 |

Database (PostgreSQL) computer ke saath apne aap chalta hai, use alag se chalane ki zaroorat nahi.

---

## Roz ka tarika: 2 terminal kholiye

VS Code mein **Terminal → New Terminal** dabaiye. Phir split button (➕ ke paas) se doosra terminal kholiye.

**Terminal 1: API**
```bash
cd "/home/pragati/Desktop/Al Ahmadiya , dubai"
npm run dev:api
```
Ready hone par yeh line aayegi: `API listening on http://localhost:4000/api/v1`

**Terminal 2: Website**
```bash
cd "/home/pragati/Desktop/Al Ahmadiya , dubai"
npm run dev:web
```
Ready hone par `✓ Ready` aayega.

Ab browser mein kholiye:
- Website: http://localhost:3000/en (Arabic ke liye `/ar`)
- Admin: http://localhost:3000/admin/login (email aur password: `apps/api/.env` mein `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)
- API docs: http://localhost:4000/api/docs

**Band karna ho to:** dono terminal mein `Ctrl + C` dabaiye.

> Code badalte hi dono apne aap reload ho jaate hain. Server dobara chalane ki zaroorat nahi padti.

---

## Agar kuch kaam na kare

| Problem | Kya karein |
|---|---|
| `npm: command not found` | Terminal band karke naya kholiye, ya chalaiye: `source ~/.nvm/nvm.sh` |
| Node ka galat version (`node -v` 22 se kam dikhaye) | `nvm use 22` |
| `Port 3000 (ya 4000) already in use` | Pehle se ek server chal raha hai. Use band kariye, ya chalaiye: `fuser -k 3000/tcp` (ya `4000/tcp`) |
| Website par "Content temporarily unavailable" | API band hai. Terminal 1 dekhiye |
| `Can't reach database` | Chalaiye: `sudo systemctl start postgresql` |
| Naya code `git pull` karne ke baad error | Project folder mein chalaiye: `npm install`, phir `npm run db:migrate -w apps/api` |

---

## Kabhi-kabhi kaam aane wale commands

Sab project folder (`cd "/home/pragati/Desktop/Al Ahmadiya , dubai"`) se chalaiye.

| Kaam | Command |
|---|---|
| Sab tests chalana | `npm test` |
| Code check (lint + type) | `npm run lint` aur `npm run typecheck` |
| Database badlav lagana (migration) | `npm run db:migrate -w apps/api` |
| Roles, admin, basic data daalna | `npm run db:seed -w apps/api` |
| Colleges, courses, programmes, news ka content + images daalna | `npm run db:seed:content -w apps/api` |
| Database ko table ki tarah dekhna | `cd apps/api && npx prisma studio` (http://localhost:5555 khulega) |

---

## Live class try karna (ek hi computer par)

1. **Admin window:** Online courses → koi course → **Online & price** (online on, type "Current course") → **Live classes** step mein class schedule kariye.
2. **Incognito window** (`Ctrl+Shift+N`): http://localhost:3000/en/register par student banaiye → course kholke **Enrol** dabaiye (test gateway hai, asli paisa nahi lagta).
3. **Admin:** Live classes → **Console** → **Go live**. Camera aur mic ko *Allow* kariye.
4. **Student:** bell par notification → **Join class**. Awaaz ke liye "Tap to turn on sound" dabaiye.
5. Teacher ki screen par naam, viewer count, attendance aur comments dikhenge. **End class** dabane par attendance save ho jaati hai.

> Ek hi computer par dono windows mein awaaz goonj (echo) sakti hai. Headphone lagaiye.

---

## Important files

| File | Kya hai |
|---|---|
| `apps/api/.env` | API ki settings (database, secrets, payment). **Ise kabhi share ya commit na karein** |
| `apps/web/.env.local` | Website ki settings |
| `PROGRESS.md` | Kya bana hai, kya baaki hai |
| `STAFF_ROLES.md` | Kaun sa staff kya kar sakta hai |
| `DEPLOYMENT.md` | Asli (production) server par lagane ka tarika |
| `deploy/` | Production ke files: Nginx, PM2, env templates, deploy aur backup scripts |
