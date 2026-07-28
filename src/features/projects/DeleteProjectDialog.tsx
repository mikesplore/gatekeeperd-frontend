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
import { Button } from "@/components/ui/button";
import { useDeleteProject } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import type { Project } from "@/types/project";

interface DeleteProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onDeleted,
}: DeleteProjectDialogProps) {
  const deleteProject = useDeleteProject();

  const handleDelete = () => {
    if (!project) return;
    deleteProject.mutate(project.slug, {
      onSuccess: () => {
        toast.success(`Archived ${project.name}`);
        onOpenChange(false);
        onDeleted?.();
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {project?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This archives the project in Gatekeeper — gating stops immediately, but payment history,
            audit log, and payment events are kept for records. The client container is not stopped
            or removed. The slug{" "}
            <span className="font-mono">{project?.slug}</span> stays reserved while archived.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleteProject.isPending}
            onClick={handleDelete}
          >
            {deleteProject.isPending ? "Archiving…" : "Archive project"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
