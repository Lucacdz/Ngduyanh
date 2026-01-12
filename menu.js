export const menu = document.getElementById("menu");
export const startBtn = document.getElementById("startBtn");

export function initMenu(onStart){
  // bật/tắt menu
  startBtn.addEventListener("click", ()=>{
    menu.style.display="none";
    onStart(); // gọi khi nhấn bắt đầu
  });

  // touch trên mobile
  startBtn.addEventListener("touchstart", e=>{
    e.preventDefault();
    menu.style.display="none";
    onStart();
  });
}