import { describe, expect, it } from "vitest";
import { getImageProgressInfo, isImageProgressActive } from "@shared/imageProgress";

describe("image progress states", () => {
  it("maps scene preparation and upload to clear ordered feedback", () => {
    const preparing = getImageProgressInfo("scene", "preparing");
    const uploading = getImageProgressInfo("scene", "uploading");
    const analyzing = getImageProgressInfo("scene", "analyzing");

    expect(preparing.value).toBeLessThan(uploading.value);
    expect(uploading.value).toBeLessThan(analyzing.value);
    expect(preparing.label).toContain("Preparando");
    expect(uploading.label).toContain("Enviando");
    expect(analyzing.label).toContain("Lendo");
  });

  it("exposes an analysis stage for a face reference", () => {
    const analysis = getImageProgressInfo("face", "analyzing");

    expect(analysis.value).toBe(84);
    expect(analysis.label).toContain("Analisando");
    expect(isImageProgressActive("analyzing")).toBe(true);
  });

  it("does not show a loading bar after completion or failure", () => {
    expect(isImageProgressActive("ready")).toBe(false);
    expect(isImageProgressActive("error")).toBe(false);
  });
});
