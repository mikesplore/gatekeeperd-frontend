import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NginxErrorLogsResponse {
  logs: string[];
}

export function NginxErrorLogsPage() {
  const query = useQuery({
    queryKey: ["nginx", "error-logs"],
    queryFn: async () => (await api.get<NginxErrorLogsResponse>("/admin/nginx/error-logs", { params: { lines: 200 } })).data,
    refetchInterval: 30_000,
  });

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <p className="text-sm text-muted-foreground">Recent entries from the host Nginx error log. Sensitive query values are redacted.</p>
      <Button variant="outline" size="sm" loading={query.isFetching} loadingText="Refresh" disabled={query.isFetching} onClick={() => void query.refetch()}>
        <RefreshCw className="mr-2 h-4 w-4" />Refresh
      </Button>
    </div>
    <Card>
      <CardHeader><CardTitle className="text-base">Nginx error log</CardTitle></CardHeader>
      <CardContent>
        {query.isLoading ? <p className="py-6 text-sm text-muted-foreground">Loading Nginx error log…</p>
          : query.isError ? <p role="alert" className="py-6 text-sm text-destructive">{getApiErrorMessage(query.error)}</p>
            : query.data?.logs.length ? <pre className="max-h-[70vh] overflow-auto rounded-md bg-muted p-4 font-mono text-xs leading-5">{query.data.logs.join("\n")}</pre>
              : <p className="py-6 text-sm text-muted-foreground">The Nginx error log is empty.</p>}
      </CardContent>
    </Card>
  </div>;
}
