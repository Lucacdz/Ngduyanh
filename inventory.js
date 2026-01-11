const inventory=[];
for(let i=0;i<9;i++) inventory.push({id:null,count:0});
window.inventory=inventory;
function drawHotbar(){
  const hb=document.getElementById("hotbar");
  hb.innerHTML="";
  inventory.forEach(item=>{
    const div=document.createElement("div");
    if(item.id) div.textContent=item.count;
    hb.appendChild(div);
  });
}
setInterval(drawHotbar,100);