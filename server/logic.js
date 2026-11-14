const CATEGORIES = {
  bache: "Calzada o bache",
  acera: "Acera o pavimento",
  farola: "Farola o alumbrado",
  basura: "Basura o limpieza",
  agua: "Agua o alcantarilla",
  arbol: "Árbol o zona verde",
  banco: "Mobiliario urbano",
  senal: "Señal o semáforo",
  acceso: "Barrera o rampa",
  parque: "Parque infantil",
  obra: "Obra o solar",
  pintadas: "Pintadas o vandalismo",
  animales: "Animales o plagas",
  otros: "Otra cosa",
};

const STATUSES = {
  pending: "Pendiente de verificación",
  verified: "Verificada",
  rejected: "No publicada",
  resolved: "Resuelta",
  removed: "Retirada",
};

const RULES = {
  voteRadiusKm: 10,
  removeMinVotes: 6,
  removeFakeRatio: 0.7,
  abuseWindowDays: 30,
  abuseMinFake: 5,
  abuseFakeRatio: 0.8,
  penaltyDays: 7,
  rehabRequired: 3,
  trustedMinVotes: 3,
  trustedRealRatio: 0.7,
  resolveRequestsNeeded: 3,
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function shouldRemove(realVotes, fakeVotes) {
  const total = realVotes + fakeVotes;
  if (total < RULES.removeMinVotes) return false;
  return fakeVotes / total >= RULES.removeFakeRatio;
}

function shouldPenalize(votes, now) {
  const start = now.getTime() - RULES.abuseWindowDays * 24 * 60 * 60 * 1000;
  const recent = votes.filter((vote) => new Date(vote.createdAt).getTime() >= start);
  const fake = recent.filter((vote) => vote.value === "fake").length;
  if (fake < RULES.abuseMinFake) return false;
  return fake / recent.length >= RULES.abuseFakeRatio;
}

function isTrustedComplaint(complaint) {
  if (!complaint || complaint.status !== "verified") return false;
  const total = complaint.realVotes + complaint.fakeVotes;
  if (total < RULES.trustedMinVotes) return false;
  return complaint.realVotes / total >= RULES.trustedRealRatio;
}

function voteRestriction(user, now) {
  const until = user?.penaltyUntil ? new Date(user.penaltyUntil) : null;
  const waiting = Boolean(until && until.getTime() > now.getTime());
  const rehabRemaining = user?.rehabRemaining || 0;
  return {
    waiting,
    rehabRemaining,
    limited: waiting || rehabRemaining > 0,
    until: until ? until.toISOString() : null,
  };
}

function assessVote({ user, complaint, value, distanceKm, now, recentVotes }) {
  if (!user) return { ok: false, status: 401, error: "Entra con tu cuenta para votar." };
  if (value !== "real" && value !== "fake") {
    return { ok: false, status: 400, error: "El voto tiene que ser real o no real." };
  }
  if (!complaint) return { ok: false, status: 404, error: "No encontramos esa queja." };
  if (complaint.status !== "verified") {
    return { ok: false, status: 400, error: "Solo se votan quejas ya verificadas." };
  }
  if (complaint.authorUserId && complaint.authorUserId === user.id) {
    return { ok: false, status: 400, error: "No puedes votar tu propia queja." };
  }

  const restriction = voteRestriction(user, now);
  const trusted = isTrustedComplaint(complaint);

  if (restriction.limited) {
    if (value !== "real" || !trusted) {
      const when = restriction.until
        ? `hasta el ${new Date(restriction.until).toLocaleDateString("es-ES")}`
        : "un tiempo";
      return {
        ok: false,
        status: 403,
        error: `Tu voto está limitado ${when}. Para recuperarlo te quedan ${restriction.rehabRemaining} confirmaciones de quejas que ya tienen consenso de ser reales.`,
        restriction,
      };
    }
    return { ok: true, isRehab: restriction.rehabRemaining > 0, skipRadius: true, restriction };
  }

  if (typeof distanceKm !== "number" || Number.isNaN(distanceKm)) {
    return { ok: false, status: 400, error: "Necesitamos tu ubicación para comprobar que estás cerca." };
  }
  if (distanceKm > RULES.voteRadiusKm) {
    return {
      ok: false,
      status: 403,
      error: `Solo puedes votar quejas a menos de ${RULES.voteRadiusKm} km de donde estás.`,
    };
  }

  const nextVotes = recentVotes.concat([{ value, createdAt: now.toISOString() }]);
  return {
    ok: true,
    isRehab: false,
    skipRadius: false,
    penalize: value === "fake" && shouldPenalize(nextVotes, now),
    restriction,
  };
}

module.exports = {
  CATEGORIES,
  STATUSES,
  RULES,
  haversineKm,
  shouldRemove,
  shouldPenalize,
  isTrustedComplaint,
  voteRestriction,
  assessVote,
};
