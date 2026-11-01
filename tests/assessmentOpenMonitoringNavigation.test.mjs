import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(projectRoot, "src/App.jsx"), "utf8");
const start = source.indexOf("function Assessment() {");
const end = source.indexOf("function Monitoring()", start);
const assessment = source.slice(start, end > start ? end : undefined);

test("Assessment initializes useNavigate before the submission result renders", () => {
  assert.ok(start !== -1, "Assessment component not found");
  const hook = assessment.match(/const\s+navigate\s*=\s*useNavigate\s*\(\s*\)\s*;/);
  assert.ok(hook, "Missing useNavigate hook in Assessment; Open Monitoring will throw on click");
  const result = assessment.indexOf("if (saved)");
  assert.ok(result > hook.index, "Navigation hook must run before the saved result return");
});

test("Open Monitoring button routes to the student's monitoring page", () => {
  assert.match(
    assessment,
    /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*navigate\s*\(\s*["']\/monitoring["']\s*\)\s*\}/,
    "Assessment result button should navigate to /monitoring"
  );
});
