// @ts-check
// @ts-ignore
const DOMPurify = window.DOMPurify;

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
    const wrapper = document.createElement('div');
    wrapper.className = 'collapsible-member';

    const header = document.createElement('div');
    header.className = 'member-header';
    header.innerHTML = `
      <strong>${DOMPurify.sanitize(existing.name || `Party Member ${memberList.children.length + 1}`)}</strong>
      <span class="toggle-icon">${existing.name ? '–' : '+'}</span>
    `;

    const content = document.createElement('div');
    content.className = 'member-content';
    content.innerHTML = `
      <div class="member-row">
        <label>Name <input type="text" class="name responsive-input" value="${DOMPurify.sanitize(existing.name || '')}" required /></label>
        <label>Class <input type="text" class="class responsive-input" value="${DOMPurify.sanitize(existing.class || '')}" required /></label>
        <label>Level <input type="number" class="level responsive-input" value="${existing.level || ''}" required /></label>
        <label>Max HP <input type="number" class="hp responsive-input" value="${existing.hp || ''}" required /></label>
        <label>AC <input type="number" class="ac responsive-input" value="${existing.ac || ''}" required /></label>
        <label>Dex <input type="number" class="dex responsive-input" value="${existing.dex || ''}" required /></label>
        <label>Passive Perception <input type="number" class="pp responsive-input" value="${existing.passivePerception || ''}" required /></label>
        <label>Resistances <input type="text" class="resistances responsive-input" value="${DOMPurify.sanitize((existing.resistances || []).join(', '))}" /></label>
        <label>Immunities <input type="text" class="immunities responsive-input" value="${DOMPurify.sanitize((existing.immunities || []).join(', '))}" /></label>
        <button type="button" class="remove">Remove</button>
      </div>
    `;

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    memberList.appendChild(wrapper);

    const nameInput = content.querySelector('.name');
    const headerText = header.querySelector('strong');
    const toggleIcon = header.querySelector('.toggle-icon');

    nameInput.addEventListener('blur', () => {
      const name = nameInput.value.trim();
      if (name) {
        headerText.textContent = name;
      } else {
        headerText.textContent = `Party Member ${[...memberList.children].indexOf(wrapper) + 1}`;
      }
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameInput.blur();
      }
    });

    header.addEventListener('click', () => {
      content.classList.toggle('collapsed');
      toggleIcon.textContent = content.classList.contains('collapsed') ? '+' : '–';
    });

    content.querySelector('.remove')?.addEventListener('click', () => {
      wrapper.remove();
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

    const memberWrappers = memberList.querySelectorAll('.collapsible-member');
    const members = [];

    memberWrappers.forEach(wrapper => {
      const row = wrapper.querySelector('.member-row');
      if (!row) return;

      const getVal = (selector) => row.querySelector(selector)?.value.trim();
      const getNum = (selector) => Number(row.querySelector(selector)?.value || 0);

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
        window.location.href = 'view-parties.html';
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
