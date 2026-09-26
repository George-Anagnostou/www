import { expect, test } from "bun:test";
import { createBuildQueue } from "./build-queue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test("edits during a build coalesce into a follow-up without overlapping builds", async () => {
  const started = deferred();
  const release = deferred();
  let builds = 0;
  let active = 0;
  let maxActive = 0;
  const request = createBuildQueue(async () => {
    builds++;
    maxActive = Math.max(maxActive, ++active);
    if (builds === 1) { started.resolve(); await release.promise; }
    active--;
  }, error => { throw error; });
  const done = request();
  await started.promise;
  void request();
  void request();
  release.resolve();
  await done;
  expect(builds).toBe(2);
  expect(maxActive).toBe(1);
  await request();
  expect(builds).toBe(3);
});

test("a failed build still runs a correction queued while it was running", async () => {
  const started = deferred();
  const release = deferred();
  let builds = 0;
  const errors: unknown[] = [];
  const request = createBuildQueue(async () => {
    if (++builds === 1) {
      started.resolve();
      await release.promise;
      throw new Error("bad content");
    }
  }, error => { errors.push(error); });
  const done = request();
  await started.promise;
  void request();
  release.resolve();
  await done;
  expect(builds).toBe(2);
  expect(errors).toHaveLength(1);
});
