export async function getGateSessionOk(): Promise<boolean> {
  const res = await fetch("/api/gate", { cache: "no-store" }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as null | { sessionOk?: boolean };
  return Boolean(json?.sessionOk);
}
