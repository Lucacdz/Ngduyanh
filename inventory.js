// Inventory (balo)
export const inventory = {
  slots: Array(20).fill(null) // 20 slot
};

// Hotbar (hiển thị dưới màn hình)
export const hotbar = Array(10).fill(null);

// Toggle hiển thị inventory
let inventoryOpen = false;
export function toggleInventory(){
  inventoryOpen = !inventoryOpen;
  const hotbarDiv = document.getElementById("hotbar");
  hotbarDiv.style.display = inventoryOpen ? "flex" : "flex"; // hotbar luôn hiển thị
}

// Thêm item vào inventory
export function addItem(name,count){
  // Check hotbar trước
  for(let i=0;i<hotbar.length;i++){
    if(hotbar[i] && hotbar[i].name===name){
      hotbar[i].count += count;
      updateHotbar();
      return;
    }
  }

  // Check inventory
  for(let i=0;i<inventory.slots.length;i++){
    if(inventory.slots[i] && inventory.slots[i].name===name){
      inventory.slots[i].count += count;
      updateHotbar();
      return;
    }
  }

  // Thêm mới
  for(let i=0;i<inventory.slots.length;i++){
    if(inventory.slots[i]===null){
      inventory.slots[i]={name,count};
      updateHotbar();
      return;
    }
  }
}

// Cập nhật hotbar
export function updateHotbar(){
  const hotbarDiv = document.getElementById("hotbar");
  hotbarDiv.innerHTML = "";
  for(let i=0;i<hotbar.length;i++){
    const slot = document.createElement("div");
    slot.classList.add("hotbar-slot");
    if(hotbar[i]){
      slot.textContent = hotbar[i].name + " x"+hotbar[i].count;
    }
    hotbarDiv.appendChild(slot);
  }
}