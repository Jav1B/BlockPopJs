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
    EXPLOSION_CHANCE: {
        name: 'Explosion Chance',
        basePrice: 1000,
        priceIncrease: 500,
        effect: 10, // +10% chance per level
        maxLevel: 5,
        description: 'Increases chance of explosions'
    },
    EXPLOSION_RADIUS: {
        name: 'Explosion Radius',
        basePrice: 1500,
        priceIncrease: 750,
        effect: 30, // Explosion radius in pixels
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
    constructor(x, y, color, size, speed = 1, type = 'normal') {
        this.x = x;
        this.y = y;
        this.originalColor = color;
        this.size = size;
        this.type = type;
        
        // Random angle with more upward tendency for some particles
        this.angle = Math.random() * Math.PI * 2;
        if (type === 'upward') {
            this.angle = Math.PI + Math.random() * Math.PI - Math.PI/3;
        }
        
        // Varying speeds based on particle type
        this.speed = (Math.random() * 8 + 8) * speed;
        if (type === 'spark') {
            this.speed *= 1.5;
        }
        
        this.dx = Math.cos(this.angle) * this.speed;
        this.dy = Math.sin(this.angle) * this.speed;
        
        // Longer life and slower decay
        this.life = 1;
        this.decay = Math.random() * 0.01 + 0.005;
        
        // Different physics for different particle types
        this.gravity = type === 'heavy' ? 0.3 : 0.05;
        this.bounce = 0.6;
        
        // Rotation for more dynamic movement
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        
        // Flashing effect
        this.flash = Math.random() > 0.7;
        this.flashSpeed = Math.random() * 0.1 + 0.05;
        this.flashPhase = Math.random() * Math.PI * 2;
    }

    update() {
        // Update position
        this.x += this.dx;
        this.y += this.dy;
        
        // Apply physics based on type
        if (this.type !== 'spark') {
            this.dy += this.gravity;
            this.dx *= 0.98;
            this.dy *= 0.98;
        } else {
            this.dx *= 0.95; // Sparks slow down faster
            this.dy *= 0.95;
        }
        
        // Bounce off bottom of screen
        if (this.y > 600 - this.size) { // Assuming canvas height is 600
            this.y = 600 - this.size;
            this.dy = -this.dy * this.bounce;
            this.dx *= 0.8;
        }
        
        // Update rotation
        this.rotation += this.rotationSpeed;
        
        // Update flash phase
        this.flashPhase += this.flashSpeed;
        
        // Slower decay at the end of life
        if (this.life < 0.3) {
            this.decay *= 0.95;
        }
        
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        // Calculate flash effect
        let flashIntensity = this.flash ? Math.sin(this.flashPhase) * 0.3 + 0.7 : 1;
        
        // Set color based on type and flash
        if (this.type === 'spark') {
            this.color = `hsl(${Math.sin(this.flashPhase * 2) * 60 + 30}, 100%, ${flashIntensity * 100}%)`;
        } else {
            this.color = this.flash ? '#FFF' : this.originalColor;
        }
        
        ctx.save();
        ctx.globalAlpha = this.life * flashIntensity;
        
        // Enhanced glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
        // Draw main particle
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        if (this.type === 'spark') {
            // Draw star shape for sparks
            ctx.fillStyle = this.color;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5;
                const x = Math.cos(angle) * this.size;
                const y = Math.sin(angle) * this.size;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            // Draw glowing circle with additional inner glow
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
            gradient.addColorStop(0, '#FFF');
            gradient.addColorStop(0.4, this.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Additional glow layer
        ctx.globalAlpha *= 0.5;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
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
