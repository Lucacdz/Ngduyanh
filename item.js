export const items = {
  "dirt": {name:"Dirt", stack:64},
  "wood": {name:"Wood", stack:64},
  "leaves": {name:"Leaves", stack:64},
  "stone": {name:"Stone", stack:64},
  "plank": {name:"Plank", stack:64},
  "stick": {name:"Stick", stack:64},
  "sword": {name:"Sword", stack:1}
};

export function createItem(id,count=1){ return {id,count}; }