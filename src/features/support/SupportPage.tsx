import { ArrowUpRight, CircleHelp, CreditCard, Mail, ShieldCheck, WalletCards } from "lucide-react";

const questions = [
  {
    question: "What does my hosting invoice cover?",
    answer: "Your invoice lists the hosted service and the charges agreed with your hosting provider. If something does not look right, contact your provider before paying.",
  },
  {
    question: "How do I pay an invoice?",
    answer: "Use the payment link in the invoice email and follow the instructions there. Never share your password, card security code, or mobile money PIN by email.",
  },
  {
    question: "I have paid, but my service is still paused. What should I do?",
    answer: "Access is restored after the payment is confirmed. If your service is still paused after confirmation, contact support with the service address and payment reference. Do not include card details or PINs.",
  },
  {
    question: "What happens if I miss a due date?",
    answer: "Check the due date and payment terms on your invoice. If you may pay late, contact your hosting provider as soon as possible to discuss your account.",
  },
  {
    question: "Can I change my website or hosting settings here?",
    answer: "This page is for billing and support. Your hosting provider manages technical changes to your website and hosting setup.",
  },
];

export function SupportPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">Gatekeeperd</p>
            <p className="text-xs text-slate-500">Customer assistance</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-emerald-700">HOSTING SUPPORT</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">How can we help?</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Find answers about your hosting invoice, payments, and service access. For changes to your website, contact your hosting provider.
          </p>
        </section>

        <section aria-label="Support topics" className="mt-10 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <WalletCards className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            <h2 className="mt-4 font-semibold">Invoices and due dates</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Your invoice email has the service description, amount, due date, and payment instructions.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <CreditCard className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            <h2 className="mt-4 font-semibold">Payments and receipts</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Pay using the link in your invoice. Keep the payment confirmation or reference for your records.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <CircleHelp className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            <h2 className="mt-4 font-semibold">Service access</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">If access is paused, check your invoice and contact your provider if you need help.</p>
          </article>
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <section aria-labelledby="faq-heading">
            <div className="mb-5 flex items-center gap-2">
              <CircleHelp className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h2 id="faq-heading" className="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
            </div>
            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
              {questions.map(({ question, answer }) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:hidden">
                    {question}
                    <span className="text-xl text-slate-400 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 max-w-3xl pr-8 text-sm leading-6 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <aside className="h-fit rounded-2xl bg-slate-950 p-6 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">Still need help?</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Email your hosting provider and include the service address and invoice number, if available.
            </p>
            <a
              className="mt-5 inline-flex items-center gap-2 font-medium text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
              href="mailto:hello@mikesplore.me?subject=Hosting%20support"
            >
              Contact support <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </aside>
        </div>

        <footer className="mt-14 border-t border-slate-200 pt-6 text-sm text-slate-500">
          Your hosting provider is responsible for the service and any terms agreed with you.
        </footer>
      </main>
    </div>
  );
}
