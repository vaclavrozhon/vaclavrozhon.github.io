/* global globalThis */
import data from "./data/house2026.json";
import {
  buildHouseModel,
  HouseSampler,
  nationalMargin,
} from "./house-model.mjs";
let sampler,
  timer,
  generation = 0,
  running = false,
  remaining = Infinity;
function publish() {
  if (!sampler) return;
  const s = sampler;
  globalThis.postMessage({
    generation,
    running,
    x: s.x,
    iter: s.iter,
    retained: s.retained,
    counts: s.counts,
    histogram: s.histogram,
    accepted: s.accepted,
    last: s.last,
    dimension: s.x.length,
    logPost: s.logPost,
    national: nationalMargin(s.x),
  });
}
function stop() {
  clearTimeout(timer);
  running = false;
}
function burst() {
  if (!running) return;
  const n = Math.min(500, remaining);
  sampler.run(n);
  remaining -= n;
  if (remaining <= 0) running = false;
  publish();
  if (running) timer = setTimeout(burst, 15);
}
globalThis.onmessage = ({ data: message }) => {
  try {
    if (message.type === "reset") {
      stop();
      generation = message.generation;
      sampler = new HouseSampler(buildHouseModel(data));
      publish();
    } else if (message.generation === generation) {
      if (message.type === "pause") {
        stop();
        publish();
      }
      if (message.type === "step") {
        stop();
        sampler.run(message.count);
        publish();
      }
      if (message.type === "run") {
        stop();
        remaining = message.count ?? Infinity;
        running = true;
        burst();
      }
    }
  } catch (error) {
    stop();
    globalThis.postMessage({ generation, error: error.message });
  }
};
