# spec.ai

Full-stack resume review app built with Next.js App Router, Tailwind CSS,
Shadcn UI, Supabase, Stripe, OpenAI, and `pdf-parse`.

## Setup

1. Copy `.env.example` to `.env.local` and fill in the Supabase, OpenAI, and
   Stripe values.
2. Run `supabase/schema.sql` in your Supabase SQL editor.
3. Create a Stripe recurring price and set `STRIPE_PRO_PRICE_ID`.
4. Point Stripe webhooks at `/api/webhooks/stripe` and subscribe to
   `checkout.session.completed`.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Notes

- Supabase RLS protects `profiles`, `resumes`, and private `resumes` storage
  objects by `auth.uid()`.
- Resume analysis happens in `app/actions.ts`: PDF text extraction,
  gpt-4o-mini JSON analysis, storage upload, and database insert.
- Stripe webhook updates `profiles.plan` to `pro` with the Supabase service
  role key.
