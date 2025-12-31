# Doppelkopf Online

An online multiplayer card game application for playing Doppelkopf (a popular German card game) in real-time with friends.

## Features

- **User Authentication**: Multiple authentication methods including email/password, GitHub OAuth, Google OAuth, and Magic Link
- **User Profiles**: View and edit your profile, including username customization
- **Game Tables**: Create, join, and leave game tables
- **Real-time Gameplay**: Real-time game functionality powered by PartyKit
- **User Directory**: Browse all users and view their profiles
- **Responsive Design**: Mobile-friendly interface with bottom navigation bar
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Framework**: [Next.js 16.1.1](https://nextjs.org) (App Router)
- **React**: 19.2.3
- **Language**: TypeScript
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)
- **Real-time**: [PartyKit](https://partykit.io) for WebSocket connections
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com)
- **Forms**: React Hook Form + Zod validation
- **Email**: Resend API for magic link emails
- **Code Quality**: Biome for linting and formatting

## Prerequisites

- Node.js (v18 or higher)
- pnpm (package manager)
- PostgreSQL database
- PartyKit account (for real-time features)
- GitHub OAuth App (for GitHub login)
- Google OAuth App (for Google login)
- Resend API key (for email functionality)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd deback-doko
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/deback-doko"

# Better Auth
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-key-here"

# GitHub OAuth
BETTER_AUTH_GITHUB_CLIENT_ID="your-github-client-id"
BETTER_AUTH_GITHUB_CLIENT_SECRET="your-github-client-secret"

# Google OAuth
BETTER_AUTH_GOOGLE_CLIENT_ID="your-google-client-id"
BETTER_AUTH_GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Resend (Email)
AUTH_RESEND_KEY="your-resend-api-key"
AUTH_RESEND_FROM_ADDRESS="noreply@yourdomain.com"

# PartyKit (optional for local development)
NEXT_PUBLIC_PARTYKIT_HOST="localhost:1999"
```

### 4. Set up the database

Run database migrations:

```bash
pnpm db:push
```

Or use migrations:

```bash
pnpm db:migrate
```

### 5. Run the development server

Start both Next.js and PartyKit development servers:

```bash
pnpm dev
```

This will start:
- Next.js dev server on `http://localhost:3000`
- PartyKit dev server on `http://localhost:1999`

Or run them separately:

```bash
# Next.js only
pnpm dev:next

# PartyKit only
pnpm dev:partykit
```

## Available Scripts

- `pnpm dev` - Start development servers (Next.js + PartyKit)
- `pnpm build` - Create production build
- `pnpm start` - Start production server
- `pnpm preview` - Build and start production server
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm check` - Run Biome linter
- `pnpm check:write` - Run Biome linter and fix issues
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm deploy:partykit` - Deploy PartyKit server

## Project Structure

```
deback-doko/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (with-navigation)/  # Pages with bottom navigation
│   │   │   ├── page.tsx        # Home page
│   │   │   ├── tables/         # Game tables page
│   │   │   └── profile/        # User profile pages
│   │   ├── api/                # API routes
│   │   ├── game/               # Game pages
│   │   └── login/              # Authentication pages
│   ├── components/             # React components
│   │   ├── game/               # Game-related components
│   │   ├── profile/            # Profile components
│   │   ├── tables/             # Table components
│   │   ├── navigation.tsx      # Bottom navigation
│   │   └── ui/                 # shadcn/ui components
│   ├── server/                 # Server-side code
│   │   ├── better-auth/        # Auth configuration
│   │   ├── db/                 # Database setup
│   │   └── email/              # Email templates
│   ├── lib/                    # Utility functions
│   └── types/                  # TypeScript types
├── party/                      # PartyKit server code
│   ├── index.ts                # Main PartyKit server
│   └── game/                   # Game server logic
├── drizzle/                    # Database migrations
└── public/                     # Static assets
```

## Deployment

### Vercel (Next.js)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables in Vercel Dashboard
4. **Set up GitHub Secrets** (Required for automatic deployment):
   - Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
   - Add the following secrets:
     - `VERCEL_TOKEN` - Get from Vercel Dashboard → Settings → Tokens
     - `VERCEL_ORG_ID` - Get from Vercel Dashboard → Settings → General
     - `VERCEL_PROJECT_ID` - Get from Vercel Dashboard → Settings → General
   - Also add all environment variables that are needed for the build (same as in Vercel)
5. **Configure GitHub Branch Protection** (Recommended - prevents merges when CI fails):
   - Go to your GitHub repository → **Settings** → **Branches**
   - Add a branch protection rule for `main` (or `master`)
   - Enable **"Require status checks to pass before merging"**
   - Select the required status checks: `lint`, `typecheck`, `build`
   - Enable **"Require branches to be up to date before merging"**
   - Save the rule
6. **Automatic Deployment**:
   - The CI pipeline automatically deploys to Vercel after all checks pass
   - Deployment only happens on push to `main`/`master`, not on pull requests
   - The deploy job runs after lint, typecheck, and build jobs succeed

**Note**: 
- The CI pipeline runs three checks (lint, typecheck, build) that must all pass
- After successful checks, the pipeline automatically deploys to Vercel
- With branch protection enabled, failed checks prevent merging to main/master
- The status checks are automatically created by GitHub Actions when the workflow runs

### PartyKit

Deploy the PartyKit server:

```bash
pnpm deploy:partykit
```

### Database

Set up a PostgreSQL database (e.g., using Vercel Postgres, Supabase, or Railway) and update the `DATABASE_URL` environment variable.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs)
- [PartyKit Documentation](https://docs.partykit.io)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## License

Private project - All rights reserved
