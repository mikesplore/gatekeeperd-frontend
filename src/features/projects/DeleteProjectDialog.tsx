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
        toast.success(`Deleted ${project.name}`);
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
          <AlertDialogTitle>Delete {project?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the project from Gatekeeper, including its payment history and audit log.
            The client container is not stopped or removed. The slug{" "}
            <span className="font-mono">{project?.slug}</span> can be registered again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleteProject.isPending}
            onClick={handleDelete}
          >
            {deleteProject.isPending ? "Deleting…" : "Delete project"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
