# printlog

Self-hosted helper for a 3D printing journal kept in Obsidian. It watches a folder of sliced prints on a NAS and creates one Markdown note per print, filled in from the OrcaSlicer G-code.

## Folder convention

Each print lives in its own folder directly under the prints directory:

```
31.04_Impresiones/
  2026-11-12 Test de primera capa/
    Test de primera capa.gcode
    Test de primera capa.3mf
```

- Only folders containing at least one `.gcode` file (any case) are processed. If there are several, the most recently modified one is used.
- The note is created as `<folder name>.md` in the notes directory. Existing notes are never overwritten or modified.
- The date is taken from a leading `YYYY-MM-DD` in the folder name, otherwise from the G-code modification time (local time, `TZ` is respected). The model name is the folder name without that date.
- If the models directory has a note whose name matches the model name (case and accent insensitive), it is linked in `modelo`.
- A G-code is only processed once its size and modification time have stayed unchanged for `STABLE_SECONDS`, so files still being copied over Samba are skipped.
- Processed folder names are stored in `DATA_DIR/processed.json`, so a note you delete on purpose is not recreated.

Only the first 64 KB and the last 256 KB of each G-code are read. Values come from OrcaSlicer's `; key = value` comments: layer height, nozzle and bed temperature, filament profile, filament weight and estimated time.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PRINTS_DIR` | `/prints` | Folder with one subfolder per print (read-only is enough). |
| `NOTES_DIR` | `/notes` | Vault folder where notes are created (writable). |
| `MODELS_DIR` | `/models` | Vault folder with model notes, used to fill `modelo` (read-only). |
| `DATA_DIR` | `/data` | Service state (writable). |
| `FILEBROWSER_BASE_URL` | empty | URL that maps to `PRINTS_DIR`; `carpeta` is this plus `/` plus the URL-encoded folder name. Empty leaves `carpeta` blank. |
| `POLL_INTERVAL_SECONDS` | `60` | Time between scans. |
| `STABLE_SECONDS` | `60` | How long a G-code must be unchanged before it is processed. |
| `MODEL_NOTES_LINK_PREFIX` | `Project Management/Impresora 3D/Modelos` | Vault path prefix used in the `modelo` link. |

## Docker Compose

```yaml
services:
  printlog:
    image: ghcr.io/christt105/printlog:latest
    user: "1000:1000"
    network_mode: none
    restart: unless-stopped
    environment:
      FILEBROWSER_BASE_URL: http://nas.local:8900/files/Disco/3D/31.04_Impresiones
      TZ: Europe/Madrid
    volumes:
      - /path/to/31.04_Impresiones:/prints:ro
      - /path/to/vault/Project Management/Impresora 3D/Modelos:/models:ro
      - /path/to/vault/Project Management/Impresora 3D/Impresiones:/notes
      - ./data:/data
```

## Development

Requires Node.js 22.18 or newer (TypeScript runs directly through type stripping).

```
npm ci
npm run typecheck
npm test
npm start
```

### Tests and fixtures

`test/fixtures/orca-sample.gcode` is hand-written following OrcaSlicer's output format as closely as possible; it is not a real export. Replace it with a real G-code (trimmed or full) and adjust the expected values in `test/parseGcode.test.ts` when one is available.
