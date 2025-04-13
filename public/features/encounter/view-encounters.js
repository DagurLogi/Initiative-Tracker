// @ts-nocheck
// @ts-ignore
const DOMPurify = window.DOMPurify;

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('encountersContainer');

  try {
    const res = await fetch('/api/encounter');
    const encounters = await res.json();

    if (encounters.length === 0) {
      if (container) {
        container.innerHTML = '<p>No encounters found.</p>';
      }
      return;
    }

    encounters.forEach(encounter => {
      const card = document.createElement('div');
      card.className = 'party-card';

      const rawHTML = `
        <h2>${encounter.name}</h2>
        <button class="toggle-details">Show Details</button>
        <button class="enter-battle" data-id="${encounter.id}">Enter Battle</button>
        <button class="edit-encounter" data-id="${encounter.id}">Edit</button>
        <button class="delete-encounter" data-id="${encounter.id}">Delete</button>
        <div class="details hidden"></div>
      `;

      card.innerHTML = DOMPurify.sanitize(rawHTML);

      const detailsDiv = card.querySelector('.details');
      const toggleBtn = card.querySelector('.toggle-details');

      if (toggleBtn) {
        toggleBtn.addEventListener('click', async () => {
          if (detailsDiv && detailsDiv.classList.contains('hidden')) {
            const res = await fetch(`/api/encounter/${encounter.id}`);
            const data = await res.json();

            if (!Array.isArray(data.initiative)) {
              detailsDiv.innerHTML = '<p>❌ No initiative data available.</p>';
              return;
            }

            const sortedInitiative = data.initiative.sort((a, b) => {
              if (b.initiative !== a.initiative) return b.initiative - a.initiative;
              if ((b.dex || 0) !== (a.dex || 0)) return (b.dex || 0) - (a.dex || 0);
              if ((a.type || 'player') === 'player' && (b.type || 'monster') === 'monster') return -1;
              if ((a.type || 'player') === 'monster' && (b.type || 'player') === 'player') return 1;
              return Math.random() < 0.5 ? -1 : 1;
            });

            const partyMembers = sortedInitiative.map(i => {
              const deadTag = i.isDead ? ' 💀' : '';
              const spellcasterTag = i.type === 'monster' && i.statblock?.spellSlots ? ' 🔮' : '';
            
              const defaultName = `${i.basename ?? 'Unknown'} ${typeof i.index === 'number' ? i.index + 1 : ''}`;
              let displayName = DOMPurify.sanitize(i.name || defaultName);
            
              if (i.nickname) {
                displayName = `<em>${DOMPurify.sanitize(i.nickname)}</em>`;
              }
            
              if (i.type === 'player') {
                displayName = `<strong>${displayName}</strong>`;
              }
            
              return `<li>${displayName} (Initiative: ${i.initiative ?? '?'})${spellcasterTag}${deadTag}</li>`;
            }).join('');
            
            
            
            

            const detailsHTML = `
              <p><strong>Party ID:</strong> ${data.party_id}</p>
              <p><strong>Monsters:</strong></p>
              <ul>${data.monsters.map(m => `<li>${m.name} x${m.count}</li>`).join('')}</ul>
              <p><strong>Initiative Order:</strong></p>
              <ul>${partyMembers}</ul>
            `;

            detailsDiv.innerHTML = DOMPurify.sanitize(detailsHTML);
            detailsDiv.classList.remove('hidden');
            toggleBtn.textContent = 'Hide Details';
          } else {
            if (detailsDiv) {
              detailsDiv.classList.add('hidden');
            }
            toggleBtn.textContent = 'Show Details';
          }
        }); 
      }

      card.querySelector('.edit-encounter')?.addEventListener('click', () => {
        window.location.href = `/features/encounter/edit-encounter.html?id=${encounter.id}`;
      });

      card.querySelector('.enter-battle')?.addEventListener('click', () => {
        window.location.href = `../../battle/battle.html?id=${encounter.id}`;
      });

      card.querySelector('.delete-encounter')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this encounter?')) return;

        const res = await fetch(`/api/encounter/${encounter.id}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          card.remove();
        } else {
          alert('❌ Failed to delete encounter.');
        }
      });

      if (container) {
        container.appendChild(card);
      }
    });

  } catch (err) {
    console.error('❌ Failed to load encounters:', err);
    if (container) {
      container.innerHTML = '<p>Error loading encounters.</p>';
    }
  }
});
