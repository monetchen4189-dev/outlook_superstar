const jumpCount = document.querySelector('#jumpCount');
const pointCount = document.querySelector('#pointCount');
const goalPercent = document.querySelector('#goalPercent');
const goalBar = document.querySelector('#goalBar');
const startSession = document.querySelector('#startSession');
const feedPet = document.querySelector('#feedPet');
const dressPet = document.querySelector('#dressPet');
const pet = document.querySelector('#demoPet');
const foodBite = document.querySelector('#foodBite');
const petMood = document.querySelector('#petMood');
const cheerMessage = document.querySelector('#cheerMessage');

const outfits = [
  { className: 'outfit-sporty', label: 'a blue sport shirt' },
  { className: 'outfit-hoodie', label: 'an orange hoodie and cap' },
  { className: 'outfit-star', label: 'a star cape and bow' },
  { className: 'outfit-cozy', label: 'a green outfit and scarf' },
];

const foods = [
  { className: 'food-carrot', label: 'a crunchy carrot' },
  { className: 'food-strawberry', label: 'a sweet strawberry' },
  { className: 'food-cookie', label: 'a tiny cookie' },
  { className: 'food-leaf', label: 'a green veggie leaf' },
];

const state = {
  jumps: 0,
  points: 0,
  goal: 100,
  outfitIndex: -1,
  foodIndex: -1,
  running: false,
  timer: null,
};

function render() {
  const percent = Math.min(100, Math.round((state.jumps / state.goal) * 100));
  jumpCount.textContent = String(state.jumps);
  pointCount.textContent = String(state.points);
  goalPercent.textContent = `${percent}%`;
  goalBar.style.width = `${percent}%`;
}

function celebratePet(message) {
  petMood.textContent = message;
  pet.classList.remove('is-happy');
  window.requestAnimationFrame(() => pet.classList.add('is-happy'));
}

function addJump(amount = 4) {
  state.jumps += amount;
  state.points += amount;
  render();
}

function dressUpPet() {
  state.outfitIndex = (state.outfitIndex + 1) % outfits.length;
  const outfit = outfits[state.outfitIndex];
  outfits.forEach(({ className }) => pet.classList.remove(className));
  pet.classList.add(outfit.className);
  return outfit;
}

function feedPetSnack() {
  state.foodIndex = (state.foodIndex + 1) % foods.length;
  const food = foods[state.foodIndex];
  foods.forEach(({ className }) => foodBite.classList.remove(className));
  foodBite.classList.remove('is-feeding');
  foodBite.classList.add(food.className);
  void foodBite.offsetWidth;
  foodBite.classList.add('is-feeding');
  return food;
}

function stopSession() {
  state.running = false;
  startSession.textContent = 'Start';
  window.clearInterval(state.timer);
  state.timer = null;
}

startSession.addEventListener('click', () => {
  if (state.running) {
    stopSession();
    return;
  }

  state.running = true;
  startSession.textContent = 'Pause';
  addJump();
  state.timer = window.setInterval(addJump, 650);
});

feedPet.addEventListener('click', () => {
  const hasEnoughPoints = state.points >= 10;
  if (hasEnoughPoints) {
    state.points -= 10;
  }

  render();
  const food = feedPetSnack();
  const rewardText = hasEnoughPoints ? 'You used 10 points.' : 'Free snack demo.';
  celebratePet(`${rewardText} Sunny Bunny ate ${food.label}.`);
});

dressPet.addEventListener('click', () => {
  const hasEnoughPoints = state.points >= 20;
  if (hasEnoughPoints) {
    state.points -= 20;
  }

  render();
  const outfit = dressUpPet();
  const rewardText = hasEnoughPoints ? 'You used 20 points.' : 'Free try-on for the demo.';
  celebratePet(`${rewardText} Your pet is wearing ${outfit.label}.`);
});

document.querySelectorAll('[data-friend]').forEach((button) => {
  button.addEventListener('click', () => {
    const friend = button.dataset.friend;
    cheerMessage.textContent = `You cheered ${friend}! Keep jumping together.`;
  });
});

window.addEventListener('pagehide', stopSession);
render();
