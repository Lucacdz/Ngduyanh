export function initMenu(startCallback){
  const menu = document.getElementById("startMenu");
  const btn = document.getElementById("startGame");

  btn.addEventListener("click", () => {
    menu.style.display = "none";
    startCallback();
  });
}