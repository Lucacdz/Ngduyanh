export const inventory=[];
for(let i=0;i<9;i++) inventory.push({id:null,count:0});

export function drawHotbar(){
  const hb=document.getElementById("hotbar");
  hb.innerHTML="";
  inventory.forEach(item=>{
    const div=document.createElement("div");
    if(item.id) div.textContent=item.id+" x"+item.count;
    hb.appendChild(div);
  });
}

export function drawInventoryUI(){
  const invUI=document.getElementById("inventoryUI");
  invUI.innerHTML="";
  inventory.forEach((item)=>{
    const div=document.createElement("div");
    div.style.width="50px";div.style.height="50px";
    div.style.border="1px solid black";div.style.display="inline-block";div.style.margin="2px";
    if(item.id) div.textContent=item.id+" x"+item.count;
    invUI.appendChild(div);
  });
}

setInterval(drawHotbar,100);
setInterval(drawInventoryUI,200);