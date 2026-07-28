import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useContainerAction } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import type { ContainerInfo } from "@/types/container";

interface ContainersTableProps {
  containers: ContainerInfo[];
}

export function ContainersTable({ containers }: ContainersTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Ports</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {containers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">{c.image}</TableCell>
                <TableCell>{c.status}</TableCell>
                <TableCell>
                  <ContainerStateBadge state={c.state} />
                </TableCell>
                <TableCell className="font-mono text-xs">{c.ports || "—"}</TableCell>
                <TableCell>
                  <ContainerActionsMenu container={c} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {containers.map((c) => (
          <div key={c.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.image}</p>
              </div>
              <ContainerActionsMenu container={c} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <p className="truncate">{c.status}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">State</span>
                <div className="mt-0.5">
                  <ContainerStateBadge state={c.state} />
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">Ports</span>
                <p className="font-mono text-xs truncate">{c.ports || "—"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ContainerStateBadge({ state }: { state: string }) {
  const normalized = state.toLowerCase();
  const className =
    normalized === "running"
      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
      : normalized === "exited"
        ? "bg-red-500/15 text-red-600 border-red-500/20"
        : "bg-muted text-muted-foreground";

  return (
    <Badge variant="outline" className={className}>
      {state}
    </Badge>
  );
}

function ContainerActionsMenu({ container }: { container: ContainerInfo }) {
  const [confirmStop, setConfirmStop] = useState(false);
  const start = useContainerAction("start");
  const stop = useContainerAction("stop");
  const restart = useContainerAction("restart");

  const runAction = (action: "start" | "stop" | "restart") => {
    const mutation = action === "start" ? start : action === "stop" ? stop : restart;
    mutation.mutate(container.name, {
      onSuccess: () => toast.success(`Container ${action}ed`),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => runAction("start")}>Start</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmStop(true)}>Stop</DropdownMenuItem>
          <DropdownMenuItem onClick={() => runAction("restart")}>Restart</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmStop} onOpenChange={setConfirmStop}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop {container.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the container immediately. Confirm only if you intend to take it offline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={stop.isPending}
              onClick={() => {
                runAction("stop");
                setConfirmStop(false);
              }}
            >
              Stop container
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}