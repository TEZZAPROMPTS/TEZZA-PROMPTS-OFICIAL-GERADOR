import type { Express } from "express";
import multer from "multer";
import { storagePut } from "./storage";

export const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;

type ReferenceKind = "face" | "scene";
type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";

const IMAGE_TYPES: Record<SupportedImageType, { extension: string; signature: (buffer: Buffer) => boolean }> = {
  "image/jpeg": { extension: "jpg", signature: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  "image/png": { extension: "png", signature: buffer => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { extension: "webp", signature: buffer => buffer.length >= 12 && buffer.subarray(0, 4).equals(Buffer.from("RIFF")) && buffer.subarray(8, 12).equals(Buffer.from("WEBP")) },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_REFERENCE_IMAGE_BYTES, files: 1 },
});

function isReferenceKind(value: unknown): value is ReferenceKind {
  return value === "face" || value === "scene";
}

function isSupportedImageType(value: string): value is SupportedImageType {
  return value in IMAGE_TYPES;
}

export function validateReferenceImage(file: Express.Multer.File | undefined, kind: unknown) {
  if (!isReferenceKind(kind)) throw new Error("Escolha se a imagem é de rosto ou de cena antes de enviar.");
  if (!file || !file.buffer?.length) throw new Error("Envie uma imagem válida em JPG, PNG ou WEBP.");
  if (!isSupportedImageType(file.mimetype)) throw new Error("Use uma imagem em JPG, PNG ou WEBP.");
  if (!IMAGE_TYPES[file.mimetype].signature(file.buffer)) throw new Error("O conteúdo do arquivo não corresponde a uma imagem válida.");

  return { kind, contentType: file.mimetype, extension: IMAGE_TYPES[file.mimetype].extension };
}

function getUploadErrorMessage(error: unknown) {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return "A imagem deve ter até 8 MB.";
  if (error instanceof Error) return error.message;
  return "Não foi possível enviar esta imagem agora. Tente novamente.";
}

export function registerReferenceUploadRoute(app: Express) {
  app.post("/api/upload-image", (req, res) => {
    upload.single("image")(req, res, async error => {
      if (error) return res.status(400).json({ message: getUploadErrorMessage(error) });

      try {
        const { kind, contentType, extension } = validateReferenceImage(req.file, req.body?.kind);
        const { key, url } = await storagePut(
          `tezza-prompts/references/${kind}/${crypto.randomUUID()}.${extension}`,
          req.file!.buffer,
          contentType,
        );
        return res.status(201).json({ key, url, contentType, size: req.file!.size });
      } catch (uploadError) {
        console.error("[Tezza Prompts] Reference upload failed", uploadError);
        return res.status(400).json({ message: getUploadErrorMessage(uploadError) });
      }
    });
  });
}
