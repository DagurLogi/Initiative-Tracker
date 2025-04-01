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

  function rememberUIState() {
    return {
      openPanels: Array.from(document.querySelectorAll('.spell-slots:not(.hidden)')).map(p => p.id),
      activeButtons: Array.from(document.querySelectorAll('.toggle-spell-slots.active')).map(b => b.getAttribute('data-name')),
      openStatblocks: Array.from(document.querySelectorAll('.statblock-section:not(.hidden)')).map(sb => sb.id),
      openLegendaryPanels: Array.from(document.querySelectorAll('.legendary-description:not(.hidden)')).map(div => div.id),
      activeLegendaryToggles: Array.from(document.querySelectorAll('.toggle-legendary-actions.active')).map(b => b.getAttribute('data-name'))
    };
  }
  
  
  function restoreUIState(state) {
    state.openPanels.forEach(id => {
      const panel = document.getElementById(id);
      if (panel) panel.classList.remove('hidden');
    });
  
    state.activeButtons.forEach(name => {
      const btn = document.querySelector(`.toggle-spell-slots[data-name="${name}"]`);
      if (btn) btn.classList.add('active');
    });
  
    state.openStatblocks.forEach(id => {
      const block = document.getElementById(id);
      if (block) block.classList.remove('hidden');
    });
  
    state.openLegendaryPanels.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });
  
    state.activeLegendaryToggles.forEach(name => {
      const btn = document.querySelector(`.toggle-legendary-actions[data-name="${name}"]`);
      if (btn) btn.classList.add('active');
    });
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
      body: JSON.stringify({
        updatedInitiative: combatants,
        currentRound: round,
        currentTurnIndex: currentIndex,
        totalTurns: turnCounter
      })
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
    
      const legendaryDesc = combatant.statblock?.legendary_actions; // HTML string
      const actionsDescriptionHTML = legendaryDesc ? `
        <div class="legendary-description-toggle">
          <button class="toggle-legendary-actions" data-name="${combatant.name}">📜 Show Actions</button>
          <div class="legendary-description hidden" id="legendary-desc-${combatant.name.replace(/\s+/g, '-')}">
            ${legendaryDesc}
          </div>
        </div>
      ` : '';

      return `
      <div class="legendary-wrapper">
        ${actionHTML}
        ${resistanceHTML}
        ${actionsDescriptionHTML}
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
            <h3 class="combatant-toggle" data-name="${c.name}">
              ${c.name} ${c.isConcentrating ? '👑' : ''}
            </h3>

            <span>Init: ${c.initiative}</span>
          </div>
          <div class="combatant-details">
            AC: ${c.ac ?? '?'} |
            HP: <button class="hp-clickable" data-name="${c.name}" type="button">${c.currentHp}</button> / ${c.maxHp ?? '?'} |
 |
            PP: ${c.passivePerception ?? '?'}
          </div>
          <div class="status-effects">
            ${(c.statusEffects || []).map(e =>
              `<span class="status-badge" title="${e.description || ''}">${e.name} (${e.roundsRemaining})</span>`
            ).join('')}
            ${renderSpellSlots(c)}
              <label class="concentration-toggle">
                <input type="checkbox" class="concentration-checkbox" data-name="${c.name}" ${c.isConcentrating ? 'checked' : ''}>
                Concentrating
              </label>
            ${renderLegendaryTrackers(c)}


          </div>
          <div class="statblock-section hidden" id="statblock-${c.name.replace(/\s+/g, '-')}">
           <div class="statblock">
            <p><strong>Name:</strong> ${c.name}</p>
            <p><strong>AC:</strong> ${sb.armor_class ?? '?'}</p>
            <p><strong>HP:</strong> ${sb.hit_points ?? '?'}</p>
            <p><strong>Speed:</strong> ${sb.speed ?? '?'}</p>
            <p><strong>Type:</strong> ${sb.type ?? '?'} | <strong>Size:</strong> ${sb.size ?? '?'} | <strong>Alignment:</strong> ${sb.alignment ?? '?'}</p>
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
    
          const uiState = rememberUIState();
          renderCombatants();
          saveEncounterState();
          restoreUIState(uiState);
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
    
          const uiState = rememberUIState();
          renderCombatants();
          saveEncounterState();
          restoreUIState(uiState);
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
    
        const uiState = rememberUIState();
          renderCombatants();
          saveEncounterState();
          restoreUIState(uiState);
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
          const uiState = rememberUIState();
          renderCombatants();
          saveEncounterState();
          restoreUIState(uiState);
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
            const uiState = rememberUIState();
            renderCombatants();
            saveEncounterState();
            restoreUIState(uiState);
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
            const uiState = rememberUIState();
            renderCombatants();
            saveEncounterState();
            restoreUIState(uiState);

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
            const uiState = rememberUIState();
            renderCombatants();
            saveEncounterState();
            restoreUIState(uiState);
    }
  });
});

      document.querySelectorAll('.toggle-legendary-actions').forEach(btn => {
        btn.addEventListener('click', () => {
          const btnElement = /** @type {HTMLElement} */ (btn);
            const name = btnElement.dataset.name;
          const desc = document.getElementById(`legendary-desc-${(name ?? '').replace(/\s+/g, '-')}`);
          if (desc) desc.classList.toggle('hidden');
          const uiState = rememberUIState();
          renderCombatants();
          saveEncounterState();
          restoreUIState(uiState);

        });
      });

      setupHpHandlers();

  }

  function setupHpHandlers() {
    const popup = document.getElementById('hp-popup');
    const form = document.getElementById('hp-form');
    const amountInput = document.getElementById('hp-amount');
    const hiddenTarget = document.getElementById('hp-target');
    
    // ✅ Show popup when clicking current HP
    document.querySelectorAll('.hp-clickable').forEach(span => {
      span.addEventListener('click', e => {
        const target = e.currentTarget;
        if (!(target instanceof HTMLElement)) return;
        const name = target.dataset.name;
        if (!name) return;
  
        if (amountInput instanceof HTMLInputElement) amountInput.value = '';
        if (form instanceof HTMLFormElement) {
          const hpModes = form.elements['hpMode'];
          if (hpModes instanceof RadioNodeList) {
            [...hpModes].forEach(input => {
              if (input instanceof HTMLInputElement) {
                input.checked = input.value === 'damage';
              }
              
            });
          }
        }
  
        if (hiddenTarget instanceof HTMLInputElement) {
          hiddenTarget.value = name;
        }
        // Position popup near the clicked HP
        if (popup) {
          const rect = target.getBoundingClientRect();
          popup.style.top = `${rect.bottom + window.scrollY}px`;
          popup.style.left = `${rect.left + window.scrollX}px`;
          popup.classList.remove('hidden');
        }
      });
    });
  
    // ✅ Handle form submission
    if (form instanceof HTMLFormElement) {
      form.addEventListener('submit', e => {
        e.preventDefault();
  
        const amount = amountInput instanceof HTMLInputElement ? parseInt(amountInput.value) : NaN;
        const name = hiddenTarget instanceof HTMLInputElement ? hiddenTarget.value : null;
  
        let mode = 'damage';
        const hpModes = form.elements['hpMode'];
        if (hpModes instanceof RadioNodeList) {
          [...hpModes].forEach(input => {
            if (input instanceof HTMLInputElement && input.checked) {
              mode = input.value;
            }
          });
        }
  
        const combatant = combatants.find(c => c.name === name);
        if (!combatant || isNaN(amount)) return;
  
        if (mode === 'damage') {
          combatant.currentHp = Math.max(0, combatant.currentHp - amount);
          if (combatant.currentHp === 0) {
            combatant.isDead = true;
            combatant.isConcentrating = false;
          }
        } else {
          combatant.currentHp = Math.min(combatant.maxHp, combatant.currentHp + amount);
          combatant.isDead = false;
        }
  
        const uiState = rememberUIState();
        renderCombatants();
        saveEncounterState();
        restoreUIState(uiState);
  
        if (popup) popup.classList.add('hidden');
      });
    }
    const closeBtn = document.getElementById('close-hp-popup');
    if (closeBtn) {
closeBtn.addEventListener('click', () => {
  if (popup) popup.classList.add('hidden');

  const uiState = rememberUIState();
      renderCombatants();
      saveEncounterState();
      restoreUIState(uiState);

});
}
}
  
  function renderTracker() {
    if (roundDisplay) roundDisplay.textContent = `Round ${round}`;
    if (turnDisplay) turnDisplay.textContent = `Turn ${turnCounter}`;
    renderCombatants();
  }


  function nextTurn() {
    const uiState = rememberUIState();
  
    currentIndex++;
    turnCounter++;
  
    if (currentIndex >= combatants.length) {
      currentIndex = 0;
      round++;
      updateStatusEffects();
    }
  
    const current = combatants[currentIndex];
    if (current?.statblock?.legendaryActions) {
      current.statblock.legendaryActions.used = 0;
    }
  
    renderTracker();
    saveEncounterState();
    restoreUIState(uiState);
  }
  
  

  function previousTurn() {
    const uiState = rememberUIState();
  
    currentIndex--;
    if (currentIndex < 0) {
      currentIndex = combatants.length - 1;
      round = Math.max(1, round - 1);
    }
  
    turnCounter = Math.max(1, turnCounter - 1);
    renderTracker();
    saveEncounterState(); 
    restoreUIState(uiState);
  }
  
  

  async function loadEncounterData() {
    showLoading();
    try {
      const params = new URLSearchParams(window.location.search);
      encounterId = params.get('id');
      if (!encounterId) throw new Error('Missing encounter ID');

      const res = await fetch(`/api/encounter/${encounterId}`);
      encounterData = await res.json();
      
      round = encounterData.current_round ?? 1;
      currentIndex = encounterData.current_turn_index ?? 0;
      turnCounter = currentIndex + 1;
      turnCounter = encounterData.total_turns ?? (encounterData.current_turn_index + 1);

      combatants = encounterData.initiative.map(c => {
        const sb = c.statblock || {};
        if (sb.legendary_actions && !sb.legendaryActions) {
          const match = sb.legendary_actions.match(/take\s+(\d+)/i);
          const max = match ? parseInt(match[1]) : 3;
          sb.legendaryActions = { max, used: 0 };
        }
      
        if (sb.traits?.includes('Legendary Resistance') && !sb.legendaryResistances) {
          const match = sb.traits.match(/Legendary Resistance \((\d+)/i);
          const max = match ? parseInt(match[1]) : 3;
          sb.legendaryResistances = { max, used: 0 };
        }
        return {
          ...c,
          ac: c.ac ?? extractFirstNumber(sb.armor_class),
          maxHp: c.maxHp ?? extractFirstNumber(sb.hit_points),
          currentHp: c.currentHp ?? extractFirstNumber(sb.hit_points) ?? 0,
          passivePerception: c.passivePerception ?? extractPassivePerception(sb.senses),
          statusEffects: c.statusEffects ?? [],
          isDead: c.currentHp <= 0,
          isConcentrating: c.isConcentrating ?? false,
          statblock: sb
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
