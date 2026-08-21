/** @vitest-environment jsdom */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ImageUploadProgress } from "./Home";

afterEach(cleanup);

describe("ImageUploadProgress", () => {
  it("renders an accessible face-analysis progress bar", () => {
    render(<ImageUploadProgress kind="face" stage="analyzing" />);

    const status = screen.getByRole("status");
    const progress = screen.getByRole("progressbar");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(progress.getAttribute("aria-valuenow")).toBe("84");
    expect(progress.getAttribute("aria-valuetext")).toContain("características visuais");
  });

  it("renders the active scene-upload progress with clear feedback", () => {
    render(<ImageUploadProgress kind="scene" stage="uploading" />);

    expect(screen.getByText("Enviando a imagem")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("68");
  });

  it("does not render a progress announcement for an inactive stage", () => {
    render(<ImageUploadProgress kind="scene" stage="ready" />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
