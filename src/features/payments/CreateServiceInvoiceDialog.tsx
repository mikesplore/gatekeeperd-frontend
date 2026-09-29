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

export function CreateServiceInvoiceDialog({ projectId, projectName, currency, open, onOpenChange, onCreated }: {
  projectId: string; projectName: string; currency: string; open: boolean; onOpenChange: (open: boolean) => void; onCreated?: () => Promise<unknown> | void;
}) {
  const services = useProjectServices(projectId);
  const [serviceId, setServiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const service = services.data?.find(item => item.id === serviceId);
    const numericAmount = Number(amount);
    if (!service || !Number.isFinite(numericAmount) || numericAmount <= 0 || !description.trim()) return;
    setSaving(true);
    try {
      const response = await api.post<{ status: string }>(`/admin/projects/${projectId}/services/${serviceId}/invoice`, { description: description.trim(), amount: numericAmount });
      toast.success(response.data.status === "already_exists" ? `An invoice already exists for ${service.name}` : `Invoice created for ${service.name}`);
      await onCreated?.();
      setAmount(""); setDescription(""); onOpenChange(false);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
    finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Create service invoice</DialogTitle><DialogDescription>Set the amount for this service directly. The project amount is not used for service invoices.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Service</Label><Select value={serviceId} onValueChange={value => { setServiceId(value); const service = services.data?.find(item => item.id === value); setDescription(service ? `${projectName} — ${service.name}` : ""); }}><SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger><SelectContent>{(services.data ?? []).map(service => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="service-invoice-amount">Amount to bill ({currency})</Label><Input id="service-invoice-amount" type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Enter this service’s amount" /></div>
        <div className="space-y-2"><Label htmlFor="service-invoice-description">Invoice description</Label><Textarea id="service-invoice-description" maxLength={500} value={description} onChange={event => setDescription(event.target.value)} placeholder="What is this service being billed for?" /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving || !serviceId || Number(amount) <= 0 || !description.trim()} onClick={() => void create()}>{saving ? "Creating…" : "Create service invoice"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
