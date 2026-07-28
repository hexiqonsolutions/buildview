export function isRlsOrPermissionError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("violates row-level security")
  );
}
