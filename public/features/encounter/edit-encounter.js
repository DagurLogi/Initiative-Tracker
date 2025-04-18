// public/edit-encounter.js
// @ts-ignore
const DOMPurify = window.DOMPurify;

(() => {
  const partySelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('partySelect'));
  const monsterList = /** @type {HTMLDivElement|null} */ (document.getElementById('monsterList'));
  const form = /** @type {HTMLFormElement|null} */ (document.getElementById('encounterForm'));
  const encounterNameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('encounterName'));
  const selectedMonstersDiv = /** @type {HTMLDivElement|null} */ (document.getElementById('selectedMonsters'));
  const initiativeInputsDiv = /** @type {HTMLDivElement|null} */ (document.getElementById('initiativeInputs'));

  const selectedMonstersMap = new Map();
  let loadedParty = null;
  let updatedInitiative = [];
  let redirectToBattle = false;
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
            selectedMonstersMap.set(creature.id, {
              id: creature.id,
              name: creature.name,
              basename: creature.name,
              count: 1,
              groupSize: 1,
              initiatives: []
            });
            
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
      
    
      div.innerHTML = DOMPurify.sanitize(`
        <div class="monster-header">
          <span>${monster.name}</span>
          <button class="remove-monster" data-id="${monster.id}">X</button>
        </div>
        <div class="monster-controls">
          <label>Qty:
            <input type="number" value="${monster.count}" data-id="${monster.id}" class="monster-count" min="1" />
          </label>
          <label>Group size:
            <input type="number" value="${monster.groupSize || 1}" data-id="${monster.id}" class="group-size" min="1" max="10" />
          </label>
        </div>
        <div class="initiative-inputs">
          ${monster.initiatives?.map((val, i) => `
            <input type="number" class="monster-init" data-id="${monster.id}" data-index="${i}" value="${val ?? ''}" />
          `).join('') || ''}
        </div>

      `);
      
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
    monster.initiatives = Array.from({ length: totalGroups }, (_, i) => monster.initiatives?.[i] ?? null);
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
        div.innerHTML = DOMPurify.sanitize(`
          <label>${member.name} (Init):
            <input type="number" name="initiative-${index}" data-name="${member.name}" value="${init?.initiative || ''}" />
          </label>
        `);
        initiativeInputsDiv.appendChild(div);
      });
    }

    updatedInitiative = data.state?.updatedInitiative ?? data.initiative;

    data.monsters.forEach(monster => {
      const count = monster.count || 1;
      const groupSize = monster.groupSize || 1;
      const totalGroups = Math.ceil(count / groupSize);
    
      const matching = updatedInitiative
        .filter(i => i.basename === (monster.basename || monster.name))
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

      // 💡 Grab the nickname from the first matching entry (optional)
      const nickname = matching[0]?.nickname || '';

      // 🧠 Build groupInitiatives correctly by using the sorted matches
      const groupInitiatives = [];
      for (let i = 0; i < totalGroups; i++) {
        groupInitiatives.push(matching[i]?.initiative ?? null);
      }

      // ✅ Preserve everything
      selectedMonstersMap.set(monster.id, {
        ...monster,
        basename: monster.basename || monster.name,
        nickname,
        initiatives: groupInitiatives
      });
    });
    

    renderSelectedMonsters();
  }

  document.getElementById('saveAndStartBattleBtn')?.addEventListener('click', () => {
    redirectToBattle = true;
  });

  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!encounterId) return;

    const name = DOMPurify.sanitize(encounterNameInput?.value.trim() || '');
    const partyId = partySelect ? parseInt(partySelect.value) : 0;

    const monsters = Array.from(selectedMonstersMap.values()).map(m => ({
      id: m.id,
      name: m.name,
      basename: m.basename || m.name,
      count: m.count,
      groupSize: m.groupSize,
      initiatives: m.initiatives
    }));
    

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
          const existing = updatedInitiative.find(e =>
            e.basename === monster.basename && e.index === j
          );
        
          const init = monster.initiatives[i];
          const name = existing?.nickname ? existing.name : `${monster.name} ${j + 1}`;

          initiatives.push({
            name: DOMPurify.sanitize(name),
            basename: monster.basename || monster.name,
            nickname: existing?.nickname ?? '',
            displayName: existing?.nickname || existing?.displayName || name,
            index: j,
            initiative: init ?? existing?.initiative,
            dex: existing?.dex || 0,
            type: 'monster',
            isPlayer: existing?.isPlayer ?? false,
            isSpecial: existing?.isSpecial ?? false,
            naturalOne: init === 1,
            isConcentrating: existing?.isConcentrating ?? false,
            isDead: existing?.isDead ?? false,
            currentHp: existing?.currentHp ?? null,
            statusEffects: existing?.statusEffects || [],
            passivePerception: existing?.passivePerception ?? null,
            statblock: existing?.statblock || {}
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
        const encounter = await res.json();
        const encounterId = encounter.id;
        alert('✅ Encounter updated!');
      
        if (redirectToBattle) {
          window.location.href = `../../battle/battle.html?id=${encounterId}`;
        } else {
          window.location.href = 'view-encounters.html';
        }
      }
       else {
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
  const searchInput = document.getElementById('monsterSearch');

searchInput?.addEventListener('input', () => {
  const searchValue = (/** @type {HTMLInputElement} */ (searchInput)).value.toLowerCase();
  const allMonsters = monsterList ? monsterList.querySelectorAll('.monster-preview') : [];

  allMonsters.forEach(monster => {
    const name = monster.textContent ? monster.textContent.toLowerCase() : '';
    /** @type {HTMLElement} */ (monster).style.display = name.includes(searchValue) ? 'block' : 'none';
  });
});

})();