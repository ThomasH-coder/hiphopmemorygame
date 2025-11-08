// DOM Elements
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

// Sounds
const flipSound = new Audio("sounds/flip.mp3");
const matchSound = new Audio("sounds/match.mp3");

const winSounds = {
  "80s Rappers": new Audio("sounds/win.mp3"),
  "90s Rappers": new Audio("sounds/win.mp3"),
  "2000s Rappers": new Audio("sounds/win.mp3"),
  "2010s Rappers": new Audio("sounds/win.mp3"),
  "Producers": new Audio("sounds/win.mp3"),
  "Female Rappers": new Audio("sounds/win.mp3"),
  "Underground Legends": new Audio("sounds/win.mp3")
};

const editionEmojis = {
  "80s Rappers": ["🎤", "📼", "🕶️", "🎧"],
  "90s Rappers": ["🔥", "🎶", "🎧", "💿"],
  "2000s Rappers": ["💥", "🎧", "📱", "🎵"],
  "2010s Rappers": ["✨", "🎧", "📸", "🎤"],
  "Producers": ["🎛️", "🎚️", "🎧", "🔊"],
  "Female Rappers": ["💅", "🎤", "👑", "💖"],
  "Underground Legends": ["🧠", "🎧", "🕶️", "💣"]
};

const editionLoops = {
  "80s Rappers": new Audio("sounds/loops/80s.mp3"),
  "90s Rappers": new Audio("sounds/loops/90s.mp3"),
  "2000s Rappers": new Audio("sounds/loops/2000s.mp3"),
  "2010s Rappers": new Audio("sounds/loops/2010s.mp3"),
  "Producers": new Audio("sounds/loops/producers.mp3"),
  "Female Rappers": new Audio("sounds/loops/femalerappers.mp3"),
  "Underground Legends": new Audio("sounds/loops/underground.mp3")
  // Add more editions...
};

//cache object
const editionCache = {};

Object.values(editionLoops).forEach(audio => {
  audio.loop = true;
  audio.volume = 0.3; // Adjust to taste
});

function setVolume(volume) {
  flipSound.volume = volume;
  matchSound.volume = volume;
  winSounds.volume = volume;
  for (const key in winSounds) {
  winSounds[key].volume = volume;
}
  for (const key in editionLoops) {
    editionLoops[key].volume = volume;
  }
}
setVolume(volumeControl.value);

volumeControl.addEventListener("input", () => {
  if (!isMuted) setVolume(volumeControl.value);
});

muteButton.addEventListener("click", () => {
  isMuted = !isMuted;

  const allAudio = [
    flipSound,
    matchSound,
    ...Object.values(winSounds),
    ...Object.values(editionLoops)
  ];

  allAudio.forEach(audio => {
    audio.muted = isMuted;
  });

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

// Mute all sounds

// 🎮 Game State
let timer = null;
let seconds = 0;
let flippedCards = [];
let matchedCards = [];
let currentEdition = "90s Rappers";
let lastMatchTime = 0;
let comboCount = 0;
let isMuted = false;


// Shuffle helper
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Load JSON edition with caching object
async function loadEdition(file) {
  if (editionCache[file]) {
    return editionCache[file]; // Use cached data
  }

  const response = await fetch(file);
  const data = await response.json();
  editionCache[file] = data; // Store in cache
  return data;
}

// Start game
async function startGame(file = "data/cards-90s.json", editionName = "90s Rappers") {
  currentEdition = editionName;
  Object.values(editionLoops).forEach(audio => audio.pause()); // Stop all
const loop = editionLoops[currentEdition];
if (!isMuted && loop) {
  loop.currentTime = 0;
  loop.play();
}
  // Fade out any playing win sounds to prevent overlap
  for (const key in winSounds) {
  const sound = winSounds[key];
  if (sound instanceof Audio) {
    if (!sound.paused && sound.currentTime > 0) {
      fadeOutAudio(sound);
    } else {
      sound.pause();
      sound.currentTime = 0;
    }
  }
}

  const data = await loadEdition(file);
  currentEdition = editionName;
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
    card.addEventListener("keydown", (e) => {
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

// Flip logic
function flipCard() {
  if (flippedCards.length < 2 && !this.classList.contains("flipped")) {
    if (!isMuted) {
      flipSound.currentTime = 0;
      flipSound.play();
    }
    this.classList.add("flipped");
    flippedCards.push(this);
    if (flippedCards.length === 2) checkMatch();
  }
}

function checkMatch() {
  const [c1, c2] = flippedCards;
  if (c1.dataset.name === c2.dataset.name) {
    if (!isMuted) matchSound.play();
    matchedCards.push(c1.dataset.name);
     // 🔊 Accessibility feedback
    document.getElementById("feedback").textContent = `Match found: ${c1.dataset.name}`;
    flippedCards = [];

    // 🔥 Combo streak logic
    const now = Date.now();
    if (now - lastMatchTime <= 10000) {
      comboCount++;
    } else {
      comboCount = 1;
    }
    lastMatchTime = now;

    if (comboCount >= 2) {
      triggerComboEffect(comboCount);
    }

    if (matchedCards.length === gameBoard.children.length / 2) endGame();
  } else {
    setTimeout(() => {
      c1.classList.remove("flipped");
      c2.classList.remove("flipped");
      flippedCards = [];
    }, 1000);
  }
}

function updateTimer() {
  seconds++;
  timerElement.textContent = `Time: ${seconds}s`;
}

// End game + modal
function endGame() {
  clearInterval(timer);
  if (!isMuted && winSounds[currentEdition]) {
  winSounds[currentEdition].currentTime = 0;
  winSounds[currentEdition].play();
  launchCanvasConfetti();
  launchEmojiBurst();
  Object.values(editionLoops).forEach(audio => audio.pause());
}

  // Show modal
  finalTimeElement.textContent = `Time: ${seconds}s`;
  playerNameInput.value = "";
  winModal.classList.remove("hidden");
}

// Leaderboard functions
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
  if (leaderboard.length === 0) {
    leaderboardContainer.innerHTML += "<p>No scores yet.</p>";
    return;
  }
  const list = document.createElement("ol");
  leaderboard.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = `${entry.name} - ${entry.time}s`;
    list.appendChild(li);
  });
  leaderboardContainer.appendChild(list);
}

function showBestTime(edition) {
  const key = `leaderboard_${edition}`;
  const leaderboard = JSON.parse(localStorage.getItem(key)) || [];
  if (leaderboard.length > 0) {
    bestTimeElement.textContent = `Best Time: ${leaderboard[0].time}s`;
  } else {
    bestTimeElement.textContent = "Best Time: --";
  }
}

// Unified Parallax Handler with requestAnimationFrame
let parallaxX = 0;
let parallaxY = 0;
let parallaxFrameId = null;

function updateParallax(xFactor, yFactor) {
  const layers = document.querySelectorAll(".layer");
  layers.forEach((layer, index) => {
    const depth = (index + 1) * 10;
    const moveX = xFactor * depth;
    const moveY = yFactor * depth;
    layer.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });
}

function requestParallaxUpdate() {
  if (parallaxFrameId) return;
  parallaxFrameId = requestAnimationFrame(() => {
    updateParallax(parallaxX, parallaxY);
    parallaxFrameId = null;
  });
}

document.addEventListener("mousemove", (e) => {
  parallaxX = (e.clientX / window.innerWidth - 0.5) * 2;
  parallaxY = (e.clientY / window.innerHeight - 0.5) * 2;
  requestParallaxUpdate();
});

document.addEventListener("touchmove", (e) => {
  if (e.touches.length > 0) {
    parallaxX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
    parallaxY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    requestParallaxUpdate();
  }
});



// Modal event listeners
saveScoreButton.addEventListener("click", () => {
  const name = playerNameInput.value.trim() || "Anonymous";
  updateLeaderboard(currentEdition, seconds, name);
  showLeaderboard(currentEdition);
  showBestTime(currentEdition);
  leaderboardContainer.classList.add("visible");
  winModal.classList.add("hidden");
});

closeModalButton.addEventListener("click", () => {
  winModal.classList.add("hidden");
});

// Event listeners
loadGameButton.addEventListener("click", () => {
  const file = editionSelect.value;
  const editionName = editionSelect.options[editionSelect.selectedIndex].dataset.name;

  startGame(file, editionName);
});

restartButton.addEventListener("click", () => {
    // Stop and reset all background loops
  Object.values(editionLoops).forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });


  // Get selected edition
  const file = editionSelect.value;
  const editionName = editionSelect.options[editionSelect.selectedIndex].dataset.name;

  // Start the game (this should trigger the correct loop)
  startGame(file, editionName);
});

// Combo Effect
function triggerComboEffect(count) {
  const comboBanner = document.createElement("div");
  comboBanner.className = "combo-banner";
  comboBanner.textContent = `🔥 Combo x${count}! 🔥`;
  document.body.appendChild(comboBanner);

  setTimeout(() => {
    comboBanner.remove();
  }, 1500);

  if (!isMuted) {
    const comboSound = new Audio("sounds/combo.mp3");
    comboSound.play();
  }

  // 🎉 Dynamically load confetti only when needed
  import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js')
    .then((module) => {
      const confetti = module.default;
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

// Confetti Win Launch
function launchCanvasConfetti() {
  if (typeof confetti !== "function") return;

  const emojis = editionEmojis[currentEdition] || ["🎉", "✨", "🎧"];
  confetti({
    particleCount: 100,
    spread: 170,
    origin: { y: 0.6 },
    emojis: emojis,
    scalar: 1.2, 
    shapes: ["emoji"]
  });
}

function launchEmojiBurst(count = 70) {
  const emojis = editionEmojis[currentEdition] || ["🎉", "✨", "🎧"];
  for (let i = 0; i < count; i++) {
    const emoji = document.createElement("div");
    emoji.className = "emoji-burst";
    emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    // Spread out horizontally
    emoji.style.left = `${Math.random() * 100}%`;

    // Randomize size slightly
    emoji.style.fontSize = `${1.5 + Math.random()}rem`;

    // Fall slower
    const duration = 3 + Math.random() * 4; // between 3–5 seconds
    emoji.style.animationDuration = `${duration}s`;


    document.body.appendChild(emoji);
    setTimeout(() => emoji.remove(), duration * 1000);
  }
}