const UPGRADE_TYPES = {
    PADDLE_WIDTH: {
        name: 'Wider Paddle',
        basePrice: 1000,
        priceIncrease: 500,
        effect: 10, // Width increase per level
        maxLevel: 5
    },
    BALL_DAMAGE: {
        name: 'Ball Damage',
        basePrice: 800,
        priceIncrease: 400,
        effect: 2, // Damage increase per level
        maxLevel: 5
    },
    EXPLOSION_RADIUS: {
        name: 'Explosion Radius',
        basePrice: 1500,
        priceIncrease: 750,
        effect: 20, // Explosion radius in pixels
        maxLevel: 3
    },
    EXPLOSION_DAMAGE: {
        name: 'Explosion Damage',
        basePrice: 1200,
        priceIncrease: 600,
        effect: 0.3, // Percentage of block's max HP
        maxLevel: 3
    }
};

const BLOCK_TYPES = {
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
    constructor(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.dx = (Math.random() - 0.5) * 8;
        this.dy = (Math.random() - 0.5) * 8;
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.02;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fillRect(this.x, this.y, this.size, this.size);
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
