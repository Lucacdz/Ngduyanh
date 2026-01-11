class Mob {
    constructor(world, type, x, y) {
        this.world = world;
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.velocityX = 0;
        this.velocityY = 0;
        this.health = 20;
        this.maxHealth = 20;
        this.speed = 1;
        this.isAlive = true;
        this.id = Math.random().toString(36).substr(2, 9);
        
        // Mob types
        this.TYPES = {
            ZOMBIE: 'zombie',
            SKELETON: 'skeleton',
            SLIME: 'slime',
            SPIDER: 'spider',
            PIG: 'pig',
            COW: 'cow',
            CHICKEN: 'chicken'
        };
        
        // Mob colors
        this.TYPE_COLORS = {
            [this.TYPES.ZOMBIE]: '#006400',
            [this.TYPES.SKELETON]: '#F0F0F0',
            [this.TYPES.SLIME]: '#00FF00',
            [this.TYPES.SPIDER]: '#8B0000',
            [this.TYPES.PIG]: '#FFB6C1',
            [this.TYPES.COW]: '#8B4513',
            [this.TYPES.CHICKEN]: '#FFFF00'
        };
        
        // Day/night mobs
        this.DAY_MOBS = [this.TYPES.PIG, this.TYPES.COW, this.TYPES.CHICKEN];
        this.NIGHT_MOBS = [this.TYPES.ZOMBIE, this.TYPES.SKELETON, this.TYPES.SLIME, this.TYPES.SPIDER];
        
        // Set properties based on type
        this.setProperties();
    }
    
    setProperties() {
        switch(this.type) {
            case this.TYPES.SLIME:
                this.health = 10;
                this.speed = 0.5;
                this.width = 20;
                this.height = 20;
                break;
            case this.TYPES.SPIDER:
                this.health = 15;
                this.speed = 2;
                break;
            case this.TYPES.CHICKEN:
                this.health = 5;
                this.speed = 1.5;
                break;
        }
    }
    
    update(deltaTime, player) {
        if (!this.isAlive) return;
        
        // Apply gravity
        this.velocityY += 0.5;
        this.velocityY = Math.min(this.velocityY, 15);
        
        // Simple AI: move towards player if close
        const distanceToPlayer = Math.sqrt(
            Math.pow(this.x - player.x, 2) + Math.pow(this.y - player.y, 2)
        );
        
        if (distanceToPlayer < 200 && this.type !== this.TYPES.PIG && 
            this.type !== this.TYPES.COW && this.type !== this.TYPES.CHICKEN) {
            // Hostile mob: chase player
            if (this.x < player.x) {
                this.velocityX = this.speed;
            } else {
                this.velocityX = -this.speed;
            }
        } else {
            // Neutral mob: wander randomly
            if (Math.random() < 0.01) {
                this.velocityX = (Math.random() - 0.5) * this.speed;
            }
        }
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Handle collisions
        this.handleCollisions();
        
        // Prevent falling off world
        if (this.y > 500) {
            this.die();
        }
    }
    
    handleCollisions() {
        const blocks = this.world.getBlocksInRect(
            this.x, 
            this.y, 
            this.width, 
            this.height
        );
        
        for (const block of blocks) {
            const blockRect = {
                x: block.x * this.world.TILE_SIZE,
                y: block.y * this.world.TILE_SIZE,
                width: this.world.TILE_SIZE,
                height: this.world.TILE_SIZE
            };
            
            const mobRect = {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height
            };
            
            if (this.world.checkCollision(mobRect, blockRect)) {
                const dx = (mobRect.x + mobRect.width / 2) - (blockRect.x + blockRect.width / 2);
                const dy = (mobRect.y + mobRect.height / 2) - (blockRect.y + blockRect.height / 2);
                
                const overlapX = (mobRect.width / 2 + blockRect.width / 2) - Math.abs(dx);
                const overlapY = (mobRect.height / 2 + blockRect.height / 2) - Math.abs(dy);
                
                if (overlapX < overlapY) {
                    // Horizontal collision
                    if (dx > 0) {
                        this.x += overlapX;
                    } else {
                        this.x -= overlapX;
                    }
                    this.velocityX = 0;
                } else {
                    // Vertical collision
                    if (dy > 0) {
                        this.y += overlapY;
                        this.velocityY = 0;
                    } else {
                        this.y -= overlapY;
                        this.velocityY = 0;
                    }
                }
            }
        }
    }
    
    takeDamage(amount) {
        if (!this.isAlive) return;
        
        this.health -= amount;
        
        if (this.health <= 0) {
            this.die();
            return true; // Mob died
        }
        
        return false; // Mob still alive
    }
    
    die() {
        this.isAlive = false;
    }
    
    getColor() {
        return this.TYPE_COLORS[this.type] || '#FF0000';
    }
}

class MobManager {
    constructor(world) {
        this.world = world;
        this.mobs = new Map();
        this.maxMobs = 20;
        this.spawnTimer = 0;
        this.spawnInterval = 5000; // ms
    }
    
    update(deltaTime, player) {
        this.spawnTimer += deltaTime;
        
        // Spawn new mobs periodically
        if (this.spawnTimer >= this.spawnInterval && this.mobs.size < this.maxMobs) {
            this.spawnRandomMob(player);
            this.spawnTimer = 0;
        }
        
        // Update all mobs
        for (const [id, mob] of this.mobs) {
            mob.update(deltaTime, player);
            
            // Remove dead mobs
            if (!mob.isAlive) {
                this.mobs.delete(id);
            }
        }
    }
    
    spawnRandomMob(player) {
        const types = this.getSpawnableMobs();
        if (types.length === 0) return;
        
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Spawn near player but not too close
        const spawnDistance = 300;
        const angle = Math.random() * Math.PI * 2;
        
        let spawnX = player.x + Math.cos(angle) * spawnDistance;
        let spawnY = 50; // Start from sky
        
        // Find ground position
        while (this.world.getBlock(
            Math.floor(spawnX / this.world.TILE_SIZE),
            Math.floor(spawnY / this.world.TILE_SIZE)
        ) === this.world.BLOCK_TYPES.AIR && spawnY < 500) {
            spawnY += this.world.TILE_SIZE;
        }
        
        spawnY -= 100; // Spawn above ground
        
        const mob = new Mob(this.world, type, spawnX, spawnY);
        this.mobs.set(mob.id, mob);
    }
    
    getSpawnableMobs() {
        // Based on time of day (simplified - just random for now)
        const isNight = Math.random() > 0.5;
        const mob = new Mob(this.world, 'pig', 0, 0);
        
        return isNight ? mob.NIGHT_MOBS : mob.DAY_MOBS;
    }
    
    checkAttack(player, attackX, attackY, attackRange) {
        let hitMob = false;
        
        for (const [id, mob] of this.mobs) {
            const distance = Math.sqrt(
                Math.pow(mob.x - attackX, 2) + Math.pow(mob.y - attackY, 2)
            );
            
            if (distance < attackRange) {
                if (mob.takeDamage(10)) {
                    // Mob died
                    hitMob = true;
                }
            }
        }
        
        return hitMob;
    }
}