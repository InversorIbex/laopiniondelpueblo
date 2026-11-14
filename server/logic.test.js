const test = require("node:test");
const assert = require("node:assert/strict");
const {
  haversineKm,
  shouldRemove,
  shouldPenalize,
  assessVote,
  isTrustedComplaint,
  RULES,
} = require("./logic");

test("la distancia de 10 km separa un voto válido de uno lejano", () => {
  const madrid = [40.4168, -3.7038];
  const cerca = [40.4168, -3.61];
  const lejos = [40.4168, -3.5];
  assert.ok(haversineKm(...madrid, ...cerca) < RULES.voteRadiusKm);
  assert.ok(haversineKm(...madrid, ...lejos) > RULES.voteRadiusKm);
});

test("una queja se retira con 6 votos y al menos un 70% de no es real", () => {
  assert.equal(shouldRemove(1, 5), true);
  assert.equal(shouldRemove(2, 4), false);
  assert.equal(shouldRemove(3, 3), false);
  assert.equal(shouldRemove(0, 5), false);
});

test("cinco votos de no es real, siendo el 80%, activan la penalización", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  const votes = Array.from({ length: 4 }, () => ({ value: "fake", createdAt: "2026-05-20T00:00:00Z" }));
  votes.push({ value: "real", createdAt: "2026-05-21T00:00:00Z" });
  assert.equal(shouldPenalize(votes, now), false);
  votes.push({ value: "fake", createdAt: "2026-05-22T00:00:00Z" });
  assert.equal(shouldPenalize(votes, now), true);
});

test("un voto lejano se rechaza y uno cercano se acepta", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  const user = { id: 2, penaltyUntil: null, rehabRemaining: 0 };
  const complaint = { status: "verified", authorUserId: 9, realVotes: 1, fakeVotes: 0 };
  const far = assessVote({
    user,
    complaint,
    value: "real",
    distanceKm: 18,
    now,
    recentVotes: [],
  });
  assert.equal(far.ok, false);
  const near = assessVote({
    user,
    complaint,
    value: "fake",
    distanceKm: 2,
    now,
    recentVotes: [],
  });
  assert.equal(near.ok, true);
  assert.equal(near.penalize, false);
});

test("durante la penalización solo valen confirmaciones de quejas con consenso", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  const user = { id: 2, penaltyUntil: "2026-06-04T00:00:00Z", rehabRemaining: 2 };
  const normal = { status: "verified", authorUserId: null, realVotes: 1, fakeVotes: 0 };
  const trusted = { status: "verified", authorUserId: null, realVotes: 8, fakeVotes: 1 };
  assert.equal(isTrustedComplaint(trusted), true);
  const blocked = assessVote({
    user,
    complaint: normal,
    value: "real",
    distanceKm: 1,
    now,
    recentVotes: [],
  });
  assert.equal(blocked.ok, false);
  const rehab = assessVote({
    user,
    complaint: trusted,
    value: "real",
    distanceKm: 400,
    now,
    recentVotes: [],
  });
  assert.equal(rehab.ok, true);
  assert.equal(rehab.skipRadius, true);
  assert.equal(rehab.isRehab, true);
});
