import { useEffect, useState, type FormEvent } from "react";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { useInitializePayment, useInitiateMpesaPayment } from "@/hooks/useProjects";
import { useCaptureCashPayment } from "@/hooks/usePayments";
import { getApiErrorMessage } from "@/lib/api";
import type { Project } from "@/types/project";

type PaymentMethod = "paystack" | "mpesa" | "cash";

export function CapturePaymentDrawer({ project, open, onOpenChange, onPaymentChanged }: { project: Project; open: boolean; onOpenChange: (open: boolean) => void; onPaymentChanged?: () => Promise<unknown> | void }) {
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [email, setEmail] = useState(project.customerEmail ?? "");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState((project.remainingBalance ?? project.amountDue ?? 0).toString());
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [receiptNumber, setReceiptNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const balance = project.remainingBalance ?? project.amountDue ?? 0;
  const numericAmount = Number(amount);
  const amountValid = Number.isFinite(numericAmount) && numericAmount > 0 && numericAmount <= balance;
  const initializePaystack = useInitializePayment(project.slug);
  const initiateMpesa = useInitiateMpesaPayment();
  const captureCash = useCaptureCashPayment(project.slug);

  useEffect(() => {
    if (!open) return;
    setMethod("");
    setEmail(project.customerEmail ?? "");
    setPhone("");
    setAmount((project.remainingBalance ?? project.amountDue ?? 0).toString());
    setPaidAt(new Date().toISOString().slice(0, 16));
    setReceiptNumber("");
    setNotes("");
    setPaymentLink(null);
  }, [open, project.customerEmail, project.remainingBalance, project.amountDue]);

  const close = () => onOpenChange(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!method) { toast.error("Select a payment method"); return; }
    if (!amountValid) { toast.error("Enter an amount within the remaining balance"); return; }
    try {
      if (method === "paystack") {
        const response = await initializePaystack.mutateAsync({ email: email.trim() || undefined, amount: numericAmount });
        setPaymentLink(response.data.payment_link);
        toast.success("Paystack payment link created");
        await onPaymentChanged?.();
      } else if (method === "mpesa") {
        if (!phone.trim()) { toast.error("Enter the customer's M-Pesa phone number"); return; }
        await initiateMpesa.mutateAsync({ slug: project.slug, phone: phone.trim(), amount: numericAmount });
        toast.success("M-Pesa prompt sent to the customer");
        await onPaymentChanged?.();
        close();
      } else {
        await captureCash.mutateAsync({
          amount: numericAmount,
          currency: project.currency,
          paidAt: paidAt || undefined,
          receiptNumber: receiptNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success("Cash payment recorded");
        await onPaymentChanged?.();
        close();
      }
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  const copyLink = async () => {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink);
    toast.success("Paystack link copied");
  };

  const pending = initializePaystack.isPending || initiateMpesa.isPending || captureCash.isPending;

  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader className="border-b px-6 py-5 pr-14">
          <SidePanelTitle className="text-base">Capture payment</SidePanelTitle>
          <SidePanelDescription className="text-xs">Choose how to collect or record a payment for {project.name}.</SidePanelDescription>
        </SidePanelHeader>
        <form onSubmit={submit} className="space-y-4 px-6 py-6 text-sm [&_label]:text-xs [&_input]:h-8">
          <div className="space-y-2">
            <Label htmlFor="capture-method">Payment method</Label>
            <Select value={method} onValueChange={(value) => { setMethod(value as PaymentMethod); setPaymentLink(null); }}>
              <SelectTrigger id="capture-method"><SelectValue placeholder="Select payment method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paystack">Paystack · shareable link</SelectItem>
                <SelectItem value="mpesa" disabled={project.currency.toUpperCase() !== "KES"}>M-Pesa · customer prompt</SelectItem>
                <SelectItem value="cash">Cash · record received payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method && <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">Partial payments apply to the balance. Access activates when the balance is paid in full.</div>}

          {method === "paystack" && <div className="space-y-2"><Label htmlFor="capture-email">Customer email</Label><Input id="capture-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="customer@example.com" /></div>}
          {method === "mpesa" && <div className="space-y-2"><Label htmlFor="capture-phone">M-Pesa phone number</Label><Input id="capture-phone" value={phone} onChange={event => setPhone(event.target.value)} placeholder="2547XXXXXXXX" />{amountValid && !Number.isInteger(numericAmount) && <p className="text-xs text-muted-foreground">M-Pesa accepts whole KES amounts.</p>}</div>}

          {method && <div className="space-y-2">
            <Label htmlFor="capture-amount">Amount ({project.currency})</Label>
            <Input id="capture-amount" type="number" min="0.01" max={balance} step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required />
            <p className="text-xs text-muted-foreground">Remaining balance: {project.currency} {balance.toLocaleString()}.</p>
          </div>}

          {method === "cash" && <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="cash-paid-at">Payment date</Label><Input id="cash-paid-at" type="datetime-local" value={paidAt} onChange={event => setPaidAt(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="cash-receipt">Receipt number</Label><Input id="cash-receipt" value={receiptNumber} onChange={event => setReceiptNumber(event.target.value)} placeholder="Optional" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="cash-notes">Notes</Label><textarea id="cash-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Optional payment notes" /></div>
          </>}

          {paymentLink && <div className="space-y-2 rounded-md border bg-muted/30 p-3"><Label>Paystack payment link</Label><div className="flex gap-2"><Input readOnly value={paymentLink} className="font-mono text-xs" /><Button type="button" variant="outline" size="icon" aria-label="Copy Paystack payment link" onClick={copyLink}><Copy className="h-4 w-4" /></Button></div></div>}

          <SidePanelFooter className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={close}>Close</Button>
            {method && !paymentLink && <Button type="submit" disabled={pending || !amountValid || (method === "mpesa" && (!phone.trim() || !Number.isInteger(numericAmount)))}>
              {method === "paystack" ? <><Link2 className="h-4 w-4" />{pending ? "Creating link…" : "Create Paystack link"}</> : method === "mpesa" ? (pending ? "Sending prompt…" : "Send M-Pesa prompt") : (pending ? "Capturing…" : "Capture payment")}
            </Button>}
          </SidePanelFooter>
        </form>
      </SidePanelContent>
    </SidePanel>
  );
}
