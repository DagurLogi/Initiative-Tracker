// public/view-parties.js

// @ts-ignore
const DOMPurify = window.DOMPurify;

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
      const html = `
        <h2>${DOMPurify.sanitize(party.name)}</h2>
        <div class="button-row">
          <button class="toggle-members button-secondary">👁 Show Members</button>
          <a class="menu-link" href="edit-party.html?id=${party.id}">✏️ Edit</a>
          <button class="button button-secondary delete-party" data-id="${party.id}">🗑 Delete</button>
        </div>

        <div class="members hidden">
          <table class="party-members">
            <thead>
              <tr>
                <th>Name</th><th>Class</th><th>Lvl</th><th>HP</th><th>AC</th><th>Dex</th><th>PP</th>
                <th>Resistances</th><th>Immunities</th>
              </tr>
            </thead>
            <tbody>
              ${party.members.map(m => `
                <tr>
                  <td>${DOMPurify.sanitize(m.name)}</td>
                  <td>${DOMPurify.sanitize(m.class)}</td>
                  <td>${m.level}</td>
                  <td>${m.hp}</td>
                  <td>${m.ac}</td>
                  <td>${m.dex}</td>
                  <td>${m.passivePerception}</td>
                  <td>${DOMPurify.sanitize((m.resistances || []).join(', ') || '-')}</td>
                  <td>${DOMPurify.sanitize((m.immunities || []).join(', ') || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      const div = document.createElement('div');
      div.className = 'party-card';
      div.innerHTML = html;

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
