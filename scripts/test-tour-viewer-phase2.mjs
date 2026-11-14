/**
 * Phase 2 regression checks (no test framework).
 * Mirrors:
 *  - src/lib/tour-shares/viewer-notify-policy.ts
 *  - src/lib/auth/permissions.ts tour_viewers decisions
 *  - notification preference skip semantics used by server.ts
 *
 * Run: node scripts/test-tour-viewer-phase2.mjs
 */

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${label}`);
}

function assert(cond, label) {
  if (!cond) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${label}`);
}

// --- A/B/C/D: notify policy (insert success only) ---
function shouldNotifyNewTourViewer({ viewRecorded }) {
  return viewRecorded === true;
}

assertEqual(shouldNotifyNewTourViewer({ viewRecorded: true }), true, "A: new recorded viewer → notify");
assertEqual(shouldNotifyNewTourViewer({ viewRecorded: false }), false, "B: failed/skipped insert → no notify");
assertEqual(
  shouldNotifyNewTourViewer({ viewRecorded: false }),
  false,
  "C: duplicate/reuse (viewRecorded false) → no notify"
);

// D: notification failure must not block unlock — policy is fire-and-forget; unlock
// returns independently. Simulate: notify throws after unlock payload is ready.
function unlockThenNotify(viewRecorded) {
  const unlock = { ok: true, viewRecorded };
  let notifyThrew = false;
  try {
    if (shouldNotifyNewTourViewer({ viewRecorded })) {
      throw new Error("provider down");
    }
  } catch {
    notifyThrew = true;
  }
  return { unlockOk: unlock.ok === true, notifyThrew };
}
const d = unlockThenNotify(true);
assertEqual(d.unlockOk, true, "D: unlock still ok when notify throws");
assertEqual(d.notifyThrew, true, "D: notify failure is caught by caller");

// --- Copy minimization (no email/phone) ---
function buildTourViewerNotifyCopy({ viewerName, projectName, tourName }) {
  const name = viewerName.trim() || "Someone";
  const project = projectName.trim() || "a project";
  const tour = tourName.trim() || "a tour";
  return {
    title: "New tour viewer",
    message: `${name} opened the shared tour "${tour}" on ${project}. Open Tour Viewers for contact details.`,
    link: "/admin/tour-viewers",
  };
}
const copy = buildTourViewerNotifyCopy({
  viewerName: "Alex",
  projectName: "Tower A",
  tourName: "Floor 3",
});
assertEqual(copy.link, "/admin/tour-viewers", "privacy: links to protected admin page");
assert(!/alex@|phone|\+91|@/i.test(copy.message), "privacy: message omits email/phone");
assert(/Alex/.test(copy.message) && /Tower A/.test(copy.message), "copy includes name + project");

// --- E/F/G/H: permission matrix (mirrors permissions.ts) ---
const STAFF_FULL = ["create", "read", "update", "delete", "upload", "approve"];
const ADMIN_OPS_MATRIX = {
  tour_viewers: ["read"],
};
const PERMISSIONS = {
  super_admin: { tour_viewers: STAFF_FULL },
  admin: { ...ADMIN_OPS_MATRIX },
  operations_manager: { ...ADMIN_OPS_MATRIX },
  client_admin: {},
  client: {},
  client_user: {},
  site_supervisor: {},
  site_engineer: {},
  read_only_client: {},
  consultant: {},
};

function can(role, action, resource) {
  const allowed = PERMISSIONS[role]?.[resource] ?? [];
  return allowed.includes(action);
}

assertEqual(can("super_admin", "read", "tour_viewers"), true, "E: super_admin can read tour_viewers");
assertEqual(can("admin", "read", "tour_viewers"), true, "F: admin can read tour_viewers");
assertEqual(
  can("operations_manager", "read", "tour_viewers"),
  true,
  "G: operations_manager can read tour_viewers (ops policy)"
);
assertEqual(can("client_admin", "read", "tour_viewers"), false, "H: client_admin cannot read tour_viewers");
assertEqual(can("client", "read", "tour_viewers"), false, "H: client cannot read tour_viewers");
assertEqual(can("consultant", "read", "tour_viewers"), false, "H: consultant cannot read tour_viewers");

// I: server-action style guard — unauthorized → denied (simulate requireStaffPermission)
function guardListViewers(role) {
  if (!can(role, "read", "tour_viewers")) {
    return { ok: false, error: "You do not have permission to perform this action" };
  }
  return { ok: true, viewers: [] };
}
assertEqual(guardListViewers("admin").ok, true, "I: admin server-action allowed");
assertEqual(guardListViewers("client").ok, false, "I: client server-action denied");
assertEqual(guardListViewers("operations_manager").ok, true, "I: ops server-action allowed");

// J: notification preferences — email skipped when disabled
function shouldSendEmail(user) {
  return user.email_notifications !== false;
}
assertEqual(shouldSendEmail({ email_notifications: true }), true, "J: email pref on → send");
assertEqual(shouldSendEmail({ email_notifications: false }), false, "J: email pref off → skip");
assertEqual(shouldSendEmail({ email_notifications: null }), true, "J: null pref defaults to send");

// Rule gate: platform toggle off → no staff notify
function staffNotifyAllowed(ruleEnabled, viewRecorded) {
  return ruleEnabled === true && shouldNotifyNewTourViewer({ viewRecorded });
}
assertEqual(staffNotifyAllowed(false, true), false, "J: onTourViewer disabled → no notify");
assertEqual(staffNotifyAllowed(true, true), true, "J: onTourViewer enabled + new view → notify");

// Recipient filter: only roles with tour_viewers read
const staffRows = [
  { id: "1", role: "super_admin" },
  { id: "2", role: "admin" },
  { id: "3", role: "operations_manager" },
  { id: "4", role: "client_admin" },
];
const recipients = staffRows
  .filter((row) => can(row.role, "read", "tour_viewers"))
  .map((row) => row.id);
assertEqual(recipients.join(","), "1,2,3", "recipients exclude client roles");

if (!process.exitCode) {
  console.log("\nAll Phase 2 tour-viewer checks passed.");
}
