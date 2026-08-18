// --------------------------

window.formatSlotKeyToText = function(key) {
    if (!key) return "未知時間";
    const parts = key.split('-');
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
};

// --- Firebase Setup ---
const firebaseConfig = {
    apiKey: "AIzaSyAO4WaojDNH5Rg_FbmDui76l7RzfeFI0bw",
    authDomain: "soulmine-8c039.firebaseapp.com",
    projectId: "soulmine-8c039",
    storageBucket: "soulmine-8c039.firebasestorage.app",
    messagingSenderId: "822855409780",
    appId: "1:822855409780:web:07e6602f297aad619d7121",
    // We append the standard realtime database URL format for this project
    // 
    databaseURL: "https://soulmine-8c039-default-rtdb.asia-southeast1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let accountsDB = {};
    let confirmedTeams = [];
    let currentUserData = null; 
    let sessionName = sessionStorage.getItem('artale_session');
    let dbLoaded = false;
    let changelogs = [];
    
    // --- Realtime Sync ---
    db.ref('/').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        
        accountsDB = data.accounts || {};
        const rawTeams = data.teams ? (Array.isArray(data.teams) ? data.teams : Object.values(data.teams)) : [];
        confirmedTeams = rawTeams.filter(t => t !== null && t !== undefined);
        const rawDrafts = data.draftTeams ? (Array.isArray(data.draftTeams) ? data.draftTeams : Object.values(data.draftTeams)) : [];
        window.draftTeams = rawDrafts.filter(t => t !== null && t !== undefined);
        const rawChangelogs = data.changelog ? (Array.isArray(data.changelog) ? data.changelog : Object.values(data.changelog)) : [];
        changelogs = rawChangelogs.filter(c => c !== null && c !== undefined);
        dbLoaded = true;

        if (sessionName && accountsDB[sessionName]) {
            currentUserData = accountsDB[sessionName];
        }

        // If UI is already visible, re-render to show live updates
        if (document.getElementById('main-app').style.display === 'block') {
            updateTeamView();
            renderConfirmedTeams();
            if (typeof renderChangelogs === 'function') renderChangelogs();
            // Update personal grid if visible
            if (document.getElementById('tab-schedule').classList.contains('active')) {
                // We use a small hack to re-generate personal grid without breaking drag states
                const currentTab = document.querySelector('.tab-btn.active');
                if(currentTab) currentTab.click(); 
            }
        }
    }, (error) => {
        console.error("Firebase Error:", error);
        alert("錯誤：無法連線至 Firebase。請確認是否已設定 Realtime Database 並開啟讀寫權限。" + error.message);
    });

    // --- Login Logic ---
    const loginModal = document.getElementById('login-modal');
    const mainApp = document.getElementById('main-app');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    // Attempt auto-login if session exists
    if (sessionName) {
        // Wait briefly for DB to load
        let checkInt = setInterval(() => {
            if(dbLoaded) {
                clearInterval(checkInt);
                if(accountsDB[sessionName]) {
                    loginSuccess(sessionName);
                }
            }
        }, 100);
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loginError.style.display = 'none';
        
        if (!dbLoaded) {
            alert("資料庫讀取中，請稍候...");
            return;
        }

        const name = document.getElementById('login-name').value.trim();
        const pass = document.getElementById('login-password').value;
        
        if (accountsDB[name]) {
            if (accountsDB[name].password === pass) {
                loginSuccess(name);
            } else {
                loginError.style.display = 'block';
            }
        } else {
            // Register new
            accountsDB[name] = {
                name: name,
                password: pass,
                characters: [],
                schedule: {}
            };
            saveDB();
            loginSuccess(name);
        }
    });

    function loginSuccess(name) {
        sessionStorage.setItem('artale_session', name);
        currentUserData = accountsDB[name];
        loginModal.style.display = 'none';
        mainApp.style.display = 'block';
        initApp();
    }

    function saveDB() {
        if (currentUserData && currentUserData.name) {
            db.ref('accounts/' + currentUserData.name).set(currentUserData);
        }
        const safeTeams = confirmedTeams.filter(t => t !== null && t !== undefined);
        db.ref('teams').set(safeTeams);
        const safeDrafts = window.draftTeams ? window.draftTeams.filter(t => t !== null && t !== undefined) : [];
        db.ref('draftTeams').set(safeDrafts);
    }

    // --- App Initialization ---
    let appInitialized = false;
    function initApp() {
        if(appInitialized) return;
        appInitialized = true;

        // --- Tab Switching ---
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.target).classList.add('active');
                
                if (btn.dataset.target === 'tab-team') {
                    updateTeamView();
                } else if (btn.dataset.target === 'tab-status') {
                    renderConfirmedTeams();
                } else if (btn.dataset.target === 'tab-changelog') {
                    if (typeof renderChangelogs === 'function') renderChangelogs();
                } else if (btn.dataset.target === 'tab-schedule') {
                    if (typeof updateCharDropdown === 'function') updateCharDropdown();
                    if (typeof renderPersonalScheduleList === 'function') renderPersonalScheduleList();
                    if (typeof renderHeatmap === 'function') renderHeatmap();
                    if (typeof updateTeamView === 'function') updateTeamView();
                }
            });
        });

        // --- Profile Logic ---
        const profileForm = document.getElementById('profile-form');
        
        if (currentUserData.characters && currentUserData.characters.length > 0) {
            currentUserData.characters.forEach((c, idx) => {
                if(c && c.name) {
                    document.getElementById(`player-name-${idx+1}`).value = c.name;
                    document.getElementById(`player-job-${idx+1}`).value = c.job;
                    document.getElementById(`player-level-${idx+1}`).value = c.level;
                    if (document.getElementById(`player-tickets-${idx+1}`)) {
                        document.getElementById(`player-tickets-${idx+1}`).value = c.tickets || 7;
                    }
                }
            });
        }

        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let chars = [];
            for(let i=1; i<=6; i++) {
                const name = document.getElementById(`player-name-${i}`).value.trim();
                const job = document.getElementById(`player-job-${i}`).value;
                const level = document.getElementById(`player-level-${i}`).value;
                const ticketsEl = document.getElementById(`player-tickets-${i}`);
                const tickets = ticketsEl ? parseInt(ticketsEl.value, 10) || 7 : 7;
                if(name) {
                    chars.push({ id: `${currentUserData.name}-char-${i}`, name, job, level, tickets });
                }
            }
            currentUserData.characters = chars;
            saveDB();
            alert('角色設定已儲存！');
            updateTeamView();
        });

        // --- Schedule V3 Logic (Form based with Calendar & Time Range) ---
        const charSelect = document.getElementById('schedule-char-select');
        const bossSelect = document.getElementById('schedule-boss-select');
        const datesSelectInput = document.getElementById('schedule-dates-select');
        const timeStart = document.getElementById('schedule-time-start');
        const timeEnd = document.getElementById('schedule-time-end');
        const btnAddSchedule = document.getElementById('btn-add-schedule');
        const personalScheduleList = document.getElementById('personal-schedule-list');

        let scheduleDatesPicker;
        if(datesSelectInput && typeof flatpickr !== 'undefined') {
            scheduleDatesPicker = flatpickr(datesSelectInput, {
                mode: "multiple",
                dateFormat: "Y-m-d",
                locale: "zh_tw"
            });
        }

        function generateTimeOptions() {
            if(!timeStart || !timeEnd) return;
            timeStart.innerHTML = '';
            timeEnd.innerHTML = '';
            for (let row = 0; row <= 31; row++) {
                const hour = Math.floor(row / 2) + 8;
                const min = row % 2 === 0 ? '00' : '30';
                const timeStr = `${hour.toString().padStart(2, '0')}:${min}`;
                
                const opt1 = document.createElement('option');
                opt1.value = row;
                opt1.textContent = timeStr;
                timeStart.appendChild(opt1);
                
                // End time options (offset by 1)
                const endRow = row + 1;
                const endHour = Math.floor(endRow / 2) + 8;
                const endMin = endRow % 2 === 0 ? '00' : '30';
                const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin}`;
                
                const opt2 = document.createElement('option');
                opt2.value = endRow;
                opt2.textContent = endTimeStr;
                timeEnd.appendChild(opt2);
            }
            // default 1 hr gap
            timeStart.value = 24; // 20:00
            timeEnd.value = 26; // 21:00
        }
        generateTimeOptions();

        function updateCharDropdown() {
            if(!charSelect) return;
            const currentVal = charSelect.value;
            charSelect.innerHTML = '';
            if(!currentUserData.characters || currentUserData.characters.length === 0) {
                charSelect.innerHTML = '<option value="">請先設定角色</option>';
                return;
            }
            currentUserData.characters.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.name} (Lv.${c.level} ${c.job})`;
                charSelect.appendChild(opt);
            });
            if(currentVal && Array.from(charSelect.options).some(o => o.value === currentVal)) {
                charSelect.value = currentVal;
            }
        }

        if(btnAddSchedule) {
            btnAddSchedule.addEventListener('click', () => {
                if(!charSelect.value) {
                    alert('請選擇角色');
                    return;
                }
                const selectedDates = scheduleDatesPicker ? scheduleDatesPicker.selectedDates : [];
                if(!selectedDates || selectedDates.length === 0) {
                    alert('請選擇日期');
                    return;
                }
                
                const startRow = parseInt(timeStart.value);
                const endRow = parseInt(timeEnd.value);
                
                if(startRow >= endRow) {
                    alert('結束時間必須晚於開始時間');
                    return;
                }
                
                if(!currentUserData.schedules) currentUserData.schedules = [];
                let addedCount = 0;
                let skippedCount = 0;
                
                selectedDates.forEach(dateObj => {
                    const year = dateObj.getFullYear();
                    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                    const day = dateObj.getDate().toString().padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    
                    for(let r = startRow; r < endRow; r++) {
                        
                        const key = `${dateStr}-${r}`;
                        const newSchedule = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            charId: charSelect.value,
                            boss: bossSelect.value,
                            key: key
                        };
                        
                        const exists = currentUserData.schedules.some(s => 
                            s.charId === newSchedule.charId && 
                            s.boss === newSchedule.boss && 
                            s.key === newSchedule.key
                        );
                        if(!exists) {
                            currentUserData.schedules.push(newSchedule);
                            addedCount++;
                        }
                    }
                });
                
                if(addedCount > 0) {
                    scheduleDatesPicker.clear();
                    renderPersonalScheduleList();
                    updateTeamView(); // Immediately update the heatmap on the right
                    
                    let msg = `成功新增 ${addedCount} 個排班`;
                    if(skippedCount > 0) {
                        msg += `\n（提示：有 ${skippedCount} 個排班因不在規定時段內，已自動跳過）`;
                    }
                    alert(msg);
                } else {
                        let msg = `（提示：沒有新增排班。可能都不在龍王時段內，或已重複排班）`;
                    alert(msg);
                }
            });
        }

        function renderPersonalScheduleList() {
            if(!personalScheduleList) return;
            personalScheduleList.innerHTML = '';
            if(!currentUserData.schedules || currentUserData.schedules.length === 0) {
                personalScheduleList.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">目前沒有任何行程</div>';
                return;
            }
            
            // Group by charId, boss, dateStr
            let groups = {};
            currentUserData.schedules.forEach(s => {
                const parts = s.key.split('-');
                const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
                const row = parseInt(parts[3]);
                
                const groupKey = `${s.charId}_${s.boss}_${dateStr}`;
                if(!groups[groupKey]) {
                    groups[groupKey] = {
                        charId: s.charId,
                        boss: s.boss,
                        dateStr: dateStr,
                        rows: [],
                        scheduleIds: []
                    };
                }
                groups[groupKey].rows.push(row);
                groups[groupKey].scheduleIds.push(s.id);
            });
            
            let consolidatedList = [];
            for(let key in groups) {
                const g = groups[key];
                g.rows.sort((a,b) => a - b);
                
                // Find contiguous ranges
                let ranges = [];
                let startRow = g.rows[0];
                let prevRow = g.rows[0];
                let currentIds = [g.scheduleIds[0]];
                
                for(let i = 1; i < g.rows.length; i++) {
                    if(g.rows[i] === prevRow + 1) {
                        prevRow = g.rows[i];
                        currentIds.push(g.scheduleIds[i]);
                    } else {
                        ranges.push({ startRow, endRow: prevRow + 1, ids: [...currentIds] });
                        startRow = g.rows[i];
                        prevRow = g.rows[i];
                        currentIds = [g.scheduleIds[i]];
                    }
                }
                ranges.push({ startRow, endRow: prevRow + 1, ids: [...currentIds] });
                
                ranges.forEach(r => {
                    consolidatedList.push({
                        charId: g.charId,
                        boss: g.boss,
                        dateStr: g.dateStr,
                        startRow: r.startRow,
                        endRow: r.endRow,
                        ids: r.ids // all the underlying schedule IDs for deletion
                    });
                });
            }
            
            // Sort by date then startRow
            consolidatedList.sort((a,b) => {
                if(a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
                return a.startRow - b.startRow;
            });
            
            function formatTimeStr(row) {
                const hour = Math.floor(row / 2) + 8;
                const min = row % 2 === 0 ? '00' : '30';
                return `${hour.toString().padStart(2, '0')}:${min}`;
            }
            
            // Group by Date for a cleaner UI
            let groupedByDate = {};
            consolidatedList.forEach(range => {
                if(!groupedByDate[range.dateStr]) {
                    groupedByDate[range.dateStr] = [];
                }
                groupedByDate[range.dateStr].push(range);
            });

            // Get weekday name
            function getWeekdayName(dateStr) {
                const parts = dateStr.split('-');
                const d = new Date(parts[0], parts[1]-1, parts[2]);
                const weekdays = ['日','一','二','三','四','五','六'];
                return weekdays[d.getDay()];
            }

            for(let dateStr in groupedByDate) {
                const parts = dateStr.split('-');
                const month = parts[1];
                const day = parts[2];
                
                const dateGroup = document.createElement('div');
                dateGroup.style.display = 'flex';
                dateGroup.style.flexDirection = 'column';
                
                const dateHeader = document.createElement('div');
                dateHeader.style.background = 'var(--primary-color)';
                dateHeader.style.color = '#fff';
                dateHeader.style.padding = '0.4rem 0.8rem';
                dateHeader.style.borderRadius = '6px';
                dateHeader.style.fontSize = '0.9rem';
                dateHeader.style.fontWeight = 'bold';
                dateHeader.textContent = `日期 ${month}/${day} (${getWeekdayName(dateStr)})`;
                dateGroup.appendChild(dateHeader);

                const listContainer = document.createElement('div');
                listContainer.style.display = 'flex';
                listContainer.style.flexDirection = 'column';
                listContainer.style.gap = '0.2rem';
                listContainer.style.padding = '0.5rem';
                listContainer.style.background = '#fcfbff';
                listContainer.style.border = '1px solid var(--card-border)';
                listContainer.style.borderTop = 'none';
                listContainer.style.borderBottomLeftRadius = '6px';
                listContainer.style.borderBottomRightRadius = '6px';

                groupedByDate[dateStr].forEach(range => {
                    const char = (currentUserData.characters || []).find(c => c.id === range.charId);
                    const charName = char ? char.name : '角色名稱未設定';
                    const timeText = `${formatTimeStr(range.startRow)} ~ ${formatTimeStr(range.endRow)}`;
                    
                    const item = document.createElement('div');
                    item.style.display = 'flex';
                    item.style.justifyContent = 'space-between';
                    item.style.alignItems = 'center';
                    item.style.padding = '0.4rem';
                    item.style.borderBottom = '1px dashed var(--card-border)';
                    item.style.fontSize = '0.85rem';
                    
                    item.innerHTML = `
                        <div style="width: 100%;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <strong style="color: var(--primary-color); display:inline-block; width:45px;">${range.boss}</strong>
                                    <span style="font-weight: 600; display:inline-block; max-width:70px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:bottom;">${charName}</span>
                                </div>
                                <button class="delete-sched-btn" data-ids='${JSON.stringify(range.ids)}' style="background:transparent; border:none; color:#ff6666; cursor:pointer; font-weight:bold; padding:0 0.5rem;" title="刪除">❌</button>
                            </div>
                            <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.2rem;">時間: ${timeText}</div>
                        </div>
                    `;
                    listContainer.appendChild(item);
                });
                
                // Remove last border bottom
                if(listContainer.lastChild) {
                    listContainer.lastChild.style.borderBottom = 'none';
                }
                
                dateGroup.appendChild(listContainer);
                personalScheduleList.appendChild(dateGroup);
            }
            
            document.querySelectorAll('.delete-sched-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idsToDelete = JSON.parse(e.target.dataset.ids);
                    currentUserData.schedules = currentUserData.schedules.filter(s => !idsToDelete.includes(s.id));
                    renderPersonalScheduleList();
                    updateTeamView(); // Immediately update the heatmap
                });
            });
        }

        const saveScheduleBtn = document.getElementById('save-schedule');
        if(saveScheduleBtn) {
            saveScheduleBtn.addEventListener('click', () => {
                saveDB();
                alert('時間表已更新並儲存！');
            });
        }

        // --- Team Builder Logic ---
        const timeslotSelect = document.getElementById('team-timeslot');
        const availablePlayersPool = document.getElementById('available-players-pool');
        let currentTeam = new Array(6).fill(null);
        let globalAllPlayers = [];
        
        function formatSlotKeyToText(key) { return window.formatSlotKeyToText(key); }
        
        let teamDatePicker;
        const teamDateSelectInput = document.getElementById('team-date-select');
        if(teamDateSelectInput && typeof flatpickr !== 'undefined') {
            teamDatePicker = flatpickr(teamDateSelectInput, {
                dateFormat: "Y-m-d",
                locale: "zh_tw",
                onChange: function() {
                    clearTeamSlots();
                    updateTeamView();
                }
            });
        }
        
        let heatmapStartDatePicker;
        const heatmapStartDateInput = document.getElementById('heatmap-start-date');
        if(heatmapStartDateInput && typeof flatpickr !== 'undefined') {
            let today = new Date();
            let diffDay = (today.getDay() + 5) % 7;
            let lastTuesday = new Date(today);
            lastTuesday.setDate(today.getDate() - diffDay);

            heatmapStartDatePicker = flatpickr(heatmapStartDateInput, {
                dateFormat: "Y-m-d",
                locale: "zh_tw",
                defaultDate: lastTuesday,
                disable: [
                    function(date) {
                        // ?＊蝷粹曹??? (Tuesday = 2)
                        return (date.getDay() !== 2);
                    }
                ],
                onChange: function() {
                    renderHeatmap();
                }
            });
        }

        let globalAllSchedules = [];

        function getRecentTuesday(date) {
            let d = new Date(date);
            d.setHours(d.getHours() - 8);
            d.setHours(0, 0, 0, 0);
            let day = d.getDay();
            let diff = day >= 2 ? day - 2 : day + 5;
            d.setDate(d.getDate() - diff);
            d.setHours(8, 0, 0, 0);
            return d;
        }

        function updateTeamView() {
            let allSchedules = [];
            const now = new Date();
            const currentReset = getRecentTuesday(now);
            const nextReset = new Date(currentReset);
            nextReset.setDate(nextReset.getDate() + 7);

            for (let accName in accountsDB) {
                let acc = accountsDB[accName];
                if (acc.schedules && acc.characters) {
                    acc.schedules.forEach(sched => {
                        const charInfo = acc.characters.find(c => c.id === sched.charId);
                        if (charInfo) {
                            const maxTickets = charInfo.tickets !== undefined && charInfo.tickets !== '' ? parseInt(charInfo.tickets) : 7;
                            // Calculate dynamic tickets based on confirmed teams in the SAME week as this schedule
                            const parts = sched.key.split('-');
                            let currentTickets = maxTickets;
                            if (parts.length >= 3) {
                                const row = parseInt(parts[3]) || 0;
                                const hour = Math.floor(row / 2) + 8;
                                const min = row % 2 === 0 ? 0 : 30;
                                const schedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), hour, min, 0);
                                
                                const weekStart = getRecentTuesday(schedDate);
                                const weekEnd = new Date(weekStart);
                                weekEnd.setDate(weekEnd.getDate() + 7);
                                
                                let spentTickets = 0;
                                confirmedTeams.forEach(team => {
                                    if (!team || !team.timeslot || !team.members) return;
                                    if (!team.members.some(m => m && m.id === charInfo.id)) return;
                                    
                                    const tParts = team.timeslot.split('-');
                                    if (tParts.length >= 3) {
                                        const tRow = parseInt(tParts[3]) || 0;
                                        const tHour = Math.floor(tRow / 2) + 8;
                                        const tMin = tRow % 2 === 0 ? 0 : 30;
                                        const tDate = new Date(parseInt(tParts[0]), parseInt(tParts[1]) - 1, parseInt(tParts[2]), tHour, tMin, 0);
                                        
                                        if (tDate >= weekStart && tDate < weekEnd) {
                                            spentTickets += (team.boss === '龍王' ? 14 : 7);
                                        }
                                    }
                                });
                                
                                currentTickets = Math.max(0, maxTickets - spentTickets);
                            }

                            if (currentTickets <= 0) return; // Dynamically hide if tickets <= 0

                            // Clone charInfo to store displayTickets safely
                            const displayCharInfo = Object.assign({}, charInfo, { displayTickets: currentTickets });

                            allSchedules.push({
                                accountName: accName,
                                charInfo: displayCharInfo,
                                boss: sched.boss,
                                key: sched.key
                            });
                        }
                    });
                }
            }
            globalAllSchedules = allSchedules;

            // Re-render heatmap immediately when data updates
            renderHeatmap();
            if (typeof window.renderDraftTeams === 'function') { window.renderDraftTeams(); }

            const teamBossSelect = document.getElementById('team-boss');
            const selectedBoss = teamBossSelect ? teamBossSelect.value : '未指定';
            
            let selectedDateStr = '';
            if(teamDatePicker && teamDatePicker.selectedDates.length > 0) {
                const d = teamDatePicker.selectedDates[0];
                const year = d.getFullYear();
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const day = d.getDate().toString().padStart(2, '0');
                selectedDateStr = `${year}-${month}-${day}`;
            }

            const filteredSchedules = allSchedules.filter(s => s.boss === selectedBoss && s.key.startsWith(selectedDateStr + '-'));
            
            let slotCounts = {};
            filteredSchedules.forEach(s => {
                slotCounts[s.key] = (slotCounts[s.key] || 0) + 1;
            });

            let sortedSlots = Object.keys(slotCounts).sort((a,b) => {
                if(slotCounts[b] !== slotCounts[a]) return slotCounts[b] - slotCounts[a];
                const rowA = parseInt(a.split('-')[1]);
                const rowB = parseInt(b.split('-')[1]);
                return rowA - rowB;
            });
            
            const currentSelectedSlot = timeslotSelect.value;
            
            timeslotSelect.innerHTML = '';
            if (sortedSlots.length === 0) {
                timeslotSelect.innerHTML = '<option value="">目前沒有符合的Boss</option>';
                availablePlayersPool.innerHTML = '';
            } else {
                sortedSlots.forEach(key => {
                    const opt = document.createElement('option');
                    opt.value = key;
                    const timeText = formatSlotKeyToText(key);
                    const parts = timeText.split(' ');
                    const justTime = parts[parts.length - 1];
                    opt.textContent = `${justTime} (${slotCounts[key]}人)`;
                    timeslotSelect.appendChild(opt);
                });
                if(currentSelectedSlot && sortedSlots.includes(currentSelectedSlot)) {
                    timeslotSelect.value = currentSelectedSlot;
                }
            }

            timeslotSelect.onchange = () => {
                clearTeamSlots();
                renderAvailablePlayers(timeslotSelect.value, selectedBoss);
            };
            
            renderAvailablePlayers(timeslotSelect.value, selectedBoss);
        }

        const teamBossSelect = document.getElementById('team-boss');
        if(teamBossSelect) {
            teamBossSelect.addEventListener('change', () => {
                clearTeamSlots();
                updateTeamView();
            });
        }

        const heatmapBossFilter = document.getElementById('heatmap-boss-filter');
        if(heatmapBossFilter) {
            heatmapBossFilter.addEventListener('change', () => {
                renderHeatmap();
            });
        }

        function renderHeatmap() {
            const heatmapGrid = document.getElementById('heatmap-grid');
            const tooltip = document.getElementById('heatmap-tooltip');
            if(!heatmapGrid) return;
            heatmapGrid.innerHTML = '';
            
            const filterBoss = heatmapBossFilter ? heatmapBossFilter.value : '未指定';
            let slotData = {};
            
            globalAllSchedules.forEach(s => {
                if (s.boss === filterBoss) {
                    if(!slotData[s.key]) slotData[s.key] = [];
                    if(!slotData[s.key].includes(s.charInfo.name)) {
                        slotData[s.key].push(s.charInfo.name);
                    }
                }
            });

            let colorPrefix = 'heat'; 
            if(filterBoss === '困拉') colorPrefix = 'heat-red';
            else if(filterBoss === '普拉') colorPrefix = 'heat-blue';
            else if(filterBoss === '龍王') colorPrefix = 'heat-purple';
            else if(filterBoss === '炎魔') colorPrefix = 'heat-orange';
            else colorPrefix = 'heat-pink';

            // Determine start date
            let startDate = new Date();
            if(heatmapStartDatePicker && heatmapStartDatePicker.selectedDates.length > 0) {
                startDate = heatmapStartDatePicker.selectedDates[0];
            }

            // Generate 7 days array
            let daysArray = [];
            const weekDays = ['日','一','二','三','四','五','六'];
            for(let i=0; i<7; i++) {
                let d = new Date(startDate);
                d.setDate(d.getDate() + i);
                
                const year = d.getFullYear();
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const day = d.getDate().toString().padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                
                daysArray.push({
                    dateObj: d,
                    dateStr: dateStr,
                    label: `${month}/${day} (${weekDays[d.getDay()]})`,
                    isWeekend: d.getDay() === 0 || d.getDay() === 6
                });
                
                // Update header DOM
                const th = document.getElementById(`heatmap-day-${i+1}`);
                if(th) {
                    th.textContent = daysArray[i].label;
                    if(daysArray[i].isWeekend) {
                        th.classList.add('weekend');
                    } else {
                        th.classList.remove('weekend');
                    }
                }
            }

            // 16 rows (08:00 to 23:00)
            for (let r = 0; r < 16; r++) {
                const hour = r + 8;
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                
                const timeLabel = document.createElement('div');
                timeLabel.className = 'time-label';
                timeLabel.textContent = timeStr;
                // Double height since it covers 2 slots
                timeLabel.style.height = '24px'; 
                timeLabel.style.lineHeight = '24px';
                heatmapGrid.appendChild(timeLabel);

                for (let c = 0; c < 7; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'heatmap-cell';
                    cell.style.height = '24px';
                    
                    const dayData = daysArray[c];
                    
                    // The 2 underlying slot keys
                    const topRowIdx = r * 2;
                    const botRowIdx = r * 2 + 1;
                    const topKey = `${dayData.dateStr}-${topRowIdx}`;
                    const botKey = `${dayData.dateStr}-${botRowIdx}`;
                    
                    const topPeople = slotData[topKey] || [];
                    const botPeople = slotData[botKey] || [];
                    const topCount = topPeople.length;
                    const botCount = botPeople.length;
                    
                    // Helper to get raw rgba color
                    function getHeatColor(count) {
                        if(count === 0) return 'transparent';
                        if(colorPrefix === 'heat-red') {
                            if(count === 1) return 'rgba(255, 99, 71, 0.2)';
                            if(count === 2) return 'rgba(255, 99, 71, 0.4)';
                            if(count === 3) return 'rgba(255, 99, 71, 0.6)';
                            if(count === 4) return 'rgba(255, 99, 71, 0.8)';
                            if(count === 5) return 'rgba(255, 99, 71, 1)';
                            return 'rgba(220, 20, 60, 1)';
                        }
                        if(colorPrefix === 'heat-blue') {
                            if(count === 1) return 'rgba(100, 149, 237, 0.2)';
                            if(count === 2) return 'rgba(100, 149, 237, 0.4)';
                            if(count === 3) return 'rgba(100, 149, 237, 0.6)';
                            if(count === 4) return 'rgba(100, 149, 237, 0.8)';
                            if(count === 5) return 'rgba(100, 149, 237, 1)';
                            return 'rgba(65, 105, 225, 1)';
                        }
                        if(colorPrefix === 'heat-pink') {
                            if(count === 1) return 'rgba(255, 182, 193, 0.3)';
                            if(count === 2) return 'rgba(255, 182, 193, 0.5)';
                            if(count === 3) return 'rgba(255, 182, 193, 0.7)';
                            if(count === 4) return 'rgba(255, 182, 193, 0.9)';
                            if(count === 5) return 'rgba(255, 105, 180, 1)';
                            return 'rgba(219, 112, 147, 1)';
                        }
                        if(colorPrefix === 'heat-purple') {
                            if(count === 1) return 'rgba(186, 85, 211, 0.2)';
                            if(count === 2) return 'rgba(186, 85, 211, 0.4)';
                            if(count === 3) return 'rgba(186, 85, 211, 0.6)';
                            if(count === 4) return 'rgba(186, 85, 211, 0.8)';
                            if(count === 5) return 'rgba(186, 85, 211, 1)';
                            return 'rgba(138, 43, 226, 1)';
                        }
                        if(colorPrefix === 'heat-orange') {
                            if(count === 1) return 'rgba(255, 165, 0, 0.2)';
                            if(count === 2) return 'rgba(255, 165, 0, 0.4)';
                            if(count === 3) return 'rgba(255, 165, 0, 0.6)';
                            if(count === 4) return 'rgba(255, 165, 0, 0.8)';
                            if(count === 5) return 'rgba(255, 140, 0, 1)';
                            return 'rgba(255, 69, 0, 1)';
                        }
                        return 'transparent';
                    }
                    
                    const topColor = getHeatColor(topCount);
                    const botColor = getHeatColor(botCount);
                    
                    if (topCount > 0 || botCount > 0) {
                        // Linear gradient for half-half coloring
                        cell.style.background = `linear-gradient(to bottom, ${topColor} 50%, ${botColor} 50%)`;
                    }

                    cell.addEventListener('mouseenter', (e) => {
                        tooltip.style.display = 'block';
                        let html = '';
                        if(topCount > 0) {
                            html += `<div style="margin-bottom:4px;"><strong style="color:var(--primary-color);">(${hour.toString().padStart(2, '0')}:00-${hour.toString().padStart(2, '0')}:30):</strong> ${topPeople.join(', ')}</div>`;
                        }
                        if(botCount > 0) {
                            html += `<div><strong style="color:var(--primary-color);">(${hour.toString().padStart(2, '0')}:30-${(hour+1).toString().padStart(2, '0')}:00):</strong> ${botPeople.join(', ')}</div>`;
                        }
                        if(topCount === 0 && botCount === 0) {
                    html = '<span style="color:var(--text-muted);">目前尚未確定成員</span>';
                        }
                        tooltip.innerHTML = html;
                    });
                    cell.addEventListener('mousemove', (e) => {
                        tooltip.style.left = (e.pageX + 15) + 'px';
                        tooltip.style.top = (e.pageY + 15) + 'px';
                    });
                    cell.addEventListener('mouseleave', () => {
                        tooltip.style.display = 'none';
                    });
                    
                    heatmapGrid.appendChild(cell);
                }
            }
        }

        function renderAvailablePlayers(slotKey, boss) {
            if(!slotKey || !boss) return;
            availablePlayersPool.innerHTML = '';
            
            const available = globalAllSchedules.filter(s => 
                s.key === slotKey && 
                s.boss === boss && 
                !currentTeam.some(m => m && m.id === s.charInfo.id) &&
                (s.charInfo.displayTickets > 0)
            ).map(s => s.charInfo);
            
            const uniqueAvailable = [];
            available.forEach(c => {
                if(!uniqueAvailable.some(u => u.id === c.id)) uniqueAvailable.push(c);
            });

            if (uniqueAvailable.length === 0) {
                availablePlayersPool.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">此時段無人有空</p>';
                return;
            }

            uniqueAvailable.forEach(p => {
                const ticketsText = p.displayTickets !== undefined ? p.displayTickets : (p.currentTickets !== undefined ? p.currentTickets : (p.tickets !== undefined ? p.tickets : 7));
                const card = document.createElement('div');
                card.className = 'player-card';
                card.draggable = true;
                card.dataset.player = JSON.stringify(p);
                card.innerHTML = `
                    <div class="player-info">
                        <span class="player-name">${p.name}</span>
                        <span class="player-meta" style="color:var(--primary-color); font-weight:bold;">[次數: ${ticketsText}]</span>
                        <span class="player-meta">Lv.${p.level}<br>${p.job}</span>
                    </div>
            <div style="font-size: 1.2rem; opacity: 0.5;">≡</div>
                `;
                
                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', card.dataset.player);
                    card.style.opacity = '0.5';
                });
                card.addEventListener('dragend', () => {
                    card.style.opacity = '1';
                });

                availablePlayersPool.appendChild(card);
            });
        }

        function renderTeamSlots(size) {
            currentTeam = new Array(size).fill(null);
            const container = document.getElementById('team-slots');
            if(!container) return;
            container.innerHTML = '';
            
            const labelDiv = container.previousElementSibling ? container.previousElementSibling.querySelector('div') : null;
            if (size === 12) {
                container.classList.add('dragon-king');
                if (labelDiv) labelDiv.textContent = '(12人)';
            } else {
                container.classList.remove('dragon-king');
                if (labelDiv) labelDiv.textContent = '(6人)';
            }

            let team1Group, team2Group;
            if (size === 12) {
                const team1Wrapper = document.createElement('div');
                team1Wrapper.innerHTML = '<h4 style="margin-bottom:0.5rem; color:var(--primary-color);">第一隊</h4>';
                team1Group = document.createElement('div');
                team1Group.className = 'team-group';
                team1Wrapper.appendChild(team1Group);
                
                const team2Wrapper = document.createElement('div');
                team2Wrapper.innerHTML = '<h4 style="margin-bottom:0.5rem; color:var(--primary-color);">第二隊</h4>';
                team2Group = document.createElement('div');
                team2Group.className = 'team-group';
                team2Wrapper.appendChild(team2Group);
                
                container.appendChild(team1Wrapper);
                container.appendChild(team2Wrapper);
            }

            for (let i = 0; i < size; i++) {
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.dataset.index = i;
                slot.dataset.filled = "false";
                slot.innerHTML = `空位 ${i + 1}`;

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
                        const ticketsText = p.displayTickets !== undefined ? p.displayTickets : (p.currentTickets !== undefined ? p.currentTickets : (p.tickets !== undefined ? p.tickets : 7));
                        slot.innerHTML = `
                            <div class="player-card" style="cursor:pointer; width: 100%;" title="點擊以移除成員">
                                <div class="player-info">
                                    <span class="player-name">${p.name}</span>
                                    <span class="player-meta" style="color:var(--primary-color); font-weight:bold;">[次數: ${ticketsText}]</span>
                                    <span class="player-meta">Lv.${p.level}<br>${p.job}</span>
                                </div>
                            </div>
                        `;
                        slot.dataset.filled = "true";
                        const tsVal = document.getElementById('team-timeslot') ? document.getElementById('team-timeslot').value : '';
                        const tbVal = document.getElementById('team-boss') ? document.getElementById('team-boss').value : '';
                        if(typeof renderAvailablePlayers === 'function') renderAvailablePlayers(tsVal, tbVal);
                    }
                });

                slot.addEventListener('click', () => {
                    if (slot.dataset.filled === "true") {
                        currentTeam[i] = null;
                        slot.innerHTML = `空位 ${i + 1}`;
                        slot.dataset.filled = "false";
                        const tsVal = document.getElementById('team-timeslot') ? document.getElementById('team-timeslot').value : '';
                        const tbVal = document.getElementById('team-boss') ? document.getElementById('team-boss').value : '';
                        if(typeof renderAvailablePlayers === 'function') renderAvailablePlayers(tsVal, tbVal);
                    }
                });

                if (size === 12) {
                    if (i < 6) team1Group.appendChild(slot);
                    else team2Group.appendChild(slot);
                } else {
                    container.appendChild(slot);
                }
            }
        }

        const teamBossSelectRef = document.getElementById('team-boss');
        if(teamBossSelectRef) {
            teamBossSelectRef.addEventListener('change', (e) => {
                const boss = e.target.value;
                if (boss === '龍王') {
                    renderTeamSlots(12);
                } else {
                    renderTeamSlots(6);
                }
                if(typeof updateTeamView === 'function') updateTeamView();
            });
        }
        
        // Initial setup for slots
        renderTeamSlots(document.getElementById('team-boss') && document.getElementById('team-boss').value === '龍王' ? 12 : 6);

        window.clearTeamSlots = function() {
            currentTeam.fill(null);
            const slotsNodes = document.querySelectorAll('.slot');
            slotsNodes.forEach((slot, index) => {
                slot.innerHTML = `空位 ${index + 1}`;
                slot.dataset.filled = "false";
            });
        };
        
        document.getElementById('clear-team').addEventListener('click', () => {
            window.clearTeamSlots();
            const tsVal = document.getElementById('team-timeslot') ? document.getElementById('team-timeslot').value : '';
            const tbVal = document.getElementById('team-boss') ? document.getElementById('team-boss').value : '';
            if(typeof renderAvailablePlayers === 'function') renderAvailablePlayers(tsVal, tbVal);
        });

        const draftTeamBtn = document.getElementById('draft-team');
        if(draftTeamBtn) {
            draftTeamBtn.addEventListener('click', () => {
                const members = currentTeam.filter(m => m !== null);
                if (members.length === 0) {
                    alert('隊伍是空的！請拖曳玩家進來。');
                    return;
                }
                
                const timeInput = document.getElementById('team-timeslot');
                const bossInput = document.getElementById('team-boss');
                const timeText = timeInput && timeInput.value ? formatSlotKeyToText(timeInput.value) : '未知時間';
                const boss = bossInput && bossInput.value ? bossInput.value : '未指定Boss';
                
                if(!window.draftTeams) window.draftTeams = [];
                window.draftTeams.push({
                    boss: boss,
                    timeslot: timeInput ? timeInput.value : '',
                    timeText: timeText,
                    members: members,
                    timestamp: new Date().getTime()
                });
                
                if(typeof saveDB === 'function') saveDB();
                if(typeof window.renderDraftTeams === 'function') window.renderDraftTeams();
                alert(`已建立草稿 ${boss}（${members.length} 人隊伍）`);
            });
        }

        window.renderDraftTeams = function() {
            const container = document.getElementById('draft-teams-container');
            if(!container) return;
            container.innerHTML = '';
            
            if (!window.draftTeams || window.draftTeams.length === 0) {
                container.innerHTML = '<p class="empty-state" style="color:var(--text-muted); grid-column: 1 / -1; text-align: center;">目前沒有暫存草稿</p>';
                return;
            }
            
            window.draftTeams.forEach((team, idx) => {
                const isDragonKing = team.boss === '龍王';
                const card = document.createElement('div');
                card.className = 'glass-card';
                card.style.position = 'relative';
                if (isDragonKing) {
                    card.style.gridColumn = '1 / -1';
                }
                
                const timeDisplay = team.timeText || '未知時間';
                let html = `
                    <div style="position: relative; margin-bottom:1rem; text-align: center;">
                        <h3 style="margin:0; font-size:1.2rem; color:var(--primary-color);">草稿 ${idx + 1}</h3>
                        <span class="badge" style="background:var(--warning-color); position: absolute; right: 0; top: 0;">${team.boss}</span>
                    </div>
                    <div style="font-size:0.9rem; margin-bottom:1rem; color:var(--text-muted);">
                        預定時間: <strong style="color:var(--text-color);">${timeDisplay}</strong>
                    </div>
                `;
                
                // removed duplicate isDragonKing
                
                if (isDragonKing) {
                    html += `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div>
                                <div style="font-size:0.8rem; font-weight:bold; margin-bottom:0.5rem; color:var(--primary-color); border-bottom:1px solid var(--primary-color); padding-bottom:2px;">第一隊</div>
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                    `;
                    for (let i=0; i<6; i++) {
                        if (i < team.members.length) {
                            const m = team.members[i];
                            html += `
                                <div style="background:#ffffff; padding:0.5rem; border-radius:6px; font-size:0.85rem; border:1px solid var(--card-border); text-align:center;">
                                    <strong>${m.name}</strong><br><span style="opacity:0.7;">Lv.${m.level}<br>${m.job}</span>
                                </div>
                            `;
                        } else {
                            html += `<div style="background:transparent; padding:0.5rem; border-radius:6px; font-size:0.85rem; border:1px dashed var(--card-border); color:var(--text-muted); display:flex; align-items:center; justify-content:center;">(空位)</div>`;
                        }
                    }
                    html += `
                                </div>
                            </div>
                            <div>
                                <div style="font-size:0.8rem; font-weight:bold; margin-bottom:0.5rem; color:var(--primary-color); border-bottom:1px solid var(--primary-color); padding-bottom:2px;">第二隊</div>
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                    `;
                    for (let i=6; i<12; i++) {
                        if (i < team.members.length) {
                            const m = team.members[i];
                            html += `
                                <div style="background:#ffffff; padding:0.5rem; border-radius:6px; font-size:0.85rem; border:1px solid var(--card-border); text-align:center;">
                                    <strong>${m.name}</strong><br><span style="opacity:0.7;">Lv.${m.level}<br>${m.job}</span>
                                </div>
                            `;
                        } else {
                            html += `<div style="background:transparent; padding:0.5rem; border-radius:6px; font-size:0.85rem; border:1px dashed var(--card-border); color:var(--text-muted); display:flex; align-items:center; justify-content:center;">(空位)</div>`;
                        }
                    }
                    html += `
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    html += `
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                    `;
                    for (let i=0; i<6; i++) {
                        if (i < team.members.length) {
                            const m = team.members[i];
                            html += `
                                <div style="background:#ffffff; padding:0.5rem; border-radius:6px; font-size:0.85rem; border:1px solid var(--card-border); text-align:center;">
                                    <strong>${m.name}</strong><br><span style="opacity:0.7;">Lv.${m.level}<br>${m.job}</span>
                                </div>
                            `;
                        } else {
                            html += `<div style="background:transparent; padding:0.5rem; border-radius:6px; font-size:0.85rem; border:1px dashed var(--card-border); color:var(--text-muted); display:flex; align-items:center; justify-content:center;">(空位)</div>`;
                        }
                    }
                    html += `
                        </div>
                    `;
                }
                
                html += `
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button onclick="window.editDraftTeam(${idx})" class="btn-secondary" style="flex: 1; border-color:var(--primary-color); color:var(--primary-color); background:transparent;">編輯</button>
                        <button onclick="window.deleteDraftTeam(${idx})" class="btn-secondary" style="flex: 1; border-color:var(--danger-color); color:var(--danger-color); background:transparent;">刪除</button>
                    </div>
                `;
                
                card.innerHTML = html;
                container.appendChild(card);
            });
        };
        
        window.editDraftTeam = function(idx) {
            const draft = window.draftTeams[idx];
            if(!draft) return;
            
            const bossSelect = document.getElementById('team-boss');
            if (bossSelect && bossSelect.value !== draft.boss) {
                bossSelect.value = draft.boss;
                bossSelect.dispatchEvent(new Event('change'));
            }
            
            if (draft.timeslot) {
                const parts = draft.timeslot.split('-');
                if (parts.length >= 3) {
                    const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
                    const dateInput = document.getElementById('team-date-select');
                    if (dateInput) {
                        if (dateInput._flatpickr) {
                            dateInput._flatpickr.setDate(dateStr, true);
                        } else {
                            dateInput.value = dateStr;
                            dateInput.dispatchEvent(new Event('change'));
                        }
                        
                        setTimeout(() => {
                            const timeslotSelect = document.getElementById('team-timeslot');
                            if (timeslotSelect) {
                                timeslotSelect.value = draft.timeslot;
                                timeslotSelect.dispatchEvent(new Event('change'));
                            }
                        }, 50);
                    }
                }
            }
            
            setTimeout(() => {
                currentTeam = JSON.parse(JSON.stringify(draft.members));
                const container = document.getElementById('team-slots');
                const slotsNodes = container.querySelectorAll('.slot');
                for(let i=0; i<slotsNodes.length; i++) {
                    const slot = slotsNodes[i];
                    const p = currentTeam[i];
                    if (p) {
                        const ticketsText = p.displayTickets !== undefined ? p.displayTickets : (p.currentTickets !== undefined ? p.currentTickets : (p.tickets !== undefined ? p.tickets : 7));
                        slot.innerHTML = `<div class="player-card" style="cursor:pointer; width: 100%;" title="點擊以移除成員"><div class="player-info"><span class="player-name">${p.name}</span><span class="player-meta" style="color:var(--primary-color); font-weight:bold;">[次數: ${ticketsText}]</span><span class="player-meta">Lv.${p.level}<br>${p.job}</span></div></div>`;
                        slot.dataset.filled = "true";
                    } else {
                        slot.innerHTML = `空位 ${i + 1}`;
                        slot.dataset.filled = "false";
                    }
                }
                const rightPanel = document.querySelector('.right-panel');
                if (rightPanel) rightPanel.scrollIntoView({ behavior: 'smooth' });
            }, 150);
        };
        
        window.deleteDraftTeam = function(idx) {
        if(confirm('確定要刪除這個草稿嗎？')) {
                window.draftTeams.splice(idx, 1);
                if(typeof saveDB === 'function') saveDB();
                if(typeof window.renderDraftTeams === 'function') window.renderDraftTeams();
            }
        };

        document.getElementById('confirm-team').addEventListener('click', () => {
            const members = currentTeam.filter(m => m !== null);
            if (members.length === 0) {
                alert('隊伍是空的！請拖曳玩家進來。');
                return;
            }
            
            const timeText = formatSlotKeyToText(timeslotSelect.value);
            const boss = document.getElementById('team-boss').value || '未指定Boss';
            
            // --- Feature: Deduct tickets & Auto-remove schedules ---
            function getMSWeekRange(dateStr) {
                const parts = dateStr.split('-'); 
                const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                
                // MS week starts on Tuesday (getDay() === 2)
                let day = d.getDay();
                let diffToTuesday = day >= 2 ? day - 2 : day + 5;
                
                const start = new Date(d);
                start.setDate(d.getDate() - diffToTuesday);
                start.setHours(0,0,0,0);
                
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23,59,59,999);
                
                return { start, end };
            }

            const { start: weekStart, end: weekEnd } = getMSWeekRange(timeslotSelect.value);
            let updatedAccounts = new Set();

            members.forEach(m => {
                // Find which account owns this character
                for (let accountName in accountsDB) {
                    const acc = accountsDB[accountName];
                    if (acc.characters) {
                        const charObj = acc.characters.find(c => c.id === m.id);
                        if (charObj) {
                            // Deduct N for others, N*2 for 龍王
                            const nInput = document.getElementById('team-games-count');
                            const N = nInput ? (parseInt(nInput.value) || 7) : 7;
                            const deduction = boss === '龍王' ? N * 2 : N;
                            let currentT = charObj.currentTickets !== undefined ? parseInt(charObj.currentTickets) : ((charObj.tickets !== undefined && charObj.tickets !== '' ? parseInt(charObj.tickets) : 7));
                            charObj.currentTickets = Math.max(0, currentT - deduction);
                            
                            // Tickets are deducted. Dynamic hiding handles the rest.
                            
                            updatedAccounts.add(accountName);
                            break;
                        }
                    }
                }
            });

            // Save all modified accounts back to Firebase
            updatedAccounts.forEach(accountName => {
                db.ref('accounts/' + accountName).set(accountsDB[accountName]);
            });
            // --------------------------------------------------------
            
            
            confirmedTeams.push({
                boss: boss,
                timeslot: timeslotSelect.value,
                timeText: timeText,
                members: members,
                rolledChannels: [
                    Math.floor(Math.random() * 1999) + 1,
                    Math.floor(Math.random() * 1999) + 1,
                    Math.floor(Math.random() * 1999) + 1
                ],
                finalChannel: null
            });
            
            saveDB();
            alert(`成功建立: ${boss}（${members.length} 人隊伍），並且已完成排班！`);
            
            clearTeamSlots();
            updateTeamView(); // This will recalculate allSchedules and re-render the available players pool and heatmap
            
            document.querySelector('.tab-btn[data-target="tab-status"]').click();
        });
    }

    // --- Confirmed Teams Status Logic ---
        function renderConfirmedTeams() {
        const container = document.getElementById('confirmed-teams-container');
        const historyContainer = document.getElementById('historical-teams-container');
        if (container) container.innerHTML = '';
        if (historyContainer) historyContainer.innerHTML = '';
        
        const now = new Date();
        let changed = false;
        
        let validTeams = [];
        
        confirmedTeams.forEach(team => {
            if (!team || !team.timeslot) {
                changed = true;
                return;
            }
            
            const parts = team.timeslot.split('-');
            const year = parseInt(parts[0]) || 0;
            const month = (parseInt(parts[1]) || 1) - 1;
            const day = parseInt(parts[2]) || 1;
            const row = parseInt(parts[3]) || 0;
            
            const hour = Math.floor(row / 2) + 8;
            const min = row % 2 === 0 ? 0 : 30;
            
            const teamDate = new Date(year, month, day, hour, min);
            
            // Check if expired
            if (!isNaN(teamDate.getTime()) && now.getTime() > teamDate.getTime()) {
                team.isHistorical = true;
            } else {
                team.isHistorical = false;
            }
            
            validTeams.push(team);
        });

        if (changed) {
            confirmedTeams = validTeams;
            saveDB();
        }
        
        let sortedTeams = [...confirmedTeams].sort((a,b) => {
            const getT = (ts) => {
                if(!ts) return 0;
                const p = ts.split('-');
                return new Date(parseInt(p[0])||0, (parseInt(p[1])||1)-1, parseInt(p[2])||1, Math.floor((parseInt(p[3])||0)/2)+8, (parseInt(p[3])||0)%2===0?0:30).getTime();
            };
            return getT(a.timeslot) - getT(b.timeslot);
        });

        let activeCount = 0;
        let historyCount = 0;

        sortedTeams.forEach((team) => {
            try {
                const isHistory = team.isHistorical;
                const targetContainer = isHistory ? historyContainer : container;
                if (!targetContainer) return;
                
                if (isHistory) historyCount++;
                else activeCount++;

                const teamMembers = team.members ? (Array.isArray(team.members) ? team.members : Object.values(team.members)) : [];
                
                
                
                const bossName = team.boss || '未指定';
                const isDragonKing = bossName === '龍王';
                const card = document.createElement('div');
                card.style.background = isHistory ? 'var(--bg-color)' : 'var(--secondary-color)';
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

                const updatedTimeText = formatSlotKeyToText(team.timeslot || "");
                const channelDisplay = team.finalChannel ? team.finalChannel : (team.channels && team.channels !== '未指定' ? team.channels : '');
                const channelInfo = channelDisplay ? `<span style="color:var(--primary-color); font-weight:bold;">(頻道: ${channelDisplay})</span>` : '';
                header.innerHTML = `
                    <h3 style="color: var(--text-main); margin: 0;">[${bossName}] 出團時間 ${updatedTimeText} ${channelInfo}</h3>
                    <span style="font-size: 0.9rem; color: var(--text-muted);">共 ${teamMembers.length} 人</span>
                `;
                card.appendChild(header);

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
                    
                    for (let i=0; i<count; i++) {
                        const memberIndex = startIndex + i;
                        const memberSlot = document.createElement('div');
                        memberSlot.style.padding = '0.75rem';
                        memberSlot.style.borderRadius = '8px';
                        memberSlot.style.border = '1px solid var(--card-border)';
                        
                        if (memberIndex < teamMembers.length) {
                            const m = teamMembers[memberIndex];
                            memberSlot.style.background = '#ffffff';
                            memberSlot.innerHTML = `
                                <div style="font-weight: 600; color: var(--text-main);">${m.name}</div>
                                <div style="font-size: 0.85rem; color: var(--text-muted);">Lv.${m.level}<br>${m.job}</div>
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
                        <textarea class="drop-input" placeholder="例如：母樹的種子x1..." style="width: 100%; height: 60px; padding: 0.5rem; font-size: 0.9rem; border: 1px solid var(--card-border); border-radius: 4px; resize: vertical; box-sizing: border-box;">${dropValue}</textarea>
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
                                team.rolledChannels = [Math.floor(Math.random() * 1999) + 1];
                                setTimeout(() => saveDB(), 0);
                            }
                            const singleChannel = team.rolledChannels[0] || (Math.floor(Math.random() * 1999) + 1);
                            
                            channelSection.innerHTML = `
                                <div style="margin-bottom: 0.8rem; font-weight: 600; font-size: 0.9rem; color: var(--text-main);">頻道選擇 (輸入，或點擊隨機)</div>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input type="number" class="channel-input" value="${singleChannel}" style="width: 80px; padding: 0.4rem; font-size: 1rem; border: 1px solid var(--card-border); border-radius: 4px; text-align: center; color: var(--text-main);">
                                    <button class="btn-secondary reroll-btn" style="padding: 0.4rem 0.8rem; font-size: 1rem;" title="隨機">🎲</button>
                                    <button class="btn-primary select-btn" style="padding: 0.4rem 1rem; font-size: 0.9rem;">決定</button>
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
                                    inputEl.value = Math.floor(Math.random() * 1999) + 1;
                                    elapsed += interval;
                                    if(elapsed >= duration) {
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
                                if (!val || val < 1) {
                                    alert('請輸入有效的頻道號碼！');
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
                
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '刪除紀錄';
                deleteBtn.style.marginTop = '1rem';
                deleteBtn.style.padding = '0.5rem 1rem';
                deleteBtn.style.background = 'transparent';
                deleteBtn.style.border = '1px solid var(--danger-color)';
                deleteBtn.style.color = '#ff6666';
                deleteBtn.style.borderRadius = '6px';
                deleteBtn.style.cursor = 'pointer';
                
                deleteBtn.onclick = () => {
                    if(confirm('確定要刪除這筆紀錄嗎？將會歸還所有成員被扣除的次數。')) {
                        const actualIndex = confirmedTeams.indexOf(team);
                        if(actualIndex > -1) {
                            // Refund tickets
                            const N = team.gamesCount || 7;
                            const addition = team.boss === '龍王' ? N * 2 : N;
                            
                            let updatedAccounts = new Set();
                            if (team.members && accountsDB) {
                                team.members.forEach(m => {
                                    for (let accountName in accountsDB) {
                                        const acc = accountsDB[accountName];
                                        if (acc.characters) {
                                            const charObj = acc.characters.find(c => c.id === m.id);
                                            if (charObj) {
                                                let currentT = charObj.currentTickets !== undefined ? parseInt(charObj.currentTickets) : ((charObj.tickets !== undefined && charObj.tickets !== '' ? parseInt(charObj.tickets) : 7));
                                                charObj.currentTickets = currentT + addition;
                                                updatedAccounts.add(accountName);
                                                break;
                                            }
                                        }
                                    }
                                });
                            }
                            
                            // Save accounts back
                            updatedAccounts.forEach(accountName => {
                                db.ref('accounts/' + accountName).set(accountsDB[accountName]);
                            });
                            alert('已成功歸還次數！每位成員加回 ' + addition + ' 次。');
                        
                            confirmedTeams.splice(actualIndex, 1);
                            saveDB();
                        }
                    }
                };

                card.appendChild(deleteBtn);
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
        container.innerHTML = '<p class="empty-state" style="color:var(--text-muted); grid-column: 1 / -1;">目前沒有進行中的組隊</p>';
        }
        if (historyContainer && historyCount === 0) {
        historyContainer.innerHTML = '<p class="empty-state" style="color:var(--text-muted); grid-column: 1 / -1;">目前沒有歷史出團紀錄</p>';
        }
    }

    // --- Changelog Logic ---
    let editingLogTimestamp = null;

    window.renderChangelogs = function() {
        const form = document.getElementById('changelog-form');
        const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
        let cancelBtn = document.getElementById('changelog-cancel-btn');
        
        if (form) {
            form.style.display = sessionName === 'Lumi' ? 'flex' : 'none';
            if (sessionName === 'Lumi') {
                if (editingLogTimestamp) {
                    submitBtn.textContent = '儲存修改';
                    if (!cancelBtn) {
                        cancelBtn = document.createElement('button');
                        cancelBtn.id = 'changelog-cancel-btn';
                        cancelBtn.type = 'button';
                        cancelBtn.className = 'btn-secondary';
                        cancelBtn.textContent = '取消編輯';
                        cancelBtn.style.marginTop = '1rem';
                        cancelBtn.onclick = () => {
                            editingLogTimestamp = null;
                            document.getElementById('changelog-title').value = '';
                            document.getElementById('changelog-content').value = '';
                            renderChangelogs();
                        };
                        form.appendChild(cancelBtn);
                    }
                    cancelBtn.style.display = 'block';
                } else {
                    submitBtn.textContent = '新增紀錄';
                    if (cancelBtn) cancelBtn.style.display = 'none';
                }
            }
        }

        const container = document.getElementById('changelog-container');
        if (!container) return;
        container.innerHTML = '';
        
        if (changelogs.length === 0) {
            container.innerHTML = '<p class="empty-state" style="color:var(--text-muted);">目前沒有更新紀錄</p>';
            return;
        }

        // Sort descending by date (newest first, oldest bottom)
        const sorted = [...changelogs].sort((a,b) => b.timestamp - a.timestamp);
        
        sorted.forEach(log => {
            const card = document.createElement('div');
            card.style.background = 'var(--card-bg)';
            card.style.border = '1px solid var(--card-border)';
            card.style.borderRadius = '8px';
            card.style.padding = '1.5rem';
            
            const dateObj = new Date(log.timestamp);
            const dateStr = `${dateObj.getFullYear()}/${(dateObj.getMonth()+1).toString().padStart(2,'0')}/${dateObj.getDate().toString().padStart(2,'0')} ${dateObj.getHours().toString().padStart(2,'0')}:${dateObj.getMinutes().toString().padStart(2,'0')}`;
            
            let editHtml = '';
            if (sessionName === 'Lumi') {
                editHtml = `<button class="edit-log-btn" data-ts="${log.timestamp}" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--secondary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">編輯</button>`;
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0; color: var(--primary-color); font-size: 1.2rem;">${log.title}</h3>
                    <span style="color: var(--text-muted); font-size: 0.9rem;">${dateStr}</span>
                </div>
                <div style="color: var(--text-main); font-size: 1rem; line-height: 1.6; white-space: pre-wrap;">${log.content}</div>
                <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted); text-align: right;">更新者: ${log.author || '系統'}</div>
                ${editHtml}
            `;
            container.appendChild(card);
        });

        // Attach edit listeners
        container.querySelectorAll('.edit-log-btn').forEach(btn => {
            btn.onclick = (e) => {
                const ts = parseInt(e.currentTarget.dataset.ts);
                const targetLog = changelogs.find(c => c.timestamp === ts);
                if (targetLog) {
                    editingLogTimestamp = ts;
                    document.getElementById('changelog-title').value = targetLog.title;
                    document.getElementById('changelog-content').value = targetLog.content;
                    // Scroll to top to see form
                    document.getElementById('tab-changelog').scrollIntoView({ behavior: 'smooth' });
                    renderChangelogs();
                }
            };
        });
    };

    const changelogForm = document.getElementById('changelog-form');
    if (changelogForm) {
        changelogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!dbLoaded) {
                alert("資料庫尚未載入完成");
                return;
            }
            if (!sessionName) {
                alert("請先登入才能新增紀錄");
                return;
            }
            
            const title = document.getElementById('changelog-title').value.trim();
            const content = document.getElementById('changelog-content').value.trim();
            
            if (title && content) {
                if (editingLogTimestamp) {
                    const idx = changelogs.findIndex(c => c.timestamp === editingLogTimestamp);
                    if (idx > -1) {
                        changelogs[idx].title = title;
                        changelogs[idx].content = content;
                        changelogs[idx].author = sessionName;
                    }
                    editingLogTimestamp = null;
                } else {
                    const newLog = {
                        title: title,
                        content: content,
                        timestamp: Date.now(),
                        author: sessionName
                    };
                    changelogs.push(newLog);
                }
                
                db.ref('changelog').set(changelogs).then(() => {
                    alert("更新日誌已儲存！");
                    document.getElementById('changelog-title').value = '';
                    document.getElementById('changelog-content').value = '';
                    renderChangelogs();
                }).catch(err => {
                    alert("儲存失敗: " + err.message);
                });
            }
        });
    }

});
