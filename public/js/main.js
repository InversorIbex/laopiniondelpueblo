const L = globalThis.L;

const GLYPHS = {
  bache: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.2 1.6h2.3L12 7.4l3.8.7-5.4 7.4 1.6.5-2.8 6.4H7.1l2.4-6.4-3.6-.9 4.8-7.6z"/></svg>',
  acera: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 4h8v7H3zm10 0h8v7h-8zM3 13h8v7H3zm10 0h8v7h-8z"/></svg>',
  farola: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 9.2h8L14.6 4.4A1.6 1.6 0 0 0 13.1 3.4h-2.2a1.6 1.6 0 0 0-1.5 1L8 9.2zM11 9.2h2V19h-2zM8.2 19h7.6v2H8.2z"/></svg>',
  basura: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8.5 3h7l.8 2.2H20V7.4H4V5.2h3.7z"/><path fill="currentColor" d="M6.2 9h11.6l-.9 11.2H7.1z"/></svg>',
  agua: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.6s6.6 6.8 6.6 11a6.6 6.6 0 0 1-13.2 0c0-4.2 6.6-11 6.6-11z"/></svg>',
  arbol: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.4 18.2 11h-2.6l3.6 6.2H4.8L8.4 11H5.8zm-1.1 14.8h2.2V21h-2.2z"/></svg>',
  banco: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2.5 8h19v3.2h-19zM4 11.2h2.2V17H4zm13.8 0H20V17h-2.2zM2.5 17h19v2.2h-19z"/></svg>',
  senal: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M12 2.2 21.4 19H2.6L12 2.2zm0 4.4 5.2 9.4H6.8L12 6.6z"/><path fill="currentColor" d="M11 10.2h2v4.2h-2zM11 15.4h2v2h-2z"/></svg>',
  acceso: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 18.4h20V21H2zM3.2 18.4 18 4.8h2.8v13.6H3.2z"/></svg>',
  parque: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h18v2.2H3zM6.2 5.2h2.1l1.7 9H8.2zm9.5 0h2.1l-1.8 9h-1.8zM7 14.2h10v2.3H7z"/></svg>',
  obra: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9.4 2.6h5.2L20 18.2H4zM5 18.2h14V21H5z"/></svg>',
  pintadas: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13.2 2.6h3.4V6h-3.4z"/><path fill="currentColor" d="M8 7h8.6v2.2H8z"/><path fill="currentColor" d="M6.8 9.2h11v9.6a2.2 2.2 0 0 1-2.2 2.2H9a2.2 2.2 0 0 1-2.2-2.2z"/><circle cx="18.8" cy="4" r="1.3" fill="currentColor"/></svg>',
  animales: '<svg viewBox="0 0 24 24"><circle cx="6" cy="8" r="2.1" fill="currentColor"/><circle cx="10.2" cy="4.8" r="2.1" fill="currentColor"/><circle cx="15.2" cy="4.8" r="2.1" fill="currentColor"/><circle cx="18.6" cy="8.4" r="2" fill="currentColor"/><ellipse cx="12.2" cy="15.6" rx="5" ry="4" fill="currentColor"/></svg>',
  otros: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="18" cy="12" r="2.2" fill="currentColor"/></svg>',
  draft: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.4c3.8 0 6.8 3 6.8 6.7 0 4.8-6.8 12.5-6.8 12.5S5.2 13.9 5.2 9.1C5.2 5.4 8.2 2.4 12 2.4zm0 4.2a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z"/></svg>',
};

const JUMPS = {
  peninsula: [40.2, -3.7, 6],
  canarias: [28.4, -16.1, 7],
  baleares: [39.6, 2.95, 8],
  ceuta: [35.889, -5.316, 14],
  melilla: [35.292, -2.938, 14],
};

// El servidor público de OpenStreetMap bloquea aplicaciones. El callejero
// y la ortofoto salen del IGN (eje Y invertido en sus TMS).
const MAP_STYLES = {
  calle: {
    url: "https://tms-ign-base.idee.es/1.0.0/IGNBaseTodo/{z}/{x}/{-y}.jpeg",
    maxNativeZoom: 17,
    attribution: '&copy; <a href="https://www.ign.es/">IGN</a> · <a href="https://www.scne.es/">SCNE</a> CC BY 4.0',
  },
  satelite: {
    url: "https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{-y}.jpeg",
    maxNativeZoom: 19,
    attribution: 'Ortofoto PNOA &copy; <a href="https://www.ign.es/">IGN</a>',
  },
};

function baseTiles() {
  const style = MAP_STYLES[state.basemap] || MAP_STYLES.calle;
  return L.tileLayer(style.url, {
    maxZoom: 19,
    maxNativeZoom: style.maxNativeZoom,
    attribution: style.attribution,
    referrerPolicy: "strict-origin-when-cross-origin",
  });
}

function setBasemap(kind) {
  state.basemap = kind === "satelite" ? "satelite" : "calle";
  const style = MAP_STYLES[state.basemap];
  for (const layer of [state.base, state.detailBase]) {
    if (!layer) continue;
    const previous = layer.options.attribution;
    const map = layer._map;
    if (map?.attributionControl && previous) map.attributionControl.removeAttribution(previous);
    layer.options.maxNativeZoom = style.maxNativeZoom;
    layer.options.attribution = style.attribution;
    layer.setUrl(style.url);
    if (map?.attributionControl) map.attributionControl.addAttribution(style.attribution);
  }
  const button = $("#satellite-toggle");
  if (button) {
    const on = state.basemap === "satelite";
    button.classList.toggle("is-on", on);
    button.textContent = on ? "Calle" : "Satélite";
    button.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

const state = {
  user: null,
  tree: [],
  stats: { verified: 0, resolved: 0 },
  map: null,
  base: null,
  detailBase: null,
  meMarker: null,
  basemap: "calle",
  pendingCount: 0,
  ccaaLayer: null,
  provLayer: null,
  pinLayer: null,
  munLayer: null,
  highlight: null,
  draft: null,
  reportMode: false,
  category: "",
  categories: {},
  filters: { ccaa: "", provincia: "", municipio: "", municipioCode: "", category: "", hideResolved: false, orden: "recientes" },
  munCache: new Map(),
  placeSeq: 0,
  preciseTimer: 0,
  modTab: "pending",
  detailMap: null,
};

const $ = (selector) => document.querySelector(selector);

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tokenStore() {
  try {
    return JSON.parse(localStorage.getItem("eptlo_tokens") || "{}");
  } catch {
    return {};
  }
}

function saveToken(id, token) {
  const all = tokenStore();
  all[id] = token;
  localStorage.setItem("eptlo_tokens", JSON.stringify(all));
}

async function api(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const request = { method: options.method || "GET", headers };
  if (options.json !== undefined) {
    headers.set("content-type", "application/json");
    request.body = JSON.stringify(options.json);
  }
  if (options.body) request.body = options.body;
  if (options.token) headers.set("x-author-token", options.token);
  const response = await fetch(url, request);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "La respuesta no se ha podido leer." };
    }
  }
  if (!response.ok) throw new Error(data?.error || "No se ha podido completar.");
  return data;
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  $("#toasts").append(node);
  setTimeout(() => node.remove(), 4600);
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

function pinIcon(category, status) {
  const kind = GLYPHS[category] ? category : "otros";
  const resolved = status === "resolved" ? "is-resolved" : status === "pending" ? "is-pending" : "";
  return L.divIcon({
    className: "pin-icon",
    html: `<div class="pin pin-${kind} ${resolved}"><div class="pin-head">${GLYPHS[kind]}</div><div class="pin-tail"></div></div>`,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -46],
  });
}

function badge(status, label) {
  return `<span class="badge badge-${esc(status)}">${esc(label || status)}</span>`;
}

function voteLine(item) {
  const total = item.realVotes + item.fakeVotes;
  const pct = total ? Math.round((item.realVotes / total) * 100) : 0;
  return `<div class="vote-line" aria-hidden="true"><span style="width:${pct}%"></span></div>
    <p class="muted">${item.realVotes} la ven real · ${item.fakeVotes} no la ven real${total ? ` · ${pct}% real` : ""}</p>`;
}

function categoryList() {
  return Object.entries(state.categories || {});
}

async function boot() {
  const [tree, me, stats, meta] = await Promise.all([
    api("/api/geo/arbol"),
    api("/api/auth/me"),
    api("/api/stats"),
    api("/api/meta"),
  ]);
  state.tree = tree;
  state.user = me.user;
  state.stats = stats;
  state.categories = meta.categories || {};
  renderAccount();
  renderStats();
  fillCcaa();
  renderLegend();
  renderReportCats();
  initMap();
  bind();
  route();
}

function renderStats() {
  $("#stats").textContent = `${state.stats.verified} verificadas · ${state.stats.resolved} resueltas`;
}

function renderAccount() {
  const user = state.user;
  const penalty = $("#penalty");
  const modLink = document.querySelector('[data-nav="moderar"]');
  modLink.hidden = !user || user.role !== "moderator";
  $("#alias-user").hidden = !user;
  if (user?.limited) {
    const until = user.penaltyUntil ? ` Hasta el ${formatDate(user.penaltyUntil)}.` : "";
    penalty.hidden = false;
    penalty.textContent = `Tu voto está limitado.${until} Te quedan ${user.rehabRemaining} confirmaciones de quejas con consenso.`;
  } else {
    penalty.hidden = true;
  }
  refreshReview();
  if (!user) {
    $("#account").innerHTML = `<button class="btn btn-ghost" type="button" data-action="auth">Entrar</button>`;
    return;
  }
  $("#account").innerHTML = `<details class="account">
    <summary>${esc(user.username)}</summary>
    <div class="menu">
      <a href="#/mias">Mis quejas</a>
      ${user.role === "moderator" ? '<a href="#/moderar">Moderación</a>' : ""}
      <button type="button" data-action="password">Cambiar contraseña</button>
      <button type="button" data-action="logout">Salir</button>
    </div>
  </details>`;
}

async function refreshReview() {
  const link = $("#review-link");
  if (!link) return;
  if (!state.user || state.user.role !== "moderator") {
    link.hidden = true;
    link.textContent = "Aprobar";
    return;
  }
  link.hidden = false;
  try {
    const summary = await api("/api/mod/resumen");
    const count = summary.byStatus?.pending || 0;
    state.pendingCount = count;
    link.textContent = count ? `Aprobar (${count})` : "Moderación";
  } catch {
    link.textContent = "Moderación";
  }
}

function fillCcaa() {
  const select = $("#sel-ccaa");
  select.innerHTML = `<option value="">Todas</option>` + state.tree.map((item) => `<option value="${esc(item.name)}">${esc(item.name)}</option>`).join("");
  fillProvinces();
}

function fillProvinces() {
  const select = $("#sel-prov");
  const ccaa = state.filters.ccaa;
  const provinces = ccaa
    ? state.tree.find((item) => item.name === ccaa)?.provincias || []
    : state.tree.flatMap((item) => item.provincias);
  const unique = [];
  const seen = new Set();
  for (const province of provinces) {
    if (seen.has(province.name)) continue;
    seen.add(province.name);
    unique.push(province);
  }
  unique.sort((a, b) => a.name.localeCompare(b.name, "es"));
  select.innerHTML = `<option value="">Todas</option>` + unique.map((item) => `<option value="${esc(item.name)}">${esc(item.name)}</option>`).join("");
  select.value = unique.some((item) => item.name === state.filters.provincia) ? state.filters.provincia : "";
  if (!select.value) state.filters.provincia = "";
}

async function fillMunicipalities() {
  const select = $("#sel-mun");
  const province = state.filters.provincia;
  if (!province) {
    select.disabled = true;
    select.innerHTML = `<option value="">Elige primero la provincia</option>`;
    return;
  }
  select.disabled = true;
  select.innerHTML = `<option value="">Cargando ayuntamientos…</option>`;
  if (!state.munCache.has(province)) {
    state.munCache.set(province, await api(`/api/geo/municipios?provincia=${encodeURIComponent(province)}`));
  }
  const items = state.munCache.get(province);
  select.innerHTML = `<option value="">Todos</option>` + items.map((item) => `<option value="${esc(item.code)}" data-name="${esc(item.name)}" data-lat="${item.lat}" data-lng="${item.lng}">${esc(item.name)}</option>`).join("");
  select.disabled = false;
  if (state.filters.municipioCode && [...select.options].some((option) => option.value === state.filters.municipioCode)) {
    select.value = state.filters.municipioCode;
  }
}

function swatch(id) {
  return `<span class="swatch pin-${esc(id)}">${GLYPHS[id] || GLYPHS.otros}</span>`;
}

function renderLegend() {
  const html = `<button type="button" class="chip ${state.filters.category ? "" : "is-on"}" data-cat="">Todo</button>` +
    categoryList().map(([id, label]) => `<button type="button" class="chip ${state.filters.category === id ? "is-on" : ""}" data-cat="${id}">${swatch(id)}${esc(label)}</button>`).join("");
  $("#legend").innerHTML = html;
}

function renderReportCats() {
  $("#report-cats").innerHTML = categoryList().map(([id, label]) => `<button type="button" class="chip ${state.category === id ? "is-on" : ""}" data-report-cat="${id}">${swatch(id)}${esc(label)}</button>`).join("");
}

function initMap() {
  state.map = L.map("map", {
    zoomControl: true,
    minZoom: 5,
    maxZoom: 19,
    maxBounds: [[24, -22], [46, 6]],
    maxBoundsViscosity: 0.6,
  }).setView(JUMPS.peninsula.slice(0, 2), JUMPS.peninsula[2]);
  state.base = baseTiles().addTo(state.map);
  state.pinLayer = L.layerGroup().addTo(state.map);
  state.munLayer = L.layerGroup();
  state.map.on("click", (event) => handleMapClick(event.latlng));
  state.map.on("moveend", () => {
    if ($("#layer-mun").checked) loadMunDots();
  });
  loadBoundaries();
  reloadPins();
}

async function loadBoundaries() {
  try {
    const [ccaa, provinces] = await Promise.all([
      api("/api/geo/capa/ccaa"),
      api("/api/geo/capa/provincias"),
    ]);
    const styleCcaa = { color: "#6d5cae", weight: 1.6, fillColor: "#e4dcf8", fillOpacity: 0.18 };
    const styleProv = { color: "#1f7a68", weight: 1, fillColor: "#c9efe4", fillOpacity: 0.05 };
    state.ccaaLayer = L.geoJSON(ccaa, { style: styleCcaa, onEachFeature: bindBoundary }).addTo(state.map);
    state.provLayer = L.geoJSON(provinces, { style: styleProv, onEachFeature: bindBoundary }).addTo(state.map);
  } catch (error) {
    toast(error.message);
  } finally {
    $("#map-loading").hidden = true;
  }
}

function bindBoundary(feature, layer) {
  layer.on("click", (event) => {
    L.DomEvent.stopPropagation(event);
    handleMapClick(event.latlng);
  });
}

let lastClick = 0;
function handleMapClick(latlng) {
  const now = Date.now();
  if (now - lastClick < 280) return;
  lastClick = now;
  if (!state.reportMode) startReport();
  placeDraft(latlng);
}

function placeDraft(latlng) {
  if (!state.draft) {
    state.draft = L.marker(latlng, { draggable: true, icon: pinIcon("draft"), zIndexOffset: 1000 }).addTo(state.map);
    state.draft.on("click", (event) => L.DomEvent.stopPropagation(event));
    state.draft.on("dragend", () => {
      const point = state.draft.getLatLng();
      refreshPlace(point, true);
      keepPinVisible(point);
    });
  } else {
    state.draft.setLatLng(latlng);
  }
  refreshPlace(latlng, true);
  setTimeout(() => keepPinVisible(latlng), 40);
}

function keepPinVisible(latlng) {
  if (!state.map) return;
  const narrow = window.innerWidth <= 900;
  const form = $("#report-form");
  const occupied = form && !form.hidden ? form.offsetHeight + 12 : 0;
  const mapHeight = state.map.getSize().y;
  const bottom = narrow ? Math.min(occupied, Math.round(mapHeight * 0.7)) : 20;
  state.map.panInside(latlng, {
    paddingTopLeft: L.point(16, 60),
    paddingBottomRight: L.point(narrow ? 16 : 380, bottom),
    animate: true,
  });
}

async function refreshPlace(latlng, precise) {
  const seq = ++state.placeSeq;
  const label = $("#place-label");
  if (label) label.textContent = "Buscando el ayuntamiento…";
  try {
    const quick = await api(`/api/geo/reverse?modo=rapido&lat=${latlng.lat}&lng=${latlng.lng}`);
    if (seq !== state.placeSeq) return;
    showPlace(quick);
    if (!precise) return;
    clearTimeout(state.preciseTimer);
    state.preciseTimer = setTimeout(async () => {
      try {
        const fine = await api(`/api/geo/reverse?lat=${latlng.lat}&lng=${latlng.lng}`);
        if (seq !== state.placeSeq) return;
        showPlace(fine);
      } catch {
        /* El envío vuelve a calcular el ayuntamiento. */
      }
    }, 500);
  } catch (error) {
    if (seq === state.placeSeq && label) label.textContent = error.message;
  }
}

function showPlace(place) {
  const text = `${place.municipio || "Ayuntamiento sin determinar"} · ${place.provincia} · ${place.ccaa}`;
  const note = place.source === "centro" ? " Asignado por cercanía. Moderación puede corregirlo." : "";
  const label = $("#place-label");
  if (label) label.textContent = text + note;
  if (!place?.provincia) return;
  state.filters.ccaa = place.ccaa;
  state.filters.provincia = place.provincia;
  state.filters.municipio = place.municipio || "";
  state.filters.municipioCode = place.municipioCode || "";
  const ccaa = $("#sel-ccaa");
  if (!ccaa) return;
  ccaa.value = place.ccaa;
  fillProvinces();
  $("#sel-prov").value = place.provincia;
  fillMunicipalities()
    .then(() => {
      if (place.municipioCode && $("#sel-mun")) $("#sel-mun").value = place.municipioCode;
    })
    .catch(() => {});
  if (!state.reportMode) reloadPins().catch(() => {});
}

async function reloadPins() {
  if (!state.map) return;
  const params = new URLSearchParams();
  if (state.filters.ccaa) params.set("ccaa", state.filters.ccaa);
  if (state.filters.provincia) params.set("provincia", state.filters.provincia);
  if (state.filters.municipio) params.set("municipio", state.filters.municipio);
  if (state.filters.category) params.set("category", state.filters.category);
  if (state.filters.hideResolved) params.set("status", "verified");
  const pins = await api(`/api/complaints?${params.toString()}`);
  if (state.user?.role === "moderator") {
    const pendingParams = new URLSearchParams(params);
    pendingParams.set("status", "pending");
    const pending = await api(`/api/complaints?${pendingParams.toString()}`);
    const seen = new Set(pins.map((item) => item.id));
    for (const item of pending) {
      if (!seen.has(item.id)) pins.push(item);
    }
  }
  state.pinLayer.clearLayers();
  for (const item of pins) addPin(item);
}

function addPin(item) {
  const marker = L.marker([item.lat, item.lng], { icon: pinIcon(item.category, item.status) });
  const photo = item.photos[0] ? `<img src="${esc(item.photos[0])}" alt="">` : "";
  const openLabel = item.status === "pending" ? "Revisar y aprobar" : "Ver la queja";
  marker.bindPopup(`<div class="popup">${photo}<h3 class="popup-title">${esc(item.categoryLabel)}</h3><p>${esc(item.comment.slice(0, 140))}</p><p>${esc(item.municipio)}</p>${badge(item.status, item.statusLabel)}<p><a href="#/queja/${item.id}">${openLabel}</a></p></div>`);
  marker.on("click", (event) => L.DomEvent.stopPropagation(event));
  marker.addTo(state.pinLayer);
}

async function loadMunDots() {
  if (!$("#layer-mun").checked) {
    state.map.removeLayer(state.munLayer);
    return;
  }
  if (state.map.getZoom() < 10) {
    state.munLayer.clearLayers();
    if (!state.map.hasLayer(state.munLayer)) state.munLayer.addTo(state.map);
    return;
  }
  const bounds = state.map.getBounds();
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");
  const items = await api(`/api/geo/municipios?bbox=${bbox}`);
  state.munLayer.clearLayers();
  for (const item of items) {
    const dot = L.circleMarker([item.lat, item.lng], {
      radius: 4,
      color: "#6d5cae",
      weight: 1,
      fillColor: "#e4dcf8",
      fillOpacity: 0.95,
    });
    dot.bindTooltip(item.name, { direction: "top" });
    dot.on("click", (event) => {
      L.DomEvent.stopPropagation(event);
      chooseMunicipality(item);
    });
    dot.addTo(state.munLayer);
  }
  if (!state.map.hasLayer(state.munLayer)) state.munLayer.addTo(state.map);
}

function fitFeature(group, name) {
  if (!group) return;
  let found = null;
  group.eachLayer((layer) => {
    if (layer.feature?.properties?.name === name) found = layer;
  });
  if (found) state.map.fitBounds(found.getBounds(), { padding: [24, 24], maxZoom: 10 });
}

async function chooseMunicipality(item) {
  state.filters.ccaa = item.ccaa;
  state.filters.provincia = item.provincia;
  state.filters.municipio = item.name;
  state.filters.municipioCode = item.code;
  $("#sel-ccaa").value = item.ccaa;
  fillProvinces();
  $("#sel-prov").value = item.provincia;
  await fillMunicipalities();
  $("#sel-mun").value = item.code;
  state.map.setView([item.lat, item.lng], Math.max(state.map.getZoom(), 12));
  reloadPins();
  try {
    const detail = await api(`/api/geo/municipio/${item.code}`);
    if (state.highlight) state.map.removeLayer(state.highlight);
    if (detail.polygon) {
      state.highlight = L.geoJSON(detail.polygon, {
        style: { color: "#6d5cae", weight: 2, fillColor: "#e4dcf8", fillOpacity: 0.28 },
      }).addTo(state.map);
      state.map.fitBounds(state.highlight.getBounds(), { padding: [30, 30], maxZoom: 14 });
    }
  } catch {
    /* El centro del ayuntamiento ya está en pantalla. */
  }
}

function startReport() {
  if (!location.hash.startsWith("#/mapa")) location.hash = "#/mapa";
  state.reportMode = true;
  document.body.classList.add("reporting");
  document.body.classList.remove("sheet-open");
  $("#report-form").hidden = false;
  reportError("");
  updateCommentCount();
  if (!state.draft) $("#place-label").textContent = "Toca el mapa para marcar el sitio.";
  state.map?.getContainer() && (state.map.getContainer().style.cursor = "crosshair");
  state.map?.closePopup();
  setTimeout(() => state.map?.invalidateSize(), 60);
}

function reportError(message) {
  const node = $("#report-error");
  if (!node) return;
  node.hidden = !message;
  node.textContent = message || "";
}

function updateCommentCount() {
  const value = $("#report-comment")?.value.trim() || "";
  const node = $("#comment-count");
  if (!node) return;
  node.textContent = value.length < 20 ? `${value.length} / 20 caracteres mínimo` : `${value.length} caracteres`;
}

function cancelReport() {
  state.reportMode = false;
  document.body.classList.remove("reporting");
  $("#report-form").hidden = true;
  $("#report-form").reset();
  $("#photo-preview").innerHTML = "";
  reportError("");
  updateCommentCount();
  state.category = "";
  renderReportCats();
  if (state.draft) {
    state.map.removeLayer(state.draft);
    state.draft = null;
  }
  state.map.getContainer().style.cursor = "";
  $("#place-label").textContent = "Aún no hay un punto.";
}

async function submitReport(form) {
  reportError("");
  const data = new FormData(form);
  const comment = String(data.get("comment") || "").trim();
  if (!state.draft) return reportError("Toca el mapa para marcar el sitio.");
  if (!state.category) return reportError("Elige qué tipo de problema es.");
  if (comment.length < 20) {
    $("#report-comment")?.focus();
    return reportError("Cuéntalo con un poco más de detalle: al menos 20 caracteres.");
  }
  const files = data.getAll("photos").filter((file) => file && file.size);
  if (files.length > 4) return reportError("Puedes adjuntar hasta 4 fotos.");
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) return reportError("Cada foto puede pesar hasta 5 MB.");
  }
  data.delete("photos");
  files.forEach((file) => data.append("photos", file));
  data.set("comment", comment);
  const point = state.draft.getLatLng();
  data.set("lat", String(point.lat));
  data.set("lng", String(point.lng));
  data.set("category", state.category);
  const button = form.querySelector("[type=submit]");
  button.disabled = true;
  button.textContent = "Enviando…";
  try {
    const result = await api("/api/complaints", { method: "POST", body: data });
    saveToken(result.complaint.id, result.authorToken);
    cancelReport();
    toast(`Enviada como ${result.complaint.authorAlias}. La revisaremos antes de publicarla.`);
    location.hash = `#/queja/${result.complaint.id}`;
  } catch (error) {
    reportError(error.message);
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Enviar a revisión";
  }
}

function complaintQuery() {
  const params = new URLSearchParams();
  if (state.filters.ccaa) params.set("ccaa", state.filters.ccaa);
  if (state.filters.provincia) params.set("provincia", state.filters.provincia);
  if (state.filters.municipio) params.set("municipio", state.filters.municipio);
  if (state.filters.category) params.set("category", state.filters.category);
  if (state.filters.hideResolved) params.set("status", "verified");
  if (state.filters.orden === "votos") params.set("orden", "votos");
  return params;
}

function cardHtml(item, extra = "") {
  const photos = item.photos.map((src) => `<img src="${esc(src)}" alt="Foto de la queja">`).join("");
  return `<article class="card">
    <div class="card-top">
      <h2>${esc(item.categoryLabel)}</h2>
      ${badge(item.status, item.statusLabel)}
    </div>
    <p>${esc(item.comment)}</p>
    <div class="thumbs">${photos}</div>
    <div class="meta">
      <span>${esc(item.municipio)} · ${esc(item.provincia)} · ${esc(item.ccaa)}</span>
      <span>Por ${esc(item.authorAlias)}</span>
      <span>${esc(formatDate(item.createdAt))}</span>
    </div>
    ${voteLine(item)}
    ${item.moderationNote ? `<p class="hint">Nota de moderación: ${esc(item.moderationNote)}</p>` : ""}
    <div class="actions"><a class="btn btn-ghost btn-small" href="#/queja/${item.id}">Abrir</a>${extra}</div>
  </article>`;
}

async function renderList() {
  const box = $("#list-filters");
  const provinces = state.filters.ccaa
    ? state.tree.find((item) => item.name === state.filters.ccaa)?.provincias || []
    : state.tree.flatMap((item) => item.provincias);
  box.innerHTML = `
    <label>Comunidad <select id="list-ccaa"><option value="">Todas</option>${state.tree.map((item) => `<option ${item.name === state.filters.ccaa ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label>
    <label>Provincia <select id="list-prov"><option value="">Todas</option>${provinces.map((item) => `<option ${item.name === state.filters.provincia ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label>
    <label>Tipo <select id="list-cat"><option value="">Todos</option>${categoryList().map(([id, label]) => `<option value="${id}" ${id === state.filters.category ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>
    <label>Orden <select id="list-orden"><option value="recientes" ${state.filters.orden === "recientes" ? "selected" : ""}>Más recientes</option><option value="votos" ${state.filters.orden === "votos" ? "selected" : ""}>Más votadas como reales</option></select></label>`;
  const items = await api(`/api/complaints?${complaintQuery().toString()}`);
  let pendingHtml = "";
  if (state.user?.role === "moderator") {
    const pending = await api("/api/mod/complaints?status=pending");
    if (pending.length) {
      pendingHtml = `<section class="pending-box"><h2>Por aprobar (${pending.length})</h2><p class="hint">Estas aún no se ven en el mapa público. Al aprobarlas, salen.</p>${pending.map((item) => cardHtml(item, `<button class="btn btn-mint btn-small" type="button" data-action="approve" data-id="${item.id}">Aprobar</button>`)).join("")}</section>`;
    }
  }
  const published = items.length
    ? items.map((item) => cardHtml(item)).join("")
    : `<div class="empty"><h2>Todavía no hay quejas publicadas con estos filtros</h2><p>Cuando moderación aprueba una, aparece aquí y en el mapa.</p></div>`;
  $("#list").innerHTML = pendingHtml + published;
}

async function renderDetail(id) {
  destroyDetailMap();
  const root = $("#detail");
  try {
    const item = await api(`/api/complaints/${id}`, { token: tokenStore()[id] || "" });
    const voteButtons = item.status === "verified" && state.user && !item.myVote
      ? `<button class="btn btn-mint btn-small" type="button" data-action="vote" data-value="real" data-id="${item.id}">Es real</button>
         <button class="btn btn-danger btn-small" type="button" data-action="vote" data-value="fake" data-id="${item.id}">No es real</button>`
      : "";
    const voted = item.myVote ? `<p class="hint">Tu voto: ${item.myVote === "real" ? "es real" : "no es real"}.</p>` : "";
    const loginHint = !state.user ? `<p class="hint">Para votar hay que entrar. Publicar una queja no requiere cuenta.</p>` : "";
    const resolve = item.status === "verified" && state.user
      ? `<button class="btn btn-soft btn-small" type="button" data-action="resolve" data-id="${item.id}">Ya está arreglada</button>`
      : "";
    const requests = item.resolveRequests ? `<p class="hint">${item.resolveRequests} de 3 avisos de que ya está resuelta.</p>` : "";
    const modActions = state.user?.role === "moderator"
      ? `<button class="btn btn-mint btn-small" type="button" data-action="approve" data-id="${item.id}">Aprobar</button>
         <button class="btn btn-danger btn-small" type="button" data-action="reject-open" data-id="${item.id}">No publicar</button>
         <button class="btn btn-soft btn-small" type="button" data-action="mod-resolve" data-id="${item.id}">Marcar resuelta</button>`
      : "";
    root.innerHTML = `<a href="#/quejas">Volver al listado</a>
      <div class="two" style="margin-top:12px">
        <article class="card">
          <div class="detail-top"><h2>${esc(item.categoryLabel)}</h2>${badge(item.status, item.statusLabel)}</div>
          <p>${esc(item.comment)}</p>
          <div class="thumbs">${item.photos.map((src) => `<img class="detail-photo" src="${esc(src)}" alt="Foto de la queja">`).join("")}</div>
          <p>${esc(item.municipio)} · ${esc(item.provincia)} · ${esc(item.ccaa)}</p>
          <p class="muted">Por ${esc(item.authorAlias)} · ${esc(formatDate(item.createdAt))}</p>
          ${voteLine(item)}
          ${item.moderationNote ? `<p class="hint">Nota de moderación: ${esc(item.moderationNote)}</p>` : ""}
          ${voted}${loginHint}${requests}
          <div class="actions">${voteButtons}${resolve}${modActions}<button class="btn btn-ghost btn-small" type="button" data-action="copy-link">Copiar enlace</button></div>
          <form id="reject-inline" class="stack" hidden>
            <label>Motivo <input name="note" required minlength="4" placeholder="Por qué no se publica"></label>
            <button class="btn btn-danger" type="submit">Confirmar rechazo</button>
          </form>
        </article>
        <div class="card"><div id="detail-map"></div><p class="hint">El voto comprueba que estás a menos de 10 km.</p></div>
      </div>`;
    root.dataset.id = String(item.id);
    state.detailMap = L.map("detail-map", { zoomControl: false, dragging: false, scrollWheelZoom: false });
    state.detailBase = baseTiles().addTo(state.detailMap);
    L.marker([item.lat, item.lng], { icon: pinIcon(item.category, item.status) }).addTo(state.detailMap);
    state.detailMap.setView([item.lat, item.lng], 16);
    setTimeout(() => state.detailMap?.invalidateSize(), 80);
  } catch (error) {
    root.innerHTML = `<div class="empty"><h2>No podemos mostrar esta queja</h2><p>${esc(error.message)}</p></div>`;
  }
}

function destroyDetailMap() {
  if (state.detailMap) {
    state.detailMap.remove();
    state.detailMap = null;
    state.detailBase = null;
  }
}

async function renderMine() {
  const accountItems = state.user ? await api("/api/complaints/mias") : [];
  const stored = Object.entries(tokenStore()).map(([id, token]) => ({ id: Number(id), token }));
  const anon = stored.length ? await api("/api/complaints/por-token", { method: "POST", json: { tokens: stored } }) : [];
  const byId = new Map();
  for (const item of [...accountItems, ...anon]) byId.set(item.id, item);
  const items = [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $("#mine").innerHTML = items.length
    ? items.map((item) => cardHtml(item)).join("")
    : `<div class="empty"><h2>Desde aquí aún no has enviado ninguna</h2><p>Las anónimas solo se recuerdan en este navegador.</p></div>`;
}

async function renderMod() {
  if (!state.user || state.user.role !== "moderator") {
    $("#mod").innerHTML = `<div class="empty"><h2>Esta zona es de moderación</h2><p>Entra con el usuario moderador. También puedes escribir admin. Las quejas pendientes solo aparecen después de entrar, en la pestaña Pendientes.</p></div>`;
    return;
  }
  const summary = await api("/api/mod/resumen");
  const counts = summary.byStatus || {};
  const tabs = ["pending", "verified", "resolved", "rejected", "removed", "cuentas"];
  const labels = {
    pending: "Pendientes",
    verified: "Verificadas",
    resolved: "Resueltas",
    rejected: "No publicadas",
    removed: "Retiradas",
    cuentas: "Cuentas",
  };
  const tabHtml = tabs.map((tab) => {
    const queued = tab === "pending" && (counts.pending || 0) > 0 ? ` class="has-queue"` : "";
    return `<button type="button"${queued} data-mod-tab="${tab}" aria-current="${state.modTab === tab ? "true" : "false"}">${labels[tab]}${tab !== "cuentas" ? ` (${counts[tab] || 0})` : ""}</button>`;
  }).join("");
  let body = "";
  if (state.modTab === "cuentas") {
    const users = await api("/api/mod/users");
    body = users.map((user) => `<article class="card user-row">
      <div class="card-top"><h2>${esc(user.username)}</h2>${badge(user.role === "moderator" ? "verified" : "pending", user.role === "moderator" ? "Moderación" : "Vecino")}</div>
      <p class="muted">${user.limited ? `Voto limitado. Quedan ${user.rehabRemaining} confirmaciones.` : "Puede votar con normalidad."}</p>
      <div class="actions">
        <button class="btn btn-ghost btn-small" type="button" data-action="role" data-id="${user.id}" data-role="${user.role === "moderator" ? "user" : "moderator"}">${user.role === "moderator" ? "Quitar moderación" : "Hacer moderación"}</button>
        ${user.limited
          ? `<button class="btn btn-mint btn-small" type="button" data-action="clear-penalty" data-id="${user.id}">Quitar límite</button>`
          : `<button class="btn btn-soft btn-small" type="button" data-action="penalize" data-id="${user.id}">Limitar voto</button>`}
      </div>
    </article>`).join("");
  } else {
    const items = await api(`/api/mod/complaints?status=${state.modTab}`);
    const exportUrl = `/api/mod/export?format=csv${state.filters.municipio ? `&municipio=${encodeURIComponent(state.filters.municipio)}` : ""}${state.filters.provincia ? `&provincia=${encodeURIComponent(state.filters.provincia)}` : ""}${state.filters.ccaa ? `&ccaa=${encodeURIComponent(state.filters.ccaa)}` : ""}`;
    body = `<p><a class="btn btn-ghost btn-small" href="${exportUrl}">Descargar CSV del filtro del mapa</a> <a class="btn btn-ghost btn-small" href="/api/mod/export?format=json">Descargar JSON</a></p>` +
      (items.length
        ? items.map((item) => modCard(item)).join("")
        : state.modTab === "pending"
          ? `<div class="empty"><h2>No hay quejas esperando aprobación</h2><p>Cuando alguien envíe una, aparecerá en esta pestaña.</p></div>`
          : `<div class="empty"><h2>No hay quejas en esta bandeja</h2><p>Las que acaban de llegar están en la pestaña Pendientes.</p></div>`);
  }
  $("#mod").innerHTML = `<header class="page-head"><div><p class="eyebrow">Equipo</p><h1>Moderación</h1></div></header><div class="mod-tabs">${tabHtml}</div><div class="cards">${body}</div>`;
}

function modCard(item) {
  return `<article class="card mod-card">
    ${cardHtml(item).replace("<article class=\"card\">", "<div>").replace("</article>", "</div>")}
    <div class="actions">
      ${item.status === "pending" ? `<button class="btn btn-mint btn-small" type="button" data-action="approve" data-id="${item.id}">Aprobar</button>` : ""}
      ${item.status !== "rejected" ? `<button class="btn btn-danger btn-small" type="button" data-action="reject-open" data-id="${item.id}">No publicar</button>` : ""}
      ${item.status === "verified" || item.status === "resolved" ? `<button class="btn btn-soft btn-small" type="button" data-action="mod-resolve" data-id="${item.id}">Resuelta</button>` : ""}
      <button class="btn btn-ghost btn-small" type="button" data-action="delete" data-id="${item.id}">Borrar</button>
    </div>
    <form class="stack reject-form" hidden data-id="${item.id}">
      <label>Motivo <input name="note" required minlength="4"></label>
      <button class="btn btn-danger btn-small" type="submit">Confirmar</button>
    </form>
    <form class="stack territory-form">
      <div class="filters">
        <label>Comunidad <input name="ccaa" value="${esc(item.ccaa)}" required></label>
        <label>Provincia <input name="provincia" value="${esc(item.provincia)}" required></label>
        <label>Ayuntamiento <input name="municipio" value="${esc(item.municipio)}" required></label>
      </div>
      <button class="btn btn-ghost btn-small" type="submit" data-id="${item.id}">Guardar territorio</button>
    </form>
  </article>`;
}

function openAuth(mode) {
  const root = $("#modal-root");
  root.hidden = false;
  root.innerHTML = `<div class="modal-back" data-action="close-modal">
    <form class="modal" id="auth-form" data-mode="${mode === "register" ? "register" : "login"}">
      <div class="tabs">
        <button class="btn ${mode === "register" ? "btn-ghost" : "btn-primary"} btn-small" type="button" data-action="auth-mode" data-mode="login">Entrar</button>
        <button class="btn ${mode === "register" ? "btn-primary" : "btn-ghost"} btn-small" type="button" data-action="auth-mode" data-mode="register">Crear cuenta</button>
      </div>
      <h2>${mode === "register" ? "Crear cuenta" : "Entrar"}</h2>
      <p class="hint">Hace falta para votar y para moderar. Publicar puede ser anónimo. No pedimos correo: si olvidas la contraseña no podremos recuperarla.</p>
      ${mode === "register" ? "" : `<p class="hint">Para aprobar quejas, el usuario es moderador. También puedes escribir admin.</p>`}
      <label>Usuario <input name="username" required minlength="3" maxlength="24" autocomplete="username"></label>
      <label>Contraseña <input name="password" type="password" required minlength="8" autocomplete="${mode === "register" ? "new-password" : "current-password"}"></label>
      <p id="auth-error" class="form-error" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">${mode === "register" ? "Crear cuenta" : "Entrar"}</button>
    </form>
  </div>`;
}

function openPassword() {
  const root = $("#modal-root");
  root.hidden = false;
  root.innerHTML = `<div class="modal-back" data-action="close-modal">
    <form class="modal stack" id="password-form">
      <h2>Cambiar contraseña</h2>
      <label>Actual <input name="current" type="password" required></label>
      <label>Nueva <input name="next" type="password" required minlength="8"></label>
      <button class="btn btn-primary" type="submit">Guardar</button>
    </form>
  </div>`;
}

function closeModal() {
  $("#modal-root").hidden = true;
  $("#modal-root").innerHTML = "";
}

async function locateMe() {
  if (!navigator.geolocation) throw new Error("Este navegador no puede compartir la ubicación.");
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error("Activa la ubicación en el navegador. Hace falta para votar quejas de tu zona.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

function inSpain(lat, lng) {
  return lat >= 27 && lat <= 44.5 && lng >= -19 && lng <= 5;
}

async function goToMyLocation() {
  if (!window.isSecureContext) {
    toast("La ubicación del móvil pide una página segura: https o este equipo.");
    return;
  }
  if (!state.map) return;
  toast("Buscando dónde estás…");
  let here;
  try {
    here = await locateMe();
  } catch {
    toast("No hemos podido leer la ubicación. Permítela en el navegador y vuelve a pulsar.");
    return;
  }
  if (!inSpain(here.lat, here.lng)) {
    toast("Ese punto queda fuera de España. Márcalo a mano en el mapa.");
    return;
  }
  state.map.setView([here.lat, here.lng], Math.max(state.map.getZoom(), 16));
  if (state.meMarker) state.map.removeLayer(state.meMarker);
  state.meMarker = L.circleMarker([here.lat, here.lng], {
    radius: 8,
    color: "#1f6f93",
    weight: 3,
    fillColor: "#c5e6f5",
    fillOpacity: 0.95,
    interactive: false,
  }).addTo(state.map);
  if (state.reportMode) placeDraft(L.latLng(here.lat, here.lng));
}

async function castVote(id, value) {
  if (!state.user) {
    openAuth("login");
    return;
  }
  const here = await locateMe();
  const result = await api(`/api/complaints/${id}/vote`, { method: "POST", json: { value, lat: here.lat, lng: here.lng } });
  state.user = result.user;
  renderAccount();
  if (result.removed) toast("Voto registrado. La queja se ha retirado del mapa por los votos de no es real.");
  else if (result.penalized) toast("Voto registrado. Has llegado al límite de votos «no es real» y tu voto queda restringido.");
  else toast("Voto registrado.");
  if (location.hash.startsWith("#/queja/")) renderDetail(id);
  reloadPins();
}

function show(view) {
  document.querySelectorAll(".view").forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("is-current", link.dataset.nav === view);
  });
  if (view === "mapa") setTimeout(() => state.map?.invalidateSize(), 50);
  else destroyDetailMap();
}

async function route() {
  const raw = location.hash.replace(/^#\/?/, "") || "mapa";
  const [name, id] = raw.split("/");
  if (name === "queja" && id) {
    show("detalle");
    await renderDetail(id);
    return;
  }
  const view = ["mapa", "quejas", "como", "moderar", "mias"].includes(name) ? name : "mapa";
  show(view);
  if (view === "quejas") await renderList();
  if (view === "mias") await renderMine();
  if (view === "moderar") await renderMod();
}

function bind() {
  window.addEventListener("hashchange", () => {
    route().catch((error) => toast(error.message));
  });

  document.addEventListener("click", (event) => {
    const jump = event.target.closest("[data-jump]");
    if (jump) {
      const [lat, lng, zoom] = JUMPS[jump.dataset.jump];
      state.map.setView([lat, lng], zoom);
      return;
    }
    const cat = event.target.closest("[data-cat]");
    if (cat) {
      state.filters.category = cat.dataset.cat;
      renderLegend();
      reloadPins().catch((error) => toast(error.message));
      return;
    }
    const reportCat = event.target.closest("[data-report-cat]");
    if (reportCat) {
      state.category = reportCat.dataset.reportCat;
      renderReportCats();
      return;
    }
    const result = event.target.closest("[data-mun]");
    if (result) {
      chooseMunicipality(JSON.parse(result.dataset.mun)).catch((error) => toast(error.message));
      $("#search-results").hidden = true;
      return;
    }
    const toReview = event.target.closest("#review-link, [data-nav='moderar']");
    if (toReview) {
      state.modTab = "pending";
      if (location.hash.replace(/\/$/, "") === "#/moderar") {
        event.preventDefault();
        renderMod().catch((error) => toast(error.message));
      }
    }
    const tab = event.target.closest("[data-mod-tab]");
    if (tab) {
      state.modTab = tab.dataset.modTab;
      renderMod().catch((error) => toast(error.message));
      return;
    }
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === "locate") goToMyLocation();
    if (action === "satellite") setBasemap(state.basemap === "satelite" ? "calle" : "satelite");
    if (action === "open-review") state.modTab = "pending";
    if (action === "toggle-sheet") document.body.classList.toggle("sheet-open");
    if (action === "report") startReport();
    if (action === "cancel-report") cancelReport();
    if (action === "auth") openAuth("login");
    if (action === "auth-mode") openAuth(actionEl.dataset.mode);
    if (action === "close-modal" && event.target === actionEl) closeModal();
    if (action === "password") openPassword();
    if (action === "logout") {
      api("/api/auth/logout", { method: "POST" })
        .then(() => {
          state.user = null;
          renderAccount();
          reloadPins().catch(() => {});
          if (location.hash.startsWith("#/quejas")) renderList().catch(() => {});
          toast("Has salido.");
          if (["moderar", "mias"].includes(location.hash.replace("#/", ""))) location.hash = "#/mapa";
        })
        .catch((error) => toast(error.message));
    }
    if (action === "copy-link") {
      navigator.clipboard?.writeText(location.href).then(() => toast("Enlace copiado.")).catch(() => toast(location.href));
    }
    if (action === "vote") castVote(actionEl.dataset.id, actionEl.dataset.value).catch((error) => toast(error.message));
    if (action === "resolve") resolveComplaint(actionEl.dataset.id).catch((error) => toast(error.message));
    if (action === "approve") moderate(actionEl.dataset.id, "aprobar").catch((error) => toast(error.message));
    if (action === "mod-resolve") moderate(actionEl.dataset.id, "resolver").catch((error) => toast(error.message));
    if (action === "reject-open") {
      const inline = $("#reject-inline");
      if (inline) inline.hidden = false;
      actionEl.closest(".card, .mod-card")?.querySelector(".reject-form")?.removeAttribute("hidden");
    }
    if (action === "delete") deleteComplaint(actionEl).catch((error) => toast(error.message));
    if (action === "role") changeRole(actionEl).catch((error) => toast(error.message));
    if (action === "penalize") penalty(actionEl.dataset.id, false).catch((error) => toast(error.message));
    if (action === "clear-penalty") penalty(actionEl.dataset.id, true).catch((error) => toast(error.message));
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.id === "sel-ccaa" || target.id === "list-ccaa") {
      state.filters.ccaa = target.value;
      state.filters.provincia = "";
      state.filters.municipio = "";
      state.filters.municipioCode = "";
      fillProvinces();
      fillMunicipalities();
      fitFeature(state.ccaaLayer, target.value);
      reloadPins().catch((error) => toast(error.message));
      if (target.id === "list-ccaa") renderList().catch((error) => toast(error.message));
    }
    if (target.id === "sel-prov" || target.id === "list-prov") {
      state.filters.provincia = target.value;
      state.filters.municipio = "";
      state.filters.municipioCode = "";
      fillMunicipalities();
      fitFeature(state.provLayer, target.value);
      reloadPins().catch((error) => toast(error.message));
      if (target.id === "list-prov") renderList().catch((error) => toast(error.message));
    }
    if (target.id === "sel-mun") {
      const option = target.selectedOptions[0];
      state.filters.municipioCode = target.value;
      state.filters.municipio = option?.dataset.name || "";
      if (option?.dataset.lat) {
        chooseMunicipality({
          code: target.value,
          name: option.dataset.name,
          lat: Number(option.dataset.lat),
          lng: Number(option.dataset.lng),
          ccaa: state.filters.ccaa,
          provincia: state.filters.provincia,
        }).catch((error) => toast(error.message));
      } else reloadPins().catch((error) => toast(error.message));
    }
    if (target.id === "list-cat") {
      state.filters.category = target.value;
      renderLegend();
      renderList().catch((error) => toast(error.message));
      reloadPins().catch((error) => toast(error.message));
    }
    if (target.id === "list-orden") {
      state.filters.orden = target.value;
      renderList().catch((error) => toast(error.message));
    }
    if (target.id === "layer-ccaa") toggleLayer(state.ccaaLayer, target.checked);
    if (target.id === "layer-prov") toggleLayer(state.provLayer, target.checked);
    if (target.id === "layer-mun") {
      if (target.checked && state.map.getZoom() < 10) toast("Acércate un poco más para ver los ayuntamientos.");
      loadMunDots().catch((error) => toast(error.message));
    }
    if (target.id === "hide-resolved") {
      state.filters.hideResolved = target.checked;
      reloadPins().catch((error) => toast(error.message));
    }
    if (target.name === "photos") previewPhotos(target.files);
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "report-comment") updateCommentCount();
    if (event.target.id !== "search-mun") return;
    const value = event.target.value.trim();
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => searchMunicipalities(value).catch((error) => toast(error.message)), 220);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.id === "territory-form") event.preventDefault();
    if (form.id === "report-form") {
      event.preventDefault();
      submitReport(form);
    }
    if (form.id === "auth-form") {
      event.preventDefault();
      submitAuth(form).catch((error) => toast(error.message));
    }
    if (form.id === "password-form") {
      event.preventDefault();
      submitPassword(form).catch((error) => toast(error.message));
    }
    if (form.id === "reject-inline" || form.classList.contains("reject-form")) {
      event.preventDefault();
      const id = form.dataset.id || $("#detail").dataset.id;
      moderate(id, "rechazar", new FormData(form).get("note")).catch((error) => toast(error.message));
    }
    if (form.classList.contains("territory-form")) {
      event.preventDefault();
      const data = new FormData(form);
      const id = form.querySelector("button").dataset.id;
      api(`/api/mod/complaints/${id}`, {
        method: "PATCH",
        json: { ccaa: data.get("ccaa"), provincia: data.get("provincia"), municipio: data.get("municipio") },
      }).then(() => {
        toast("Territorio actualizado.");
        renderMod();
      }).catch((error) => toast(error.message));
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("#modal-root").hidden) {
      closeModal();
      return;
    }
    if (state.reportMode) cancelReport();
  });
}

function toggleLayer(layer, visible) {
  if (!layer) return;
  if (visible) layer.addTo(state.map);
  else state.map.removeLayer(layer);
}

async function searchMunicipalities(value) {
  const box = $("#search-results");
  if (value.length < 2) {
    box.hidden = true;
    return;
  }
  const items = await api(`/api/geo/buscar?q=${encodeURIComponent(value)}`);
  if (!items.length) {
    box.hidden = false;
    box.innerHTML = `<p class="hint">Ningún ayuntamiento con ese nombre.</p>`;
    return;
  }
  box.hidden = false;
  box.innerHTML = items.map((item) => `<button type="button" data-mun='${esc(JSON.stringify(item))}'>${esc(item.name)}<small>${esc(item.provincia)} · ${esc(item.ccaa)}</small></button>`).join("");
}

function previewPhotos(files) {
  const box = $("#photo-preview");
  box.innerHTML = "";
  [...files].slice(0, 4).forEach((file) => {
    const img = document.createElement("img");
    img.alt = "Foto seleccionada";
    img.src = URL.createObjectURL(file);
    box.append(img);
  });
}

async function submitAuth(form) {
  const data = Object.fromEntries(new FormData(form));
  const mode = form.dataset.mode === "register" ? "register" : "login";
  const errorBox = form.querySelector("#auth-error");
  try {
    const result = await api(`/api/auth/${mode}`, { method: "POST", json: data });
    state.user = result.user;
    renderAccount();
    closeModal();
    reloadPins().catch(() => {});
    const onDetail = location.hash.startsWith("#/queja/");
    if (result.user?.role === "moderator" && !onDetail) {
      state.modTab = "pending";
      toast("Has entrado. Las quejas por aprobar están en esta bandeja.");
      if (location.hash.replace(/\/$/, "") === "#/moderar") renderMod().catch((error) => toast(error.message));
      else location.hash = "#/moderar";
      return;
    }
    toast(mode === "register" ? "Cuenta creada." : "Has entrado.");
    if (onDetail) renderDetail(location.hash.split("/")[2]).catch((error) => toast(error.message));
    if (location.hash.startsWith("#/quejas")) renderList().catch((error) => toast(error.message));
    if (location.hash.startsWith("#/moderar")) renderMod().catch((error) => toast(error.message));
  } catch (error) {
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = error.message;
    }
    toast(error.message);
  }
}

async function submitPassword(form) {
  const data = Object.fromEntries(new FormData(form));
  await api("/api/auth/password", { method: "POST", json: data });
  closeModal();
  toast("Contraseña cambiada.");
}

async function resolveComplaint(id) {
  const here = await locateMe();
  const result = await api(`/api/complaints/${id}/resolver`, { method: "POST", json: here });
  toast(result.complaint.status === "resolved" ? "Queda marcada como resuelta." : "Aviso anotado. Hacen falta 3 personas de la zona.");
  renderDetail(id);
  reloadPins();
}

async function moderate(id, action, note) {
  await api(`/api/mod/complaints/${id}/${action}`, { method: "POST", json: { note: note || "" } });
  toast(action === "aprobar" ? "Queja publicada." : action === "resolver" ? "Marcada como resuelta." : "Queja no publicada.");
  refreshReview();
  if (location.hash.startsWith("#/queja/")) renderDetail(id);
  if (location.hash.startsWith("#/moderar")) renderMod();
  if (location.hash.startsWith("#/quejas")) renderList();
  reloadPins();
  api("/api/stats").then((stats) => {
    state.stats = stats;
    renderStats();
  });
}

async function deleteComplaint(button) {
  if (button.dataset.confirm !== "1") {
    button.dataset.confirm = "1";
    button.textContent = "Confirmar borrado";
    return;
  }
  await api(`/api/mod/complaints/${button.dataset.id}`, { method: "DELETE" });
  toast("Queja borrada.");
  refreshReview();
  renderMod();
  if (location.hash.startsWith("#/quejas")) renderList();
  reloadPins();
}

async function changeRole(button) {
  await api(`/api/mod/users/${button.dataset.id}/rol`, { method: "POST", json: { role: button.dataset.role } });
  toast("Permiso actualizado.");
  renderMod();
}

async function penalty(id, clear) {
  await api(`/api/mod/users/${id}/penalizacion`, { method: "POST", json: { clear, days: 7 } });
  toast(clear ? "Límite quitado." : "Voto limitado durante 7 días.");
  renderMod();
}

boot().catch((error) => {
  toast(error.message || "No se ha podido abrir la aplicación.");
});
