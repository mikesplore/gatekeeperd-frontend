import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Copy, ExternalLink, Link2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { CreateServiceInvoiceDialog } from "@/features/payments/CreateServiceInvoiceDialog";
import { useInitializePayment, useInitiateMpesaPayment, useReconcilePayment } from "@/hooks/useProjects";
import { useCaptureCashPayment, useServiceInvoice, useServicePayments } from "@/hooks/usePayments";
import { useProjectServices } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import type { Project } from "@/types/project";

type PaymentMethod = "paystack" | "mpesa" | "cash";

export function CapturePaymentDrawer({ project, open, onOpenChange, onPaymentChanged, initialServiceId = "" }: { project: Project; open: boolean; onOpenChange: (open: boolean) => void; onPaymentChanged?: () => Promise<unknown> | void; initialServiceId?: string }) {
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [serviceId, setServiceId] = useState("");
  const [email, setEmail] = useState(project.customerEmail ?? "");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [receiptNumber, setReceiptNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [mpesaReference, setMpesaReference] = useState("");
  const [mpesaFinalStatus, setMpesaFinalStatus] = useState<"failed" | "abandoned" | "reversed" | null>(null);
  const [mpesaQueryError, setMpesaQueryError] = useState<string | null>(null);
  const [mpesaCheckCoolingDown, setMpesaCheckCoolingDown] = useState(false);
  const mpesaCooldownTimer = useRef<number | null>(null);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const services = useProjectServices(project.id);
  const selectedService = services.data?.find(service => service.id === serviceId);
  const serviceInvoice = useServiceInvoice(project.id, serviceId);
  const servicePayments = useServicePayments(project.id, serviceId, 25, 0, open && mpesaReference ? 10_000 : false);
  const mpesaPayment = servicePayments.data?.payments.find(payment => payment.providerReference === mpesaReference);
  const serviceBalance = Number(serviceInvoice.data?.invoice.balance ?? 0);
  const balance = serviceBalance;
  const numericAmount = Number(amount);
  const amountValid = Number.isFinite(numericAmount) && numericAmount > 0 && numericAmount <= balance;
  const initializePaystack = useInitializePayment(project.slug);
  const initiateMpesa = useInitiateMpesaPayment();
  const captureCash = useCaptureCashPayment(project.id);
  const reconcilePayment = useReconcilePayment();
  const mpesaPaymentId = mpesaPayment?.id;
  const mpesaPaymentStatus = mpesaPayment?.gatewayStatus;
  const handledMpesaResult = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMethod("");
    setServiceId(initialServiceId);
    setEmail(project.customerEmail ?? "");
    setPhone("");
    setAmount("");
    setPaidAt(new Date().toISOString().slice(0, 16));
    setReceiptNumber("");
    setNotes("");
    setPaymentLink(null);
    setMpesaReference("");
    setMpesaFinalStatus(null);
    setMpesaQueryError(null);
  }, [open, project.customerEmail, project.remainingBalance, project.amountDue, initialServiceId]);

  useEffect(() => {
    if (selectedService && serviceInvoice.data) setAmount(serviceBalance.toString());
  }, [selectedService, serviceInvoice.data, serviceBalance]);

  useEffect(() => () => {
    if (mpesaCooldownTimer.current !== null) window.clearTimeout(mpesaCooldownTimer.current);
  }, []);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (mpesaPaymentId && mpesaPaymentStatus === "success" && handledMpesaResult.current !== mpesaPaymentId) {
      handledMpesaResult.current = mpesaPaymentId;
      toast.success("M-Pesa payment confirmed");
      void onPaymentChanged?.();
      close();
    } else if (mpesaPaymentId && mpesaPaymentStatus && ["failed", "abandoned", "reversed"].includes(mpesaPaymentStatus) && handledMpesaResult.current !== mpesaPaymentId) {
      handledMpesaResult.current = mpesaPaymentId;
      setMpesaFinalStatus(mpesaPaymentStatus as "failed" | "abandoned" | "reversed");
      toast.error(`M-Pesa payment ${mpesaPaymentStatus}`);
    }
  }, [mpesaPaymentId, mpesaPaymentStatus, onPaymentChanged, close]);

  const checkMpesaStatus = async () => {
    if (!mpesaPaymentId || reconcilePayment.isPending || mpesaCheckCoolingDown) return;
    setMpesaCheckCoolingDown(true);
    mpesaCooldownTimer.current = window.setTimeout(() => setMpesaCheckCoolingDown(false), 30_000);
    setMpesaQueryError(null);
    try {
      await reconcilePayment.mutateAsync(mpesaPaymentId);
      await servicePayments.refetch();
    } catch (error) {
      setMpesaQueryError(getApiErrorMessage(error));
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!method) { toast.error("Select a payment method"); return; }
    if (!serviceId) { toast.error("Select a service to pay for"); return; }
    if (!amountValid) { toast.error("Enter an amount within the remaining balance"); return; }
    try {
      if (method === "paystack") {
        const response = await initializePaystack.mutateAsync({ email: email.trim() || undefined, amount: numericAmount, serviceId });
        setPaymentLink(response.data.payment_link);
        toast.success("Paystack payment link created");
        await onPaymentChanged?.();
      } else if (method === "mpesa") {
        if (!phone.trim()) { toast.error("Enter the customer's M-Pesa phone number"); return; }
        setMpesaReference("");
        setMpesaFinalStatus(null);
        setMpesaQueryError(null);
        setMpesaCheckCoolingDown(false);
        if (mpesaCooldownTimer.current !== null) window.clearTimeout(mpesaCooldownTimer.current);
        mpesaCooldownTimer.current = null;
        handledMpesaResult.current = null;
        const response = await initiateMpesa.mutateAsync({ slug: project.slug, phone: phone.trim(), amount: numericAmount, serviceId });
        setMpesaReference(response.data.reference);
        toast.success("M-Pesa prompt sent to the customer");
      } else {
        await captureCash.mutateAsync({
          amount: numericAmount,
          currency: project.currency,
          paidAt: paidAt || undefined,
          receiptNumber: receiptNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          serviceId,
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
    <>
      <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader className="border-b px-6 py-5 pr-14">
          <SidePanelTitle className="text-base">Capture payment</SidePanelTitle>
          <SidePanelDescription className="text-xs">Choose how to collect or record a payment for {project.name}.</SidePanelDescription>
        </SidePanelHeader>
        <form onSubmit={submit} className="space-y-4 px-6 py-6 text-sm [&_label]:text-xs [&_input]:h-8">
          <div className="space-y-2">
            <Label htmlFor="capture-service">Service</Label>
            <Select value={serviceId} onValueChange={value => { setServiceId(value); setAmount(""); setPaymentLink(null); }}>
              <SelectTrigger id="capture-service"><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {(services.data ?? []).map(service => <SelectItem key={service.id} value={service.id}>{service.name} service</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedService && serviceInvoice.isError && <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <span>This service has no available invoice. Create its service invoice first.</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setCreateInvoiceOpen(true)}>Create invoice</Button>
            </div>}
          </div>

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

          {method === "mpesa" && mpesaReference && <div role="status" className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            {mpesaFinalStatus ? <><p className="font-medium text-foreground">Payment {mpesaFinalStatus}</p><p className="mt-1">You can send another prompt or close this panel.</p></> : <><p className="flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />Waiting for M-Pesa confirmation. This panel checks Gatekeeperd for updates.</p>{mpesaQueryError && <p className="mt-2 text-destructive">Status check failed: {mpesaQueryError}</p>}{mpesaPaymentId && mpesaPaymentStatus === "pending" && <Button type="button" size="sm" variant="outline" className="mt-2" loading={reconcilePayment.isPending} disabled={reconcilePayment.isPending || mpesaCheckCoolingDown} onClick={() => void checkMpesaStatus()}>{mpesaCheckCoolingDown && !reconcilePayment.isPending ? "Check again shortly" : "Check with Safaricom"}</Button>}</>}
          </div>}

          {method && <div className="space-y-2">
            <Label htmlFor="capture-amount">Amount ({project.currency})</Label>
            <Input id="capture-amount" type="number" min="0.01" max={balance} step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required />
            <p className="text-xs text-muted-foreground">Remaining {selectedService?.name ?? "service"} balance: {project.currency} {balance.toLocaleString()}.</p>
          </div>}

          {method === "cash" && <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="cash-paid-at">Payment date</Label><Input id="cash-paid-at" type="datetime-local" value={paidAt} onChange={event => setPaidAt(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="cash-receipt">Receipt number</Label><Input id="cash-receipt" value={receiptNumber} onChange={event => setReceiptNumber(event.target.value)} placeholder="Optional" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="cash-notes">Notes</Label><textarea id="cash-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Optional payment notes" /></div>
          </>}

          {paymentLink && <div className="space-y-2 rounded-md border bg-muted/30 p-3"><Label>Paystack payment link</Label><div className="flex gap-2"><Input readOnly value={paymentLink} className="font-mono text-xs" /><Button type="button" variant="outline" size="icon" aria-label="Copy Paystack payment link" onClick={copyLink}><Copy className="h-4 w-4" /></Button><Button type="button" variant="outline" size="icon" aria-label="Open Paystack payment link" asChild><a href={paymentLink} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button></div></div>}

          <SidePanelFooter className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={close}>Close</Button>
            {method && !paymentLink && <Button type="submit" loading={pending} disabled={pending || !amountValid || (method === "mpesa" && (!phone.trim() || !Number.isInteger(numericAmount) || (!!mpesaReference && !mpesaFinalStatus)))}>
              {method === "paystack" ? <><Link2 className="h-4 w-4" />{pending ? "Creating link…" : "Create Paystack link"}</> : method === "mpesa" ? (pending ? "Sending prompt…" : mpesaReference && !mpesaFinalStatus ? "Waiting for confirmation…" : "Send M-Pesa prompt") : (pending ? "Capturing…" : "Capture payment")}
            </Button>}
          </SidePanelFooter>
        </form>
      </SidePanelContent>
      </SidePanel>
      <CreateServiceInvoiceDialog
        projectId={project.id}
        projectName={project.name}
        currency={project.currency}
        initialServiceId={serviceId}
        open={createInvoiceOpen}
        onOpenChange={setCreateInvoiceOpen}
        onCreated={() => serviceInvoice.refetch()}
      />
    </>
  );
}
