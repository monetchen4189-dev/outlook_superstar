const jumpCount = document.querySelector('#jumpCount');
const pointCount = document.querySelector('#pointCount');
const goalPercent = document.querySelector('#goalPercent');
const goalBar = document.querySelector('#goalBar');
const startSession = document.querySelector('#startSession');
const feedPet = document.querySelector('#feedPet');
const dressPet = document.querySelector('#dressPet');
const pet = document.querySelector('#demoPet');
const petHat = document.querySelector('#petHat');
const petMood = document.querySelector('#petMood');
const cheerMessage = document.querySelector('#cheerMessage');

const state = {
  jumps: 0,
  points: 0,
  goal: 100,
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
  if (state.points < 10) {
    celebratePet('Jump more to earn 10 points for a snack.');
    return;
  }

  state.points -= 10;
  render();
  celebratePet('Yum! Your pet feels stronger.');
});

dressPet.addEventListener('click', () => {
  if (state.points < 20) {
    celebratePet('Earn 20 points to dress up your pet.');
    return;
  }

  state.points -= 20;
  render();
  petHat.classList.add('is-wearing');
  celebratePet('Nice cap! Your pet is ready to hop.');
});

document.querySelectorAll('[data-friend]').forEach((button) => {
  button.addEventListener('click', () => {
    const friend = button.dataset.friend;
    cheerMessage.textContent = `You cheered ${friend}! Keep jumping together.`;
  });
});

window.addEventListener('pagehide', stopSession);
render();
