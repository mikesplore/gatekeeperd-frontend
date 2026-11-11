const EAT_TIME_ZONE = "Africa/Nairobi";

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: EAT_TIME_ZONE }).format(new Date(value));
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeZone: EAT_TIME_ZONE }).format(new Date(value));
}
