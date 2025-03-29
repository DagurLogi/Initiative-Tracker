// ====================
// Type Definitions
// ====================
interface StatusEffect {
  name: string;
  roundsRemaining: number;
  description?: string;
}

interface CombatantMember {
  id?: number;
  name: string;
  hp?: number;
  maxHp?: number;
  currentHp: number;
  ac?: number;
  passivePerception?: number;
  statblock?: any;
  conditions?: string[];
}

interface Combatant {
  id?: number;
  name: string;
  initiative: number;
  hp?: number;
  maxHp?: number;
  currentHp: number;
  ac?: number;
  passivePerception?: number;
  type?: 'player' | 'monster';
  statblock?: any;
  statusEffects?: StatusEffect[];
  members?: CombatantMember[];
  dex?: number;
}

// ====================
// DOM Element References
// ====================
const tracker = document.getElementById('initiativeList') as HTMLElement;
const title = document.getElementById('encounterTitle')?.querySelector('span');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const roundDisplay = document.getElementById('roundCounter');
const turnDisplay = document.getElementById('turnCounter');
const loadingDisplay = document.getElementById('loading');
const errorDisplay = document.getElementById('error');
const modal = document.getElementById('statModal') as HTMLElement;
const modalContent = document.getElementById('modalContent') as HTMLElement;
const modalClose = document.getElementById('modalClose');

// Throw errors for critical missing elements
if (!tracker) throw new Error('initiativeList element not found');
if (!modal) throw new Error('statModal element not found');
if (!modalContent) throw new Error('modalContent element not found');

// ====================
// State Management
// ====================
const battleState = {
  combatants: [] as Combatant[],
  currentIndex: 0,
  round: 1,
  turnCounter: 1,
  
  initCombatants(data: { initiative: Combatant[] }) {
    this.combatants = data.initiative.map(c => {
      const baseCombatant: Combatant = {
        ...c,
        currentHp: c.hp || c.maxHp || 0,
        statusEffects: c.statusEffects || [],
      };

      if (c.members) {
        baseCombatant.members = c.members.map(m => ({
          ...m,
          currentHp: m.hp || m.maxHp || 0
        }));
      }

      return baseCombatant;
    });
  },

  get currentCombatant(): Combatant | undefined {
    return this.combatants[this.currentIndex];
  },

  

  nextTurn() {
    this.currentIndex++;
    if (this.currentIndex >= this.combatants.length) {
      this.currentIndex = 0;
      this.round++;
      this.turnCounter++;
      this.updateStatusEffects();
    }
    this.render();
  },

  previousTurn() {
    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = Math.max(0, this.combatants.length - 1);
      this.round = Math.max(1, this.round - 1);
      this.turnCounter = Math.max(1, this.turnCounter - 1);
    }
    this.render();
  },

  updateStatusEffects() {
    this.combatants.forEach(combatant => {
      if (!combatant.statusEffects) return;
      
      combatant.statusEffects = combatant.statusEffects
        .map(effect => ({
          ...effect,
          roundsRemaining: effect.roundsRemaining - 1
        }))
        .filter(effect => effect.roundsRemaining > 0);
    });
  },

  render() {
    if (roundDisplay) {
      roundDisplay.textContent = `Round ${this.round}`;
    }
    if (turnDisplay) {
      turnDisplay.textContent = `Turn ${this.turnCounter}`;
    }
    

    tracker.innerHTML = this.combatants.map((combatant, index) => {
      const isActive = index === this.currentIndex;

      return `
        <div class="combatant-card ${isActive ? 'active' : ''}">
          ${this.renderCombatantHeader(combatant)}
          ${this.renderCombatantDetails(combatant)}
          ${this.renderStatusEffects(combatant)}
        </div>
      `;
    }).join('');

    this.setupEventListeners();
  },

  renderCombatantHeader(combatant: Combatant) {
    return `
      <div class="combatant-header">
        <h3>${combatant.name}</h3>
        <span>Init: ${combatant.initiative}</span>
      </div>
    `;
  },

  renderCombatantDetails(combatant: Combatant) {
    if (combatant.members) {
      return combatant.members.map((member, i) => this.renderGroupMember(combatant, member, i)).join('');
    }
    return this.renderSingleCombatant(combatant);
  },

  renderGroupMember(group: Combatant, member: CombatantMember, index: number) {
    const maxHp = Number.isFinite(member.hp) ? member.hp : 
                 Number.isFinite(member.maxHp) ? member.maxHp : '';
    const currentHp = Number.isFinite(member.currentHp) ? member.currentHp : maxHp || '';
    
    return `
      <div class="combatant-details">
        <strong>${group.name} ${index + 1}</strong> | 
        AC: ${member.ac ?? '?'} |
        HP: <input type="number" value="${currentHp}" min="0" max="${maxHp}" 
             data-group="${group.name}" data-index="${index}" class="hp-input" /> / ${maxHp} |
        PP: ${member.passivePerception ?? '?'}
        <button class="show-stats" data-id="${group.id}">📜 Stats</button>
      </div>
    `;
  },

  renderSingleCombatant(combatant: Combatant) {
    const maxHp = Number.isFinite(combatant.hp) ? combatant.hp : 
                 Number.isFinite(combatant.maxHp) ? combatant.maxHp : '';
    const currentHp = Number.isFinite(combatant.currentHp) ? combatant.currentHp : maxHp || '';
    const ac = combatant.ac ?? '?';
    const pp = combatant.passivePerception ?? '?';
    
    return `
      <div class="combatant-details">
        AC: ${ac} |
        HP: <input type="number" value="${currentHp}" min="0" max="${maxHp}" 
             data-name="${combatant.name}" class="hp-input" /> / ${maxHp} |
        PP: ${pp}
        <button class="show-stats" data-id="${combatant.id}">📜 Stats</button>
      </div>
    `;
  },

  renderStatusEffects(combatant: Combatant) {
    if (!combatant.statusEffects?.length) return '';
    
    return `
      <div class="status-effects">
        ${combatant.statusEffects.map(effect => 
          `<span class="status-badge" title="${effect.description || ''}">
            ${effect.name} (${effect.roundsRemaining})
          </span>`
        ).join('')}
      </div>
    `;
  },

  setupEventListeners() {
    document.querySelectorAll('.hp-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const value = parseInt(target.value);
        const name = target.dataset.name;
        const group = target.dataset.group;
        const index = target.dataset.index ? parseInt(target.dataset.index) : undefined;

        if (group !== undefined && index !== undefined) {
          const groupEntry = this.combatants.find(c => c.name === group);
          if (groupEntry?.members?.[index]) {
            groupEntry.members[index].currentHp = value;
          }
        } else if (name) {
          const entry = this.combatants.find(c => c.name === name);
          if (entry) entry.currentHp = value;
        }
      });
    });

    document.querySelectorAll('.show-stats').forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const id = target.dataset.id;
        if (!id) return;
        
        const combatant = this.combatants.find(c => c.id?.toString() === id) || 
                         this.combatants.flatMap(c => c.members || [])
                           .find(m => m.id?.toString() === id);
        
        if (combatant?.statblock) {
          openStatModal(combatant);
        } else {
          openModal('<p>No statblock available for this creature.</p>');
        }
      });
    });
  }
};

// ====================
// Modal Functions
// ====================
function openStatModal(combatant: Combatant | CombatantMember) {
  if (!combatant.statblock) {
    console.error('No statblock available');
    return;
  }
  
  const statblock = combatant.statblock;
  modalContent.innerHTML = `
    <h3>${combatant.name}</h3>
    <div class="statblock">
      <p><strong>AC:</strong> ${statblock['Armor Class']}</p>
      <p><strong>HP:</strong> ${statblock['Hit Points']}</p>
      <p><strong>Speed:</strong> ${statblock['Speed']}</p>
      <div class="abilities">
        <strong>Abilities:</strong>
        <div>STR: ${statblock['STR']} (${statblock['STR_mod']})</div>
        <div>DEX: ${statblock['DEX']} (${statblock['DEX_mod']})</div>
        <div>CON: ${statblock['CON']} (${statblock['CON_mod']})</div>
        <div>INT: ${statblock['INT']} (${statblock['INT_mod']})</div>
        <div>WIS: ${statblock['WIS']} (${statblock['WIS_mod']})</div>
        <div>CHA: ${statblock['CHA']} (${statblock['CHA_mod']})</div>
      </div>
      ${statblock['Traits'] ? `<p><strong>Traits:</strong> ${statblock['Traits']}</p>` : ''}
      ${statblock['Actions'] ? `<p><strong>Actions:</strong> ${statblock['Actions']}</p>` : ''}
    </div>
  `;
  modal.classList.remove('hidden');
}

function openModal(content: string) {
  modalContent.innerHTML = content;
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

// ====================
// Utility Functions
// ====================
function showLoading() {
  loadingDisplay?.classList.remove('hidden');
  errorDisplay?.classList.add('hidden');
}

function showError(message: string) {
  if (errorDisplay) {
    errorDisplay.textContent = message;
    errorDisplay.classList.remove('hidden');
  }
  loadingDisplay?.classList.add('hidden');
}

function hideStatusMessages() {
  loadingDisplay?.classList.add('hidden');
  errorDisplay?.classList.add('hidden');
}

// ====================
// Initialization
// ====================
function initializeApp() {
  // Setup modal close button
  modalClose?.addEventListener('click', closeModal);
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  // Navigation buttons
  nextBtn?.addEventListener('click', () => battleState.nextTurn());
  prevBtn?.addEventListener('click', () => battleState.previousTurn());
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') battleState.nextTurn();
    if (e.code === 'ArrowLeft') battleState.previousTurn();
  });

  loadEncounterData();
}

async function loadEncounterData() {
  showLoading();
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const encounterId = urlParams.get('id');
    
    if (!encounterId || !title) {
      throw new Error('Missing encounter ID or title element');
    }

    const response = await fetch(`/api/encounter/${encounterId}`);
    if (!response.ok) {
      throw new Error(`Failed to load encounter: ${response.status}`);
    }
    
    const data = await response.json();
    title.textContent = `${data.name} vs Party #${data.party_id}`;
    battleState.initCombatants(data);
    battleState.render();
    hideStatusMessages();
    
  } catch (error) {
    console.error('Battle initialization failed:', error);
    showError(error instanceof Error ? error.message : 'Failed to load battle data');
    
    if (tracker) {
      tracker.innerHTML = `
        <div class="error-message">
          <a href="/" class="button">← Return Home</a>
        </div>
      `;
    }
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);