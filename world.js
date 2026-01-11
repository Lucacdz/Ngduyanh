export const TILE_SIZE = 32;
export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 16;

export const TILE_TYPES = {
    AIR: 'air',
    GRASS: 'grass',
    DIRT: 'dirt',
    STONE: 'stone',
    SAND: 'sand',
    WOOD: 'wood',
    LEAVES: 'leaves'
};

// Simple random terrain generation
export function generateChunk(chunkX, chunkY) {
    const tiles = [];
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let x = 0; x < CHUNK_WIDTH; x++) {
            const globalX = chunkX * CHUNK_WIDTH + x;
            const globalY = chunkY * CHUNK_HEIGHT + y;

            let type = TILE_TYPES.AIR;
            const groundHeight = CHUNK_HEIGHT / 2 + Math.floor(Math.random() * 2);

            if (globalY > groundHeight) type = TILE_TYPES.DIRT;
            if (globalY === groundHeight) type = TILE_TYPES.GRASS;
            if (globalY > groundHeight + 2) type = TILE_TYPES.STONE;

            tiles.push({ x: globalX, y: globalY, type });
        }
    }
    return tiles;
}