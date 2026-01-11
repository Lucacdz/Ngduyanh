import { TILE_SIZE } from './world.js';

export class Player {
    constructor() {
        this.x = 100;
        this.y = 100;
        this.width = 32;
        this.height = 32;
        this.vx = 0;
        this.vy = 0;
        this.speed = 2;
        this.jumpStrength = 6;
        this.onGround = false;
        this.health = 100;
        this.element = document.createElement('div');
        this.element.className = 'tile player';
        this.element.style.background = 'blue';
        document.getElementById('world').appendChild(this.element);
    }

    update(keys, tiles) {
        // Horizontal movement
        this.vx = 0;
        if (keys.left) this.vx = -this.speed;
        if (keys.right) this.vx = this.speed;

        // Gravity
        this.vy += 0.3;

        // Jump
        if (keys.jump && this.onGround) {
            this.vy = -this.jumpStrength;
            this.onGround = false;
        }

        // Collision
        this.x += this.vx;
        this.collide(tiles, 'x');
        this.y += this.vy;
        this.collide(tiles, 'y');

        // Update element
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }

    collide(tiles, axis) {
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
                if (axis === 'x') {
                    if (this.vx > 0) this.x = tx - this.width;
                    else if (this.vx < 0) this.x = tx + TILE_SIZE;
                    this.vx = 0;
                }
                if (axis === 'y') {
                    if (this.vy > 0) {
                        this.y = ty - this.height;
                        this.onGround = true;
                    } else if (this.vy < 0) {
                        this.y = ty + TILE_SIZE;
                    }
                    this.vy = 0;
                }
            }
        }
    }
}