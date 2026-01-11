const inventory=Array(9).fill(null);
let selectedSlot=0;

function addItem(id){
 for(let i=0;i<9;i++){
  if(!inventory[i]){
   inventory[i]=id;
   updateHotbar();
   return;
  }
 }
}

function updateHotbar(){
 const bar=document.getElementById("hotbar");
 bar.innerHTML="";
 inventory.forEach((i,idx)=>{
  const d=document.createElement("div");
  d.className="slot";
  d.textContent=i??"";
  d.style.border=idx===selectedSlot?"2px solid yellow":"2px solid #555";
  bar.appendChild(d);
 });
}
updateHotbar();