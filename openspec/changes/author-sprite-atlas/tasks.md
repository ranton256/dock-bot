## 1. PNG writing

- [ ] 1.1 Add `tools/png.js` with a dependency-free PNG writer: signature, `IHDR`,
      per-scanline filter bytes, a single `zlib.deflateSync` `IDAT`, and `IEND`, with
      correct CRC32 per chunk. Verify by emitting a 2×2 image of four known RGBA values
      and confirming a browser renders those exact four pixels.
- [ ] 1.2 Verify the writer round-trips through Node's own `zlib.inflateSync`: inflate the
      `IDAT` of the 2×2 image, strip filter bytes, and confirm the recovered pixels match
      the input exactly.

## 2. Independent validation

- [ ] 2.1 Add `tools/decode-png.js`: read a PNG from disk, parse chunks, inflate `IDAT`,
      reverse the scanline filters, and return width, height, and RGBA pixels. It must not
      import anything from the generator. Verify it decodes the 2×2 fixture from task 1.1
      back to the original four pixels.
- [ ] 2.2 Add `tools/validate-atlas.js` asserting the mechanical requirements against the
      decoded file: 64×64 with alpha; the nine specified cells non-empty; the seven unused
      cells fully transparent; `floor`/`wall`/`pad` fully opaque across all 256 pixels;
      the six entity frames each containing at least one fully transparent pixel; no pixel
      anywhere with intermediate alpha; distinct-color count within a flat-shading ceiling.
      Verify it exits non-zero with a message naming the failed requirement.
- [ ] 2.3 Verify the validator actually catches each failure class by running it against
      deliberately corrupted atlases — one with a feathered edge, one with an opaque entity
      background, one with a stray pixel in an unused cell — and confirming each is
      rejected for the right reason. A validator that has never failed proves nothing.

## 3. Palette and frame authoring format

- [ ] 3.1 Add `tools/atlas.js` defining the named palette — cool steel greys, teal, amber —
      as fully opaque RGBA constants, plus the character-to-palette mapping and the
      designated transparent character. Verify every palette entry is fully opaque and
      every map character resolves.
- [ ] 3.2 Implement parsing of a frame as 16 lines of 16 characters into RGBA pixels, and
      composition of the nine frames into the 4×4 cell grid at the cells the spec names.
      Verify a frame placed at cell (c,r) lands at `x = c*16, y = r*16` by checking a
      distinctive corner pixel of each frame after composition.

## 4. Terrain frames

- [ ] 4.1 Author `floor`, `wall`, and `pad` as fully opaque 16×16 maps. Verify the
      validator's opacity assertions pass and that `pad` is distinguishable from `floor`
      when the two are viewed side by side at ×3.

## 5. Entity frames

- [ ] 5.1 Author the four bot frames with an identical chassis silhouette and a
      high-contrast visor moving to the facing edge, per the design. Verify all four pass
      the transparent-background assertion, and confirm by eye at ×3 that each facing is
      identifiable on its own and that the four read as the same robot.
- [ ] 5.2 Author `crate` with a transparent background. Verify the transparency assertion
      passes and the crate reads as a crate at ×3.
- [ ] 5.3 Author `crate_docked` as the crate plus a glowing edge, with no pad backdrop
      embedded. Verify by drawing it over the `pad` tile at ×3 that the result reads as one
      crate seated on a pad, with no seam, doubled pad edge, or clipped pad around it.

## 6. Produce and verify the atlas

- [ ] 6.1 Add `tools/build-atlas.js` writing `assets/dock_bot.png`, and verify running it
      twice produces byte-identical output.
- [ ] 6.2 Run the validator against the generated `assets/dock_bot.png` and verify every
      mechanical requirement passes.
- [ ] 6.3 Human review at final size: render all nine frames at ×3 alongside a mock board
      containing floor, wall, an empty pad, a crate on floor, a docked crate, and the bot,
      and confirm the two legibility scenarios in the spec hold. This is the check the
      validator cannot make; the milestone is not done without it.
- [ ] 6.4 Verify the shipped game surface is unchanged: `assets/dock_bot.png` is the only
      non-`tools/` file added, and nothing in `tools/` is referenced by any game file.
