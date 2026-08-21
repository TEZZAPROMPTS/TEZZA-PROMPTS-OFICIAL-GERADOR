import type { Express } from "express";
import { describe, expect, it } from "vitest";
import { validateReferenceImage } from "./uploadReference";

function createUpload(buffer: Buffer, mimetype: string): Express.Multer.File {
  return {
    fieldname: "image",
    originalname: "reference-file",
    encoding: "7bit",
    mimetype,
    size: buffer.length,
    stream: null as never,
    destination: "",
    filename: "",
    path: "",
    buffer,
  };
}

describe("validateReferenceImage", () => {
  it("accepts a valid PNG face upload", () => {
    const file = createUpload(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]), "image/png");

    expect(validateReferenceImage(file, "face")).toEqual({ kind: "face", contentType: "image/png", extension: "png" });
  });

  it("rejects a mismatched MIME type and file signature", () => {
    const file = createUpload(Buffer.from("not-an-image"), "image/jpeg");

    expect(() => validateReferenceImage(file, "scene")).toThrow("não corresponde a uma imagem válida");
  });

  it("rejects an upload that does not declare a supported reference kind", () => {
    const file = createUpload(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg");

    expect(() => validateReferenceImage(file, "avatar")).toThrow("rosto ou de cena");
  });
});
