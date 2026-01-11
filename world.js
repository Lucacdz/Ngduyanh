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

// --- Thêm vào cuối file world.js ---

// Item rơi từ block
export class ItemDrop {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.vy = 0;
        this.type = type;
        this.element = document.createElement('div');
        this.element.className = 'tile ' + type;
        this.element.style.width = '20px';
        this.element.style.height = '20px';
        this.element.style.position = 'absolute';
        this.update();
        document.getElementById('world').appendChild(this.element);
    }

    update() {
        this.vy += 0.3; // gravity
        this.y += this.vy;
        // Simple floor collision at y=320 for demo (replace with world collision)
        if (this.y > 320) {
            this.y = 320;
            this.vy = 0;
        }
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }
}

// Cây sinh ngẫu nhiên
export function spawnTree(baseX, baseY) {
    // thân gỗ 3-5 block
    const height = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < height; i++) {
        const el = document.createElement('div');
        el.className = 'tile wood';
        el.style.transform = `translate(${baseX * TILE_SIZE}px, ${(baseY - i) * TILE_SIZE}px)`;
        document.getElementById('world').appendChild(el);
    }
    // lá đơn giản
    for (let dx = -1; dx <=1; dx++) {
        for (let dy = -1; dy <=1; dy++) {
            const el = document.createElement('div');
            el.className = 'tile leaves';
            el.style.transform = `translate(${(baseX + dx) * TILE_SIZE}px, ${(baseY - height + dy) * TILE_SIZE}px)`;
            document.getElementById('world').appendChild(el);
        }
    }
}