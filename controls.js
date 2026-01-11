class Controls {
    constructor(player, world, mobManager) {
        this.player = player;
        this.world = world;
        this.mobManager = mobManager;
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.touch = { startX: 0, startY: 0, currentX: 0, currentY: 0, active: false };
        this.isMobile = 'ontouchstart' in window;
        
        this.init();
    }
    
    init() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Mouse events
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Touch events for mobile
        if (this.isMobile) {
            this.initTouchControls();
        }
        
        // Prevent context menu on right click
        window.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Death menu buttons
        this.initDeathMenu();
    }
    
    initTouchControls() {
        const joystick = document.getElementById('joystick');
        const joystickBase = document.getElementById('joystickBase');
        const jumpBtn = document.getElementById('jumpBtn');
        const attackBtn = document.getElementById('attackBtn');
        const placeBtn = document.getElementById('placeBtn');
        
        if (!joystick || !joystickBase) return;
        
        // Joystick touch
        joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touch.active = true;
            const rect = joystickBase.getBoundingClientRect();
            this.touch.startX = rect.left + rect.width / 2;
            this.touch.startY = rect.top + rect.height / 2;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!this.touch.active) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            this.touch.currentX = touch.clientX;
            this.touch.currentY = touch.clientY;
            
            // Calculate joystick position
            const dx = this.touch.currentX - this.touch.startX;
            const dy = this.touch.currentY - this.touch.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 40;
            
            let moveX = 0;
            let moveY = 0;
            
            if (distance > 0) {
                const angle = Math.atan2(dy, dx);
                const limitedDistance = Math.min(distance, maxDistance);
                
                moveX = Math.cos(angle) * limitedDistance;
                moveY = Math.sin(angle) * limitedDistance;
                
                // Update joystick visual
                joystick.style.transform = `translate(${moveX}px, ${moveY}px)`;
            }
            
            // Convert joystick movement to player movement
            const threshold = 10;
            this.keys['ArrowLeft'] = moveX < -threshold;
            this.keys['ArrowRight'] = moveX > threshold;
            this.keys[' '] = moveY < -threshold; // Jump if pulling up
        });
        
        document.addEventListener('touchend', (e) => {
            if (!this.touch.active) return;
            
            this.touch.active = false;
            this.keys['ArrowLeft'] = false;
            this.keys['ArrowRight'] = false;
            this.keys[' '] = false;
            
            // Reset joystick
            joystick.style.transform = 'translate(0, 0)';
        });
        
        // Jump button
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys[' '] = true;
            });
            
            jumpBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys[' '] = false;
            });
        }
        
        // Attack button
        if (attackBtn) {
            attackBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.attack();
            });
        }
        
        // Place button
        if (placeBtn) {
            placeBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.placeBlock();
            });
        }
        
        // Hotbar slot selection
        const hotbarSlots = document.querySelectorAll('.hotbar-slot');
        hotbarSlots.forEach(slot => {
            slot.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const slotNum = parseInt(slot.dataset.slot);
                this.player.setSelectedSlot(slotNum);
            });
        });
    }
    
    initDeathMenu() {
        const respawnBtn = document.getElementById('respawnBtn');
        const menuBtn = document.getElementById('menuBtn');
        
        if (respawnBtn) {
            respawnBtn.addEventListener('click', () => {
                this.player.respawn();
            });
        }
        
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                // TODO: Implement menu
                alert('Menu chưa được implement');
            });
        }
    }
    
    onKeyDown(e) {
        this.keys[e.key] = true;
        
        // Prevent default for game controls
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key)) {
            e.preventDefault();
        }
        
        // Hotbar selection
        if (e.key >= '1' && e.key <= '9') {
            const slot = parseInt(e.key) - 1;
            this.player.setSelectedSlot(slot);
        }
    }
    
    onKeyUp(e) {
        this.keys[e.key] = false;
    }
    
    onMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }
    
    onMouseDown(e) {
        this.mouse.down = true;
        
        if (e.button === 0) { // Left click
            this.attack();
        } else if (e.button === 2) { // Right click
            this.placeBlock();
        }
    }
    
    onMouseUp(e) {
        this.mouse.down = false;
    }
    
    attack() {
        if (!this.player.attack()) return;
        
        // Calculate attack position (in front of player)
        const attackX = this.player.x + (this.player.velocityX > 0 ? this.player.width : -20);
        const attackY = this.player.y + this.player.height / 2;
        const attackRange = 40;
        
        // Check if hit a mob
        const hitMob = this.mobManager.checkAttack(this.player, attackX, attackY, attackRange);
        
        if (!hitMob) {
            // Try to break block
            const blockX = Math.floor(attackX / this.world.TILE_SIZE);
            const blockY = Math.floor(attackY / this.world.TILE_SIZE);
            const blockType = this.world.getBlock(blockX, blockY);
            
            if (blockType !== this.world.BLOCK_TYPES.AIR) {
                // Drop item
                const blockNames = {
                    [this.world.BLOCK_TYPES.DIRT]: 'dirt',
                    [this.world.BLOCK_TYPES.GRASS]: 'grass',
                    [this.world.BLOCK_TYPES.STONE]: 'stone',
                    [this.world.BLOCK_TYPES.SAND]: 'sand',
                    [this.world.BLOCK_TYPES.WOOD]: 'wood',
                    [this.world.BLOCK_TYPES.LEAVES]: 'leaves'
                };
                
                if (blockNames[blockType]) {
                    // TODO: Add to inventory
                    // For now, just remove the block
                    this.world.setBlock(blockX, blockY, this.world.BLOCK_TYPES.AIR);
                }
            }
        }
    }
    
    placeBlock() {
        // TODO: Implement block placement from inventory
        // For now, just place dirt block
        const placeX = this.player.x + (this.player.velocityX > 0 ? this.player.width + 10 : -this.world.TILE_SIZE - 10);
        const placeY = this.player.y + this.player.height / 2;
        
        const blockX = Math.floor(placeX / this.world.TILE_SIZE);
        const blockY = Math.floor(placeY / this.world.TILE_SIZE);
        
        // Check if position is valid (not inside player)
        const playerBlockX = Math.floor(this.player.x / this.world.TILE_SIZE);
        const playerBlockY = Math.floor(this.player.y / this.world.TILE_SIZE);
        
        if (Math.abs(blockX - playerBlockX) > 1 || Math.abs(blockY - playerBlockY) > 2) {
            if (this.world.getBlock(blockX, blockY) === this.world.BLOCK_TYPES.AIR) {
                this.world.setBlock(blockX, blockY, this.world.BLOCK_TYPES.DIRT);
            }
        }
    }
    
    update() {
        // Update player movement based on keys
        const left = this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A'];
        const right = this.keys['ArrowRight'] || this.keys['d'] || this.keys['D'];
        
        this.player.move(left, right);
        
        // Jump
        if (this.keys[' '] || this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            this.player.jump();
        }
    }
}