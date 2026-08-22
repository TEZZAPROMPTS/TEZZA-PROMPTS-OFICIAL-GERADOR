export const ASPECT_RATIO_OPTIONS = [
  { value: "1:1", label: "Quadrado", prompt: "Square 1:1 aspect ratio." },
  { value: "9:16", label: "Vertical", prompt: "Vertical 9:16 aspect ratio." },
  { value: "16:9", label: "Horizontal", prompt: "Horizontal 16:9 aspect ratio." },
  { value: "4:5", label: "Vertical", prompt: "Vertical 4:5 aspect ratio." },
] as const;

export type AspectRatio = (typeof ASPECT_RATIO_OPTIONS)[number]["value"];

export const DEFAULT_ASPECT_RATIO: AspectRatio = "9:16";

export function getAspectRatioOption(aspectRatio: AspectRatio) {
  return ASPECT_RATIO_OPTIONS.find(option => option.value === aspectRatio) ?? ASPECT_RATIO_OPTIONS[1];
}

export function applyAspectRatioToCameraComposition(cameraComposition: string, aspectRatio: AspectRatio) {
  const option = getAspectRatioOption(aspectRatio);
  const withoutAspectRatios = cameraComposition
    .replace(/\b(?:square|vertical|horizontal)?\s*(?:1\s*:\s*1|9\s*:\s*16|16\s*:\s*9|4\s*:\s*5)\s*(?:aspect\s*ratio|ratio)?\b/gi, "")
    .replace(/\b(?:square|vertical|horizontal)\s+(?:format|aspect\s*ratio|ratio)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
  return `${option.prompt}${withoutAspectRatios ? ` ${withoutAspectRatios}` : ""}`;
}
