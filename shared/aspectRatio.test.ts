import { describe, expect, it } from "vitest";
import { applyAspectRatioToCameraComposition, ASPECT_RATIO_OPTIONS } from "./aspectRatio";

describe("aspect-ratio contract", () => {
  it("lists the four supported user-facing formats", () => {
    expect(ASPECT_RATIO_OPTIONS.map(option => option.value)).toEqual(["1:1", "9:16", "16:9", "4:5"]);
  });

  it("replaces a generated camera ratio with the selected format", () => {
    for (const option of ASPECT_RATIO_OPTIONS) {
      const camera = applyAspectRatioToCameraComposition("Vertical 9:16 aspect ratio portrait with a low-angle perspective.", option.value);
      expect(camera).toContain(option.prompt);
      if (option.value !== "9:16") expect(camera).not.toContain("9:16 aspect ratio");
    }
  });
});
