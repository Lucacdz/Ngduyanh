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

// --- Thêm vào cuối world.js ---

export const drops = []; // Mảng lưu ItemDrop hiện tại

export class ItemDrop {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.vy = 0;
        this.type = type;
        this.width = 20;
        this.height = 20;
        this.element = document.createElement('div');
        this.element.className = 'tile ' + type;
        this.element.style.width = this.width + 'px';
        this.element.style.height = this.height + 'px';
        this.element.style.position = 'absolute';
        document.getElementById('world').appendChild(this.element);
        drops.push(this);
    }

    update(tiles) {
        this.vy += 0.3;
        this.y += this.vy;

        // Collision với tile
        for (const tile of tiles) {
            if (tile.type === 'air') continue;
            const tx = tile.x * TILE_SIZE;
            const ty = tile.y * TILE_SIZE;
            if (
                this.x < tx + TILE_SIZE &&
                this.x + this.width > tx &&
                this.y < ty + TILE_SIZE &&
                this.y + this.height > ty
            ) {
                this.y = ty - this.height;
                this.vy = 0;
            }
        }

        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }
}

// Sinh cây thật sự (không hardcode)
export function maybeSpawnTree(chunkTiles) {
    // Mỗi chunk chọn vài vị trí grass để sinh cây
    const grassTiles = chunkTiles.filter(t => t.type === TILE_TYPES.GRASS);
    for (const tile of grassTiles) {
        if (Math.random() < 0.2) { // 20% chance
            const height = 3 + Math.floor(Math.random() * 3);
            // Thân gỗ
            for (let i = 0; i < height; i++) {
                const newTile = { x: tile.x, y: tile.y - i, type: TILE_TYPES.WOOD };
                const el = document.createElement('div');
                el.className = 'tile wood';
                el.style.transform = `translate(${newTile.x * TILE_SIZE}px, ${newTile.y * TILE_SIZE}px)`;
                document.getElementById('world').appendChild(el);
                newTile.element = el;
                chunkTiles.push(newTile);
            }
            // Lá
            for (let dx = -1; dx <=1; dx++) {
                for (let dy = -1; dy <=1; dy++) {
                    const lx = tile.x + dx;
                    const ly = tile.y - height + dy;
                    const newTile = { x: lx, y: ly, type: TILE_TYPES.LEAVES };
                    const el = document.createElement('div');
                    el.className = 'tile leaves';
                    el.style.transform = `translate(${lx * TILE_SIZE}px, ${ly * TILE_SIZE}px)`;
                    document.getElementById('world').appendChild(el);
                    newTile.element = el;
                    chunkTiles.push(newTile);
                }
            }
        }
    }
}