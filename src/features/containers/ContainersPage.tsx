import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/QueryState";
import { QueryState } from "@/components/QueryState";
import { ContainersTable } from "@/features/containers/ContainersTable";
import { useContainers } from "@/hooks/useProjects";
import { getApiErrorMessage, isDockerUnavailable } from "@/lib/api";

export function ContainersPage() {
  const { data, isLoading, isError, error } = useContainers();

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
      <PageHeader />
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
                <p className="py-8 text-center text-sm text-muted-foreground">No containers found.</p>
              ) : (
                <ContainersTable containers={containers} />
              )
            }
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Containers</h1>
      <p className="text-muted-foreground">Inspect and control Docker containers on the host.</p>
    </div>
  );
}
