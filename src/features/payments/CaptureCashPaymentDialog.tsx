import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { getApiErrorMessage } from "@/lib/api";
import { useCaptureCashPayment } from "@/hooks/usePayments";
import type { Project } from "@/types/project";

export function CaptureCashPaymentDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (open: boolean) => void }) {
  const capture = useCaptureCashPayment(project.slug);
  const [amount, setAmount] = useState(project.amountDue?.toString() ?? "");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [receiptNumber, setReceiptNumber] = useState("");
  const [notes, setNotes] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      await capture.mutateAsync({
        amount: parsedAmount,
        currency: project.currency,
        paidAt: paidAt || undefined,
        receiptNumber: receiptNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Cash payment recorded");
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader className="border-b px-6 py-5 pr-14">
          <SidePanelTitle className="text-base">Record cash payment</SidePanelTitle>
          <SidePanelDescription className="text-xs">Capture an in-person payment for {project.name}.</SidePanelDescription>
        </SidePanelHeader>
        <form onSubmit={submit} className="space-y-4 px-6 py-6 text-sm [&_label]:text-xs [&_input]:h-8">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            The payment must match the project amount due and currency. It will activate the project immediately.
          </div>
          <div className="space-y-2">
            <Label htmlFor="cash-amount">Amount ({project.currency})</Label>
            <Input id="cash-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cash-paid-at">Payment date</Label>
              <Input id="cash-paid-at" type="datetime-local" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-receipt">Receipt number</Label>
              <Input id="cash-receipt" value={receiptNumber} onChange={(event) => setReceiptNumber(event.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cash-notes">Notes</Label>
            <textarea id="cash-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Optional payment notes" />
          </div>
          <SidePanelFooter className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={capture.isPending}>{capture.isPending ? "Recording…" : "Record payment"}</Button>
          </SidePanelFooter>
        </form>
      </SidePanelContent>
    </SidePanel>
  );
}
