class Player {
    constructor(world) {
        this.world = world;
        this.x = 100;
        this.y = 50;
        this.width = 24;
        this.height = 48;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 5;
        this.jumpForce = -12;
        this.gravity = 0.5;
        this.maxFallSpeed = 15;
        this.isGrounded = false;
        this.health = 100;
        this.maxHealth = 100;
        this.isAlive = true;
        this.selectedSlot = 0;
        
        // Attack cooldown
        this.lastAttack = 0;
        this.attackCooldown = 500; // ms
    }
    
    update(deltaTime) {
        if (!this.isAlive) return;
        
        // Apply gravity
        this.velocityY += this.gravity;
        this.velocityY = Math.min(this.velocityY, this.maxFallSpeed);
        
        // Update position with velocity
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Collision detection with blocks
        this.handleCollisions();
        
        // Ensure player doesn't fall infinitely
        if (this.y > 1000) {
            this.takeDamage(100);
        }
        
        // Clamp health
        this.health = Math.max(0, Math.min(this.maxHealth, this.health));
        
        // Update health bar
        this.updateHealthBar();
    }
    
    handleCollisions() {
        this.isGrounded = false;
        
        // Check collision with blocks around player
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
            
            const playerRect = {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height
            };
            
            if (this.world.checkCollision(playerRect, blockRect)) {
                // Calculate collision depths
                const dx = (playerRect.x + playerRect.width / 2) - (blockRect.x + blockRect.width / 2);
                const dy = (playerRect.y + playerRect.height / 2) - (blockRect.y + blockRect.height / 2);
                
                const overlapX = (playerRect.width / 2 + blockRect.width / 2) - Math.abs(dx);
                const overlapY = (playerRect.height / 2 + blockRect.height / 2) - Math.abs(dy);
                
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
                        this.isGrounded = true;
                        this.velocityY = 0;
                    } else {
                        this.y -= overlapY;
                        this.velocityY = 0;
                    }
                }
            }
        }
    }
    
    move(left, right) {
        this.velocityX = 0;
        if (left) this.velocityX = -this.speed;
        if (right) this.velocityX = this.speed;
    }
    
    jump() {
        if (this.isGrounded && this.isAlive) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
        }
    }
    
    attack() {
        const now = Date.now();
        if (now - this.lastAttack < this.attackCooldown || !this.isAlive) {
            return false;
        }
        
        this.lastAttack = now;
        return true;
    }
    
    takeDamage(amount) {
        if (!this.isAlive) return;
        
        this.health -= amount;
        
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
        
        this.updateHealthBar();
    }
    
    die() {
        this.isAlive = false;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Show death menu
        const deathMenu = document.getElementById('deathMenu');
        if (deathMenu) {
            deathMenu.style.display = 'block';
        }
    }
    
    respawn() {
        this.x = 100;
        this.y = 50;
        this.health = this.maxHealth;
        this.isAlive = true;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Hide death menu
        const deathMenu = document.getElementById('deathMenu');
        if (deathMenu) {
            deathMenu.style.display = 'none';
        }
    }
    
    updateHealthBar() {
        const healthFill = document.getElementById('healthFill');
        if (healthFill) {
            const percent = (this.health / this.maxHealth) * 100;
            healthFill.style.width = `${percent}%`;
        }
    }
    
    setSelectedSlot(slot) {
        this.selectedSlot = slot;
        
        // Update hotbar UI
        const slots = document.querySelectorAll('.hotbar-slot');
        slots.forEach(s => s.classList.remove('active'));
        
        const selectedSlot = document.querySelector(`.hotbar-slot[data-slot="${slot}"]`);
        if (selectedSlot) {
            selectedSlot.classList.add('active');
        }
    }
}