import { useParams } from "react-router-dom";
import { QueryState } from "@/components/QueryState";
import { useProjectDetail } from "@/hooks/useProjects";
import { ProjectServicesPanel } from "@/features/projects/ProjectServicesPanel";

export function ServiceDetailPage() {
  const { slug = "", serviceId = "" } = useParams();
  const projectQuery = useProjectDetail(slug);

  return <QueryState isLoading={projectQuery.isLoading} isError={projectQuery.isError} error={projectQuery.error} data={projectQuery.data}>
    {({ project }) => <div className="space-y-5">
      <ProjectServicesPanel project={project} view="detail" serviceId={serviceId} />
    </div>}
  </QueryState>;
}
