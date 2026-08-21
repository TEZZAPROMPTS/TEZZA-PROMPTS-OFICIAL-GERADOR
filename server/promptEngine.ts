import { invokeLLM } from "./_core/llm";

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
export type PromptMethod = "feminine" | "masculine";

type MethodSpec = {
  label: string;
  avatarDescription: string;
  opening: string;
  closing: string;
  baseDirection: string;
};

export const METHOD_SPECS: Record<PromptMethod, MethodSpec> = {
  feminine: {
    label: "Método Feminino",
    avatarDescription: "adult female virtual avatar with feminine CGI beauty proportions",
    opening:
      "Ultra-realistic cinematic avatar 3D female portrait, Blender Cycles render in CGI, inspired by Seedream 5.0 beauty realism and high-end IMVU/The Sims virtual aesthetics. Clearly a fictional digital avatar and not a real photograph. Hyper-detailed virtual influencer design with stylized CGI beauty proportions, luxury editorial aesthetics, advanced cinematic lighting, ultra-polished 3D rendering, and “TEZZA PROMPTS” text at the bottom center in elegant minimalist typography.",
    closing:
      "Ultra-photorealistic Blender Cycles CGI render, cinematic realism, Seedream 5.0 beauty rendering, 8K UHD quality, physically accurate lighting and materials, realistic skin micro-detail, IMVU-inspired beauty repaint style, high-fidelity feminine avatar rendering, realistic depth of field, glossy beauty aesthetic, polished virtual influencer atmosphere, advanced ray tracing, realistic reflections, luxury editorial lighting, ultra-clean cinematic render quality, and clearly fictional CGI avatar aesthetics instead of a real photograph.",
    baseDirection:
      "This is the Female Method 1 Gemini structure. Keep an adult female fictional CGI avatar with polished virtual-influencer beauty, feminine anatomy, luxury editorial composition, Blender Cycles material realism, Seedream 5.0 beauty rendering, IMVU/The Sims virtual-avatar aesthetics, cinematic depth, and physically plausible lighting. The user direction or visible photo determines every individual attribute such as hair, face, pose, clothing, accessories, body proportions, setting, and lighting; never default to the example woman's blonde hair, Brazil jersey, apartment, piercing, or any other sample-only detail unless the user direction or visible photo supports it.",
  },
  masculine: {
    label: "Método Masculino",
    avatarDescription: "adult male virtual avatar with masculine CGI proportions",
    opening:
      "Ultra-realistic cinematic avatar 3D male portrait, Blender Cycles render in CGI, inspired by Seedream 5.0 realism and high-end IMVU/The Sims virtual aesthetics. Clearly a fictional digital avatar and not a real photograph. Hyper-detailed virtual influencer design with stylized CGI masculine proportions, luxury editorial aesthetics, advanced cinematic lighting, ultra-polished 3D rendering, and “TEZZA PROMPTS” text at the bottom center in elegant minimalist typography.",
    closing:
      "Ultra-photorealistic Blender Cycles CGI render, cinematic realism, Seedream 5.0 masculine beauty rendering, 8K UHD quality, physically accurate lighting and materials, realistic skin micro-detail, IMVU-inspired avatar repaint aesthetics, high-fidelity masculine CGI rendering, realistic atmospheric depth, polished virtual influencer styling, advanced ray tracing, realistic reflections, luxury editorial lighting, ultra-clean cinematic render quality, and clearly fictional CGI-avatar aesthetics instead of a real photograph.",
    baseDirection:
      "This is the Male Method 1 Gemini structure. Keep an adult male fictional CGI avatar with polished virtual-influencer realism, masculine anatomy, luxury editorial composition, Blender Cycles material realism, Seedream 5.0 masculine beauty rendering, IMVU/The Sims virtual-avatar aesthetics, cinematic depth, and physically plausible lighting. The user direction or visible photo determines every individual attribute such as hair, face, pose, clothing, accessories, body proportions, setting, and lighting; never default to the example man's black curls, beard, balcony, necklace, shirtless styling, or any other sample-only detail unless the user direction or visible photo supports it.",
  },
};

// Backward-compatible exports for the original Feminine Method 01.
export const METHOD_ONE_OPENING = METHOD_SPECS.feminine.opening;
export const METHOD_ONE_CLOSING = METHOD_SPECS.feminine.closing;

const EMPTY_SECTION_FALLBACK =
  "Render this element with cohesive, high-end virtual editorial detail that remains faithful to the provided direction.";

const STYLE_SECTION_FALLBACK =
  "The scene is rendered with cohesive material textures, depth, and visual treatment that reflect the requested direction.";

const FIXED_CLOSING_STYLE_LANGUAGE = [
  /\bhigh-fidelity\b/gi,
  /\bblender\s+cycles(?:\s+(?:cgi\s+)?render(?:ing)?)?\b/gi,
  /\bseedream\s*5(?:\.0)?(?:\s+(?:(?:masculine\s+)?beauty\s+(?:shaders?|rendering)))?\b/gi,
  /\b(?:cinematic\s+)?virtual-?avatar\s+aesthetics?\b/gi,
  /\bimvu-inspired(?:\s+avatar)?(?:\s+repaint)?\s+aesthetics?\b/gi,
  /\badvanced\s+ray\s+tracing\b/gi,
  /\b8k\s+uhd(?:\s+quality)?\b/gi,
  /\bpolished\s+virtual\s+influencer\s+(?:atmosphere|styling)\b/gi,
];

const JSON_PROPERTIES = Object.fromEntries(
  SECTION_DEFINITIONS.map(({ key, heading }) => [
    key,
    { type: "string", description: `English prompt prose for ${heading}. Do not repeat the heading.` },
  ])
);

function cleanSection(value: unknown) {
  if (typeof value !== "string") return EMPTY_SECTION_FALLBACK;
  const noReferenceLanguage = value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\b(?:this|the|a|an|from the|based on the)\s+(?:reference\s+)?(?:image|photo|picture)\b/gi, "the established visual identity")
    .replace(/\b(?:reference\s+)?(?:image|photo|picture)\b/gi, "the established visual identity")
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

function parseStructuredJson(content: string): unknown {
  const withoutCodeFence = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const firstBrace = withoutCodeFence.indexOf("{");
  const lastBrace = withoutCodeFence.lastIndexOf("}");
  const json = firstBrace >= 0 && lastBrace >= firstBrace
    ? withoutCodeFence.slice(firstBrace, lastBrace + 1)
    : withoutCodeFence;
  return JSON.parse(json);
}

type TraitBlocks = { faceIdentity: string; hair: string; bodyPhysique: string };

function valueAfterLabel(source: string, label: string, followingLabels: string[]) {
  const start = source.search(new RegExp(`(?:^|\\n)${label}\\s*:`, "i"));
  if (start < 0) return "";
  const afterStart = source.slice(start).replace(new RegExp(`^(?:\\n)?${label}\\s*:\\s*`, "i"), "");
  const nextLabels = followingLabels.map(next => next.replace(/[&]/g, "\\&")).join("|");
  const endMatch = afterStart.match(new RegExp(`\\n(?:${nextLabels})\\s*:`, "i"));
  return (endMatch ? afterStart.slice(0, endMatch.index) : afterStart).trim();
}

function buildTraitBlocks(personalTraits?: string): TraitBlocks {
  const traits = personalTraits ? cleanSection(personalTraits) : "";
  if (!traits || traits === EMPTY_SECTION_FALLBACK) return { faceIdentity: "", hair: "", bodyPhysique: "" };

  const faceIdentity = valueAfterLabel(traits, "Face(?: & identity)?", ["Hair", "Body(?: & proportions| & physique)?"]);
  const hair = valueAfterLabel(traits, "Hair", ["Face(?: & identity)?", "Body(?: & proportions| & physique)?"]);
  const bodyPhysique = valueAfterLabel(traits, "Body(?: & proportions| & physique)?", ["Face(?: & identity)?", "Hair"]);

  if (faceIdentity || hair || bodyPhysique) return { faceIdentity, hair, bodyPhysique };

  return {
    faceIdentity: traits,
    hair: /\b(hair|hairstyle|curl\w*|wave\w*|straight|coily|braid\w*|bang\w*|fringe|blonde|brunette|black hair|brown hair|red hair)\b/i.test(traits) ? traits : "",
    bodyPhysique: /\b(body|build|physique|proportion|shoulder|waist|height|lean|athletic|curv|slim|broad)\b/i.test(traits) ? traits : "",
  };
}

function applyMandatoryIdentityTraits(sections: PromptSections, personalTraits?: string) {
  const traits = personalTraits ? cleanSection(personalTraits) : "";
  if (!traits || traits === EMPTY_SECTION_FALLBACK) return sections;
  const blocks = buildTraitBlocks(personalTraits);

  return {
    ...sections,
    faceIdentity: `Mandatory identity traits to preserve: ${blocks.faceIdentity || traits} ${sections.faceIdentity}`.trim(),
    hair: blocks.hair ? `Mandatory hair traits to preserve: ${blocks.hair} ${sections.hair}`.trim() : sections.hair,
    bodyPhysique: blocks.bodyPhysique ? `Mandatory body and proportion traits to preserve: ${blocks.bodyPhysique} ${sections.bodyPhysique}`.trim() : sections.bodyPhysique,
  };
}

function cleanStyleRenderQuality(method: PromptMethod, value: string) {
  const cleaned = cleanSection(value);
  const escapedClosing = METHOD_SPECS[method].closing.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutClosing = cleaned.replace(new RegExp(escapedClosing, "gi"), "").trim();
  const withoutFixedLanguage = FIXED_CLOSING_STYLE_LANGUAGE.reduce(
    (result, pattern) => result.replace(pattern, ""),
    withoutClosing
  );
  const polished = withoutFixedLanguage
    .replace(/\bwith\s*,\s*/gi, "")
    .replace(/\bwith\s*(?=[,.;!?]|$)/gi, "")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/\s+(?:and|or)\s*(?=[.!?]|$)/gi, "")
    .replace(/^[,;:\s]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^([a-z])/, (_, initial) => initial.toUpperCase());

  return polished || STYLE_SECTION_FALLBACK;
}

export function renderMethodPrompt(method: PromptMethod, sections: PromptSections, personalTraits?: string) {
  const preparedSections = {
    ...sections,
    styleRenderQuality: cleanStyleRenderQuality(method, sections.styleRenderQuality),
  };
  const lockedSections = applyMandatoryIdentityTraits(preparedSections, personalTraits);
  const body = SECTION_DEFINITIONS.map(({ key, heading }) => `${heading}\n${lockedSections[key]}`).join("\n\n");
  const spec = METHOD_SPECS[method];
  return `${spec.opening}\n\n${body}\n\n${spec.closing}`;
}

export function renderMethodOnePrompt(sections: PromptSections) {
  return renderMethodPrompt("feminine", sections);
}

export function buildGenerationMessages(input: {
  method?: PromptMethod;
  mode: GeneratorMode;
  userText?: string;
  personalTraits?: string;
  sceneImageUrl?: string;
}) {
  const method = input.method ?? "feminine";
  const spec = METHOD_SPECS[method];
  const traits = input.personalTraits?.trim();
  const priorityTraits = traits
    ? `NON-NEGOTIABLE PERSONAL TRAITS AND RESTRICTIONS: ${traits}\nThese are the highest-priority rules. Translate them into natural English prompt prose and apply them faithfully in the relevant sections. They override generic base styling whenever there is a conflict. You MUST include all face-identity traits in FACE & IDENTITY, all hair-specific traits in HAIR, and all body-specific traits in BODY & PHYSIQUE. The renderer will independently lock the complete trait set into FACE & IDENTITY as a final safeguard. Do not expose this label, any “insert here” marker, or the original Portuguese wording in the final prompt.`
    : "No additional personal traits were supplied.";

  const system = `You are the content engine for TEZZA PROMPTS. Produce only a strict JSON object matching the supplied schema. Write every value in polished English prose. The final renderer—not you—will add the method's immutable opening, immutable closing, and the 14 immutable section headings.

METHOD IDENTITY: ${spec.baseDirection}

OUTPUT CONTRACT: Populate exactly these sections, in their intended scope: CAMERA & COMPOSITION (aspect ratio, shot, framing, angle, focus); POSE & BODY POSITIONING (stance, torso, arms, hands, physical positioning); HEAD POSITION & GAZE (head angle, chin, eye direction); FACIAL EXPRESSION (emotion and mouth/eye expression); FACE & IDENTITY (adult ${spec.avatarDescription}, facial structure, skin tone and identity); HAIR (colour, type, texture, fall and movement); ACCESSORIES & DETAILS (only visibly supported accessories and grooming); OUTFIT (garments, fabrics and styling); BODY & PHYSIQUE (proportions and anatomy); SKIN & REALISM (pores, highlights and CGI material detail); LIGHTING (flash, ambient sources, reflections and shadows); ENVIRONMENT (location and background); MOOD & AESTHETIC (editorial atmosphere); STYLE & RENDER QUALITY (CGI render language only).

PRESERVATION PRIORITY: Preserve all user-supplied facts. In photo mode, the visible direction is absolute for facial structure, hairstyle, expression, pose, hand placement, body position, camera angle, framing, composition, perspective, lighting, clothing, accessories, proportions, and visual identity. Do not invent, substitute, embellish, exaggerate, or reinterpret those elements. In text mode, follow the user's requested direction with the same discipline.

${priorityTraits}

Rules without exception: never mention an image, photo, picture, reference, upload, source, analysis, the personal-traits label, or any “insert here” marker; never use arrows; never include Markdown or headings in a value; never describe tattoos; never refer to minors; never output an instruction, disclaimer, explanation, or code fence. Keep each value specific to its section, coherent, non-explicit, and suitable for a luxury editorial CGI rendering prompt. Write one concise sentence per section and keep every section under 55 words so the complete JSON response is never truncated. For both methods, STYLE & RENDER QUALITY must describe only the visual treatment of the requested scene. Do not output, repeat, or paraphrase the immutable opening or immutable closing there: the final renderer adds those fixed blocks separately.`;

  if (input.mode === "photo" && input.sceneImageUrl) {
    return [
      { role: "system" as const, content: system },
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: "This is the scene reference only. Extract its visible pose, body positioning, head angle, facial expression, framing, camera angle, composition, outfit, accessories, lighting, environment, mood, and render direction with maximum fidelity. Do not use it as the source of facial identity traits, because those traits are supplied separately above. Do not add elements that are not visibly supported, except the explicit non-negotiable personal traits supplied above." },
          { type: "image_url" as const, image_url: { url: input.sceneImageUrl, detail: "high" as const } },
        ],
      },
    ];
  }

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: `Create the section content from this direction: ${input.userText?.trim() || "Luxury virtual avatar editorial scene."}` },
  ];
}

export async function generateMethodPrompt(input: {
  method?: PromptMethod;
  mode: GeneratorMode;
  userText?: string;
  personalTraits?: string;
  sceneImageUrl?: string;
}) {
  const method = input.method ?? "feminine";
  const request = {
    model: "gemini-3-flash-preview",
    messages: buildGenerationMessages({ ...input, method }),
    maxTokens: 6400,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: `tezza_${method}_prompt_sections`,
        strict: true,
        schema: {
          type: "object",
          properties: JSON_PROPERTIES,
          required: SECTION_DEFINITIONS.map(section => section.key),
          additionalProperties: false,
        },
      },
    },
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await invokeLLM(request);
    const content = response.choices[0]?.message?.content;

    if (typeof content === "string") {
      try {
        const parsed = parseStructuredJson(content) as Partial<PromptSections>;
        return renderMethodPrompt(method, normalizeSections(parsed), input.personalTraits);
      } catch {
        // A retry below handles rare truncated or fenced model responses.
      }
    }
  }

  throw new Error("The generation service returned an invalid structured response.");
}

export function buildFaceTraitMessages(input: { method: PromptMethod; faceReferenceUrl: string }) {
  const method = input.method;
  const role = method === "feminine" ? "an adult feminine avatar" : "an adult masculine avatar";
  return [
    {
      role: "system" as const,
      content: `You extract only visible, non-sensitive appearance traits from a face reference for ${role}. Return only a strict JSON object with the English string fields "faceIdentity", "hair", and "bodyPhysique". Describe visible facial structure, apparent skin tone, eye appearance, eyebrow appearance, and facial proportions in faceIdentity. Describe hair colour, type, texture, fall or movement, and facial hair when visibly present in hair. Use bodyPhysique only for apparent body or proportion details that are visibly supported; otherwise return an empty string. Keep each value factual, concise, editable, and suitable for a fictional CGI avatar prompt. Do not identify the person, guess their name, age, ancestry, ethnicity, nationality, religion, health, personality, attractiveness, or any non-visible trait. Do not mention the photo, image, reference, analysis, tattoos, or any instruction. Do not use arrows or Markdown.`,
    },
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: "Extract editable visual face traits only. The traits will be combined later with a separate scene image." },
        { type: "image_url" as const, image_url: { url: input.faceReferenceUrl, detail: "high" as const } },
      ],
    },
  ];
}

export async function extractFaceTraits(input: { method: PromptMethod; faceReferenceUrl: string }) {
  const request = {
    model: "gemini-3-flash-preview",
    messages: buildFaceTraitMessages(input),
    maxTokens: 1100,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "tezza_face_traits",
        strict: true,
        schema: {
          type: "object",
          properties: {
            faceIdentity: { type: "string", description: "Editable English face and identity traits." },
            hair: { type: "string", description: "Editable English hair traits." },
            bodyPhysique: { type: "string", description: "Editable English body or proportion traits, when visibly supported." },
          },
          required: ["faceIdentity", "hair", "bodyPhysique"],
          additionalProperties: false,
        },
      },
    },
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await invokeLLM(request);
    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") continue;

    try {
      const parsed = parseStructuredJson(content) as { traits?: unknown; faceIdentity?: unknown; hair?: unknown; bodyPhysique?: unknown };
      const legacyTraits = cleanSection(parsed.traits);
      const faceIdentity = cleanSection(parsed.faceIdentity);
      const hair = cleanSection(parsed.hair);
      const bodyPhysique = cleanSection(parsed.bodyPhysique);
      const traits = legacyTraits !== EMPTY_SECTION_FALLBACK
        ? legacyTraits
        : [
            faceIdentity !== EMPTY_SECTION_FALLBACK ? `Face & identity: ${faceIdentity}` : "",
            hair !== EMPTY_SECTION_FALLBACK ? `Hair: ${hair}` : "",
            bodyPhysique !== EMPTY_SECTION_FALLBACK ? `Body & proportions: ${bodyPhysique}` : "",
          ].filter(Boolean).join("\n");
      if (traits !== EMPTY_SECTION_FALLBACK) return traits;
    } catch {
      // A retry below handles rare truncated or fenced model responses.
    }
  }

  throw new Error("The trait extraction service returned an invalid structured response.");
}

export const generateMethodOnePrompt = generateMethodPrompt;
