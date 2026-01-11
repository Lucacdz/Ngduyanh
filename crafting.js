export const recipes=[
  {input:[{id:"wood",count:1}],output:{id:"plank",count:4}},
  {input:[{id:"plank",count:2}],output:{id:"stick",count:4}},
  {input:[{id:"plank",count:2},{id:"stick",count:1}],output:{id:"sword",count:1}}
];

export function craft(inputItems){
  for(const r of recipes){
    let ok=true;
    for(const req of r.input){
      const found=inputItems.find(i=>i.id===req.id && i.count>=req.count);
      if(!found) ok=false;
    }
    if(ok) return r.output;
  }
  return null;
}