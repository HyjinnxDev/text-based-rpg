import sharp from "sharp";

export const MAP_SIZE = 1024;
export const TILE_SIZE = 256;
export const MAX_MAP_ZOOM = 2;

export interface MapTile {
  z: number;
  x: number;
  y: number;
  data: Buffer;
}

export async function sliceMapIntoTiles(
  imageData: Buffer,
  maxZoom = MAX_MAP_ZOOM,
): Promise<{
  normalized: Buffer;
  tiles: MapTile[];
  width: number;
  height: number;
}> {
  const normalized = await sharp(imageData)
    .resize(MAP_SIZE, MAP_SIZE, { fit: "cover" })
    .webp({ quality: 85 })
    .toBuffer();

  const tiles: MapTile[] = [];

  for (let z = 0; z <= maxZoom; z++) {
    const n = 2 ** z;
    const regionW = MAP_SIZE / n;
    const regionH = MAP_SIZE / n;

    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        const tile = await sharp(normalized)
          .extract({
            left: Math.floor(x * regionW),
            top: Math.floor(y * regionH),
            width: Math.floor(regionW),
            height: Math.floor(regionH),
          })
          .resize(TILE_SIZE, TILE_SIZE)
          .webp({ quality: 85 })
          .toBuffer();

        tiles.push({ z, x, y, data: tile });
      }
    }
  }

  return { normalized, tiles, width: MAP_SIZE, height: MAP_SIZE };
}

export async function toWebp(imageData: Buffer): Promise<Buffer> {
  return sharp(imageData).webp({ quality: 85 }).toBuffer();
}
