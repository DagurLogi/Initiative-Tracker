// public/view-parties.js

async function fetchParties() {
    try {
      const res = await fetch('/api/party');
      const parties = await res.json();
  
      const container = document.getElementById('partiesContainer');
      if (container) {
        container.innerHTML = '';
      }
  
      if (!Array.isArray(parties) || parties.length === 0) {
        if (container) {
          container.innerHTML = '<p>No parties found.</p>';
        }
        return;
      }
  
      parties.forEach(party => {
        const div = document.createElement('div');
        div.className = 'party-card';
        div.innerHTML = `
        <h2>${party.name}</h2>
        <button class="toggle-members">Show Members</button>
        <a class="menu-link" href="/edit-party.html?id=${party.id}">Edit</a>
        <button class="delete-party" data-id="${party.id}">Delete</button>
        <div class="members hidden">
          ${party.members.map(m => `
            <div class="member">
              <strong>${m.name}</strong> (Level ${m.level} ${m.class})<br/>
              HP: ${m.hp}, AC: ${m.ac}, Dex: ${m.dex}, PP: ${m.passivePerception}<br/>
              Resistances: ${m.resistances.join(', ') || 'None'}<br/>
              Immunities: ${m.immunities.join(', ') || 'None'}
            </div>
          `).join('<hr/>')}
        </div>
        <hr/>
      `;
      
  
        if (container) {
          container.appendChild(div);
        }
  
        div.querySelector('.toggle-members')?.addEventListener('click', () => {
          div.querySelector('.members')?.classList.toggle('hidden');
        });
  
        div.querySelector('.delete-party')?.addEventListener('click', async (e) => {
          const target = e.target;
          const id = target instanceof HTMLElement ? target.getAttribute('data-id') : null;
          if (id && confirm('Are you sure you want to delete this party?')) {
            const delRes = await fetch(`/api/party/${id}`, { method: 'DELETE' });
            if (delRes.ok) {
              fetchParties(); // Refresh
            } else {
              alert('❌ Failed to delete party');
            }
          }
        });
      });
    } catch (err) {
      console.error('❌ Failed to load parties:', err);
      const container = document.getElementById('partiesContainer');
      if (container) {
        container.innerHTML = `<p>Error loading parties.</p>`;
      }
    }
  }
  
  document.addEventListener('DOMContentLoaded', fetchParties);
  