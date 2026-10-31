import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/components/Layout.jsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/pages/counselor/CounselorTransfers.jsx", import.meta.url), "utf8");

test("Transfers appears in the counselor sidebar only", () => {
  const counselorMenu = layout.match(/counselor:\s*\[([\s\S]*?)\],\s*super_admin:/)?.[1];
  assert.ok(counselorMenu, "Counselor sidebar menu should exist");
  assert.match(counselorMenu, /\["\/transfers", "Transfers", ArrowLeftRight\]/);
  const adminMenu = layout.split("super_admin: [")[1]?.split("],")[0] || "";
  assert.doesNotMatch(adminMenu, /\/transfers/);
});

test("The Transfers page route is restricted to counselors", () => {
  assert.match(app, /path="\/transfers"[\s\S]{0,160}allowedRoles=\{\["counselor"\]\}/);
  assert.match(app, /<CounselorTransfers\s*\/>/);
});

test("The counselor dashboard no longer renders transfer request panels", () => {
  const dashboard = app.split("function Dashboard() {")[1]?.split("// Teaching / Non-teaching users are referral staff")[0] || "";
  assert.doesNotMatch(dashboard, /One-Time Counselor Transfer|Counselor Transfer Requests|submitDashboardTransfer/);
  assert.doesNotMatch(dashboard, /useRows\(\s*"transferRequests"/);
});

test("Dedicated Transfers page retains request, accept, decline, and pending views", () => {
  assert.match(page, /Request one-time transfer/);
  assert.match(page, /Accept transfer/);
  assert.match(page, /Cancel transfer/);
  assert.match(page, /Outgoing transfers awaiting selected counselor decision/);
  assert.match(page, /submitOneTimeCounselorTransfer/);
  assert.match(page, /approveOneTimeCounselorTransfer/);
  assert.match(page, /cancelOneTimeCounselorTransfer/);
});
