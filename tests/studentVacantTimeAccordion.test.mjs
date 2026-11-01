import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../src/components/StudentVacantTime.jsx", import.meta.url), "utf8");

test("all weekday details belong to the same exclusive accordion group", () => {
  assert.match(component, /STUDENT_VACANT_DAYS\.map\(day => \(/);
  const detailsTags = [...component.matchAll(/<details\b[^>]*>/g)].map(match => match[0]);
  assert.equal(detailsTags.length, 1, "weekdays should share a single mapped details template");
  assert.match(detailsTags[0], /\bname="student-vacant-weekdays"/);
  assert.doesNotMatch(detailsTags[0], /\s(?:defaultOpen|open)=/);
});

test("each weekday keeps independent selected slots and existing save logic", () => {
  assert.match(component, /checked=\{slots\.some\(row => row\.weekday === day\.value && row\.time_slot === time\)\}/);
  assert.match(component, /onChange=\{\(\) => toggle\(day\.value, time\)\}/);
  assert.match(component, /await saveMyStudentVacantSlots\(slots\)/);
});
