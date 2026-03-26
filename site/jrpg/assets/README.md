Placeholder assets for the Phaser JRPG prototype.

Current approach:

- SVG placeholders live here for characters and props.
- Terrain tiles are generated in Phaser at runtime with `Graphics`.
- This keeps the prototype light while we decide on the final art direction.

Recommended replacement pipeline:

1. Build maps in Tiled and export JSON.
2. Replace runtime terrain textures with a real tileset.
3. Swap placeholder SVG actors for sprite sheets or portraits.
4. Keep dimensions aligned to a 32x32 grid to simplify collisions and map authoring.
