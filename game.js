class Game {
    constructor() {
        this.gameState = 'start'; // start, playing, gameover
        this.showShop = false;
        this.baseSpeed = 2;
        this.speedIncrease = 0.1;
        this.currentSpeed = this.baseSpeed;
        this.particles = [];
        this.decorativeBlocks = [];
        this.keyState = {
            left: false,
            right: false
        };
        this.secretCode = '';
        this.showClowns = false;
        this.clownTimer = 0;
        
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
        
        // Start screen animation
        this.spawnDecorationTimer = 0;
        this.lastSpawnTime = Date.now();
        
        // Show start screen
        document.getElementById('start-screen').classList.add('active');
        
        // Setup shop buttons and functionality
        const shopButton = document.getElementById('shop-button');
        const shopBackButton = document.getElementById('shop-back');
        const shopPlayButton = document.getElementById('shop-play');
        
        shopButton.addEventListener('click', () => {
            this.showShop = true;
            document.getElementById('game-over-screen').classList.remove('active');
            document.getElementById('shop-screen').classList.add('active');
            this.updateShopDisplay();
        });
        
        shopBackButton.addEventListener('click', () => {
            this.showShop = false;
            document.getElementById('shop-screen').classList.remove('active');
            document.getElementById('game-over-screen').classList.add('active');
        });
        
        shopPlayButton.addEventListener('click', () => {
            this.showShop = false;
            document.getElementById('shop-screen').classList.remove('active');
            this.startGame();
        });
        
        // Initial shop setup
        this.setupShop();
        
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
                // Calculate new ball damage with base damage + upgrade bonus
                const baseDamage = 5;
                const upgradeDamage = this.upgrades[type] * UPGRADE_TYPES[type].effect;
                this.ball.damage = baseDamage + upgradeDamage;
            }
        }
    }

    createExplosion(x, y, color, damage) {
        // Calculate explosion chance
        const baseChance = 20; // 20% base chance
        const chanceIncrease = this.upgrades.EXPLOSION_CHANCE * UPGRADE_TYPES.EXPLOSION_CHANCE.effect;
        const explosionChance = baseChance + chanceIncrease;
        
        // Check if explosion should occur
        if (Math.random() * 100 > explosionChance) return;
        
        const radius = this.upgrades.EXPLOSION_RADIUS * UPGRADE_TYPES.EXPLOSION_RADIUS.effect;
        if (radius > 0) {
            // Limit total particles for performance
            const maxParticles = 200;
            if (this.particles.length > maxParticles) {
                this.particles.splice(0, this.particles.length - maxParticles + 50);
            }
            
            // Reduced particle count for better performance
            const particleCount = Math.min(30 + Math.floor(radius / 2), 50);
            const creationTime = Date.now();
            
            // Main explosion particles
            for (let i = 0; i < particleCount; i++) {
                const size = Math.random() * 4 + 2; // Smaller particles
                const speed = Math.random() * 0.8 + 0.6;
                
                // Only normal and upward particles for performance
                const type = Math.random() < 0.3 ? 'upward' : 'normal';
                const particle = new Particle(x, y, color, size, speed, type);
                particle.creationTime = creationTime;
                this.particles.push(particle);
                
                // Fewer sparks
                if (Math.random() < 0.2) {
                    const sparkSize = Math.random() * 2 + 1;
                    const sparkParticle = new Particle(x, y, '#FFF', sparkSize, speed * 1.5, 'normal');
                    sparkParticle.creationTime = creationTime;
                    this.particles.push(sparkParticle);
                }
            }
            
            // Reduced ring particles
            const ringCount = 12; // Half the original count
            for (let i = 0; i < ringCount; i++) {
                const angle = (i / ringCount) * Math.PI * 2;
                const ringX = x + Math.cos(angle) * (radius * 0.3);
                const ringY = y + Math.sin(angle) * (radius * 0.3);
                
                const ringParticle = new Particle(ringX, ringY, '#FFF', 3, 1.2, 'normal');
                ringParticle.creationTime = creationTime;
                this.particles.push(ringParticle);
            }
            
            // Damage nearby blocks
            this.blocks.forEach(block => {
                const dx = block.x + block.width/2 - x;
                const dy = block.y + block.height/2 - y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < radius) {
                    const explosionDamageLevel = this.upgrades['EXPLOSION_DAMAGE'] || 0;
                    const explosionDamage = damage * (1 + explosionDamageLevel * UPGRADE_TYPES.EXPLOSION_DAMAGE.effect);
                    block.hit(explosionDamage);
                    
                    // Create more debris particles from damaged blocks
                    const debrisCount = Math.floor(Math.random() * 8) + 5;
                    for (let i = 0; i < debrisCount; i++) {
                        const debrisColor = i % 2 === 0 ? BLOCK_TYPES[block.type].color : '#FFF';
                        this.particles.push(new Particle(
                            block.x + block.width/2,
                            block.y + block.height/2,
                            debrisColor,
                            Math.random() * 4 + 2,
                            0.7,
                            'heavy'
                        ));
                    }
                }
            });
            
            // Remove destroyed blocks
            this.blocks = this.blocks.filter(block => block.hp > 0);
        }
    }

    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.blockHeight = 30;
        
        // Fixed number of columns and rows
        this.cols = 8;
        this.rows = 5;
        this.blockPadding = 4; // Padding between blocks
        
        // Calculate actual block width including padding
        const totalPaddingWidth = this.blockPadding * (this.cols - 1); // Total padding space
        const availableWidth = this.canvas.width - totalPaddingWidth;
        this.blockWidth = Math.floor(availableWidth / this.cols);
        
        // Calculate offset to center blocks
        this.blockOffsetX = Math.floor((this.canvas.width - (this.cols * this.blockWidth + totalPaddingWidth)) / 2);
    }

    initializeGameObjects() {
        // Ball properties
        this.currentSpeed = this.baseSpeed;
        // Initialize ball with base damage + upgrade damage
        const baseDamage = 5;
        const upgradeDamage = this.upgrades.BALL_DAMAGE * UPGRADE_TYPES.BALL_DAMAGE.effect;
        
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            radius: 8,
            dx: 0,
            dy: 0,
            damage: baseDamage + upgradeDamage,
            attached: true, // Start with ball attached to paddle
            reset: () => {
                this.ball.x = this.paddle.x + this.paddle.width/2;
                this.ball.y = this.paddle.y - this.ball.radius;
                this.ball.dx = 0;
                this.ball.dy = 0;
                this.ball.attached = true;
            }
        };
        
        // Set minimum ball speed (base speed)
        this.minBallSpeed = this.baseSpeed;

        // Paddle properties
        this.paddle = {
            width: 100,
            height: 15,
            y: this.canvas.height - 30,
            reset: () => {
                this.paddle.x = (this.canvas.width - this.paddle.width) / 2;
                this.paddle.y = this.canvas.height - 30;
            }
        };
        this.paddle.x = (this.canvas.width - this.paddle.width) / 2;

        this.createBlocks();
    }

    createBlocks(forcedTypes = null) {
        this.blocks = [];
        
        // Get only tier 1 blocks
        const blockTypes = Object.entries(BLOCK_TYPES)
            .filter(([_, data]) => data.tier === 1)
            .map(([type]) => type);
        
        // If no tier 1 blocks found, use 'DIRT' as fallback
        if (blockTypes.length === 0) {
            blockTypes.push('DIRT');
        }
        
        // Create blocks in a grid with padding between them
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const type = blockTypes[0]; // Always use the first tier 1 block type
                const x = this.blockOffsetX + col * (this.blockWidth + this.blockPadding);
                const y = 50 + row * (this.blockHeight + this.blockPadding);
                
                this.blocks.push(new Block(
                    type,
                    x,
                    y,
                    this.blockWidth,
                    this.blockHeight
                ));
            }
        }
    }

    resetGame() {
        this.isGameOver = false;
        this.currentSpeed = this.baseSpeed;
        this.currentTier = 1; // Reset to tier 1
        this.secretCode = ''; // Reset secret code
        
        // Clear all particles
        this.particles = [];
        
        // Reset ball damage with upgrades
        const baseDamage = 5;
        const upgradeDamage = this.upgrades.BALL_DAMAGE * UPGRADE_TYPES.BALL_DAMAGE.effect;
        this.ball.damage = baseDamage + upgradeDamage;
        this.initializeGameObjects();
        
        // Create blocks with only tier 1 blocks
        const tier1Types = Object.keys(BLOCK_TYPES).filter(type => BLOCK_TYPES[type].tier === 1);
        this.createBlocks(tier1Types);
    }

    handleGameAction() {
        if (this.gameState === 'start') {
            this.startGame();
        } else if (this.gameState === 'playing' && this.ball.attached) {
            this.ball.attached = false;
            this.ball.dy = -5;
        } else if (this.gameState === 'gameover' && !this.showShop) {
            this.resetGame();
        }
    }

    handleKeyInput(e, isKeyDown) {
        // Handle state transitions first
        if (isKeyDown && (e.code === 'Space' || e.code === 'Enter')) {
            this.handleGameAction();
            return;
        }

        // Only handle game controls if we're in playing state
        if (this.gameState === 'playing') {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keyState.left = isKeyDown;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keyState.right = isKeyDown;
            } else if (isKeyDown && (e.code === 'Space' || e.code === 'Enter')) {
                // Launch ball on spacebar or enter
                if (this.ball.attached) {
                    this.ball.attached = false;
                    // Launch at an angle based on paddle position
                    const launchAngle = -Math.PI/2 + (Math.random() * Math.PI/3 - Math.PI/6); // Random angle between -60 and -120 degrees
                    this.ball.dx = Math.cos(launchAngle) * this.currentSpeed;
                    this.ball.dy = Math.sin(launchAngle) * this.currentSpeed;
                }
            }
        }

        // Secret code handling
        if (isKeyDown && e.code.startsWith('Key')) {
            const letter = e.code.slice(3).toLowerCase();
            this.secretCode += letter;
            if (this.secretCode.length > 10) {
                this.secretCode = this.secretCode.slice(-10);
            }
            
            // Check for secret codes
            if (this.secretCode.includes('poor')) {
                // Reset money and upgrades
                this.money = 0;
                Object.keys(this.upgrades).forEach(type => {
                    this.upgrades[type] = 0;
                    localStorage.setItem(`upgrade_${type}`, '0');
                });
                localStorage.setItem('money', '0');
                this.updateMoney(0);
                
                // Reset paddle width and ball damage
                this.paddle.width = 100;
                this.ball.damage = 5;
                
                // Visual feedback
                this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#FF0000', 100);
                
                // Clear secret code
                this.secretCode = '';
            } else if (this.secretCode === 'putoandoni') {
                this.showClowns = true;
                this.updateMoney(1000000);
            }
        }
    }

    startGame() {
        this.gameState = 'playing';
        document.getElementById('start-screen').classList.remove('active');
        this.resetGame();
    }
    
    resetGame() {
        this.blocks = [];
        this.createBlocks();
        this.ball.reset();
        this.paddle.reset();
        this.gameState = 'playing';
        this.currentSpeed = this.baseSpeed;
        document.getElementById('game-over-screen').classList.remove('active');
    }
    
    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('game-over-screen').classList.add('active');
    }
    
    setupEventListeners() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            // Prevent spacebar from scrolling the page
            if (e.key === ' ') e.preventDefault();
            this.handleKeyInput(e, true);
        });
        window.addEventListener('keyup', (e) => this.handleKeyInput(e, false));

        // Any input removes clowns
        const removeClowns = () => {
            if (this.showClowns) {
                this.showClowns = false;
                this.resetGame();
            }
        };
        window.addEventListener('keydown', removeClowns);
        window.addEventListener('mousedown', removeClowns);
        window.addEventListener('touchstart', removeClowns);

        // Handle game state transitions for start and game over screens
        const startScreen = document.getElementById('start-screen');
        const gameOverScreen = document.getElementById('game-over-screen');

        const handleScreenClick = () => {
            this.handleGameAction();
        };

        startScreen.addEventListener('click', handleScreenClick);
        startScreen.addEventListener('touchstart', handleScreenClick);
        gameOverScreen.addEventListener('click', handleScreenClick);
        gameOverScreen.addEventListener('touchstart', handleScreenClick);

        // Handle pointer events for ball launch and gameplay
        const handlePointerEvent = (e) => {
            e.preventDefault();
            
            // Remove clowns if showing
            if (this.showClowns) {
                this.removeClowns();
                return;
            }
            
            if (this.gameState === 'playing' && this.ball.attached) {
                this.ball.attached = false;
                this.ball.dy = -5;
            }
        };
        
        this.canvas.addEventListener('click', handlePointerEvent);
        this.canvas.addEventListener('touchstart', handlePointerEvent);
        // Mouse and touch movement
        const handlePointerMove = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const pointerX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const x = pointerX - rect.left;
            this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width,
                x - this.paddle.width / 2));
        };

        this.canvas.addEventListener('mousemove', handlePointerMove);
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent scrolling
            handlePointerMove(e);
        });

        // Touch start handler for paddle movement
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent double tap zoom
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            
            // Handle paddle movement
            if (this.gameState === 'playing') {
                if (touchX < rect.width / 2) {
                    this.moveLeft = true;
                    this.moveRight = false;
                } else {
                    this.moveLeft = false;
                    this.moveRight = true;
                }
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
        }
        
        if (this.blocks.length === 0) {
            this.createBlocks();
        }
    }

    spawnDecorativeBlock() {
        const blockTypes = Object.keys(BLOCK_TYPES);
        const randomType = blockTypes[Math.floor(Math.random() * blockTypes.length)];
        const size = Math.random() * 30 + 20;
        
        this.decorativeBlocks.push({
            x: Math.random() * this.canvas.width,
            y: -size,
            width: size,
            height: size,
            type: randomType,
            rotation: Math.random() * Math.PI * 2,
            speed: Math.random() * 2 + 1,
            rotationSpeed: (Math.random() - 0.5) * 0.1
        });
    }
    
    updateDecorativeBlocks() {
        const now = Date.now();
        if (now - this.lastSpawnTime > 1000) {
            this.spawnDecorativeBlock();
            this.lastSpawnTime = now;
        }
        
        this.decorativeBlocks = this.decorativeBlocks.filter(block => {
            block.y += block.speed;
            block.rotation += block.rotationSpeed;
            
            if (Math.random() < 0.05) {
                this.createExplosion(
                    block.x + block.width/2,
                    block.y + block.height/2,
                    BLOCK_TYPES[block.type].color,
                    5
                );
            }
            
            return block.y < this.canvas.height + block.height;
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('start-screen').classList.remove('active');
        this.resetGame();
    }
    
    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('game-over-screen').classList.add('active');
        // Reset shop state when game over
        this.showShop = false;
    }
    
    setupShop() {
        const upgradesList = document.querySelector('.upgrades-list');
        upgradesList.innerHTML = '';
        
        Object.entries(UPGRADE_TYPES).forEach(([type, data]) => {
            const button = document.createElement('button');
            button.className = 'cool-button upgrade-button';
            const price = this.getUpgradePrice(type);
            const priceText = price === Infinity ? 'MAX' : `💰 ${price}`;
            
            button.innerHTML = `
                <div class="upgrade-info">
                    <div>${data.name}</div>
                    <div class="upgrade-level">Level ${this.upgrades[type]}/${data.maxLevel}</div>
                </div>
                <div class="upgrade-price">${priceText}</div>
            `;
            
            button.addEventListener('click', () => {
                if (this.money >= price && price !== Infinity) {
                    this.buyUpgrade(type);
                    this.updateShopDisplay();
                } else {
                    button.classList.add('shake');
                    setTimeout(() => button.classList.remove('shake'), 500);
                }
            });
            
            upgradesList.appendChild(button);
        });
    }
    
    updateShopDisplay() {
        document.getElementById('shop-money-amount').textContent = this.money;
        this.setupShop(); // Refresh all upgrade buttons
    }
    
    update() {
        // Always update particles for visual effects
        if (this.particles.length > 0) {
            const now = Date.now();
            this.particles = this.particles.filter(particle => {
                // Remove particles older than 3 seconds
                if (now - particle.creationTime >= 3000) return false;
                return particle.update();
            });
        }
        
        if (this.gameState === 'start' || this.gameState === 'gameover') {
            this.updateDecorativeBlocks();
            return;
        }
        
        // Update paddle position for keyboard/touch controls
        const paddleSpeed = 10;
        if (this.moveLeft || this.keyState.left) {
            this.paddle.x = Math.max(0, this.paddle.x - paddleSpeed);
        }
        if (this.moveRight || this.keyState.right) {
            this.paddle.x = Math.min(this.canvas.width - this.paddle.width, this.paddle.x + paddleSpeed);
        }
        
        // Keep ball attached to paddle if not launched
        if (this.ball.attached) {
            this.ball.x = this.paddle.x + this.paddle.width/2;
            this.ball.y = this.paddle.y - this.ball.radius;
            return;
        }

        // Ball movement
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Enforce minimum ball speed
        const currentSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        if (currentSpeed < this.minBallSpeed) {
            const speedRatio = this.minBallSpeed / currentSpeed;
            this.ball.dx *= speedRatio;
            this.ball.dy *= speedRatio;
        }

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
                
                // Store current ball direction
                const currentSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
                const directionX = this.ball.dx / currentSpeed;
                const directionY = this.ball.dy / currentSpeed;
                
                // Increase target speed
                this.currentSpeed += this.speedIncrease;
                
                // Apply new speed while maintaining direction
                this.ball.dx = directionX * this.currentSpeed;
                this.ball.dy = directionY * this.currentSpeed;
                
                // Get current block's tier
                const currentTier = BLOCK_TYPES[block.type].tier;
                
                // Always try to get next tier blocks
                const nextTierTypes = Object.keys(BLOCK_TYPES).filter(
                    type => BLOCK_TYPES[type].tier === currentTier + 1
                );
                
                // If next tier exists, use it, otherwise stay at current tier
                const type = nextTierTypes.length > 0 ?
                    nextTierTypes[Math.floor(Math.random() * nextTierTypes.length)] :
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
            this.gameOver();
            // Keep some particles for visual effect
            this.particles = this.particles.filter(p => p.type === 'upward');
        }

        // Create new blocks if all are destroyed
        if (this.blocks.length === 0) {
            this.createBlocks();
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw clowns if active
        if (this.showClowns) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = '120px Arial';
            this.ctx.textAlign = 'center';
            const clowns = '🤡🤡🤡';
            this.ctx.fillText(clowns, this.canvas.width/2, this.canvas.height/2);
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
