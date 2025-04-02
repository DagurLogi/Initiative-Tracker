// @ts-check
// @ts-ignore
const DOMPurify = window.DOMPurify;

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
    const row = document.createElement('tr');
    row.className = 'member-row';
    row.innerHTML = `
      <td><input type="text" placeholder="Name" class="name responsive-input" required style="width: 100%;" /></td>
      <td><input type="text" placeholder="Class" class="class responsive-input" required style="width: 100%;" /></td>
      <td><input type="number" placeholder="Level" class="level responsive-input" required style="width: 100%;" /></td>
      <td><input type="number" placeholder="Max HP" class="hp responsive-input" required style="width: 100%;" /></td>
      <td><input type="number" placeholder="AC" class="ac responsive-input" required style="width: 100%;" /></td>
      <td><input type="number" placeholder="Dex" class="dex responsive-input" required style="width: 100%;" /></td>
      <td><input type="number" placeholder="Passive Perception" class="pp responsive-input" required style="width: 100%;" /></td>
      <td><input type="text" placeholder="Fire, Cold..." class="resistances responsive-input" style="width: 100%;" /></td>
      <td><input type="text" placeholder="Charmed, Poisoned..." class="immunities responsive-input" style="width: 100%;" /></td>
      <td><button type="button" class="remove">Remove</button></td>
    `;
    memberList.appendChild(row);

    row.querySelector('.remove')?.addEventListener('click', () => {
      row.remove();
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

    const groupName = DOMPurify.sanitize(
      /** @type {HTMLInputElement} */ (groupNameInput).value.trim()
    );
    
    if (!groupName) {
      alert('Group name is required!');
      return;
    }

    const memberRows = memberList.querySelectorAll('.member-row');
    const members = [];

    memberRows.forEach(row => {
      const getVal = (selector) => {
        const value = row.querySelector(selector)?.value.trim() || '';
        return DOMPurify.sanitize(value);
      };
      
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
