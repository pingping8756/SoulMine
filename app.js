// --- Helper Functions ---
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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

// --- Boss List Configuration (Official Full Names & Icons) ---
const BOSS_LIST = [
    { name: "克雷塞爾", icon: "🌲", color: "#4ade80" },
    { name: "普通拉圖斯", icon: "⌛", color: "#fbbf24" },
    { name: "困難拉圖斯", icon: "⏰", color: "#f87171" },
    { name: "闇黑龍王", icon: "🐉", color: "#c084fc" },
    { name: "普通殘暴炎魔", icon: "🔥", color: "#fb923c" },
    { name: "困難殘暴炎魔", icon: "🌋", color: "#ef4444" },
    { name: "艾畢奈亞", icon: "🦋", color: "#f472b6" }
];
let currentSelectedBoss = null;

function normalizeBossName(name) {
    if (!name) return "克雷塞爾";
    if (name.includes("樹王") || name.includes("克雷塞爾")) return "克雷塞爾";
    if (name === "普拉" || name.includes("普通拉圖斯")) return "普通拉圖斯";
    if (name === "困拉" || name.includes("困難拉圖斯")) return "困難拉圖斯";
    if (name.includes("龍王") || name.includes("黑龍")) return "闇黑龍王";
    if (name === "普炎" || name === "炎魔" || name.includes("普通殘暴炎魔") || name.includes("普通炎魔")) return "普通殘暴炎魔";
    if (name === "困炎" || name.includes("困難殘暴炎魔") || name.includes("困難炎魔")) return "困難殘暴炎魔";
    if (name.includes("蝴蝶") || name.includes("畢奈亞")) return "艾畢奈亞";
    return name;
}

function matchesBoss(raidBoss, targetBossName) {
    if (!raidBoss || !targetBossName) return false;
    return normalizeBossName(raidBoss) === normalizeBossName(targetBossName);
}

function isDragonKingBoss(bossName) {
    if (!bossName) return false;
    return bossName.includes('龍王');
}

function getNextTuesdayReset(timestamp) {
    if (!timestamp) return 0;
    const d = new Date(timestamp);
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    while (target.getDay() !== 2 || target.getTime() <= timestamp) {
        target.setDate(target.getDate() + 1);
    }
    return target.getTime();
}

function getJobColor(job) {
    if (!job) return '#ff7518';
    if (job === '黑騎士' || job === '聖騎士' || job === '英雄') return '#fb923c';
    if (job === '神射手' || job === '箭神') return '#4ade80';
    if (job === '神偷' || job === '暗影神偷' || job === '夜使者') return '#38bdf8';
    if (job === '槍神' || job === '拳霸') return '#e879f9';
    if (job === '火毒' || job === '冰雷' || job === '主教' || (job && job.includes('魔導士'))) return '#c084fc';
    return '#ff7518';
}

function getHighContrastJobColor(job) {
    if (!job) return '#c2410c';
    if (job === '黑騎士' || job === '聖騎士' || job === '英雄') return '#c2410c';
    if (job === '神射手' || job === '箭神') return '#15803d';
    if (job === '神偷' || job === '暗影神偷' || job === '夜使者') return '#0284c7';
    if (job === '槍神' || job === '拳霸') return '#a21caf';
    if (job === '火毒' || job === '冰雷' || job === '主教' || (job && job.includes('魔導士'))) return '#7e22ce';
    return '#c2410c';
}

// --- Character Roster (Ordered by 力職 ➔ 敏職 ➔ 法職) ---
const CURRENT_ROSTER_VERSION = 2;
let CHARACTER_ROSTER = [
    // --- 力職 (10位: 火/黑騎 ➔ 聖騎 ➔ 英雄) ---
    { id: "Eric", job: "黑騎士", level: 180, category: "力職" },
    { id: "大鎖", job: "黑騎士", level: 165, category: "力職" },
    { id: "Ohni", job: "黑騎士", level: 163, category: "力職" },
    { id: "長吉毛毛娃", job: "黑騎士", level: 158, category: "力職" },
    { id: "汪德", job: "黑騎士", level: 147, category: "力職" },
    { id: "漢堡王", job: "黑騎士", level: 145, category: "力職" },
    { id: "小茵", job: "聖騎士", level: 162, category: "力職" },
    { id: "小皮", job: "聖騎士", level: 140, category: "力職" },
    { id: "Eric", job: "英雄", level: 168, category: "力職" },
    { id: "毛毛蟲", job: "英雄", level: 152, category: "力職" },

    // --- 敏職 (16位: 眼 ➔ 盜賊 ➔ 海盜) ---
    { id: "IE", job: "神射手", level: 175, category: "敏職" },
    { id: "小茵", job: "箭神", level: 174, category: "敏職" },
    { id: "毛毛蟲", job: "神射手", level: 168, category: "敏職" },
    { id: "小皮", job: "箭神", level: 160, category: "敏職" },
    { id: "阿甘", job: "箭神", level: 153, category: "敏職" },
    { id: "Lumi", job: "箭神", level: 138, category: "敏職" },
    { id: "阿仁", job: "神偷", level: 180, category: "敏職" },
    { id: "Bagle", job: "神偷", level: 163, category: "敏職" },
    { id: "DerDer", job: "神偷", level: 151, category: "敏職" },
    { id: "阿偉", job: "神偷", level: 149, category: "敏職" },
    { id: "阿甘", job: "夜使者", level: 174, category: "敏職" },
    { id: "Eric", job: "夜使者", level: 163, category: "敏職" },
    { id: "Bagle", job: "夜使者", level: 121, category: "敏職" },
    { id: "WonderW", job: "槍神", level: 170, category: "敏職" },
    { id: "阿仁", job: "拳霸", level: 167, category: "敏職" },
    { id: "小皮", job: "拳霸", level: 140, category: "敏職" },

    // --- 法職 (13位: 火毒 ➔ 冰雷 ➔ 主教) ---
    { id: "Bagel", job: "火毒", level: 174, category: "法職" },
    { id: "Eric", job: "冰雷", level: 169, category: "法職" },
    { id: "CC", job: "冰雷", level: 164, category: "法職" },
    { id: "極氏倫", job: "冰雷", level: 153, category: "法職" },
    { id: "小龜", job: "主教", level: 174, category: "法職" },
    { id: "CC", job: "主教", level: 165, category: "法職" },
    { id: "Ohni", job: "主教", level: 162, category: "法職" },
    { id: "Lumi", job: "主教", level: 155, category: "法職" },
    { id: "Bagle", job: "主教", level: 137, category: "法職" },
    { id: "Eric", job: "主教", level: 132, category: "法職" },
    { id: "毛毛蟲", job: "主教", level: 132, category: "法職" },
    { id: "小茵", job: "主教", level: 131, category: "法職" },
    { id: "阿仁", job: "主教", level: 131, category: "法職" }
];

function getCategoryByJob(job) {
    if (!job) return '力職';
    if (['黑騎士', '聖騎士', '英雄'].includes(job)) return '力職';
    if (['箭神', '神射手', '神偷', '暗影神偷', '夜使者', '槍神', '拳霸'].includes(job)) return '敏職';
    if (['火毒', '冰雷', '主教'].includes(job) || job.includes('魔導士') || job.includes('僧侶') || job.includes('法師')) return '法職';
    return '力職';
}

function getCustomCharacters() {
    try {
        return JSON.parse(localStorage.getItem('soulmine_custom_roster')) || [];
    } catch(e) {
        return [];
    }
}

function syncRosterToFirebase() {
    try {
        if (typeof db !== 'undefined' && db && db.ref) {
            db.ref('custom_roster').set(CHARACTER_ROSTER);
            db.ref('roster_version').set(CURRENT_ROSTER_VERSION);
        }
        localStorage.setItem('soulmine_custom_roster_cache', JSON.stringify(CHARACTER_ROSTER));
        localStorage.setItem('soulmine_custom_roster_ver', String(CURRENT_ROSTER_VERSION));
    } catch(e) {
        console.warn("Failed to sync roster to Firebase", e);
    }
}

function saveCustomCharacter(charObj) {
    try {
        let customList = getCustomCharacters().filter(c => !(c.id === charObj.id && c.job === charObj.job));
        customList.push(charObj);
        localStorage.setItem('soulmine_custom_roster', JSON.stringify(customList));
        syncRosterToFirebase();
    } catch(e) {
        console.error("Failed to save custom character", e);
    }
}

function initCustomCharacters() {
    try {
        const cachedVer = localStorage.getItem('soulmine_custom_roster_ver');
        if (cachedVer !== String(CURRENT_ROSTER_VERSION)) {
            localStorage.removeItem('soulmine_custom_roster_cache');
            localStorage.removeItem('soulmine_custom_roster');
            localStorage.setItem('soulmine_custom_roster_ver', String(CURRENT_ROSTER_VERSION));
            syncRosterToFirebase();
            return;
        }

        const cached = localStorage.getItem('soulmine_custom_roster_cache');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                CHARACTER_ROSTER = parsed;
                return;
            }
        }
    } catch (e) {}

    const customList = getCustomCharacters();
    customList.forEach(item => {
        const idx = CHARACTER_ROSTER.findIndex(c => c.id === item.id && c.job === item.job);
        if (idx !== -1) {
            CHARACTER_ROSTER[idx].level = item.level;
            CHARACTER_ROSTER[idx].category = item.category || getCategoryByJob(item.job);
            CHARACTER_ROSTER[idx].isCustom = true;
        } else {
            CHARACTER_ROSTER.push({
                ...item,
                category: item.category || getCategoryByJob(item.job),
                isCustom: true
            });
        }
    });
}
initCustomCharacters();

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let raidsDB = {};
    let confirmedTeams = [];
    let changelogs = [];
    let surveyResponses = {};
    let raidDatePicker = null;

    // --- Create Raid Interactive Planner State ---
    let createRaidState = {
        boss: "克雷塞爾",
        games: 7,
        dateObj: new Date(),
        timeStr: "20:00",
        slots: [], // Array of { slotIndex, name, job, level, isCreator }
        activeSlotIndex: 0,
        filterCat: "all",
        searchKeyword: ""
    };

    let currentJoinRaidId = null;
    let currentJoinSlotIdx = 0;

    // --- Taiwan Holidays (國定假日連動日曆) ---
    const FALLBACK_HOLIDAYS = {
        // 2025
        "20250101": "元旦", "20250125": "春節", "20250126": "春節", "20250127": "春節", "20250128": "除夕", "20250129": "春節", "20250130": "春節", "20250131": "春節", "20250201": "春節", "20250202": "春節", "20250228": "和平紀念日", "20250403": "清明連假", "20250404": "兒童節", "20250405": "清明節", "20250406": "清明連假", "20250530": "端午連假", "20250531": "端午節", "20251006": "中秋節", "20251010": "國慶日",
        // 2026
        "20260101": "元旦", "20260214": "春節", "20260215": "春節", "20260216": "除夕", "20260217": "春節", "20260218": "春節", "20260219": "春節", "20260220": "春節", "20260227": "和平紀念日", "20260228": "和平紀念日", "20260403": "清明連假", "20260404": "兒童節", "20260405": "清明節", "20260406": "清明連假", "20260619": "端午節", "20260925": "中秋節", "20261009": "補假", "20261010": "國慶日",
        // 2027
        "20270101": "元旦", "20270205": "小年夜", "20270206": "除夕", "20270207": "春節", "20270208": "春節", "20270209": "春節", "20270228": "和平紀念日", "20270404": "兒童節", "20270405": "清明節", "20270609": "端午節", "20270915": "中秋節", "20271010": "國慶日"
    };

    let taiwanHolidaysCache = {};

    async function initTaiwanHolidays(year) {
        if (taiwanHolidaysCache[year]) return;
        try {
            const localCached = localStorage.getItem(`soulmine_tw_holidays_${year}`);
            if (localCached) {
                taiwanHolidaysCache[year] = JSON.parse(localCached);
            }
        } catch(e) {}

        try {
            const res = await fetch(`https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`);
            if (res.ok) {
                const data = await res.json();
                const map = {};
                data.forEach(item => {
                    if (item.isHoliday) {
                        map[item.date] = item.description || '國定假日';
                    }
                });
                taiwanHolidaysCache[year] = map;
                try {
                    localStorage.setItem(`soulmine_tw_holidays_${year}`, JSON.stringify(map));
                } catch(e) {}
                if (typeof window.renderSurveyFormSlots === 'function') window.renderSurveyFormSlots();
                if (typeof renderSurveySummary === 'function') renderSurveySummary();
            }
        } catch(err) {
            console.warn("Could not fetch online TaiwanCalendar:", err);
        }
    }

    // Preload current and next year holidays
    const currentYear = new Date().getFullYear();
    initTaiwanHolidays(currentYear);
    initTaiwanHolidays(currentYear + 1);

    function checkDateHoliday(d) {
        const day = d.getDay(); // 0 is Sun, 6 is Sat
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}${mm}${dd}`;

        let desc = '';
        const cached = taiwanHolidaysCache[yyyy];
        if (cached && cached[dateKey]) {
            desc = cached[dateKey];
        } else if (FALLBACK_HOLIDAYS[dateKey]) {
            desc = FALLBACK_HOLIDAYS[dateKey];
        }

        const isWeekend = (day === 0 || day === 6);
        const isSpecialHoliday = (!!desc && !isWeekend);

        return {
            isHoliday: isWeekend || !!desc,
            isWeekend: isWeekend,
            isSpecialHoliday: isSpecialHoliday,
            holidayName: desc
        };
    }

    // --- Survey Form & Time Availability Logic (週二起算，往後四週，國定假日連動) ---
    function getTuesdayOfWeek(date = new Date()) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay(); // 0: Sun, 1: Mon, 2: Tue, ..., 6: Sat
        const diff = (day >= 2) ? -(day - 2) : -(day + 5);
        d.setDate(d.getDate() + diff);
        return d;
    }

    function formatDateISO(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dt = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dt}`;
    }

    function formatDateSimple(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const m = d.getMonth() + 1;
        const dt = d.getDate();
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${m}/${dt} ${h}:${min}`;
    }

    const TARGET_DEFAULT_WEEK_ID = "2026-10-06";

    // Generate 4 to 5 Tuesday cycles starting with 10/06 as default
    function getSurveyWeekOptions() {
        const baseTue = new Date(2026, 9, 6); // 2026-10-06
        baseTue.setHours(0, 0, 0, 0);
        const options = [];

        for (let w = 0; w < 4; w++) {
            const tue = new Date(baseTue.getTime() + w * 7 * 86400000);
            const mon = new Date(tue.getTime() + 6 * 86400000);
            
            const tueM = tue.getMonth() + 1;
            const tueD = tue.getDate();
            const monM = mon.getMonth() + 1;
            const monD = mon.getDate();

            const weekId = formatDateISO(tue); // e.g. "2026-10-06"
            let tag = '';
            if (w === 0) tag = '【本週】';
            else if (w === 1) tag = '【下週】';
            else tag = `【第 ${w + 1} 週】`;

            options.push({
                weekId: weekId,
                tueDate: tue,
                label: `📅 ${tueM}/${tueD}(二) ～ ${monM}/${monD}(一) ${tag}`,
                shortLabel: `${tueM}/${tueD}(二) ~ ${monM}/${monD}(一)`,
                isDefault: (w === 0)
            });
        }

        return options;
    }

    function getWeekDaysDetails(weekId) {
        let tue;
        if (weekId) {
            const parts = weekId.split('-');
            if (parts.length === 3) {
                tue = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            }
        }
        if (!tue || isNaN(tue.getTime())) {
            tue = getTuesdayOfWeek(new Date());
        }
        tue.setHours(0, 0, 0, 0);

        const DAY_NAMES = ["二", "三", "四", "五", "六", "日", "一"];
        const days = [];

        for (let i = 0; i < 7; i++) {
            const cur = new Date(tue.getTime() + i * 86400000);
            const m = cur.getMonth() + 1;
            const dt = cur.getDate();
            const dayName = DAY_NAMES[i];
            const hol = checkDateHoliday(cur);

            const dateLabel = `${m}/${dt}(${dayName})`; // e.g. "10/4(日)"
            const isMultiSlot = hol.isWeekend || hol.isSpecialHoliday;

            const daySlots = [];
            if (isMultiSlot) {
                daySlots.push({
                    key: `${dateLabel}_午`,
                    period: "午",
                    dayName: dayName,
                    label: `${dateLabel} 午`,
                    isWeekend: hol.isWeekend,
                    isSpecialHoliday: hol.isSpecialHoliday,
                    holidayName: hol.holidayName
                });
                daySlots.push({
                    key: `${dateLabel}_晚`,
                    period: "晚",
                    dayName: dayName,
                    label: `${dateLabel} 晚`,
                    isWeekend: hol.isWeekend,
                    isSpecialHoliday: hol.isSpecialHoliday,
                    holidayName: hol.holidayName
                });
            } else {
                daySlots.push({
                    key: `${dateLabel}_晚`,
                    period: "晚",
                    dayName: dayName,
                    label: `${dateLabel}`,
                    isWeekend: false,
                    isSpecialHoliday: false,
                    holidayName: ''
                });
            }

            days.push({
                dateObj: cur,
                m: m,
                dt: dt,
                dayName: dayName,
                dateLabel: dateLabel,
                dateStr: `${m}月${dt}日`,
                shortDate: `${m}/${dt}`,
                isWeekend: hol.isWeekend,
                isSpecialHoliday: hol.isSpecialHoliday,
                holidayName: hol.holidayName,
                slots: daySlots
            });
        }
        return days;
    }

    function isUserSlotChecked(userSlots, slotDef, dayDef) {
        if (!userSlots || !Array.isArray(userSlots) || !slotDef) return false;
        // 1. Direct match on key or label or underscore
        if (userSlots.includes(slotDef.key) || userSlots.includes(slotDef.label) || userSlots.includes(slotDef.key.replace('_', ' '))) {
            return true;
        }
        // 2. Legacy fallback
        if (slotDef.period === '午') {
            if (userSlots.includes(`週${slotDef.dayName}(下午)`) || 
                userSlots.includes(`週${slotDef.dayName}(午)`) ||
                userSlots.includes(`${slotDef.dayName}(午)`) ||
                userSlots.includes(`${slotDef.dayName}(下午)`)) {
                return true;
            }
        } else if (slotDef.period === '晚') {
            if (userSlots.includes(`週${slotDef.dayName}(晚)`) ||
                userSlots.includes(`${slotDef.dayName}(晚)`)) {
                return true;
            }
        }
        return false;
    }

    let currentSurveyFormWeekId = TARGET_DEFAULT_WEEK_ID;
    let currentMatrixWeekId = TARGET_DEFAULT_WEEK_ID;

    // --- Accounts & User Session ---
    let accountsDB = {};

    function getLoggedInUser() {
        return localStorage.getItem('soulmine_logged_user') || sessionStorage.getItem('artale_session') || '';
    }

    function setLoggedInUser(name) {
        if (name) {
            localStorage.setItem('soulmine_logged_user', name);
            sessionStorage.setItem('artale_session', name);
        } else {
            localStorage.removeItem('soulmine_logged_user');
            sessionStorage.removeItem('artale_session');
        }
    }

    function canCreateTeam() {
        return isAdmin() || !!getLoggedInUser();
    }

    // --- Realtime Sync ---
    db.ref('/').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        accountsDB = data.accounts || {};
        raidsDB = data.raids || {};
        surveyResponses = data.surveys || {};
        
        // Preserve all historical and confirmed teams
        const rawTeams = data.teams ? (Array.isArray(data.teams) ? data.teams : Object.values(data.teams)) : [];
        confirmedTeams = rawTeams.filter(t => t !== null && t !== undefined);
        
        const rawChangelogs = data.changelog || data.changelogs || [];
        changelogs = Array.isArray(rawChangelogs) ? rawChangelogs.filter(c => c !== null && c !== undefined) : Object.values(rawChangelogs);
        
        // Sync custom/updated character roster from Firebase
        if (!data.roster_version || data.roster_version < CURRENT_ROSTER_VERSION) {
            db.ref('custom_roster').set(CHARACTER_ROSTER);
            db.ref('roster_version').set(CURRENT_ROSTER_VERSION);
            localStorage.setItem('soulmine_custom_roster_cache', JSON.stringify(CHARACTER_ROSTER));
            localStorage.setItem('soulmine_custom_roster_ver', String(CURRENT_ROSTER_VERSION));
        } else if (data.custom_roster) {
            const rawRoster = Array.isArray(data.custom_roster) ? data.custom_roster : Object.values(data.custom_roster);
            if (rawRoster && rawRoster.length > 0) {
                CHARACTER_ROSTER = rawRoster.map(c => ({
                    id: String(c.id || '').trim(),
                    job: String(c.job || '').trim(),
                    level: parseInt(c.level, 10) || 120,
                    category: c.category || getCategoryByJob(c.job),
                    isCustom: !!c.isCustom
                })).filter(c => c.id && c.job);
                localStorage.setItem('soulmine_custom_roster_cache', JSON.stringify(CHARACTER_ROSTER));
            }
        }

        updateUI();
    });

    function saveDB() {
        const safeTeams = confirmedTeams.filter(t => t !== null && t !== undefined);
        db.ref('teams').set(safeTeams);
    }

    function initApp() {
        try {
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
                    if (targetId === 'tab-recruit') {
                        currentSelectedBoss = null;
                    }
                    updateUI();
                });
            });

            setupSurveyForm();
            setupRaidModals();
            setupAdminAuth();
            setupGeneralLoginModal();
            setupRosterManagement();
            setupChangelogForm();
            updateUI();
        } catch (e) {
            console.error("FATAL ERROR IN INITAPP:", e);
        }
    }

    function updateUI() {
        updateAdminUI();
        renderSurveySummary();
        renderRecruitBoard();
        renderConfirmedTeams();
        renderChangelogs();
        if (typeof window.renderCreateSlotsList === 'function') {
            window.renderCreateSlotsList();
        }
        if (typeof window.renderCreateRosterKeys === 'function') {
            window.renderCreateRosterKeys();
        }
        if (typeof window.renderRosterMgList === 'function') {
            window.renderRosterMgList();
        }
    }

    function getMySurveyName() {
        return localStorage.getItem('soulmine_survey_user_name') || getSavedCreator() || (getSavedChar() && getSavedChar().name) || '';
    }

    function setupSurveyForm() {
        const form = document.getElementById('raid-survey-form');
        const nameInput = document.getElementById('survey-user-name');
        const notesInput = document.getElementById('survey-user-notes');
        const weekSelect = document.getElementById('survey-week-select');
        const holidayHint = document.getElementById('survey-week-holiday-hint');
        const slotsContainer = document.getElementById('survey-slots-container');

        // Populate Week Options (4~5 Tuesday-start cycles)
        const weekOptions = getSurveyWeekOptions();
        if (weekSelect) {
            weekSelect.innerHTML = weekOptions.map(opt => `
                <option value="${opt.weekId}" ${opt.isDefault ? 'selected' : ''}>${opt.label}</option>
            `).join('');

            const defOpt = weekOptions.find(o => o.isDefault) || weekOptions[0];
            currentSurveyFormWeekId = defOpt.weekId;
            currentMatrixWeekId = defOpt.weekId;

            weekSelect.addEventListener('change', () => {
                currentSurveyFormWeekId = weekSelect.value;
                currentMatrixWeekId = weekSelect.value;
                renderSurveyFormSlots();
                checkAndPrefillCurrentResponse();
                // Also sync modal select if open
                const modalSelect = document.getElementById('survey-matrix-week-select');
                if (modalSelect) modalSelect.value = currentSurveyFormWeekId;
                renderSurveySummary();
            });
        }

        // Render dynamic slots based on selected week & holiday status
        function renderSurveyFormSlots() {
            if (!slotsContainer) return;
            const targetWeekId = currentSurveyFormWeekId || (weekOptions[0] && weekOptions[0].weekId);
            const days = getWeekDaysDetails(targetWeekId);

            // Check if any day is a special holiday
            const specialHolidays = days.filter(d => d.isSpecialHoliday);
            if (holidayHint) {
                if (specialHolidays.length > 0) {
                    const holNames = specialHolidays.map(d => `${d.dateLabel} ${d.holidayName}`).join('、');
                    holidayHint.innerHTML = `㊗️ 本週含國定假日：<strong>${escapeHtml(holNames)}</strong>`;
                } else {
                    holidayHint.innerHTML = '';
                }
            }

            // Build slot chips
            let html = '';
            days.forEach(d => {
                d.slots.forEach(s => {
                    const isWk = s.isWeekend;
                    const isHol = s.isSpecialHoliday;
                    const holCornerText = (s.holidayName && (s.holidayName.includes('補') || s.holidayName.includes('連假'))) ? '補' : (s.holidayName ? s.holidayName.slice(0, 2) : '補');
                    const tagHtml = isHol ? `<span class="slot-holiday-corner-badge" style="background: #ef4444 !important; color: #ffffff !important;" title="${escapeHtml(s.holidayName || '補假')}">${escapeHtml(holCornerText)}</span>` : '';
                    html += `
                        <label class="survey-slot-chip ${isWk ? 'weekend' : ''} ${isHol ? 'holiday' : ''}" data-slot-key="${s.key}">
                            ${tagHtml}
                            <input type="checkbox" name="survey-slot" value="${s.key}">
                            <span>${s.label}</span>
                        </label>
                    `;
                });
            });

            slotsContainer.innerHTML = html;

            // Re-bind change listeners
            slotsContainer.querySelectorAll('.survey-slot-chip').forEach(chip => {
                const cb = chip.querySelector('input[type="checkbox"]');
                if (cb) {
                    cb.addEventListener('change', () => {
                        chip.classList.toggle('checked', cb.checked);
                    });
                }
            });
        }
        window.renderSurveyFormSlots = renderSurveyFormSlots;
        renderSurveyFormSlots();

        function checkAndPrefillCurrentResponse() {
            const curName = (nameInput ? nameInput.value : '').trim();
            if (!curName) return;
            const targetWeekId = currentSurveyFormWeekId;
            const defaultWeekId = weekOptions[0]?.weekId;

            const existing = Object.values(surveyResponses || {}).find(r => 
                r && r.name === curName && (r.weekId === targetWeekId || (!r.weekId && targetWeekId === defaultWeekId))
            );

            if (existing) {
                if (notesInput && !notesInput.value) notesInput.value = existing.notes || '';
                const scrollRadios = document.querySelectorAll('input[name="survey-scroll"]');
                scrollRadios.forEach(r => {
                    r.checked = (r.value === existing.scroll);
                });
                const userSlots = existing.slots || [];
                const days = getWeekDaysDetails(targetWeekId);
                slotsContainer.querySelectorAll('.survey-slot-chip').forEach(chip => {
                    const cb = chip.querySelector('input[type="checkbox"]');
                    const key = cb ? cb.value : '';
                    // find matching slot def
                    let slotDef = null;
                    let dayDef = null;
                    for (const d of days) {
                        for (const s of d.slots) {
                            if (s.key === key) {
                                slotDef = s;
                                dayDef = d;
                                break;
                            }
                        }
                        if (slotDef) break;
                    }
                    if (cb && slotDef) {
                        cb.checked = isUserSlotChecked(userSlots, slotDef, dayDef);
                        chip.classList.toggle('checked', cb.checked);
                    }
                });
            }
        }

        if (nameInput) {
            nameInput.addEventListener('blur', checkAndPrefillCurrentResponse);
        }

        // Reset survey form helper to keep it completely clean
        function resetSurveyForm() {
            if (form) form.reset();
            if (nameInput) nameInput.value = '';
            if (notesInput) notesInput.value = '';
            if (slotsContainer) {
                slotsContainer.querySelectorAll('.survey-slot-chip').forEach(chip => {
                    const cb = chip.querySelector('input[type="checkbox"]');
                    if (cb) cb.checked = false;
                    chip.classList.remove('checked');
                });
            }
            const scrollRadios = document.querySelectorAll('input[name="survey-scroll"]');
            scrollRadios.forEach(r => {
                r.checked = (r.value === '是');
            });
        }
        window.resetSurveyForm = resetSurveyForm;

        // Ensure form is completely empty/clean by default upon page open
        resetSurveyForm();

        const btnResetSurvey = document.getElementById('btn-reset-survey-form');
        if (btnResetSurvey) {
            btnResetSurvey.onclick = resetSurveyForm;
        }

        // Form Submit
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = (nameInput ? nameInput.value : '').trim();
                if (!name) {
                    alert("請輸入您的名字！");
                    return;
                }

                const selectedSlots = [];
                slotsContainer.querySelectorAll('input[name="survey-slot"]:checked').forEach(cb => {
                    selectedSlots.push(cb.value);
                });

                if (selectedSlots.length === 0) {
                    if (!confirm("您尚未勾選任何可打王時段，確定要送出嗎？")) {
                        return;
                    }
                }

                const scrollRadios = document.querySelectorAll('input[name="survey-scroll"]:checked');
                const scrollPref = scrollRadios.length > 0 ? scrollRadios[0].value : "是";
                const notes = (notesInput ? notesInput.value : '').trim();
                const targetWeekId = currentSurveyFormWeekId || weekOptions[0].weekId;
                const activeOpt = weekOptions.find(o => o.weekId === targetWeekId) || weekOptions[0];

                localStorage.setItem('soulmine_survey_user_name', name);
                setSavedCreator(name);

                // Find existing key by name & weekId if already submitted
                const existingKey = Object.keys(surveyResponses).find(k => {
                    const r = surveyResponses[k];
                    if (!r || r.name !== name) return false;
                    const rWeek = r.weekId || weekOptions[0].weekId;
                    return rWeek === targetWeekId;
                });

                const ref = existingKey ? db.ref(`surveys/${existingKey}`) : db.ref('surveys').push();

                ref.set({
                    id: ref.key,
                    name: name,
                    weekId: targetWeekId,
                    weekLabel: activeOpt.label,
                    slots: selectedSlots,
                    scroll: scrollPref,
                    notes: notes,
                    updatedAt: Date.now()
                }).then(() => {
                    alert(`✅【${name}】的【${activeOpt.shortLabel}】問卷已成功送出！`);
                    resetSurveyForm();
                }).catch(err => {
                    alert("送出失敗：" + err.message);
                });
            });
        }

        // Admin clear all surveys
        const btnClearSurveys = document.getElementById('btn-clear-all-surveys');
        if (btnClearSurveys) {
            btnClearSurveys.onclick = () => {
                const targetWeekId = currentMatrixWeekId || currentSurveyFormWeekId;
                if (confirm(`⚠️ 警告：確定要清空所選週次(${targetWeekId})的所有問卷紀錄嗎？`)) {
                    // Remove records for this week
                    const updates = {};
                    Object.entries(surveyResponses || {}).forEach(([k, r]) => {
                        const rWeek = r.weekId || weekOptions[0].weekId;
                        if (rWeek === targetWeekId) {
                            updates[`surveys/${k}`] = null;
                        }
                    });
                    if (Object.keys(updates).length > 0) {
                        db.ref().update(updates).then(() => {
                            alert("已重設該週次問卷紀錄！");
                        });
                    } else {
                        alert("該週次目前無資料！");
                    }
                }
            };
        }

        // Copy survey text summary
        const btnCopySurvey = document.getElementById('btn-copy-survey-text');
        if (btnCopySurvey) {
            btnCopySurvey.onclick = () => {
                const targetWeekId = currentMatrixWeekId || currentSurveyFormWeekId || TARGET_DEFAULT_WEEK_ID;
                const weekOpt = weekOptions.find(o => o.weekId === targetWeekId) || weekOptions[0];
                const responses = Object.values(surveyResponses || {}).filter(r => {
                    const rWeek = r.weekId || TARGET_DEFAULT_WEEK_ID;
                    if (targetWeekId === TARGET_DEFAULT_WEEK_ID) {
                        return (rWeek === TARGET_DEFAULT_WEEK_ID || rWeek === "2026-09-29");
                    }
                    return rWeek === targetWeekId;
                });

                if (responses.length === 0) {
                    alert(`目前【${weekOpt.shortLabel}】尚無成員填寫問卷！`);
                    return;
                }

                const weekDays = getWeekDaysDetails(targetWeekId);
                let text = `【SoulMine 可打王時段統整】\n`;
                text += `📅 週期：${weekDays[0].dateLabel} ~ ${weekDays[6].dateLabel} | 共 ${responses.length} 人填寫\n\n`;

                weekDays.forEach(d => {
                    if (d.isWeekend || d.isSpecialHoliday) {
                        const aftSlot = d.slots[0];
                        const eveSlot = d.slots[1];
                        const aftMembers = responses.filter(r => isUserSlotChecked(r.slots, aftSlot, d)).map(r => r.name);
                        const eveMembers = responses.filter(r => isUserSlotChecked(r.slots, eveSlot, d)).map(r => r.name);
                        const anyMembers = responses.filter(r => isUserSlotChecked(r.slots, aftSlot, d) || isUserSlotChecked(r.slots, eveSlot, d)).map(r => r.name);
                        const holTag = d.isSpecialHoliday ? ` [㊗️${d.holidayName}]` : '';
                        text += `● ${d.dateLabel}${holTag} [${anyMembers.length}人] (午:${aftMembers.length}, 晚:${eveMembers.length})：${anyMembers.join(', ') || '無'}\n`;
                    } else {
                        const eveSlot = d.slots[0];
                        const members = responses.filter(r => isUserSlotChecked(r.slots, eveSlot, d)).map(r => r.name);
                        text += `● ${d.dateLabel} [${members.length}人]：${members.join(', ') || '無'}\n`;
                    }
                });

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(() => {
                        alert("✅ 已成功複製所選週次時段名單至剪貼簿！可直接貼至 LINE 或 Discord！");
                    }).catch(() => {
                        prompt("請手動複製下方名單：", text);
                    });
                } else {
                    prompt("請手動複製下方名單：", text);
                }
            };
        }

        // Setup Detail Modal
        const btnOpenDetail = document.getElementById('btn-open-survey-detail');
        if (btnOpenDetail) {
            btnOpenDetail.onclick = () => {
                const modal = document.getElementById('survey-detail-modal');
                if (modal) {
                    modal.style.display = 'flex';
                    // Sync modal week select
                    const modalWeekSelect = document.getElementById('survey-matrix-week-select');
                    if (modalWeekSelect && currentSurveyFormWeekId) {
                        modalWeekSelect.value = currentSurveyFormWeekId;
                        currentMatrixWeekId = currentSurveyFormWeekId;
                    }
                    renderSurveySummary();
                }
            };
        }

        const btnCloseDetailX = document.getElementById('btn-close-survey-detail-x');
        if (btnCloseDetailX) {
            btnCloseDetailX.onclick = () => {
                const modal = document.getElementById('survey-detail-modal');
                if (modal) modal.style.display = 'none';
            };
        }

        const btnCloseDetail = document.getElementById('btn-close-survey-detail');
        if (btnCloseDetail) {
            btnCloseDetail.onclick = () => {
                const modal = document.getElementById('survey-detail-modal');
                if (modal) modal.style.display = 'none';
            };
        }

        const surveyDetailModal = document.getElementById('survey-detail-modal');
        if (surveyDetailModal) {
            surveyDetailModal.addEventListener('click', (e) => {
                if (e.target === surveyDetailModal) {
                    surveyDetailModal.style.display = 'none';
                }
            });
        }
    }

    window.loadMySurveyForEdit = function(key) {
        const item = surveyResponses[key];
        if (!item) return;

        const nameInput = document.getElementById('survey-user-name');
        const notesInput = document.getElementById('survey-user-notes');
        const weekSelect = document.getElementById('survey-week-select');
        if (nameInput) nameInput.value = item.name || '';
        if (notesInput) notesInput.value = item.notes || '';

        // Switch to the week of this response
        if (item.weekId && weekSelect) {
            weekSelect.value = item.weekId;
            currentSurveyFormWeekId = item.weekId;
            if (typeof window.renderSurveyFormSlots === 'function') {
                window.renderSurveyFormSlots();
            }
        }

        const scrollRadios = document.querySelectorAll('input[name="survey-scroll"]');
        scrollRadios.forEach(r => {
            r.checked = (r.value === item.scroll);
        });

        const selectedSlots = item.slots || [];
        const days = getWeekDaysDetails(currentSurveyFormWeekId);
        const slotsContainer = document.getElementById('survey-slots-container');
        if (slotsContainer) {
            slotsContainer.querySelectorAll('.survey-slot-chip').forEach(chip => {
                const cb = chip.querySelector('input[type="checkbox"]');
                const keyVal = cb ? cb.value : '';
                let slotDef = null;
                let dayDef = null;
                for (const d of days) {
                    for (const s of d.slots) {
                        if (s.key === keyVal) {
                            slotDef = s;
                            dayDef = d;
                            break;
                        }
                    }
                    if (slotDef) break;
                }
                if (cb && slotDef) {
                    cb.checked = isUserSlotChecked(selectedSlots, slotDef, dayDef);
                    chip.classList.toggle('checked', cb.checked);
                }
            });
        }

        // Close detail modal so user can view and edit the main horizontal form
        const modal = document.getElementById('survey-detail-modal');
        if (modal) modal.style.display = 'none';

        const formCard = document.querySelector('.survey-horizontal-card') || document.querySelector('.survey-form-card');
        if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteSurveyResponse = function(key, name) {
        if (confirm(`確定要刪除【${name}】的問卷回覆嗎？`)) {
            db.ref(`surveys/${key}`).remove();
        }
    };

    function renderSurveySummary() {
        const totalBadge = document.getElementById('survey-total-respondents');
        const list = document.getElementById('survey-respondents-list');
        const modalWeekSelect = document.getElementById('survey-matrix-week-select');
        if (!list) return;

        const weekOptions = getSurveyWeekOptions();
        const defaultWeekId = weekOptions[0].weekId;

        // Initialize modal week dropdown if empty or mismatch
        if (modalWeekSelect) {
            if (modalWeekSelect.options.length !== weekOptions.length) {
                modalWeekSelect.innerHTML = weekOptions.map(opt => `
                    <option value="${opt.weekId}">${opt.label}</option>
                `).join('');
                if (currentMatrixWeekId) modalWeekSelect.value = currentMatrixWeekId;
            }
            if (!modalWeekSelect.onchange) {
                modalWeekSelect.onchange = () => {
                    currentMatrixWeekId = modalWeekSelect.value;
                    renderSurveySummary();
                };
            }
        }

        const activeWeekId = currentMatrixWeekId || modalWeekSelect?.value || currentSurveyFormWeekId || defaultWeekId;
        const weekDays = getWeekDaysDetails(activeWeekId);

        // Filter responses for this chosen week (or default if legacy without weekId)
        const responses = Object.entries(surveyResponses || {})
            .map(([k, v]) => ({ key: k, ...v }))
            .filter(r => {
                const rWeek = r.weekId || defaultWeekId;
                if (activeWeekId === defaultWeekId) {
                    return (rWeek === defaultWeekId || rWeek === "2026-09-29");
                }
                return rWeek === activeWeekId;
            });

        if (totalBadge) totalBadge.textContent = `已回覆 ${responses.length} 人`;
        const countPill = document.getElementById('survey-count-pill');
        if (countPill) countPill.textContent = `${responses.length}人填寫`;

        // Render Matrix Table (週二 ~ 週一 排班明細總表)
        list.innerHTML = '';
        if (responses.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 2.5rem 1rem; color: #64748b;">
                    <p style="font-size: 1.05rem; font-weight: 700; margin: 0 0 0.4rem 0;">📝 本週次尚無人填寫問卷</p>
                    <p style="font-size: 0.85rem; margin: 0;">請在首頁輸入名字並勾選可出團時段送出，或切換上方週次檢視！</p>
                </div>
            `;
            return;
        }

        const myName = getMySurveyName();
        const adminUser = isAdmin();

        // Sort so current user is on top, then others by submission time
        responses.sort((a, b) => {
            if (a.name === myName) return -1;
            if (b.name === myName) return 1;
            return (a.updatedAt || 0) - (b.updatedAt || 0);
        });

        // Generate Table Rows
        const rowsHtml = responses.map(r => {
            const isMe = (r.name === myName);
            const canManage = isMe || adminUser;
            const slots = r.slots || [];

            // "是"為黑字體，"否"為紅字體
            const isScrollYes = (r.scroll === '是');
            const rowClass = isScrollYes ? 'scroll-yes' : 'scroll-no';
            const rowColor = isScrollYes ? '#0f172a' : '#dc2626';

            const nameBadge = (extra = '') => `<span class="matrix-name-text" style="color: ${rowColor}; font-weight: 800;">${escapeHtml(r.name)}${extra}</span>`;

            // Day cells
            const dayCellsHtml = weekDays.map(d => {
                const isMultiSlot = d.isWeekend || d.isSpecialHoliday;
                let cellContent = '<span class="matrix-empty-cell">-</span>';

                if (isMultiSlot) {
                    const aftSlot = d.slots[0];
                    const eveSlot = d.slots[1];
                    const aftChecked = isUserSlotChecked(slots, aftSlot, d);
                    const eveChecked = isUserSlotChecked(slots, eveSlot, d);

                    let cornerBadge = '';
                    if (aftChecked && eveChecked) {
                        cornerBadge = '<span class="matrix-cell-corner-badge all" title="全天">全</span>';
                    } else if (aftChecked) {
                        cornerBadge = '<span class="matrix-cell-corner-badge afternoon" title="下午">午</span>';
                    } else if (eveChecked) {
                        cornerBadge = '<span class="matrix-cell-corner-badge evening" title="晚上">晚</span>';
                    }

                    if (aftChecked || eveChecked) {
                        cellContent = `<span class="matrix-name-text" style="color: ${rowColor}; font-weight: 800;">${escapeHtml(r.name)}</span>${cornerBadge}`;
                    }
                } else {
                    const eveSlot = d.slots[0];
                    const eveChecked = isUserSlotChecked(slots, eveSlot, d);
                    if (eveChecked) {
                        cellContent = `<span class="matrix-name-text" style="color: ${rowColor}; font-weight: 800;">${escapeHtml(r.name)}</span>`;
                    }
                }

                const isHolidayCol = d.isWeekend || d.isSpecialHoliday;
                return `<td class="col-day ${isHolidayCol ? 'col-weekend' : ''}" style="color: ${rowColor};">${cellContent}</td>`;
            }).join('');

            // Actions (操作)
            const actionsContent = canManage ? `
                <button type="button" class="matrix-action-btn" title="修改我的問卷" onclick="window.loadMySurveyForEdit('${r.key}')">✏️</button>
                <button type="button" class="matrix-action-btn" title="刪除此紀錄" style="color:#ef4444;" onclick="window.deleteSurveyResponse('${r.key}', '${escapeHtml(r.name)}')">✕</button>
            ` : '<span style="color:#cbd5e1;">-</span>';

            // Member Cell with Floating Tooltip (滑鼠指到成員名單時出現浮動小框框)
            const memberCellHtml = `
                <td class="col-member" style="color: ${rowColor};">
                    <div class="matrix-member-cell">
                        <span class="matrix-name-text" style="color: ${rowColor}; font-weight: 800;">
                            ${escapeHtml(r.name)}
                            ${isMe ? '<small style="background:#22c55e; color:#fff; font-size:0.68rem; font-weight:800; padding:0.05rem 0.35rem; border-radius:8px; margin-left:3px;">我</small>' : ''}
                        </span>
                        
                        <!-- Floating Tooltip Popover -->
                        <div class="matrix-floating-tooltip">
                            <div class="tooltip-title">
                                <span>👤 ${escapeHtml(r.name)}</span>
                                <span style="font-size:0.72rem; color:#94a3b8;">${formatDateSimple(r.updatedAt)}</span>
                            </div>
                            <div class="tooltip-field">
                                <strong>🎟️ 突襲券：</strong>
                                <span style="color:${isScrollYes ? '#4ade80' : '#f87171'}; font-weight:800;">${isScrollYes ? '願意吃券' : '不吃券'}</span>
                            </div>
                            <div class="tooltip-field">
                                <strong>📝 備註說明：</strong>
                                <div class="tooltip-notes-box">${escapeHtml(r.notes || '無特殊備註')}</div>
                            </div>
                        </div>
                    </div>
                </td>
            `;

            return `
                <tr class="survey-matrix-row ${isMe ? 'is-my-row' : ''} ${rowClass}" style="color: ${rowColor};">
                    ${memberCellHtml}
                    ${dayCellsHtml}
                    <td class="col-action">${actionsContent}</td>
                </tr>
            `;
        }).join('');

        // Header Date Columns
        const headerThs = weekDays.map(d => {
            const isHolidayCol = d.isWeekend || d.isSpecialHoliday;
            let holCornerBadge = '';
            if (d.isSpecialHoliday) {
                const badgeText = (d.holidayName && (d.holidayName.includes('補') || d.holidayName.includes('連假'))) ? '補' : (d.holidayName ? d.holidayName.slice(0, 2) : '補');
                holCornerBadge = `<span class="matrix-holiday-corner-badge" style="background: #ef4444 !important; color: #ffffff !important;" title="${escapeHtml(d.holidayName || '補假')}">${escapeHtml(badgeText)}</span>`;
            }
            return `<th class="col-day ${isHolidayCol ? 'col-weekend' : ''}" style="position: relative;"><span>${d.dateLabel}</span>${holCornerBadge}</th>`;
        }).join('');

        // Footer Daily Counts
        const footerTds = weekDays.map(d => {
            const isMultiSlot = d.isWeekend || d.isSpecialHoliday;
            const isHolidayCol = d.isWeekend || d.isSpecialHoliday;
            if (isMultiSlot) {
                const aftSlot = d.slots[0];
                const eveSlot = d.slots[1];
                const aftCount = responses.filter(r => isUserSlotChecked(r.slots, aftSlot, d)).length;
                const eveCount = responses.filter(r => isUserSlotChecked(r.slots, eveSlot, d)).length;
                const totalCount = responses.filter(r => isUserSlotChecked(r.slots, aftSlot, d) || isUserSlotChecked(r.slots, eveSlot, d)).length;
                return `
                    <td class="col-day ${isHolidayCol ? 'col-weekend' : ''}">
                        <div class="matrix-total-count">${totalCount}</div>
                        <span class="matrix-total-sub">午:${aftCount} 晚:${eveCount}</span>
                    </td>
                `;
            } else {
                const eveSlot = d.slots[0];
                const eveCount = responses.filter(r => isUserSlotChecked(r.slots, eveSlot, d)).length;
                return `
                    <td class="col-day ${isHolidayCol ? 'col-weekend' : ''}">
                        <div class="matrix-total-count">${eveCount}</div>
                    </td>
                `;
            }
        }).join('');

        list.innerHTML = `
            <table class="survey-matrix-table">
                <colgroup>
                    <col class="colgroup-member" style="width: 105px;">
                    <col class="colgroup-day" style="width: calc((100% - 183px) / 7);">
                    <col class="colgroup-day" style="width: calc((100% - 183px) / 7);">
                    <col class="colgroup-day" style="width: calc((100% - 183px) / 7);">
                    <col class="colgroup-day" style="width: calc((100% - 183px) / 7);">
                    <col class="colgroup-day" style="width: calc((100% - 183px) / 7);">
                    <col class="colgroup-day" style="width: calc((100% - 183px) / 7);">
                    <col class="colgroup-day" style="width: calc((100% - 183px) / 7);">
                    <col class="colgroup-action" style="width: 78px;">
                </colgroup>
                <thead>
                    <tr class="matrix-header-dates">
                        <th class="col-member">成員名單</th>
                        ${headerThs}
                        <th class="matrix-fixed-header">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td class="col-member">
                            <div class="matrix-total-label">總填寫</div>
                            <div class="matrix-total-count" style="color:#2563eb;">${responses.length}人</div>
                        </td>
                        ${footerTds}
                        <td class="matrix-footer-summary">
                            合計 ${responses.length} 人
                        </td>
                    </tr>
                </tfoot>
            </table>
        `;
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

        const bossSelect = document.getElementById('raid-boss');
        const gamesSelect = document.getElementById('raid-games');
        const raidDateInput = document.getElementById('raid-date');
        const timeSelect = document.getElementById('raid-time-select');

        // Setup Flatpickr for raid date
        if (raidDateInput && typeof flatpickr !== 'undefined') {
            raidDatePicker = flatpickr(raidDateInput, {
                dateFormat: "Y/m/d",
                minDate: "today",
                locale: "zh_tw",
                defaultDate: new Date(),
                onChange: function(selectedDates) {
                    if (selectedDates.length > 0) {
                        createRaidState.dateObj = selectedDates[0];
                        updateCreateTimeDropdown(selectedDates[0]);
                    }
                }
            });
        }

        // --- Helper: Update Time Dropdown based on Weekday/Weekend ---
        function updateCreateTimeDropdown(dateObj) {
            if (!timeSelect) return;
            timeSelect.innerHTML = '';

            const day = dateObj ? dateObj.getDay() : new Date().getDay();
            const isWeekend = (day === 0 || day === 6);
            let timeOptions = [];

            if (isWeekend) {
                for (let h = 10; h <= 22; h++) {
                    const hh = h.toString().padStart(2, '0');
                    timeOptions.push(`${hh}:00`);
                    if (h < 22) timeOptions.push(`${hh}:30`);
                }
            } else {
                timeOptions = ['20:00', '20:30', '21:00', '21:30', '22:00'];
            }

            timeOptions.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                if (t === createRaidState.timeStr) opt.selected = true;
                timeSelect.appendChild(opt);
            });

            if (!timeOptions.includes(createRaidState.timeStr)) {
                createRaidState.timeStr = timeOptions[0] || '20:00';
            }
        }

        if (timeSelect) {
            timeSelect.addEventListener('change', () => {
                createRaidState.timeStr = timeSelect.value;
            });
        }
        updateCreateTimeDropdown(createRaidState.dateObj || new Date());

        // Boss Dropdown Change Event
        if (bossSelect) {
            bossSelect.addEventListener('change', () => {
                createRaidState.boss = bossSelect.value;
                const maxSlots = isDragonKingBoss(createRaidState.boss) ? 12 : 6;
                if (createRaidState.slots.length !== maxSlots) {
                    const newSlots = [];
                    for (let i = 0; i < maxSlots; i++) {
                        newSlots.push(createRaidState.slots[i] || { slotIndex: i, name: '', job: '', level: '' });
                    }
                    createRaidState.slots = newSlots;
                    if (createRaidState.activeSlotIndex >= maxSlots) {
                        createRaidState.activeSlotIndex = 0;
                    }
                }
                renderCreateSlotsList();
                renderCreateRosterKeys();
            });
        }

        // Games Dropdown Change Event
        if (gamesSelect) {
            gamesSelect.addEventListener('change', () => {
                createRaidState.games = parseInt(gamesSelect.value, 10) || 7;
            });
        }

        // --- Render Slots in Left Column ---
        function renderCreateSlotsList() {
            const container = document.getElementById('create-team-slots-container');
            if (!container) return;
            container.innerHTML = '';

            const isDragonKing = isDragonKingBoss(createRaidState.boss);
            const maxSlots = isDragonKing ? 12 : 6;

            while (createRaidState.slots.length < maxSlots) {
                createRaidState.slots.push({ slotIndex: createRaidState.slots.length, name: '', job: '', level: '' });
            }
            if (createRaidState.slots.length > maxSlots) {
                createRaidState.slots = createRaidState.slots.slice(0, maxSlots);
            }

            const buildSlotItem = (s, idx) => {
                const isFilled = !!(s && s.name);
                const isActive = (createRaidState.activeSlotIndex === idx);
                const slotNum = isDragonKing ? (idx < 6 ? idx + 1 : idx - 5) : idx + 1;

                const item = document.createElement('div');
                item.className = `create-slot-box ${isFilled ? 'filled' : 'empty'} ${isActive ? 'active' : ''}`;
                
                if (isFilled) {
                    const jobColor = getHighContrastJobColor(s.job);
                    item.innerHTML = `
                        <div class="slot-box-top">
                            <span class="slot-box-num">#${slotNum}</span>
                            <button type="button" class="slot-box-del" onclick="event.stopPropagation(); window.removeCreateSlotMember(${idx});" title="移除此成員">✕</button>
                        </div>
                        <div class="slot-box-id">${escapeHtml(s.name)}</div>
                        <div class="slot-box-bottom">
                            <span style="color:${jobColor}; font-weight:700;">${escapeHtml(s.job)}</span>
                            <span style="color:#64748b; font-weight:600;">Lv.${s.level}</span>
                        </div>
                    `;
                } else {
                    item.innerHTML = `
                        <div class="slot-box-empty-title">席位 ${slotNum}</div>
                    `;
                }

                item.onclick = () => {
                    createRaidState.activeSlotIndex = idx;
                    renderCreateSlotsList();
                    renderCreateRosterKeys();
                };

                return item;
            };

            if (isDragonKing) {
                const team1Box = document.createElement('div');
                team1Box.innerHTML = `<div style="font-size:0.8rem; font-weight:800; color:#7e22ce; margin-bottom:0.25rem;">第一隊 (6人)</div>`;
                const grid1 = document.createElement('div');
                grid1.className = 'create-slots-grid-3x2';
                for (let i = 0; i < 6; i++) {
                    grid1.appendChild(buildSlotItem(createRaidState.slots[i], i));
                }
                team1Box.appendChild(grid1);
                container.appendChild(team1Box);

                const team2Box = document.createElement('div');
                team2Box.style.marginTop = '0.5rem';
                team2Box.innerHTML = `<div style="font-size:0.8rem; font-weight:800; color:#7e22ce; margin-bottom:0.25rem;">第二隊 (6人)</div>`;
                const grid2 = document.createElement('div');
                grid2.className = 'create-slots-grid-3x2';
                for (let i = 6; i < 12; i++) {
                    grid2.appendChild(buildSlotItem(createRaidState.slots[i], i));
                }
                team2Box.appendChild(grid2);
                container.appendChild(team2Box);
            } else {
                const grid = document.createElement('div');
                grid.className = 'create-slots-grid-3x2';
                for (let i = 0; i < maxSlots; i++) {
                    grid.appendChild(buildSlotItem(createRaidState.slots[i], i));
                }
                container.appendChild(grid);
            }

            const filledCount = createRaidState.slots.filter(s => s && s.name).length;
            const countBadge = document.getElementById('create-slots-count-badge');
            if (countBadge) countBadge.textContent = `已排 ${filledCount} / ${maxSlots} 人`;

            const sumCount = document.getElementById('create-summary-count');
            if (sumCount) sumCount.textContent = `${filledCount} / ${maxSlots}`;

            const activeHint = document.getElementById('roster-active-slot-hint');
            if (activeHint) {
                const curNum = isDragonKing ? (createRaidState.activeSlotIndex < 6 ? createRaidState.activeSlotIndex + 1 : createRaidState.activeSlotIndex - 5) : createRaidState.activeSlotIndex + 1;
                const curTeam = isDragonKing ? (createRaidState.activeSlotIndex < 6 ? '第一隊 ' : '第二隊 ') : '';
                activeHint.textContent = `正在指定：${curTeam}席位 ${curNum}`;
            }
        }

        // --- Render Character Cards in Right Column (一排四位顯示 & ID 黑色) ---
        function renderCreateRosterKeys() {
            const container = document.getElementById('create-roster-keys-container');
            if (!container) return;
            container.innerHTML = '';

            const kw = (createRaidState.searchKeyword || '').trim().toLowerCase();
            const filterCat = createRaidState.filterCat;

            const categories = ['力職', '敏職', '法職'];
            const catTitles = {
                '力職': '💪 力職',
                '敏職': '🎯 敏職',
                '法職': '✨ 法職 (火毒 / 冰雷 / 主教)'
            };
            const catColors = {
                '力職': '#c2410c',
                '敏職': '#15803d',
                '法職': '#7e22ce'
            };

            let totalMatches = 0;

            categories.forEach(cat => {
                if (filterCat !== 'all' && filterCat !== cat) return;

                const chars = CHARACTER_ROSTER.filter(c => {
                    if (c.category !== cat) return false;
                    if (!kw) return true;
                    return c.id.toLowerCase().includes(kw) || 
                           c.job.toLowerCase().includes(kw) ||
                           c.category.toLowerCase().includes(kw);
                });

                if (chars.length > 0) {
                    totalMatches += chars.length;
                    
                    const secHeader = document.createElement('div');
                    secHeader.className = 'roster-section-header';
                    secHeader.style.color = catColors[cat];
                    secHeader.style.borderBottom = '1.5px solid #e2e8f0';
                    secHeader.innerHTML = `
                        <span>${catTitles[cat]}</span>
                        <span style="font-size:0.75rem; opacity:0.7;">${chars.length} 位</span>
                    `;
                    container.appendChild(secHeader);

                    const grid = document.createElement('div');
                    grid.className = 'roster-four-col-grid'; // 一排四位顯示

                    chars.forEach(c => {
                        const assignedSlot = createRaidState.slots.find(s => s && s.name === c.id && s.job === c.job);
                        const isAssigned = !!assignedSlot;
                        const jobColor = getHighContrastJobColor(c.job);

                        const card = document.createElement('div');
                        card.className = `roster-card-item ${isAssigned ? 'selected' : ''}`;
                        
                        if (isAssigned) {
                            card.innerHTML = `
                                <div class="roster-card-id" style="color: #000000 !important;">${escapeHtml(c.id)}</div>
                                <div class="roster-card-sub">
                                    <span style="color:${jobColor}; font-weight:700;">${escapeHtml(c.job)}</span>
                                    <span style="color:#15803d; font-weight:700; font-size:0.78rem;">Lv.${c.level}</span>
                                </div>
                            `;
                            card.title = `點擊可退選`;
                        } else {
                            card.innerHTML = `
                                <div class="roster-card-id" style="color: #000000 !important;">${escapeHtml(c.id)}</div>
                                <div class="roster-card-sub">
                                    <span style="color:${jobColor}; font-weight:700;">${escapeHtml(c.job)}</span>
                                    <span style="color:#64748b; font-weight:600; font-size:0.78rem;">Lv.${c.level}</span>
                                </div>
                            `;
                            card.title = `點擊指定入座`;
                        }

                        card.onclick = () => {
                            window.assignCharacterToCreateSlot(c.id, c.job, c.level);
                        };

                        grid.appendChild(card);
                    });

                    container.appendChild(grid);
                }
            });

            // Dynamically update filter category counts
            const allBtn = document.querySelector('#create-roster-cat-group [data-cat="all"]');
            const forceBtn = document.querySelector('#create-roster-cat-group [data-cat="力職"]');
            const dexBtn = document.querySelector('#create-roster-cat-group [data-cat="敏職"]');
            const intBtn = document.querySelector('#create-roster-cat-group [data-cat="法職"]');
            if (allBtn) allBtn.textContent = `全部 (${CHARACTER_ROSTER.length})`;
            if (forceBtn) forceBtn.textContent = `💪 力職 (${CHARACTER_ROSTER.filter(c => c.category === '力職').length})`;
            if (dexBtn) dexBtn.textContent = `🎯 敏職 (${CHARACTER_ROSTER.filter(c => c.category === '敏職').length})`;
            if (intBtn) intBtn.textContent = `✨ 法職 (${CHARACTER_ROSTER.filter(c => c.category === '法職').length})`;

            if (totalMatches === 0) {
                const empty = document.createElement('div');
                empty.style.textAlign = 'center';
                empty.style.padding = '2.5rem 1rem';
                empty.style.color = '#94a3b8';
                empty.innerHTML = `
                    <p style="margin:0 0 0.5rem 0; font-size:1.05rem;">🔍 找不到相符的角色「${escapeHtml(kw)}」</p>
                    <p style="margin:0; font-size:0.85rem; color:#64748b;">如為新角色或分身，請點擊下方「手動輸入角色卡」</p>
                `;
                container.appendChild(empty);
            }
        }

        // --- Assign or Toggle Character into Active Slot ---
        window.assignCharacterToCreateSlot = function(charId, charJob, charLevel) {
            const existingIdx = createRaidState.slots.findIndex(s => s && s.name === charId && s.job === charJob);
            if (existingIdx !== -1) {
                // Clicking assigned character unassigns it!
                createRaidState.slots[existingIdx] = { slotIndex: existingIdx, name: '', job: '', level: '' };
                createRaidState.activeSlotIndex = existingIdx;
                renderCreateSlotsList();
                renderCreateRosterKeys();
                return;
            }

            const maxSlots = isDragonKingBoss(createRaidState.boss) ? 12 : 6;
            let targetIdx = createRaidState.activeSlotIndex;
            if (targetIdx < 0 || targetIdx >= maxSlots) targetIdx = 0;

            createRaidState.slots[targetIdx] = {
                slotIndex: targetIdx,
                name: charId,
                job: charJob,
                level: charLevel,
                isCreator: (targetIdx === 0)
            };

            // Advance active slot to the next empty slot
            const nextEmpty = createRaidState.slots.findIndex((s, idx) => idx > targetIdx && (!s || !s.name));
            if (nextEmpty !== -1) {
                createRaidState.activeSlotIndex = nextEmpty;
            } else {
                const anyEmpty = createRaidState.slots.findIndex(s => !s || !s.name);
                if (anyEmpty !== -1) {
                    createRaidState.activeSlotIndex = anyEmpty;
                }
            }

            renderCreateSlotsList();
            renderCreateRosterKeys();
        };

        window.removeCreateSlotMember = function(slotIdx) {
            if (createRaidState.slots[slotIdx]) {
                createRaidState.slots[slotIdx] = { slotIndex: slotIdx, name: '', job: '', level: '' };
                createRaidState.activeSlotIndex = slotIdx;
                renderCreateSlotsList();
                renderCreateRosterKeys();
            }
        };

        // --- Wire Category Tabs in Right Column ---
        const catGroup = document.getElementById('create-roster-cat-group');
        if (catGroup) {
            catGroup.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-select-chip');
                if (!btn) return;
                catGroup.querySelectorAll('.btn-select-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                createRaidState.filterCat = btn.dataset.cat || 'all';
                renderCreateRosterKeys();
            });
        }

        // --- Wire Roster Search Input ---
        const createSearch = document.getElementById('create-roster-search');
        if (createSearch) {
            createSearch.addEventListener('input', (e) => {
                createRaidState.searchKeyword = e.target.value;
                renderCreateRosterKeys();
            });
        }

        // --- Wire Custom Character Add Box (手動輸入角色卡並更新至右邊角色卡清單) ---
        const toggleCustomCharBtn = document.getElementById('btn-toggle-create-custom-char');
        const customCharBox = document.getElementById('create-custom-char-box');
        if (toggleCustomCharBtn && customCharBox) {
            toggleCustomCharBtn.onclick = () => {
                const isHidden = (customCharBox.style.display === 'none' || !customCharBox.style.display);
                customCharBox.style.display = isHidden ? 'block' : 'none';
            };
        }
        const btnAddCustomChar = document.getElementById('btn-add-custom-char-to-slot');
        if (btnAddCustomChar) {
            btnAddCustomChar.onclick = () => {
                const cName = document.getElementById('create-custom-name').value.trim();
                const cJob = document.getElementById('create-custom-job').value;
                const cLevel = parseInt(document.getElementById('create-custom-level').value, 10);

                if (!cName || isNaN(cLevel)) {
                    alert("請輸入角色ID與等級！");
                    return;
                }

                // 判斷分類 (力職/敏職/法職)
                const cat = getCategoryByJob(cJob);
                const charObj = {
                    id: cName,
                    job: cJob,
                    level: cLevel,
                    category: cat,
                    isCustom: true
                };

                // 更新至 CHARACTER_ROSTER 與 localStorage 持久化儲存
                const existingIdx = CHARACTER_ROSTER.findIndex(c => c.id.toLowerCase() === cName.toLowerCase() && c.job === cJob);
                if (existingIdx !== -1) {
                    CHARACTER_ROSTER[existingIdx].level = cLevel;
                    CHARACTER_ROSTER[existingIdx].category = cat;
                } else {
                    CHARACTER_ROSTER.push(charObj);
                }
                saveCustomCharacter(charObj);

                // 自動將該角色加入目前選取的出團席位中
                window.assignCharacterToCreateSlot(cName, cJob, cLevel);

                // 清空表單並關閉折疊
                document.getElementById('create-custom-name').value = '';
                document.getElementById('create-custom-level').value = '';
                if (customCharBox) customCharBox.style.display = 'none';

                // 即時重新渲染席位與右側角色卡
                renderCreateSlotsList();
                renderCreateRosterKeys();
            };
        }

        // --- Open Create Raid Modal ---
        window.openCreateRaidModal = function(preferredBoss) {
            if (!canCreateTeam()) {
                if (typeof window.openGeneralLoginModal === 'function') {
                    window.openGeneralLoginModal(() => {
                        window.openCreateRaidModal(preferredBoss);
                    });
                } else {
                    alert('建立隊伍需先登入帳號！');
                }
                return;
            }

            const targetBoss = preferredBoss || "克雷塞爾";
            createRaidState.boss = targetBoss;
            createRaidState.games = 7;
            createRaidState.activeSlotIndex = 0;
            createRaidState.searchKeyword = "";
            createRaidState.filterCat = "all";

            // Sync Dropdowns on the left
            if (bossSelect) bossSelect.value = targetBoss;
            if (gamesSelect) gamesSelect.value = "7";

            const createSearchInput = document.getElementById('create-roster-search');
            if (createSearchInput) createSearchInput.value = '';

            const maxSlots = isDragonKingBoss(targetBoss) ? 12 : 6;
            createRaidState.slots = Array.from({ length: maxSlots }, (_, i) => ({ slotIndex: i, name: '', job: '', level: '' }));

            // Auto-fill slot 0 with organizer's saved character or logged-in user if available
            const saved = getSavedChar();
            const loggedName = getLoggedInUser() || (isAdmin() ? getAdminUser() : '');
            if (saved.name) {
                createRaidState.slots[0] = {
                    slotIndex: 0,
                    name: saved.name,
                    job: saved.job || '黑騎士',
                    level: saved.level || 120,
                    isCreator: true
                };
                createRaidState.activeSlotIndex = 1; // start picking for slot 2
            } else if (loggedName) {
                const foundRoster = CHARACTER_ROSTER.find(c => c.name.toLowerCase() === loggedName.toLowerCase());
                createRaidState.slots[0] = {
                    slotIndex: 0,
                    name: loggedName,
                    job: foundRoster ? foundRoster.job : '黑騎士',
                    level: foundRoster ? foundRoster.level : 120,
                    isCreator: true
                };
                createRaidState.activeSlotIndex = 1;
            }

            // Reset cat buttons
            if (catGroup) {
                catGroup.querySelectorAll('.btn-select-chip').forEach(b => {
                    b.classList.toggle('active', b.dataset.cat === 'all');
                });
            }

            // Reset Date & Time
            createRaidState.dateObj = new Date();
            if (raidDatePicker) raidDatePicker.setDate(new Date());
            updateCreateTimeDropdown(new Date());

            // Switch to Tab 2 (Recruit / Planner Lobby) if not currently active
            const tabBtn = document.querySelector('.tab-btn[data-target="tab-recruit"]');
            if (tabBtn && !tabBtn.classList.contains('active')) {
                tabBtn.click();
            }

            renderCreateSlotsList();
            renderCreateRosterKeys();
            checkAndDisplayDraftBanner();

            if (createModal) createModal.style.display = 'flex';
        };

        // --- Draft Save / Load / Discard Functionality (點選完可先按暫存) ---
        function saveRaidDraft() {
            try {
                const draft = {
                    boss: createRaidState.boss,
                    games: createRaidState.games,
                    dateStr: document.getElementById('raid-date') ? document.getElementById('raid-date').value : '',
                    timeStr: createRaidState.timeStr,
                    slots: createRaidState.slots,
                    activeSlotIndex: createRaidState.activeSlotIndex,
                    timestamp: Date.now()
                };
                localStorage.setItem('soulmine_raid_draft', JSON.stringify(draft));
                alert("💾 目前出團設定與名單已成功暫存！下次打開可直接載入繼續編輯。");
                checkAndDisplayDraftBanner();
            } catch (e) {
                console.error("暫存失敗", e);
                alert("暫存失敗：" + e.message);
            }
        }

        function loadRaidDraft() {
            try {
                const str = localStorage.getItem('soulmine_raid_draft');
                if (!str) return;
                const draft = JSON.parse(str);
                if (!draft) return;

                createRaidState.boss = draft.boss || "克雷塞爾";
                createRaidState.games = draft.games || 7;
                createRaidState.timeStr = draft.timeStr || "21:00";
                createRaidState.slots = draft.slots || [];
                createRaidState.activeSlotIndex = draft.activeSlotIndex !== undefined ? draft.activeSlotIndex : 0;

                if (bossSelect) bossSelect.value = createRaidState.boss;
                if (gamesSelect) gamesSelect.value = String(createRaidState.games);

                if (draft.dateStr) {
                    const parsedDate = new Date(draft.dateStr);
                    if (!isNaN(parsedDate.getTime())) {
                        createRaidState.dateObj = parsedDate;
                        if (raidDatePicker) raidDatePicker.setDate(parsedDate);
                        updateCreateTimeDropdown(parsedDate);
                    }
                }
                const timeSelect = document.getElementById('raid-time-select');
                if (timeSelect && draft.timeStr) {
                    timeSelect.value = draft.timeStr;
                }

                renderCreateSlotsList();
                renderCreateRosterKeys();

                const banner = document.getElementById('create-draft-banner');
                if (banner) banner.style.display = 'none';
            } catch (e) {
                console.error("載入草稿失敗", e);
            }
        }

        function discardRaidDraft() {
            localStorage.removeItem('soulmine_raid_draft');
            const banner = document.getElementById('create-draft-banner');
            if (banner) banner.style.display = 'none';
        }

        function checkAndDisplayDraftBanner() {
            const banner = document.getElementById('create-draft-banner');
            if (!banner) return;
            const str = localStorage.getItem('soulmine_raid_draft');
            if (str) {
                try {
                    const draft = JSON.parse(str);
                    const filled = (draft.slots || []).filter(s => s && s.name).length;
                    const textSpan = document.getElementById('draft-banner-text');
                    if (textSpan) {
                        textSpan.textContent = `💾 發現上次暫存的草稿（${draft.boss} / ${draft.dateStr || '今天'}，已排 ${filled} 人）`;
                    }
                    banner.style.display = 'flex';
                } catch (e) {
                    banner.style.display = 'none';
                }
            } else {
                banner.style.display = 'none';
            }
        }

        const btnSaveDraft = document.getElementById('btn-save-draft');
        if (btnSaveDraft) {
            btnSaveDraft.onclick = saveRaidDraft;
        }
        const btnLoadDraft = document.getElementById('btn-load-draft');
        if (btnLoadDraft) {
            btnLoadDraft.onclick = loadRaidDraft;
        }
        const btnDiscardDraft = document.getElementById('btn-discard-draft');
        if (btnDiscardDraft) {
            btnDiscardDraft.onclick = discardRaidDraft;
        }

        // --- Confirm Create Raid Submit ---
        const btnConfirmCreate = document.getElementById('btn-confirm-create-raid');
        if (btnConfirmCreate) {
            btnConfirmCreate.onclick = () => {
                if (!canCreateTeam()) {
                    alert("建立隊伍需先登入帳號！");
                    if (typeof window.openGeneralLoginModal === 'function') {
                        window.openGeneralLoginModal();
                    }
                    return;
                }
                try {
                    const validMembers = createRaidState.slots.filter(s => s && s.name);
                    if (validMembers.length === 0) {
                        alert("請至少安排一位出戰角色入座！");
                        return;
                    }

                    // Determine creator name from Slot 0 or first assigned member
                    const slot0 = createRaidState.slots[0];
                    const creatorName = (slot0 && slot0.name) ? slot0.name : (getSavedCreator() || '隊長');
                    setSavedCreator(creatorName);

                    // Save Slot 0 character as saved char if present
                    if (slot0 && slot0.name) {
                        setSavedChar(slot0.name, slot0.job, slot0.level);
                    }

                    const dObj = createRaidState.dateObj || new Date();
                    const y = dObj.getFullYear();
                    const m = (dObj.getMonth() + 1).toString().padStart(2, '0');
                    const d = dObj.getDate().toString().padStart(2, '0');
                    const dateStr = `${y}/${m}/${d}`;

                    const timeParts = createRaidState.timeStr.split(':');
                    const schedDate = new Date(y, dObj.getMonth(), dObj.getDate(), parseInt(timeParts[0], 10), parseInt(timeParts[1], 10));
                    const weekDays = ['日','一','二','三','四','五','六'];
                    const weekDay = weekDays[schedDate.getDay()];
                    const fullTimeText = `${m}/${d} (${weekDay}) ${createRaidState.timeStr}`;

                    const finalMembers = validMembers.map(m => ({
                        slotIndex: m.slotIndex,
                        name: m.name,
                        job: m.job,
                        level: m.level,
                        clientId: m.slotIndex === 0 ? myClientId : 'assigned',
                        isCreator: (m.slotIndex === 0)
                    }));

                    const newRaidRef = db.ref('raids').push();
                    newRaidRef.set({
                        id: newRaidRef.key,
                        boss: createRaidState.boss,
                        gamesCount: createRaidState.games,
                        maxPlayers: isDragonKingBoss(createRaidState.boss) ? 12 : 6,
                        date: dateStr,
                        timeStr: createRaidState.timeStr,
                        time: fullTimeText,
                        scheduledTimestamp: !isNaN(schedDate.getTime()) ? schedDate.getTime() : Date.now(),
                        creator: creatorName,
                        creatorClientId: myClientId,
                        isConfirmed: false,
                        members: finalMembers,
                        createdAt: Date.now()
                    });

                    // Clear draft on successful submit
                    discardRaidDraft();

                    if (createModal) createModal.style.display = 'none';
                    currentSelectedBoss = createRaidState.boss;
                    renderRecruitBoard();

                    alert(`🎉【${createRaidState.boss}】出團隊伍已成功建立！`);
                    const recruitCard = document.getElementById('recruit-container');
                    if (recruitCard) recruitCard.scrollIntoView({ behavior: 'smooth' });
                } catch (err) {
                    console.error("建立出團錯誤:", err);
                    alert("建立出團失敗：" + err.message);
                }
            };
        }

        const btnCloseCreateX = document.getElementById('btn-close-create-x');
        if (btnCloseCreateX && createModal) {
            btnCloseCreateX.onclick = () => { createModal.style.display = 'none'; };
        }
        const btnCancelCreate = document.getElementById('btn-cancel-create');
        if (btnCancelCreate && createModal) {
            btnCancelCreate.onclick = () => { createModal.style.display = 'none'; };
        }
        if (createModal) {
            createModal.addEventListener('click', (e) => {
                if (e.target === createModal) {
                    createModal.style.display = 'none';
                }
            });
        }

        // Initialize embedded planner panel so it's live on Tab 2 immediately
        const maxSlotsInit = isDragonKingBoss(createRaidState.boss) ? 12 : 6;
        if (createRaidState.slots.length === 0) {
            createRaidState.slots = Array.from({ length: maxSlotsInit }, (_, i) => ({ slotIndex: i, name: '', job: '', level: '' }));
            const savedInit = getSavedChar();
            if (savedInit.name) {
                createRaidState.slots[0] = {
                    slotIndex: 0,
                    name: savedInit.name,
                    job: savedInit.job || '黑騎士',
                    level: savedInit.level || 120,
                    isCreator: true
                };
                createRaidState.activeSlotIndex = 1;
            }
        }
        renderCreateSlotsList();
        renderCreateRosterKeys();
        checkAndDisplayDraftBanner();

        window.renderCreateSlotsList = renderCreateSlotsList;
        window.renderCreateRosterKeys = renderCreateRosterKeys;

        const btnCancelJoin = document.getElementById('btn-cancel-join');
        if (btnCancelJoin) {
            btnCancelJoin.onclick = () => { joinModal.style.display = 'none'; };
        }
        const btnCloseJoinX = document.getElementById('btn-close-join-x');
        if (btnCloseJoinX) {
            btnCloseJoinX.onclick = () => { joinModal.style.display = 'none'; };
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

                    const maxSlots = (raid.boss && isDragonKingBoss(raid.boss)) ? 12 : (raid.maxPlayers || 6);
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

    window.renderRosterCards = function(raidId, slotIndex, filterKeyword) {
        const container = document.getElementById('roster-cards-container');
        if (!container) return;

        const raid = raidsDB[raidId];
        const members = (raid && raid.members) || [];
        const kw = (filterKeyword || '').trim().toLowerCase();

        // Strict job ordering: 力職 ➔ 敏職 ➔ 法職
        const categories = ['力職', '敏職', '法職'];
        const catTitles = {
            '力職': '💪 力職 (黑騎 / 聖騎 / 英雄)',
            '敏職': '🎯 敏職 (神射 / 箭神 / 神偷 / 夜使 / 槍神 / 拳霸)',
            '法職': '✨ 法職 (火毒 / 冰雷 / 主教)'
        };
        const catColors = {
            '力職': '#c2410c',
            '敏職': '#15803d',
            '法職': '#7e22ce'
        };

        let totalMatches = 0;
        let html = '';

        categories.forEach(cat => {
            const chars = CHARACTER_ROSTER.filter(c => {
                if (c.category !== cat) return false;
                if (!kw) return true;
                return c.id.toLowerCase().includes(kw) || 
                       c.job.toLowerCase().includes(kw) ||
                       c.category.toLowerCase().includes(kw);
            });

            if (chars.length > 0) {
                totalMatches += chars.length;
                html += `
                    <div class="roster-section-header" style="color: ${catColors[cat]}; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 0.35rem; margin-top: 0.8rem; margin-bottom: 0.5rem;">
                        <span>${catTitles[cat]}</span>
                        <span style="font-size: 0.78rem; opacity: 0.85; font-weight: 700;">${chars.length} 位</span>
                    </div>
                    <div class="roster-grid">
                `;

                chars.forEach(c => {
                    const isJoined = members.some(m => m.name === c.id && m.job === c.job);
                    const jobColor = getHighContrastJobColor(c.job);

                    if (isJoined) {
                        html += `
                            <div class="roster-card disabled" title="此角色已在此隊伍中">
                                <div class="roster-card-name" style="color: #64748b !important; font-weight: 800;">${escapeHtml(c.id)}</div>
                                <div class="roster-card-meta">
                                    <span class="roster-card-job" style="color: ${jobColor}; font-weight: 700;">${escapeHtml(c.job)}</span>
                                    <span style="color: #ef4444; font-size: 0.75rem; font-weight: 800;">已入座</span>
                                </div>
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="roster-card" onclick="window.selectRosterCharacter('${raidId}', ${slotIndex}, '${encodeURIComponent(c.id)}', '${encodeURIComponent(c.job)}', ${c.level})" title="點擊選擇 ${escapeHtml(c.id)} 入座">
                                <div class="roster-card-name" style="color: #000000 !important; font-weight: 800;">${escapeHtml(c.id)}</div>
                                <div class="roster-card-meta">
                                    <span class="roster-card-job" style="color: ${jobColor}; font-weight: 700;">${escapeHtml(c.job)}</span>
                                    <span class="roster-card-level" style="color: #475569 !important; font-weight: 700;">Lv.${c.level}</span>
                                </div>
                            </div>
                        `;
                    }
                });

                html += `</div>`;
            }
        });

        if (totalMatches === 0) {
            html = `
                <div style="text-align: center; padding: 2.5rem 1rem; color: #475569;">
                    <p style="margin: 0 0 0.5rem 0; font-size: 1.05rem; font-weight: 700; color: #0f172a;">🔍 找不到相符的角色「${escapeHtml(kw)}」</p>
                    <p style="margin: 0; font-size: 0.85rem; color: #64748b;">如為新角色或分身，請點擊下方「手動輸入角色卡」</p>
                </div>
            `;
        }

        container.innerHTML = html;
    };

    window.selectRosterCharacter = function(raidId, slotIndex, encodedCharName, encodedCharJob, charLevel) {
        const charName = decodeURIComponent(encodedCharName);
        const charJob = decodeURIComponent(encodedCharJob);

        const raid = raidsDB[raidId];
        if (!raid) return;

        let members = raid.members || [];
        // Check if character already in raid
        if (members.some(m => m.name === charName && m.job === charJob)) {
            alert(`角色「${charName} (${charJob})」已經在此隊伍中了！`);
            return;
        }
        // Check if slot taken
        if (members.some(m => (m.slotIndex !== undefined ? m.slotIndex : -1) === slotIndex)) {
            alert("此位置已被其他隊友搶先報名！請選擇其他空位。");
            return;
        }

        const maxSlots = (raid.boss && isDragonKingBoss(raid.boss)) ? 12 : (raid.maxPlayers || 6);
        if (members.length >= maxSlots) {
            alert("隊伍已滿額！");
            document.getElementById('join-raid-modal').style.display = 'none';
            return;
        }

        members.push({
            slotIndex: slotIndex,
            name: charName,
            job: charJob,
            level: charLevel,
            clientId: myClientId
        });

        setSavedChar(charName, charJob, charLevel);
        db.ref(`raids/${raidId}/members`).set(members);
        document.getElementById('join-raid-modal').style.display = 'none';
    };

    window.openJoinModal = function(raidId, slotIndex) {
        currentJoinRaidId = raidId;
        currentJoinSlotIdx = (slotIndex !== undefined) ? slotIndex : 0;

        document.getElementById('join-raid-id').value = raidId;
        document.getElementById('join-slot-index').value = currentJoinSlotIdx;

        const raid = raidsDB[raidId];
        const isDragonKing = raid && raid.boss && isDragonKingBoss(raid.boss);
        const teamName = isDragonKing ? (currentJoinSlotIdx < 6 ? '第一隊 ' : '第二隊 ') : '';
        const slotNum = isDragonKing ? (currentJoinSlotIdx < 6 ? currentJoinSlotIdx + 1 : currentJoinSlotIdx - 5) : currentJoinSlotIdx + 1;
        const descEl = document.getElementById('join-slot-desc');
        if (descEl) {
            descEl.textContent = `報名位置：${teamName}第 ${slotNum} 位。點擊角色卡即可直接入座！`;
        }

        // Reset search input
        const searchInput = document.getElementById('roster-search-input');
        if (searchInput) searchInput.value = '';

        // Hide custom input form
        const customForm = document.getElementById('join-raid-form');
        if (customForm) customForm.style.display = 'none';

        // Prefill custom form with saved char
        const saved = getSavedChar();
        const nameInput = document.getElementById('join-char-name');
        const jobSelect = document.getElementById('join-char-job');
        const levelInput = document.getElementById('join-char-level');
        if (nameInput) nameInput.value = saved.name || '';
        if (jobSelect && saved.job) jobSelect.value = saved.job;
        if (levelInput) levelInput.value = saved.level || '';

        // Render roster cards
        window.renderRosterCards(raidId, currentJoinSlotIdx, '');

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

    // --- Tab 1: Recruitment Board (Boss Category & Teams View) ---
    window.selectBossCategory = function(bossName) {
        currentSelectedBoss = bossName;
        renderRecruitBoard();
        const mainCard = document.getElementById('tab-recruit');
        if (mainCard) {
            mainCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    window.openCreateModalForBoss = function(bossName) {
        window.openCreateRaidModal(bossName);
    };

    function renderRecruitBoard() {
        const headerArea = document.getElementById('recruit-header-area');
        const container = document.getElementById('recruit-container');
        if (!container) return;

        const now = Date.now();
        const rawRaids = Object.values(raidsDB).filter(r => !r.isConfirmed);

        // Auto-cleanup: remove raids that have passed the next Tuesday reset cycle
        const allRaids = [];
        rawRaids.forEach(r => {
            const raidTime = getTeamTimestamp(r);
            const tuesdayReset = getNextTuesdayReset(raidTime);
            if (tuesdayReset > 0 && now >= tuesdayReset) {
                // Next Tuesday cycle has arrived: auto prune from database
                if (r.id) {
                    db.ref(`raids/${r.id}`).remove();
                }
            } else {
                const isExpired = raidTime > 0 && now > raidTime;
                allRaids.push({
                    ...r,
                    scheduledTimeMs: raidTime,
                    isExpired: isExpired
                });
            }
        });

        const allActiveRaids = allRaids.filter(r => !r.isExpired);

        // --- View 1: Boss Category Overview (currentSelectedBoss === null) ---
        if (!currentSelectedBoss) {
            if (headerArea) {
                headerArea.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h2 style="margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.6rem;">
                                <span style="color: #ff9800; font-weight: 700;">📋 突襲王專區</span>
                                <span style="font-size: 0.88rem; color: #ff9800; font-weight: 600; background: rgba(255, 152, 0, 0.12); border: 1px solid rgba(255, 152, 0, 0.3); padding: 0.2rem 0.65rem; border-radius: 16px;">(共 ${allActiveRaids.length} 組待組隊伍)</span>
                            </h2>
                            <p class="subtitle" style="margin: 0.35rem 0 0 0; color: #64748b; font-size: 0.95rem;">請選擇想討伐的 Boss 查看待組隊伍，或點擊右側直接建立新出團！</p>
                        </div>
                        <button id="btn-open-create-modal" class="btn-primary" onclick="openCreateRaidModal()" style="font-size: 1.05rem; padding: 0.75rem 1.4rem; background: var(--success-color); border: none; border-radius: 8px; color: #111; font-weight: 700; cursor: pointer;">➕ 建立新出團</button>
                    </div>
                `;
            }

            container.innerHTML = '';
            container.className = 'boss-grid-overview';
            container.style.display = 'grid';

            BOSS_LIST.forEach(b => {
                const bossRaids = allRaids.filter(r => matchesBoss(r.boss, b.name));
                const activeBossRaids = bossRaids.filter(r => !r.isExpired).sort((x, y) => (x.scheduledTimeMs || x.createdAt) - (y.scheduledTimeMs || y.createdAt));
                const expiredBossRaids = bossRaids.filter(r => r.isExpired);
                const activeCount = activeBossRaids.length;

                const card = document.createElement('div');
                card.className = 'boss-category-card';
                card.onclick = () => window.selectBossCategory(b.name);

                let badgeHtml = '';
                if (activeCount > 0) {
                    badgeHtml = `<span class="boss-badge-count boss-badge-active">🟢 待組隊伍：${activeCount} 組</span>`;
                } else if (expiredBossRaids.length > 0) {
                    badgeHtml = `<span class="boss-badge-count boss-badge-zero" style="color: #94a3b8;">⚪ 暫無待組 (流團 ${expiredBossRaids.length} 組)</span>`;
                } else {
                    badgeHtml = `<span class="boss-badge-count boss-badge-zero">⚪ 暫無待組隊伍</span>`;
                }

                let upcomingHtml = '';
                if (activeCount > 0 && activeBossRaids[0].time) {
                    upcomingHtml = `
                        <div style="margin-top: 0.8rem; background: rgba(0, 0, 0, 0.3); padding: 0.5rem 0.8rem; border-radius: 8px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.06);">
                            <span style="color: var(--text-muted);">最近出團：</span>
                            <strong style="color: #fff;">${activeBossRaids[0].time}</strong>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem;">
                            <div style="display: flex; align-items: center; gap: 0.8rem;">
                                <span style="font-size: 2.2rem; line-height: 1;">${b.icon}</span>
                                <div>
                                    <h3 style="margin: 0; font-size: 1.35rem; color: #fff; font-weight: 700;">${b.name}</h3>
                                </div>
                            </div>
                        </div>
                        <div style="margin-bottom: 0.5rem;">
                            ${badgeHtml}
                        </div>
                        ${upcomingHtml}
                    </div>
                    <div style="margin-top: 1.2rem; display: flex; justify-content: flex-end; align-items: center; color: var(--primary-color); font-weight: 600; font-size: 0.9rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.7rem;">
                        進入查看隊伍 ➔
                    </div>
                `;
                container.appendChild(card);
            });
            return;
        }

        // --- View 2: Drill-Down View for Selected Boss ---
        const currentBossInfo = BOSS_LIST.find(b => matchesBoss(b.name, currentSelectedBoss)) || { name: currentSelectedBoss, icon: "⚔️" };
        const bossRaids = allRaids.filter(r => matchesBoss(r.boss, currentSelectedBoss));

        const activeRaids = bossRaids
            .filter(r => !r.isExpired)
            .sort((a, b) => (a.scheduledTimeMs || a.createdAt) - (b.scheduledTimeMs || b.createdAt));

        const expiredRaids = bossRaids
            .filter(r => r.isExpired)
            .sort((a, b) => (a.scheduledTimeMs || a.createdAt) - (b.scheduledTimeMs || b.createdAt));

        if (headerArea) {
            let countBadge = `${activeRaids.length} 組待組`;
            if (expiredRaids.length > 0) {
                countBadge += ` (另有 ${expiredRaids.length} 組流團)`;
            }
            headerArea.innerHTML = `
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                            <button onclick="selectBossCategory(null)" class="btn-back-boss" title="返回突襲王專區">
                                ⬅ 返回突襲王專區
                            </button>
                            <div style="display: flex; align-items: center; gap: 0.6rem;">
                                <span style="font-size: 1.8rem; line-height: 1;">${currentBossInfo.icon}</span>
                                <h2 style="margin: 0; font-size: 1.45rem; color: #ff9800; font-weight: 700;">
                                    【${currentBossInfo.name}】待組隊伍
                                </h2>
                                <span style="background: rgba(255, 152, 0, 0.12); color: #ff9800; border: 1px solid rgba(255, 152, 0, 0.3); padding: 0.2rem 0.65rem; border-radius: 16px; font-size: 0.85rem; font-weight: 600;">
                                    ${countBadge}
                                </span>
                            </div>
                        </div>
                        <button onclick="openCreateModalForBoss('${currentBossInfo.name}')" class="btn-primary" style="font-size: 1.05rem; padding: 0.75rem 1.4rem; background: var(--success-color); border: none; border-radius: 8px; color: #111; font-weight: 700; cursor: pointer;">
                            ➕ 建立【${currentBossInfo.name}】出團
                        </button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = '';
        container.className = '';
        container.style.display = 'grid';
        container.style.gap = '1.5rem';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';

        if (activeRaids.length === 0 && expiredRaids.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1.5rem; background: rgba(255,255,255,0.02); border-radius: 14px; border: 1px dashed rgba(255,255,255,0.15);">
                    <div style="font-size: 3.5rem; margin-bottom: 0.8rem;">${currentBossInfo.icon}</div>
                    <h3 style="color: #ff9800; margin-bottom: 0.4rem; font-size: 1.25rem; font-weight: 700;">目前尚無【${currentBossInfo.name}】的待組隊伍</h3>
                    <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 1.5rem;">想發起挑戰嗎？歡迎點擊下方按鈕立即建立新出團！</p>
                    <button onclick="openCreateModalForBoss('${currentBossInfo.name}')" class="btn-primary" style="font-size: 1rem; padding: 0.65rem 1.6rem; background: var(--success-color); border: none; border-radius: 8px; color: #111; font-weight: 700; cursor: pointer;">
                        ➕ 發起【${currentBossInfo.name}】出團
                    </button>
                </div>
            `;
            return;
        }

        if (activeRaids.length === 0 && expiredRaids.length > 0) {
            const emptyBanner = document.createElement('div');
            emptyBanner.style.gridColumn = '1 / -1';
            emptyBanner.style.textAlign = 'center';
            emptyBanner.style.padding = '2.5rem 1.5rem';
            emptyBanner.style.background = 'rgba(255,255,255,0.02)';
            emptyBanner.style.borderRadius = '14px';
            emptyBanner.style.border = '1px dashed rgba(255,255,255,0.15)';
            emptyBanner.style.marginBottom = '0.5rem';
            emptyBanner.innerHTML = `
                <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">${currentBossInfo.icon}</div>
                <h3 style="color: #ff9800; margin-bottom: 0.4rem; font-size: 1.25rem; font-weight: 700;">目前尚無【${currentBossInfo.name}】的有效待組隊伍</h3>
                <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 1.2rem;">下方僅有過期流團紀錄，歡迎立即建立新出團！</p>
                <button onclick="openCreateModalForBoss('${currentBossInfo.name}')" class="btn-primary" style="font-size: 1rem; padding: 0.65rem 1.6rem; background: var(--success-color); border: none; border-radius: 8px; color: #111; font-weight: 700; cursor: pointer;">
                    ➕ 發起【${currentBossInfo.name}】新出團
                </button>
            `;
            container.appendChild(emptyBanner);
        }

        const myCreatorName = getSavedCreator();

        const buildRaidCard = (raid, isExpired) => {
            const members = raid.members || [];
            const isDragonKing = isDragonKingBoss(raid.boss);
            const maxSlots = isDragonKing ? 12 : (raid.maxPlayers || 6);
            const isFull = members.length >= maxSlots;

            const renderSlot = (slotIdx) => {
                const m = members.find((item, index) => (item.slotIndex !== undefined ? item.slotIndex : index) === slotIdx);
                const slotNum = isDragonKing ? (slotIdx < 6 ? slotIdx + 1 : slotIdx - 5) : slotIdx + 1;
                if (m) {
                    if (isExpired) {
                        return `
                            <div style="background: rgba(255,255,255,0.03); padding: 0.65rem 0.8rem; border-radius: 8px; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.06);">
                                <div>
                                    <strong style="color: #94a3b8;">${m.job}</strong> 
                                    <span style="color: #cbd5e1; font-weight: 500; margin-left: 0.3rem;">${m.name}</span> 
                                    <span style="color: #64748b; font-size: 0.8rem;">(Lv.${m.level})</span>
                                    ${m.isCreator ? '<span style="color:#94a3b8; font-size:0.85rem; margin-left:0.3rem;" title="團長">👑</span>' : ''}
                                </div>
                                <button onclick="leaveRaid('${raid.id}', '${m.name}')" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:0.8rem; padding: 0.2rem 0.4rem;" title="移除此席位">退出</button>
                            </div>
                        `;
                    }
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
                    if (isExpired) {
                        return `
                            <div style="border: 1px dashed rgba(255,255,255,0.1); background: rgba(0, 0, 0, 0.2); padding: 0.65rem 0.8rem; border-radius: 8px; font-size: 0.85rem; color: #64748b; text-align: center;">未入座 (已流團)</div>
                        `;
                    }
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
                            <div style="color: ${isExpired ? '#94a3b8' : 'var(--primary-color)'}; font-weight: bold; margin-bottom: 0.5rem; font-size: 0.95rem; border-bottom: 1px solid ${isExpired ? 'rgba(255,255,255,0.1)' : 'rgba(255,117,24,0.3)'}; padding-bottom: 0.3rem;">第一隊</div>
                            <div style="display: flex; flex-direction: column; gap: 0.45rem;">${team1Html}</div>
                        </div>
                        <div>
                            <div style="color: ${isExpired ? '#94a3b8' : 'var(--primary-color)'}; font-weight: bold; margin-bottom: 0.5rem; font-size: 0.95rem; border-bottom: 1px solid ${isExpired ? 'rgba(255,255,255,0.1)' : 'rgba(255,117,24,0.3)'}; padding-bottom: 0.3rem;">第二隊</div>
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

            let actionsHtml = '';
            if (isExpired) {
                actionsHtml = `
                    <div style="display:flex; gap:0.5rem; margin-top: 0.8rem; align-items: center;">
                        <div style="flex:2; text-align: center; font-size: 0.85rem; color: #ef4444; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 0.65rem; font-weight: 600;">
                            ⏳ 時段已過．已流團
                        </div>
                        <button onclick="deleteRaid('${raid.id}')" class="btn-secondary" style="flex:1; border: 1px solid rgba(239,68,68,0.5); color: #ef4444; background: transparent; border-radius: 8px; padding: 0.65rem; font-size: 0.9rem; cursor: pointer;" title="提前手動刪除此流團紀錄">刪除</button>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div style="display:flex; gap:0.5rem; margin-top: 0.8rem;">
                        <button onclick="confirmRaid('${raid.id}')" class="btn-primary" style="flex:2; padding: 0.65rem; font-size: 0.95rem; font-weight: bold; background: var(--primary-color); border: none; border-radius: 8px; cursor: pointer; color: #fff;">✅ 確認出團</button>
                        <button onclick="deleteRaid('${raid.id}')" class="btn-secondary" style="flex:1; border: 1px solid var(--danger-color); color: var(--danger-color); background: transparent; border-radius: 8px; padding: 0.65rem; font-size: 0.95rem; cursor: pointer;">刪除</button>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'glass-card' + (isDragonKing ? ' dragon-recruit-card' : '');
            if (isExpired) {
                card.style.background = 'rgba(20, 15, 26, 0.65)';
                card.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                card.style.opacity = '0.72';
                card.style.filter = 'grayscale(35%)';
            } else {
                card.style.background = 'rgba(26, 15, 43, 0.75)';
            }

            const bossTitleName = normalizeBossName(raid.boss);
            const titleHtml = isExpired
                ? `<h3 style="margin:0; color:#94a3b8; font-size: 1.15rem;">[${bossTitleName}]${raid.gamesCount || 7}場 <span style="color: #ef4444; font-size: 0.85rem; font-weight: bold; background: rgba(239, 68, 68, 0.15); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3); margin-left: 0.3rem;">(流團)</span></h3>
                   <span style="font-weight:bold; font-size: 1.05rem; color: #64748b; text-decoration: line-through;" title="出團時間已過">${raid.time}</span>`
                : `<h3 style="margin:0; color:var(--primary-color); font-size: 1.2rem;">[${bossTitleName}]${raid.gamesCount || 7}場</h3>
                   <span style="font-weight:bold; font-size: 1.05rem; color: #fff;">${raid.time}</span>`;

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items: baseline; margin-bottom: 0.8rem; border-bottom: 1px solid ${isExpired ? 'rgba(255,255,255,0.08)' : 'var(--card-border)'}; padding-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
                    ${titleHtml}
                </div>
                <div style="margin-bottom: 0.8rem; color: ${isExpired ? '#64748b' : 'var(--text-muted)'}; font-size: 0.9rem; display: flex; justify-content: space-between;">
                    <span>發起人：<strong style="color: ${isExpired ? '#94a3b8' : '#fff'};">${raid.creator || '公會成員'}</strong></span>
                    <span>成員：<strong style="color: ${isExpired ? '#94a3b8' : (isFull ? 'var(--danger-color)' : 'var(--success-color)')}; font-size: 1rem;">${members.length}</strong> / ${maxSlots}</span>
                </div>
                ${slotsHtml}
                ${actionsHtml}
            `;
            return card;
        };

        // Render active upcoming raids first
        activeRaids.forEach(raid => {
            container.appendChild(buildRaidCard(raid, false));
        });

        // Render expired raids at the very bottom (最下欄)
        if (expiredRaids.length > 0) {
            const expiredDivider = document.createElement('div');
            expiredDivider.style.gridColumn = '1 / -1';
            expiredDivider.style.marginTop = '1.5rem';
            expiredDivider.style.paddingTop = '1rem';
            expiredDivider.style.borderTop = '1px dashed rgba(255, 255, 255, 0.15)';
            expiredDivider.style.display = 'flex';
            expiredDivider.style.alignItems = 'center';
            expiredDivider.style.justifyContent = 'space-between';
            expiredDivider.style.flexWrap = 'wrap';
            expiredDivider.style.gap = '0.5rem';
            expiredDivider.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-weight: 600;">
                    <span style="font-size: 1.1rem;">⚠️</span>
                    <span>逾期未出團 (流團紀錄)</span>
                    <span style="font-size: 0.82rem; color: #64748b; font-weight: normal;">— 招募時段已過，將於下個週二 00:00 週期重置時自動移除</span>
                </div>
            `;
            container.appendChild(expiredDivider);

            expiredRaids.forEach(raid => {
                container.appendChild(buildRaidCard(raid, true));
            });
        }
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
                const bossName = normalizeBossName(team.boss || '克雷塞爾');
                const isDragonKing = isDragonKingBoss(bossName);

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
    function getAdminUser() {
        const u = localStorage.getItem('soulmine_admin_user');
        if (!u) return null;
        const lower = u.toLowerCase();
        if (lower === 'lumi') return 'Lumi';
        if (lower === 'eric') return 'Eric';
        if (lower === 'ohni' || lower === '阿甘') return '阿甘';
        return null;
    }

    function isAdmin() {
        return !!getAdminUser();
    }

    function isLumi() {
        return (getAdminUser() || '').toLowerCase() === 'lumi';
    }

    function setAdmin(user) {
        if (user) {
            localStorage.setItem('soulmine_admin_user', user);
            localStorage.setItem('soulmine_is_admin', 'true');
        } else {
            localStorage.removeItem('soulmine_admin_user');
            localStorage.removeItem('soulmine_is_admin');
        }
    }

    function updateAdminUI() {
        const btn = document.getElementById('btn-admin-auth');
        const form = document.getElementById('changelog-form');
        const authorInput = document.getElementById('changelog-author');
        const currentAdmin = getAdminUser();

        // 1. Header Admin Auth button
        if (btn) {
            if (isAdmin()) {
                btn.innerHTML = `👑 管理員 ${currentAdmin} (點此登出)`;
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

        // 2. Toggle All Roster Management Trigger Buttons
        const rosterTriggers = document.querySelectorAll('.btn-roster-manage-trigger');
        rosterTriggers.forEach(b => {
            b.style.display = isAdmin() ? 'inline-flex' : 'none';
        });

        // 3. Changelog Form & Permissions: ONLY LUMI CAN EDIT
        if (form) {
            form.style.display = isLumi() ? 'flex' : 'none';
        }
        if (authorInput) {
            authorInput.value = isLumi() ? 'Lumi' : (currentAdmin || '管理員');
        }

        // 4. Survey Admin Actions (All Admins: Lumi, Eric, Ohni can manage)
        const surveyAdmin = document.getElementById('survey-admin-actions');
        if (surveyAdmin) {
            surveyAdmin.style.display = isAdmin() ? 'block' : 'none';
        }

        // 5. Header User Session Status button
        const userBtn = document.getElementById('btn-user-session-status');
        const loggedUser = getLoggedInUser();
        if (userBtn) {
            if (!isAdmin() && loggedUser) {
                userBtn.style.display = 'inline-flex';
                userBtn.textContent = `👤 ${loggedUser} (登出)`;
                userBtn.onclick = () => {
                    if (confirm(`確定要登出使用者 (${loggedUser}) 嗎？`)) {
                        setLoggedInUser(null);
                        alert('已退出登入。');
                        updateAdminUI();
                    }
                };
            } else {
                userBtn.style.display = 'none';
            }
        }
    }

    // --- General User Login Modal Logic (除了管理員以外的人登入以建立隊伍) ---
    let generalLoginSuccessCallback = null;

    function openGeneralLoginModal(onSuccess) {
        generalLoginSuccessCallback = (typeof onSuccess === 'function') ? onSuccess : null;
        const modal = document.getElementById('general-login-modal');
        const form = document.getElementById('general-login-form');
        const errBox = document.getElementById('general-login-error');
        const nameInput = document.getElementById('general-login-name');

        if (errBox) errBox.style.display = 'none';
        if (form) form.reset();
        if (modal) modal.style.display = 'flex';
        if (nameInput) setTimeout(() => nameInput.focus(), 60);
    }
    window.openGeneralLoginModal = openGeneralLoginModal;

    function closeGeneralLoginModal() {
        const modal = document.getElementById('general-login-modal');
        if (modal) modal.style.display = 'none';
        generalLoginSuccessCallback = null;
    }
    window.closeGeneralLoginModal = closeGeneralLoginModal;

    function setupGeneralLoginModal() {
        const modal = document.getElementById('general-login-modal');
        const closeX = document.getElementById('btn-close-general-login-x');
        const cancelBtn = document.getElementById('btn-cancel-general-login');
        const form = document.getElementById('general-login-form');
        const errBox = document.getElementById('general-login-error');

        if (closeX) closeX.onclick = closeGeneralLoginModal;
        if (cancelBtn) cancelBtn.onclick = closeGeneralLoginModal;
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeGeneralLoginModal();
            });
        }

        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const name = (document.getElementById('general-login-name')?.value || '').trim();
                const pass = document.getElementById('general-login-pass')?.value || '';

                if (!name) {
                    alert("請輸入您的名稱！");
                    return;
                }

                // If admin credentials entered in general login form, grant admin directly
                const lowerName = name.toLowerCase();
                const lowerPass = pass.toLowerCase();
                if ((lowerName === 'lumi' && lowerPass === 'lumi') ||
                    (lowerName === 'eric' && lowerPass === 'eric') ||
                    ((lowerName === 'ohni' || lowerName === '阿甘') && (lowerPass === 'ohni' || lowerPass === '阿甘'))) {
                    const adminName = (lowerName === 'eric') ? 'Eric' : ((lowerName === 'lumi') ? 'Lumi' : '阿甘');
                    setAdmin(adminName);
                    closeGeneralLoginModal();
                    alert(`🎉 歡迎管理員 ${adminName} 登入！`);
                    updateAdminUI();
                    renderChangelogs();
                    if (typeof window.renderRosterMgList === 'function') window.renderRosterMgList();
                    if (typeof window.renderCreateRosterKeys === 'function') window.renderCreateRosterKeys();
                    const cb = generalLoginSuccessCallback;
                    generalLoginSuccessCallback = null;
                    if (typeof cb === 'function') cb();
                    return;
                }

                // General Login Rule:
                // 輸入名稱與密碼。如果是首次使用，系統會直接以此建立新帳號。
                if (accountsDB[name]) {
                    if (accountsDB[name].password === pass) {
                        setLoggedInUser(name);
                        if (errBox) errBox.style.display = 'none';
                        closeGeneralLoginModal();
                        alert(`🎉 歡迎 ${name} 登入成功！已可開始建立出團隊伍。`);
                        updateAdminUI();

                        const cb = generalLoginSuccessCallback;
                        generalLoginSuccessCallback = null;
                        if (typeof cb === 'function') cb();
                    } else {
                        if (errBox) {
                            errBox.textContent = '❌ 密碼錯誤！請確認密碼是否正確。';
                            errBox.style.display = 'block';
                        }
                    }
                } else {
                    // Register new account directly
                    const newAcc = {
                        name: name,
                        password: pass,
                        createdAt: Date.now()
                    };
                    accountsDB[name] = newAcc;
                    if (typeof db !== 'undefined' && db && db.ref) {
                        db.ref(`accounts/${name}`).set(newAcc);
                    }
                    setLoggedInUser(name);
                    if (errBox) errBox.style.display = 'none';
                    closeGeneralLoginModal();
                    alert(`🎉 帳號【${name}】註冊成功並已登入！已可開始建立出團隊伍。`);
                    updateAdminUI();

                    const cb = generalLoginSuccessCallback;
                    generalLoginSuccessCallback = null;
                    if (typeof cb === 'function') cb();
                }
            };
        }
    }

    // --- Admin Authentication Setup (管理員密碼驗證規則維持原樣) ---
    function setupAdminAuth() {
        const btn = document.getElementById('btn-admin-auth');
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (isAdmin()) {
                const currentAdmin = getAdminUser();
                if (confirm(`確定要登出管理員身分 (${currentAdmin}) 嗎？`)) {
                    setAdmin(null);
                    alert('已退出管理員身分。');
                    updateAdminUI();
                    renderChangelogs();
                    if (typeof window.renderRosterMgList === 'function') window.renderRosterMgList();
                    if (typeof window.renderCreateRosterKeys === 'function') window.renderCreateRosterKeys();
                }
            } else {
                const pass = prompt('請輸入管理員密碼：');
                if (pass !== null) {
                    const clean = pass.trim().toLowerCase();
                    if (clean === 'lumi') {
                        setAdmin('Lumi');
                        alert('🎉 歡迎總管理員 Lumi 登入！已啟用全部管理權限（含更新日誌與角色卡資料庫管理）。');
                    } else if (clean === 'eric') {
                        setAdmin('Eric');
                        alert('🎉 歡迎管理員 Eric 登入！已啟用出團與角色卡資料庫管理權限。');
                    } else if (clean === 'ohni' || clean === '阿甘') {
                        setAdmin('阿甘');
                        alert('🎉 歡迎管理員 阿甘 登入！已啟用出團與角色卡資料庫管理權限。');
                    } else {
                        alert('密碼錯誤！請輸入正確的管理員密碼（Lumi、Eric 或 Ohni）。');
                        return;
                    }
                    updateAdminUI();
                    renderChangelogs();
                    if (typeof window.renderRosterMgList === 'function') window.renderRosterMgList();
                    if (typeof window.renderCreateRosterKeys === 'function') window.renderCreateRosterKeys();
                }
            }
        });
    }

    // --- Admin Character Roster Management Modal Logic ---
    let rosterMgFilterCat = 'all';
    let rosterMgSearchKw = '';

    function setupRosterManagement() {
        const triggers = document.querySelectorAll('.btn-roster-manage-trigger');
        triggers.forEach(btn => {
            btn.onclick = () => {
                if (!isAdmin()) {
                    alert('請先登入管理員帳號！');
                    return;
                }
                openRosterManageModal();
            };
        });

        const modal = document.getElementById('roster-manage-modal');
        const closeX = document.getElementById('btn-close-roster-mg-x');
        const closeBtn = document.getElementById('btn-close-roster-mg');
        if (closeX && modal) closeX.onclick = () => { modal.style.display = 'none'; };
        if (closeBtn && modal) closeBtn.onclick = () => { modal.style.display = 'none'; };
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        }

        const searchInput = document.getElementById('roster-mg-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                rosterMgSearchKw = e.target.value.trim().toLowerCase();
                renderRosterMgList();
            });
        }

        const catContainer = document.getElementById('roster-mg-cat-filters');
        if (catContainer) {
            catContainer.querySelectorAll('.btn-select-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    catContainer.querySelectorAll('.btn-select-chip').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = '#f1f5f9';
                        b.style.color = b.dataset.cat === '力職' ? '#c2410c' : (b.dataset.cat === '敏職' ? '#15803d' : (b.dataset.cat === '法職' ? '#7e22ce' : '#475569'));
                    });
                    btn.classList.add('active');
                    btn.style.background = '#ff7518';
                    btn.style.color = '#ffffff';
                    rosterMgFilterCat = btn.dataset.cat;
                    renderRosterMgList();
                });
            });
        }

        const submitBtn = document.getElementById('btn-roster-mg-submit');
        const cancelEditBtn = document.getElementById('btn-roster-mg-cancel-edit');
        if (cancelEditBtn) {
            cancelEditBtn.onclick = resetRosterMgForm;
        }

        if (submitBtn) {
            submitBtn.onclick = () => {
                if (!isAdmin()) {
                    alert('只有管理員才能修改角色卡資料！');
                    return;
                }

                const nameInput = document.getElementById('roster-mg-name');
                const jobSelect = document.getElementById('roster-mg-job');
                const levelInput = document.getElementById('roster-mg-level');
                const origIdInput = document.getElementById('roster-mg-editing-original-id');
                const origJobInput = document.getElementById('roster-mg-editing-original-job');

                const name = nameInput.value.trim();
                const job = jobSelect.value;
                const level = parseInt(levelInput.value, 10);
                const origId = origIdInput.value.trim();
                const origJob = origJobInput.value.trim();

                if (!name) {
                    alert('請輸入角色遊戲ID！');
                    nameInput.focus();
                    return;
                }
                if (isNaN(level) || level < 1 || level > 300) {
                    alert('請輸入有效的等級 (1~300)！');
                    levelInput.focus();
                    return;
                }

                const cat = getCategoryByJob(job);

                if (origId && origJob) {
                    const idx = CHARACTER_ROSTER.findIndex(c => c.id === origId && c.job === origJob);
                    if (idx !== -1) {
                        CHARACTER_ROSTER[idx] = { id: name, job, level, category: cat, isCustom: true };
                    } else {
                        CHARACTER_ROSTER.push({ id: name, job, level, category: cat, isCustom: true });
                    }
                    alert(`✅ 已成功更新角色【${name}】資料！`);
                } else {
                    const existingIdx = CHARACTER_ROSTER.findIndex(c => c.id.toLowerCase() === name.toLowerCase() && c.job === job);
                    if (existingIdx !== -1) {
                        CHARACTER_ROSTER[existingIdx].level = level;
                        CHARACTER_ROSTER[existingIdx].category = cat;
                        alert(`✅ 已更新現有角色【${name}】等級為 Lv.${level}！`);
                    } else {
                        CHARACTER_ROSTER.push({ id: name, job, level, category: cat, isCustom: true });
                        alert(`🎉 已成功新增角色【${name}】(${job} Lv.${level}) 至資料庫！`);
                    }
                }

                syncRosterToFirebase();
                resetRosterMgForm();
                renderRosterMgList();
                if (typeof window.renderCreateRosterKeys === 'function') window.renderCreateRosterKeys();
                if (typeof window.renderRosterCards === 'function') {
                    const rId = document.getElementById('join-raid-id');
                    const sIdx = document.getElementById('join-slot-index');
                    if (rId && rId.value) window.renderRosterCards(rId.value, parseInt(sIdx.value, 10) || 0);
                }
            };
        }
    }

    function resetRosterMgForm() {
        document.getElementById('roster-mg-name').value = '';
        document.getElementById('roster-mg-level').value = '';
        document.getElementById('roster-mg-editing-original-id').value = '';
        document.getElementById('roster-mg-editing-original-job').value = '';
        document.getElementById('roster-mg-form-title').textContent = '➕ 新增角色卡至資料庫';
        document.getElementById('btn-roster-mg-submit').textContent = '➕ 新增角色';
        document.getElementById('btn-roster-mg-cancel-edit').style.display = 'none';
    }

    function openRosterManageModal() {
        const modal = document.getElementById('roster-manage-modal');
        if (!modal) return;
        resetRosterMgForm();
        rosterMgSearchKw = '';
        const searchInput = document.getElementById('roster-mg-search');
        if (searchInput) searchInput.value = '';
        renderRosterMgList();
        modal.style.display = 'flex';
    }

    function renderRosterMgList() {
        const container = document.getElementById('roster-mg-list-container');
        const countText = document.getElementById('roster-mg-count-text');
        if (!container) return;

        const kw = rosterMgSearchKw;
        const cat = rosterMgFilterCat;

        const filtered = CHARACTER_ROSTER.filter(c => {
            if (cat !== 'all' && c.category !== cat) return false;
            if (!kw) return true;
            return c.id.toLowerCase().includes(kw) ||
                   c.job.toLowerCase().includes(kw) ||
                   (c.category && c.category.toLowerCase().includes(kw));
        });

        if (countText) {
            const forceCount = CHARACTER_ROSTER.filter(c => c.category === '力職').length;
            const dexCount = CHARACTER_ROSTER.filter(c => c.category === '敏職').length;
            const intCount = CHARACTER_ROSTER.filter(c => c.category === '法職').length;
            countText.innerHTML = `共 <strong>${CHARACTER_ROSTER.length}</strong> 位角色 (力職 ${forceCount}、敏職 ${dexCount}、法職 ${intCount}) | 目前篩選出 <strong>${filtered.length}</strong> 位`;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2.5rem 1rem; color: #64748b;">
                    <p style="font-weight: 700; font-size: 1rem; margin: 0 0 0.3rem 0;">🔍 找不到相符的角色</p>
                    <p style="font-size: 0.85rem; margin: 0;">可透過上方表單直接新增該角色卡！</p>
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(c => {
            const jobColor = getHighContrastJobColor(c.job);
            const catBadgeColor = c.category === '力職' ? 'background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;' :
                                  (c.category === '敏職' ? 'background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;' :
                                  'background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff;');

            html += `
                <div class="roster-mg-row">
                    <div class="roster-mg-col-left">
                        <span class="roster-mg-id">${escapeHtml(c.id)}</span>
                        <span class="roster-mg-job-badge" style="color: ${jobColor}; font-weight: 800;">${escapeHtml(c.job)}</span>
                        <span class="roster-mg-level-badge">Lv.${c.level}</span>
                        <span style="font-size: 0.72rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 700; ${catBadgeColor}">${c.category}</span>
                    </div>
                    <div class="roster-mg-actions">
                        <button type="button" class="roster-mg-btn-edit" onclick="window.startEditRosterCard('${encodeURIComponent(c.id)}', '${encodeURIComponent(c.job)}', ${c.level})">✏️ 編輯</button>
                        <button type="button" class="roster-mg-btn-del" onclick="window.confirmDeleteRosterCard('${encodeURIComponent(c.id)}', '${encodeURIComponent(c.job)}')">🗑️ 刪除</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }
    window.renderRosterMgList = renderRosterMgList;

    window.startEditRosterCard = function(encodedId, encodedJob, level) {
        const id = decodeURIComponent(encodedId);
        const job = decodeURIComponent(encodedJob);
        document.getElementById('roster-mg-name').value = id;
        document.getElementById('roster-mg-job').value = job;
        document.getElementById('roster-mg-level').value = level;
        document.getElementById('roster-mg-editing-original-id').value = id;
        document.getElementById('roster-mg-editing-original-job').value = job;

        document.getElementById('roster-mg-form-title').textContent = `✏️ 正在編輯：${id} (${job})`;
        document.getElementById('btn-roster-mg-submit').textContent = '💾 儲存修改';
        document.getElementById('btn-roster-mg-cancel-edit').style.display = 'inline';

        document.getElementById('roster-mg-name').focus();
    };

    window.confirmDeleteRosterCard = function(encodedId, encodedJob) {
        if (!isAdmin()) {
            alert('只有管理員才能刪除角色卡！');
            return;
        }
        const id = decodeURIComponent(encodedId);
        const job = decodeURIComponent(encodedJob);

        if (confirm(`確定要從資料庫徹底刪除角色【${id}】(${job}) 嗎？`)) {
            const idx = CHARACTER_ROSTER.findIndex(c => c.id === id && c.job === job);
            if (idx !== -1) {
                CHARACTER_ROSTER.splice(idx, 1);
                syncRosterToFirebase();
                renderRosterMgList();
                if (typeof window.renderCreateRosterKeys === 'function') window.renderCreateRosterKeys();
                if (typeof window.renderRosterCards === 'function') {
                    const rId = document.getElementById('join-raid-id');
                    const sIdx = document.getElementById('join-slot-index');
                    if (rId && rId.value) window.renderRosterCards(rId.value, parseInt(sIdx.value, 10) || 0);
                }
                alert(`🗑️ 角色【${id}】已成功刪除！`);
            }
        }
    };

    // --- Tab 3: Changelog (Only Lumi can post/delete) ---
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

            // Delete button ONLY for Lumi
            const deleteBtnHtml = isLumi() ? `
                <button onclick="deleteChangelog(${ts})" style="background:transparent; border:1px solid var(--danger-color); color:var(--danger-color); border-radius:6px; padding:0.25rem 0.6rem; font-size:0.8rem; cursor:pointer; font-weight:bold;">🗑️ 刪除日誌</button>
            ` : '';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
                    <h3 style="margin: 0; color: #0f172a !important; font-size: 1.25rem !important; font-weight: 700 !important;">${escapeHtml(log.title)}</h3>
                    <span style="color: #64748b !important; font-size: 0.9rem !important; font-weight: 600 !important;">${dateStr}</span>
                </div>
                <div style="color: #334155 !important; font-size: 1rem !important; line-height: 1.7 !important; white-space: pre-wrap !important; font-weight: 500 !important; margin-top: 0.5rem !important;">${escapeHtml(log.content)}</div>
                <div style="margin-top: 1rem !important; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 0.6rem;">
                    <span style="font-size: 0.85rem !important; color: #64748b !important; font-weight: 600 !important;">更新者: ${escapeHtml(log.author || '系統')}</span>
                    ${deleteBtnHtml}
                </div>
            `;
            container.appendChild(card);
        });
    }

    window.deleteChangelog = function(ts) {
        if (!isLumi()) {
            alert('只有總管理員 Lumi 才能刪除更新日誌！');
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
            if (!isLumi()) {
                alert('只有總管理員 Lumi 才能發佈更新日誌！');
                return;
            }
            const title = document.getElementById('changelog-title').value.trim();
            const author = (authorInput ? authorInput.value.trim() : '') || 'Lumi';
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

    // --- Run App Initialization safely after all definitions ---
    initApp();
});
