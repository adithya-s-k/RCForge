/** Optional embedding contract. The standalone MIT build grants every capability. */
export type HostRequest =
  | { kind: "aircraft"; id: string }
  | { kind: "input"; id: string }
  | { kind: "workspace"; id: "aircraft" | "experiments" };
export interface WorkbenchHost {
  allows(request: HostRequest): boolean;
  requestAccess(request: HostRequest): void;
  /** Called once the workbench is ready; return false to cancel a redirect/logout. */
  mount?(api: HostWorkbench): void;
}
export interface HostWorkbench {
  prepareToLeave(): boolean;
  open(request: HostRequest): void;
}
const standalone: WorkbenchHost = {
  allows: () => true,
  requestAccess: () => {},
};
let implementation = standalone;
const listeners = new Set<() => void>();
export function configureHost(host: WorkbenchHost) {
  implementation = host;
}
export function hostAllows(request: HostRequest) {
  return implementation.allows(request);
}
export function requireHostAccess(request: HostRequest) {
  if (hostAllows(request)) return true;
  implementation.requestAccess(request);
  return false;
}
export function onHostAccessChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
/** The host calls this after its authenticated access state changes. */
export function notifyHostAccessChange() {
  for (const listener of listeners) listener();
}
export function mountHost(api: HostWorkbench) {
  implementation.mount?.(api);
}
