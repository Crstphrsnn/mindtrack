import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/pages/counselor/CounselorTransfers.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/pages/counselor/CounselorTransfers.css", import.meta.url), "utf8");

test("Transfers UI has a scoped stylesheet and no App or global stylesheet edits", () => {
  assert.match(page, /import "\.\/CounselorTransfers\.css";/);
  assert.match(page, /className="mt-transfers"/);
  assert.match(styles, /\.mt-transfers\s*\{/);
});

test("transfer overview counts are based on real Supabase rows", () => {
  assert.match(page, /useRows\("transferRequests", isCounselor/);
  assert.match(page, /pendingIncoming\.length/);
  assert.match(page, /pendingOutgoing\.length/);
  assert.match(page, /resolvedTransfers\.length/);
  assert.match(page, /\[\.\.\.incomingTransfers, \.\.\.outgoingTransfers\]/);
});

test("request form retains one-time eligibility and required reason validation", () => {
  assert.match(page, /!item\.transferUsed && !item\.transferPending/);
  assert.match(page, /item\.active && \(item\.counselorId \|\| item\.id\) !== user\?\.id/);
  assert.match(page, /reason\.length < 3 \|\| reason\.length > 1000/);
  assert.match(page, /minLength=\{3\} maxLength=\{1000\} required/);
  assert.match(page, /window\.confirm\(/);
});

test("all transfer actions still use existing Supabase service functions", () => {
  assert.match(page, /await submitOneTimeCounselorTransfer\(student\.id, transferTargetId, reason\)/);
  assert.match(page, /await approveOneTimeCounselorTransfer\(transfer\.id\)/);
  assert.match(page, /await cancelOneTimeCounselorTransfer\(transfer\.id, reason\)/);
  assert.match(page, /transfer\.targetCounselorId !== user\?\.id/);
  assert.match(page, /setHandledTransferIds/);
});

test("Incoming, Outgoing, and History views are interactive and accessible", () => {
  assert.match(page, /role="tablist"/);
  assert.match(page, /aria-selected=\{activeTab === id\}/);
  assert.match(page, /onClick=\{\(\) => setActiveTab\(id\)\}/);
  assert.match(page, /role="tabpanel"/);
  assert.match(page, /id: "incoming"/);
  assert.match(page, /id: "outgoing"/);
  assert.match(page, /id: "history"/);
});

test("approval and decline are limited to receiving counselor's pending requests", () => {
  assert.match(page, /transfer\.status !== PENDING_STATUS/);
  assert.match(page, /row\.requestedById !== user\.id/);
  assert.match(page, /disabled=\{Boolean\(processingTransferId\) \|\| handledTransferIds\.has\(transfer\.id\)\}/);
});

test("responsive layout does not force a wide form on mobile", () => {
  assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 720px\)/);
  assert.match(styles, /\.mt-transfer-fields \{ grid-template-columns: 1fr; \}/);
  assert.match(styles, /@media \(max-width: 440px\)/);
});

test("transfer page uses helpful empty states and privacy reminder", () => {
  assert.match(page, /No incoming requests/);
  assert.match(page, /No outgoing requests/);
  assert.match(page, /No resolved records available/);
  assert.match(page, /Do not include confidential assessment scores/);
});
