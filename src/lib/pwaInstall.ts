export type PwaInstallStatus = "unavailable" | "available" | "prompting" | "accepted" | "dismissed" | "error" | "installed";

type InstallPromptEvent = Event & {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
type InstallBrowser = {
  events: EventTarget;
  displayMode?: EventTarget & { readonly matches: boolean };
  standalone?: boolean;
};

export function createPwaInstallStore(browser?: InstallBrowser) {
  let installed = false;
  let busy = false;
  let disposed = false;
  let pending: InstallPromptEvent | null = null;
  const consumed = new WeakSet<Event>();
  const listeners = new Set<() => void>();
  const isInstalled = () => installed || Boolean(browser?.standalone || browser?.displayMode?.matches);
  let status: PwaInstallStatus = isInstalled() ? "installed" : "unavailable";
  const update = (next: PwaInstallStatus) => {
    if (disposed || status === next) return;
    status = next;
    for (const listener of listeners) listener();
  };
  const capture = (event: Event) => {
    const candidate = event as InstallPromptEvent;
    if (isInstalled() || consumed.has(event) || typeof candidate.prompt !== "function" || !candidate.userChoice) return;
    event.preventDefault();
    pending = candidate;
    if (!busy) update("available");
  };
  const markInstalled = () => {
    installed = true;
    pending = null;
    update("installed");
  };
  const modeChanged = () => {
    if (isInstalled()) {
      pending = null;
      update("installed");
    } else {
      update(busy ? "prompting" : pending ? "available" : "unavailable");
    }
  };
  browser?.events.addEventListener("beforeinstallprompt", capture);
  browser?.events.addEventListener("appinstalled", markInstalled);
  browser?.displayMode?.addEventListener("change", modeChanged);

  return {
    getSnapshot: () => status,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    install: async () => {
      if (disposed || busy || !pending || isInstalled()) return;
      const event = pending;
      pending = null;
      consumed.add(event);
      busy = true;
      update("prompting");
      let result: "accepted" | "dismissed" | "error" = "error";
      try {
        // Call prompt before any await to retain the click's user activation.
        const [, choice] = await Promise.all([event.prompt(), event.userChoice]);
        result = choice.outcome;
      } catch {
        // A consumed prompt cannot be retried. Wait for a fresh browser event.
      } finally {
        busy = false;
        // Acceptance is not proof that the installation has completed.
        if (!isInstalled()) update(pending ? "available" : result);
      }
    },
    destroy: () => {
      disposed = true;
      pending = null;
      listeners.clear();
      browser?.events.removeEventListener("beforeinstallprompt", capture);
      browser?.events.removeEventListener("appinstalled", markInstalled);
      browser?.displayMode?.removeEventListener("change", modeChanged);
    },
  };
}

// Capture once at module load, including while authentication is still loading.
export const pwaInstallStore = createPwaInstallStore(typeof window === "undefined" ? undefined : {
  events: window,
  displayMode: window.matchMedia?.("(display-mode: standalone)"),
  standalone: (window.navigator as Navigator & { standalone?: boolean }).standalone,
});

if (import.meta.hot) import.meta.hot.dispose(pwaInstallStore.destroy);
