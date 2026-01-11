class Item {
    constructor(type, quantity = 1) {
        this.type = type;
        this.quantity = quantity;
        this.maxStack = 64;
        
        // Item types
        this.TYPES = {
            DIRT: 'dirt',
            GRASS: 'grass',
            STONE: 'stone',
            SAND: 'sand',
            WOOD: 'wood',
            LEAVES: 'leaves'
        };
        
        // Item colors
        this.TYPE_COLORS = {
            [this.TYPES.DIRT]: '#8B4513',
            [this.TYPES.GRASS]: '#228B22',
            [this.TYPES.STONE]: '#808080',
            [this.TYPES.SAND]: '#F4A460',
            [this.TYPES.WOOD]: '#8B4513',
            [this.TYPES.LEAVES]: '#00AA00'
        };
    }
    
    add(quantity) {
        this.quantity += quantity;
        if (this.quantity > this.maxStack) {
            const overflow = this.quantity - this.maxStack;
            this.quantity = this.maxStack;
            return overflow;
        }
        return 0;
    }
    
    remove(quantity) {
        this.quantity -= quantity;
        if (this.quantity <= 0) {
            const remaining = Math.abs(this.quantity);
            this.quantity = 0;
            return { isEmpty: true, remaining };
        }
        return { isEmpty: false, remaining: 0 };
    }
}

class Inventory {
    constructor() {
        this.slots = Array(36).fill(null); // 36 slots total
        this.hotbarSlots = 9;
        this.isOpen = false;
    }
    
    addItem(type, quantity = 1) {
        // First try to stack with existing items
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i] && this.slots[i].type === type && 
                this.slots[i].quantity < this.slots[i].maxStack) {
                
                const overflow = this.slots[i].add(quantity);
                if (overflow === 0) {
                    this.updateUI();
                    return true;
                }
                quantity = overflow;
            }
        }
        
        // Find empty slot
        for (let i = 0; i < this.slots.length; i++) {
            if (!this.slots[i]) {
                this.slots[i] = new Item(type, quantity);
                this.updateUI();
                return true;
            }
        }
        
        return false; // Inventory full
    }
    
    removeItem(slotIndex, quantity = 1) {
        if (!this.slots[slotIndex]) return false;
        
        const result = this.slots[slotIndex].remove(quantity);
        if (result.isEmpty) {
            this.slots[slotIndex] = null;
        }
        
        this.updateUI();
        return true;
    }
    
    getItem(slotIndex) {
        return this.slots[slotIndex];
    }
    
    getSelectedItem() {
        // For now, just check hotbar slot 0
        return this.slots[0];
    }
    
    updateUI() {
        // Update hotbar slots
        for (let i = 0; i < this.hotbarSlots; i++) {
            const slotElement = document.querySelector(`.hotbar-slot[data-slot="${i}"]`);
            if (slotElement) {
                slotElement.innerHTML = '';
                
                if (this.slots[i]) {
                    const item = this.slots[i];
                    
                    // Create item visual
                    const itemDiv = document.createElement('div');
                    itemDiv.style.width = '100%';
                    itemDiv.style.height = '100%';
                    itemDiv.style.backgroundColor = item.TYPE_COLORS[item.type] || '#FFFFFF';
                    itemDiv.style.borderRadius = '3px';
                    itemDiv.style.position = 'relative';
                    
                    // Quantity label
                    const quantitySpan = document.createElement('span');
                    quantitySpan.textContent = item.quantity;
                    quantitySpan.style.position = 'absolute';
                    quantitySpan.style.bottom = '2px';
                    quantitySpan.style.right = '2px';
                    quantitySpan.style.fontSize = '10px';
                    quantitySpan.style.color = 'white';
                    quantitySpan.style.textShadow = '1px 1px 1px black';
                    
                    itemDiv.appendChild(quantitySpan);
                    slotElement.appendChild(itemDiv);
                }
            }
        }
    }
    
    toggle() {
        this.isOpen = !this.isOpen;
        // TODO: Implement full inventory UI
    }
}