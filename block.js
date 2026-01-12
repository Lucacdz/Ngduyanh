export const blocks = {
  0: {name:"air", solid:false},
  1: {name:"dirt", solid:true, hp:3, drop:"dirt"},
  2: {name:"grass", solid:true, hp:2, drop:"dirt"},
  3: {name:"wood", solid:true, hp:4, drop:"wood"},
  4: {name:"leaves", solid:false, hp:2, drop:"leaves"},
  5: {name:"stone", solid:true, hp:5, drop:"stone"},
  6: {name:"sand", solid:true, hp:2, drop:"sand"},
  7: {name:"water", solid:false, hp:1, drop:null}
};

export function getBlockHP(id){ return blocks[id]?.hp || 0; }
export function getBlockDrop(id){ return blocks[id]?.drop || null; }
export function isSolidBlock(id){ return blocks[id]?.solid || false; }