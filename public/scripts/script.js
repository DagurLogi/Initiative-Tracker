const modal = document.getElementById('modal');
const statblockContent = document.getElementById('statblockContent');
const closeModal = document.getElementById('closeModal');

// @ts-ignore
const DOMPurify = window.DOMPurify;

async function fetchCreatures() {
    try {
      const response = await fetch('/api/creatures');
      const creatures = await response.json();
  
      const listDiv = document.getElementById('creature-list');
      if (listDiv) {
        listDiv.innerHTML = ''; // Clear previous content
      }
  
      creatures.forEach(creature => {
        const div = document.createElement('div');
        div.classList.add('creature-card');
        div.innerHTML = `
          <div class="creature-title">${creature.name} — ${creature.challenge || 'CR ?'}</div>
          <div class="creature-meta">${creature.meta || 'Unknown type'}</div>
          <button class="creature-button" onclick="viewStatBlock(${creature.id})">View Statblock</button>
        `;

        if (listDiv) {
          listDiv.appendChild(div);
        }
      });
    } catch (error) {
      console.error('Failed to fetch creatures:', error);
    }
  }
  
  function showModalWithStatblock(id) {
    console.log('Fetching creature data for ID:', id);
    fetch(`/api/creatures/${id}`)
      .then(res => res.json())
      .then(creature => {
        const html = `
          <h2>${creature.name}</h2>
          <p><strong>${creature.meta}</strong></p>
          <p><strong>Armor Class:</strong> ${creature.armor_class}</p>
          <p><strong>Hit Points:</strong> ${creature.hit_points}</p>
          <p><strong>Speed:</strong> ${creature.speed}</p>
  
          <div style="margin-top: 0.5rem;">
            <div style="display: flex; gap: 1rem;">
              ${['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(stat => {
                const value = creature.stats?.[stat] || '?';
                const mod = creature.stats?.[`${stat}_mod`] || '';
                return `
                  <div style="text-align: center;">
                    <div><strong>${stat}</strong></div>
                    <div>${value} ${mod}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
  
          <p><strong>Saving Throws:</strong> ${creature.saving_throws}</p>
          <p><strong>Skills:</strong> ${creature.skills}</p>
          <p><strong>Senses:</strong> ${creature.senses}</p>
          <p><strong>Languages:</strong> ${creature.languages}</p>
          <p><strong>Challenge:</strong> ${creature.challenge}</p>
          <p><strong>Damage Resistances:</strong> ${creature.damage_resistances || '—'}</p>
          <p><strong>Damage Immunities:</strong> ${creature.damage_immunities || '—'}</p>
          <p><strong>Damage Vulnerabilities:</strong> ${creature.damage_vulnerabilities || '—'}</p>
          <p><strong>Condition Immunities:</strong> ${creature.condition_immunities || '—'}</p>
  
          <hr/>
          <div><strong>Traits:</strong> ${creature.traits}</div>
          <hr/>
          <div><strong>Actions:</strong> ${creature.actions}</div>
          ${creature.reactions ? `<hr/><div><strong>Reactions:</strong> ${creature.reactions}</div>` : ''}
          ${creature.legendary_actions ? `<hr/><div><strong>Legendary Actions:</strong> ${creature.legendary_actions}</div>` : ''}
  
          ${creature.img_url ? `<img src="${creature.img_url}" alt="${creature.name}" style="max-width: 100%; margin-top: 1rem;" />` : ''}
        `;
  
        if (statblockContent) {
          statblockContent.innerHTML = DOMPurify.sanitize(html); // ✅
        }
  
        if (modal) {
          modal.classList.remove('hidden'); // This should show the modal
          modal.style.display = 'block';    // Also force it visible for good measure
        }
      })
      .catch(err => {
        console.error('❌ Error fetching creature statblock:', err);
        if (statblockContent) {
          statblockContent.innerHTML = `<p>Error loading statblock.</p>`;
        }
        if (modal) {
          modal.classList.remove('hidden');
          modal.style.display = 'block';
        }
      });
  }
  

  if (closeModal) {
    closeModal.onclick = function () {
      if (modal) {
        modal.classList.add('hidden');

      }
    };
  }
  
  window.onclick = function (event) {
    if (event.target == modal) {
      if (modal) {
        modal.classList.add('hidden');

      }
    }
  };
  
  function viewStatBlock(id) {
    console.log('Clicked statblock button for ID:', id);
    showModalWithStatblock(id);
  }
  
  
  window.addEventListener('keydown', (e) => {
    if (modal && e.key === 'Escape' && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }
  });
  

  fetchCreatures();
  window.viewStatBlock = viewStatBlock;

  