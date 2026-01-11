class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Initialize game systems
        this.world = new World();
        this.player = new Player(this.world);
        this.mobManager = new MobManager(this.world);
        this.inventory = new Inventory();
        this.crafting = new Crafting();
        this.controls = new Controls(this.player, this.world, this.mobManager);
        
        // Initial inventory items
        this.inventory.addItem('dirt', 10);
        this.inventory.addItem('wood', 5);
        
        // Start game loop
        this.init();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    init() {
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 100);
        });
    }
    
    handleResize() {
        // Use window dimensions directly, don't resize canvas to prevent pixelation
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Force a re-render
        this.render();
    }
    
    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update FPS counter
        this.updateFPS(deltaTime);
        
        // Update game state
        this.update(deltaTime);
        
        // Render
        this.render();
        
        // Continue game loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    updateFPS(deltaTime) {
        this.frameCount++;
        this.lastFpsUpdate += deltaTime;
        
        if (this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / this.lastFpsUpdate);
            this.frameCount = 0;
            this.lastFpsUpdate = 0;
            
            // Update debug info
            this.updateDebugInfo();
        }
    }
    
    updateDebugInfo() {
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.innerHTML = `
                FPS: ${this.fps}<br>
                Pos: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})<br>
                Health: ${Math.round(this.player.health)}<br>
                Mobs: ${this.mobManager.mobs.size}
            `;
        }
    }
    
    update(deltaTime) {
        // Update controls
        this.controls.update();
        
        // Update player
        this.player.update(deltaTime);
        
        // Update mobs
        this.mobManager.update(deltaTime, this.player);
        
        // Smooth camera follow
        this.updateCamera();
    }
    
    updateCamera() {
        // Smooth camera follow player
        const cameraSpeed = 0.1;
        this.cameraX = this.cameraX || this.player.x - this.canvas.width / 2;
        this.cameraY = this.cameraY || this.player.y - this.canvas.height / 2;
        
        const targetX = this.player.x - this.canvas.width / 2;
        const targetY = this.player.y - this.canvas.height / 2;
        
        this.cameraX += (targetX - this.cameraX) * cameraSpeed;
        this.cameraY += (targetY - this.cameraY) * cameraSpeed;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB'; // Sky blue
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transformation
        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);
        
        // Render world
        this.renderWorld();
        
        // Render mobs
        this.renderMobs();
        
        // Render player
        this.renderPlayer();
        
        this.ctx.restore();
    }
    
    renderWorld() {
        // Determine visible chunks based on camera
        const startChunkX = Math.floor(this.cameraX / (this.world.TILE_SIZE * this.world.CHUNK_SIZE)) - 1;
        const endChunkX = Math.ceil((this.cameraX + this.canvas.width) / (this.world.TILE_SIZE * this.world.CHUNK_SIZE)) + 1;
        const startChunkY = Math.floor(this.cameraY / (this.world.TILE_SIZE * this.world.CHUNK_SIZE)) - 1;
        const endChunkY = Math.ceil((this.cameraY + this.canvas.height) / (this.world.TILE_SIZE * this.world.CHUNK_SIZE)) + 1;
        
        // Render blocks from visible chunks
        for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
            for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
                const chunkKey = this.world.getChunkKey(chunkX, chunkY);
                
                if (!this.world.loadedChunks.has(chunkKey)) {
                    this.world.generateChunk(chunkX, chunkY);
                }
                
                const chunk = this.world.loadedChunks.get(chunkKey);
                const startX = chunkX * this.world.CHUNK_SIZE * this.world.TILE_SIZE;
                const startY = chunkY * this.world.CHUNK_SIZE * this.world.TILE_SIZE;
                
                // Render each block in chunk
                for (const [blockKey, blockType] of chunk) {
                    const [blockX, blockY] = blockKey.split(',').map(Number);
                    
                    // Skip if not in viewport
                    const renderX = blockX * this.world.TILE_SIZE;
                    const renderY = blockY * this.world.TILE_SIZE;
                    
                    if (renderX < this.cameraX - this.world.TILE_SIZE || 
                        renderX > this.cameraX + this.canvas.width + this.world.TILE_SIZE ||
                        renderY < this.cameraY - this.world.TILE_SIZE || 
                        renderY > this.cameraY + this.canvas.height + this.world.TILE_SIZE) {
                        continue;
                    }
                    
                    // Draw block
                    const color = this.world.BLOCK_COLORS[blockType];
                    if (color) {
                        this.ctx.fillStyle = color;
                        this.ctx.fillRect(
                            renderX,
                            renderY,
                            this.world.TILE_SIZE,
                            this.world.TILE_SIZE
                        );
                        
                        // Add border for better visibility
                        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(
                            renderX,
                            renderY,
                            this.world.TILE_SIZE,
                            this.world.TILE_SIZE
                        );
                    }
                }
            }
        }
    }
    
    renderMobs() {
        for (const [id, mob] of this.mobManager.mobs) {
            if (mob.isAlive) {
                // Draw mob body
                this.ctx.fillStyle = mob.getColor();
                this.ctx.fillRect(mob.x, mob.y, mob.width, mob.height);
                
                // Draw health bar
                const healthPercent = mob.health / mob.maxHealth;
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fillRect(mob.x, mob.y - 10, mob.width, 5);
                this.ctx.fillStyle = '#00FF00';
                this.ctx.fillRect(mob.x, mob.y - 10, mob.width * healthPercent, 5);
            }
        }
    }
    
    renderPlayer() {
        if (!this.player.isAlive) return;
        
        // Draw player
        this.ctx.fillStyle = '#0000FF';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw player direction indicator
        this.ctx.fillStyle = '#FF0000';
        const indicatorX = this.player.velocityX > 0 ? 
            this.player.x + this.player.width : 
            this.player.x - 10;
        this.ctx.fillRect(
            indicatorX,
            this.player.y + this.player.height / 2 - 5,
            10, 10
        );
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    new Game();
});