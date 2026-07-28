import { useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInitializePayment } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import type { Project } from "@/types/project";

interface GeneratePaymentLinkDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeneratePaymentLinkDialog({ project, open, onOpenChange }: GeneratePaymentLinkDialogProps) {
  const [email, setEmail] = useState(project.clientEmail ?? "");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const initPayment = useInitializePayment(project.slug);

  const handleGenerate = () => {
    initPayment.mutate(email || undefined, {
      onSuccess: (res) => {
        setPaymentLink(res.data.payment_link);
        toast.success("Payment link generated");
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  const handleClose = () => {
    setPaymentLink(null);
    setEmail(project.clientEmail ?? "");
    onOpenChange(false);
  };

  const handleCopy = async () => {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink);
    toast.success("Link copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate payment link</DialogTitle>
          <DialogDescription>
            Creates a new pending payment row and returns a Paystack checkout link.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pay-email">Customer email</Label>
            <Input
              id="pay-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={project.clientEmail ?? "client@example.com"}
            />
          </div>
          {paymentLink && (
            <div className="space-y-2 rounded-md border bg-muted/40 p-3">
              <Label>Payment link</Label>
              <div className="flex gap-2">
                <Input readOnly value={paymentLink} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
          {!paymentLink && (
            <Button disabled={initPayment.isPending} onClick={handleGenerate}>
              <Link2 className="h-4 w-4" />
              {initPayment.isPending ? "Generating…" : "Generate link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
