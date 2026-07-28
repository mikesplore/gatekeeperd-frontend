import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
        variant === "destructive" && "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
}

interface QueryStateProps<T> {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data: T | undefined;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}

function QueryState<T>({
  isLoading,
  isError,
  error,
  data,
  loadingFallback,
  errorFallback,
  children,
}: QueryStateProps<T>) {
  if (isLoading) {
    return <>{loadingFallback ?? <div className="text-sm text-muted-foreground">Loading…</div>}</>;
  }
  if (isError) {
    return (
      <>
        {errorFallback ?? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
          </Alert>
        )}
      </>
    );
  }
  if (data === undefined) {
    return null;
  }
  return <>{children(data)}</>;
}

export { Alert, AlertTitle, AlertDescription, QueryState };
