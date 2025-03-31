// public/edit-encounter.js

(() => {
  const partySelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('partySelect'));
  const monsterList = /** @type {HTMLDivElement|null} */ (document.getElementById('monsterList'));
  const form = /** @type {HTMLFormElement|null} */ (document.getElementById('encounterForm'));
  const encounterNameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('encounterName'));
  const selectedMonstersDiv = /** @type {HTMLDivElement|null} */ (document.getElementById('selectedMonsters'));
  const initiativeInputsDiv = /** @type {HTMLDivElement|null} */ (document.getElementById('initiativeInputs'));

  const selectedMonstersMap = new Map();
  let loadedParty = null;
  let encounterId = null;

  async function fetchParties() {
    try {
      const res = await fetch('/api/party');
      const parties = await res.json();
      parties.forEach(party => {
        const option = document.createElement('option');
        option.value = party.id;
        option.textContent = party.name;
        partySelect?.appendChild(option);
      });
    } catch (err) {
      console.error('❌ Failed to load parties:', err);
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
        div.addEventListener('click', () => {
          if (!selectedMonstersMap.has(creature.id)) {
            selectedMonstersMap.set(creature.id, { id: creature.id, name: creature.name, count: 1, groupSize: 1, initiatives: [] });
            renderSelectedMonsters();
          }
        });
        monsterList?.appendChild(div);
      });
    } catch (err) {
      console.error('❌ Failed to load creatures:', err);
    }
  }

  function renderSelectedMonsters() {
    if (selectedMonstersDiv) {
      selectedMonstersDiv.innerHTML = '';
    }
    selectedMonstersMap.forEach(monster => {
      const div = document.createElement('div');
      div.className = 'selected-monster';

      const inputs = monster.initiatives?.map((val, i) => 
        `<input type="number" class="monster-init" data-id="${monster.id}" data-index="${i}" value="${val ?? ''}" />`
      ).join('') || '';
      

      div.innerHTML = `
        <span>${monster.name}</span>
        <label>Qty: 
          <input type="number" value="${monster.count}" data-id="${monster.id}" class="monster-count" min="1" />
        </label>
        <label>Group size: 
          <input type="number" value="${monster.groupSize || 1}" data-id="${monster.id}" class="group-size" min="1" max="10" />
        </label>
        <div>Initiatives: ${inputs}</div>
        <button class="remove-monster" data-id="${monster.id}">X</button>
      `;
      selectedMonstersDiv?.appendChild(div);
    });

    selectedMonstersDiv?.querySelectorAll('.monster-count').forEach(input => {
      input.addEventListener('input', e => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const id = parseInt(target.getAttribute('data-id') || '0');
        if (selectedMonstersMap.has(id)) {
          selectedMonstersMap.get(id).count = parseInt(target.value);
          updateMonsterInitiatives(id);
        }
      });
    });

    selectedMonstersDiv?.querySelectorAll('.group-size').forEach(input => {
      input.addEventListener('input', e => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const id = parseInt(target.getAttribute('data-id') || '0');
        if (selectedMonstersMap.has(id)) {
          selectedMonstersMap.get(id).groupSize = parseInt(target.value);
          updateMonsterInitiatives(id);
        }
      });
    });

    selectedMonstersDiv?.querySelectorAll('.monster-init').forEach(input => {
      input.addEventListener('input', e => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const id = parseInt(target.getAttribute('data-id') || '0');
        const index = parseInt(target.getAttribute('data-index') || '0');
        if (selectedMonstersMap.has(id)) {
          selectedMonstersMap.get(id).initiatives[index] = target.value === '' ? null : parseInt(target.value);
        }
      });
      
    });

    selectedMonstersDiv?.querySelectorAll('.remove-monster').forEach(btn => {
      btn.addEventListener('click', e => {
        const target = /** @type {HTMLElement} */ (e.target);
        const id = parseInt(target.getAttribute('data-id') || '0');
        selectedMonstersMap.delete(id);
        renderSelectedMonsters();
      });
    });
  }

  function updateMonsterInitiatives(id) {
    const monster = selectedMonstersMap.get(id);
    const totalGroups = Math.ceil((monster.count || 1) / (monster.groupSize || 1));
    monster.initiatives = Array.from({ length: totalGroups }, (_, i) => monster.initiatives?.[i] ?? 0);
    renderSelectedMonsters();
  }

  async function loadEncounter() {
    const params = new URLSearchParams(window.location.search);
    encounterId = params.get('id');
    if (!encounterId) return;

    const res = await fetch(`/api/encounter/${encounterId}`);
    const data = await res.json();

    if (encounterNameInput) {
      encounterNameInput.value = data.name;
    }
    if (partySelect) {
      partySelect.value = data.party_id;
    }

    const partyRes = await fetch(`/api/party/${data.party_id}`);
    loadedParty = await partyRes.json();

    if (initiativeInputsDiv) {
      initiativeInputsDiv.innerHTML = '';
      loadedParty.members.forEach((member, index) => {
        const init = data.initiative.find(i => i.name === member.name);
        const div = document.createElement('div');
        div.innerHTML = `
          <label>${member.name} (Init):
            <input type="number" name="initiative-${index}" data-name="${member.name}" value="${init?.initiative || ''}" />
          </label>
        `;
        initiativeInputsDiv.appendChild(div);
      });
    }

    data.monsters.forEach(monster => {
      const count = monster.count || 1;
      const groupSize = monster.groupSize || 1;
      const totalGroups = Math.ceil(count / groupSize);

      const matching = data.initiative.filter(i => i.name.startsWith(monster.name)).sort((a, b) => {
        const aNum = parseInt(a.name.replace(monster.name, '').trim()) || 0;
        const bNum = parseInt(b.name.replace(monster.name, '').trim()) || 0;
        return aNum - bNum;
      });

      const groupInitiatives = [];
        for (let i = 0; i < totalGroups; i++) {
          const slice = matching.slice(i * groupSize, (i + 1) * groupSize);
          groupInitiatives.push(slice[0]?.initiative ?? Math.floor(Math.random() * 20 + 1));
        }


      selectedMonstersMap.set(monster.id, {
        ...monster,
        initiatives: groupInitiatives
      });
    });

    renderSelectedMonsters();
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!encounterId) return;

    const name = encounterNameInput?.value.trim() || '';
    const partyId = partySelect ? parseInt(partySelect.value) : 0;

    const monsters = Array.from(selectedMonstersMap.values());

    const initiativeInputs = initiativeInputsDiv ? initiativeInputsDiv.querySelectorAll('input[type="number"]') : [];
    const initiatives = [];

    initiativeInputs.forEach(input => {
      const el = /** @type {HTMLInputElement} */ (input);
      const name = el.getAttribute('data-name');
      const value = el.value === '' ? null : parseInt(el.value);
      const player = loadedParty?.members.find(m => m.name === name);
      if (name) {
        initiatives.push({
          name,
          initiative: value,
          dex: player?.dex || 0,
          type: 'player',
          concentration: false,
          isDead: false,
          deathSaves: {
            successes: 0,
            failures: 0
          }
        });
        
      }
    });

    monsters.forEach(monster => {
      const totalGroups = Math.ceil((monster.count || 1) / (monster.groupSize || 1));
      for (let i = 0; i < totalGroups; i++) {
        const start = i * monster.groupSize;
        const end = Math.min(start + monster.groupSize, monster.count);

        for (let j = start; j < end; j++) {
          const init = monster.initiatives[i] || 0;
          initiatives.push({
            name: `${monster.name} ${j + 1}`,
            initiative: init,
            dex: 0,
            type: 'monster',
            naturalOne: init === 1,
            concentration: false,
            isDead: false
          });
          
        }
      }
    });

    try {
      const res = await fetch(`/api/encounter/${encounterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, partyId, monsters, initiatives })
      });

      if (res.ok) {
        alert('✅ Encounter updated!');
        window.location.href = 'view-encounters.html';
      } else {
        const err = await res.json();
        alert(`❌ ${err.error || 'Update failed.'}`);
      }
    } catch (err) {
      console.error('❌ Update error:', err);
    }
  });

  (async () => {
    await fetchParties();
    await fetchCreatures();
    await loadEncounter();
  })();
})();