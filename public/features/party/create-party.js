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
    const wrapper = document.createElement('div');
    wrapper.className = 'collapsible-member';

    const header = document.createElement('div');
    header.className = 'member-header';
    header.innerHTML = `
      <strong class="member-label">Party Member ${memberList.children.length + 1}</strong>
      <span class="toggle-icon">-</span>
    `;


    const content = document.createElement('div');
    content.className = 'member-content';
    content.innerHTML = `
      <div class="member-row">
        <label>Name <input type="text" class="name responsive-input" placeholder="Name" required /></label>
        <label>Class <input type="text" class="class responsive-input" placeholder="Class" required /></label>
        <label>Level <input type="number" class="level responsive-input" placeholder="Level" required /></label>
        <label>Max HP <input type="number" class="hp responsive-input" placeholder="Max HP" required /></label>
        <label>AC <input type="number" class="ac responsive-input" placeholder="AC" required /></label>
        <label>Dex <input type="number" class="dex responsive-input" placeholder="Dex" required /></label>
        <label>Passive Perception <input type="number" class="pp responsive-input" placeholder="Passive Perception" required /></label>
        <label>Resistances <input type="text" class="resistances responsive-input" placeholder="Fire, Cold..." /></label>
        <label>Immunities <input type="text" class="immunities responsive-input" placeholder="Charmed, Poisoned..." /></label>
        <button type="button" class="remove">Remove</button>
      </div>
    `;

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    memberList.appendChild(wrapper);

    const nameInput = content.querySelector('.name');
    const headerText = header.querySelector('strong');

    nameInput.addEventListener('blur', () => {
      const name = nameInput.value.trim();
      if (name) {
        headerText.textContent = name;
      } else {
      // Revert to default if the field is empty
      headerText.textContent = `Party Member ${[...memberList.children].indexOf(wrapper) + 1}`;
        }
      });

    document.getElementById('memberSection').style.display = 'block';

    header.addEventListener('click', () => {
      content.classList.toggle('collapsed');
      const icon = header.querySelector('.toggle-icon');
      icon.textContent = content.classList.contains('collapsed') ? '＋' : '−';
    });
    

    content.querySelector('.remove')?.addEventListener('click', () => {
      wrapper.remove();
      if (memberList.children.length === 0) {
        document.getElementById('memberSection').style.display = 'none';
      }
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

    const memberWrappers = memberList.querySelectorAll('.collapsible-member');
    const members = [];

    memberWrappers.forEach(wrapper => {
      const row = wrapper.querySelector('.member-row');
      if (!row) return;

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
        window.location.href = '../party/view-parties.html';
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
