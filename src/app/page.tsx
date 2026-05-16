import Link from "next/link";

import { StartCheckoutButton } from "@/components/billing/start-checkout-button";

const PROBLEM_CARDS = [
  {
    title: "Rows get outdated",
    body: "Once a bid is submitted, the spreadsheet row sits still while the real project keeps moving.",
  },
  {
    title: "Follow-ups get missed",
    body: "Important calls and check-ins slip when follow-up dates are buried inside a file nobody checks in time.",
  },
  {
    title: "Contacts are scattered",
    body: "GC names, phone numbers, and emails live in inboxes, notebooks, and phones instead of one shared workspace.",
  },
  {
    title: "Formatting turns into a mess",
    body: "One accidental sort, hidden column, or overwritten cell can throw the whole bid log off.",
  },
  {
    title: "No accountability",
    body: "It is hard to tell who changed a bid, when the status moved, or whether anybody followed up.",
  },
];

const FEATURE_CARDS = [
  {
    title: "Bid Status Dashboard",
    body: "See your current bids in one clean dashboard built for estimators, admins, and owners.",
  },
  {
    title: "Status Tabs",
    body: "Move bids between Bid Status, Pending Award, Awarded, Lost / Dead, and On Hold without maintaining separate spreadsheets.",
  },
  {
    title: "Follow-Up Tracking",
    body: "Set next follow-up dates and quickly see what is due today, overdue, or coming up this week.",
  },
  {
    title: "GC & Contact Manager",
    body: "Keep your contractors and contacts tied to the right companies so future bids are faster to enter.",
  },
  {
    title: "Notes & Activity",
    body: "Store notes and review bid history so the team can see what changed and who touched it.",
  },
  {
    title: "Built for Teams",
    body: "Your company works from one shared bid workspace instead of everyone maintaining their own copy of the file.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Add a bid",
    body: "Create a bid with project details, GC info, contacts, notes, and key dates in one place.",
  },
  {
    step: "2",
    title: "Track the status",
    body: "Move bids between Bid Status, Pending Award, Awarded, Lost / Dead, and On Hold as work progresses.",
  },
  {
    step: "3",
    title: "Follow up smarter",
    body: "Sort and filter by follow-up dates so your team can focus on what is due today, overdue, or coming up this week.",
  },
];

const FAQS = [
  {
    question: "Is this replacing my Excel bid log?",
    answer:
      "Yes. BidBoard is designed to replace the spreadsheet you use to track bids, statuses, contacts, follow-up dates, and notes.",
  },
  {
    question: "Can my team use it?",
    answer:
      "Yes. BidBoard is built around company workspaces, so your team can work from the same bid dashboard.",
  },
  {
    question: "Can I track awarded and lost jobs?",
    answer:
      "Yes. Bids can be moved between Bid Status, Pending Award, Awarded, Lost / Dead, and On Hold.",
  },
  {
    question: "Does it send follow-up emails?",
    answer:
      "Not yet. The current version focuses on organizing bids and follow-up dates. Email reminders can be added later.",
  },
  {
    question: "How much does it cost?",
    answer: "BidBoard is $10/month.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  centered?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-3 ${centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}`}>
      {eyebrow ? (
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)]">{eyebrow}</span>
      ) : null}
      <h2 className="font-[family-name:var(--font-chivo)] text-4xl font-semibold tracking-tight text-[var(--app-primary)] sm:text-5xl">
        {title}
      </h2>
      {body ? <p className="text-base leading-7 text-[var(--app-text-muted)] sm:text-lg">{body}</p> : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[rgba(246,247,243,0.92)] backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1520px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <Link className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]" href="/">
            BidBoard
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a className="text-sm font-medium text-[var(--app-text-muted)] transition hover:text-[var(--app-primary)]" href="#problem">
              Problem
            </a>
            <a className="text-sm font-medium text-[var(--app-text-muted)] transition hover:text-[var(--app-primary)]" href="#features">
              Features
            </a>
            <a className="text-sm font-medium text-[var(--app-text-muted)] transition hover:text-[var(--app-primary)]" href="#how-it-works">
              How It Works
            </a>
            <a className="text-sm font-medium text-[var(--app-text-muted)] transition hover:text-[var(--app-primary)]" href="#pricing">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link className="hidden text-sm font-medium text-[var(--app-text-muted)] transition hover:text-[var(--app-primary)] sm:inline-flex" href="/login">
              Sign In
            </Link>
            <StartCheckoutButton
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--app-primary)] bg-[var(--app-primary)] px-5 text-sm font-medium text-white transition hover:opacity-95"
              errorClassName="text-sm text-[var(--app-danger)]"
              label="Start for $10/month"
              loadingLabel="Starting checkout..."
            />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 lg:px-8">
        <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-[var(--app-primary-soft)] blur-3xl" />
        <div className="absolute right-[-6rem] top-10 h-80 w-80 rounded-full bg-[var(--app-accent-soft)] blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-[1520px] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)] lg:items-center">
          <div className="flex flex-col gap-7">
            <div className="flex max-w-fit items-center rounded-full border border-[var(--app-border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text-muted)] shadow-sm">
              Built for construction bid tracking
            </div>
            <div className="flex flex-col gap-5">
              <h1 className="max-w-3xl font-[family-name:var(--font-chivo)] text-5xl font-semibold tracking-tight text-[var(--app-primary)] sm:text-6xl lg:text-7xl">
                Stop tracking bids in messy spreadsheets.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--app-text-muted)] sm:text-xl">
                BidBoard gives construction teams one clean place to track bids, follow-ups, GCs, contacts, notes, and
                job status — without fighting Excel.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <StartCheckoutButton
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--app-accent)] bg-[var(--app-accent)] px-6 text-base font-medium text-[var(--app-primary)] shadow-lg transition hover:translate-y-[-1px] hover:shadow-xl"
                errorClassName="text-sm text-[var(--app-danger)]"
                label="Start for $10/month"
                loadingLabel="Starting checkout..."
              />
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--app-text-muted)]">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[var(--app-warning)]">
                  ✓
                </span>
                No setup fees. Cancel anytime.
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[32px] bg-[var(--app-primary)]/5 blur-2xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-[var(--app-border)] bg-white shadow-[var(--app-shadow)]">
              <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-primary)] px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[var(--app-danger)]" />
                  <span className="h-3 w-3 rounded-full bg-[var(--app-accent)]" />
                  <span className="h-3 w-3 rounded-full bg-white/30" />
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <span className="h-2 w-2 rounded-full bg-white/70" />
                  <span className="h-2 w-2 rounded-full bg-white/45" />
                </div>
              </div>

              <div className="flex flex-col gap-5 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">
                      Bid Status Dashboard
                    </h3>
                    <p className="mt-1 text-sm text-[var(--app-text-muted)]">Track active bids without spreadsheet drift.</p>
                  </div>
                  <div className="inline-flex items-center rounded-xl bg-[var(--app-accent-soft)] px-3 py-2 text-sm font-medium text-[var(--app-warning)]">
                    + New Bid
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Active</p>
                    <p className="mt-2 font-[family-name:var(--font-chivo)] text-2xl font-semibold text-[var(--app-primary)]">18</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Pending</p>
                    <p className="mt-2 font-[family-name:var(--font-chivo)] text-2xl font-semibold text-[var(--app-primary)]">7</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--app-accent)] bg-[var(--app-accent-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-warning)]">Due Today</p>
                    <p className="mt-2 font-[family-name:var(--font-chivo)] text-2xl font-semibold text-[var(--app-warning)]">5</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--app-danger)] bg-[var(--app-danger-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-danger)]">Overdue</p>
                    <p className="mt-2 font-[family-name:var(--font-chivo)] text-2xl font-semibold text-[var(--app-danger)]">3</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[var(--app-border)]">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead className="bg-[var(--app-surface-muted)]">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Project</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">GC</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--app-border)] bg-white text-sm">
                      <tr>
                        <td className="px-4 py-4 font-medium text-[var(--app-primary)]">Lancaster Medical Office</td>
                        <td className="px-4 py-4 text-[var(--app-text-muted)]">Horizon GC</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-[var(--app-accent)] bg-[var(--app-accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-warning)]">
                            Due Today
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[var(--app-text)]">$142,500</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-medium text-[var(--app-primary)]">Riverfront High School</td>
                        <td className="px-4 py-4 text-[var(--app-text-muted)]">Apex Build</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-[#c7d7f4] bg-[var(--app-primary-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-primary)]">
                            Bid Status
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[var(--app-text)]">$89,200</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-medium text-[var(--app-primary)]">Main St Apartments</td>
                        <td className="px-4 py-4 text-[var(--app-text-muted)]">Stellar Construction</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-[var(--app-border)] bg-[var(--app-muted-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                            Pending Award
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[var(--app-text)]">$210,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--app-primary)] px-4 py-24 text-white sm:px-6 lg:px-8" id="problem">
        <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-12">
          <SectionHeading
            body="Stop letting important bids, follow-ups, and GC relationships disappear into a spreadsheet nobody trusts anymore."
            centered
            title="Excel works… until it doesn’t."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {PROBLEM_CARDS.map((card) => (
              <article className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm" key={card.title}>
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-accent-soft)] text-lg font-semibold text-[var(--app-warning)]">
                  •
                </div>
                <h3 className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/75">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-8" id="features">
        <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-12">
          <SectionHeading
            centered
            title="BidBoard turns your bid log into a real dashboard."
          />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {FEATURE_CARDS.map((card) => (
              <article className="rounded-[28px] border border-[var(--app-border)] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--app-shadow)]" key={card.title}>
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-accent-soft)] text-lg font-semibold text-[var(--app-warning)]">
                  +
                </div>
                <h3 className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--app-primary)] px-4 py-24 text-white sm:px-6 lg:px-8" id="how-it-works">
        <div className="mx-auto grid w-full max-w-[1520px] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)] lg:items-center">
          <div className="flex flex-col gap-8">
            <SectionHeading
              body="The workflow stays simple: enter the bid, move the status, and keep follow-up dates visible."
              title="How it works"
            />
            <div className="flex flex-col gap-8">
              {HOW_IT_WORKS.map((item) => (
                <div className="flex gap-5" key={item.step}>
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent)] font-semibold text-[var(--app-primary)]">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/75">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
            <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.08)] p-6">
              <div className="grid gap-4">
                <div className="rounded-2xl bg-white px-5 py-4 text-[var(--app-primary)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Step 1</p>
                  <p className="mt-2 font-[family-name:var(--font-chivo)] text-2xl font-semibold">Add a bid with the right GC and dates.</p>
                </div>
                <div className="rounded-2xl bg-white/90 px-5 py-4 text-[var(--app-primary)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Step 2</p>
                  <p className="mt-2 font-[family-name:var(--font-chivo)] text-2xl font-semibold">Move it through the real status pipeline.</p>
                </div>
                <div className="rounded-2xl bg-[var(--app-accent-soft)] px-5 py-4 text-[var(--app-primary)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-warning)]">Step 3</p>
                  <p className="mt-2 font-[family-name:var(--font-chivo)] text-2xl font-semibold">See what needs follow-up before it slips.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--app-surface-muted)] px-4 py-24 sm:px-6 lg:px-8" id="pricing">
        <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-12">
          <SectionHeading
            body="Everything you need to replace the spreadsheet and run bid tracking from one company workspace."
            centered
            title="Simple pricing. No overthinking it."
          />

          <div className="mx-auto w-full max-w-xl rounded-[32px] border border-[var(--app-border)] bg-white p-8 shadow-[var(--app-shadow)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-[family-name:var(--font-chivo)] text-3xl font-semibold tracking-tight text-[var(--app-primary)]">
                  BidBoard
                </h3>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">Built by Modernized Visions for construction bid tracking.</p>
              </div>
              <span className="rounded-full bg-[var(--app-accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-warning)]">
                $10/month
              </span>
            </div>

            <ul className="mt-8 grid gap-4 text-sm text-[var(--app-text)]">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[10px] font-semibold text-[var(--app-warning)]">✓</span>
                Bid tracking
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[10px] font-semibold text-[var(--app-warning)]">✓</span>
                GC/contact manager
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[10px] font-semibold text-[var(--app-warning)]">✓</span>
                Status dashboards
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[10px] font-semibold text-[var(--app-warning)]">✓</span>
                Follow-up date tracking
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[10px] font-semibold text-[var(--app-warning)]">✓</span>
                Notes and activity history
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[10px] font-semibold text-[var(--app-warning)]">✓</span>
                Team access through your company workspace
              </li>
            </ul>

            <div className="mt-8">
              <StartCheckoutButton
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-[var(--app-primary)] bg-[var(--app-primary)] px-6 text-base font-medium text-white transition hover:opacity-95"
                errorClassName="mt-2 text-sm text-[var(--app-danger)]"
                label="Start for $10/month"
                loadingLabel="Starting checkout..."
              />
              <p className="mt-3 text-center text-sm text-[var(--app-text-muted)]">Checkout is handled securely through Stripe.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-8" id="faq">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
          <SectionHeading centered title="Frequently Asked Questions" />
          <div className="grid gap-4">
            {FAQS.map((item) => (
              <article className="rounded-[24px] border border-[var(--app-border)] bg-white p-6 shadow-sm" key={item.question}>
                <h3 className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight text-[var(--app-primary)]">
                  {item.question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--app-primary)] px-4 py-24 text-white sm:px-6 lg:px-8">
        <div className="absolute right-[-6rem] top-[-4rem] h-72 w-72 rounded-full bg-[var(--app-accent)]/20 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 text-center">
          <h2 className="font-[family-name:var(--font-chivo)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Clean up your bid tracking.
          </h2>
          <p className="max-w-3xl text-lg leading-8 text-white/80">
            Stop relying on a spreadsheet that only works when everyone updates it perfectly. BidBoard gives your team
            a simple dashboard built for construction bidding.
          </p>
          <StartCheckoutButton
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--app-accent)] bg-[var(--app-accent)] px-8 text-base font-medium text-[var(--app-primary)] shadow-lg transition hover:translate-y-[-1px] hover:shadow-xl"
            errorClassName="text-sm text-white/80"
            label="Start for $10/month"
            loadingLabel="Starting checkout..."
          />
        </div>
      </section>

      <footer className="border-t border-[var(--app-border)] bg-[var(--app-primary)] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-[family-name:var(--font-chivo)] text-2xl font-semibold tracking-tight">BidBoard</p>
            <p className="mt-2 text-sm text-white/65">Built by Modernized Visions</p>
          </div>

          <nav className="flex flex-wrap gap-5 text-sm text-white/75">
            <Link className="transition hover:text-white" href="/login">
              Sign In
            </Link>
            <a className="transition hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-white" href="#">
              Privacy
            </a>
            <a className="transition hover:text-white" href="#">
              Terms
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
