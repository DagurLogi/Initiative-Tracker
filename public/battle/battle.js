// @ts-ignore
const DOMPurify = window.DOMPurify;

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
  
  function getCardClass(c) {
    let cardClass = '';
    if (c.isPlayer) cardClass += 'player-card ';
    if (c.statblock?.legendaryActions || c.statblock?.legendaryResistances) cardClass += 'legendary-card ';
    if (c.isSpecial) cardClass += 'special-card ';
    return cardClass.trim();
  }
  
  function getHealthBarColor(current, max) {
    const percent = (current / max) * 100;
    if (percent >= 76) return 'green';
    if (percent >= 51) return 'yellow';
    if (percent >= 26) return 'orange';
    if (percent >= 1) return 'red';
    return 'gray';
  }

  function renderDeathSaves(c) {
    const isDying = c.isPlayer && c.currentHp === 0 && !c.isDead && !c.deathSaves?.stable;
    if (!isDying) return '';
  
    const renderBoxes = (type, filledCount, symbol, color) => {
      return `
        <div><strong>${type}:</strong> ${[...Array(3)].map((_, i) => `
          <span class="death-box ${type.toLowerCase()}-box ${i < filledCount ? 'filled' : ''}" data-name="${c.name}" data-type="${type.toLowerCase()}" data-index="${i}" style="color: ${i < filledCount ? color : 'inherit'}">
            ${i < filledCount ? symbol : '[ ]'}
          </span>
        `).join('')}</div>
      `;
    };
  
    return `
      <div class="death-saves">
        ${renderBoxes('Success', c.deathSaves.successes, '✔️', 'green')}
        ${renderBoxes('Failures', c.deathSaves.failures, '❌', 'red')}
      </div>
    `;
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
          ${DOMPurify.sanitize(legendaryDesc)}

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

  function getCardClass(c) {
    let cardClass = '';
    if (c.isPlayer) cardClass += 'player-card ';
    if (c.statblock?.legendaryActions || c.statblock?.legendaryResistances) cardClass += 'legendary-card ';
    if (c.isSpecial) cardClass += 'special-card ';
    return cardClass.trim();
  }

  function renderCombatants() {
    if (!tracker) return;
    tracker.innerHTML = combatants.map((c, index) => {
      const active = index === currentIndex;
      const sb = c.statblock || {};
      const maxHp = c.maxHp || 1;
      const currentHp = Math.max(0, c.currentHp);
      const percent = Math.min(100, (currentHp / maxHp) * 100);
      const healthColor = getHealthBarColor(currentHp, maxHp);
      const isDying = c.isPlayer && currentHp === 0 && !c.isDead && !c.deathSaves?.stable;
      const cardClass = `${getCardClass(c)} ${isDying ? 'dying-card' : ''}`;
      const isCritical = currentHp > 0 && (currentHp / maxHp) <= 0.1;
  
      

      return `
        <div class="combatant-card ${cardClass} ${active ? 'active' : ''} ${c.isDead ? 'dead' : ''}">
          <div class="combatant-header">
            <div class="header-left">
              <h3>
                <span class="editable-name" data-name="${c.name}">
                  ${c.displayName}
                </span>
                <button class="edit-name-btn" title="Edit name" data-name="${c.name}">✏️</button>
                <button class="toggle-statblock-btn" data-name="${c.name}">📖</button>
                ${isDying ? '<span class="heartbeat-icon">💓</span>' : ''}
              </h3>
              <div class="initiative">Init: ${c.naturalOne ? 'Natural 1' : c.initiative}</div>
            </div>
            <div class="header-right">
              ${c.isConcentrating ? '👑' : ''}
              ${c.deathSaves?.stable ? '🛌' : ''}
            </div>
          </div>

          <div class="combatant-details">
            AC: ${c.ac ?? '?'} |
            HP: <button class="hp-clickable" data-name="${c.name}" type="button">${currentHp}</button> / ${maxHp ?? '?'} |
            PP: ${c.passivePerception ?? '?'}
          </div>
          
          <div class="health-bar-container">
            <div class="health-bar ${isCritical ? 'critical-glow' : ''}" style="width: ${percent}%; background-color: ${healthColor};"></div>
          </div>

          ${renderDeathSaves(c)}

          <div class="status-effects">
            ${(c.statusEffects || []).map(e =>
              `<span class="status-badge" title="${e.description || ''}">${e.name} (${e.roundsRemaining})</span>`
            ).join('')}
            <button class="mark-special-btn" data-name="${c.name}">${c.isSpecial ? 'Unmark Special' : 'Mark Special'}</button>
            <label class="concentration-toggle">
              <input 
                type="checkbox" 
                class="concentration-checkbox" 
                data-name="${c.name}" 
                ${c.isConcentrating ? 'checked' : ''}
                ${isDying ? 'disabled' : ''}
              >
              Concentrating
            </label>
            ${renderSpellSlots(c)}

            ${renderLegendaryTrackers(c)}
          </div>

          <div class="statblock-section hidden" id="statblock-${c.name.replace(/\s+/g, '-')}">
            <div class="statblock">
             <p><strong>Name:</strong> ${(c.basename ?? c.name).replace(/\s+\d+$/, '')}</p>
             ${c.nickname ? `<p><strong>Nickname:</strong> ${c.nickname}</p>` : ''}
              <p><strong>AC:</strong> ${sb.armor_class ?? '?'}</p>
              <p><strong>HP:</strong> ${sb.hit_points ?? '?'}</p>
              <p><strong>Speed:</strong> ${sb.speed ?? '?'}</p>
              ${(() => {
                let type = '?', size = '?', alignment = '?';
                if (sb.meta) {
                  const match = sb.meta.match(/^(.*?)\s+(\w+),\s+(.+)$/);
                  if (match) {
                    size = match[1];
                    type = match[2].charAt(0).toUpperCase() + match[2].slice(1);
                    alignment = match[3];
                  }
                }
                return `<p><strong>Type:</strong> ${type} | <strong>Size:</strong> ${size} | <strong>Alignment:</strong> ${alignment}</p>`;
              })()}
              
              <div class="abilities">
                <div class="ability-row labels">
                  <span>STR</span><span>DEX</span><span>CON</span>
                  <span>INT</span><span>WIS</span><span>CHA</span>
                </div>
                <div class="ability-row values">
                  <span>${sb.stats?.STR ?? '?'}</span><span>${sb.stats?.DEX ?? '?'}</span><span>${sb.stats?.CON ?? '?'}</span>
                  <span>${sb.stats?.INT ?? '?'}</span><span>${sb.stats?.WIS ?? '?'}</span><span>${sb.stats?.CHA ?? '?'}</span>
                </div>
                <div class="ability-row modifiers">
                  <span>${sb.stats?.STR_mod ?? ''}</span><span>${sb.stats?.DEX_mod ?? ''}</span><span>${sb.stats?.CON_mod ?? ''}</span>
                  <span>${sb.stats?.INT_mod ?? ''}</span><span>${sb.stats?.WIS_mod ?? ''}</span><span>${sb.stats?.CHA_mod ?? ''}</span>
                </div>
              </div>

              ${sb.traits ? `<p><strong>Traits:</strong> ${sb.traits}</p>` : ''}
              ${sb.actions ? `<p><strong>Actions:</strong> ${sb.actions}</p>` : ''}
            </div>
          </div>
        </div>
      `;

    }).join('');

     // Editing name behavior
     document.querySelectorAll('.edit-name-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const name = /** @type {HTMLElement} */ (btn).dataset.name;
        const span = document.querySelector(`.editable-name[data-name="${name}"]`);
        if (span) {
          span.setAttribute('contenteditable', 'true');
          /** @type {HTMLElement} */ (span).style.backgroundColor = 'white';
          /** @type {HTMLElement} */ (span).focus();
        }
      });
    });

    document.querySelectorAll('.editable-name').forEach(span => {
      span.addEventListener('blur', e => {
        finishEditing(/** @type {HTMLElement} */ (span));
      });
    
      span.addEventListener('keydown', e => {
        const ke = /** @type {KeyboardEvent} */ (e);
        const el = /** @type {HTMLElement} */ (span);
    
        if (ke.key === 'Enter') {
          ke.preventDefault(); // Prevent line break
          el.blur(); // Triggers the blur event which saves and exits editing
        }
      });
    });
    
    
    function finishEditing(span) {
      span.setAttribute('contenteditable', 'false');
      span.style.backgroundColor = 'transparent';
      const newName = span.textContent.trim();
      const oldName = span.dataset.name;
      const combatant = combatants.find(c => c.name === oldName);
    
      if (combatant && newName && newName !== oldName) {
        combatant.nickname = newName;
        combatant.displayName = newName;
    
        if (!combatant.basename) {
          combatant.basename = oldName;
        }
      }
    
      // ✅ Reset to default display name if nickname is removed
      if (combatant && !combatant.nickname) {
        combatant.displayName = combatant.name;
      }
    
      renderCombatants();
      renderTracker({ scroll: false });
      saveEncounterState();
    }
 
    document.querySelectorAll('.toggle-statblock-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation(); // Prevent bubbling if needed
        const name = /** @type {HTMLElement} */ (btn).dataset.name;
        const block = document.getElementById(`statblock-${(name ?? '').replace(/\s+/g, '-')}`);
        if (block) toggleStatblock(block);
      });
    });
    
    document.querySelectorAll('.mark-special-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        const c = combatants.find(c => c.name === name);
        if (c) {
          c.isSpecial = !c.isSpecial;
          const uiState = rememberUIState();
          renderCombatants();
          saveEncounterState();
          restoreUIState(uiState);
        }
      });
    });
    
  
    document.querySelectorAll('.death-box').forEach(box => {
      box.addEventListener('click', () => {
        const element = /** @type {HTMLElement} */ (box);
        const name = element.dataset.name;
        const type = element.dataset.type;
        const index = parseInt(element.dataset.index || '0');
    
        const c = combatants.find(x => x.name === name);
        if (!c || !c.deathSaves) return;
    
        const key = type === 'success' ? 'successes' : 'failures';
        const count = c.deathSaves[key];
    
        if (element.classList.contains('filled')) {
          c.deathSaves[key] = index;
        } else {
          c.deathSaves[key] = index + 1;
        }
    
        if (c.deathSaves.successes >= 3) {
          c.deathSaves.stable = true;
        } else if (c.deathSaves.failures >= 3) {
          c.isDead = true;
        }
    
        renderCombatants();
        saveEncounterState();
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
      if (span.classList.contains('hp-handler-attached')) return;
    
      span.classList.add('hp-handler-attached');
    
      span.addEventListener('click', e => {
        const target = e.currentTarget;
        if (!(target instanceof HTMLElement)) return;
        const name = target.dataset.name;
        if (!name) return;
    
        if (amountInput instanceof HTMLInputElement) {
          amountInput.value = '';
        }
    
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
    
        if (popup) {
          const rect = target.getBoundingClientRect();
          popup.style.top = `${rect.bottom + window.scrollY}px`;
          popup.style.left = `${rect.left + window.scrollX}px`;
          popup.classList.remove('hidden');
        }
      });
    });
    
    
    // ✅ Handle form submission — only once!
    if (form instanceof HTMLFormElement && !form.classList.contains('submit-handler-attached')) {
      form.classList.add('submit-handler-attached');

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

        const currentHp = parseInt(combatant.currentHp) || 0;
        const maxHp = parseInt(combatant.maxHp) || 0;

        let newHp = currentHp;

        if (mode === 'damage') {
          newHp = Math.max(0, currentHp - amount);
        
          if (newHp === 0) {
            if (combatant.isPlayer) {
              if (!combatant.deathSaves) {
                combatant.deathSaves = {
                  successes: 0,
                  failures: 0,
                  stable: false
                };
              }
              // Don't mark as dead — they're in the dying state
            } else {
              combatant.isDead = true;
            }
        
            combatant.isConcentrating = false;
          }
        } else {
          newHp = Math.min(maxHp, currentHp + amount);
          combatant.isDead = false;
        
          // ✅ Clear death save progress on heal
          if (combatant.deathSaves) {
            combatant.deathSaves = {
              successes: 0,
              failures: 0,
              stable: false
            };
          }
        }
        
        

        combatant.currentHp = newHp;
        if (combatant.currentHp === 0) {
          combatant.isConcentrating = false;
        }
        console.log(`[HP Update] ${combatant.name}: ${currentHp} → ${combatant.currentHp}`);

        const uiState = rememberUIState();
        renderCombatants();
        saveEncounterState();
        restoreUIState(uiState);

        if (popup) popup.classList.add('hidden');
      });
    }

    const closeBtn = document.getElementById('close-hp-popup');
    if (closeBtn && !closeBtn.classList.contains('close-handler-attached')) {
      closeBtn.classList.add('close-handler-attached');

      closeBtn.addEventListener('click', () => {
        if (popup) popup.classList.add('hidden');

        const uiState = rememberUIState();
        renderCombatants();
        saveEncounterState();
        restoreUIState(uiState);
      });
    }
}
  
function renderTracker({ scroll = true } = {}) {
  if (roundDisplay) roundDisplay.textContent = `Round ${round}`;
  if (turnDisplay) turnDisplay.textContent = `Turn ${turnCounter}`;
  renderCombatants();

  // ✅ Scroll only if requested
  if (scroll) scrollToActiveCombatant();

  // ✅ Update the "It's [Name]'s Turn" display
  const currentTurnSpan = document.getElementById('currentTurnName');
  const currentCombatant = combatants[currentIndex];
  if (currentTurnSpan && currentCombatant) {
    currentTurnSpan.textContent = `${currentCombatant.name}'s Turn`;
    currentTurnSpan.title = currentCombatant.name;
    currentTurnSpan.onclick = () => {
      scrollToActiveCombatant();
    };
  }
}


function scrollToActiveCombatant() {
  const activeCard = document.querySelector('.combatant-card.active');
  if (activeCard) {
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
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
        return {
          ...c,
          ac: c.ac ?? extractFirstNumber(sb.armor_class),
          maxHp: c.maxHp ?? extractFirstNumber(sb.hit_points),
          currentHp: c.currentHp ?? extractFirstNumber(sb.hit_points) ?? 0,
          passivePerception: c.passivePerception ?? extractPassivePerception(sb.senses),
          statusEffects: c.statusEffects ?? [],
          isDead: c.isDead ?? false,
          isConcentrating: c.isConcentrating ?? false,
          isPlayer: c.type === 'player',
          statblock: sb,
          displayName: c.nickname || c.name  // ✅ New field for display
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
      const activeElement = document.activeElement;
  
      const isTyping =
        activeElement instanceof HTMLElement &&
        (activeElement.isContentEditable ||
         ['INPUT', 'TEXTAREA'].includes(activeElement.tagName));
  
      if (isTyping) return;
  
      if (e.code === 'Space') {
        e.preventDefault(); // prevent scroll
        nextTurn();
      }
  
      if (e.code === 'ArrowLeft') {
        previousTurn();
      }
    });
  
    loadEncounterData();
    // 🛈 Tooltip modal toggle only
    const modal = document.getElementById('battleInfoModal');
    const dismissBtn = document.getElementById('dismissModal');
    const tooltipBtn = document.getElementById('tooltipInfoBtn');

    dismissBtn?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    tooltipBtn?.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
  });
  
})();
