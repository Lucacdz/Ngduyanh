import { generateChunk, maybeSpawnTree, drops, TILE_TYPES } from './world.js';
import { Player } from './player.js';

const worldEl = document.getElementById('world');
const loadedChunks = {};
const keys = { left:false, right:false, jump:false };
let digActive = false;
let placeActive = false;

function setupControls() {
    window.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') keys.jump = true;
    });
    window.addEventListener('keyup', e => {
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') keys.jump = false;
    });

    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const jumpBtn = document.getElementById('jump-btn');

    leftBtn.addEventListener('touchstart', e=>{keys.left=true;e.preventDefault();});
    leftBtn.addEventListener('touchend', e=>{keys.left=false;e.preventDefault();});
    rightBtn.addEventListener('touchstart', e=>{keys.right=true;e.preventDefault();});
    rightBtn.addEventListener('touchend', e=>{keys.right=false;e.preventDefault();});
    jumpBtn.addEventListener('touchstart', e=>{keys.jump=true;e.preventDefault();});
    jumpBtn.addEventListener('touchend', e=>{keys.jump=false;e.preventDefault();});

    // Nút đào/đặt block
    const digBtn = document.getElementById('dig-btn');
    const placeBtn = document.getElementById('place-btn');
    digBtn.addEventListener('touchstart', e=>{digActive=true;e.preventDefault();});
    digBtn.addEventListener('touchend', e=>{digActive=false;e.preventDefault();});
    placeBtn.addEventListener('touchstart', e=>{placeActive=true;e.preventDefault();});
    placeBtn.addEventListener('touchend', e=>{placeActive=false;e.preventDefault();});
}

function loadChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (loadedChunks[key]) return;
    const tiles = generateChunk(cx, cy);
    maybeSpawnTree(tiles);
    tiles.forEach(tile => {
        if(tile.type==='air') return;
        const el = document.createElement('div');
        el.className = 'tile ' + tile.type;
        el.style.transform = `translate(${tile.x*32}px, ${tile.y*32}px)`;
        worldEl.appendChild(el);
        tile.element = el;
    });
    loadedChunks[key] = tiles;
    return tiles;
}

setupControls();
const player = new Player();

// initial chunks
loadChunk(0,0);
loadChunk(1,0);
loadChunk(-1,0);
loadChunk(0,1);

function gameLoop() {
    const px = Math.floor(player.x / 32);
    const py = Math.floor(player.y / 32);

    for (let cx=-1; cx<=1; cx++){
        for (let cy=-1; cy<=1; cy++){
            loadChunk(cx + Math.floor(px/16), cy + Math.floor(py/16));
        }
    }

    const tiles = Object.values(loadedChunks).flat();

    player.update(keys, tiles);
    if(digActive) player.digBlock(tiles);
    if(placeActive) player.placeBlock(tiles, TILE_TYPES.DIRT); // lấy block từ inventory bạn có thể thay bằng loại khác

    for(const drop of drops) drop.update(tiles);

    const container = document.getElementById('game-container');
    const camX = player.x - container.clientWidth/2 + player.width/2;
    const camY = player.y - container.clientHeight/2 + player.height/2;
    worldEl.style.transform = `translate(${-camX}px, ${-camY}px)`;

    requestAnimationFrame(gameLoop);
}

gameLoop();