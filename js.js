const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

// Game Constants
const GRAVITY = 0.8;
const JUMP_FORCE = -22; // Higher jump
const GROUND_HEIGHT = 100;
const INITIAL_SPEED = 7;
const SPEED_INCREMENT = 0.001;
const SPAWN_INTERVAL = 1500; // ms

// Game State
let gameStarted = false;
let gameOver = false;
let score = 0;
let highScore = localStorage.getItem("yamalHighScore") || 0;
let currentSpeed = INITIAL_SPEED;
let lastSpawnTime = 0;
let animationFrameId;

// Player Object
let player = {
    x: 100,
    y: 0,
    width: 300, // Much bigger Yamal
    height: 300,
    dy: 0,
    grounded: false,
    image: document.getElementById("yamal")
};

// Obstacles
let obstacles = [];
let clouds = [];
const clubImages = [
    "atm", "chelsea", "liverpool", "real-madrid", "bayern", 
    "inter", "dortmund", "leverkusen", "valencia", "betis"
];

// UI Elements
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("high-score");
const overlay = document.getElementById("overlay");
const title = document.getElementById("title");
const message = document.getElementById("message");
const finalScoreContainer = document.getElementById("final-score-container");
const finalScoreElement = document.getElementById("final-score");

// Audio Assets
const sounds = {
    jump: new Audio("audio/sfx_wing.wav"),
    point: new Audio("audio/sfx_point.wav"),
    hit: new Audio("audio/sfx_hit.wav"),
    die: new Audio("audio/sfx_die.wav"),
    bgm: new Audio("audio/bgm_mario.mp3")
};
sounds.bgm.loop = true;

function init() {
    canvas.width = 1400;
    canvas.height = 700;
    highScoreElement.innerText = `BEST: ${highScore}`;
    resetGame();
}

function resetGame() {
    score = 0;
    currentSpeed = INITIAL_SPEED;
    player.y = canvas.height - GROUND_HEIGHT - player.height;
    player.dy = 0;
    obstacles = [];
    clouds = [];
    // Pre-spawn some clouds
    for(let i=0; i<5; i++) {
        spawnCloud(Math.random() * canvas.width);
    }
    gameOver = false;
    updateUI();
}

function spawnCloud(xPos = canvas.width) {
    clouds.push({
        x: xPos,
        y: Math.random() * (canvas.height - 200),
        width: 80 + Math.random() * 100,
        height: 40 + Math.random() * 40,
        speed: 1 + Math.random() * 2
    });
}

function updateUI() {
    scoreElement.innerText = `SCORE: ${score}`;
    if (gameOver) {
        overlay.classList.remove("hidden");
        title.innerText = "GAME OVER";
        message.innerText = "PRESS ENTER TO RESTART";
        finalScoreContainer.classList.remove("hidden");
        finalScoreElement.innerText = `SCORE: ${score}`;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem("yamalHighScore", highScore);
            highScoreElement.innerText = `BEST: ${highScore}`;
        }
    } else if (!gameStarted) {
        overlay.classList.remove("hidden");
        title.innerText = "YAMAL RUN";
        message.innerText = "PRESS ENTER TO START";
        finalScoreContainer.classList.add("hidden");
    } else {
        overlay.classList.add("hidden");
    }
}

function spawnObstacle() {
    const randomClub = clubImages[Math.floor(Math.random() * clubImages.length)];
    const obstacle = {
        x: canvas.width,
        y: canvas.height - GROUND_HEIGHT - 60,
        width: 60,
        height: 60,
        img: document.getElementById(randomClub),
        passed: false,
        isLog: Math.random() > 0.7 // 30% chance to be a tall "log" obstacle
    };
    
    if (obstacle.isLog) {
        obstacle.height = 90;
        obstacle.y = canvas.height - GROUND_HEIGHT - obstacle.height;
    }
    
    obstacles.push(obstacle);
}

function update(timestamp) {
    if (!gameStarted || gameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background (Sky)
    ctx.fillStyle = "#70c5ce";
    ctx.fillRect(0, 0, canvas.width, canvas.height - GROUND_HEIGHT);

    // Draw Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    if(Math.random() < 0.005) spawnCloud();
    for(let i=clouds.length-1; i>=0; i--) {
        const c = clouds[i];
        c.x -= c.speed;
        
        // Simple fluffy cloud shape
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.height/2, 0, Math.PI*2);
        ctx.arc(c.x + c.width/3, c.y - c.height/4, c.height/2, 0, Math.PI*2);
        ctx.arc(c.x + c.width/1.5, c.y, c.height/2, 0, Math.PI*2);
        ctx.fill();

        if(c.x + c.width < -100) clouds.splice(i, 1);
    }

    // Draw Ground
    ctx.fillStyle = "#ded895";
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    
    // Draw Ground Detail (Grass/Line)
    ctx.fillStyle = "#689f38";
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 5);

    // Player Physics
    player.dy += GRAVITY;
    player.y += player.dy;

    if (player.y + player.height > canvas.height - GROUND_HEIGHT) {
        player.y = canvas.height - GROUND_HEIGHT - player.height;
        player.dy = 0;
        player.grounded = true;
    }

    // Draw Shadow
    const shadowWidth = player.width / 2.5 * (1 - (canvas.height - GROUND_HEIGHT - player.y - player.height) / 200);
    if(shadowWidth > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.ellipse(player.x + player.width/2, canvas.height - GROUND_HEIGHT, shadowWidth, 10, 0, 0, Math.PI*2);
        ctx.fill();
    }

    // Draw Player
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);

    // Obstacles logic
    if (timestamp - lastSpawnTime > SPAWN_INTERVAL / (currentSpeed / INITIAL_SPEED)) {
        spawnObstacle();
        lastSpawnTime = timestamp;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= currentSpeed;

        // Draw Obstacle (Log + Logo)
        if (obs.isLog) {
            // Shadow for log
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.fillRect(obs.x + 15, obs.y + obs.height - 10, obs.width - 10, 10);
            
            // Log itself
            ctx.fillStyle = "#5d4037"; // Darker brown
            ctx.fillRect(obs.x + 10, obs.y + 30, obs.width - 20, obs.height - 30);
            
            // Highlight for log
            ctx.fillStyle = "#795548"; // Lighter brown
            ctx.fillRect(obs.x + 10, obs.y + 30, (obs.width - 20) / 3, obs.height - 30);
        }
        ctx.drawImage(obs.img, obs.x, obs.y, obs.width, 60);
        
        // Draw some "shimmer" effect to make it look "sexy"
        if(score > 10) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.fillRect(obs.x, obs.y, obs.width, 5);
        }

        // Collision Detection
        // Define a smaller hitbox for the player by applying padding.
        const playerPaddingX = 40;
        const playerPaddingY = 30;

        const playerHitbox = {
            left: player.x + playerPaddingX,
            right: player.x + player.width - playerPaddingX,
            top: player.y + playerPaddingY,
            bottom: player.y + player.height - playerPaddingY
        };

        const obstacleHitbox = {
            left: obs.x,
            right: obs.x + obs.width,
            top: obs.y,
            bottom: obs.y + obs.height
        };

        // Check for collision between the player's smaller hitbox and the full obstacle hitbox
        if (playerHitbox.right > obstacleHitbox.left &&
            playerHitbox.left < obstacleHitbox.right &&
            playerHitbox.bottom > obstacleHitbox.top &&
            playerHitbox.top < obstacleHitbox.bottom) {
            sounds.hit.play();
            sounds.die.play();
            sounds.bgm.pause();
            gameOver = true;
            updateUI();
            return; // Stop the game loop immediately
        }

        // Score Logic
        if (!obs.passed && obs.x + obs.width < player.x) {
            obs.passed = true;
            score++;
            sounds.point.play();
            updateUI();
        }

        // Remove off-screen
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }

    // Increase difficulty
    currentSpeed += SPEED_INCREMENT;
    if (currentSpeed > 15) currentSpeed = 15; // Max speed cap

    animationFrameId = requestAnimationFrame(update);
}

// Input Handling
window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
        if (player.grounded && gameStarted && !gameOver) {
            player.dy = JUMP_FORCE;
            player.grounded = false;
            sounds.jump.play();
        }
    }
    if (e.code === "Enter") {
        if (!gameStarted) {
            gameStarted = true;
            sounds.bgm.currentTime = 0;
            sounds.bgm.play();
            resetGame();
            lastSpawnTime = performance.now();
            requestAnimationFrame(update);
        } else if (gameOver) {
            sounds.bgm.currentTime = 0;
            sounds.bgm.play();
            resetGame();
            lastSpawnTime = performance.now();
            requestAnimationFrame(update);
        }
    }
});

// Start the game
init();
