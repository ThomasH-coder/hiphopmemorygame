// ==========================
// DOM Elements
// ==========================
const gameBoard = document.getElementById("game-board");
const restartButton = document.getElementById("restart");
const timerElement = document.getElementById("timer");
const bestTimeElement = document.getElementById("best-time");
const leaderboardContainer = document.getElementById("leaderboard");
const editionSelect = document.getElementById("edition-select");
const loadGameButton = document.getElementById("load-game");
const muteButton = document.getElementById("mute-button");
const volumeControl = document.getElementById("volume-control");

// Modal Elements
const winModal = document.getElementById("win-modal");
const finalTimeElement = document.getElementById("final-time");
const playerNameInput = document.getElementById("player-name");
const saveScoreButton = document.getElementById("save-score");
const closeModalButton = document.getElementById("close-modal");

// ==========================
// Audio Setup
// ==========================

// Main sound effects
const flipSound = new Audio("sounds/flip.mp3");
const matchSound = new Audio("sounds/match.mp3");

// Win sounds per edition
const winSounds = {
  "80s Rappers": new Audio("sounds/win.mp3"),
  "90s Rappers": new Audio("sounds/win.mp3"),
  "2000s Rappers": new Audio("sounds/win.mp3"),
  "2010s Rappers": new Audio("sounds/win.mp3"),
  "Producers": new Audio("sounds/win.mp3"),
  "Female Rappers": new Audio("sounds/win.mp3"),
  "Underground Legends": new Audio("sounds/win.mp3")
};

// Background loops per edition
const editionLoops = {
  "80s Rappers": new Audio("sounds/loops/80s.mp3"),
  "90s Rappers": new Audio("sounds/loops/90s.mp3"),
  "2000s Rappers": new Audio("sounds/loops/2000s.mp3"),
  "2010s Rappers": new Audio("sounds/loops/2010s.mp3"),
  "Producers": new Audio("sounds/loops/producers.mp3"),
  "Female Rappers": new Audio("sounds/loops/femalerappers.mp3"),
  "Underground Legends": new Audio("sounds/loops/underground.mp3")
};

// Cache for editions
const editionCache = {};

// Configure loops to autoplay, loop, and quieter than effects
Object.values(editionLoops).forEach(audio => {
  audio.loop = true;
  audio.volume = 0.3; // default background loop volume
});

// ==========================
// Volume Control
// ==========================
let isMuted = false;

function setVolume(volume) {
  flipSound.volume = Math.min(volume * 1.5, 1); // 50% louder than main volume
  matchSound.volume = volume;

  for (const key in winSounds) {
    if (winSounds[key] instanceof Audio) winSounds[key].volume = volume;
  }

  for (const key in editionLoops) {
    if (editionLoops[key] instanceof Audio) editionLoops[key].volume = volume * 0.3; // keep loops soft
  }
}

setVolume(volumeControl.value);

volumeControl.addEventListener("input", () => {
  if (!isMuted) setVolume(volumeControl.value);
});

muteButton.addEventListener("click", () => {
  isMuted = !isMuted;
  const allAudio = [flipSound, matchSound, ...Object.values(winSounds), ...Object.values(editionLoops)];
  allAudio.forEach(audio => audio.muted = isMuted);
  muteButton.textContent = isMuted ? "Unmute" : "Mute";
});

function fadeOutAudio(audio, duration = 1000) {
  const step = audio.volume / (duration / 50);
  const originalVolume = audio.volume;
  const fade = setInterval(() => {
    if (audio.volume > step) {
      audio.volume -= step;
    } else {
      clearInterval(fade);
      audio.pause();
      audio.currentTime = 0;
      audio.volume = originalVolume;
    }
  }, 50);
}

// ==========================
// Game State
// ==========================
let timer = null;
let seconds = 0;
let flippedCards = [];
let matchedCards = [];
let currentEdition = "90s Rappers";
let lastMatchTime = 0;
let comboCount = 0;

// ==========================
// Editions & Emojis
// ==========================
const editionEmojis = {
  "80s Rappers": ["🎤", "📼", "🕶️", "🎧"],
  "90s Rappers": ["🔥", "🎶", "🎧", "💿"],
  "2000s Rappers": ["💥", "🎧", "📱", "🎵"],
  "2010s Rappers": ["✨", "🎧", "📸", "🎤"],
  "Producers": ["🎛️", "🎚️", "🎧", "🔊"],
  "Female Rappers": ["💅", "🎤", "👑", "💖"],
  "Underground Legends": ["🧠", "🎧", "🕶️", "💣"]
};

// ==========================
// Shuffle Helper
// ==========================
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ==========================
// Load JSON Edition
// ==========================
async function loadEdition(file) {
  if (editionCache[file]) return editionCache[file];
  const response = await fetch(file);
  const data = await response.json();
  editionCache[file] = data;
  return data;
}

// ==========================
// Start Game
// ==========================
async function startGame(file = "data/cards-90s.json", editionName = "90s Rappers") {
  currentEdition = editionName;

  // Stop all loops
  Object.values(editionLoops).forEach(audio => audio.pause());

  // Start current edition loop
  const loop = editionLoops[currentEdition];
  if (!isMuted && loop) {
    loop.currentTime = 0;
    loop.play();
    loop.volume = volumeControl.value * 0.3;
  }

  // Fade out win sounds
  for (const key in winSounds) {
    const sound = winSounds[key];
    if (sound instanceof Audio) {
      if (!sound.paused && sound.currentTime > 0) fadeOutAudio(sound);
      else {
        sound.pause();
        sound.currentTime = 0;
      }
    }
  }

  const data = await loadEdition(file);
  document.getElementById("edition-title").textContent = data.edition;

  gameBoard.innerHTML = "";
  flippedCards = [];
  matchedCards = [];
  seconds = 0;

  const deck = [...data.cards, ...data.cards];
  shuffle(deck);

  deck.forEach(cardData => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.name = cardData.id;
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Card: ${cardData.name}`);

    const cardInner = document.createElement("div");
    cardInner.classList.add("card-inner");

    const cardFront = document.createElement("div");
    cardFront.classList.add("card-front");
    const imgElement = document.createElement("img");
    imgElement.src = cardData.image;
    imgElement.alt = cardData.name;
    cardFront.appendChild(imgElement);

    const cardBack = document.createElement("div");
    cardBack.classList.add("card-back");

    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    card.appendChild(cardInner);

    card.addEventListener("click", flipCard);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });

    gameBoard.appendChild(card);
  });

  clearInterval(timer);
  timerElement.textContent = `Time: 0s`;
  timer = setInterval(updateTimer, 1000);

  showBestTime(currentEdition);
  showLeaderboard(currentEdition);
}

// ==========================
// Flip Logic
// ==========================
function flipCard() {
  if (flippedCards.length < 2 && !this.classList.contains("flipped")) {
    if (!isMuted) {
      flipSound.currentTime = 0;
      flipSound.play(); // louder than loop
    }
    this.classList.add("flipped");
    flippedCards.push(this);
    if (flippedCards.length === 2) checkMatch();
  }
}

// ==========================
// Match Logic
// ==========================
function checkMatch() {
  const [c1, c2] = flippedCards;
  if (c1.dataset.name === c2.dataset.name) {
    if (!isMuted) matchSound.play();
    matchedCards.push(c1.dataset.name);
    document.getElementById("feedback").textContent = `Match found: ${c1.dataset.name}`;
    flippedCards = [];

    const now = Date.now();
    if (now - lastMatchTime <= 10000) comboCount++;
    else comboCount = 1;
    lastMatchTime = now;

    if (comboCount >= 2) triggerComboEffect(comboCount);
    if (matchedCards.length === gameBoard.children.length / 2) endGame();
  } else {
    setTimeout(() => {
      c1.classList.remove("flipped");
      c2.classList.remove("flipped");
      flippedCards = [];
    }, 1000);
  }
}

// ==========================
// Timer
// ==========================
function updateTimer() {
  seconds++;
  timerElement.textContent = `Time: ${seconds}s`;
}

// ==========================
// End Game
// ==========================
function endGame() {
  clearInterval(timer);
  if (!isMuted && winSounds[currentEdition]) {
    winSounds[currentEdition].currentTime = 0;
    winSounds[currentEdition].play();
    launchCanvasConfetti();
    launchEmojiBurst();
    Object.values(editionLoops).forEach(audio => audio.pause());
  }

  finalTimeElement.textContent = `Time: ${seconds}s`;
  playerNameInput.value = "";
  winModal.classList.remove("hidden");
}

// ==========================
// Leaderboard
// ==========================
function updateLeaderboard(edition, time, name) {
  const key = `leaderboard_${edition}`;
  let leaderboard = JSON.parse(localStorage.getItem(key)) || [];
  leaderboard.push({ name, time });
  leaderboard.sort((a, b) => a.time - b.time);
  leaderboard = leaderboard.slice(0, 5);
  localStorage.setItem(key, JSON.stringify(leaderboard));
}

function showLeaderboard(edition) {
  const key = `leaderboard_${edition}`;
  const leaderboard = JSON.parse(localStorage.getItem(key)) || [];
  leaderboardContainer.innerHTML = `<h3>${edition} Leaderboard</h3>`;
  if (leaderboard.length === 0) leaderboardContainer.innerHTML += "<p>No scores yet.</p>";
  else {
    const list = document.createElement("ol");
    leaderboard.forEach(entry => {
      const li = document.createElement("li");
      li.textContent = `${entry.name} - ${entry.time}s`;
      list.appendChild(li);
    });
    leaderboardContainer.appendChild(list);
  }
}

function showBestTime(edition) {
  const key = `leaderboard_${edition}`;
  const leaderboard = JSON.parse(localStorage.getItem(key)) || [];
  bestTimeElement.textContent = leaderboard.length > 0 ? `Best Time: ${leaderboard[0].time}s` : "Best Time: --";
}

// ==========================
// Parallax
// ==========================
let parallaxX = 0, parallaxY = 0, parallaxFrameId = null;

function updateParallax(xFactor, yFactor) {
  const layers = document.querySelectorAll(".layer");
  layers.forEach((layer, index) => {
    const depth = (index + 1) * 10;
    layer.style.transform = `translate(${xFactor * depth}px, ${yFactor * depth}px)`;
  });
}

function requestParallaxUpdate() {
  if (parallaxFrameId) return;
  parallaxFrameId = requestAnimationFrame(() => {
    updateParallax(parallaxX, parallaxY);
    parallaxFrameId = null;
  });
}

document.addEventListener("mousemove", e => {
  parallaxX = (e.clientX / window.innerWidth - 0.5) * 2;
  parallaxY = (e.clientY / window.innerHeight - 0.5) * 2;
  requestParallaxUpdate();
});

document.addEventListener("touchmove", e => {
  if (e.touches.length > 0) {
    parallaxX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
    parallaxY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    requestParallaxUpdate();
  }
});

// ==========================
// Modal Events
// ==========================
saveScoreButton.addEventListener("click", () => {
  const name = playerNameInput.value.trim() || "Anonymous";
  updateLeaderboard(currentEdition, seconds, name);
  showLeaderboard(currentEdition);
  showBestTime(currentEdition);
  leaderboardContainer.classList.add("visible");
  winModal.classList.add("hidden");
});

closeModalButton.addEventListener("click", () => winModal.classList.add("hidden"));

// ==========================
// Game Controls
// ==========================
loadGameButton.addEventListener("click", () => {
  const file = editionSelect.value;
  const editionName = editionSelect.options[editionSelect.selectedIndex].dataset.name;
  startGame(file, editionName);
});

restartButton.addEventListener("click", () => {
  Object.values(editionLoops).forEach(audio => { audio.pause(); audio.currentTime = 0; });
  const file = editionSelect.value;
  const editionName = editionSelect.options[editionSelect.selectedIndex].dataset.name;
  startGame(file, editionName);
});

// ==========================
// Combo & Effects
// ==========================
function triggerComboEffect(count) {
  const comboBanner = document.createElement("div");
  comboBanner.className = "combo-banner";
  comboBanner.textContent = `🔥 Combo x${count}! 🔥`;
  document.body.appendChild(comboBanner);
  setTimeout(() => comboBanner.remove(), 1500);

  if (!isMuted) new Audio("sounds/combo.mp3").play();

  import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js')
  .then((module) => {
    const confetti = module; // just use module directly
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
    });
  })
  .catch((error) => {
    console.error('Confetti failed to load:', error);
  });

}

function launchCanvasConfetti() {
  if (typeof confetti !== "function") return;
  const emojis = editionEmojis[currentEdition] || ["🎉", "✨", "🎧"];
  confetti({ particleCount: 100, spread: 170, origin: { y: 0.6 }, emojis, scalar: 1.2, shapes: ["emoji"] });
}

function launchEmojiBurst(count = 70) {
  const emojis = editionEmojis[currentEdition] || ["🎉", "✨", "🎧"];
  for (let i = 0; i < count; i++) {
    const emoji = document.createElement("div");
    emoji.className = "emoji-burst";
    emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    emoji.style.left = `${Math.random() * 100}%`;
    emoji.style.fontSize = `${1.5 + Math.random()}rem`;
    emoji.style.animationDuration = `${3 + Math.random() * 4}s`;
    document.body.appendChild(emoji);
    setTimeout(() => emoji.remove(), parseFloat(emoji.style.animationDuration) * 1000);
  }
}
