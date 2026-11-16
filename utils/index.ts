export function ISOToDate(date: string | undefined | null) {
  if (!date) return undefined;

  const convertDate = new Date(date);
  if (Number.isNaN(convertDate.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(convertDate);
}
