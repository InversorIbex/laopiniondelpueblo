# El Pueblo Tiene la Opinión

Web ciudadana para que los vecinos de España reporten desperfectos en la calle: bancos rotos, aceras, baches, farolas, basura, señalización y otros. Cada queja queda ligada a su comunidad autónoma, provincia y ayuntamiento.

## Arrancar

Hace falta Node.js 22.5 o superior.

```bash
npm install
npm start
```

Abre [http://localhost:3000](http://localhost:3000). La app del móvil está en [http://localhost:3000/app/](http://localhost:3000/app/).

## Vercel y Supabase

En Vercel los archivos de `public` salen por la CDN. Leaflet está copiado en `public/vendor/leaflet` porque allí no se usa `express.static`. La API la atiende el Express exportado en `index.js`.

Las quejas, los votos y las cuentas se guardan en Supabase (Postgres). En el proyecto de Vercel crea estas variables:

- `DATABASE_URL`: cadena de conexión del proyecto. En Supabase: Project Settings → Database → Connection string → URI, modo Transaction pooler (puerto 6543). Sustituye la contraseña.
- `SECRET`: una clave larga y fija, para que el inicio de sesión siga valiendo cuando la función se reinicia.

Sin `DATABASE_URL`, el servidor usa el archivo local `data/app.sqlite`. Ese archivo no se sube a git.

Para copiar las quejas que ya están en el SQLite local a Supabase, pon `DATABASE_URL` en un archivo `.env` en la raíz del proyecto y ejecuta:

```bash
node server/import-sqlite.js
```

Las fotos siguen en disco. En Vercel el directorio de subidas es temporal: el texto de la queja permanece en Supabase y la foto no, hasta que haya un almacén de archivos.

La primera vez se crea una cuenta de moderación:

- Usuario: `moderador` (también entra con `admin`)
- Contraseña: `Pueblo2026!`

Cámbiala al entrar, en el menú de la cuenta. No hay correo de recuperación: si se olvida una contraseña, no se puede restaurar.

## Qué se puede hacer

- Ver el mapa de España con comunidades y provincias, y los ayuntamientos al acercarse.
- Buscar un ayuntamiento por comunidad, por nombre o tocando el mapa.
- Poner un pin, escribir la queja y adjuntar hasta 4 fotos. Se puede firmar con un alias o con un nombre automático (`Vecino_3847`). Publicar no exige cuenta.
- La queja no sale al mapa público hasta que moderación la aprueba. Al entrar como moderador se abre la bandeja de pendientes.
- El botón «Dónde estoy» centra el mapa en la ubicación del móvil. En el teléfono hace falta permitir la ubicación.
- El botón «Satélite» cambia el callejero por la ortofoto del PNOA.
- Las cuentas registradas votan si la queja es real, solo a menos de 10 km.
- Con al menos 6 votos y un 70 % de «No es real», la queja se retira del mapa.
- Quien vote «No es real» de forma sistemática (5 o más en 30 días, y al menos el 80 % de sus votos) deja de votar 7 días y tiene que confirmar 3 quejas ya contrastadas.
- Tres vecinos a menos de 10 km, o moderación, pueden marcar una queja como resuelta.
- Moderación corrige el territorio, descarga CSV o JSON y gestiona cuentas.

## Comprobar

```bash
npm test
```

## Datos y mapa

El mapa base es el del Instituto Geográfico Nacional (`IGNBaseTodo`, CC BY 4.0, [SCNE](https://www.scne.es/)). No usamos el servidor de teselas de OpenStreetMap: su política de uso bloquea las aplicaciones. Las comunidades y provincias salen de los GeoJSON de [click_that_hood](https://github.com/codeforgermany/click_that_hood). Los centros de los ayuntamientos salen del conjunto `georef-spain-municipio` de OpenDataSoft. Al colocar un pin, si hay red, el ayuntamiento se afina con Nominatim (OpenStreetMap) y se guarda en caché.

La ubicación del voto la envía el navegador. Alguien puede falsificarla: por eso la publicación pasa por moderación y existe el límite de abuso.

## Privacidad

Las fotos se guardan en `data/uploads` y la base de datos en `data/app.sqlite`. No subas esto a un sitio público sin HTTPS, copias de seguridad y una contraseña de moderación nueva.
