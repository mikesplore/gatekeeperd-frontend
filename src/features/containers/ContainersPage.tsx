import { useState } from "react";
import { useUrlTableState } from "@/hooks/useUrlTableState";
import { AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/QueryState";
import { QueryState } from "@/components/QueryState";
import { ContainersTable } from "@/features/containers/ContainersTable";
import { CreateContainerDialog } from "@/features/containers/CreateContainerDialog";
import { useContainersPage } from "@/hooks/useProjects";
import { getApiErrorMessage, isDockerUnavailable } from "@/lib/api";

export function ContainersPage() {
  const { page, pageSize, offset, setTableParam } = useUrlTableState(25);
  const { data, isLoading, isError, error } = useContainersPage(pageSize, offset);
  const [createOpen, setCreateOpen] = useState(false);

  if (isError && isDockerUnavailable(error)) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Docker unavailable</AlertTitle>
          <AlertDescription>
            Docker socket unreachable. Container management is temporarily unavailable.
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
            data={data?.containers}
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
                <><ContainersTable containers={containers} /><div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{data?.total ?? 0} result{data?.total === 1 ? "" : "s"}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0 || isLoading} onClick={() => setTableParam("page", page - 1)}>Previous</Button><span>{page + 1} / {Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))}</span><Button variant="outline" size="sm" disabled={!data?.hasMore && offset + containers.length >= (data?.total ?? 0)} onClick={() => setTableParam("page", page + 1)}>Next</Button></div></div></>
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
