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
      const div = document.createElement('div');
      div.className = 'member';
      div.innerHTML = `
        <input type="text" placeholder="Name" class="name" value="${existing.name || ''}" required />
        <input type="text" placeholder="Class" class="class" value="${existing.class || ''}" required />
        <input type="number" placeholder="Level" class="level" value="${existing.level || ''}" required />
        <input type="number" placeholder="Max HP" class="hp" value="${existing.hp || ''}" required />
        <input type="number" placeholder="AC" class="ac" value="${existing.ac || ''}" required />
        <input type="number" placeholder="Dexterity" class="dex" value="${existing.dex || ''}" required />
        <input type="number" placeholder="Passive Perception" class="pp" value="${existing.passivePerception || ''}" required />
        <input type="text" placeholder="Resistances (comma-separated)" class="resistances" value="${(existing.resistances || []).join(', ')}" />
        <input type="text" placeholder="Immunities (comma-separated)" class="immunities" value="${(existing.immunities || []).join(', ')}" />
        <button type="button" class="remove">Remove</button>
      `;
      if (memberList) {
        memberList.appendChild(div);
      } else {
        console.error('❌ Member list element is missing.');
      }
  
      div.querySelector('.remove')?.addEventListener('click', () => {
        div.remove();
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
  
      const memberElements = memberList.querySelectorAll('.member');
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
          initiative: 0 // default for encounter-time assignment
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
          window.location.href = '/view-parties.html';
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
  