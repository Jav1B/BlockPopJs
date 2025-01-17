class Game {
    constructor() {
        this.isGameOver = false;
        this.showShop = false;
        this.baseSpeed = 2;
        this.speedIncrease = 0.1;
        this.currentSpeed = this.baseSpeed;
        this.particles = [];
        
        // Load upgrades from localStorage
        this.upgrades = {};
        Object.keys(UPGRADE_TYPES).forEach(type => {
            this.upgrades[type] = parseInt(localStorage.getItem(`upgrade_${type}`)) || 0;
        });
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.money = parseInt(localStorage.getItem('money')) || 0;
        this.currentTier = 1;
        
        this.setupCanvas();
        this.initializeGameObjects();
        this.setupEventListeners();
        this.updateMoney(0);
        
        requestAnimationFrame(() => this.gameLoop());
    }

    getUpgradePrice(type) {
        const upgrade = UPGRADE_TYPES[type];
        const level = this.upgrades[type];
        if (level >= upgrade.maxLevel) return Infinity;
        return upgrade.basePrice + (level * upgrade.priceIncrease);
    }

    buyUpgrade(type) {
        const price = this.getUpgradePrice(type);
        if (this.money >= price && this.upgrades[type] < UPGRADE_TYPES[type].maxLevel) {
            this.updateMoney(-price);
            this.upgrades[type]++;
            localStorage.setItem(`upgrade_${type}`, this.upgrades[type]);
            
            // Apply upgrade effects
            if (type === 'PADDLE_WIDTH') {
                this.paddle.width = 100 + (this.upgrades[type] * UPGRADE_TYPES[type].effect);
            } else if (type === 'BALL_DAMAGE') {
                this.ball.damage = 5 + (this.upgrades[type] * UPGRADE_TYPES[type].effect);
            }
        }
    }

    createExplosion(x, y, color, damage) {
        const radius = this.upgrades.EXPLOSION_RADIUS * UPGRADE_TYPES.EXPLOSION_RADIUS.effect;
        if (radius > 0) {
            // Create particles
            for (let i = 0; i < 20; i++) {
                this.particles.push(new Particle(x, y, color, 4));
            }
            
            // Damage nearby blocks
            this.blocks.forEach(block => {
                const dx = block.x + block.width/2 - x;
                const dy = block.y + block.height/2 - y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < radius) {
                    const explosionDamage = damage * this.upgrades.EXPLOSION_DAMAGE * UPGRADE_TYPES.EXPLOSION_DAMAGE.effect;
                    block.hit(explosionDamage);
                }
            });
            
            // Remove destroyed blocks
            this.blocks = this.blocks.filter(block => block.hp > 0);
        }
    }

    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.blockWidth = 60;
        this.blockHeight = 30;
    }

    initializeGameObjects() {
        // Ball properties
        this.currentSpeed = this.baseSpeed;
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            radius: 8,
            dx: this.currentSpeed,
            dy: -this.currentSpeed,
            damage: 5
        };

        // Paddle properties
        this.paddle = {
            width: 100,
            height: 15,
            y: this.canvas.height - 30
        };
        this.paddle.x = (this.canvas.width - this.paddle.width) / 2;

        this.createBlocks();
    }

    createBlocks() {
        this.blocks = [];
        const rows = 5;
        const cols = Math.floor(this.canvas.width / (this.blockWidth + 10));
        const startX = (this.canvas.width - (cols * (this.blockWidth + 10))) / 2;

        // Create weighted distribution of blocks based on tier
        const availableTypes = [];
        for (let tier = 1; tier <= this.currentTier; tier++) {
            const tierTypes = Object.keys(BLOCK_TYPES).filter(
                type => BLOCK_TYPES[type].tier === tier
            );
            // Add more lower tier blocks than higher tier ones
            const weight = Math.max(1, this.currentTier - tier + 1);
            for (let w = 0; w < weight; w++) {
                availableTypes.push(...tierTypes);
            }
        }

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
                this.blocks.push(new Block(
                    type,
                    startX + j * (this.blockWidth + 10),
                    50 + i * (this.blockHeight + 10),
                    this.blockWidth,
                    this.blockHeight
                ));
            }
        }
    }

    resetGame() {
        this.isGameOver = false;
        this.currentSpeed = this.baseSpeed;
        this.initializeGameObjects();
        this.createBlocks();
    }

    setupEventListeners() {
        // Click or touch to restart game or interact with shop
        const handleClick = (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            if (this.isGameOver) {
                // Check if shop button was clicked
                if (clickY > this.canvas.height/2 + 70 && clickY < this.canvas.height/2 + 110 &&
                    clickX > this.canvas.width/2 - 50 && clickX < this.canvas.width/2 + 50) {
                    this.showShop = true;
                } else if (!this.showShop) {
                    this.resetGame();
                }
            }
            
            if (this.showShop) {
                // Handle shop button clicks
                const buttonHeight = 50;
                const buttonSpacing = 60;
                const startY = 150;
                
                Object.keys(UPGRADE_TYPES).forEach((type, index) => {
                    const buttonY = startY + (buttonSpacing * index);
                    if (clickY > buttonY && clickY < buttonY + buttonHeight &&
                        clickX > 50 && clickX < this.canvas.width - 50) {
                        this.buyUpgrade(type);
                    }
                });
                
                // Back button
                if (clickY > this.canvas.height - 70 && clickX > 50 && clickX < 150) {
                    this.showShop = false;
                }
            }
        };
        this.canvas.addEventListener('click', handleClick);
        this.canvas.addEventListener('touchstart', handleClick);
        // Mouse movement
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width,
                mouseX - this.paddle.width / 2));
        });

        // Touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            
            if (touchX < rect.width / 2) {
                this.moveLeft = true;
                this.moveRight = false;
            } else {
                this.moveLeft = false;
                this.moveRight = true;
            }
        });

        this.canvas.addEventListener('touchend', () => {
            this.moveLeft = false;
            this.moveRight = false;
        });
    }

    updateMoney(amount) {
        this.money += amount;
        localStorage.setItem('money', this.money.toString());
        document.getElementById('money-amount').textContent = this.money;
        
        // Update tier based on money thresholds
        const tierThresholds = [
            0,      // Tier 1 (Dirt)
            1000,   // Tier 2 (Wood)
            3000,   // Tier 3 (Stone)
            7000,   // Tier 4 (Copper)
            15000,  // Tier 5 (Iron)
            30000,  // Tier 6 (Gold)
            50000,  // Tier 7 (Diamond)
            100000  // Tier 8 (Obsidian)
        ];
        
        let newTier = 1;
        for (let i = tierThresholds.length - 1; i >= 0; i--) {
            if (this.money >= tierThresholds[i]) {
                newTier = i + 1;
                break;
            }
        }
        
        if (newTier !== this.currentTier && newTier <= Object.keys(BLOCK_TYPES).length) {
            this.currentTier = newTier;
            const tierName = Object.values(BLOCK_TYPES).find(t => t.tier === this.currentTier)?.name;
            document.getElementById('tier-name').textContent = tierName;
            
            // Show tier up message
            const tierBlock = Object.values(BLOCK_TYPES).find(t => t.tier === this.currentTier);
            if (tierBlock) {
                const gradient = ctx.createLinearGradient(0, this.canvas.height/2 - 30, 0, this.canvas.height/2 + 30);
                gradient.addColorStop(0, tierBlock.gradient[0]);
                gradient.addColorStop(1, tierBlock.gradient[1]);
                
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, this.canvas.height/2 - 40, this.canvas.width, 80);
                
                this.ctx.fillStyle = gradient;
                this.ctx.font = 'bold 36px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`New Tier Unlocked: ${tierBlock.name}!`, this.canvas.width/2, this.canvas.height/2 + 10);
            }
            
            if (this.blocks.length === 0) {
                this.createBlocks();
            }
        }
    }

    update() {
        // Update particles
        this.particles = this.particles.filter(particle => particle.update());
        // Update paddle position for touch controls
        const paddleSpeed = 10;
        if (this.moveLeft) {
            this.paddle.x = Math.max(0, this.paddle.x - paddleSpeed);
        }
        if (this.moveRight) {
            this.paddle.x = Math.min(this.canvas.width - this.paddle.width, this.paddle.x + paddleSpeed);
        }

        // Ball movement
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Ball collision with walls
        if (this.ball.x + this.ball.radius > this.canvas.width || this.ball.x - this.ball.radius < 0) {
            this.ball.dx = -this.ball.dx;
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
        }
        
        // Ball collision with paddle
        if (this.ball.y + this.ball.radius > this.paddle.y &&
            this.ball.x > this.paddle.x &&
            this.ball.x < this.paddle.x + this.paddle.width) {
            this.ball.dy = -Math.abs(this.ball.dy);
            
            // Add angle based on where the ball hits the paddle
            const hitPosition = (this.ball.x - this.paddle.x) / this.paddle.width;
            this.ball.dx = 8 * (hitPosition - 0.5);
        }

        // Ball collision with blocks
        let collidedBlocks = [];
        
        // Find all blocks that the ball might be colliding with
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            const circleDistance = {
                x: Math.abs(this.ball.x - (block.x + block.width/2)),
                y: Math.abs(this.ball.y - (block.y + block.height/2))
            };

            if (circleDistance.x <= (block.width/2 + this.ball.radius) &&
                circleDistance.y <= (block.height/2 + this.ball.radius)) {
                collidedBlocks.push({ block, index: i });
            }
        }

        if (collidedBlocks.length > 0) {
            // Sort blocks by distance to ball center
            collidedBlocks.sort((a, b) => {
                const distA = Math.hypot(
                    this.ball.x - (a.block.x + a.block.width/2),
                    this.ball.y - (a.block.y + a.block.height/2)
                );
                const distB = Math.hypot(
                    this.ball.x - (b.block.x + b.block.width/2),
                    this.ball.y - (b.block.y + b.block.height/2)
                );
                return distA - distB;
            });

            // Get closest block
            const { block, index } = collidedBlocks[0];
            
            // Calculate exact collision point
            const ballCenterX = this.ball.x;
            const ballCenterY = this.ball.y;
            const blockCenterX = block.x + block.width/2;
            const blockCenterY = block.y + block.height/2;
            
            // Determine collision side using relative position and velocity
            const dx = ballCenterX - blockCenterX;
            const dy = ballCenterY - blockCenterY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            
            // Calculate the overlap on each axis
            const overlapX = (block.width/2 + this.ball.radius) - absDx;
            const overlapY = (block.height/2 + this.ball.radius) - absDy;

            // Determine which side was hit based on overlap and velocity
            if (overlapX < overlapY) {
                // Horizontal collision
                this.ball.dx = -this.ball.dx;
                this.ball.x += (dx > 0 ? overlapX : -overlapX);
            } else {
                // Vertical collision
                this.ball.dy = -this.ball.dy;
                this.ball.y += (dy > 0 ? overlapY : -overlapY);
            }

            if (block.hit(this.ball.damage)) {
                this.updateMoney(block.getReward());
                
                // Create explosion effect
                this.createExplosion(block.x + block.width/2, block.y + block.height/2, 
                                    BLOCK_TYPES[block.type].color, block.maxHp);
                
                // Increase ball speed
                this.currentSpeed += this.speedIncrease;
                const speedRatio = this.currentSpeed / Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
                this.ball.dx *= speedRatio;
                this.ball.dy *= speedRatio;
                
                // Add new block of higher tier at the same position
                const currentTier = BLOCK_TYPES[block.type].tier;
                const nextTier = Math.min(currentTier + 1, this.currentTier);
                
                // Get all block types of the next tier
                const availableTypes = Object.keys(BLOCK_TYPES).filter(
                    type => BLOCK_TYPES[type].tier === nextTier
                );
                
                // If no blocks of next tier (shouldn't happen), fallback to current tier
                const type = availableTypes.length > 0 ? 
                    availableTypes[Math.floor(Math.random() * availableTypes.length)] :
                    block.type;
                
                const newBlock = new Block(
                    type,
                    block.x,
                    block.y,
                    this.blockWidth,
                    this.blockHeight
                );
                this.blocks[index] = newBlock;
            }
        }

        // Game over if ball goes below paddle
        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.isGameOver = true;
        }

        // Create new blocks if all are destroyed
        if (this.blocks.length === 0) {
            this.createBlocks();
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.showShop) {
            // Draw shop screen
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Shop', this.canvas.width/2, 80);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Money: $${this.money}`, this.canvas.width/2, 120);
            
            // Draw upgrade buttons
            const buttonHeight = 50;
            const buttonSpacing = 60;
            const startY = 150;
            
            Object.entries(UPGRADE_TYPES).forEach(([type, upgrade], index) => {
                const y = startY + (buttonSpacing * index);
                const price = this.getUpgradePrice(type);
                const level = this.upgrades[type];
                
                this.ctx.fillStyle = this.money >= price ? '#4CAF50' : '#666';
                this.ctx.fillRect(50, y, this.canvas.width - 100, buttonHeight);
                
                this.ctx.fillStyle = '#fff';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`${upgrade.name} (Level ${level}/${upgrade.maxLevel})`, 60, y + 35);
                
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`$${price}`, this.canvas.width - 60, y + 35);
            });
            
            // Back button
            this.ctx.fillStyle = '#f44336';
            this.ctx.fillRect(50, this.canvas.height - 70, 100, 40);
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Back', 100, this.canvas.height - 45);
            
            return;
        }

        if (this.isGameOver) {
            // Draw game over screen
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Click or tap to restart', this.canvas.width / 2, this.canvas.height / 2 + 50);
            
            // Shop button
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(this.canvas.width/2 - 50, this.canvas.height/2 + 70, 100, 40);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Shop', this.canvas.width/2, this.canvas.height/2 + 95);
            return;
        }
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));

        // Draw blocks
        this.blocks.forEach(block => block.draw(this.ctx));

        // Draw paddle
        this.ctx.fillStyle = '#FFF';
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);

        // Draw ball
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FFF';
        this.ctx.fill();
        this.ctx.closePath();
    }

    gameLoop() {
        if (!this.isGameOver) {
            this.update();
        }
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
