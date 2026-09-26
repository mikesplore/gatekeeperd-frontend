import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { api, getApiErrorMessage } from "@/lib/api";

type DeploymentHistoryItem = {
  id: string; projectId: string; projectSlug: string; environment: string; sourceCommit?: string | null;
  imageName: string; imageTag: string; imageDigest?: string | null; trigger: string; status: string;
  createdAt: string; activeAt?: string | null; healthCheckResult: string; failureReason?: string | null;
  credentialSetId?: string | null; credentialSetVersion?: number | null; secretSetId?: string | null; secretSetVersion?: number | null;
};
type DeploymentHistoryPage = { items: DeploymentHistoryItem[]; total: number; limit: number; offset: number };

export function DeploymentsPage() {
  const history = useQuery({
    queryKey: ["deployment-history"],
    queryFn: async () => (await api.get<DeploymentHistoryPage>("/admin/deployment-history", { params: { limit: 100, offset: 0 } })).data,
    refetchInterval: 10_000,
  });
  return <div className="space-y-6">
    <p className="text-muted-foreground">Canonical deployment history across projects.</p>
    <Card><CardHeader><CardTitle>Deployment history</CardTitle></CardHeader><CardContent><QueryState isLoading={history.isLoading} isError={history.isError} error={history.error} data={history.data}>
      {(page) => page.items.length ? <div className="space-y-3">{page.items.map(item => <div key={item.id} className="rounded-lg border p-4"><div className="flex flex-col justify-between gap-3 md:flex-row"><div className="space-y-1"><Link className="font-medium hover:underline" to={`/app/projects/${item.projectSlug}?tab=history`}>{item.projectSlug}</Link><p className="text-sm">{item.imageName}:{item.imageTag} · {item.status}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.trigger} · {item.environment}</p><p className="text-xs">Commit {item.sourceCommit ?? "not recorded"} · digest {item.imageDigest ?? "not recorded"}</p><p className="text-xs">Readiness {item.healthCheckResult}{item.failureReason ? ` · ${item.failureReason}` : ""}</p><p className="text-xs text-muted-foreground">Credential {item.credentialSetId ? `v${item.credentialSetVersion}` : "not recorded"} · secrets {item.secretSetId ? `v${item.secretSetVersion}` : "not recorded"}</p></div><Button size="sm" variant="outline" asChild><Link to={`/app/projects/${item.projectSlug}?tab=history`}>Project history</Link></Button></div></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No canonical deployments recorded.</p>}
    </QueryState></CardContent></Card>
    {history.isError && <p className="text-sm text-destructive">{getApiErrorMessage(history.error)}</p>}
  </div>;
}
