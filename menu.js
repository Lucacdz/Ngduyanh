export function initMenu(onStart){
  document.addEventListener("DOMContentLoaded", ()=>{
    const menu = document.getElementById("menu");
    const startBtn = document.getElementById("startBtn");
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsDiv = document.getElementById("settings");
    const backBtn = document.getElementById("backBtn");
    const musicToggle = document.getElementById("musicToggle");

    // Bắt đầu game
    const startHandler = ()=>{
      menu.style.display="none";
      onStart();
    };
    startBtn.addEventListener("click", startHandler);
    startBtn.addEventListener("touchstart", e=>{ e.preventDefault(); startHandler(); });

    // Mở settings
    const showSettings = ()=>{
      settingsDiv.style.display="block";
      startBtn.style.display="none";
      settingsBtn.style.display="none";
    };
    settingsBtn.addEventListener("click", showSettings);
    settingsBtn.addEventListener("touchstart", e=>{ e.preventDefault(); showSettings(); });

    // Quay lại menu chính
    const hideSettings = ()=>{
      settingsDiv.style.display="none";
      startBtn.style.display="block";
      settingsBtn.style.display="block";
    };
    backBtn.addEventListener("click", hideSettings);
    backBtn.addEventListener("touchstart", e=>{ e.preventDefault(); hideSettings(); });

    // Nhạc toggle
    musicToggle.addEventListener("change", ()=>{
      if(musicToggle.checked) playMusic();
      else pauseMusic();
    });
  });
}

// Nhạc nền
let bgMusic = new Audio("music/bg.mp3");
bgMusic.loop = true;
export function playMusic(){ bgMusic.play(); }
export function pauseMusic(){ bgMusic.pause(); }