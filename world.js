class World {
    constructor() {
        this.TILE_SIZE = 32;
        this.CHUNK_SIZE = 16;
        this.loadedChunks = new Map();
        this.blocks = new Map();
        this.noiseSeed = Math.random() * 10000;
        
        // Block types
        this.BLOCK_TYPES = {
            AIR: 0,
            DIRT: 1,
            GRASS: 2,
            STONE: 3,
            SAND: 4,
            WOOD: 5,
            LEAVES: 6
        };
        
        // Block colors for rendering
        this.BLOCK_COLORS = {
            [this.BLOCK_TYPES.AIR]: null,
            [this.BLOCK_TYPES.DIRT]: '#8B4513',
            [this.BLOCK_TYPES.GRASS]: '#228B22',
            [this.BLOCK_TYPES.STONE]: '#808080',
            [this.BLOCK_TYPES.SAND]: '#F4A460',
            [this.BLOCK_TYPES.WOOD]: '#8B4513',
            [this.BLOCK_TYPES.LEAVES]: '#00AA00'
        };
    }
    
    // Simple noise function for terrain generation
    noise(x) {
        return Math.sin(x * 0.1) * 20 + Math.sin(x * 0.03) * 30;
    }
    
    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }
    
    generateChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        const chunkBlocks = new Map();
        
        const startX = chunkX * this.CHUNK_SIZE;
        const startY = chunkY * this.CHUNK_SIZE;
        
        // Generate terrain
        for (let x = 0; x < this.CHUNK_SIZE; x++) {
            const worldX = startX + x;
            
            // Terrain height
            const groundHeight = 10 + Math.floor(this.noise(worldX + this.noiseSeed));
            
            for (let y = 0; y < this.CHUNK_SIZE; y++) {
                const worldY = startY + y;
                
                if (worldY < groundHeight - 5) {
                    // Stone layer
                    chunkBlocks.set(this.getBlockKey(worldX, worldY), this.BLOCK_TYPES.STONE);
                } else if (worldY < groundHeight - 1) {
                    // Dirt layer
                    chunkBlocks.set(this.getBlockKey(worldX, worldY), this.BLOCK_TYPES.DIRT);
                } else if (worldY === groundHeight - 1) {
                    // Grass layer
                    chunkBlocks.set(this.getBlockKey(worldX, worldY), this.BLOCK_TYPES.GRASS);
                    
                    // Generate trees occasionally
                    if (Math.random() < 0.02 && worldX > 0) {
                        this.generateTree(worldX, worldY);
                    }
                } else if (worldY === groundHeight) {
                    // Sometimes sand near water level
                    if (Math.random() < 0.3) {
                        chunkBlocks.set(this.getBlockKey(worldX, worldY), this.BLOCK_TYPES.SAND);
                    }
                }
            }
        }
        
        this.loadedChunks.set(key, chunkBlocks);
        return chunkBlocks;
    }
    
    generateTree(x, y) {
        // Tree trunk
        const trunkHeight = 4 + Math.floor(Math.random() * 3);
        for (let i = 1; i <= trunkHeight; i++) {
            this.setBlock(x, y - i, this.BLOCK_TYPES.WOOD);
        }
        
        // Tree leaves
        const leavesY = y - trunkHeight - 1;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 0; dy++) {
                if (Math.abs(dx) + Math.abs(dy) <= 3) {
                    this.setBlock(x + dx, leavesY + dy, this.BLOCK_TYPES.LEAVES);
                }
            }
        }
    }
    
    getBlockKey(x, y) {
        return `${Math.floor(x)},${Math.floor(y)}`;
    }
    
    getBlock(x, y) {
        // Check if block is in loaded chunks
        const chunkX = Math.floor(x / this.CHUNK_SIZE);
        const chunkY = Math.floor(y / this.CHUNK_SIZE);
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        
        if (!this.loadedChunks.has(chunkKey)) {
            this.generateChunk(chunkX, chunkY);
        }
        
        const chunk = this.loadedChunks.get(chunkKey);
        const blockKey = this.getBlockKey(x, y);
        
        return chunk.has(blockKey) ? chunk.get(blockKey) : this.BLOCK_TYPES.AIR;
    }
    
    setBlock(x, y, type) {
        const chunkX = Math.floor(x / this.CHUNK_SIZE);
        const chunkY = Math.floor(y / this.CHUNK_SIZE);
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        
        if (!this.loadedChunks.has(chunkKey)) {
            this.generateChunk(chunkX, chunkY);
        }
        
        const chunk = this.loadedChunks.get(chunkKey);
        const blockKey = this.getBlockKey(x, y);
        
        if (type === this.BLOCK_TYPES.AIR) {
            chunk.delete(blockKey);
        } else {
            chunk.set(blockKey, type);
        }
        
        // Update global blocks map
        if (type === this.BLOCK_TYPES.AIR) {
            this.blocks.delete(blockKey);
        } else {
            this.blocks.set(blockKey, type);
        }
    }
    
    getBlocksInRect(x, y, width, height) {
        const blocks = [];
        const startX = Math.floor(x);
        const startY = Math.floor(y);
        const endX = Math.ceil(x + width);
        const endY = Math.ceil(y + height);
        
        for (let blockX = startX; blockX <= endX; blockX++) {
            for (let blockY = startY; blockY <= endY; blockY++) {
                const blockType = this.getBlock(blockX, blockY);
                if (blockType !== this.BLOCK_TYPES.AIR) {
                    blocks.push({
                        x: blockX,
                        y: blockY,
                        type: blockType
                    });
                }
            }
        }
        
        return blocks;
    }
    
    // Simple AABB collision detection
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
}