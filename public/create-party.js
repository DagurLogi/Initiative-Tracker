// @ts-check

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('createPartyForm');
  const memberList = document.getElementById('memberList');
  const addMemberBtn = document.getElementById('addMemberBtn');

  if (!form || !memberList || !addMemberBtn) {
    console.error('❌ One or more required elements are missing from the HTML.');
    return;
  }

  // Add new member row
  addMemberBtn.addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'member';
    div.innerHTML = `
      <input type="text" placeholder="Name" class="name" required />
      <input type="text" placeholder="Class" class="class" required />
      <input type="number" placeholder="Level" class="level" required />
      <input type="number" placeholder="Max HP" class="hp" required />
      <input type="number" placeholder="AC" class="ac" required />
      <input type="number" placeholder="Dexterity" class="dex" required />
      <input type="number" placeholder="Passive Perception" class="pp" required />
      <input type="text" placeholder="Resistances (comma-separated)" class="resistances" />
      <input type="text" placeholder="Immunities (comma-separated)" class="immunities" />
      <button type="button" class="remove">Remove</button>
    `;
    memberList.appendChild(div);

    div.querySelector('.remove')?.addEventListener('click', () => {
      div.remove();
    });
  });

  // Handle form submission
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
      const res = await fetch('/api/party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, members }),
      });

      if (res.ok) {
        alert('✅ Party created!');
        /** @type {HTMLFormElement} */ (form).reset();
        memberList.innerHTML = '';
      } else {
        const errorData = await res.json();
        console.error('❌ Server error:', errorData);
        alert('Something went wrong when creating the party.');
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      alert('Could not connect to the server.');
    }
  });
});
