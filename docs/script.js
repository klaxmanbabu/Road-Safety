// Game variables
let score = 0;
let timeLeft = 60;
let timerId = null;
let gameRunning = false;

const playerSpeed = 10;

const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");
const startButton = document.getElementById("start-button");
const gameArea = document.getElementById("game-area");
const player = document.getElementById("player");
const target = document.getElementById("target");
const gameOverMessage = document.getElementById("game-over-message");

// Initial positions
let playerX = 50;
let playerY = 50;

// Start button
startButton.addEventListener("click", function () {
  if (gameRunning) return; // avoid multiple starts
  resetGame();
  startGame();
});

// Keyboard controls
document.addEventListener("keydown", function (event) {
  if (!gameRunning) return;

  const areaRect = gameArea.getBoundingClientRect();
  const playerRect = player.getBoundingClientRect();

  if (event.key === "ArrowUp") {
    if (playerRect.top - areaRect.top > 0) {
      playerY -= playerSpeed;
    }
  } else if (event.key === "ArrowDown") {
    if (playerRect.bottom - areaRect.top < areaRect.height) {
      playerY += playerSpeed;
    }
  } else if (event.key === "ArrowLeft") {
    if (playerRect.left - areaRect.left > 0) {
      playerX -= playerSpeed;
    }
  } else if (event.key === "ArrowRight") {
    if (playerRect.right - areaRect.left < areaRect.width) {
      playerX += playerSpeed;
    }
  }

  updatePlayerPosition();
  checkCollision();
});

// Start the game
function startGame() {
  gameRunning = true;
  gameOverMessage.classList.add("hidden");
  placeTargetRandomly();
  startTimer();
}

// Reset game state
function resetGame() {
  score = 0;
  timeLeft = 60;
  scoreElement.textContent = "Score: " + score;
  timerElement.textContent = "Time: " + timeLeft;

  playerX = 50;
  playerY = 50;
  updatePlayerPosition();

  clearInterval(timerId);
}

// Timer
function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(function () {
    timeLeft--;
    if (timeLeft < 0) {
      timeLeft = 0;
    }
    timerElement.textContent = "Time: " + timeLeft;

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

// End game
function endGame() {
  gameRunning = false;
  clearInterval(timerId);
  gameOverMessage.textContent = "Game Over. Score: " + score;
  gameOverMessage.classList.remove("hidden");
}

// Move player visually
function updatePlayerPosition() {
  player.style.left = playerX + "px";
  player.style.top = playerY + "px";
}

// Place target at random position
function placeTargetRandomly() {
  const areaRect = gameArea.getBoundingClientRect();
  const targetSize = 20;

  const maxX = areaRect.width - targetSize;
  const maxY = areaRect.height - targetSize;

  const x = Math.floor(Math.random() * maxX);
  const y = Math.floor(Math.random() * maxY);

  target.style.left = x + "px";
  target.style.top = y + "px";
}

// Check collision between player and target
function checkCollision() {
  const playerRect = player.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const overlap =
    playerRect.left < targetRect.right &&
    playerRect.right > targetRect.left &&
    playerRect.top < targetRect.bottom &&
    playerRect.bottom > targetRect.top;

  if (overlap) {
    score++;
    scoreElement.textContent = "Score: " + score;
    placeTargetRandomly();
  }
}
