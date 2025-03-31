(function () {
  const tracker = document.getElementById('initiativeList');
  const title = document.getElementById('encounterTitle')?.querySelector('span');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const roundDisplay = document.getElementById('roundCounter');
  const turnDisplay = document.getElementById('turnCounter');
  const loadingDisplay = document.getElementById('loading');
  const errorDisplay = document.getElementById('error');

  let encounterId = null;
  let encounterData = null;
  let combatants = [];
  let currentIndex = 0;
  let round = 1;
  let turnCounter = 1;

  function extractFirstNumber(value) {
    if (typeof value === 'string') {
      const match = value.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    }
    return typeof value === 'number' ? value : null;
  }
  
  function extractPassivePerception(senses) {
    if (typeof senses === 'string') {
      const match = senses.match(/Passive Perception\s+(\d+)/i);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  }

  function showLoading() {
    loadingDisplay?.classList.remove('hidden');
    errorDisplay?.classList.add('hidden');
  }

  function hideLoading() {
    loadingDisplay?.classList.add('hidden');
  }

  function showError(msg) {
    if (errorDisplay) {
      errorDisplay.textContent = msg;
      errorDisplay.classList.remove('hidden');
    }
  }

  function toggleStatblock(element) {
    element.classList.toggle('hidden');
  }

  function updateStatusEffects() {
    combatants.forEach(c => {
      if (!c.statusEffects) return;
      c.statusEffects = c.statusEffects
        .map(e => ({
          ...e,
          roundsRemaining: e.roundsRemaining - 1
        }))
        .filter(e => e.roundsRemaining > 0);
    });
  }

  function renderCombatants() {
    if (!tracker) return;
    tracker.innerHTML = combatants.map((c, index) => {
      const active = index === currentIndex;
      const sb = c.statblock || {};
      return `
        <div class="combatant-card ${active ? 'active' : ''} ${c.isDead ? 'dead' : ''}">
          <div class="combatant-header">
            <h3 class="combatant-toggle" data-name="${c.name}">${c.name}</h3>
            <span>Init: ${c.initiative}</span>
          </div>
          <div class="combatant-details">
            AC: ${c.ac ?? '?'} |
            HP: <input type="number" value="${c.currentHp}" data-name="${c.name}" class="hp-input" /> / ${c.maxHp ?? '?'} |
            PP: ${c.passivePerception ?? '?'}
          </div>
          <div class="status-effects">
            ${(c.statusEffects || []).map(e =>
              `<span class="status-badge" title="${e.description || ''}">${e.name} (${e.roundsRemaining})</span>`
            ).join('')}
          </div>
          <div class="statblock-section hidden" id="statblock-${c.name.replace(/\s+/g, '-')}">
            <div class="statblock">
              <p><strong>AC:</strong> ${sb.armor_class ?? '?'}</p>
              <p><strong>HP:</strong> ${sb.hit_points ?? '?'}</p>
              <p><strong>Speed:</strong> ${sb.speed ?? '?'}</p>
              <div class="abilities">
                STR: ${sb.stats?.STR ?? '?'} (${sb.stats?.STR_mod ?? ''}), 
                DEX: ${sb.stats?.DEX ?? '?'} (${sb.stats?.DEX_mod ?? ''}), 
                CON: ${sb.stats?.CON ?? '?'} (${sb.stats?.CON_mod ?? ''}), 
                INT: ${sb.stats?.INT ?? '?'} (${sb.stats?.INT_mod ?? ''}), 
                WIS: ${sb.stats?.WIS ?? '?'} (${sb.stats?.WIS_mod ?? ''}), 
                CHA: ${sb.stats?.CHA ?? '?'} (${sb.stats?.CHA_mod ?? ''})
              </div>
              ${sb.traits ? `<p><strong>Traits:</strong> ${sb.traits}</p>` : ''}
              ${sb.actions ? `<p><strong>Actions:</strong> ${sb.actions}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.hp-input').forEach(input => {
      input.addEventListener('change', e => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        if (!target) return;
    
        const value = parseInt(target.value);
        const name = target.dataset.name;
        const combatant = combatants.find(c => c.name === name);
        if (combatant) {
          combatant.currentHp = value;
          combatant.isDead = value <= 0;
          renderCombatants(); // re-render for visual feedback
        }
      });
    });
    

    document.querySelectorAll('.combatant-toggle').forEach(header => {
      header.addEventListener('click', e => {
        const target = /** @type {HTMLElement} */ (e.currentTarget);
        const name = target.dataset.name;
        const block = document.getElementById(`statblock-${(name ?? '').replace(/\s+/g, '-')}`);
        if (block) toggleStatblock(block);
      });
    });
    
  }

  function nextTurn() {
    currentIndex++;
    if (currentIndex >= combatants.length) {
      currentIndex = 0;
      round++;
      turnCounter++;
      updateStatusEffects();
    }
    renderTracker();
  }

  function previousTurn() {
    currentIndex--;
    if (currentIndex < 0) {
      currentIndex = combatants.length - 1;
      round = Math.max(1, round - 1);
    }
    turnCounter = Math.max(1, turnCounter - 1);
    renderTracker();
  }

  function renderTracker() {
    if (roundDisplay) roundDisplay.textContent = `Round ${round}`;
    if (turnDisplay) turnDisplay.textContent = `Turn ${turnCounter}`;
    renderCombatants();
  }

  async function loadEncounterData() {
    showLoading();
    try {
      const params = new URLSearchParams(window.location.search);
      encounterId = params.get('id');
      if (!encounterId) throw new Error('Missing encounter ID');

      const res = await fetch(`/api/encounter/${encounterId}`);
      encounterData = await res.json();
      combatants = encounterData.initiative.map(c => {
        const sb = c.statblock || {};
        return {
          ...c,
          ac: c.ac ?? extractFirstNumber(sb.armor_class),
          maxHp: c.maxHp ?? extractFirstNumber(sb.hit_points),
          currentHp: c.currentHp ?? extractFirstNumber(sb.hit_points) ?? 0,
          passivePerception: c.passivePerception ?? extractPassivePerception(sb.senses),

          statusEffects: c.statusEffects ?? [],
          isDead: c.currentHp <= 0
        };
      });
      
      // ✅ Sort by initiative descending (highest goes first)
      combatants.sort((a, b) => b.initiative - a.initiative);
      

      const partyRes = await fetch(`/api/party/${encounterData.party_id}`);
      const partyData = await partyRes.json();
      if (title) title.textContent = `${encounterData.name} vs ${partyData.name}`;
      renderTracker();
      hideLoading();
    } catch (err) {
      console.error(err);
      showError('Failed to load battle data');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    nextBtn?.addEventListener('click', nextTurn);
    prevBtn?.addEventListener('click', previousTurn);
    document.addEventListener('keydown', e => {
      if (e.code === 'Space') nextTurn();
      if (e.code === 'ArrowLeft') previousTurn();
    });
    loadEncounterData();
  });
})();
