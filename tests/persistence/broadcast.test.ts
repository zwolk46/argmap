import { describe, it, expect, vi } from "vitest";
import { createCrossTabBus, BROADCAST_CHANNEL_NAME } from "@/persistence";

// BroadcastChannel messages are dispatched asynchronously via the event loop.
// We use real timers in these tests so the message dispatch machinery works.
async function flushMessages(): Promise<void> {
  // Restore real timers briefly to let BroadcastChannel dispatch complete.
  vi.useRealTimers();
  await new Promise((resolve) => setTimeout(resolve, 10));
  vi.useFakeTimers({ now: new Date("2026-05-10T00:00:00.000Z").getTime() });
}

describe("persistence/broadcast", () => {
  it("createCrossTabBus: returns a working bus when BroadcastChannel is available", async () => {
    const bus_a = createCrossTabBus(BROADCAST_CHANNEL_NAME);
    const bus_b = createCrossTabBus(BROADCAST_CHANNEL_NAME);

    const received: Array<{ frame_id: string; version_id: string }> = [];
    bus_b.subscribe("frame_saved", (payload) => received.push(payload));

    bus_a.publish("frame_saved", { frame_id: "frame-1", version_id: "fv-1" });
    await flushMessages();

    expect(received).toHaveLength(1);
    expect(received[0].frame_id).toBe("frame-1");
    expect(received[0].version_id).toBe("fv-1");

    bus_a.close();
    bus_b.close();
  });

  it("createCrossTabBus: returns a no-op bus when BroadcastChannel is undefined", () => {
    const original = globalThis.BroadcastChannel;
    // @ts-expect-error intentional undefined
    globalThis.BroadcastChannel = undefined;
    try {
      const bus = createCrossTabBus();
      bus.publish("frame_saved", { frame_id: "frame-1", version_id: "fv-1" });
      let called = false;
      bus.subscribe("frame_saved", () => {
        called = true;
      });
      bus.publish("frame_saved", { frame_id: "frame-1", version_id: "fv-1" });
      expect(called).toBe(false);
      bus.close();
    } finally {
      globalThis.BroadcastChannel = original;
    }
  });

  it("subscribe returns an unsubscribe function that detaches the listener", async () => {
    const channel_name = "test_unsub_channel_" + Date.now();
    const bus1 = createCrossTabBus(channel_name);
    const bus2 = createCrossTabBus(channel_name);

    const calls: string[] = [];
    const unsub = bus2.subscribe("frame_saved", (p) => calls.push(p.version_id));

    bus1.publish("frame_saved", { frame_id: "f1", version_id: "v1" });
    await flushMessages();
    expect(calls).toHaveLength(1);

    unsub();
    bus1.publish("frame_saved", { frame_id: "f1", version_id: "v2" });
    await flushMessages();
    expect(calls).toHaveLength(1);

    bus1.close();
    bus2.close();
  });

  it("close: stops dispatching messages on the closed bus", async () => {
    const channel_name = "test_close_channel_" + Date.now();
    const bus1 = createCrossTabBus(channel_name);
    const bus2 = createCrossTabBus(channel_name);

    const calls: string[] = [];
    bus2.subscribe("frame_saved", (p) => calls.push(p.version_id));
    bus2.close();

    bus1.publish("frame_saved", { frame_id: "f1", version_id: "v1" });
    await flushMessages();
    expect(calls).toHaveLength(0);

    bus1.close();
  });

  it("event payloads are typed: frame_saved has frame_id and version_id only", () => {
    const bus = createCrossTabBus();
    const unsub = bus.subscribe("frame_saved", (p) => {
      const _frame_id: string = p.frame_id;
      const _version_id: string = p.version_id;
      void _frame_id;
      void _version_id;
    });
    unsub();
    bus.close();
  });

  it("session_saved events are dispatched correctly", async () => {
    const channel_name = "test_session_channel_" + Date.now();
    const bus1 = createCrossTabBus(channel_name);
    const bus2 = createCrossTabBus(channel_name);

    const received: Array<{ session_id: string; version_id: string }> = [];
    bus2.subscribe("session_saved", (p) => received.push(p));

    bus1.publish("session_saved", { session_id: "sess-1", version_id: "sv-1" });
    await flushMessages();

    expect(received).toHaveLength(1);
    expect(received[0].session_id).toBe("sess-1");

    bus1.close();
    bus2.close();
  });
});
