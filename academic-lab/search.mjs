const stop = new Set("a an and are as at be by can do does for from how i in is it of on or should the to use what when which with you".split(" "));
const equivalents = new Map(Object.entries({
  cached: "cache", caches: "cache", caching: "cache",
  challenges: "challenge", credentials: "credential",
  methods: "method", retrying: "retry", chunks: "chunk",
  unchanged: "unmodified",
}));
const tokens = (text) => (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
  .filter(word => !stop.has(word)).map(word => equivalents.get(word) ?? word);
const frequencies = (words) => {
  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return counts;
};

export function createSearch(corpus) {
  const documents = corpus.map(row => {
    const words = tokens(row[2] + " " + row[2] + " " + row[3]);
    return { row, length: words.length, counts: frequencies(words) };
  });
  const average = documents.reduce((sum, doc) => sum + doc.length, 0) / documents.length;
  const frequency = frequencies(documents.flatMap(doc => [...doc.counts.keys()]));

  return (query) => {
    const words = [...new Set(tokens(query))];
    return documents.map(({ row, counts, length }) => {
      let score = 0;
      for (const word of words) {
        const count = counts.get(word);
        if (!count) continue;
        const df = frequency.get(word);
        const idf = Math.log1p((documents.length - df + 0.5) / (df + 0.5));
        score += idf * (count * 2.2) / (count + 1.2 * (0.25 + 0.75 * length / average));
      }
      return { row, score };
    }).filter(result => result.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  };
}
