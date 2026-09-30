// --- Helper Functions ---
window.formatSlotKeyToText = function(key) {
    if (!key) return "未知時間";
    if (key.includes('/') || key.includes(':') || key.includes('(')) {
        return key;
    }
    const parts = key.split('-');
    if (parts.length >= 4) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        const row = parseInt(parts[3]);
        const hour = Math.floor(row / 2) + 8;
        const min = row % 2 === 0 ? '00' : '30';
        const dateObj = new Date(year, month - 1, day);
        const weekDays = ['日','一','二','三','四','五','六'];
        const weekDay = weekDays[dateObj.getDay()];
        return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')} (${weekDay}) ${hour.toString().padStart(2, '0')}:${min}`;
    }
    return key;
};

function getTeamTimestamp(team) {
    if (!team) return 0;
    if (team.scheduledTimestamp) return team.scheduledTimestamp;
    
    if (team.timeslot && typeof team.timeslot === 'string') {
        const parts = team.timeslot.split('-');
        if (parts.length >= 4) {
            const year = parseInt(parts[0]) || 0;
            const month = (parseInt(parts[1]) || 1) - 1;
            const day = parseInt(parts[2]) || 1;
            const row = parseInt(parts[3]) || 0;
            const hour = Math.floor(row / 2) + 8;
            const min = row % 2 === 0 ? 0 : 30;
            const d = new Date(year, month, day, hour, min);
            if (!isNaN(d.getTime())) return d.getTime();
        }
    }
    
    const str = team.timeText || team.timeslot || '';
    const m = str.match(/(\d{4})?[/]?(\d{1,2})\/(\d{1,2}).*?(\d{1,2}):(\d{2})/);
    if (m) {
        const year = m[1] ? parseInt(m[1]) : new Date().getFullYear();
        const month = parseInt(m[2]) - 1;
        const day = parseInt(m[3]);
        const hour = parseInt(m[4]);
        const min = parseInt(m[5]);
        const d = new Date(year, month, day, hour, min);
        if (!isNaN(d.getTime())) return d.getTime();
    }
    
    if (team.createdAt) return team.createdAt;
    return 0;
}

// --- Firebase Setup ---
const firebaseConfig = {
    apiKey: "AIzaSyAO4WaojDNH5Rg_FbmDui76l7RzfeFI0bw",
    authDomain: "soulmine-8c039.firebaseapp.com",
    projectId: "soulmine-8c039",
    storageBucket: "soulmine-8c039.firebasestorage.app",
    messagingSenderId: "822855409780",
    appId: "1:822855409780:web:07e6602f297aad619d7121",
    databaseURL: "https://soulmine-8c039-default-rtdb.asia-southeast1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- Client Device Identification & Local Memory ---
function getClientId() {
    let cid = localStorage.getItem('soulmine_client_id');
    if (!cid) {
        cid = 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('soulmine_client_id', cid);
    }
    return cid;
}
const myClientId = getClientId();

function getSavedChar() {
    try {
        return JSON.parse(localStorage.getItem('soulmine_saved_char')) || {};
    } catch (e) {
        return {};
    }
}

function setSavedChar(name, job, level) {
    localStorage.setItem('soulmine_saved_char', JSON.stringify({ name, job, level }));
}

function getSavedCreator() {
    return localStorage.getItem('soulmine_creator_name') || '';
}

function setSavedCreator(name) {
    localStorage.setItem('soulmine_creator_name', name);
}

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let raidsDB = {};
    let confirmedTeams = [];
    let changelogs = [];
    let raidDatePicker = null;

    // --- Realtime Sync ---
    db.ref('/').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        raidsDB = data.raids || {};
        
        // Preserve all historical and confirmed teams
        const rawTeams = data.teams ? (Array.isArray(data.teams) ? data.teams : Object.values(data.teams)) : [];
        confirmedTeams = rawTeams.filter(t => t !== null && t !== undefined);
        
        const rawChangelogs = data.changelog || data.changelogs || [];
        changelogs = Array.isArray(rawChangelogs) ? rawChangelogs.filter(c => c !== null && c !== undefined) : Object.values(rawChangelogs);
        
        updateUI();
    });

    function saveDB() {
        const safeTeams = confirmedTeams.filter(t => t !== null && t !== undefined);
        db.ref('teams').set(safeTeams);
    }

    // --- App Initialization ---
    initApp();

    function initApp() {
        // --- Tab Switching ---
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const targetId = btn.dataset.target;
                const targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.classList.add('active');
                updateUI();
            });
        });

        setupRaidModals();
        setupAdminAuth();
        setupChangelogForm();
        updateUI();
    }

    function updateUI() {
        updateAdminUI();
        renderRecruitBoard();
        renderConfirmedTeams();
        renderChangelogs();
    }

    // --- Time Dropdown Logic ---
    function updateRaidTimeDropdown(dateObj) {
        const timeSelect = document.getElementById('raid-time-select');
        if (!timeSelect) return;
        timeSelect.innerHTML = '';

        if (!dateObj) {
            timeSelect.innerHTML = '<option value="">請先選擇出團日期</option>';
            return;
        }

        const day = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const isWeekend = (day === 0 || day === 6);
        let timeOptions = [];

        if (isWeekend) {
            // 假日: 上午 10:00 到 晚上 22:00 (每半小時)
            for (let h = 10; h <= 22; h++) {
                const hh = h.toString().padStart(2, '0');
                timeOptions.push(`${hh}:00`);
                if (h < 22) {
                    timeOptions.push(`${hh}:30`);
                }
            }
        } else {
            // 平日: 20:00 到 22:00 (每半小時)
            timeOptions = ['20:00', '20:30', '21:00', '21:30', '22:00'];
        }

        timeOptions.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            timeSelect.appendChild(opt);
        });
    }

    // --- Modals Setup ---
    function setupRaidModals() {
        const createModal = document.getElementById('create-raid-modal');
        const joinModal = document.getElementById('join-raid-modal');
        const selfJoinCheck = document.getElementById('create-join-self');
        const selfCharFields = document.getElementById('create-self-char-fields');

        if (selfJoinCheck && selfCharFields) {
            selfJoinCheck.addEventListener('change', () => {
                selfCharFields.style.display = selfJoinCheck.checked ? 'flex' : 'none';
            });
        }

        // Setup Flatpickr for raid date
        const raidDateInput = document.getElementById('raid-date');
        if (raidDateInput && typeof flatpickr !== 'undefined') {
            raidDatePicker = flatpickr(raidDateInput, {
                dateFormat: "Y/m/d",
                minDate: "today",
                locale: "zh_tw",
                onChange: function(selectedDates) {
                    if (selectedDates.length > 0) {
                        updateRaidTimeDropdown(selectedDates[0]);
                    }
                }
            });
        }

        const btnOpenCreate = document.getElementById('btn-open-create-modal');
        if (btnOpenCreate) {
            btnOpenCreate.addEventListener('click', () => {
                // Prefill organizer name
                const creatorInput = document.getElementById('raid-creator-name');
                if (creatorInput) {
                    creatorInput.value = getSavedCreator();
                }

                // Prefill saved character info
                const saved = getSavedChar();
                const charNameInput = document.getElementById('create-char-name');
                const charJobSelect = document.getElementById('create-char-job');
                const charLevelInput = document.getElementById('create-char-level');

                if (charNameInput && saved.name) charNameInput.value = saved.name;
                if (charJobSelect && saved.job) charJobSelect.value = saved.job;
                if (charLevelInput && saved.level) charLevelInput.value = saved.level;

                if (selfJoinCheck) {
                    selfJoinCheck.checked = true;
                    if (selfCharFields) selfCharFields.style.display = 'flex';
                }

                if (raidDatePicker) {
                    raidDatePicker.setDate(new Date());
                    updateRaidTimeDropdown(new Date());
                }

                createModal.style.display = 'flex';
            });
        }

        const btnCancelCreate = document.getElementById('btn-cancel-create');
        if (btnCancelCreate) {
            btnCancelCreate.addEventListener('click', () => {
                createModal.style.display = 'none';
            });
        }

        const btnCancelJoin = document.getElementById('btn-cancel-join');
        if (btnCancelJoin) {
            btnCancelJoin.addEventListener('click', () => {
                joinModal.style.display = 'none';
            });
        }

        const createRaidForm = document.getElementById('create-raid-form');
        if (createRaidForm) {
            createRaidForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const creatorName = document.getElementById('raid-creator-name').value.trim();
                    if (!creatorName) {
                        alert("請輸入發起人稱呼！");
                        return;
                    }
                    setSavedCreator(creatorName);

                    const boss = document.getElementById('raid-boss').value;
                    const gamesEl = document.getElementById('raid-games');
                    const gamesCount = gamesEl ? (parseInt(gamesEl.value, 10) || 7) : 7;
                    const maxPlayers = (boss === '龍王') ? 12 : 6;
                    const dateStr = document.getElementById('raid-date').value;
                    const timeStr = document.getElementById('raid-time-select').value;

                    if (!dateStr || !timeStr) {
                        alert("請選擇出團日期與時段！");
                        return;
                    }

                    let initialMembers = [];
                    const isSelfJoin = selfJoinCheck ? selfJoinCheck.checked : true;
                    if (isSelfJoin) {
                        const charName = document.getElementById('create-char-name').value.trim();
                        const charJob = document.getElementById('create-char-job').value;
                        const charLevel = document.getElementById('create-char-level').value.trim();

                        if (!charName || !charLevel) {
                            alert("請填寫出戰角色的遊戲ID與等級，或取消勾選「發起人同時入座」！");
                            return;
                        }

                        setSavedChar(charName, charJob, charLevel);
                        initialMembers.push({
                            slotIndex: 0,
                            name: charName,
                            job: charJob,
                            level: charLevel,
                            clientId: myClientId,
                            isCreator: true
                        });
                    }

                    // Parse dateObj for weekday and exact timestamp
                    const dateParts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
                    const timeParts = timeStr.split(':');
                    const dObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), parseInt(timeParts[0]), parseInt(timeParts[1]));
                    const weekDays = ['日','一','二','三','四','五','六'];
                    const weekDay = isNaN(dObj.getDay()) ? '六' : weekDays[dObj.getDay()];
                    const fullTimeText = `${dateParts[1]}/${dateParts[2]} (${weekDay}) ${timeStr}`;

                    const newRaidRef = db.ref('raids').push();
                    newRaidRef.set({
                        id: newRaidRef.key,
                        boss: boss,
                        gamesCount: gamesCount,
                        maxPlayers: maxPlayers,
                        date: dateStr,
                        timeStr: timeStr,
                        time: fullTimeText,
                        scheduledTimestamp: !isNaN(dObj.getTime()) ? dObj.getTime() : Date.now(),
                        creator: creatorName,
                        creatorClientId: myClientId,
                        isConfirmed: false,
                        members: initialMembers,
                        createdAt: Date.now()
                    });

                    createModal.style.display = 'none';
                    createRaidForm.reset();
                } catch (err) {
                    console.error("發佈招募錯誤:", err);
                    alert("發佈招募失敗：" + err.message);
                }
            });
        }

        const joinRaidForm = document.getElementById('join-raid-form');
        if (joinRaidForm) {
            joinRaidForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const raidId = document.getElementById('join-raid-id').value;
                const slotIdx = parseInt(document.getElementById('join-slot-index').value) || 0;
                const charName = document.getElementById('join-char-name').value.trim();
                const charJob = document.getElementById('join-char-job').value;
                const charLevel = document.getElementById('join-char-level').value.trim();

                if (!charName || !charLevel) {
                    alert("請輸入遊戲ID與等級！");
                    return;
                }

                setSavedChar(charName, charJob, charLevel);

                const raid = raidsDB[raidId];
                if (raid) {
                    let members = raid.members || [];
                    // Check if this character name is already joined
                    if (members.some(m => m.name === charName)) {
                        alert(`角色「${charName}」已經在此隊伍中了！`);
                        return;
                    }
                    // Check if this slot is already taken
                    if (members.some(m => (m.slotIndex !== undefined ? m.slotIndex : -1) === slotIdx)) {
                        alert("此位置已被其他隊友搶先報名！請選擇其他空位。");
                        return;
                    }

                    const maxSlots = (raid.boss === '龍王') ? 12 : (raid.maxPlayers || 6);
                    if (members.length >= maxSlots) {
                        alert("隊伍已滿額！");
                        joinModal.style.display = 'none';
                        return;
                    }

                    members.push({
                        slotIndex: slotIdx,
                        name: charName,
                        job: charJob,
                        level: charLevel,
                        clientId: myClientId
                    });

                    db.ref(`raids/${raidId}/members`).set(members);
                }
                joinModal.style.display = 'none';
            });
        }
    }

    window.openJoinModal = function(raidId, slotIndex) {
        document.getElementById('join-raid-id').value = raidId;
        document.getElementById('join-slot-index').value = (slotIndex !== undefined) ? slotIndex : 0;
        const raid = raidsDB[raidId];
        const isDragonKing = raid && raid.boss === '龍王';
        const teamName = isDragonKing ? ((slotIndex || 0) < 6 ? '第一隊 ' : '第二隊 ') : '';
        const slotNum = isDragonKing ? ((slotIndex || 0) < 6 ? (slotIndex || 0) + 1 : (slotIndex || 0) - 5) : (slotIndex || 0) + 1;
        const descEl = document.getElementById('join-slot-desc');
        if (descEl) {
            descEl.textContent = `報名位置：${teamName}第 ${slotNum} 位。填寫後系統將為您自動記憶。`;
        }

        // Prefill saved character info
        const saved = getSavedChar();
        const nameInput = document.getElementById('join-char-name');
        const jobSelect = document.getElementById('join-char-job');
        const levelInput = document.getElementById('join-char-level');

        if (nameInput) nameInput.value = saved.name || '';
        if (jobSelect && saved.job) jobSelect.value = saved.job;
        if (levelInput) levelInput.value = saved.level || '';

        document.getElementById('join-raid-modal').style.display = 'flex';
    };

    window.leaveRaid = function(raidId, memberName) {
        if (confirm(`確定要退出/移除角色「${memberName}」嗎？`)) {
            const raid = raidsDB[raidId];
            if (raid && raid.members) {
                const newMembers = raid.members.filter(m => m.name !== memberName);
                db.ref(`raids/${raidId}/members`).set(newMembers);
            }
        }
    };

    window.confirmRaid = function(raidId) {
        const raid = raidsDB[raidId];
        if (!raid) return;

        if (confirm("確認出團後，隊伍將正式成團並移至「出團看板」，確定出團？")) {
            const newTeam = {
                boss: raid.boss,
                timeslot: raid.time,
                timeText: raid.time,
                scheduledTimestamp: raid.scheduledTimestamp || Date.now(),
                members: raid.members || [],
                gamesCount: raid.gamesCount || 7,
                rolledChannels: [Math.floor(Math.random() * 2000) + 1],
                finalChannel: null,
                creator: raid.creator,
                createdAt: raid.createdAt || Date.now(),
                isHistorical: false
            };

            confirmedTeams.push(newTeam);
            db.ref('teams').set(confirmedTeams);
            db.ref(`raids/${raidId}`).remove();

            // Switch to Confirmed tab
            const statusTabBtn = document.querySelector('[data-target="tab-status"]');
            if (statusTabBtn) statusTabBtn.click();
        }
    };

    window.deleteRaid = function(raidId) {
        if (confirm("確定要刪除這個招募隊伍嗎？")) {
            db.ref(`raids/${raidId}`).remove();
        }
    };

    // --- Tab 1: Recruitment Board ---
    function renderRecruitBoard() {
        const container = document.getElementById('recruit-container');
        if (!container) return;
        container.innerHTML = '';

        const raids = Object.values(raidsDB).filter(r => !r.isConfirmed).sort((a, b) => (a.scheduledTimestamp || a.createdAt) - (b.scheduledTimestamp || b.createdAt));

        if (raids.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">目前沒有正在招募中的隊伍，歡迎點擊上方按鈕建立新招募！</p>`;
            return;
        }

        const myCreatorName = getSavedCreator();

        raids.forEach(raid => {
            const members = raid.members || [];
            const isDragonKing = (raid.boss === '龍王');
            const maxSlots = isDragonKing ? 12 : (raid.maxPlayers || 6);
            const isFull = members.length >= maxSlots;
            const isCreator = (raid.creatorClientId && raid.creatorClientId === myClientId) || (raid.creator && raid.creator === myCreatorName);

            const renderSlot = (slotIdx) => {
                const m = members.find((item, index) => (item.slotIndex !== undefined ? item.slotIndex : index) === slotIdx);
                const slotNum = isDragonKing ? (slotIdx < 6 ? slotIdx + 1 : slotIdx - 5) : slotIdx + 1;
                if (m) {
                    return `
                        <div style="background: rgba(255,255,255,0.08); padding: 0.65rem 0.8rem; border-radius: 8px; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.12);">
                            <div>
                                <strong style="color: var(--primary-color);">${m.job}</strong> 
                                <span style="color: #fff; font-weight: 600; margin-left: 0.3rem;">${m.name}</span> 
                                <span style="color: var(--text-muted); font-size: 0.8rem;">(Lv.${m.level})</span>
                                ${m.isCreator ? '<span style="color:var(--primary-color); font-size:0.85rem; margin-left:0.3rem;" title="團長">👑</span>' : ''}
                            </div>
                            <button onclick="leaveRaid('${raid.id}', '${m.name}')" style="background:transparent; border:none; color:var(--danger-color); cursor:pointer; font-size:0.8rem; font-weight: bold; padding: 0.2rem 0.4rem;" title="退出或移除此席位">退出</button>
                        </div>
                    `;
                } else {
                    return `
                        <div onclick="openJoinModal('${raid.id}', ${slotIdx})" style="cursor: pointer; border: 1.5px dashed var(--primary-color); background: rgba(255, 117, 24, 0.08); padding: 0.65rem 0.8rem; border-radius: 8px; font-size: 0.85rem; color: var(--primary-color); text-align: center; font-weight: 700; transition: all 0.2s;" onmouseover="this.style.background='rgba(255, 117, 24, 0.18)'" onmouseout="this.style.background='rgba(255, 117, 24, 0.08)'" title="點擊報名此位置 (第 ${slotNum} 位)">➕ 點擊報名 (第 ${slotNum} 位)</div>
                    `;
                }
            };

            let slotsHtml = '';
            if (isDragonKing) {
                let team1Html = '';
                for (let i = 0; i < 6; i++) team1Html += renderSlot(i);
                let team2Html = '';
                for (let i = 6; i < 12; i++) team2Html += renderSlot(i);

                slotsHtml = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <div style="color: var(--primary-color); font-weight: bold; margin-bottom: 0.5rem; font-size: 0.95rem; border-bottom: 1px solid rgba(255,117,24,0.3); padding-bottom: 0.3rem;">第一隊</div>
                            <div style="display: flex; flex-direction: column; gap: 0.45rem;">${team1Html}</div>
                        </div>
                        <div>
                            <div style="color: var(--primary-color); font-weight: bold; margin-bottom: 0.5rem; font-size: 0.95rem; border-bottom: 1px solid rgba(255,117,24,0.3); padding-bottom: 0.3rem;">第二隊</div>
                            <div style="display: flex; flex-direction: column; gap: 0.45rem;">${team2Html}</div>
                        </div>
                    </div>
                `;
            } else {
                let listHtml = '';
                for (let i = 0; i < 6; i++) listHtml += renderSlot(i);
                slotsHtml = `
                    <div style="display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 1rem;">
                        ${listHtml}
                    </div>
                `;
            }

            const actionsHtml = `
                <div style="display:flex; gap:0.5rem; margin-top: 0.8rem;">
                    <button onclick="confirmRaid('${raid.id}')" class="btn-primary" style="flex:2; padding: 0.65rem; font-size: 0.95rem; font-weight: bold; background: var(--primary-color); border: none; border-radius: 8px; cursor: pointer; color: #fff;">✅ 確認出團</button>
                    <button onclick="deleteRaid('${raid.id}')" class="btn-secondary" style="flex:1; border: 1px solid var(--danger-color); color: var(--danger-color); background: transparent; border-radius: 8px; padding: 0.65rem; font-size: 0.95rem; cursor: pointer;">刪除</button>
                </div>
            `;

            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.background = 'rgba(26, 15, 43, 0.75)';
            if (isDragonKing) {
                card.classList.add('dragon-recruit-card');
            }

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items: baseline; margin-bottom: 0.8rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
                    <h3 style="margin:0; color:var(--primary-color); font-size: 1.2rem;">[${raid.boss}]${raid.gamesCount || 7}場</h3>
                    <span style="font-weight:bold; font-size: 1.05rem; color: #fff;">${raid.time}</span>
                </div>
                <div style="margin-bottom: 0.8rem; color: var(--text-muted); font-size: 0.9rem; display: flex; justify-content: space-between;">
                    <span>發起人：<strong style="color: #fff;">${raid.creator || '公會成員'}</strong></span>
                    <span>成員：<strong style="color: ${isFull ? 'var(--danger-color)' : 'var(--success-color)'}; font-size: 1rem;">${members.length}</strong> / ${maxSlots}</span>
                </div>
                ${slotsHtml}
                ${actionsHtml}
            `;
            container.appendChild(card);
        });
    }

    // --- Tab 2: Confirmed & Historical Teams ---
    function renderConfirmedTeams() {
        const container = document.getElementById('confirmed-teams-container');
        const historyContainer = document.getElementById('historical-teams-container');
        if (container) container.innerHTML = '';
        if (historyContainer) historyContainer.innerHTML = '';

        const now = Date.now();
        let changed = false;
        let validTeams = [];

        confirmedTeams.forEach(team => {
            if (!team) {
                changed = true;
                return;
            }
            const teamTimestamp = getTeamTimestamp(team);
            // If scheduled time has passed, mark historical
            if (teamTimestamp > 0 && now > teamTimestamp) {
                if (!team.isHistorical) {
                    team.isHistorical = true;
                    changed = true;
                }
            }
            validTeams.push(team);
        });

        if (changed) {
            confirmedTeams = validTeams;
            saveDB();
        }

        // Sort: active teams soonest first, historical teams newest first
        let sortedTeams = [...confirmedTeams].sort((a, b) => {
            return getTeamTimestamp(a) - getTeamTimestamp(b);
        });

        let activeCount = 0;
        let historyCount = 0;

        sortedTeams.forEach((team) => {
            try {
                const isHistory = !!team.isHistorical;
                const targetContainer = isHistory ? historyContainer : container;
                if (!targetContainer) return;

                if (isHistory) historyCount++;
                else activeCount++;

                const teamMembers = team.members ? (Array.isArray(team.members) ? team.members : Object.values(team.members)) : [];
                const bossName = team.boss || '樹王';
                const isDragonKing = bossName === '龍王';

                const card = document.createElement('div');
                card.className = 'glass-card';
                card.style.background = isHistory ? 'var(--bg-color)' : 'var(--card-bg)';
                card.style.border = '1px solid var(--card-border)';
                card.style.borderRadius = '12px';
                card.style.padding = '1.5rem';
                card.style.opacity = isHistory ? '0.85' : '1';
                if (isDragonKing) {
                    card.style.gridColumn = '1 / -1';
                }

                const header = document.createElement('div');
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.alignItems = 'center';
                header.style.marginBottom = '1rem';
                header.style.borderBottom = '1px solid var(--card-border)';
                header.style.paddingBottom = '0.5rem';

                const timeDisplay = team.timeText ? team.timeText : window.formatSlotKeyToText(team.timeslot || "");
                const channelDisplay = team.finalChannel ? team.finalChannel : (team.channels && team.channels !== '未指定' ? team.channels : '');
                const channelInfo = channelDisplay ? `<span style="color:var(--primary-color); font-weight:bold;">(頻道: ${channelDisplay})</span>` : '';

                header.innerHTML = `
                    <h3 style="color: var(--primary-color); margin: 0;">[${bossName}]${team.gamesCount || 7}場 出團時間 ${timeDisplay} ${channelInfo}</h3>
                    <span style="font-size: 0.9rem; color: var(--text-muted);">共 ${teamMembers.length} 人</span>
                `;
                card.appendChild(header);

                // Members Grid
                const gridsWrapper = document.createElement('div');
                if (isDragonKing) {
                    gridsWrapper.style.display = 'grid';
                    gridsWrapper.style.gridTemplateColumns = '1fr 1fr';
                    gridsWrapper.style.gap = '2rem';
                }

                const createGrid = (startIndex, count, title) => {
                    const wrap = document.createElement('div');
                    if (title) {
                        wrap.innerHTML = `<h4 style="margin-top:0; margin-bottom:0.8rem; color:var(--primary-color); border-bottom:1px solid var(--primary-color); padding-bottom:4px; font-size:1rem;">${title}</h4>`;
                    }
                    const grid = document.createElement('div');
                    grid.style.display = 'grid';
                    grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
                    grid.style.gap = '1rem';

                    for (let i = 0; i < count; i++) {
                        const memberIndex = startIndex + i;
                        const memberSlot = document.createElement('div');
                        memberSlot.style.padding = '0.75rem';
                        memberSlot.style.borderRadius = '8px';
                        memberSlot.style.border = '1px solid var(--card-border)';

                        const member = teamMembers.find((item, index) => (item.slotIndex !== undefined ? item.slotIndex : index) === memberIndex);
                        if (member) {
                            memberSlot.style.background = '#ffffff';
                            memberSlot.innerHTML = `
                                <div style="font-weight: 600; color: #4a4559;">${member.name} ${member.isCreator ? '👑' : ''}</div>
                                <div style="font-size: 0.85rem; color: #4a4559;">Lv.${member.level || '?'} / ${member.job || '冒險家'}</div>
                            `;
                        } else {
                            memberSlot.style.background = 'transparent';
                            memberSlot.style.borderStyle = 'dashed';
                            memberSlot.style.display = 'flex';
                            memberSlot.style.alignItems = 'center';
                            memberSlot.style.justifyContent = 'center';
                            memberSlot.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">(空位)</span>';
                        }
                        grid.appendChild(memberSlot);
                    }
                    wrap.appendChild(grid);
                    return wrap;
                };

                if (isDragonKing) {
                    gridsWrapper.appendChild(createGrid(0, 6, '第一隊'));
                    gridsWrapper.appendChild(createGrid(6, 6, '第二隊'));
                } else {
                    gridsWrapper.appendChild(createGrid(0, 6, null));
                }
                card.appendChild(gridsWrapper);

                // Drop records for historical teams
                if (isHistory) {
                    const dropSection = document.createElement('div');
                    dropSection.style.marginTop = '1.5rem';
                    dropSection.style.padding = '1rem';
                    dropSection.style.background = 'var(--bg-color)';
                    dropSection.style.borderRadius = '8px';
                    dropSection.style.border = '1px solid var(--card-border)';

                    const dropValue = team.drops || '';
                    dropSection.innerHTML = `
                        <div style="margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem; color: var(--text-main);">記錄掉寶</div>
                        <textarea class="drop-input" placeholder="例如：楓葉頭巾x1..." style="width: 100%; height: 60px; padding: 0.5rem; font-size: 0.9rem; border: 1px solid var(--card-border); border-radius: 4px; resize: vertical; box-sizing: border-box; background: var(--input-bg); color: var(--text-main);">${dropValue}</textarea>
                        <div style="text-align: right; margin-top: 0.5rem;">
                            <button class="btn-primary save-drop-btn" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;">儲存紀錄</button>
                        </div>
                    `;

                    dropSection.querySelector('.save-drop-btn').onclick = (e) => {
                        const val = dropSection.querySelector('.drop-input').value;
                        team.drops = val;
                        saveDB();
                        const btn = e.currentTarget;
                        const originalText = btn.textContent;
                        btn.textContent = '已儲存！';
                        btn.style.background = '#28a745';
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.style.background = 'var(--primary-color)';
                        }, 2000);
                    };
                    card.appendChild(dropSection);
                } else {
                    // Channel selection for active teams (1 ~ 2000)
                    const channelSection = document.createElement('div');
                    channelSection.style.marginTop = '1.5rem';
                    channelSection.style.padding = '1rem';
                    channelSection.style.background = 'var(--bg-color)';
                    channelSection.style.borderRadius = '8px';
                    channelSection.style.border = '1px solid var(--card-border)';

                    function renderChannelUI() {
                        channelSection.innerHTML = '';
                        if (team.finalChannel) {
                            channelSection.innerHTML = `
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 600; color: var(--primary-color);">最終頻道: <span style="color:var(--text-main);">${team.finalChannel}</span></span>
                                    <button class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;">重新選擇頻道</button>
                                </div>
                            `;
                            channelSection.querySelector('button').onclick = () => {
                                team.finalChannel = null;
                                saveDB();
                                renderConfirmedTeams();
                            };
                        } else {
                            if (!team.rolledChannels || !Array.isArray(team.rolledChannels)) {
                                team.rolledChannels = [Math.floor(Math.random() * 2000) + 1];
                                setTimeout(() => saveDB(), 0);
                            }
                            const singleChannel = team.rolledChannels[0] || (Math.floor(Math.random() * 2000) + 1);

                            channelSection.innerHTML = `
                                <div style="margin-bottom: 0.8rem; font-weight: 600; font-size: 0.9rem; color: var(--text-main);">頻道選擇</div>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input type="number" min="1" max="2000" class="channel-input" value="${singleChannel}" style="width: 85px; padding: 0.4rem; font-size: 1rem; border: 1px solid var(--card-border); border-radius: 4px; text-align: center; color: #4a4559; background: #fff;">
                                    <button class="btn-secondary reroll-btn" style="padding: 0.4rem 0.8rem; font-size: 1rem;" title="隨機骰頻道">🎲</button>
                                    <button class="btn-primary select-btn" style="padding: 0.4rem 1rem; font-size: 0.9rem;">鎖定</button>
                                </div>
                            `;

                            channelSection.querySelector('.reroll-btn').onclick = (e) => {
                                const inputEl = channelSection.querySelector('.channel-input');
                                const btn = e.currentTarget;
                                if (btn.dataset.timer) clearInterval(parseInt(btn.dataset.timer));

                                let duration = 600;
                                let interval = 50;
                                let elapsed = 0;
                                const timer = setInterval(() => {
                                    inputEl.value = Math.floor(Math.random() * 2000) + 1;
                                    elapsed += interval;
                                    if (elapsed >= duration) {
                                        clearInterval(timer);
                                        btn.dataset.timer = "";
                                        team.rolledChannels = [parseInt(inputEl.value)];
                                    }
                                }, interval);
                                btn.dataset.timer = timer;
                            };

                            channelSection.querySelector('.select-btn').onclick = () => {
                                const inputEl = channelSection.querySelector('.channel-input');
                                const val = parseInt(inputEl.value);
                                if (!val || val < 1 || val > 2000) {
                                    alert('請輸入 1~2000 的有效頻道號碼！');
                                    return;
                                }
                                team.finalChannel = val;
                                saveDB();
                                renderConfirmedTeams();
                            };
                        }
                    }
                    renderChannelUI();
                    card.appendChild(channelSection);
                }

                // Creator & Delete options
                const footer = document.createElement('div');
                footer.style.display = 'flex';
                footer.style.justifyContent = 'space-between';
                footer.style.alignItems = 'center';
                footer.style.marginTop = '1rem';

                footer.innerHTML = `
                    <span style="font-size: 0.8rem; color: var(--text-muted);">建立者: ${team.creator || '未知'}</span>
                    <button class="delete-team-btn" style="background: transparent; border: 1px solid var(--danger-color); color: #ff6666; border-radius: 6px; padding: 0.3rem 0.8rem; cursor: pointer; font-size: 0.85rem;">刪除紀錄</button>
                `;

                footer.querySelector('.delete-team-btn').onclick = () => {
                    if (confirm("確定要刪除這筆出團紀錄嗎？")) {
                        const actualIdx = confirmedTeams.indexOf(team);
                        if (actualIdx > -1) {
                            confirmedTeams.splice(actualIdx, 1);
                            saveDB();
                            renderConfirmedTeams();
                        }
                    }
                };
                card.appendChild(footer);

                if (isHistory) {
                    targetContainer.prepend(card);
                } else {
                    targetContainer.appendChild(card);
                }
            } catch (err) {
                console.error("Error rendering team:", team, err);
            }
        });

        if (container && activeCount === 0) {
            container.innerHTML = '<p class="empty-state" style="color:var(--text-muted); grid-column: 1 / -1; padding: 1.5rem; text-align: center;">目前沒有進行中的已確認隊伍。</p>';
        }
        if (historyContainer && historyCount === 0) {
            historyContainer.innerHTML = '<p class="empty-state" style="color:var(--text-muted); grid-column: 1 / -1; padding: 1.5rem; text-align: center;">目前沒有歷史出團紀錄。</p>';
        }
    }

    // --- Admin Authentication & Controls ---
    function isAdmin() {
        return localStorage.getItem('soulmine_is_admin') === 'true';
    }

    function setAdmin(val) {
        if (val) {
            localStorage.setItem('soulmine_is_admin', 'true');
        } else {
            localStorage.removeItem('soulmine_is_admin');
        }
    }

    function updateAdminUI() {
        const btn = document.getElementById('btn-admin-auth');
        const form = document.getElementById('changelog-form');
        const authorInput = document.getElementById('changelog-author');

        if (btn) {
            if (isAdmin()) {
                btn.innerHTML = '👑 管理員在線中 (點此登出)';
                btn.style.borderColor = 'var(--success-color)';
                btn.style.color = 'var(--success-color)';
                btn.style.background = 'rgba(74, 222, 128, 0.15)';
                btn.style.fontWeight = 'bold';
            } else {
                btn.innerHTML = '🔑 管理員登入';
                btn.style.borderColor = 'var(--card-border)';
                btn.style.color = 'var(--text-muted)';
                btn.style.background = 'rgba(255,255,255,0.06)';
                btn.style.fontWeight = 'normal';
            }
        }

        if (form) {
            form.style.display = isAdmin() ? 'flex' : 'none';
        }
        if (authorInput && !authorInput.value) {
            authorInput.value = getSavedCreator() || 'Lumi';
        }
    }

    function setupAdminAuth() {
        const btn = document.getElementById('btn-admin-auth');
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (isAdmin()) {
                if (confirm('確定要登出管理員身分嗎？')) {
                    setAdmin(false);
                    alert('已退出管理員身分。');
                    updateAdminUI();
                    renderChangelogs();
                }
            } else {
                const pass = prompt('請輸入管理員密碼：');
                if (pass !== null) {
                    const clean = pass.trim().toLowerCase();
                    if (clean === 'soulmine' || clean === 'admin' || clean === 'lumi' || clean === 'ru' || clean === '1234') {
                        setAdmin(true);
                        alert('🎉 管理員身分驗證成功！已啟用管理與更新維護權限。');
                        updateAdminUI();
                        renderChangelogs();
                    } else {
                        alert('密碼錯誤！請重新嘗試。');
                    }
                }
            }
        });
    }

    // --- Tab 3: Changelog ---
    function renderChangelogs() {
        const container = document.getElementById('changelog-container');
        if (!container) return;
        container.innerHTML = '';

        updateAdminUI();

        if (changelogs.length === 0) {
            container.innerHTML = '<p class="empty-state" style="color:var(--text-muted); padding: 1rem;">目前沒有更新紀錄。</p>';
            return;
        }

        const sorted = [...changelogs].sort((a, b) => (b.timestamp || b.id || 0) - (a.timestamp || a.id || 0));

        sorted.forEach(log => {
            const card = document.createElement('div');
            card.style.cssText = 'background: #ffffff !important; padding: 1.5rem !important; border-radius: 12px !important; border: 1px solid rgba(0, 0, 0, 0.1) !important; border-left: 6px solid var(--primary-color) !important; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15) !important; word-break: break-word !important; margin-bottom: 1rem !important;';

            const ts = log.timestamp || log.id || Date.now();
            const dateObj = new Date(ts);
            const dateStr = log.date || `${dateObj.getFullYear()}/${(dateObj.getMonth()+1).toString().padStart(2,'0')}/${dateObj.getDate().toString().padStart(2,'0')}`;

            const deleteBtnHtml = isAdmin() ? `
                <button onclick="deleteChangelog(${ts})" style="background:transparent; border:1px solid var(--danger-color); color:var(--danger-color); border-radius:6px; padding:0.25rem 0.6rem; font-size:0.8rem; cursor:pointer; font-weight:bold;">🗑️ 刪除日誌</button>
            ` : '';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
                    <h3 style="margin: 0; color: #0f172a !important; font-size: 1.25rem !important; font-weight: 700 !important;">${log.title}</h3>
                    <span style="color: #64748b !important; font-size: 0.9rem !important; font-weight: 600 !important;">${dateStr}</span>
                </div>
                <div style="color: #334155 !important; font-size: 1rem !important; line-height: 1.7 !important; white-space: pre-wrap !important; font-weight: 500 !important; margin-top: 0.5rem !important;">${log.content}</div>
                <div style="margin-top: 1rem !important; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 0.6rem;">
                    <span style="font-size: 0.85rem !important; color: #64748b !important; font-weight: 600 !important;">更新者: ${log.author || '系統'}</span>
                    ${deleteBtnHtml}
                </div>
            `;
            container.appendChild(card);
        });
    }

    window.deleteChangelog = function(ts) {
        if (!isAdmin()) {
            alert('只有管理員才能刪除更新日誌！');
            return;
        }
        if (confirm('確定要刪除這筆更新日誌嗎？此動作無法復原。')) {
            changelogs = changelogs.filter(c => (c.timestamp || c.id) !== ts);
            db.ref('changelog').set(changelogs);
            renderChangelogs();
            alert('日誌已成功刪除！');
        }
    };

    function setupChangelogForm() {
        const form = document.getElementById('changelog-form');
        const authorInput = document.getElementById('changelog-author');

        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!isAdmin()) {
                alert('請先以管理員身分登入！');
                return;
            }
            const title = document.getElementById('changelog-title').value.trim();
            const author = (authorInput ? authorInput.value.trim() : '') || '管理員';
            const content = document.getElementById('changelog-content').value.trim();
            if (!title || !content) return;

            const newLog = {
                title,
                content,
                timestamp: Date.now(),
                date: new Date().toLocaleDateString('zh-TW'),
                author: author
            };

            changelogs.unshift(newLog);
            db.ref('changelog').set(changelogs);
            form.reset();
            renderChangelogs();
            alert('🎉 更新日誌已成功發佈！');
        });
    }
});
