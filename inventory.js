const inventory=new Array(9).fill(1);

const hotbar=document.getElementById("hotbar");
for(let i=0;i<9;i++){
  let s=document.createElement("div");
  s.className="slot";
  hotbar.appendChild(s);
}

window.inventory=inventory;