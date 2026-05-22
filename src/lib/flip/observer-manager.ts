import { createLayoutObservers } from "./observers";

export interface ObserverManager {
  connect: (element: Element, onChange: () => void) => void;
  disconnect: () => void;
}

export const createObserverManager = (): ObserverManager => {
  let inner: ReturnType<typeof createLayoutObservers> | null = null;

  return {
    connect(element, onChange) {
      inner?.disconnect();
      inner = createLayoutObservers({ element, onChange });
      inner.connect();
    },
    disconnect() {
      inner?.disconnect();
      inner = null;
    },
  };
};
