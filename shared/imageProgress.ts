export type ImageKind = "face" | "scene";
export type ImageProgressStage = "idle" | "preparing" | "uploading" | "analyzing" | "ready" | "error";

export type ImageProgressInfo = {
  value: number;
  label: string;
  detail: string;
};

const IMAGE_PROGRESS: Record<ImageKind, Record<ImageProgressStage, ImageProgressInfo>> = {
  scene: {
    idle: { value: 0, label: "", detail: "" },
    preparing: { value: 24, label: "Preparando a imagem", detail: "Otimizando a foto para o envio" },
    uploading: { value: 68, label: "Enviando a imagem", detail: "Guardando a direção visual com segurança" },
    analyzing: { value: 84, label: "Lendo a direção visual", detail: "Organizando pose, roupa e ambiente" },
    ready: { value: 100, label: "Imagem pronta", detail: "A direção visual está disponível" },
    error: { value: 0, label: "", detail: "" },
  },
  face: {
    idle: { value: 0, label: "", detail: "" },
    preparing: { value: 20, label: "Preparando a foto", detail: "Otimizando o rosto para o envio" },
    uploading: { value: 54, label: "Enviando a foto", detail: "Guardando a referência com segurança" },
    analyzing: { value: 84, label: "Analisando os traços", detail: "Identificando características visuais editáveis" },
    ready: { value: 100, label: "Traços preenchidos", detail: "A foto de rosto foi analisada" },
    error: { value: 0, label: "", detail: "" },
  },
};

export function getImageProgressInfo(kind: ImageKind, stage: ImageProgressStage): ImageProgressInfo {
  return IMAGE_PROGRESS[kind][stage];
}

export function isImageProgressActive(stage: ImageProgressStage): boolean {
  return stage === "preparing" || stage === "uploading" || stage === "analyzing";
}
