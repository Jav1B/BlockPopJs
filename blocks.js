const UPGRADE_TYPES = window.UPGRADE_TYPES = {
    PADDLE_WIDTH: {
        name: 'Wider Paddle',
        basePrice: 500,
        priceIncrease: 500,
        effect: 10, // Width increase per level
        maxLevel: 99
    },
    BALL_DAMAGE: {
        name: 'Ball Damage',
        basePrice: 100,
        priceIncrease: 40,
        effect: 2, // Damage increase per level
        maxLevel: 99
    },
    EXPLOSION_CHANCE: {
        name: 'Explosion Chance',
        basePrice: 100,
        priceIncrease: 50,
        effect: 10, // +10% chance per level
        maxLevel: 99,
        description: 'Increases chance of explosions'
    },
    EXPLOSION_RADIUS: {
        name: 'Explosion Radius',
        basePrice: 100,
        priceIncrease: 75,
        effect: 30, // Explosion radius in pixels
        maxLevel: 99
    },
    EXPLOSION_DAMAGE: {
        name: 'Explosion Damage',
        basePrice: 100,
        priceIncrease: 60,
        effect: 0.3, // Percentage of block's max HP
        maxLevel: 99
    },
    AUTO_PADDLE: {
        name: 'Auto Paddle',
        basePrice: 1000,
        priceIncrease: 750,
        effect: 2, // Speed increase per level
        maxLevel: 99,
        description: 'Automatically moves paddle towards ball'
    },
};

const BLOCK_TYPES = window.BLOCK_TYPES = {
    DIRT: {
        name: 'Dirt',
        color: '#8B4513',
        gradient: ['#654321', '#8B4513'],
        baseHp: 10,
        tier: 1
    },
    WOOD: {
        name: 'Wood',
        color: '#DEB887',
        gradient: ['#A0522D', '#DEB887'],
        baseHp: 25,
        tier: 2
    },
    STONE: {
        name: 'Stone',
        color: '#808080',
        gradient: ['#696969', '#A9A9A9'],
        baseHp: 50,
        tier: 3
    },
    COPPER: {
        name: 'Copper',
        color: '#B87333',
        gradient: ['#8B4513', '#CD853F'],
        baseHp: 100,
        tier: 4
    },
    IRON: {
        name: 'Iron',
        color: '#A19D94',
        gradient: ['#708090', '#C0C0C0'],
        baseHp: 200,
        tier: 5
    },
    GOLD: {
        name: 'Gold',
        color: '#FFD700',
        gradient: ['#DAA520', '#FFD700'],
        baseHp: 350,
        tier: 6
    },
    DIAMOND: {
        name: 'Diamond',
        color: '#B9F2FF',
        gradient: ['#87CEEB', '#E0FFFF'],
        baseHp: 500,
        tier: 7
    },
    OBSIDIAN: {
        name: 'Obsidian',
        color: '#4A0069',
        gradient: ['#2F0044', '#4A0069'],
        baseHp: 750,
        tier: 8
    }
};

class Particle {
    constructor(x, y, color, size, speed = 1, type = 'normal') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.type = type;
        this.creationTime = Date.now();
        
        // Random angle for movement
        const angle = Math.random() * Math.PI * 2;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        
        // Adjust vertical velocity for upward particles
        if (type === 'upward') {
            this.dy -= speed * 1.5;
        }
        
        // Shorter lifespan for better performance
        this.life = 40 + Math.random() * 20;
    }
    
    update() {
        // Age-based removal
        if (Date.now() - this.creationTime >= 3000) return false;
        
        this.x += this.dx;
        this.y += this.dy;
        
        // Simplified physics
        if (this.type !== 'upward') {
            this.dy += 0.1;
        }
        
        this.life--;
        return this.life > 0;
    }
    
    draw(ctx) {
        const alpha = Math.min(1, this.life / 20);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Block {
    constructor(type, x, y, width, height) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.hp = BLOCK_TYPES[type].baseHp;
        this.maxHp = this.hp;
    }

    draw(ctx) {
        const blockType = BLOCK_TYPES[this.type];
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, blockType.gradient[0]);
        gradient.addColorStop(1, blockType.gradient[1]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw HP bar
        const hpPercentage = this.hp / this.maxHp;
        const hpBarHeight = 4;
        ctx.fillStyle = `rgb(${255 * (1 - hpPercentage)}, ${255 * hpPercentage}, 0)`;
        ctx.fillRect(this.x, this.y - hpBarHeight - 2, this.width * hpPercentage, hpBarHeight);
    }

    hit(damage) {
        this.hp -= damage;
        return this.hp <= 0;
    }

    getReward() {
        return this.maxHp;
    }
}
