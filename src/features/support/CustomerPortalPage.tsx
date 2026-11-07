import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowRight, Building2, CreditCard, FileText, LogOut, ShieldCheck } from "lucide-react";

type PortalService = {
  project: string; projectName: string; serviceId: string; serviceName: string; domain: string;
  accessStatus: string; invoiceAmount: string | null; paid: string | null; balance: string | null;
  currency: string; dueDate: string | null; invoiceUrl: string | null; paymentUrl: string | null;
};
type PortalPayment = {
  id: string; serviceName: string; amount: string; currency: string; status: string;
  createdAt: string | null; paidAt: string | null; receiptUrl: string | null;
};
type PortalAccount = { name: string; email: string; services: PortalService[]; payments: PortalPayment[] };
type Tab = "overview" | "invoices" | "payments";

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

async function readError(response: Response) {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? `Request failed (${response.status})`;
}

function money(amount: string | null, currency: string) {
  const number = Number(amount ?? 0);
  if (!Number.isFinite(number)) return `${currency} ${amount ?? "0"}`;
  return new Intl.NumberFormat("en-KE", { style: "currency", currency, minimumFractionDigits: 2 }).format(number);
}

function date(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(parsed);
}

export function CustomerPortalPage() {
  const [account, setAccount] = useState<PortalAccount | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch(`${apiBase}/customer/account`, { credentials: "include", cache: "no-store" });
      if (response.ok) setAccount(await response.json() as PortalAccount);
      else if (response.status === 401) setAccount(null);
      else throw new Error(await readError(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your account.");
    } finally { setChecking(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const outstanding = useMemo(() => {
    const totals = new Map<string, number>();
    account?.services.forEach(service => totals.set(service.currency, (totals.get(service.currency) ?? 0) + Math.max(0, Number(service.balance ?? 0))));
    return [...totals].filter(([, total]) => total > 0).map(([currency, total]) => money(String(total), currency)).join(" · ") || money("0", account?.services[0]?.currency ?? "KES");
  }, [account]);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${apiBase}/customer/access/request`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const result = await response.json() as { challenge: string; message: string };
      setChallenge(result.challenge); setNotice("If an account matches that email, a sign-in code has been sent.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not request a sign-in code."); }
    finally { setBusy(false); }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${apiBase}/customer/access/verify`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge, code }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setCode(""); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not verify the code."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await fetch(`${apiBase}/customer/access/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    setAccount(null); setChallenge(""); setEmail(""); setTab("overview");
  }

  async function download(path: string, filename: string) {
    setError("");
    try {
      const response = await fetch(`${apiBase.replace(/\/api$/, "")}${path}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not download the document."); }
  }

  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="/" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white"><ShieldCheck className="h-5 w-5" /></span><span><strong className="block text-sm">Gatekeeperd</strong><small className="text-slate-500">Customer portal</small></span></a>
        {account && <button onClick={() => void signOut()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sign out</button>}
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {account && new URLSearchParams(window.location.search).get("payment") === "success" && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Payment confirmed. Your invoice balance has been refreshed.</div>}
      {account && new URLSearchParams(window.location.search).get("payment") === "pending" && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">We could not confirm the payment yet. Refresh your account in a moment or contact support if you have already been charged.</div>}
      {checking ? <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">Loading your account…</div> : account ? <>
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-sm font-medium text-indigo-700">YOUR ACCOUNT</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome{account.name ? `, ${account.name}` : ""}</h1><p className="mt-2 text-slate-600">Invoices, payments, and service access for {account.email}.</p></div>
          <a href="mailto:hello@mikesplore.me?subject=Hosting%20support" className="text-sm font-medium text-indigo-700 hover:underline">Need help?</a>
        </section>
        <nav aria-label="Portal sections" className="mt-8 flex gap-2 border-b border-slate-200">
          {([ ["overview", "Overview"], ["invoices", "Invoices"], ["payments", "Payments & receipts"] ] as [Tab, string][]).map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{label}</button>)}
        </nav>
        {tab === "overview" && <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Summary label="Outstanding" value={outstanding} detail="Across your services" />
            <Summary label="Services" value={String(account.services.length)} detail="Linked to your account" />
            <Summary label="Successful payments" value={String(account.payments.filter(payment => payment.status.toLowerCase() === "success").length)} detail="Receipts available below" />
          </div>
          <section className="mt-8"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold">Your services</h2><p className="mt-1 text-sm text-slate-500">Current access and the latest invoice balance.</p></div><button onClick={() => setTab("invoices")} className="text-sm font-medium text-indigo-700">View invoices <ArrowRight className="inline h-4 w-4" /></button></div><ServiceCards services={account.services} download={download} /></section>
        </>}
        {tab === "invoices" && <section className="mt-6"><h2 className="text-lg font-semibold">Invoices</h2><p className="mt-1 text-sm text-slate-500">Review charges and download invoice documents.</p><div className="mt-4"><ServiceCards services={account.services} download={download} /></div></section>}
        {tab === "payments" && <section className="mt-6"><h2 className="text-lg font-semibold">Payments and receipts</h2><p className="mt-1 text-sm text-slate-500">Receipts are available for confirmed payments.</p><div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">{account.payments.length === 0 ? <p className="p-6 text-sm text-slate-500">No payments have been recorded yet.</p> : <div className="divide-y divide-slate-100">{account.payments.map(payment => <div key={payment.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{payment.serviceName}</p><p className="mt-1 text-sm text-slate-500">{date(payment.paidAt ?? payment.createdAt)} · <span className="capitalize">{payment.status}</span></p></div><div className="flex items-center gap-4"><strong>{money(payment.amount, payment.currency)}</strong>{payment.receiptUrl && <button onClick={() => void download(payment.receiptUrl!, `receipt-${payment.id}.pdf`)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"><ArrowDownToLine className="h-4 w-4" /> Receipt</button>}</div></div>)}</div>}</div></section>}
      </> : <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><CreditCard className="h-5 w-5" /></div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in to your billing portal</h1><p className="mt-2 text-sm leading-6 text-slate-600">Use the email address on your Gatekeeperd customer account. We’ll send a one-time sign-in code.</p>
        {!challenge ? <form onSubmit={requestCode} className="mt-6 space-y-4"><label className="block text-sm font-medium">Email address<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label><button disabled={busy} className="h-11 w-full rounded-lg bg-indigo-600 px-4 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">{busy ? "Sending…" : "Send sign-in code"}</button></form> : <form onSubmit={verifyCode} className="mt-6 space-y-4"><p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p><label className="block text-sm font-medium">Six-digit code<input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 font-mono tracking-[0.3em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label><button disabled={busy || code.length !== 6} className="h-11 w-full rounded-lg bg-indigo-600 px-4 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">{busy ? "Checking…" : "Verify and continue"}</button><button type="button" onClick={() => { setChallenge(""); setCode(""); setNotice(""); }} className="w-full py-2 text-sm text-slate-600 hover:text-slate-950">Use a different email</button></form>}
        {notice && !challenge && <p className="mt-4 text-sm text-slate-600">{notice}</p>}
        <p className="mt-6 border-t pt-5 text-xs leading-5 text-slate-500">No password needed. Your one-time code is delivered to the email registered with your hosting provider.</p>
      </section>}
      <footer className="mt-12 border-t border-slate-200 pt-5 text-xs text-slate-500">Payments are processed through the payment options presented at checkout. Your hosting provider manages service terms and technical support.</footer>
    </main>
  </div>;
}

function Summary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}

function ServiceCards({ services, download }: { services: PortalService[]; download: (path: string, filename: string) => Promise<void> }) {
  if (services.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Building2 className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-3 font-medium">No services linked to this account</p><p className="mt-1 text-sm text-slate-500">Contact your hosting provider if this seems unexpected.</p></div>;
  return <div className="grid gap-4">{services.map(service => <article key={service.serviceId} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{service.serviceName}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${service.accessStatus.toLowerCase() === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{service.accessStatus}</span></div><p className="mt-1 text-sm text-slate-500">{service.projectName} · {service.domain}</p></div><div className="text-left sm:text-right"><p className="text-xs uppercase tracking-wide text-slate-500">Balance</p><p className="mt-1 text-xl font-semibold">{money(service.balance, service.currency)}</p></div></div>
    {service.invoiceAmount !== null && <div className="mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3"><div><span className="text-slate-500">Invoice total</span><p className="mt-1 font-medium">{money(service.invoiceAmount, service.currency)}</p></div><div><span className="text-slate-500">Paid</span><p className="mt-1 font-medium">{money(service.paid, service.currency)}</p></div><div><span className="text-slate-500">Due date</span><p className="mt-1 font-medium">{date(service.dueDate)}</p></div></div>}
    <div className="mt-5 flex flex-wrap gap-2">{service.paymentUrl && Number(service.balance ?? 0) > 0 && <a href={service.paymentUrl} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700">Pay balance <ArrowRight className="h-4 w-4" /></a>}{service.invoiceUrl && <button onClick={() => void download(service.invoiceUrl!, `invoice-${service.project}-${service.serviceId}.pdf`)} className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-slate-50"><FileText className="h-4 w-4" /> Download invoice</button>}</div>
    </article>)}</div>;
}
