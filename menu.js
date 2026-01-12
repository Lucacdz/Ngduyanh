// Menu module for handling game menu and settings
export class Menu {
    constructor() {
        this.startMenu = document.getElementById('startMenu');
        this.settingsMenu = document.getElementById('settingsMenu');
        this.gameContainer = document.getElementById('gameContainer');
        this.startBtn = document.getElementById('startBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.backBtn = document.getElementById('backBtn');
        this.musicToggle = document.getElementById('musicToggle');
        this.bgMusic = document.getElementById('bgMusic');
        
        this.init();
    }
    
    init() {
        // Start button event
        this.startBtn.addEventListener('click', () => {
            this.hideStartMenu();
            this.showGame();
            
            // Try to play music if enabled
            if (this.musicToggle.checked) {
                this.bgMusic.play().catch(e => console.log("Autoplay prevented:", e));
            }
        });
        
        // Settings button event
        this.settingsBtn.addEventListener('click', () => {
            this.showSettings();
        });
        
        // Back button event
        this.backBtn.addEventListener('click', () => {
            this.hideSettings();
        });
        
        // Music toggle event
        this.musicToggle.addEventListener('change', () => {
            if (this.musicToggle.checked) {
                this.bgMusic.play().catch(e => console.log("Autoplay prevented:", e));
            } else {
                this.bgMusic.pause();
            }
        });
        
        // Initialize music state
        this.bgMusic.volume = 0.3;
    }
    
    hideStartMenu() {
        this.startMenu.classList.add('hidden');
    }
    
    showStartMenu() {
        this.startMenu.classList.remove('hidden');
        this.settingsMenu.classList.add('hidden');
        this.gameContainer.classList.add('hidden');
    }
    
    showSettings() {
        this.startMenu.classList.add('hidden');
        this.settingsMenu.classList.remove('hidden');
    }
    
    hideSettings() {
        this.settingsMenu.classList.add('hidden');
        this.startMenu.classList.remove('hidden');
    }
    
    showGame() {
        this.gameContainer.classList.remove('hidden');
    }
    
    hideGame() {
        this.gameContainer.classList.add('hidden');
    }
    
    isMusicEnabled() {
        return this.musicToggle.checked;
    }
    
    toggleMusic() {
        this.musicToggle.checked = !this.musicToggle.checked;
        this.musicToggle.dispatchEvent(new Event('change'));
    }
}

// Export a singleton instance
export const menu = new Menu();