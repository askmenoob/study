import { afterEach, describe, expect, it, vi } from "vitest";
import { createPwaInstallStore } from "./pwaInstall";

type Choice = { outcome: "accepted" | "dismissed"; platform: string };
class DisplayMode extends EventTarget {
  matches = false;
  set(matches: boolean) { this.matches = matches; this.dispatchEvent(new Event("change")); }
}
function setup(standalone = false) {
  const events = new EventTarget();
  const displayMode = new DisplayMode();
  displayMode.matches = standalone;
  const store = createPwaInstallStore({ events, displayMode });
  cleanup.push(store.destroy);
  return { events, displayMode, store };
}
function installEvent() {
  let choose!: (value: Choice) => void;
  const userChoice = new Promise<Choice>((resolve) => { choose = resolve; });
  const prompt = vi.fn(() => Promise.resolve());
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice });
  return { event, prompt, choose };
}
const cleanup: Array<() => void> = [];
afterEach(() => { for (const destroy of cleanup.splice(0)) destroy(); });

describe("PWA installation lifecycle", () => {
  it("captures an available prompt before the UI subscribes, without opening it", () => {
    const { events, store } = setup();
    expect(store.getSnapshot()).toBe("unavailable");
    const { event, prompt } = installEvent();
    events.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(store.getSnapshot()).toBe("available");
    expect(prompt).not.toHaveBeenCalled();
    const notify = vi.fn();
    const unsubscribe = store.subscribe(notify);
    unsubscribe();
    store.subscribe(notify);
    expect(store.getSnapshot()).toBe("available");
    expect(prompt).not.toHaveBeenCalled();
  });

  it("opens a captured prompt synchronously on request, once across repeated clicks", async () => {
    const { events, store } = setup();
    const { event, prompt, choose } = installEvent();
    events.dispatchEvent(event);
    const first = store.install();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe("prompting");
    await store.install();
    expect(prompt).toHaveBeenCalledTimes(1);
    choose({ outcome: "dismissed", platform: "" });
    await first;
    expect(store.getSnapshot()).toBe("dismissed");
    events.dispatchEvent(event);
    await store.install();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe("dismissed");
  });

  it("waits for appinstalled instead of treating accepted choice as installed", async () => {
    const { events, store } = setup();
    const { event, choose } = installEvent();
    events.dispatchEvent(event);
    const attempt = store.install();
    choose({ outcome: "accepted", platform: "web" });
    await attempt;
    expect(store.getSnapshot()).toBe("accepted");
    events.dispatchEvent(new Event("appinstalled"));
    expect(store.getSnapshot()).toBe("installed");
    const later = installEvent();
    events.dispatchEvent(later.event);
    await store.install();
    expect(later.prompt).not.toHaveBeenCalled();
  });

  it.each(["dismissal", "rejection", "throw"])("requires a new event to retry after %s", async (failure) => {
    const { events, store } = setup();
    const first = installEvent();
    if (failure === "rejection") first.prompt.mockRejectedValueOnce(new Error("Prompt unavailable"));
    if (failure === "throw") first.prompt.mockImplementationOnce(() => { throw new Error("Prompt unavailable"); });
    events.dispatchEvent(first.event);
    const attempt = store.install();
    first.choose({ outcome: "dismissed", platform: "" });
    await attempt;
    expect(store.getSnapshot()).toBe(failure === "dismissal" ? "dismissed" : "error");
    await store.install();
    expect(first.prompt).toHaveBeenCalledTimes(1);
    const next = installEvent();
    events.dispatchEvent(next.event);
    expect(store.getSnapshot()).toBe("available");
    const retry = store.install();
    next.choose({ outcome: "dismissed", platform: "" });
    await retry;
    expect(next.prompt).toHaveBeenCalledTimes(1);
  });

  it("retains a fresh event arriving while a consumed prompt is settling", async () => {
    const { events, store } = setup();
    const first = installEvent(), next = installEvent();
    events.dispatchEvent(first.event);
    const attempt = store.install();
    events.dispatchEvent(next.event);
    await store.install();
    expect(next.prompt).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe("prompting");
    first.choose({ outcome: "dismissed", platform: "" });
    await attempt;
    expect(store.getSnapshot()).toBe("available");
    const retry = store.install();
    next.choose({ outcome: "accepted", platform: "web" });
    await retry;
    expect(next.prompt).toHaveBeenCalledTimes(1);
  });

  it("hides in standalone mode and drops stale prompts on a display-mode change", async () => {
    const { events, displayMode, store } = setup(true);
    expect(store.getSnapshot()).toBe("installed");
    const hidden = installEvent();
    events.dispatchEvent(hidden.event);
    await store.install();
    expect(hidden.prompt).not.toHaveBeenCalled();
    displayMode.set(false);
    expect(store.getSnapshot()).toBe("unavailable");
    const ready = installEvent();
    events.dispatchEvent(ready.event);
    expect(store.getSnapshot()).toBe("available");
    displayMode.set(true);
    expect(store.getSnapshot()).toBe("installed");
    displayMode.set(false);
    await store.install();
    expect(ready.prompt).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe("unavailable");
  });

  it("keeps appinstalled authoritative when a pending prompt settles afterwards", async () => {
    const { events, store } = setup();
    const { event, choose } = installEvent();
    events.dispatchEvent(event);
    const attempt = store.install();
    events.dispatchEvent(new Event("appinstalled"));
    choose({ outcome: "accepted", platform: "web" });
    await attempt;
    expect(store.getSnapshot()).toBe("installed");
  });

  it("supports unavailable browser APIs and the legacy standalone signal", async () => {
    const server = createPwaInstallStore();
    expect(server.getSnapshot()).toBe("unavailable");
    await server.install();
    server.destroy();
    const legacy = createPwaInstallStore({ events: new EventTarget(), standalone: true });
    expect(legacy.getSnapshot()).toBe("installed");
    legacy.destroy();
  });

  it("removes browser listeners on disposal", () => {
    const { events, store } = setup();
    const notify = vi.fn();
    store.subscribe(notify);
    store.destroy();
    events.dispatchEvent(installEvent().event);
    expect(notify).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe("unavailable");
  });
});
