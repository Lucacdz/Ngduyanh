class Crafting {
    constructor() {
        this.recipes = this.initializeRecipes();
        this.isOpen = false;
    }
    
    initializeRecipes() {
        return {
            'planks': {
                ingredients: [{ type: 'wood', quantity: 1 }],
                result: { type: 'planks', quantity: 4 },
                shaped: false
            },
            'stick': {
                ingredients: [{ type: 'planks', quantity: 2 }],
                result: { type: 'stick', quantity: 4 },
                shaped: false
            },
            'wooden_sword': {
                ingredients: [
                    { type: 'planks', quantity: 1 },
                    { type: 'planks', quantity: 1 },
                    { type: 'stick', quantity: 1 }
                ],
                result: { type: 'wooden_sword', quantity: 1 },
                shaped: true,
                pattern: [
                    ['planks', null],
                    ['planks', null],
                    ['stick', null]
                ]
            }
        };
    }
    
    canCraft(recipeName, inventory) {
        const recipe = this.recipes[recipeName];
        if (!recipe) return false;
        
        // Check if player has required ingredients
        const tempInventory = {};
        
        for (const ingredient of recipe.ingredients) {
            if (!this.hasIngredient(ingredient, inventory, tempInventory)) {
                return false;
            }
        }
        
        return true;
    }
    
    hasIngredient(ingredient, inventory, tempInventory) {
        let needed = ingredient.quantity;
        
        // Check in temp inventory first (for shaped crafting)
        if (tempInventory[ingredient.type]) {
            needed -= tempInventory[ingredient.type];
            if (needed <= 0) return true;
        }
        
        // Check actual inventory
        for (let i = 0; i < inventory.slots.length; i++) {
            const item = inventory.getItem(i);
            if (item && item.type === ingredient.type) {
                const available = item.quantity - (tempInventory[ingredient.type] || 0);
                if (available >= needed) {
                    tempInventory[ingredient.type] = (tempInventory[ingredient.type] || 0) + needed;
                    return true;
                } else {
                    needed -= available;
                    tempInventory[ingredient.type] = (tempInventory[ingredient.type] || 0) + available;
                }
            }
        }
        
        return false;
    }
    
    craft(recipeName, inventory) {
        if (!this.canCraft(recipeName, inventory)) {
            return false;
        }
        
        const recipe = this.recipes[recipeName];
        
        // Remove ingredients
        for (const ingredient of recipe.ingredients) {
            this.removeIngredients(ingredient, inventory);
        }
        
        // Add result
        inventory.addItem(recipe.result.type, recipe.result.quantity);
        
        return true;
    }
    
    removeIngredients(ingredient, inventory) {
        let needed = ingredient.quantity;
        
        for (let i = 0; i < inventory.slots.length && needed > 0; i++) {
            const item = inventory.getItem(i);
            if (item && item.type === ingredient.type) {
                const toRemove = Math.min(item.quantity, needed);
                inventory.removeItem(i, toRemove);
                needed -= toRemove;
            }
        }
    }
    
    toggle() {
        this.isOpen = !this.isOpen;
        // TODO: Implement crafting table UI
    }
}