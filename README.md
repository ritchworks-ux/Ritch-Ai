# Ritch Tribiana AI Portfolio

Minimal, production-ready Next.js portfolio for Ritch Tribiana with a Groq-powered AI assistant focused on Enterprise IT Support.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`.

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Environment variables

Create `.env.local` with:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

Notes:
- Keep `GROQ_API_KEY` server-side only.
- Do not use `NEXT_PUBLIC_GROQ_API_KEY`.
- The browser calls `/api/chat`, and `/api/chat` calls Groq securely on the server.
- `LEARNING_WEBHOOK_URL` is optional and is used only for consented, sanitized learning summaries.

## Build for production

```bash
npm run build
```

## Deploy to Vercel

1. Push the project to a Git repository.
2. Import the repository into Vercel.
3. Add the same environment variables in the Vercel project settings:
   - `GROQ_API_KEY`
   - `GROQ_MODEL`
4. Deploy.

The app is already structured for Vercel using the Next.js App Router.

## Update profile context

Edit [app/data/profile-context.ts](/Users/aiagent/Documents/AI Portfolio Ritch/app/data/profile-context.ts) to refine the approved resume-derived profile context.

Use this file for:
- Summary updates
- Tooling updates
- Support scope updates
- Safety and learning guidance updates

## Update LinkedIn context

Edit [app/data/linkedin-context.ts](/Users/aiagent/Documents/AI Portfolio Ritch/app/data/linkedin-context.ts).

The file currently includes a TODO placeholder because the live LinkedIn profile was not scraped into this repo. Paste approved content for:
- About
- Experience
- Skills
- Certifications

## Update service FAQ context

Edit [app/data/service-faq.ts](/Users/aiagent/Documents/AI Portfolio Ritch/app/data/service-faq.ts).

Use this file to add or revise reviewed answers for recurring hiring-manager or client questions.

## Safe AI learning strategy

This project does not auto-train on visitor chats.

Recommended safe approach:
- Track only anonymized question categories if analytics are added.
- Never store passwords, MFA codes, API keys, secrets, private employee data, or confidential records.
- Review repeated questions manually.
- Convert repeated, approved questions into curated FAQ entries.
- Keep future prompt context limited to Ritch-reviewed profile and FAQ content.
- Route serious service inquiries to email or a future automation workflow such as `n8n`.

This project now includes a safe consented learning endpoint at `/api/learning`.
- It captures only anonymized, sanitized summaries when the visitor explicitly opts in.
- It does not auto-train the model on raw visitor chats.
- It redacts obvious sensitive terms, emails, and phone numbers before forwarding.
- If `LEARNING_WEBHOOK_URL` is set, the app forwards the sanitized summary to your webhook or `n8n` flow.
- If `LEARNING_WEBHOOK_URL` is not set, the app skips persistence and logs a safe informational message server-side.
