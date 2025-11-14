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
// Safari Audio Unlock
// ==========================
document.addEventListener("click", () => {
  if (typeof AudioContext !== "undefined") {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  }
}, { once: true });

// ==========================
// Audio Setup
// ==========================
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

const editionLoops = {
  "80s Rappers": new Audio("sounds/loops/80s.mp3"),
  "90s Rappers": new Audio("sounds/loops/90s.mp3"),
  "2000s Rappers": new Audio("sounds/loops/2000s.mp3"),
  "2010s Rappers": new Audio("sounds/loops/2010s.mp3"),
  "Producers": new Audio("sounds/loops/producers.mp3"),
  "Female Rappers": new Audio("sounds/loops/femalerappers.mp3"),
  "Underground Legends": new Audio("sounds/loops/underground.mp3")
};


// Set loop autoplay & quieter volume
Object.values(editionLoops).forEach(audio => {
  audio.loop = true;
  audio.volume = 0.3;
});

// ==========================
// Safari Audio Activation Fix
// ==========================
function primeAudio(audio) {
  audio.volume = 0;
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {
        // Safari blocks autoplay — that's fine.
        // The attempt still unlocks the audio element.
      });
  }
}

// Prime all audio elements on load
primeAudio(flipSound);
primeAudio(matchSound);
Object.values(winSounds).forEach(primeAudio);
Object.values(editionLoops).forEach(primeAudio);


// ==========================
// Volume & Mute Control (Safari-safe)
// ==========================
let isMuted = false;

// Core volume setter
function setVolume(vol) {
  const v = Math.min(Math.max(parseFloat(vol), 0), 1);

  flipSound.volume = Math.min(v * 1.5, 1);
  matchSound.volume = v;

  Object.values(winSounds).forEach(audio => audio.volume = v);
  Object.values(editionLoops).forEach(audio => audio.volume = v * 0.3);
}

// Mute toggle
function toggleMute() {
  isMuted = !isMuted;
  const allAudio = [flipSound, matchSound, ...Object.values(winSounds), ...Object.values(editionLoops)];
  allAudio.forEach(audio => audio.muted = isMuted);
  muteButton.textContent = isMuted ? "Unmute" : "Mute";
}

// Slider input
volumeControl.addEventListener("input", () => {
  if (!isMuted) setVolume(volumeControl.value);
});

// Mute button click
muteButton.addEventListener("click", toggleMute);

// ==========================
// Safari / WebKit Unlock
// ==========================
function unlockAudio() {
  if (typeof AudioContext !== "undefined") {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  }
  // Apply current slider value immediately
  if (!isMuted) setVolume(volumeControl.value);

  // Remove unlock listeners
  volumeControl.removeEventListener("pointerdown", unlockAudio);
  volumeControl.removeEventListener("touchstart", unlockAudio);
  document.removeEventListener("click", unlockAudio);
}

// Unlock on first user gesture
document.addEventListener("click", unlockAudio, { once: true });
volumeControl.addEventListener("pointerdown", unlockAudio, { once: true });
volumeControl.addEventListener("touchstart", unlockAudio, { once: true });


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
const editionCache = {};
async function loadEdition(file) {
  if (editionCache[file]) return editionCache[file];
  const response = await fetch(file);
  const data = await response.json();
  editionCache[file] = data;
  return data;
}

function injectSEOContent(cards) {
  const seoDiv = document.getElementById("seo-content");
  seoDiv.innerHTML = cards.map(c => `<span>${c.name}</span>`).join(" ");
}


// ==========================
// Start Game
// ==========================
async function startGame(file = "data/cards-90s.json", editionName = "90s Rappers") {
  currentEdition = editionName;

  Object.values(editionLoops).forEach(audio => audio.pause());

  const loop = editionLoops[currentEdition];
  if (!isMuted && loop) { loop.currentTime = 0; loop.play(); loop.volume = volumeControl.value * 0.3; }

  for (const key in winSounds) {
    const sound = winSounds[key];
    if (sound instanceof Audio) {
      if (!sound.paused && sound.currentTime > 0) fadeOutAudio(sound);
      else { sound.pause(); sound.currentTime = 0; }
    }
  }

  const data = await loadEdition(file);
  document.getElementById("edition-title").textContent = data.edition;
  injectSEOContent(data.cards);

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
    card.dataset.cardName = cardData.name; // human-readable name for display
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
    // Disable native dragging
    card.ondragstart = (e) => e.preventDefault();
    card.addEventListener("click", flipCard);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
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
    if (!isMuted) { flipSound.currentTime = 0; flipSound.play(); }
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
    const feedbackEl = document.getElementById("match-feedback");
    // Show match feedback
    feedbackEl.textContent = `Matched: ${c1.dataset.cardName}`;
    feedbackEl.style.opacity = 1;
    // Fade out after 3 seconds
    setTimeout(() => {
    feedbackEl.style.opacity = 0;}, 3000);
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
// Parallax (Mobile-Safe)
// ==========================

// Detect mobile reliably
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

let parallaxX = 0, parallaxY = 0, parallaxFrameId = null;

function updateParallax(xF, yF) {
  const layers = document.querySelectorAll(".layer");
  layers.forEach((layer, idx) => {
    layer.style.transform = `translate(${xF*(idx+1)*10}px, ${yF*(idx+1)*10}px)`;
  });
}

function requestParallaxUpdate() {
  if (parallaxFrameId) return;
  parallaxFrameId = requestAnimationFrame(() => {
    updateParallax(parallaxX, parallaxY);
    parallaxFrameId = null;
  });
}

// ✅ Desktop = Parallax ON
if (!isMobile) {
  document.addEventListener("mousemove", e => {
    parallaxX = (e.clientX / window.innerWidth - 0.5) * 2;
    parallaxY = (e.clientY / window.innerHeight - 0.5) * 2;
    requestParallaxUpdate();
  });
}

// ✅ Mobile = Parallax OFF (no touchmove listener, no lag)


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
  setVolume(volumeControl.value); // ✅ Now runs after user gesture — Safari allows it
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
    .then(module => {
      const confetti = module;
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    })
    .catch(err => console.error('Confetti failed to load:', err));
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
    emoji.style.left = `${Math.random()*100}%`;
    emoji.style.fontSize = `${1.5+Math.random()}rem`;
    emoji.style.animationDuration = `${3+Math.random()*4}s`;
    document.body.appendChild(emoji);
    setTimeout(() => emoji.remove(), parseFloat(emoji.style.animationDuration)*1000);
  }
}

// Prevent users from dragging cards and exposing other cards
gameBoard.addEventListener("dragstart", e => e.preventDefault());


