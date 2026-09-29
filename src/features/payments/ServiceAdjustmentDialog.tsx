import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProjectServices } from "@/hooks/useProjects";
import { api, getApiErrorMessage } from "@/lib/api";

export function ServiceAdjustmentDialog({ projectId, currency, open, onOpenChange, onSaved }: { projectId: string; currency: string; open: boolean; onOpenChange: (open: boolean) => void; onSaved?: () => Promise<unknown> | void }) {
  const services = useProjectServices(projectId);
  const [serviceId, setServiceId] = useState("");
  const [type, setType] = useState("ADDITIONAL_CHARGE");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!serviceId || Number(amount) <= 0 || !reason.trim()) return;
    setSaving(true);
    try {
      await api.post(`/admin/projects/${projectId}/services/${serviceId}/adjustments`, { type, amount: Number(amount), reason: reason.trim() });
      toast.success(type === "DISCOUNT" ? "Service discount added" : "Service charge added");
      await onSaved?.();
      setAmount(""); setReason(""); onOpenChange(false);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
    finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Add service charge or discount</DialogTitle><DialogDescription>Only the selected service’s invoice and balance will change. Create a service invoice first if one does not exist.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Service</Label><Select value={serviceId} onValueChange={setServiceId}><SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger><SelectContent>{(services.data ?? []).map(service => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Adjustment</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ADDITIONAL_CHARGE">Additional charge</SelectItem><SelectItem value="DISCOUNT">Discount</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="service-adjustment-amount">Amount ({currency})</Label><Input id="service-adjustment-amount" type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="service-adjustment-reason">Reason</Label><Textarea id="service-adjustment-reason" maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Describe this charge or discount" /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving || !serviceId || Number(amount) <= 0 || !reason.trim()} onClick={submit}>{saving ? "Saving…" : "Add adjustment"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
