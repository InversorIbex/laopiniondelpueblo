const test = require("node:test");
const assert = require("node:assert/strict");

process.env.GEO_OFFLINE = "1";
const geo = require("./geo");

test("un punto en la Puerta del Sol cae en Madrid", () => {
  const place = geo.locateLocal(40.4168, -3.7038);
  assert.equal(place.provincia, "Madrid");
  assert.equal(place.ccaa, "Comunidad de Madrid");
  assert.equal(place.municipio, "Madrid");
});

test("las capitales quedan en su provincia", () => {
  const cases = [
    [41.3874, 2.1686, "Barcelona", "Cataluña"],
    [37.3891, -5.9845, "Sevilla", "Andalucía"],
    [43.3623, -8.4115, "A Coruña", "Galicia"],
    [43.263, -2.935, "Bizkaia", "País Vasco"],
    [39.5696, 2.6502, "Illes Balears", "Illes Balears"],
    [28.4636, -16.2518, "Santa Cruz de Tenerife", "Canarias"],
    [35.8894, -5.3194, "Ceuta", "Ceuta"],
  ];
  for (const [lat, lng, provincia, ccaa] of cases) {
    const place = geo.locateLocal(lat, lng);
    assert.ok(place, `sin territorio para ${provincia}`);
    assert.equal(place.provincia, provincia, `${lat},${lng}`);
    assert.equal(place.ccaa, ccaa);
  }
});

test("la búsqueda encuentra ayuntamientos por nombre", () => {
  const results = geo.searchMunicipalities("getafe");
  assert.ok(results.some((item) => item.name === "Getafe" && item.provincia === "Madrid"));
});

test("el árbol territorial incluye las 17 comunidades y las dos ciudades", () => {
  const tree = geo.tree();
  assert.equal(tree.length, 19);
  const madrid = tree.find((item) => item.name === "Comunidad de Madrid");
  assert.deepEqual(madrid.provincias.map((item) => item.name), ["Madrid"]);
});
