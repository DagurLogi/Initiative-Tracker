document.addEventListener('DOMContentLoaded', async () => {
    const list = document.getElementById('party-list');
    if (!list) {
      console.error('❌ Element with ID "party-list" not found.');
      return;
    }
  
    try {
      const response = await fetch('/api/party');
      const parties = await response.json();
  
      if (!Array.isArray(parties) || parties.length === 0) {
        list.innerHTML = '<p>No parties found.</p>';
        return;
      }
  
      parties.forEach(party => {
        const partyDiv = document.createElement('div');
        partyDiv.className = 'party';
  
        const membersHTML = party.members.map(member => `
          <li>
            <strong>${member.name}</strong> - ${member.class} (Lvl ${member.level}) 
            - HP: ${member.hp}, AC: ${member.ac}, Init: ${member.initiative}, PP: ${member.passivePerception}
            ${member.concentrating ? '⚠️ Concentrating' : ''}
          </li>
        `).join('');
  
        partyDiv.innerHTML = `
          <h2>${party.name}</h2>
          <ul>${membersHTML}</ul>
          <hr />
        `;
  
        list.appendChild(partyDiv);
      });
    } catch (err) {
      console.error('❌ Failed to fetch parties:', err);
      list.innerHTML = '<p>Error loading parties.</p>';
    }
  });
  