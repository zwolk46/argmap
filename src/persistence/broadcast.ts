import type { CrossTabBus, BroadcastEvents, Unsubscribe } from "./repository";

export const BROADCAST_CHANNEL_NAME = "argmap_v1__crosstab";

export function createCrossTabBus(channel_name: string = BROADCAST_CHANNEL_NAME): CrossTabBus {
  if (typeof BroadcastChannel === "undefined") {
    return new NoopCrossTabBus();
  }
  return new BroadcastChannelBus(new BroadcastChannel(channel_name));
}

// Re-exported as a public class for testing; constructor accepts an injected channel-like.
export class CrossTabBusImpl implements CrossTabBus {
  private readonly inner: BroadcastChannelBus;
  constructor(channel: BroadcastChannel) {
    this.inner = new BroadcastChannelBus(channel);
  }
  publish<K extends keyof BroadcastEvents>(event: K, payload: BroadcastEvents[K]): void {
    this.inner.publish(event, payload);
  }
  subscribe<K extends keyof BroadcastEvents>(
    event: K,
    listener: (payload: BroadcastEvents[K]) => void,
  ): Unsubscribe {
    return this.inner.subscribe(event, listener);
  }
  close(): void {
    this.inner.close();
  }
}

class BroadcastChannelBus implements CrossTabBus {
  private readonly channel: BroadcastChannel;
  private readonly listeners = new Map<
    keyof BroadcastEvents,
    Set<(payload: BroadcastEvents[keyof BroadcastEvents]) => void>
  >();

  constructor(channel: BroadcastChannel) {
    this.channel = channel;
    this.channel.onmessage = (e: MessageEvent) => {
      const msg = e.data as { event: keyof BroadcastEvents; payload: unknown };
      const set = this.listeners.get(msg.event);
      if (!set) return;
      for (const listener of set) {
        try {
          listener(msg.payload as never);
        } catch {
          /* isolate */
        }
      }
    };
  }

  publish<K extends keyof BroadcastEvents>(event: K, payload: BroadcastEvents[K]): void {
    this.channel.postMessage({ event, payload });
  }

  subscribe<K extends keyof BroadcastEvents>(
    event: K,
    listener: (payload: BroadcastEvents[K]) => void,
  ): Unsubscribe {
    const set = (this.listeners.get(event) ?? new Set()) as Set<(p: BroadcastEvents[K]) => void>;
    set.add(listener);
    this.listeners.set(event, set as never);
    return () => {
      set.delete(listener);
    };
  }

  close(): void {
    this.listeners.clear();
    this.channel.close();
  }
}

class NoopCrossTabBus implements CrossTabBus {
  publish(): void {
    /* no-op */
  }
  subscribe(): Unsubscribe {
    return () => {};
  }
  close(): void {
    /* no-op */
  }
}
