// Menu DOM
export const menu = document.getElementById("menu");
export const startBtn = document.getElementById("startBtn");
export const settingsBtn = document.getElementById("settingsBtn");
export const settingsDiv = document.getElementById("settings");
export const backBtn = document.getElementById("backBtn");
export const musicToggle = document.getElementById("musicToggle");

// Nhạc nền (bỏ qua nếu chưa có folder music)
let bgMusic = new Audio("music/bg.mp3");
bgMusic.loop = true;

// Hàm play/pause nhạc
export function playMusic(){ bgMusic.play(); }
export function pauseMusic(){ bgMusic.pause(); }

// Khởi tạo menu
export function initMenu(onStart){
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
}