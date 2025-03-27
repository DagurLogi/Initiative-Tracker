// public/create-encounter.js

const partySelect = /** @type {HTMLSelectElement} */ (document.getElementById('partySelect'));
const monsterList = /** @type {HTMLDivElement} */ (document.getElementById('monsterList'));
const form = /** @type {HTMLFormElement} */ (document.getElementById('encounterForm'));
const encounterNameInput = /** @type {HTMLInputElement} */ (document.getElementById('encounterName'));
const selectedMonstersDiv = /** @type {HTMLDivElement} */ (document.getElementById('selectedMonsters'));
const initiativeInputsDiv = /** @type {HTMLDivElement} */ (document.getElementById('initiativeInputs'));

const selectedMonstersMap = new Map();

async function fetchParties() {
  try {
    const res = await fetch('/api/party');
    const parties = await res.json();
    parties.forEach(party => {
      const option = document.createElement('option');
      option.value = party.id;
      option.textContent = party.name;
      partySelect.appendChild(option);
    });
  } catch (err) {
    console.error('❌ Failed to fetch parties:', err);
  }
}

async function fetchCreatures() {
  try {
    const res = await fetch('/api/creatures');
    const creatures = await res.json();
    creatures.forEach(creature => {
      const div = document.createElement('div');
      div.className = 'monster-preview';
      div.textContent = `${creature.name} (${creature.meta})`;
      div.addEventListener('click', () => addMonsterToEncounter(creature));
      monsterList.appendChild(div);
    });
  } catch (err) {
    console.error('❌ Failed to fetch creatures:', err);
  }
}

function addMonsterToEncounter(creature) {
  if (selectedMonstersMap.has(creature.id)) return;

  selectedMonstersMap.set(creature.id, { id: creature.id, name: creature.name, count: 1 });

  renderSelectedMonsters();
}

function renderSelectedMonsters() {
  selectedMonstersDiv.innerHTML = '';
  selectedMonstersMap.forEach(monster => {
    const div = document.createElement('div');
    div.className = 'selected-monster';
    div.innerHTML = `
      <span>${monster.name}</span>
      <input type="number" value="${monster.count}" data-id="${monster.id}" min="1" style="width: 60px" />
      <button class="remove-monster" data-id="${monster.id}">X</button>
    `;
    selectedMonstersDiv.appendChild(div);
  });

  selectedMonstersDiv.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', e => {
      const inputElem = /** @type {HTMLInputElement} */ (e.target);
      const id = parseInt(inputElem.getAttribute('data-id') || '0');
      if (selectedMonstersMap.has(id)) {
        selectedMonstersMap.get(id).count = parseInt(inputElem.value);
      }
    });
  });

  selectedMonstersDiv.querySelectorAll('.remove-monster').forEach(btn => {
    btn.addEventListener('click', e => {
      const btnElem = /** @type {HTMLElement} */ (e.target);
      const id = parseInt(btnElem.getAttribute('data-id') || '0');
      selectedMonstersMap.delete(id);
      renderSelectedMonsters();
    });
  });
}

partySelect.addEventListener('change', async () => {
  const id = /** @type {HTMLSelectElement} */ (partySelect).value;
  if (!id) return;

  try {
    const res = await fetch(`/api/party/${id}`);
    const party = await res.json();

    initiativeInputsDiv.innerHTML = '';
    party.members.forEach((member, index) => {
      const div = document.createElement('div');
      div.innerHTML = `
        <label>
          ${member.name} (Init):
          <input type="number" name="initiative-${index}" data-name="${member.name}" />
        </label>
      `;
      initiativeInputsDiv.appendChild(div);
    });
  } catch (err) {
    console.error('❌ Failed to load party:', err);
  }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const name = /** @type {HTMLInputElement} */ (encounterNameInput).value.trim();
    const partyId = /** @type {HTMLSelectElement} */ (partySelect).value;
  
    if (!name || !partyId) {
      alert('Please fill in all required fields.');
      return;
    }
  
    const monsters = Array.from(selectedMonstersMap.values());
  
    // ✅ Validate initiative inputs
    const initiativeInputs = initiativeInputsDiv.querySelectorAll('input[type="number"]');
    const initiatives = [];
  
    let invalidInitiative = false;
  
    initiativeInputs.forEach(input => {
      const inputElem = /** @type {HTMLInputElement} */ (input);
      const value = inputElem.value.trim();
      const name = inputElem.getAttribute('data-name');
  
      if (value === '' || isNaN(parseInt(value))) {
        invalidInitiative = true;
        return;
      }
  
      initiatives.push({
        name,
        initiative: parseInt(value)
      });
    });
  
    if (invalidInitiative) {
      alert('❌ Please enter initiative values for all party members.');
      return;
    }
  
    try {
      const res = await fetch('/api/encounter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          partyId: parseInt(partyId),
          monsters,
          initiatives // <- match this key with server
        })
      });
  
      if (res.ok) {
        alert('✅ Encounter saved!');
        window.location.href = '/';
      } else {
        const errMsg = await res.json();
        alert(`❌ ${errMsg.error || 'Failed to save encounter.'}`);
      }
    } catch (err) {
      console.error('❌ Error saving encounter:', err);
    }
  });
  

fetchParties();
fetchCreatures();