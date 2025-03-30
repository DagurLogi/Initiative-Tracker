"use strict";
// ====================
// DOM Element References
// ====================
const tracker = document.getElementById('initiativeList');
const title = document.getElementById('encounterTitle')?.querySelector('span');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const roundDisplay = document.getElementById('roundCounter');
const turnDisplay = document.getElementById('turnCounter');
const loadingDisplay = document.getElementById('loading');
const errorDisplay = document.getElementById('error');
const modal = document.getElementById('statModal');
const modalContent = document.getElementById('modalContent');
const modalClose = document.getElementById('modalClose');
function extractFirstNumber(value) {
    if (typeof value === 'string') {
        const match = value.match(/\d+/);
        return match ? parseInt(match[0]) : null;
    }
    return typeof value === 'number' ? value : null;
}
if (!tracker)
    throw new Error('initiativeList element not found');
if (!modal)
    throw new Error('statModal element not found');
if (!modalContent)
    throw new Error('modalContent element not found');
let encounterId = null;
// ====================
// Battle State
// ====================
const battleState = {
    combatants: [],
    currentIndex: 0,
    round: 1,
    turnCounter: 1,
    battleLength: 1,
    encounterId: null,
    async initFromServer(encounterId) {
        this.encounterId = encounterId; // Set encounterId when initializing from server
        const res = await fetch(`/api/battle/${encounterId}`);
        if (res.ok) {
            const state = await res.json();
            this.combatants = state.combatants;
            this.currentIndex = state.currentIndex;
            this.round = state.round;
            // Set the battle length from the server state
            this.battleLength = state.battleLength ?? 1;
            // Initialize turnCounter properly
            this.turnCounter = state.turnCounter ?? 1;
            // Check if combatants are valid and adjust
            if (state?.combatants && Array.isArray(state.combatants)) {
                this.combatants = state.combatants;
                this.currentIndex = state.currentIndex ?? 0;
                this.round = state.round ?? 1;
            }
            else {
                throw new Error('Invalid battle state from server');
            }
        }
        else {
            console.log("⚠️ No existing battle found. Initializing new one...");
            // Initialize new battle from encounter data
            const initResponse = await fetch(`/api/encounter/${encounterId}`);
            const data = await initResponse.json();
            this.combatants = data.initiative.map((c) => {
                const statblock = c.statblock || {};
                return {
                    ...c,
                    ac: c.ac ?? extractFirstNumber(statblock['Armor Class']) ?? undefined,
                    hp: c.hp ?? extractFirstNumber(statblock['Hit Points']) ?? undefined,
                    maxHp: c.maxHp ?? (extractFirstNumber(statblock['Hit Points']) ?? undefined),
                    passivePerception: c.passivePerception ?? (extractFirstNumber(statblock['Passive Perception']) ?? undefined),
                    currentHp: c.hp ?? extractFirstNumber(statblock['Hit Points']) ?? c.maxHp ?? 0,
                    statusEffects: [],
                    members: c.members?.map((m) => ({
                        ...m,
                        currentHp: m.hp ?? m.maxHp ?? extractFirstNumber(statblock['Hit Points']) ?? 0,
                        ac: m.ac ?? (extractFirstNumber(statblock['Armor Class']) ?? undefined),
                        maxHp: m.maxHp ?? (extractFirstNumber(statblock['Hit Points']) ?? undefined),
                        passivePerception: m.passivePerception ?? (extractFirstNumber(statblock['Passive Perception']) ?? undefined),
                        statblock: m.statblock || statblock
                    })) || []
                };
            });
            this.currentIndex = 0;
            this.round = 1;
            this.battleLength = 1; // Initialize battleLength to 1 when starting fresh
            this.turnCounter = 1; // Initialize turnCounter to 1 when starting fresh
        }
        this.render();
    },
    async persistState() {
        if (!this.encounterId)
            return; // Make sure encounterId is not null
        await fetch('/api/battle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                encounterId: parseInt(this.encounterId), // Use encounterId here
                combatants: this.combatants,
                currentIndex: this.currentIndex,
                round: this.round,
                turnCounter: this.turnCounter,
                battleLength: this.battleLength // Include battleLength
            })
        });
    },
    get currentCombatant() {
        return this.combatants[this.currentIndex];
    },
    nextTurn() {
        this.currentIndex++;
        if (this.currentIndex >= this.combatants.length) {
            this.currentIndex = 0;
            this.round++;
            this.turnCounter++;
            this.battleLength++; // Increase battle length when moving to the next turn
            this.updateStatusEffects();
        }
        this.persistState(); // Persist the new battle state
        this.render();
    },
    previousTurn() {
        this.currentIndex--;
        if (this.currentIndex < 0) {
            this.currentIndex = Math.max(0, this.combatants.length - 1);
            this.round = Math.max(1, this.round - 1);
        }
        this.turnCounter = Math.max(1, this.turnCounter - 1);
        this.battleLength--; // Decrease battle length when moving to the previous turn
        this.persistState(); // Persist the new battle state
        this.render();
    },
    updateStatusEffects() {
        this.combatants.forEach(combatant => {
            if (!combatant.statusEffects)
                return;
            combatant.statusEffects = combatant.statusEffects.map(effect => ({
                ...effect,
                roundsRemaining: effect.roundsRemaining - 1
            })).filter(effect => effect.roundsRemaining > 0);
        });
    },
    render() {
        roundDisplay.textContent = `Round ${this.round}`;
        turnDisplay.textContent = `Turn ${this.turnCounter}`;
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
    renderCombatantHeader(combatant) {
        return `
      <div class="combatant-header">
        <h3>${combatant.name}</h3>
        <span>Init: ${combatant.initiative}</span>
      </div>
    `;
    },
    renderCombatantDetails(combatant) {
        if (combatant.members) {
            return combatant.members.map((member, i) => this.renderGroupMember(combatant, member, i)).join('');
        }
        return this.renderSingleCombatant(combatant);
    },
    renderGroupMember(group, member, index) {
        return `
      <div class="combatant-details">
        <strong>${group.name} ${index + 1}</strong> |
        AC: ${member.ac ?? '?'} |
        HP: <input type="number" value="${member.currentHp}" data-group="${group.name}" data-index="${index}" class="hp-input" /> / ${member.maxHp ?? '?'} |
        PP: ${member.passivePerception ?? '?'}
        <button class="show-stats" data-id="${group.id}">📜 Stats</button>
      </div>
    `;
    },
    renderSingleCombatant(combatant) {
        return `
      <div class="combatant-details">
        AC: ${combatant.ac ?? '?'} |
        HP: <input type="number" value="${combatant.currentHp}" data-name="${combatant.name}" class="hp-input" /> / ${combatant.maxHp ?? '?'} |
        PP: ${combatant.passivePerception ?? '?'}
        <button class="show-stats" data-id="${combatant.id}">📜 Stats</button>
      </div>
    `;
    },
    renderStatusEffects(combatant) {
        if (!combatant.statusEffects?.length)
            return '';
        return `
      <div class="status-effects">
        ${combatant.statusEffects.map(effect => `<span class="status-badge" title="${effect.description || ''}">
            ${effect.name} (${effect.roundsRemaining})
          </span>`).join('')}
      </div>
    `;
    },
    setupEventListeners() {
        document.querySelectorAll('.hp-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target;
                const value = parseInt(target.value);
                const name = target.dataset.name;
                const group = target.dataset.group;
                const index = target.dataset.index ? parseInt(target.dataset.index) : undefined;
                if (group && index !== undefined) {
                    const groupEntry = this.combatants.find(c => c.name === group);
                    if (groupEntry?.members?.[index]) {
                        groupEntry.members[index].currentHp = value;
                    }
                }
                else if (name) {
                    const entry = this.combatants.find(c => c.name === name);
                    if (entry)
                        entry.currentHp = value;
                }
                this.persistState();
            });
        });
        document.querySelectorAll('.show-stats').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target;
                const id = target.dataset.id;
                const combatant = this.combatants.find(c => c.id?.toString() === id) ||
                    this.combatants.flatMap(c => c.members || []).find(m => m.id?.toString() === id);
                if (combatant?.statblock)
                    openStatModal(combatant);
                else
                    openModal('<p>No statblock available.</p>');
            });
        });
    }
};
function openStatModal(combatant) {
    if (!combatant.statblock)
        return;
    const sb = combatant.statblock;
    modalContent.innerHTML = `
    <h3>${combatant.name}</h3>
    <div class="statblock">
      <p><strong>AC:</strong> ${sb['Armor Class']}</p>
      <p><strong>HP:</strong> ${sb['Hit Points']}</p>
      <p><strong>Speed:</strong> ${sb['Speed']}</p>
      <div class="abilities">
        STR: ${sb['STR']} (${sb['STR_mod']}), DEX: ${sb['DEX']} (${sb['DEX_mod']}), CON: ${sb['CON']} (${sb['CON_mod']}), INT: ${sb['INT']} (${sb['INT_mod']}), WIS: ${sb['WIS']} (${sb['WIS_mod']}), CHA: ${sb['CHA']} (${sb['CHA_mod']})
      </div>
      ${sb['Traits'] ? `<p><strong>Traits:</strong> ${sb['Traits']}</p>` : ''}
      ${sb['Actions'] ? `<p><strong>Actions:</strong> ${sb['Actions']}</p>` : ''}
    </div>
  `;
    modal.classList.remove('hidden');
}
function openModal(content) {
    modalContent.innerHTML = content;
    modal.classList.remove('hidden');
}
function closeModal() {
    modal.classList.add('hidden');
}
function showLoading() {
    loadingDisplay?.classList.remove('hidden');
    errorDisplay?.classList.add('hidden');
}
function showError(message) {
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
function initializeApp() {
    modalClose?.addEventListener('click', closeModal);
    window.addEventListener('click', e => { if (e.target === modal)
        closeModal(); });
    nextBtn?.addEventListener('click', () => battleState.nextTurn());
    prevBtn?.addEventListener('click', () => battleState.previousTurn());
    document.addEventListener('keydown', e => {
        if (e.code === 'Space')
            battleState.nextTurn();
        if (e.code === 'ArrowLeft')
            battleState.previousTurn();
    });
    loadEncounterData();
}
async function loadEncounterData() {
    showLoading();
    try {
        const urlParams = new URLSearchParams(window.location.search);
        encounterId = urlParams.get('id');
        if (!encounterId || !title)
            throw new Error('Missing encounter ID or title element');
        const res = await fetch(`/api/encounter/${encounterId}`);
        const data = await res.json();
        title.textContent = `${data.name} vs Party #${data.party_id}`;
        await battleState.initFromServer(encounterId);
        battleState.render();
        hideStatusMessages();
    }
    catch (error) {
        console.error('Failed to load battle:', error);
        showError(error instanceof Error ? error.message : 'Failed to load battle data');
    }
}
document.addEventListener('DOMContentLoaded', initializeApp);
//# sourceMappingURL=battle.js.map