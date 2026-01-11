export const keys = {
    left: false,
    right: false,
    jump: false
};

export function setupControls() {
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

    // Mobile buttons
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const jumpBtn = document.getElementById('jump-btn');

    leftBtn.addEventListener('touchstart', e => { keys.left = true; e.preventDefault(); });
    leftBtn.addEventListener('touchend', e => { keys.left = false; e.preventDefault(); });

    rightBtn.addEventListener('touchstart', e => { keys.right = true; e.preventDefault(); });
    rightBtn.addEventListener('touchend', e => { keys.right = false; e.preventDefault(); });

    jumpBtn.addEventListener('touchstart', e => { keys.jump = true; e.preventDefault(); });
    jumpBtn.addEventListener('touchend', e => { keys.jump = false; e.preventDefault(); });
}