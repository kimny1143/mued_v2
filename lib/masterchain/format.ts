// Shared by the trial email, the trial page and the portal, so the three surfaces cannot drift apart.
// ★Pure and dependency-free: the trial page's form is a client component, and key-issuance.ts
//   (which imports node:crypto via license.ts) must not be pulled into the browser bundle.

/** "YYYY-MM-DD HH:MM" in UTC. A date alone reads as "through the end of that day" in the reader's zone. */
export function formatUtcMinute(iso: string | Date): string {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}
