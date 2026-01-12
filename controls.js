// Controls module for handling both keyboard and touch inputs
export class Controls {
    constructor() {
        // Movement keys
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            jump: false,
            attack: false,
            inventory: false,
            space: false
        };
        
        // Mobile control elements
        this.moveLeft = document.getElementById('moveLeft');
        this.moveRight = document.getElementById('moveRight');
        this.moveUp = document.getElementById('moveUp');
        this.moveDown = document.getElementById('moveDown');
        this.jumpBtn = document.getElementById('jumpBtn');
        this.attackBtn = document.getElementById('attackBtn');
        this.inventoryBtn = document.getElementById('inventoryBtn');
        
        // Initialize controls
        this.initKeyboard();
        this.initTouch();
    }
    
    initKeyboard() {
        // Keyboard event listeners
        window.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    this.keys.left = true;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.right = true;
                    break;
                case 'w':
                case 'arrowup':
                    this.keys.up = true;
                    break;
                case 's':
                case 'arrowdown':
                    this.keys.down = true;
                    break;
                case ' ':
                case 'spacebar':
                    this.keys.jump = true;
                    this.keys.space = true;
                    break;
                case 'e':
                    this.keys.inventory = true;
                    break;
                case 'f':
                    this.keys.attack = true;
                    break;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    this.keys.left = false;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.right = false;
                    break;
                case 'w':
                case 'arrowup':
                    this.keys.up = false;
                    break;
                case 's':
                case 'arrowdown':
                    this.keys.down = false;
                    break;
                case ' ':
                case 'spacebar':
                    this.keys.jump = false;
                    this.keys.space = false;
                    break;
                case 'e':
                    this.keys.inventory = false;
                    break;
                case 'f':
                    this.keys.attack = false;
                    break;
            }
        });
        
        // Prevent spacebar from scrolling page
        window.addEventListener('keydown', (e) => {
            if (e.key === ' ' && e.target === document.body) {
                e.preventDefault();
            }
        });
    }
    
    initTouch() {
        // Mobile touch event listeners
        const addTouchEvents = (element, key) => {
            const startEvent = (e) => {
                this.keys[key] = true;
                e.preventDefault();
            };
            
            const endEvent = (e) => {
                this.keys[key] = false;
                e.preventDefault();
            };
            
            // Touch events
            element.addEventListener('touchstart', startEvent);
            element.addEventListener('touchend', endEvent);
            element.addEventListener('touchcancel', endEvent);
            
            // Mouse events for testing on desktop
            element.addEventListener('mousedown', startEvent);
            element.addEventListener('mouseup', endEvent);
            element.addEventListener('mouseleave', endEvent);
        };
        
        // Map mobile controls to keys
        addTouchEvents(this.moveLeft, 'left');
        addTouchEvents(this.moveRight, 'right');
        addTouchEvents(this.moveUp, 'up');
        addTouchEvents(this.moveDown, 'down');
        addTouchEvents(this.jumpBtn, 'jump');
        addTouchEvents(this.attackBtn, 'attack');
        addTouchEvents(this.inventoryBtn, 'inventory');
    }
    
    // Get horizontal movement direction (-1 for left, 1 for right, 0 for none)
    getHorizontalMovement() {
        if (this.keys.left && !this.keys.right) return -1;
        if (this.keys.right && !this.keys.left) return 1;
        return 0;
    }
    
    // Get vertical movement direction (-1 for up, 1 for down, 0 for none)
    getVerticalMovement() {
        if (this.keys.up && !this.keys.down) return -1;
        if (this.keys.down && !this.keys.up) return 1;
        return 0;
    }
    
    // Check if jump is pressed
    isJumping() {
        return this.keys.jump;
    }
    
    // Check if attacking
    isAttacking() {
        return this.keys.attack;
    }
    
    // Check if inventory is toggled
    isInventoryToggled() {
        return this.keys.inventory;
    }
    
    // Reset all controls
    reset() {
        for (let key in this.keys) {
            this.keys[key] = false;
        }
    }
}

// Export a singleton instance
export const controls = new Controls();