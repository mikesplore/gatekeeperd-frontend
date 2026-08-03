import { useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/QueryState";
import { QueryState } from "@/components/QueryState";
import { ContainersTable } from "@/features/containers/ContainersTable";
import { CreateContainerDialog } from "@/features/containers/CreateContainerDialog";
import { useContainers } from "@/hooks/useProjects";
import { getApiErrorMessage, isDockerUnavailable } from "@/lib/api";

export function ContainersPage() {
  const { data, isLoading, isError, error } = useContainers();
  const [createOpen, setCreateOpen] = useState(false);

  if (isError && isDockerUnavailable(error)) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Docker unavailable</AlertTitle>
          <AlertDescription>
            Docker socket unreachable — container management is temporarily unavailable.
            {getApiErrorMessage(error) !== "Something went wrong. Please try again." && (
              <> {getApiErrorMessage(error)}</>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader onNew={() => setCreateOpen(true)} />
      <Card>
        <CardHeader>
          <CardTitle>Running containers</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            data={data}
            loadingFallback={
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            }
          >
            {(containers) =>
              containers.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="text-muted-foreground">No containers found.</p>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Create Container
                  </Button>
                </div>
              ) : (
                <ContainersTable containers={containers} />
              )
            }
          </QueryState>
        </CardContent>
      </Card>

      <CreateContainerDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function PageHeader({ onNew }: { onNew?: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Containers</h1>
        <p className="text-muted-foreground">Inspect and control Docker containers on the host.</p>
      </div>
      {onNew && (
        <Button onClick={onNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          New Container
        </Button>
      )}
    </div>
  );
}
