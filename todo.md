Todo listi
- Create monster tab inside of Monster manual
- Plan out how to do Battle setup 
- Plan how the battle tracker works.

🔁 View Encounters Page (list and manage them)

🧙 Battle Mode UI (tracking turn order, HP, conditions)

🎯 Damage and Healing Tracking

🧪 Live Status Effects / Round Counters

🧾 Export / Save Battle Logs (for nerdy glory)


⚔️ BATTLE TRACKER FEATURE LIST
✅ CURRENTLY WORKING
 Display encounter name and party

 Display initiative order (sorted correctly)

 Show current round

 Cycle through combatants (next/previous turn)

 Highlight current turn

📋 THINGS TO DISPLAY PER COMBATANT
Each entry in the initiative order should show:

 Name (already shown)

 Initiative score (already shown)

 Dexterity score

 AC (Armor Class) (only if a player)

 Max HP

 Current HP (editable)

 Class/Type (e.g., “Fighter”, “Goblin”)

 Status Effects (e.g., poisoned, stunned, blessed) with duration timers

 Concentrating status (checkbox)

 [Optional] Icons or styles to differentiate players vs monsters

🔁 THINGS TO TRACK PER ROUND
 Current round number (already shown)

 Start-of-turn effects (e.g., poison tick, regen)

 Duration countdown for conditions/status effects

🛠️ INTERACTIVE CONTROLS
 ✅/❌ Toggle concentrating

 🔼/🔽 Adjust HP live (+/- or direct input)

 ✏️ Add/remove conditions from a dropdown or input

 🧹 Clear all conditions button

 ❤️ Heal/Damage buttons

 ⏭️ Skip Turn / ⏮️ Go Back

 🔄 Reset Initiative Tracker / Restart Battle

💾 FUTURE FEATURES (Optional)
 📝 Notes per combatant

 📦 Auto-save battle state to localStorage

 ☁️ Save/load persistent battles from server

 ⚙️ Settings panel (e.g., auto-round increase toggle)