import { invokeLLM } from "./_core/llm";

export const METHOD_ONE_OPENING =
  "Ultra-realistic cinematic avatar 3D female portrait, Blender Cycles render in CGI, inspired by Seedream 5.0 beauty realism and high-end IMVU/The Sims virtual aesthetics. Clearly a fictional digital avatar and not a real photograph. Hyper-detailed virtual influencer design with stylized CGI beauty proportions, luxury editorial aesthetics, advanced cinematic lighting, ultra-polished 3D rendering, and “TEZZA PROMPTS” text at the bottom center in elegant minimalist typography.";

export const METHOD_ONE_CLOSING =
  "Ultra-photorealistic Blender Cycles CGI render, cinematic realism, Seedream 5.0 beauty rendering, 8K UHD quality, physically accurate lighting and materials, realistic skin micro-detail, IMVU-inspired beauty repaint style, high-fidelity feminine avatar rendering, realistic depth of field, glossy beauty aesthetic, polished virtual influencer atmosphere, advanced ray tracing, realistic reflections, luxury editorial lighting, ultra-clean cinematic render quality, and clearly fictional CGI avatar aesthetics instead of a real photograph.";

export const SECTION_DEFINITIONS = [
  { key: "cameraComposition", heading: "CAMERA & COMPOSITION" },
  { key: "poseBodyPositioning", heading: "POSE & BODY POSITIONING" },
  { key: "headPositionGaze", heading: "HEAD POSITION & GAZE" },
  { key: "facialExpression", heading: "FACIAL EXPRESSION" },
  { key: "faceIdentity", heading: "FACE & IDENTITY" },
  { key: "hair", heading: "HAIR" },
  { key: "accessoriesDetails", heading: "ACCESSORIES & DETAILS" },
  { key: "outfit", heading: "OUTFIT" },
  { key: "bodyPhysique", heading: "BODY & PHYSIQUE" },
  { key: "skinRealism", heading: "SKIN & REALISM" },
  { key: "lighting", heading: "LIGHTING" },
  { key: "environment", heading: "ENVIRONMENT" },
  { key: "moodAesthetic", heading: "MOOD & AESTHETIC" },
  { key: "styleRenderQuality", heading: "STYLE & RENDER QUALITY" },
] as const;

type SectionKey = (typeof SECTION_DEFINITIONS)[number]["key"];
export type PromptSections = Record<SectionKey, string>;
export type GeneratorMode = "text" | "photo";

const EMPTY_SECTION_FALLBACK =
  "Render this element with cohesive, high-end virtual editorial detail that remains faithful to the provided direction.";

const JSON_PROPERTIES = Object.fromEntries(
  SECTION_DEFINITIONS.map(({ key, heading }) => [
    key,
    {
      type: "string",
      description: `English prompt prose for ${heading}. Do not repeat the heading.`,
    },
  ])
);

function cleanSection(value: unknown) {
  if (typeof value !== "string") return EMPTY_SECTION_FALLBACK;

  const noReferenceLanguage = value
    .replace(/```[\s\S]*?```/g, "")
    .replace(
      /\b(?:this|the|a|an|from the|based on the)\s+(?:reference\s+)?(?:image|photo|picture)\b/gi,
      "the provided visual details"
    )
    .replace(/\b(?:reference\s+)?(?:image|photo|picture)\b/gi, "provided visual details")
    .replace(/[→➜➝]/g, "")
    .trim();

  const withoutTattooDescription = noReferenceLanguage
    .split(/(?<=[.!?])\s+/)
    .filter(sentence => !/\btattoos?\b/i.test(sentence))
    .join(" ")
    .trim();

  return withoutTattooDescription || EMPTY_SECTION_FALLBACK;
}

export function normalizeSections(candidate: Partial<PromptSections>): PromptSections {
  return Object.fromEntries(
    SECTION_DEFINITIONS.map(({ key }) => [key, cleanSection(candidate[key])])
  ) as PromptSections;
}

export function renderMethodOnePrompt(sections: PromptSections) {
  const body = SECTION_DEFINITIONS.map(({ key, heading }) => `${heading}\n${sections[key]}`).join("\n\n");
  return `${METHOD_ONE_OPENING}\n\n${body}\n\n${METHOD_ONE_CLOSING}`;
}

export function buildGenerationMessages(input: {
  mode: GeneratorMode;
  userText?: string;
  imageDataUrl?: string;
}) {
  const system = `You are the content engine for TEZZA PROMPTS. Produce only a strict JSON object matching the supplied schema. Write every value in polished English prose. The final renderer—not you—will add the fixed opening, fixed ending, and section headings.

Interpret the user's direction into a premium, fictional CGI adult female virtual-avatar prompt. The avatar is always clearly fictional and never a real photograph. Preserve all user-supplied visual facts. When a photo is supplied, extract only what is visibly present: facial structure, hair, pose, hands, framing, camera angle, expression, clothing, accessories, proportions, lighting, environment, composition, and visual identity. Do not invent, substitute, embellish, exaggerate, or reinterpret visible elements.

Rules without exception: never mention an image, photo, picture, reference, upload, source, or analysis; never use arrows; never include Markdown or headings in a value; never describe tattoos; never refer to minors; never output an instruction, disclaimer, explanation, or code fence. Keep each value specific to its section, coherent, non-explicit, and suitable for a luxury editorial CGI rendering prompt.`;

  if (input.mode === "photo" && input.imageDataUrl) {
    return [
      { role: "system" as const, content: system },
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: "Extract the visible visual direction with maximum fidelity and fill every prompt section. Do not add elements that are not visibly supported.",
          },
          {
            type: "image_url" as const,
            image_url: { url: input.imageDataUrl, detail: "high" as const },
          },
        ],
      },
    ];
  }

  return [
    { role: "system" as const, content: system },
    {
      role: "user" as const,
      content: `Create the section content from this direction: ${input.userText?.trim() || "Luxury virtual avatar editorial scene."}`,
    },
  ];
}

export async function generateMethodOnePrompt(input: {
  mode: GeneratorMode;
  userText?: string;
  imageDataUrl?: string;
}) {
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    messages: buildGenerationMessages(input),
    maxTokens: 4600,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tezza_prompt_sections",
        strict: true,
        schema: {
          type: "object",
          properties: JSON_PROPERTIES,
          required: SECTION_DEFINITIONS.map(section => section.key),
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("The generation service returned an empty response.");
  }

  try {
    const parsed = JSON.parse(content) as Partial<PromptSections>;
    return renderMethodOnePrompt(normalizeSections(parsed));
  } catch {
    throw new Error("The generation service returned an invalid structured response.");
  }
}
