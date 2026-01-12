export function initMenu(onStart){
  // Menu đã load cùng DOM → không cần DOMContentLoaded
  const menu = document.getElementById("menu");
  const startBtn = document.getElementById("startBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsDiv = document.getElementById("settings");
  const backBtn = document.getElementById("backBtn");
  const musicToggle = document.getElementById("musicToggle");

  // Start game
  const startHandler = ()=>{
    menu.style.display="none";
    onStart();
  };
  startBtn.addEventListener("click", startHandler);
  startBtn.addEventListener("touchstart", e=>{ e.preventDefault(); startHandler(); });

  // Open settings
  const showSettings = ()=>{
    settingsDiv.style.display="block";
    startBtn.style.display="none";
    settingsBtn.style.display="none";
  };
  settingsBtn.addEventListener("click", showSettings);
  settingsBtn.addEventListener("touchstart", e=>{ e.preventDefault(); showSettings(); });

  // Back to menu
  const hideSettings = ()=>{
    settingsDiv.style.display="none";
    startBtn.style.display="block";
    settingsBtn.style.display="block";
  };
  backBtn.addEventListener("click", hideSettings);
  backBtn.addEventListener("touchstart", e=>{ e.preventDefault(); hideSettings(); });

  // Music toggle
  musicToggle.addEventListener("change", ()=>{
    if(musicToggle.checked) playMusic();
    else pauseMusic();
  });
}

// Background music
let bgMusic = new Audio("music/bg.mp3");
bgMusic.loop = true;
export function playMusic(){ bgMusic.play(); }
export function pauseMusic(){ bgMusic.pause(); }