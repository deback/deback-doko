# Doppelkopf Online (deback-doko)

## Project Context

Next.js 16 multiplayer card game app with App Router, Better Auth, Drizzle ORM (PostgreSQL), PartyKit (real-time WebSockets), and React Email.

German card game application for the traditional game "Doppelkopf" with real-time multiplayer functionality.

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript 5.9
- **Styling**: Tailwind CSS 4, shadcn/ui, next-themes
- **Auth**: Better Auth (Email/Password, GitHub, Google, Magic Link)
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: PartyKit (WebSockets)
- **Email**: Resend API with React Email Templates
- **Validation**: Zod, React Hook Form
- **Linting/Formatting**: Biome

## Commands

```bash
# Development
pnpm dev              # Run Next.js + PartyKit concurrently
pnpm dev:next         # Next.js only (port 3000)
pnpm dev:partykit     # PartyKit only (port 1999)
pnpm dev:email        # Email template preview

# Code Quality
pnpm typecheck        # TypeScript checking
pnpm check            # Biome linting
pnpm check:write      # Biome with auto-fix

# Database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema directly
pnpm db:studio        # Open Drizzle Studio

# Build & Deploy
pnpm build            # Production build
pnpm deploy:partykit  # Deploy PartyKit
```

## Code Style

- **Language**: German UI texts, English code/comments
- **Exports**: Prefer named exports
- **Modules**: ES Modules (`"type": "module"`)
- **Imports**: Path alias `@/*` for `./src/*`
- **Components**: Server Components by default, `"use client"` only when needed
- **Server Actions**: `"use server"` directive
- **Styling**: Tailwind with `cn()` utility from `@/lib/utils`
- **Validation**: Zod schemas in `/src/lib/validations/`

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register, etc.)
│   ├── (with-navigation)/ # Pages with navigation
│   ├── api/               # API Routes
│   └── game/[gameId]/     # Game page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── cards/             # Card components
│   ├── game/              # Game components
│   └── tables/            # Table management
├── server/
│   ├── better-auth/       # Auth configuration
│   ├── db/                # Drizzle schema & connection
│   ├── actions/           # Server Actions
│   └── email/             # Resend email service
├── lib/                   # Utilities & validations
└── types/                 # TypeScript types
party/                     # PartyKit server (WebSockets)
emails/                    # React Email templates
drizzle/                   # Database migrations
```

## Important Notes

- **UI Components**: `/src/components/ui/` contains shadcn/ui - do not edit manually
- **Biome**: No ESLint/Prettier, only Biome for linting/formatting
- **Fonts**: Poppins (sans), Libre Baskerville (serif), IBM Plex Mono (mono)
- **Colors**: CSS custom properties with OKLch color space in `globals.css`
- **PartyKit**: Requires separate deployment (`pnpm deploy:partykit`)
- **Env Variables**: Validated via `@t3-oss/env-nextjs` in `/src/env.js`

## Authentication

Better Auth with:
- Email/Password (with email verification)
- GitHub OAuth
- Google OAuth
- Magic Link

Session access: `getSession()` from `@/server/better-auth/server`

## Database

Drizzle ORM schema in `/src/server/db/schema.ts`:
- `user`, `session`, `account`, `verification` (Better Auth)
- `post` (example table)

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
1. Biome check + TypeScript check
2. Vercel deployment (main branch only)
