import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

draft_logic = '''        document.getElementById('draft-team').addEventListener('click', () => {
            const members = currentTeam.filter(m => m !== null);
            if (members.length === 0) {
                alert('隊伍是空的！無法暫存。');
                return;
            }
            
            const timeText = formatSlotKeyToText(document.getElementById('team-timeslot').value);
            const boss = document.getElementById('team-boss').value || '未指定';
            
            draftTeams.push({
                boss: boss,
                timeslot: document.getElementById('team-timeslot').value,
                timeText: timeText,
                members: members,
                timestamp: new Date().getTime()
            });
            
            saveDB();
            renderDraftTeams();
            alert(已暫存【\】\ 人隊伍！);
        });
        
        function renderDraftTeams() {
            const container = document.getElementById('draft-teams-container');
            if(!container) return;
            container.innerHTML = '';
            
            if (!draftTeams || draftTeams.length === 0) {
                container.innerHTML = '<p class="empty-state" style="color:var(--text-muted); grid-column: 1 / -1; text-align: center;">目前沒有暫存的隊伍。</p>';
                return;
            }

            draftTeams.forEach((team, idx) => {
                const card = document.createElement('div');
                card.className = 'glass-card';
                card.style.padding = '1rem';
                card.style.position = 'relative';
                
                let membersHtml = '';
                team.members.forEach((m, mIdx) => {
                    const tText = m.tickets !== undefined ? m.tickets : 7;
                    membersHtml += 
                        <div style="font-size: 0.9rem; padding: 0.4rem; background: var(--bg-main); border-radius: 4px; margin-bottom: 0.3rem;">
                            <strong>\</strong> <span style="color:var(--primary-color);">[可打:\]</span>
                            <br><span style="color:var(--text-muted); font-size: 0.8rem;">Lv.\ \</span>
                        </div>
                    ;
                });

                card.innerHTML = 
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--card-border); padding-bottom:0.5rem; margin-bottom:0.8rem;">
                        <h3 style="color:var(--warning-color); margin:0;">【\】暫存</h3>
                        <span style="font-size: 0.85rem; color:var(--text-muted);">\</span>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        \
                    </div>
                    <button class="btn-secondary" style="width:100%; padding: 0.4rem;" onclick="deleteDraftTeam(\)">刪除此暫存</button>
                ;
                container.appendChild(card);
            });
        }
        
        window.deleteDraftTeam = function(idx) {
            if(confirm('確定要刪除這個暫存隊伍嗎？')) {
                draftTeams.splice(idx, 1);
                saveDB();
                renderDraftTeams();
            }
        };

'''

target = "document.getElementById('confirm-team').addEventListener('click', () => {"
if target in content:
    content = content.replace(target, draft_logic + target)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

