# Delta Force map backgrounds

Source: official Delta Force map tool, retrieved 14 September 2026.

| Map | Official configuration | Background directory | Size |
| --- | --- | --- | --- |
| Threshold | [map_ljd.js](https://game.gtimg.cn/images/dfm/cp/a20240729directory/js/lib/map_ljd.js) | map_ljd_pc | 2048 × 2048 |
| Aftershock | [map_yz.js](https://game.gtimg.cn/images/dfm/cp/a20240729directory/js/lib/map_yz.js) | map_yz | 2048 × 2048 |

These backgrounds are selected by the official Warfare Mobile configuration. Threshold's Mobile attack/defend configuration shares the `map_ljd_pc` imagery; the directory name does not imply that a different Mobile map was fabricated. Aftershock uses the shared `map_yz` imagery.

Each map contains 64 original JPEG tiles, 256 × 256 pixels each, at zoom level 3. The source URL is recorded as `sourceTileTemplate` in `mapping/maps.json`. Original JPEG bytes are encoded in two local map packages: `threshold.tiles.json` and `aftershock.tiles.json`. The editor loads only the selected package and arranges its tiles by their official x/y grid. Pixels are unchanged. No imagery is fetched from Tencent while visitors use Mapping.

All 128 tiles are included locally. Total original JPEG size: 2,515,761 bytes. The map tool's separate POI labels, filters, markers, and Chinese interface are not copied into the editor. The backgrounds inspected contain terrain/building imagery; English annotation tools and labels belong to SCP's editor.

`focus` in the manifest is only an initial camera rectangle for a useful view. It does not crop or modify the map, drawing coordinates, or the full-resolution export.

Map artwork remains the property of its respective owners. SCP Mapping is an independent community planning tool. Check the map layout against the current game version before a match; the local snapshot will not automatically track future game changes.

For a different map, use **Upload map** in the editor. To maintain this built-in library, retain the source and Mobile-mode evidence, include every tile in a complete grid, then update `mapping/maps.json` with the exact dimensions and paths.
