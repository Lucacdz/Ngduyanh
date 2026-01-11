export function initMenu(startCallback){
  const menu=document.getElementById("startMenu");
  document.getElementById("startGame").addEventListener("click",()=>{
    menu.style.display="none";
    startCallback();
  });
}