const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value: Date | string | number) {
  return dateTimeFormatter.format(new Date(value));
}
