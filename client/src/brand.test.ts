import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const documentSource = readFileSync(resolve(projectRoot, "client/index.html"), "utf8");

describe("Tezza brand", () => {
  it("shows the complete generator name in the header and hero", () => {
    expect(homeSource).toContain("PROMPTS OFICIAL GERADOR");
    expect(homeSource).toContain("TEZZA PROMPTS OFICIAL<br />GERADOR");
  });

  it("uses the complete generator name as the browser title", () => {
    expect(documentSource).toContain("<title>TEZZA PROMPTS OFICIAL GERADOR</title>");
  });
});
