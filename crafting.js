import { addItem } from "./inventory.js";

// Danh sách công thức
// key = item cần craft, value = {item cần: số lượng}
export const recipes = {
  "WoodenPickaxe": { "Wood": 3, "Stone": 2 },
  "StonePickaxe": { "Wood": 2, "Stone": 3 },
  "Torch": { "Wood": 1, "Stone": 1 },
  "Plank": { "Wood": 1 },
  "Stick": { "Plank": 2 }
};

// Craft item
export function craftItem(name, inventory){
  const recipe = recipes[name];
  if(!recipe) return false;

  // Kiểm tra đủ vật liệu
  for(const item in recipe){
    const count = recipe[item];
    const total = countInInventory(item, inventory);
    if(total < count) return false;
  }

  // Trừ vật liệu
  for(const item in recipe){
    let remaining = recipe[item];
    for(let i=0;i<inventory.slots.length;i++){
      if(inventory.slots[i] && inventory.slots[i].name===item){
        const take = Math.min(inventory.slots[i].count, remaining);
        inventory.slots[i].count -= take;
        remaining -= take;
        if(inventory.slots[i].count===0) inventory.slots[i]=null;
        if(remaining===0) break;
      }
    }
  }

  // Thêm item craft vào inventory
  addItem(name,1);
  return true;
}

// Đếm item trong inventory
function countInInventory(name, inventory){
  let count = 0;
  for(const slot of inventory.slots){
    if(slot && slot.name===name) count+=slot.count;
  }
  return count;
}