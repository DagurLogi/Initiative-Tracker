// public/battle.js

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const encounterId = urlParams.get('id');
  const tracker = document.getElementById('initiativeList');
  const title = document.getElementById('encounterTitle')?.querySelector('span');
  const roundDisplay = document.getElementById('roundCounter');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');

  let combatants = [];
  let currentIndex = 0;
  let round = 1;

  if (!encounterId || !tracker || !title) {
    console.error('❌ Missing required elements or encounter ID.');
    return;
  }

  try {
    const res = await fetch(`/api/encounter/${encounterId}`);
    const data = await res.json();

    title.textContent = `${data.name} vs Party #${data.party_id}`;
    combatants = data.initiative;

    // Sort initiative on load
    combatants.sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      if ((b.dex || 0) !== (a.dex || 0)) return (b.dex || 0) - (a.dex || 0);
      if ((a.type || 'player') === 'player' && (b.type || 'monster') === 'monster') return -1;
      if ((a.type || 'player') === 'monster' && (b.type || 'player') === 'player') return 1;
      return Math.random() < 0.5 ? -1 : 1;
    });

    renderTracker();
    updateRoundDisplay();
  } catch (err) {
    console.error('❌ Failed to fetch encounter data:', err);
    tracker.innerHTML = '<p>Failed to load battle data.</p>';
  }

  function renderTracker() {
    if (!tracker) return;
    tracker.innerHTML = '';

    combatants.forEach((entry, index) => {
      const div = document.createElement('div');
      div.className = 'combatant-card' + (index === currentIndex ? ' active' : '');

      // Optional fallback stats for visual display
      const ac = entry.ac ?? '?';
      const maxHp = entry.hp ?? '?';
      const currentHp = entry.currentHp ?? entry.hp ?? '?';
      const pp = entry.passivePerception ?? '?';

      div.innerHTML = `
        <div class="combatant-header">
          <span><strong>${entry.name}</strong></span>
          <span>(Init ${entry.initiative})</span>
        </div>
        <div class="combatant-details">
          AC: ${ac} |
          HP: ${currentHp} / ${maxHp} |
          PP: ${pp}
        </div>
      `;

      tracker.appendChild(div);
    });
  }

  function updateRoundDisplay() {
    if (roundDisplay) {
      roundDisplay.textContent = `Round ${round}`;
    }
  }

  nextBtn?.addEventListener('click', () => {
    currentIndex++;
    if (currentIndex >= combatants.length) {
      currentIndex = 0;
      round++;
    }
    renderTracker();
    updateRoundDisplay();
  });

  prevBtn?.addEventListener('click', () => {
    currentIndex--;
    if (currentIndex < 0) {
      currentIndex = combatants.length - 1;
      round = Math.max(1, round - 1);
    }
    renderTracker();
    updateRoundDisplay();
  });
});
