import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `This page could not be opened (HTTP ${error.status}).`
    : "This page could not be loaded. It may be a temporary connection or update issue.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <section className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">We couldn’t load this page</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button variant="outline" asChild><Link to="/">Go to home</Link></Button>
        </div>
      </section>
    </main>
  );
}
