import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const block = app.slice(app.indexOf('function CounselingRequestsManagement()'), app.indexOf('function Schedule()'));

test('request review opens read-only and has explicit Edit / Save / Close buttons', () => {
  assert.match(block, /const \[reviewEditing, setReviewEditing\] = useState\(false\)/);
  assert.match(block, /setReviewEditing\(false\)/);
  assert.match(block, /className="review-request-modal-actions counseling-review-edit-actions"/);
  assert.match(block, /onClick=\{\(\) => setReviewEditing\(true\)\}/);
  assert.match(block, /disabled=\{reviewEditing \|\| saving/);
  assert.match(block, /disabled=\{!reviewEditing \|\| saving/);
  assert.match(block, /\{saving \? "Saving\.\.\." : "Save"\}/);
  assert.doesNotMatch(block, /Save request update & notes/);
});
test('notes have one footer Save, readonly when not editing, and are not shown to Super Admin', () => {
  assert.doesNotMatch(block, /Save private counseling notes/);
  assert.match(block, /user\.role === "counselor" && \(\s*<section\s+className="review-request-modal-card private-counseling-notes-card"/);
  assert.ok((block.match(/!reviewEditing \|\| requestIsReadOnly\(selected\)/g)||[]).length >= 5);
  assert.match(block, /if \(privateNotesDirty && user\.role === "counselor"\)/);
});
test('notes-only save does not force an unchanged terminated request update', () => {
  assert.match(block, /const requestChanges =/);
  assert.match(block, /if \(requestChanges\) \{\s*const sessionNumber = await updateCounselingRequest/);
  assert.match(block, /setReviewEditing\(false\);\s*if \(requestChanges \|\| privateNotesSavedThisAttempt\)/);
  assert.match(block, /You have unsaved counseling changes/);
});
test('three footer buttons are same size, disabled action is gray', () => {
  assert.match(css, /\.counseling-review-edit-actions\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.counseling-review-edit-actions > button:disabled\s*\{[^}]*background:\s*#e2e8f0/);
});
