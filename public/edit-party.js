// public/edit-party.js

/**
 * Parses query parameters from URL and returns an object.
 */
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      id: params.get('id')
    };
  }
  
  /**
   * Create a member row in the form
   */
  function createMemberRow(member = {}) {
    const div = document.createElement('div');
    div.className = 'member';
    div.innerHTML = `
      <input type="text" placeholder="Name" class="name" value="${member.name || ''}" required />
      <input type="text" placeholder="Class" class="class" value="${member.class || ''}" required />
      <input type="number" placeholder="Level" class="level" value="${member.level || 1}" required />
      <input type="number" placeholder="Max HP" class="hp" value="${member.hp || 1}" required />
      <input type="number" placeholder="AC" class="ac" value="${member.ac || 10}" required />
      <input type="number" placeholder="Initiative" class="initiative" value="${member.initiative || 0}" required />
      <input type="number" placeholder="Passive Perception" class="pp" value="${member.passivePerception || 10}" required />
      <input type="text" placeholder="Resistances (comma-separated)" class="resistances" value="${(member.resistances || []).join(', ')}" />
      <input type="text" placeholder="Immunities (comma-separated)" class="immunities" value="${(member.immunities || []).join(', ')}" />
      <button type="button" class="remove">Remove</button>
    `;
  
    div.querySelector('.remove')?.addEventListener('click', () => {
      div.remove();
    });
  
    return div;
  }
  
  /**
   * Populates form with party data
   */
  async function loadParty(id) {
    try {
      const res = await fetch(`/api/party/${id}`);
      if (!res.ok) throw new Error('Party not found');
  
      const party = await res.json();
      const form = document.getElementById('editPartyForm');
      const groupName = document.getElementById('groupName');
      const memberList = document.getElementById('memberList');
  
      if (groupName) /** @type {HTMLInputElement} */ (groupName).value = party.name;

      if (memberList) {
        memberList.innerHTML = '';
        party.members.forEach(m => {
          const row = createMemberRow(m);
          memberList.appendChild(row);
        });
      }
    } catch (err) {
      alert('❌ Failed to load party.');
      console.error(err);
    }
  }
  
  /**
   * Submit updated party
   */
  document.addEventListener('DOMContentLoaded', () => {
    const { id } = getQueryParams();
    if (!id) {
      alert('No party ID provided.');
      return;
    }
  
    loadParty(id);
  
    const form = document.getElementById('editPartyForm');
    const memberList = document.getElementById('memberList');
    const addMemberBtn = document.getElementById('addMemberBtn');
  
    addMemberBtn?.addEventListener('click', () => {
      if (memberList) {
        const newRow = createMemberRow();
        memberList.appendChild(newRow);
      }
    });
  
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const groupNameInput = document.getElementById('groupName');
      const groupName = /** @type {HTMLInputElement} */ (groupNameInput)?.value.trim();

  
      if (!groupName) return alert('Group name is required');
  
      const members = [];
      const rows = memberList?.querySelectorAll('.member') || [];
  
      rows.forEach(row => {
        const getVal = sel => row.querySelector(sel)?.value.trim();
        const getNum = sel => Number(row.querySelector(sel)?.value || 0);
  
        members.push({
          name: getVal('.name'),
          class: getVal('.class'),
          level: getNum('.level'),
          hp: getNum('.hp'),
          ac: getNum('.ac'),
          initiative: getNum('.initiative'),
          passivePerception: getNum('.pp'),
          resistances: getVal('.resistances')?.split(',').map(x => x.trim()).filter(Boolean) || [],
          immunities: getVal('.immunities')?.split(',').map(x => x.trim()).filter(Boolean) || [],
        });
      });
  
      try {
        const res = await fetch(`/api/party/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: groupName, members })
        });
  
        if (res.ok) {
          alert('✅ Party updated!');
          window.location.href = '/view-parties.html';
        } else {
          alert('❌ Failed to update party.');
        }
      } catch (err) {
        console.error('Error updating party:', err);
        alert('❌ Server error.');
      }
    });
  });