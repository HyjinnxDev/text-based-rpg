import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { MAX_MAP_ZOOM, sliceMapIntoTiles } from "./tile-slicer";

describe("sliceMapIntoTiles", () => {
  it("produces deterministic tile counts per zoom", async () => {
    const source = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 3,
        background: { r: 40, g: 120, b: 80 },
      },
    })
      .png()
      .toBuffer();

    const { tiles, width, height } = await sliceMapIntoTiles(source, MAX_MAP_ZOOM);

    expect(width).toBe(1024);
    expect(height).toBe(1024);
    // z0:1 + z1:4 + z2:16 = 21 tiles
    expect(tiles).toHaveLength(21);
    expect(tiles[0]).toMatchObject({ z: 0, x: 0, y: 0 });
  });
});
