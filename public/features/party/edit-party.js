// @ts-check

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const partyId = urlParams.get('id');
  
    const form = document.getElementById('createPartyForm');
    const memberList = document.getElementById('memberList');
    const addMemberBtn = document.getElementById('addMemberBtn');
  
    if (!form || !memberList || !addMemberBtn) {
      console.error('❌ One or more required elements are missing from the HTML.');
      return;
    }
  
    function addMemberRow(existing = {}) {
      const row = document.createElement('tr');
      row.className = 'member-row';
      row.innerHTML = `
        <td><input type="text" placeholder="Name" class="name responsive-input" value="${existing.name || ''}" required /></td>
        <td><input type="text" placeholder="Class" class="class responsive-input" value="${existing.class || ''}" required /></td>
        <td><input type="number" placeholder="Level" class="level responsive-input" value="${existing.level || ''}" required /></td>
        <td><input type="number" placeholder="Max HP" class="hp responsive-input" value="${existing.hp || ''}" required /></td>
        <td><input type="number" placeholder="AC" class="ac responsive-input" value="${existing.ac || ''}" required /></td>
        <td><input type="number" placeholder="Dex" class="dex responsive-input" value="${existing.dex || ''}" required /></td>
        <td><input type="number" placeholder="Passive Perception" class="pp responsive-input" value="${existing.passivePerception || ''}" required /></td>
        <td><input type="text" placeholder="Fire, Cold..." class="resistances responsive-input" value="${(existing.resistances || []).join(', ')}" /></td>
        <td><input type="text" placeholder="Charmed, Poisoned..." class="immunities responsive-input" value="${(existing.immunities || []).join(', ')}" /></td>
        <td><button type="button" class="remove">Remove</button></td>
      `;
      if (memberList) {
        memberList.appendChild(row);
      } else {
        console.error('❌ Member list element is missing.');
      }
    
      row.querySelector('.remove')?.addEventListener('click', () => {
        row.remove();
      });
    
    }
  
    addMemberBtn.addEventListener('click', () => addMemberRow());
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const groupNameInput = document.getElementById('groupName');
      if (!groupNameInput) {
        console.error('❌ Group name input not found.');
        return;
      }
  
      const groupName = /** @type {HTMLInputElement} */ (groupNameInput).value.trim();
      if (!groupName) {
        alert('Group name is required!');
        return;
      }
  
      const memberElements = memberList.querySelectorAll('.member-row');

      const members = [];
  
      memberElements.forEach(member => {
        const getVal = (selector) => member.querySelector(selector)?.value.trim();
        const getNum = (selector) => Number(member.querySelector(selector)?.value || 0);
  
        members.push({
          name: getVal('.name'),
          class: getVal('.class'),
          level: getNum('.level'),
          hp: getNum('.hp'),
          ac: getNum('.ac'),
          dex: getNum('.dex'),
          passivePerception: getNum('.pp'),
          resistances: getVal('.resistances')?.split(',').map(s => s.trim()).filter(Boolean) || [],
          immunities: getVal('.immunities')?.split(',').map(s => s.trim()).filter(Boolean) || [],
          initiative: 0,
          concentration: false,
          isDead: false,
          deathSaves: {
            successes: 0,
            failures: 0
          }
        });
      });
  
      try {
        const method = partyId ? 'PUT' : 'POST';
        const endpoint = partyId ? `/api/party/${partyId}` : '/api/party';
  
        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: groupName, members }),
        });
  
        if (res.ok) {
          alert(`✅ Party ${partyId ? 'updated' : 'created'}!`);
          window.location.href='view-parties.html';
        } else {
          const errorData = await res.json();
          console.error('❌ Server error:', errorData);
          alert('Something went wrong when saving the party.');
        }
      } catch (err) {
        console.error('❌ Network error:', err);
        alert('Could not connect to the server.');
      }
    });
  
    // Auto load party data if editing
    if (partyId) {
      try {
        const res = await fetch(`/api/party/${partyId}`);
        const data = await res.json();
        const groupNameInput = document.getElementById('groupName');
        if (groupNameInput) {
          /** @type {HTMLInputElement} */ (groupNameInput).value = data.name;
        }
        data.members.forEach(member => addMemberRow(member));
      } catch (err) {
        console.error('❌ Failed to fetch party for editing:', err);
      }
    }
  });
  