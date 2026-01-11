import { generateChunk } from './world.js';
import { Player } from './player.js';
import { setupControls, keys } from './controls.js';

const worldEl = document.getElementById('world');
const loadedChunks = {};

function loadChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (loadedChunks[key]) return;
    const tiles = generateChunk(cx, cy);
    tiles.forEach(tile => {
        if (tile.type === 'air') return;
        const el = document.createElement('div');
        el.className = 'tile ' + tile.type;
        el.style.transform = `translate(${tile.x * 32}px, ${tile.y * 32}px)`;
        worldEl.appendChild(el);
        tile.element = el;
    });
    loadedChunks[key] = tiles;
    return tiles;
}

setupControls();
const player = new Player();

// Initial chunks
loadChunk(0,0);
loadChunk(1,0);
loadChunk(-1,0);
loadChunk(0,1);

function gameLoop() {
    // Determine tiles around player
    const px = Math.floor(player.x / 32);
    const py = Math.floor(player.y / 32);

    for (let cx = -1; cx <=1; cx++) {
        for (let cy = -1; cy <=1; cy++) {
            loadChunk(cx + Math.floor(px / 16), cy + Math.floor(py /16));
        }
    }

    // Flatten tiles for collision
    const tiles = Object.values(loadedChunks).flat();

    player.update(keys, tiles);

    // Camera follow
    const container = document.getElementById('game-container');
    const camX = player.x - container.clientWidth / 2 + player.width/2;
    const camY = player.y - container.clientHeight / 2 + player.height/2;
    worldEl.style.transform = `translate(${-camX}px, ${-camY}px)`;

    requestAnimationFrame(gameLoop);
}

gameLoop();