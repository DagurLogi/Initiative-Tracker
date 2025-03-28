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
  
      renderTracker();
      updateRoundDisplay();
    } catch (err) {
      console.error('❌ Failed to fetch encounter data:', err);
      tracker.innerHTML = '<p>Failed to load battle data.</p>';
    }
  
    function renderTracker() {
      if (tracker) {
        tracker.innerHTML = '';
      }
      combatants.forEach((entry, index) => {
        const div = document.createElement('div');
        div.className = 'combatant' + (index === currentIndex ? ' active' : '');
        div.innerHTML = `<strong>${entry.name}</strong> <span style="float:right">(Init ${entry.initiative})</span>`;
        if (tracker) {
          tracker.appendChild(div);
        }
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