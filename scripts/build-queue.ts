/** Coalesce pending edits, but never lose an edit received during a build. */
export function createBuildQueue(build: () => Promise<void>, onError: (error: unknown) => void) {
  let pending = false;
  let running: Promise<void> | undefined;

  return function requestBuild(): Promise<void> {
    pending = true;
    if (!running) {
      running = Promise.resolve().then(async () => {
        try {
          while (pending) {
            pending = false;
            try {
              await build();
            } catch (error) {
              onError(error);
            }
          }
        } finally {
          running = undefined;
        }
      });
    }
    return running;
  };
}
