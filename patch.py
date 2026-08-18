import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update team builder DOM logic
team_builder_logic = '''        let currentTeam = new Array(6).fill(null);

        function renderTeamSlots(size) {
            currentTeam = new Array(size).fill(null);
            const container = document.getElementById('team-slots');
            container.innerHTML = '';
            
            if (size === 12) {
                container.classList.add('dragon-king');
                document.querySelector('#captain-view .right-panel .team-slots').previousElementSibling.querySelector('div').textContent = '(12人)';
            } else {
                container.classList.remove('dragon-king');
                document.querySelector('#captain-view .right-panel .team-slots').previousElementSibling.querySelector('div').textContent = '(6人)';
            }

            for (let i = 0; i < size; i++) {
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.dataset.index = i;
                slot.dataset.filled = "false";
                slot.innerHTML = 空位 \;

                slot.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    slot.classList.add('drag-over');
                });
                slot.addEventListener('dragleave', () => {
                    slot.classList.remove('drag-over');
                });
                slot.addEventListener('drop', (e) => {
                    e.preventDefault();
                    slot.classList.remove('drag-over');
                    const data = e.dataTransfer.getData('application/json');
                    if (data) {
                        const p = JSON.parse(data);
                        currentTeam[i] = p;
                        const ticketsText = p.tickets !== undefined ? p.tickets : 7;
                        slot.innerHTML = 
                            <div class="player-card" style="cursor:pointer; width: 100%;" title="點擊移除此隊員">
                                <div class="player-info">
                                    <span class="player-name">\</span>
                                    <span class="player-meta" style="color:var(--primary-color); font-weight:bold;">[可打: \]</span>
                                    <span class="player-meta">Lv.\ | \</span>
                                </div>
                            </div>
                        ;
                        slot.dataset.filled = "true";
                        renderAvailablePlayers(document.getElementById('team-timeslot').value, document.getElementById('team-boss').value);
                    }
                });

                slot.addEventListener('click', () => {
                    if (slot.dataset.filled === "true") {
                        currentTeam[i] = null;
                        slot.innerHTML = 空位 \;
                        slot.dataset.filled = "false";
                        renderAvailablePlayers(document.getElementById('team-timeslot').value, document.getElementById('team-boss').value);
                    }
                });

                container.appendChild(slot);
            }
        }

        document.getElementById('team-boss').addEventListener('change', (e) => {
            const boss = e.target.value;
            if (boss === '龍王') {
                renderTeamSlots(12);
            } else {
                renderTeamSlots(6);
            }
            updateTeamView();
        });

        // Initialize default slots
        renderTeamSlots(6);

        function clearTeamSlots() {
            currentTeam.fill(null);
            const slots = document.querySelectorAll('.slot');
            slots.forEach((slot, index) => {
                slot.innerHTML = 空位 \;
                slot.dataset.filled = "false";
            });
        }'''

# Replace the static slot logic with dynamic
start_str = "let currentTeam = new Array(6).fill(null);"
end_str = "function clearTeamSlots() {"
start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + team_builder_logic + "\n" + content[end_idx:]

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

