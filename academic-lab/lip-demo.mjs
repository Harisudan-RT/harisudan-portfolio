import { estimateLag, timingExample } from "./lip-timing.mjs";

const byId = id => document.getElementById(id);
const packageUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21";
const modelUrl = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
let detectorPromise;

async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = import(packageUrl + "/+esm").then(async ({ FilesetResolver, FaceLandmarker }) => {
      const files = await FilesetResolver.forVisionTasks(packageUrl + "/wasm");
      return FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: modelUrl },
        runningMode: "IMAGE", numFaces: 2,
      });
    }).catch(error => {
      detectorPromise = undefined;
      throw error;
    });
  }
  return detectorPromise;
}

function waitForMedia(video, event) {
  return new Promise((resolve, reject) => {
    const finish = error => {
      clearTimeout(timeout);
      video.removeEventListener(event, ready);
      video.removeEventListener("error", fail);
      error ? reject(error) : resolve();
    };
    const ready = () => finish();
    const fail = () => finish(new Error("This browser could not read the video."));
    const timeout = setTimeout(() => finish(new Error("Video decoding timed out.")), 7000);
    video.addEventListener(event, ready);
    video.addEventListener("error", fail);
  });
}

async function measure(videoFile, audioFile) {
  const url = URL.createObjectURL(videoFile);
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  const context = new AudioContext();
  try {
    const loaded = waitForMedia(video, "loadeddata");
    video.src = url;
    await loaded;
    const clipDuration = Math.min(video.duration, 12);
    if (!Number.isFinite(clipDuration) || clipDuration < 4) throw new Error("Choose a clip at least four seconds long.");
    let audio;
    try {
      audio = await context.decodeAudioData(await (audioFile ?? videoFile).arrayBuffer());
    } catch {
      throw new Error("No decodable audio was found. Supply an audio file from the same clip.");
    }
    if (audio.duration < 4) throw new Error("Choose at least four seconds of audio.");
    if (Math.abs(audio.duration - video.duration) > .75) {
      throw new Error("Audio and video lengths differ. Use audio exported from this clip.");
    }
    byId("lip-status").textContent = "Loading face landmarks…";
    const detector = await getDetector();
    const hz = 10;
    const count = Math.floor(Math.min(clipDuration, audio.duration) * hz);
    const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
    const mouth = [], energy = [];
    for (let i = 0; i < count; i++) {
      if (i % 10 === 0) byId("lip-status").textContent = `Analyzing ${i}/${count} samples…`;
      const t = (i + .5) / hz;
      const seeked = waitForMedia(video, "seeked");
      video.currentTime = t;
      await seeked;
      const { faceLandmarks } = detector.detect(video);
      const face = faceLandmarks.length === 1 ? faceLandmarks[0] : undefined;
      const width = face ? Math.abs(face[61].x - face[291].x) * video.videoWidth : 0;
      const opening = width > 8 ? Math.abs(face[13].y - face[14].y) * video.videoHeight / width : null;
      mouth.push(opening);
      const start = Math.floor(i * audio.sampleRate / hz);
      const end = Math.floor((i + 1) * audio.sampleRate / hz);
      let sum = 0;
      for (const channel of channels) for (let j = start; j < end; j++) sum += channel[j] ** 2;
      energy.push(Math.sqrt(sum / ((end - start) * channels.length)));
    }
    if (mouth.filter(Number.isFinite).length / count < .7) {
      throw new Error("A single face could not be tracked reliably. Try a close, front-facing clip with one speaker.");
    }
    return estimateLag(mouth, energy, hz);
  } finally {
    await context.close();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

function render(result, source) {
  const panel = byId("lip-result");
  panel.replaceChildren();
  byId("lip-status").textContent = result ? source : "Inconclusive timing. No clear correlation peak was found.";
  if (!result) return;
  for (const [label, value] of [["Estimated offset", result.milliseconds + " ms"],
    ["Correlation", result.correlation.toFixed(2)], ["Overlapping samples", result.samples]]) {
    const card = document.createElement("div");
    card.className = "kpi";
    const name = document.createElement("span");
    name.textContent = label;
    const number = document.createElement("strong");
    number.textContent = value;
    card.append(name, number);
    panel.append(card);
  }
}

byId("lip-example").addEventListener("click", () => render(timingExample(), "Generated timing example with a known 300 ms audio delay."));
byId("lip-run").addEventListener("click", async () => {
  const video = byId("lip-video").files[0];
  const audio = byId("lip-audio").files[0];
  if (!video || video.size > 40_000_000 || (audio && audio.size > 40_000_000)) {
    byId("lip-status").textContent = "Choose a video and keep each file under 40 MB.";
    return;
  }
  const buttons = [byId("lip-run"), byId("lip-example")];
  buttons.forEach(button => { button.disabled = true; });
  byId("lip-result").replaceChildren();
  byId("lip-status").textContent = "Reading the video and audio…";
  try {
    render(await measure(video, audio), "Lip and audio timing estimate");
  } catch (error) {
    byId("lip-status").textContent = error.message || "Could not analyze this clip.";
  } finally {
    buttons.forEach(button => { button.disabled = false; });
  }
});
