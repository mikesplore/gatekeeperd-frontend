import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBlockProject, useUnblockProject } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import type { Project } from "@/types/project";

interface BlockUnblockDialogProps {
  project: Project | null;
  mode: "block" | "unblock" | null;
  onClose: () => void;
}

export function BlockUnblockDialog({ project, mode, onClose }: BlockUnblockDialogProps) {
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const block = useBlockProject();
  const unblock = useUnblockProject();
  const open = !!project && !!mode;
  const isBlock = mode === "block";
  const pending = block.isPending || unblock.isPending;

  const handleClose = () => {
    setReason("");
    setReasonCode("");
    onClose();
  };

  const handleConfirm = () => {
    if (!project || (isBlock ? !reasonCode : !reason.trim())) return;
    const mutation = isBlock ? block : unblock;
    mutation.mutate(
      isBlock
        ? { slug: project.slug, reason: reason.trim() || reasonCodeLabel(reasonCode), blockReasonCode: reasonCode, blockReasonNote: reason.trim() || undefined }
        : { slug: project.slug, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(isBlock ? "Project blocked" : "Project unblocked");
          handleClose();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  const noteField = (
    <div className="space-y-2 py-2">
      <Label htmlFor="reason">Additional note (optional)</Label>
      <Textarea
        id="reason"
        placeholder={isBlock ? "Why is this project being blocked?" : "Why is this project being unblocked?"}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
      />
    </div>
  );

  const reasonPicker = (
    <div className="space-y-2 py-2">
      <Label htmlFor="block-reason">Block reason <span className="text-destructive">*</span></Label>
      <Select value={reasonCode} onValueChange={setReasonCode}>
        <SelectTrigger id="block-reason"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="payment">Payment issue</SelectItem>
          <SelectItem value="manual_hold">Manual hold</SelectItem>
          <SelectItem value="abuse_tos">Abuse or terms violation</SelectItem>
          <SelectItem value="suspended_by_request">Suspended by request</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (isBlock) {
    return (
      <AlertDialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {project?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Traffic to this project will be blocked. A reason is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reasonPicker}
          {noteField}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={!reasonCode || pending} onClick={handleConfirm}>
              {pending ? "Blocking…" : "Block project"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unblock {project?.name}?</DialogTitle>
          <DialogDescription>Traffic will be restored. A reason is required.</DialogDescription>
        </DialogHeader>
        {noteField}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button disabled={!reason.trim() || pending} onClick={handleConfirm}>
            {pending ? "Unblocking…" : "Unblock project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function reasonCodeLabel(code: string) {
  return ({ payment: "Payment issue", manual_hold: "Manual hold", abuse_tos: "Abuse or terms violation", suspended_by_request: "Suspended by request", other: "Other" } as Record<string, string>)[code] ?? "Manual hold";
}
