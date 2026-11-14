const fs = require("fs");
const path = require("path");
const { haversineKm } = require("./logic");

const DATA = path.join(__dirname, "..", "data");
const UA = "ElPuebloTieneLaOpinion/1.0 (plataforma civica local)";

const CCAA_BY_GROUP = {
  "01": "Andalucía",
  "02": "Aragón",
  "03": "Illes Balears",
  "04": "Canarias",
  "05": "Cantabria",
  "06": "Castilla-La Mancha",
  "07": "Castilla y León",
  "08": "Cataluña",
  "09": "Ceuta",
  "10": "Extremadura",
  "11": "Galicia",
  "12": "La Rioja",
  "13": "Comunidad de Madrid",
  "14": "Melilla",
  "15": "Región de Murcia",
  "16": "Comunidad Foral de Navarra",
  "17": "País Vasco",
  "18": "Principado de Asturias",
  "19": "Comunitat Valenciana",
};

const PROVINCE_DISPLAY = {
  almeria: "Almería",
  cadiz: "Cádiz",
  cordoba: "Córdoba",
  granada: "Granada",
  huelva: "Huelva",
  jaen: "Jaén",
  malaga: "Málaga",
  sevilla: "Sevilla",
  huesca: "Huesca",
  teruel: "Teruel",
  zaragoza: "Zaragoza",
  asturias: "Asturias",
  balears: "Illes Balears",
  palmas: "Las Palmas",
  "cruz santa tenerife": "Santa Cruz de Tenerife",
  cantabria: "Cantabria",
  avila: "Ávila",
  burgos: "Burgos",
  leon: "León",
  palencia: "Palencia",
  salamanca: "Salamanca",
  segovia: "Segovia",
  soria: "Soria",
  valladolid: "Valladolid",
  zamora: "Zamora",
  albacete: "Albacete",
  "ciudad real": "Ciudad Real",
  cuenca: "Cuenca",
  guadalajara: "Guadalajara",
  toledo: "Toledo",
  barcelona: "Barcelona",
  girona: "Girona",
  lleida: "Lleida",
  tarragona: "Tarragona",
  alicante: "Alicante/Alacant",
  castellon: "Castellón/Castelló",
  valencia: "Valencia/València",
  badajoz: "Badajoz",
  caceres: "Cáceres",
  coruna: "A Coruña",
  lugo: "Lugo",
  ourense: "Ourense",
  pontevedra: "Pontevedra",
  madrid: "Madrid",
  murcia: "Murcia",
  navarra: "Navarra",
  araba: "Araba/Álava",
  bizkaia: "Bizkaia",
  gipuzkoa: "Gipuzkoa",
  rioja: "La Rioja",
  ceuta: "Ceuta",
  melilla: "Melilla",
};

const CCAA_FROM_LAYER = {
  "castilla leon": "Castilla y León",
  cataluna: "Cataluña",
  ceuta: "Ceuta",
  murcia: "Región de Murcia",
  "la rioja": "La Rioja",
  baleares: "Illes Balears",
  canarias: "Canarias",
  cantabria: "Cantabria",
  andalucia: "Andalucía",
  asturias: "Principado de Asturias",
  valencia: "Comunitat Valenciana",
  melilla: "Melilla",
  navarra: "Comunidad Foral de Navarra",
  galicia: "Galicia",
  aragon: "Aragón",
  madrid: "Comunidad de Madrid",
  extremadura: "Extremadura",
  "castilla la mancha": "Castilla-La Mancha",
  "pais vasco": "País Vasco",
};

const TOKEN_ALIAS = {
  vizcaya: "bizkaia",
  guipuzcoa: "gipuzkoa",
  alava: "araba",
  alacant: "alicante",
  castello: "castellon",
  baleares: "balears",
  illes: "",
  islas: "",
  las: "",
  los: "",
  la: "",
  el: "",
  de: "",
  del: "",
  a: "",
  o: "",
  y: "",
};

const state = {
  ready: false,
  provinces: [],
  municipalities: [],
  byCode: new Map(),
  byProvince: new Map(),
  ccaaGeo: null,
  provGeo: null,
  tree: [],
  skippedMunicipalities: 0,
};

let nominatimChain = Promise.resolve();
const negativeCache = new Map();

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function provKey(name) {
  const tokens = norm(name)
    .split(" ")
    .map((token) => TOKEN_ALIAS[token] ?? token)
    .filter(Boolean);
  return [...new Set(tokens)].sort().join(" ");
}

function munKeys(name) {
  const keys = new Set();
  const full = norm(name);
  if (full) keys.add(full);
  for (const part of String(name || "").split("/")) {
    const key = norm(part);
    if (key) keys.add(key);
  }
  return keys;
}

function walkCoords(coords, visit) {
  if (typeof coords[0] === "number") visit(coords[0], coords[1]);
  else coords.forEach((part) => walkCoords(part, visit));
}

function bboxOf(geometry) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  walkCoords(geometry.coordinates, (x, y) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  return { minX, minY, maxX, maxY };
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInGeometry(lng, lat, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const rings of polygons) {
    if (!rings?.length || !pointInRing(lng, lat, rings[0])) continue;
    let inHole = false;
    for (let i = 1; i < rings.length; i += 1) {
      if (pointInRing(lng, lat, rings[i])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

function parseCsv(text) {
  return text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(";"));
}

function load() {
  if (state.ready) return state;

  const provincesFc = JSON.parse(fs.readFileSync(path.join(DATA, "provincias.geojson"), "utf8"));
  const ccaaFc = JSON.parse(fs.readFileSync(path.join(DATA, "ccaa.geojson"), "utf8"));
  const rows = parseCsv(fs.readFileSync(path.join(DATA, "municipios-centro.csv"), "utf8"));

  state.provinces = provincesFc.features.map((feature) => {
    const key = provKey(feature.properties.name);
    const name = PROVINCE_DISPLAY[key];
    const ccaa = CCAA_BY_GROUP[feature.properties.cod_ccaa];
    if (!name || !ccaa) {
      throw new Error(`Provincia sin nombre canónico: ${feature.properties.name}`);
    }
    return {
      key,
      name,
      ccaa,
      code: feature.properties.cod_prov,
      geometry: feature.geometry,
      bbox: bboxOf(feature.geometry),
    };
  });

  const provinceByKey = new Map(state.provinces.map((province) => [province.key, province]));

  for (const row of rows) {
    const [code, munName, provName, , point] = row;
    if (!code || !munName || !point) continue;
    if (norm(provName).startsWith("territorio no asociado")) {
      state.skippedMunicipalities += 1;
      continue;
    }
    const key = provKey(provName);
    const province = provinceByKey.get(key);
    if (!province) {
      state.skippedMunicipalities += 1;
      continue;
    }
    const [latRaw, lngRaw] = point.split(",");
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const item = {
      code: code.trim(),
      name: munName.trim(),
      provincia: province.name,
      ccaa: province.ccaa,
      provKey: province.key,
      lat,
      lng,
    };
    state.municipalities.push(item);
    state.byCode.set(item.code, item);
    if (!state.byProvince.has(province.key)) state.byProvince.set(province.key, []);
    state.byProvince.get(province.key).push(item);
  }

  const ccaaMap = new Map();
  for (const province of state.provinces) {
    if (!ccaaMap.has(province.ccaa)) ccaaMap.set(province.ccaa, []);
    ccaaMap.get(province.ccaa).push({ name: province.name, code: province.code });
  }
  state.tree = [...ccaaMap.entries()]
    .map(([name, provincias]) => ({
      name,
      provincias: provincias.sort((a, b) => a.name.localeCompare(b.name, "es")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  state.ccaaGeo = {
    type: "FeatureCollection",
    features: ccaaFc.features.map((feature) => {
      const display = CCAA_FROM_LAYER[norm(feature.properties.name)];
      if (!display) throw new Error(`Comunidad sin nombre canónico: ${feature.properties.name}`);
      return {
        type: "Feature",
        properties: { name: display },
        geometry: feature.geometry,
      };
    }),
  };

  state.provGeo = {
    type: "FeatureCollection",
    features: state.provinces.map((province) => ({
      type: "Feature",
      properties: { name: province.name, ccaa: province.ccaa, code: province.code },
      geometry: province.geometry,
    })),
  };

  state.ready = true;
  return state;
}

function findProvince(lat, lng) {
  for (const province of state.provinces) {
    const box = province.bbox;
    if (lng < box.minX || lng > box.maxX || lat < box.minY || lat > box.maxY) continue;
    if (pointInGeometry(lng, lat, province.geometry)) return province;
  }
  return null;
}

function nearestInList(list, lat, lng) {
  let best = null;
  let bestDistance = Infinity;
  for (const item of list) {
    const distanceKm = haversineKm(lat, lng, item.lat, item.lng);
    if (distanceKm < bestDistance) {
      best = item;
      bestDistance = distanceKm;
    }
  }
  return best ? { item: best, distanceKm: bestDistance } : null;
}

function findMunicipality(province, rawName) {
  if (!province || !rawName) return null;
  const wanted = munKeys(rawName);
  const list = state.byProvince.get(province.key) || [];
  let partial = null;
  for (const item of list) {
    const keys = munKeys(item.name);
    for (const key of wanted) {
      if (!keys.has(key)) continue;
      if (key === norm(item.name)) return item;
      partial = partial || item;
    }
  }
  return partial;
}

function locateLocal(lat, lng) {
  load();
  let province = findProvince(lat, lng);
  let nearest = province ? nearestInList(state.byProvince.get(province.key) || [], lat, lng) : null;
  if (!province) {
    nearest = nearestInList(state.municipalities, lat, lng);
    if (nearest && nearest.distanceKm <= 3) {
      province = state.provinces.find((item) => item.key === nearest.item.provKey) || null;
    }
  }
  if (!province) return null;
  return {
    ccaa: province.ccaa,
    provincia: province.name,
    municipio: nearest?.item.name || "",
    municipioCode: nearest?.item.code || null,
    lat: nearest?.item.lat ?? null,
    lng: nearest?.item.lng ?? null,
    distanceToCenterKm: nearest ? Math.round(nearest.distanceKm * 10) / 10 : null,
    source: "centro",
  };
}

function scheduleNominatim(task) {
  const run = nominatimChain.then(task, task);
  nominatimChain = run.then(
    () => new Promise((resolve) => setTimeout(resolve, 1100)),
    () => new Promise((resolve) => setTimeout(resolve, 1100))
  );
  return run;
}

async function nominatim(url) {
  return scheduleNominatim(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "es" },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
}

function cacheKey(prefix, lat, lng) {
  return `${prefix}:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

function readCache(db, key) {
  if (!db) return null;
  const row = db.prepare("SELECT payload FROM geo_cache WHERE cache_key = ?").get(key);
  return row ? JSON.parse(row.payload) : null;
}

function writeCache(db, key, payload) {
  if (!db) return;
  db.prepare(
    `INSERT INTO geo_cache (cache_key, payload, created_at)
     VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at`
  ).run(key, JSON.stringify(payload), new Date().toISOString());
}

async function locate(lat, lng, db) {
  const local = locateLocal(lat, lng);
  if (!local) return null;
  if (process.env.GEO_OFFLINE === "1") return local;

  const key = cacheKey("rev", lat, lng);
  const cached = readCache(db, key);
  if (cached) return { ...local, ...cached, source: cached.source || "mapa" };
  if (negativeCache.get(key) > Date.now()) return local;

  const url =
    "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=es&zoom=14" +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
  const data = await nominatim(url);
  const address = data?.address;
  if (!address) {
    negativeCache.set(key, Date.now() + 10 * 60 * 1000);
    return local;
  }

  const rawMun = address.city || address.town || address.village || address.municipality || address.hamlet;
  const province = state.provinces.find((item) => item.name === local.provincia);
  const matched = findMunicipality(province, rawMun);
  const result = {
    ccaa: local.ccaa,
    provincia: local.provincia,
    municipio: matched?.name || local.municipio,
    municipioCode: matched?.code || local.municipioCode,
    source: matched ? "mapa" : "centro",
  };
  writeCache(db, key, result);
  return { ...local, ...result };
}

function searchMunicipalities(query, limit = 12) {
  load();
  const needle = norm(query);
  if (needle.length < 2) return [];
  const starts = [];
  const contains = [];
  for (const item of state.municipalities) {
    const name = norm(item.name);
    if (name.startsWith(needle)) starts.push(item);
    else if (name.includes(needle)) contains.push(item);
  }
  const sort = (a, b) => a.name.localeCompare(b.name, "es");
  return [...starts.sort(sort), ...contains.sort(sort)].slice(0, limit).map(presentMunicipality);
}

function municipalitiesOf(provinceName) {
  load();
  const province = state.provinces.find((item) => item.name === provinceName || provKey(item.name) === provKey(provinceName));
  if (!province) return [];
  return (state.byProvince.get(province.key) || [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map(presentMunicipality);
}

function municipalitiesInBbox(west, south, east, north, limit = 700) {
  load();
  const found = [];
  for (const item of state.municipalities) {
    if (item.lng < west || item.lng > east || item.lat < south || item.lat > north) continue;
    found.push(presentMunicipality(item));
    if (found.length >= limit) break;
  }
  return found;
}

function presentMunicipality(item) {
  return {
    code: item.code,
    name: item.name,
    provincia: item.provincia,
    ccaa: item.ccaa,
    lat: item.lat,
    lng: item.lng,
  };
}

function getMunicipality(code) {
  load();
  const item = state.byCode.get(String(code));
  return item ? presentMunicipality(item) : null;
}

async function municipalityPolygon(code, db) {
  const item = getMunicipality(code);
  if (!item) return null;
  const base = { ...item, polygon: null };
  if (process.env.GEO_OFFLINE === "1") return base;
  const key = `poly:${item.code}`;
  const cached = readCache(db, key);
  if (cached) return cached;
  if (negativeCache.get(key) > Date.now()) return base;

  const query = `${item.name}, ${item.provincia}, España`;
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=1&countrycodes=es&accept-language=es" +
    `&q=${encodeURIComponent(query)}`;
  const data = await nominatim(url);
  const geometry = data?.[0]?.geojson;
  const polygon = geometry && (geometry.type === "Polygon" || geometry.type === "MultiPolygon") ? geometry : null;
  const payload = { ...item, polygon };
  if (polygon) writeCache(db, key, payload);
  else negativeCache.set(key, Date.now() + 10 * 60 * 1000);
  return payload;
}

function publicLayers() {
  load();
  return { ccaa: state.ccaaGeo, provincias: state.provGeo };
}

function tree() {
  load();
  return state.tree;
}

module.exports = {
  load,
  locate,
  locateLocal,
  searchMunicipalities,
  municipalitiesOf,
  municipalitiesInBbox,
  getMunicipality,
  municipalityPolygon,
  publicLayers,
  tree,
  provKey,
  norm,
};
