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

  function saveEncounterState() {
    if (!encounterId) return;
    fetch(`/api/encounter/${encounterId}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updatedInitiative: combatants })
    }).catch(err => console.error('Failed to save encounter state:', err));
  }

  function updateStatusEffects() {
    combatants.forEach(c => {
      if (!c.statusEffects) return;
      c.statusEffects = c.statusEffects
        .map(e => ({ ...e, roundsRemaining: e.roundsRemaining - 1 }))
        .filter(e => e.roundsRemaining > 0);
    });
  }

  function getOrdinal(n) {
    if (n === "1") return "st";
    if (n === "2") return "nd";
    if (n === "3") return "rd";
    return "th";
  }

  function renderSpellSlots(combatant) {
    const slots = combatant.statblock?.spellSlots;
    if (!slots) return '';

    const entries = Object.entries(slots);
    const left = entries.slice(0, 5).map(([level, data]) => `
      <li data-name="${combatant.name}" data-level="${level}">
        <span>${level}${getOrdinal(level)}:</span>
        <button class="slot-minus" aria-label="Use slot">−</button>
        ${data.used} / ${data.max}
        <button class="slot-plus" aria-label="Restore slot">+</button>
      </li>
    `).join('');

    const right = entries.slice(5).map(([level, data]) => `
      <li data-name="${combatant.name}" data-level="${level}">
        <span>${level}${getOrdinal(level)}:</span>
        <button class="slot-minus" aria-label="Use slot">−</button>
        ${data.used} / ${data.max}
        <button class="slot-plus" aria-label="Restore slot">+</button>
      </li>
    `).join('');

    return `
      <div class="spell-slot-wrapper">
        <button class="toggle-spell-slots" data-name="${combatant.name}">🧙‍♂️ Spell Slots</button>
        <div class="spell-slots hidden" id="spell-slots-${combatant.name.replace(/\s+/g, '-')}">
          <strong>Spell Slots</strong>
          <div class="slot-columns">
            <ul class="slot-list left-column">${left}</ul>
            <ul class="slot-list right-column">${right}</ul>
          </div>
        </div>
      </div>
    `;
  }

  function renderLegendaryTrackers(combatant) {
    const actions = combatant.statblock?.legendaryActions;
    const resistances = combatant.statblock?.legendaryResistances;
    if (!actions && !resistances) return '';
  
    const actionHTML = actions ? `
      <div class="legendary-actions">
        <strong>Legendary Actions:</strong>
        <button class="legendary-minus" data-name="${combatant.name}">−</button>
        ${actions.used} / ${actions.max}
        <button class="legendary-plus" data-name="${combatant.name}">+</button>
      </div>` : '';
  
    const resistanceHTML = resistances ? `
      <div class="legendary-resistances">
        <strong>Legendary Resistances:</strong>
        <button class="resistance-minus" data-name="${combatant.name}">−</button>
        ${resistances.used} / ${resistances.max}
        <button class="resistance-plus" data-name="${combatant.name}">+</button>
      </div>` : '';
  
    return `
      <div class="legendary-wrapper">
        ${actionHTML}
        ${resistanceHTML}
      </div>`;
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
            ${renderSpellSlots(c)}
            ${c.isConcentrating ? `<span class="status-badge concentration-badge">Concentrating</span>` : ''}
              <label class="concentration-toggle">
                <input type="checkbox" class="concentration-checkbox" data-name="${c.name}" ${c.isConcentrating ? 'checked' : ''}>
                Concentrating
              </label>
            ${renderLegendaryTrackers(c)}


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
        const c = combatants.find(x => x.name === name);
        if (c) {
          c.currentHp = value;
          c.isDead = value <= 0;
          if (value <= 0) {
            c.isConcentrating = false;
          }
          const openPanels = Array.from(document.querySelectorAll('.spell-slots:not(.hidden)')).map(p => p.id);
          const activeButtons = Array.from(document.querySelectorAll('.toggle-spell-slots.active')).map(b => b.getAttribute('data-name'));
          const openStatblocks = Array.from(document.querySelectorAll('.statblock-section:not(.hidden)')).map(sb => sb.id);

          renderCombatants();
          saveEncounterState();

          // Restore spell slots
          openPanels.forEach(id => {
            const panel = document.getElementById(id);
            if (panel) panel.classList.remove('hidden');
          });
          activeButtons.forEach(name => {
            const btn = document.querySelector(`.toggle-spell-slots[data-name="${name}"]`);
            if (btn) btn.classList.add('active');
          });

          // ✅ Restore statblock open state
          openStatblocks.forEach(id => {
            const block = document.getElementById(id);
            if (block) block.classList.remove('hidden');
          });

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
    
    
    document.querySelectorAll('.toggle-spell-slots').forEach(btn => {
      btn.addEventListener('click', e => {
        // 🛑 Prevent toggling if clicking a child like a slot button
        if (!e.currentTarget || e.target !== e.currentTarget) return;
    
        const name = btn.getAttribute('data-name');
        if (!name) return;
    
        const wrapper = document.querySelector(`#spell-slots-${name.replace(/\s+/g, '-')}`);
        if (wrapper) {
          wrapper.classList.toggle('hidden');
          btn.classList.toggle('active');
        }
      });
    });
    
    

    document.querySelectorAll('.slot-plus').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
    
        const li = btn.closest('li');
        if (!li) return;
    
        const name = li.dataset.name;
        const level = li.dataset.level;
        const c = combatants.find(x => x.name === name);
        if (!level || !c?.statblock?.spellSlots?.[level]) return;
    
        const spell = c.statblock.spellSlots[level];
    
        if (spell.used < spell.max) {
          spell.used++;
    
          const openPanels = Array.from(document.querySelectorAll('.spell-slots:not(.hidden)')).map(p => p.id);
          const activeButtons = Array.from(document.querySelectorAll('.toggle-spell-slots.active')).map(b => b.getAttribute('data-name'));
          const openStatblocks = Array.from(document.querySelectorAll('.statblock-section:not(.hidden)')).map(sb => sb.id);

          renderCombatants();
          saveEncounterState();

          // Restore spell slots
          openPanels.forEach(id => {
            const panel = document.getElementById(id);
            if (panel) panel.classList.remove('hidden');
          });
          activeButtons.forEach(name => {
            const btn = document.querySelector(`.toggle-spell-slots[data-name="${name}"]`);
            if (btn) btn.classList.add('active');
          });

          // ✅ Restore statblock open state
          openStatblocks.forEach(id => {
            const block = document.getElementById(id);
            if (block) block.classList.remove('hidden');
          });

        }
      });
    });
    

    document.querySelectorAll('.slot-minus').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
    
        const li = btn.closest('li');
        if (!li) return;
    
        const name = li.dataset.name;
        const level = li.dataset.level;
        const c = combatants.find(x => x.name === name);
        if (!level || !c?.statblock?.spellSlots?.[level]) return;
    
        const spell = c.statblock.spellSlots[level];
    
        if (spell.used > 0) {
          spell.used--;
    
          const openPanels = Array.from(document.querySelectorAll('.spell-slots:not(.hidden)')).map(p => p.id);
          const activeButtons = Array.from(document.querySelectorAll('.toggle-spell-slots.active')).map(b => b.getAttribute('data-name'));
          const openStatblocks = Array.from(document.querySelectorAll('.statblock-section:not(.hidden)')).map(sb => sb.id);
          
          renderCombatants();
          saveEncounterState();
          
          // Restore spell slots
          openPanels.forEach(id => {
            const panel = document.getElementById(id);
            if (panel) panel.classList.remove('hidden');
          });
          activeButtons.forEach(name => {
            const btn = document.querySelector(`.toggle-spell-slots[data-name="${name}"]`);
            if (btn) btn.classList.add('active');
          });
          
          // ✅ Restore statblock open state
          openStatblocks.forEach(id => {
            const block = document.getElementById(id);
            if (block) block.classList.remove('hidden');
          });
          
        }
      });
    });
    
    document.querySelectorAll('.concentration-checkbox').forEach(box => {
      box.addEventListener('change', e => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const name = target.dataset.name;
        const combatant = combatants.find(c => c.name === name);
        if (!combatant) return;
    
        combatant.isConcentrating = target.checked;
    
        const openPanels = Array.from(document.querySelectorAll('.spell-slots:not(.hidden)')).map(p => p.id);
        const activeButtons = Array.from(document.querySelectorAll('.toggle-spell-slots.active')).map(b => b.getAttribute('data-name'));
        const openStatblocks = Array.from(document.querySelectorAll('.statblock-section:not(.hidden)')).map(sb => sb.id);
        
        renderCombatants();
        saveEncounterState();
        
        // Restore spell slots
        openPanels.forEach(id => {
          const panel = document.getElementById(id);
          if (panel) panel.classList.remove('hidden');
        });
        activeButtons.forEach(name => {
          const btn = document.querySelector(`.toggle-spell-slots[data-name="${name}"]`);
          if (btn) btn.classList.add('active');
        });
        
        // ✅ Restore statblock open state
        openStatblocks.forEach(id => {
          const block = document.getElementById(id);
          if (block) block.classList.remove('hidden');
        });
        
      });
    });
    
    
    
    
// LEGENDARY ACTION TRACKERS
document.querySelectorAll('.legendary-plus').forEach(btn => {
  btn.addEventListener('click', () => {
    const btnElement = /** @type {HTMLElement} */ (btn);
const name = btnElement.dataset.name;

    const c = combatants.find(x => x.name === name);
    if (c?.statblock?.legendaryActions && c.statblock.legendaryActions.used < c.statblock.legendaryActions.max) {
      c.statblock.legendaryActions.used++;
      const openPanels = Array.from(document.querySelectorAll('.spell-slots:not(.hidden)')).map(p => p.id);
      const activeButtons = Array.from(document.querySelectorAll('.toggle-spell-slots.active')).map(b => b.getAttribute('data-name'));
      const openStatblocks = Array.from(document.querySelectorAll('.statblock-section:not(.hidden)')).map(sb => sb.id);
      
      renderCombatants();
      saveEncounterState();
      
      // Restore spell slots
      openPanels.forEach(id => {
        const panel = document.getElementById(id);
        if (panel) panel.classList.remove('hidden');
      });
      activeButtons.forEach(name => {
        const btn = document.querySelector(`.toggle-spell-slots[data-name="${name}"]`);
        if (btn) btn.classList.add('active');
      });
      
      // ✅ Restore statblock open state
      openStatblocks.forEach(id => {
        const block = document.getElementById(id);
        if (block) block.classList.remove('hidden');
      });
      
    }
  });
});

document.querySelectorAll('.legendary-minus').forEach(btn => {
  btn.addEventListener('click', () => {
    const btnElement = /** @type {HTMLElement} */ (btn);
const name = btnElement.dataset.name;

    const c = combatants.find(x => x.name === name);
    if (c?.statblock?.legendaryActions && c.statblock.legendaryActions.used > 0) {
      c.statblock.legendaryActions.used--;
      const openPanels = Array.from(document.querySelectorAll('.spell-slots:not(.hidden)')).map(p => p.id);
const activeButtons = Array.from(document.querySelectorAll('.toggle-spell-slots.active')).map(b => b.getAttribute('data-name'));
const openStatblocks = Array.from(document.querySelectorAll('.statblock-section:not(.hidden)')).map(sb => sb.id);

renderCombatants();
saveEncounterState();

// Restore spell slots
openPanels.forEach(id => {
  const panel = document.getElementById(id);
  if (panel) panel.classList.remove('hidden');
});
activeButtons.forEach(name => {
  const btn = document.querySelector(`.toggle-spell-slots[data-name="${name}"]`);
  if (btn) btn.classList.add('active');
});

// ✅ Restore statblock open state
openStatblocks.forEach(id => {
  const block = document.getElementById(id);
  if (block) block.classList.remove('hidden');
});

    }
  });
});

// LEGENDARY RESISTANCE TRACKERS
document.querySelectorAll('.resistance-plus').forEach(btn => {
  btn.addEventListener('click', () => {
    const btnElement = /** @type {HTMLElement} */ (btn);
const name = btnElement.dataset.name;

    const c = combatants.find(x => x.name === name);
    if (c?.statblock?.legendaryResistances && c.statblock.legendaryResistances.used < c.statblock.legendaryResistances.max) {
      c.statblock.legendaryResistances.used++;
      const openPanels = Array.from(document.querySelectorAll('.spell-slots:not(.hidden)')).map(p => p.id);
const activeButtons = Array.from(document.querySelectorAll('.toggle-spell-slots.active')).map(b => b.getAttribute('data-name'));
const openStatblocks = Array.from(document.querySelectorAll('.statblock-section:not(.hidden)')).map(sb => sb.id);

renderCombatants();
saveEncounterState();

// Restore spell slots
openPanels.forEach(id => {
  const panel = document.getElementById(id);
  if (panel) panel.classList.remove('hidden');
});
activeButtons.forEach(name => {
  const btn = document.querySelector(`.toggle-spell-slots[data-name="${name}"]`);
  if (btn) btn.classList.add('active');
});

// ✅ Restore statblock open state
openStatblocks.forEach(id => {
  const block = document.getElementById(id);
  if (block) block.classList.remove('hidden');
});

    }
  });
});

document.querySelectorAll('.resistance-minus').forEach(btn => {
  btn.addEventListener('click', () => {
    const btnElement = /** @type {HTMLElement} */ (btn);
const name = btnElement.dataset.name;

    const c = combatants.find(x => x.name === name);
    if (c?.statblock?.legendaryResistances && c.statblock.legendaryResistances.used > 0) {
      c.statblock.legendaryResistances.used--;
      const openPanels = Array.from(document.querySelectorAll('.spell-slots:not(.hidden)')).map(p => p.id);
const activeButtons = Array.from(document.querySelectorAll('.toggle-spell-slots.active')).map(b => b.getAttribute('data-name'));
const openStatblocks = Array.from(document.querySelectorAll('.statblock-section:not(.hidden)')).map(sb => sb.id);

renderCombatants();
saveEncounterState();

// Restore spell slots
openPanels.forEach(id => {
  const panel = document.getElementById(id);
  if (panel) panel.classList.remove('hidden');
});
activeButtons.forEach(name => {
  const btn = document.querySelector(`.toggle-spell-slots[data-name="${name}"]`);
  if (btn) btn.classList.add('active');
});

// ✅ Restore statblock open state
openStatblocks.forEach(id => {
  const block = document.getElementById(id);
  if (block) block.classList.remove('hidden');
});

    }
  });
});

  }

  function renderTracker() {
    if (roundDisplay) roundDisplay.textContent = `Round ${round}`;
    if (turnDisplay) turnDisplay.textContent = `Turn ${turnCounter}`;
    renderCombatants();
  }


  function nextTurn() {
    currentIndex++;
    turnCounter++;
  
    if (currentIndex >= combatants.length) {
      currentIndex = 0;
      round++;
      updateStatusEffects();
    }
  
    // ✅ Reset legendary actions for the current combatant
    const current = combatants[currentIndex];
    if (current?.statblock?.legendaryActions) {
      current.statblock.legendaryActions.used = 0;
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
          isDead: c.currentHp <= 0,
          isConcentrating: c.isConcentrating ?? false,
        };
      });
      
      
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
