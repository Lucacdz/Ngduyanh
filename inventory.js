export const inventory = Array(20).fill().map(()=>({id:null,count:0}));

export function addItem(id,count){
  let slot = inventory.find(i=>i.id===id && i.count<64);
  if(slot) slot.count += count;
  else{
    let empty = inventory.find(i=>!i.id);
    if(empty) { empty.id=id; empty.count=count; }
  }
  renderInventory();
}

export function renderInventory(){
  const hotbar = document.getElementById("hotbar");
  hotbar.innerHTML="";
  inventory.forEach(i=>{
    const div = document.createElement("div");
    div.className="slot";
    div.innerText=i.id? `${i.id}(${i.count})` : "";
    hotbar.appendChild(div);
  });
}

export function toggleInventory(){
  const hotbar = document.getElementById("hotbar");
  hotbar.style.display = hotbar.style.display==="block"?"none":"block";
}