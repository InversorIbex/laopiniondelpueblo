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

const state = {
  user: null,
  categories: {},
  map: null,
  base: null,
  detailMap: null,
  detailBase: null,
  pinLayer: null,
  munLayer: null,
  draft: null,
  meMarker: null,
  basemap: "calle",
  category: "",
  reporting: false,
  openSheet: false,
  placeSeq: 0,
  preciseTimer: 0,
  searchHits: [],
  searchTimer: 0,
  pinTimer: 0,
  modTab: "pending",
  focus: null,
  detailId: null,
  installEvent: null,
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
  const request = { method: options.method || "GET", headers, credentials: "same-origin" };
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

function inSpain(lat, lng) {
  return lat >= 27 && lat <= 44.5 && lng >= -19 && lng <= 5;
}

function categoryList() {
  return Object.entries(state.categories || {});
}

function swatch(id) {
  return `<span class="swatch pin-${esc(id)}">${GLYPHS[id] || GLYPHS.otros}</span>`;
}

function pinIcon(category, status) {
  const kind = GLYPHS[category] ? category : "otros";
  const extra = status === "resolved" ? "is-resolved" : status === "pending" ? "is-pending" : "";
  return L.divIcon({
    className: "pin-icon",
    html: `<div class="pin pin-${kind} ${extra}"><div class="pin-head">${GLYPHS[kind]}</div><div class="pin-tail"></div></div>`,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -42],
  });
}

function badge(status, label) {
  return `<span class="badge badge-${esc(status)}">${esc(label || status)}</span>`;
}

function voteLine(item) {
  const total = item.realVotes + item.fakeVotes;
  const pct = total ? Math.round((item.realVotes / total) * 100) : 0;
  return `<div class="vote-line" aria-hidden="true"><span style="width:${pct}%"></span></div>
    <p class="hint">${item.realVotes} la ven real · ${item.fakeVotes} no la ven real${total ? ` · ${pct}% real` : ""}</p>`;
}

function cardHtml(item) {
  const photos = (item.photos || []).map((src) => `<img src="${esc(src)}" alt="Foto de la queja">`).join("");
  return `<article class="card">
    <div class="card-top"><h2>${esc(item.categoryLabel)}</h2>${badge(item.status, item.statusLabel)}</div>
    <p>${esc(item.comment)}</p>
    <div class="thumbs">${photos}</div>
    <p class="hint">${esc(item.municipio)} · ${esc(item.provincia)} · ${esc(item.ccaa)}</p>
    <p class="hint">Por ${esc(item.authorAlias)} · ${esc(formatDate(item.createdAt))}</p>
    ${voteLine(item)}
    ${item.moderationNote ? `<p class="hint">Nota de moderación: ${esc(item.moderationNote)}</p>` : ""}
    <div class="actions"><a class="action" href="#/queja/${item.id}">Abrir</a></div>
  </article>`;
}

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
  const button = $("#satellite");
  const on = state.basemap === "satelite";
  button.classList.toggle("is-on", on);
  button.textContent = on ? "Calle" : "Satélite";
  button.setAttribute("aria-pressed", on ? "true" : "false");
}

function initMap() {
  state.map = L.map("map", {
    zoomControl: false,
    minZoom: 5,
    maxZoom: 19,
    maxBounds: [[24, -22], [46, 6]],
    maxBoundsViscosity: 0.6,
  }).setView([40.2, -3.7], 6);
  L.control.zoom({ position: "bottomleft" }).addTo(state.map);
  state.base = baseTiles().addTo(state.map);
  state.pinLayer = L.layerGroup().addTo(state.map);
  state.munLayer = L.layerGroup().addTo(state.map);
  state.map.on("click", (event) => handleMapClick(event.latlng));
  state.map.on("moveend", () => {
    clearTimeout(state.pinTimer);
    state.pinTimer = setTimeout(() => {
      reloadPins().catch((error) => toast(error.message));
      loadMunDots().catch(() => {});
    }, 220);
  });
  reloadPins().catch((error) => toast(error.message));
}

let lastClick = 0;
function handleMapClick(latlng) {
  const now = Date.now();
  if (now - lastClick < 280) return;
  lastClick = now;
  if (!state.reporting) openReport();
  placeDraft(latlng);
}

function placeDraft(latlng) {
  if (!state.draft) {
    state.draft = L.marker(latlng, { draggable: true, icon: pinIcon("draft"), zIndexOffset: 1000 }).addTo(state.map);
    state.draft.on("click", (event) => L.DomEvent.stopPropagation(event));
    state.draft.on("dragend", () => {
      const point = state.draft.getLatLng();
      refreshPlace(point);
      keepPinVisible(point);
    });
  } else {
    state.draft.setLatLng(latlng);
  }
  refreshPlace(latlng);
  setTimeout(() => keepPinVisible(latlng), 40);
}

function keepPinVisible(latlng) {
  if (!state.map) return;
  const sheet = $("#report");
  const occupied = sheet && !sheet.hidden ? sheet.offsetHeight + 16 : 24;
  state.map.panInside(latlng, {
    paddingTopLeft: L.point(16, 70),
    paddingBottomRight: L.point(16, occupied),
    animate: true,
  });
}

async function refreshPlace(latlng) {
  const seq = ++state.placeSeq;
  const label = $("#place");
  label.textContent = "Buscando el ayuntamiento…";
  try {
    const quick = await api(`/api/geo/reverse?modo=rapido&lat=${latlng.lat}&lng=${latlng.lng}`);
    if (seq !== state.placeSeq) return;
    showPlace(quick);
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
    if (seq === state.placeSeq) label.textContent = error.message;
  }
}

function showPlace(place) {
  const text = `${place.municipio || "Ayuntamiento sin determinar"} · ${place.provincia} · ${place.ccaa}`;
  const note = place.source === "centro" ? " Asignado por cercanía." : "";
  $("#place").textContent = text + note;
}

async function reloadPins() {
  if (!state.map) return;
  const bounds = state.map.getBounds();
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");
  const pins = await api(`/api/complaints?bbox=${encodeURIComponent(bbox)}`);
  if (state.user?.role === "moderator") {
    const pending = await api(`/api/complaints?status=pending&bbox=${encodeURIComponent(bbox)}`);
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
  const photo = item.photos?.[0] ? `<img src="${esc(item.photos[0])}" alt="">` : "";
  const openLabel = item.status === "pending" ? "Revisar" : "Ver la queja";
  marker.bindPopup(
    `<div class="popup">${photo}<strong>${esc(item.categoryLabel)}</strong><p>${esc(item.comment.slice(0, 140))}</p><p>${esc(item.municipio)}</p><p><a href="#/queja/${item.id}">${openLabel}</a></p></div>`
  );
  marker.on("click", (event) => L.DomEvent.stopPropagation(event));
  marker.addTo(state.pinLayer);
}

async function loadMunDots() {
  if (!state.map || state.map.getZoom() < 10) {
    state.munLayer.clearLayers();
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
      state.map.setView([item.lat, item.lng], Math.max(state.map.getZoom(), 13));
    });
    dot.addTo(state.munLayer);
  }
}

function renderCats() {
  $("#cats").innerHTML = categoryList()
    .map(([id, label]) => `<button type="button" class="chip ${state.category === id ? "is-on" : ""}" data-action="cat" data-cat="${id}">${swatch(id)}${esc(label)}</button>`)
    .join("");
}

function updateCount() {
  const value = $("#comment").value.trim();
  $("#count").textContent = value.length < 20 ? `${value.length} / 20 caracteres mínimo` : `${value.length} caracteres`;
}

function reportError(message) {
  const node = $("#report-error");
  node.hidden = !message;
  node.textContent = message || "";
}

function openReport() {
  if (!location.hash.startsWith("#/mapa")) {
    state.openSheet = true;
    location.hash = "#/mapa";
    return;
  }
  state.reporting = true;
  $("#report").hidden = false;
  $("#alias-user").hidden = !state.user;
  reportError("");
  updateCount();
  renderCats();
  if (!state.draft) $("#place").textContent = "Toca el mapa o usa tu ubicación.";
  state.map?.closePopup();
  setTimeout(() => state.map?.invalidateSize(), 60);
}

function closeReport() {
  state.reporting = false;
  state.openSheet = false;
  $("#report").hidden = true;
  $("#report").reset();
  $("#preview").innerHTML = "";
  reportError("");
  updateCount();
  state.category = "";
  renderCats();
  const aliasUser = $("#alias-user");
  if (aliasUser) aliasUser.hidden = !state.user;
  if (state.draft && state.map) {
    state.map.removeLayer(state.draft);
    state.draft = null;
  }
  $("#place").textContent = "Toca el mapa o usa tu ubicación.";
}

function previewPhotos() {
  const box = $("#preview");
  box.innerHTML = "";
  const files = [...($("#photos").files || [])].filter((file) => file.size).slice(0, 4);
  for (const file of files) {
    const img = document.createElement("img");
    img.alt = "Vista previa";
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    box.append(img);
  }
}

async function submitReport() {
  reportError("");
  const comment = $("#comment").value.trim();
  const aliasMode = $("#report").querySelector('input[name="aliasMode"]:checked')?.value || "auto";
  if (!state.draft) return reportError("Toca el mapa para marcar el sitio.");
  if (!state.category) return reportError("Elige qué tipo de problema es.");
  if (comment.length < 20) {
    $("#comment").focus();
    return reportError("Cuéntalo con un poco más de detalle: al menos 20 caracteres.");
  }
  const files = [...($("#photos").files || [])].filter((file) => file.size);
  if (files.length > 4) return reportError("Puedes adjuntar hasta 4 fotos.");
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) return reportError("Cada foto puede pesar hasta 5 MB.");
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      return reportError("Las fotos tienen que ser JPG, PNG, WEBP o GIF.");
    }
  }
  const data = new FormData();
  const point = state.draft.getLatLng();
  data.set("lat", String(point.lat));
  data.set("lng", String(point.lng));
  data.set("category", state.category);
  data.set("comment", comment);
  data.set("aliasMode", aliasMode);
  data.set("alias", $("#alias").value.trim());
  files.forEach((file) => data.append("photos", file));
  const button = $("#report").querySelector("[type=submit]");
  button.disabled = true;
  button.textContent = "Enviando…";
  try {
    const result = await api("/api/complaints", { method: "POST", body: data });
    saveToken(result.complaint.id, result.authorToken);
    closeReport();
    toast(`Enviada como ${result.complaint.authorAlias}. La revisaremos antes de publicarla.`);
    refreshStats().catch(() => {});
    location.hash = `#/queja/${result.complaint.id}`;
  } catch (error) {
    reportError(error.message);
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Enviar a revisión";
  }
}

async function locateMe() {
  if (!navigator.geolocation) throw new Error("Este navegador no puede compartir la ubicación.");
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error("Activa la ubicación. Hace falta para votar y para situarte.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

async function goToMyLocation() {
  if (!window.isSecureContext) {
    toast("La ubicación del móvil pide una página segura: https o este equipo.");
    return;
  }
  toast("Buscando dónde estás…");
  let here;
  try {
    here = await locateMe();
  } catch (error) {
    toast(error.message);
    return;
  }
  if (!inSpain(here.lat, here.lng)) {
    toast("Ese punto queda fuera de España. Márcalo a mano en el mapa.");
    return;
  }
  if (!location.hash.startsWith("#/mapa")) location.hash = "#/mapa";
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
  if (state.reporting) placeDraft(L.latLng(here.lat, here.lng));
}

async function searchPlaces(query) {
  const box = $("#search-results");
  if (query.trim().length < 2) {
    state.searchHits = [];
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const items = await api(`/api/geo/buscar?q=${encodeURIComponent(query.trim())}`);
  state.searchHits = items;
  if (!items.length) {
    box.hidden = false;
    box.innerHTML = `<p class="hint" style="padding:10px 12px">Ningún ayuntamiento con ese nombre.</p>`;
    return;
  }
  box.hidden = false;
  box.innerHTML = items
    .map((item, index) => `<button type="button" data-action="pick-place" data-index="${index}">${esc(item.name)}<small>${esc(item.provincia)} · ${esc(item.ccaa)}</small></button>`)
    .join("");
}

function pickPlace(index) {
  const item = state.searchHits[index];
  if (!item) return;
  $("#search-results").hidden = true;
  $("#search").value = item.name;
  state.map.setView([item.lat, item.lng], 13);
}

function show(screen) {
  document.querySelectorAll(".screen").forEach((section) => {
    section.hidden = section.dataset.screen !== screen;
  });
  document.querySelectorAll("[data-tab]").forEach((link) => {
    link.classList.toggle("is-on", link.dataset.tab === screen);
  });
  const sheet = $("#report");
  if (screen === "mapa") {
    if (state.reporting) sheet.hidden = false;
    setTimeout(() => state.map?.invalidateSize(), 50);
  } else {
    if (state.reporting) sheet.hidden = true;
    destroyDetailMap();
  }
}

function destroyDetailMap() {
  if (state.detailMap) {
    state.detailMap.remove();
    state.detailMap = null;
    state.detailBase = null;
  }
}

async function renderList() {
  const items = await api("/api/complaints?orden=recientes");
  $("#list").innerHTML = items.length
    ? items.map((item) => cardHtml(item)).join("")
    : `<div class="empty"><h2>Todavía no hay quejas publicadas</h2><p>Cuando el equipo aprueba una, aparece aquí y en el mapa.</p></div>`;
}

async function renderDetail(id) {
  destroyDetailMap();
  const root = $("#detail");
  state.detailId = Number(id);
  try {
    const item = await api(`/api/complaints/${id}`, { token: tokenStore()[id] || "" });
    const canVote = item.status === "verified" && state.user && !item.myVote;
    const voteButtons = canVote
      ? `<button class="action mint" type="button" data-action="vote" data-value="real" data-id="${item.id}">Es real</button>
         <button class="action danger" type="button" data-action="vote" data-value="fake" data-id="${item.id}">No es real</button>`
      : "";
    const voted = item.myVote ? `<p class="hint">Tu voto: ${item.myVote === "real" ? "es real" : "no es real"}.</p>` : "";
    const loginHint = !state.user && item.status === "verified" ? `<p class="hint">Para votar hay que entrar. Publicar una queja no requiere cuenta.</p>` : "";
    const limited = state.user?.limited
      ? `<p class="hint">Tu voto está limitado. Te quedan ${state.user.rehabRemaining} confirmaciones de quejas con consenso.</p>`
      : "";
    const resolve = item.status === "verified" && state.user
      ? `<button class="action soft" type="button" data-action="resolve" data-id="${item.id}">Ya está arreglada</button>`
      : "";
    const requests = item.resolveRequests ? `<p class="hint">${item.resolveRequests} de 3 avisos de que ya está resuelta.</p>` : "";
    const modActions = state.user?.role === "moderator"
      ? `<button class="action mint" type="button" data-action="approve" data-id="${item.id}">Aprobar</button>
         <button class="action danger" type="button" data-action="reject-open" data-id="${item.id}">No publicar</button>
         ${item.status === "verified" || item.status === "resolved" ? `<button class="action soft" type="button" data-action="mod-resolve" data-id="${item.id}">Marcar resuelta</button>` : ""}`
      : "";
    root.innerHTML = `<a class="back" href="#/quejas">Volver al listado</a>
      <article class="card" style="margin-top:12px">
        <div class="card-top"><h2>${esc(item.categoryLabel)}</h2>${badge(item.status, item.statusLabel)}</div>
        <p>${esc(item.comment)}</p>
        <div class="thumbs">${(item.photos || []).map((src) => `<img src="${esc(src)}" alt="Foto de la queja">`).join("")}</div>
        <div id="detail-map"></div>
        <p class="hint">${esc(item.municipio)} · ${esc(item.provincia)} · ${esc(item.ccaa)}</p>
        <p class="hint">Por ${esc(item.authorAlias)} · ${esc(formatDate(item.createdAt))}</p>
        ${voteLine(item)}
        ${item.moderationNote ? `<p class="hint">Nota de moderación: ${esc(item.moderationNote)}</p>` : ""}
        ${voted}${loginHint}${limited}${requests}
        <p class="hint">El voto comprueba que estás a menos de 10 km. La ubicación la envía el móvil y se puede falsear.</p>
        <div class="actions">${voteButtons}${resolve}${modActions}
          <button class="action" type="button" data-action="see-map" data-lat="${item.lat}" data-lng="${item.lng}">Ver en el mapa</button>
        </div>
        <form id="reject-inline" hidden>
          <label>Motivo <input name="note" type="text" maxlength="500" placeholder="Por qué no se publica"></label>
          <button class="action danger" type="submit">Confirmar</button>
        </form>
      </article>`;
    state.detailMap = L.map("detail-map", { zoomControl: false, dragging: false, scrollWheelZoom: false, attributionControl: false });
    state.detailBase = baseTiles().addTo(state.detailMap);
    L.marker([item.lat, item.lng], { icon: pinIcon(item.category, item.status) }).addTo(state.detailMap);
    state.detailMap.setView([item.lat, item.lng], 16);
    setTimeout(() => state.detailMap?.invalidateSize(), 80);
  } catch (error) {
    root.innerHTML = `<div class="empty"><h2>No podemos mostrar esta queja</h2><p>${esc(error.message)}</p></div>`;
  }
}

async function renderMine() {
  const accountItems = state.user ? await api("/api/complaints/mias") : [];
  const stored = Object.entries(tokenStore()).map(([id, token]) => ({ id: Number(id), token }));
  const anon = stored.length ? await api("/api/complaints/por-token", { method: "POST", json: { tokens: stored } }) : [];
  const byId = new Map();
  for (const item of [...accountItems, ...anon]) byId.set(item.id, item);
  const items = [...byId.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  $("#mine").innerHTML = items.length
    ? items.map((item) => cardHtml(item)).join("")
    : `<div class="empty"><h2>Desde este móvil aún no has enviado ninguna</h2><p>Las anónimas solo se recuerdan en este navegador. Si pierdes la contraseña, no hay correo para recuperarla.</p></div>`;
}

function renderAccount() {
  const user = state.user;
  const install = state.installEvent
    ? `<div class="install"><span>Instálala en la pantalla de inicio.</span><button class="action mint" type="button" data-action="install">Añadir</button></div>`
    : `<p class="hint">En el móvil, ábrela en el navegador y elige Añadir a la pantalla de inicio.</p>`;
  const rules = `<div class="rules">
    <p>Publicar es anónimo. La cuenta solo hace falta para votar y para moderar.</p>
    <p>Cada queja espera a que el equipo la apruebe. El mapa público enseña las verificadas y las resueltas.</p>
    <p>El voto vale a menos de 10 km. Con 6 votos y un 70 % de «no es real», sale del mapa.</p>
    <p>Quien abuse de «no es real» queda 7 días limitado y tiene que confirmar 3 quejas con consenso.</p>
    <p>Tres vecinos cercanos, o el equipo, pueden marcarla como resuelta.</p>
    <p>No hay correo. Si olvidas la contraseña, no se puede recuperar.</p>
    <p><a href="/">Abrir la versión web</a></p>
  </div>`;
  if (!user) {
    $("#account").innerHTML = `<p class="eyebrow">Cuenta</p><h1>Entra para votar</h1>
      <form class="auth" id="auth-form" data-mode="login">
        <div class="modes">
          <button class="action mint" type="button" data-action="auth-mode" data-mode="login">Entrar</button>
          <button class="action" type="button" data-action="auth-mode" data-mode="register">Crear cuenta</button>
        </div>
        <h2>Entrar</h2>
        <p class="hint">Para aprobar quejas, el usuario es moderador. También puedes escribir admin.</p>
        <label>Usuario <input name="username" type="text" required minlength="3" maxlength="24" autocomplete="username"></label>
        <label>Contraseña <input name="password" type="password" required minlength="8" autocomplete="current-password"></label>
        <p id="auth-error" class="error" hidden></p>
        <button class="send" type="submit">Entrar</button>
      </form>
      ${install}${rules}`;
    return;
  }
  const penalty = user.limited
    ? `<p class="hint">Tu voto está limitado${user.penaltyUntil ? ` hasta el ${formatDate(user.penaltyUntil)}` : ""}. Te quedan ${user.rehabRemaining} confirmaciones.</p>`
    : "";
  $("#account").innerHTML = `<p class="eyebrow">${user.role === "moderator" ? "Moderación" : "Vecino"}</p>
    <h1>${esc(user.username)}</h1>
    ${penalty}
    <div class="actions">
      ${user.role === "moderator" ? '<a class="action mint" href="#/moderar">Aprobar quejas</a>' : ""}
      <button class="action" type="button" data-action="password">Cambiar contraseña</button>
      <button class="action danger" type="button" data-action="logout">Salir</button>
    </div>
    <form id="password-form" class="auth" hidden>
      <label>Contraseña actual <input name="current" type="password" required autocomplete="current-password"></label>
      <label>Contraseña nueva <input name="next" type="password" required minlength="8" autocomplete="new-password"></label>
      <button class="send" type="submit">Guardar</button>
    </form>
    ${install}${rules}`;
}

function setAuthMode(mode) {
  const form = $("#auth-form");
  if (!form) return;
  const register = mode === "register";
  form.dataset.mode = register ? "register" : "login";
  form.querySelector("h2").textContent = register ? "Crear cuenta" : "Entrar";
  form.querySelector("[type=submit]").textContent = register ? "Crear cuenta" : "Entrar";
  const password = form.querySelector("[name=password]");
  password.setAttribute("autocomplete", register ? "new-password" : "current-password");
  const hint = form.querySelector(".hint");
  hint.textContent = register
    ? "De 3 a 24 letras o números, empezando por una letra. No pedimos correo: si olvidas la contraseña no podremos recuperarla."
    : "Para aprobar quejas, el usuario es moderador. También puedes escribir admin.";
  const error = $("#auth-error");
  error.hidden = true;
  error.textContent = "";
}

async function renderMod() {
  const root = $("#mod");
  if (!state.user || state.user.role !== "moderator") {
    root.innerHTML = `<div class="empty"><h2>Esta zona es de moderación</h2><p>Entra con el usuario moderador. También puedes escribir admin. Las pendientes solo aparecen después de entrar.</p><p><a href="#/cuenta">Ir a la cuenta</a></p></div>`;
    return;
  }
  const summary = await api("/api/mod/resumen");
  const counts = summary.byStatus || {};
  const tabs = [
    ["pending", "Pendientes"],
    ["verified", "Verificadas"],
    ["resolved", "Resueltas"],
    ["rejected", "No publicadas"],
    ["removed", "Retiradas"],
  ];
  const tabHtml = tabs
    .map(([tab, label]) => `<button type="button" data-action="mod-tab" data-tab="${tab}" aria-current="${state.modTab === tab ? "true" : "false"}">${label} (${counts[tab] || 0})</button>`)
    .join("");
  const items = await api(`/api/mod/complaints?status=${state.modTab}`);
  const cards = items.length
    ? items.map((item) => `<article class="card">
        ${cardHtml(item).replace("<article class=\"card\">", "<div>").replace("</article>", "</div>")}
        <div class="actions">
          ${item.status === "pending" ? `<button class="action mint" type="button" data-action="approve" data-id="${item.id}">Aprobar</button>` : ""}
          ${item.status !== "rejected" ? `<button class="action danger" type="button" data-action="reject-open" data-id="${item.id}">No publicar</button>` : ""}
          ${item.status === "verified" ? `<button class="action soft" type="button" data-action="mod-resolve" data-id="${item.id}">Resuelta</button>` : ""}
        </div>
        <form class="reject-form auth" hidden data-id="${item.id}">
          <label>Motivo <input name="note" type="text" maxlength="500" placeholder="Al menos 4 caracteres"></label>
          <button class="action danger" type="submit">Confirmar</button>
        </form>
      </article>`).join("")
    : `<div class="empty"><h2>${state.modTab === "pending" ? "No hay quejas esperando" : "No hay quejas en esta bandeja"}</h2><p>Cuando alguien envíe una, aparecerá en Pendientes.</p></div>`;
  root.innerHTML = `<p class="eyebrow">Equipo</p><h1>Moderación</h1>
    <p class="hint"><a href="/api/mod/export?format=csv">Descargar CSV</a> · <a href="/api/mod/export?format=json">JSON</a></p>
    <div class="mod-tabs">${tabHtml}</div>
    <div class="cards">${cards}</div>`;
}

async function refreshStats() {
  const stats = await api("/api/stats");
  $("#stats").textContent = `${stats.verified} verificadas · ${stats.resolved} resueltas`;
}

async function castVote(id, value) {
  if (!state.user) {
    location.hash = "#/cuenta";
    return;
  }
  const here = await locateMe();
  const result = await api(`/api/complaints/${id}/vote`, { method: "POST", json: { value, lat: here.lat, lng: here.lng } });
  state.user = result.user;
  renderAccount();
  if (result.removed) toast("Voto registrado. La queja se ha retirado del mapa.");
  else if (result.penalized) toast("Voto registrado. Tu voto queda limitado por el uso de «no es real».");
  else toast("Voto registrado.");
  await renderDetail(id);
  reloadPins().catch(() => {});
}

async function askResolve(id) {
  const here = await locateMe();
  const result = await api(`/api/complaints/${id}/resolver`, { method: "POST", json: { lat: here.lat, lng: here.lng } });
  toast(result.complaint.status === "resolved" ? "Queda marcada como resuelta." : "Aviso registrado. Hacen falta 3 vecinos.");
  await renderDetail(id);
  refreshStats().catch(() => {});
}

async function approve(id) {
  await api(`/api/mod/complaints/${id}/aprobar`, { method: "POST", json: {} });
  toast("Publicada en el mapa.");
  await afterModeration(id);
}

async function reject(id, note) {
  await api(`/api/mod/complaints/${id}/rechazar`, { method: "POST", json: { note } });
  toast("No se publicará.");
  await afterModeration(id);
}

async function modResolve(id) {
  await api(`/api/mod/complaints/${id}/resolver`, { method: "POST", json: {} });
  toast("Marcada como resuelta.");
  await afterModeration(id);
}

async function afterModeration(id) {
  refreshStats().catch(() => {});
  reloadPins().catch(() => {});
  if (location.hash.startsWith("#/queja/")) await renderDetail(id);
  if (location.hash.startsWith("#/moderar")) await renderMod();
}

async function route() {
  const raw = location.hash.replace(/^#\/?/, "") || "mapa";
  const [name, id] = raw.split("/");
  if (name === "queja" && id) {
    show("detalle");
    await renderDetail(id);
    return;
  }
  const screen = ["mapa", "quejas", "mias", "cuenta", "moderar"].includes(name) ? name : "mapa";
  show(screen);
  if (state.focus && screen === "mapa" && state.map) {
    state.map.setView(state.focus, 16);
    state.focus = null;
  }
  if (state.openSheet && screen === "mapa") openReport();
  if (screen === "quejas") await renderList();
  if (screen === "mias") await renderMine();
  if (screen === "cuenta") renderAccount();
  if (screen === "moderar") await renderMod();
}

function bind() {
  window.addEventListener("hashchange", () => {
    route().catch((error) => toast(error.message));
  });
  $("#comment").addEventListener("input", updateCount);
  $("#photos").addEventListener("change", previewPhotos);
  $("#search").addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    const query = $("#search").value;
    state.searchTimer = setTimeout(() => {
      searchPlaces(query).catch((error) => toast(error.message));
    }, 250);
  });
  $("#search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    searchPlaces($("#search").value).catch((error) => toast(error.message));
  });
  document.addEventListener("click", (event) => {
    const node = event.target.closest("[data-action]");
    if (!event.target.closest(".search")) $("#search-results").hidden = true;
    if (!node) return;
    const action = node.dataset.action;
    const id = node.dataset.id;
    const run = async () => {
      if (action === "report") openReport();
      if (action === "close-report") closeReport();
      if (action === "locate") await goToMyLocation();
      if (action === "satellite") setBasemap(state.basemap === "satelite" ? "calle" : "satelite");
      if (action === "cat") {
        state.category = node.dataset.cat;
        renderCats();
      }
      if (action === "pick-place") pickPlace(Number(node.dataset.index));
      if (action === "see-map") {
        state.focus = [Number(node.dataset.lat), Number(node.dataset.lng)];
        location.hash = "#/mapa";
      }
      if (action === "vote") await castVote(id, node.dataset.value);
      if (action === "resolve") await askResolve(id);
      if (action === "approve") await approve(id);
      if (action === "mod-resolve") await modResolve(id);
      if (action === "reject-open") {
        const form = node.closest("article")?.querySelector(".reject-form") || $("#reject-inline");
        if (form) form.hidden = false;
      }
      if (action === "auth-mode") setAuthMode(node.dataset.mode);
      if (action === "logout") {
        await api("/api/auth/logout", { method: "POST" });
        state.user = null;
        toast("Sesión cerrada.");
        location.hash = "#/cuenta";
        renderAccount();
        reloadPins().catch(() => {});
      }
      if (action === "password") $("#password-form").hidden = false;
      if (action === "mod-tab") {
        state.modTab = node.dataset.tab;
        await renderMod();
      }
      if (action === "install" && state.installEvent) {
        state.installEvent.prompt();
        state.installEvent = null;
        renderAccount();
      }
    };
    run().catch((error) => toast(error.message));
  });
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.id === "report") {
      event.preventDefault();
      submitReport();
      return;
    }
    if (form.id === "auth-form") {
      event.preventDefault();
      submitAuth(form).catch((error) => {
        const box = $("#auth-error");
        box.hidden = false;
        box.textContent = error.message;
      });
      return;
    }
    if (form.id === "password-form") {
      event.preventDefault();
      const data = new FormData(form);
      api("/api/auth/password", { method: "POST", json: { current: data.get("current"), next: data.get("next") } })
        .then(() => {
          form.hidden = true;
          form.reset();
          toast("Contraseña cambiada.");
        })
        .catch((error) => toast(error.message));
      return;
    }
    if (form.id === "reject-inline" || form.classList.contains("reject-form")) {
      event.preventDefault();
      const note = String(new FormData(form).get("note") || "").trim();
      const complaintId = form.dataset.id || state.detailId;
      if (note.length < 4) {
        toast("Escribe un motivo de al menos 4 caracteres.");
        return;
      }
      reject(complaintId, note).catch((error) => toast(error.message));
    }
  });
}

async function submitAuth(form) {
  const data = new FormData(form);
  const mode = form.dataset.mode === "register" ? "register" : "login";
  const result = await api(`/api/auth/${mode}`, {
    method: "POST",
    json: { username: data.get("username"), password: data.get("password") },
  });
  state.user = result.user;
  $("#alias-user").hidden = !state.user;
  toast(mode === "register" ? "Cuenta creada." : "Has entrado.");
  if (state.user.role === "moderator") location.hash = "#/moderar";
  else renderAccount();
  reloadPins().catch(() => {});
}

async function boot() {
  if (!L) {
    toast("El mapa no se ha podido cargar.");
    return;
  }
  const [me, meta] = await Promise.all([api("/api/auth/me"), api("/api/meta"), refreshStats()]);
  state.user = me.user;
  state.categories = meta.categories || {};
  renderCats();
  $("#alias-user").hidden = !state.user;
  initMap();
  bind();
  await route();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" }).catch(() => {});
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.installEvent = event;
  if (location.hash.startsWith("#/cuenta")) renderAccount();
});

boot().catch((error) => toast(error.message));
