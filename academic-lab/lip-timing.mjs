export function estimateLag(mouth, audio, hz) {
  const limit = Math.round(.7 * hz);
  const scores = [];
  for (let lag = -limit; lag <= limit; lag++) {
    const pairs = mouth.map((value, i) => [value, audio[i + lag]])
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    if (pairs.length < Math.max(24, .6 * mouth.length)) continue;
    const means = pairs.reduce(([a, b], [x, y]) => [a + x / pairs.length, b + y / pairs.length], [0, 0]);
    let product = 0, varianceX = 0, varianceY = 0;
    for (const [x, y] of pairs) {
      product += (x - means[0]) * (y - means[1]);
      varianceX += (x - means[0]) ** 2;
      varianceY += (y - means[1]) ** 2;
    }
    if (varianceX < 1e-8 || varianceY < 1e-8) continue;
    scores.push({ lag, correlation: product / Math.sqrt(varianceX * varianceY), samples: pairs.length });
  }
  scores.sort((a, b) => b.correlation - a.correlation || Math.abs(a.lag) - Math.abs(b.lag));
  const best = scores[0];
  const alternative = scores.find(score => Math.abs(score.lag - best.lag) > 2);
  if (!best || Math.abs(best.lag) === limit || best.correlation < .35 ||
      (alternative && best.correlation - alternative.correlation < .04)) return null;
  return { milliseconds: Math.round(1000 * best.lag / hz), correlation: best.correlation, samples: best.samples };
}

export function timingExample() {
  const spikes = [[8, 3], [22, 6], [38, 2], [47, 3], [64, 4], [83, 2]];
  const mouth = Array.from({ length: 100 }, (_, t) => spikes.reduce(
    (value, [center, width]) => value + Math.exp(-((t - center) ** 2) / width), 0));
  const audio = Array.from({ length: mouth.length }, (_, i) => mouth[i - 3] ?? 0);
  return estimateLag(mouth, audio, 10);
}
