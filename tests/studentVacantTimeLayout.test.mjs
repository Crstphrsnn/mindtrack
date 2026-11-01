import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const component = readFileSync(new URL("../src/components/StudentVacantTime.jsx", import.meta.url), "utf8");

test("closed weekday cards are not stretched to match the open card", () => {
  const rule = css.match(/\.student-vacant-days\s*\{([^}]*)\}/)?.[1];
  assert.ok(rule, "Missing .student-vacant-days CSS rule");
  assert.match(rule, /\balign-items\s*:\s*start\s*;/);
});

test("weekday accordion keeps one open day and preserves saved slot selections", () => {
  assert.match(component, /<details[^>]*name="student-vacant-weekdays"/);
  assert.match(component, /checked=\{slots\.some\(row => row\.weekday === day\.value && row\.time_slot === time\)\}/);
  assert.match(component, /await saveMyStudentVacantSlots\(slots\)/);
});
