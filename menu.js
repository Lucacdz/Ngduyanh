export const menu = document.getElementById("menu");
export const startBtn = document.getElementById("startBtn");
export const settingsBtn = document.getElementById("settingsBtn");
export const settingsDiv = document.getElementById("settings");
export const backBtn = document.getElementById("backBtn");

export function initMenu(onStart){
  const startHandler = ()=>{
    menu.style.display = "none";
    onStart();
  };
  startBtn.addEventListener("click", startHandler);
  startBtn.addEventListener("touchstart", e=>{ e.preventDefault(); startHandler(); });

  const showSettings = ()=>{
    settingsDiv.style.display="block";
    startBtn.style.display="none";
    settingsBtn.style.display="none";
  };
  settingsBtn.addEventListener("click", showSettings);
  settingsBtn.addEventListener("touchstart", e=>{ e.preventDefault(); showSettings(); });

  const hideSettings = ()=>{
    settingsDiv.style.display="none";
    startBtn.style.display="block";
    settingsBtn.style.display="block";
  };
  backBtn.addEventListener("click", hideSettings);
  backBtn.addEventListener("touchstart", e=>{ e.preventDefault(); hideSettings(); });
}