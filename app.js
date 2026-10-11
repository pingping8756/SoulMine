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

function isHardPapulatusBoss(bossName) {
    if (!bossName) return false;
    return bossName.includes('困難拉圖斯') || bossName === '困拉';
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
const CURRENT_ROSTER_VERSION = 4;
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

    // --- 敏職 (17位: 眼 ➔ 盜賊 ➔ 海盜) ---
    { id: "IE", job: "神射手", level: 175, category: "敏職" },
    { id: "小茵", job: "箭神", level: 174, category: "敏職" },
    { id: "毛毛蟲", job: "神射手", level: 168, category: "敏職" },
    { id: "小皮", job: "箭神", level: 160, category: "敏職" },
    { id: "阿甘", job: "箭神", level: 153, category: "敏職" },
    { id: "Lumi", job: "箭神", level: 138, category: "敏職" },
    { id: "阿仁", job: "神偷", level: 180, category: "敏職" },
    { id: "Bagel", job: "神偷", level: 163, category: "敏職" },
    { id: "derder", job: "神偷", level: 151, category: "敏職" },
    { id: "阿偉", job: "神偷", level: 149, category: "敏職" },
    { id: "阿甘", job: "夜使者", level: 174, category: "敏職" },
    { id: "Eric", job: "夜使者", level: 163, category: "敏職" },
    { id: "Bagel", job: "夜使者", level: 121, category: "敏職" },
    { id: "derder", job: "夜使者", level: 118, category: "敏職" },
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
    { id: "Bagel", job: "主教", level: 137, category: "法職" },
    { id: "Eric", job: "主教", level: 132, category: "法職" },
    { id: "毛毛蟲", job: "主教", level: 132, category: "法職" },
    { id: "小茵", job: "主教", level: 131, category: "法職" },
    { id: "阿仁", job: "主教", level: 131, category: "法職" }
];

// --- Member Character Alias / Binding Configuration (問卷填寫名稱 ➔ 綁定角色 ID) ---
const MEMBER_NAME_ALIASES = {
    'WonderW': ['WonderW', '汪德'],
    '汪德': ['WonderW', '汪德'],
    'Bagel': ['Bagel', 'Bagle', 'BagelPray'],
    'Bagle': ['Bagel', 'Bagle', 'BagelPray'],
    'BagelPray': ['Bagel', 'Bagle', 'BagelPray'],
    '毛毛娃': ['長吉毛毛娃', '毛毛娃'],
    '長吉毛毛娃': ['長吉毛毛娃', '毛毛娃'],
    'derder': ['derder', 'DerDer', 'DER', 'To偷哭ku', 'To偷哭kU', '偷哭'],
    'DerDer': ['derder', 'DerDer', 'DER', 'To偷哭ku', 'To偷哭kU', '偷哭'],
    'DER': ['derder', 'DerDer', 'DER', 'To偷哭ku', 'To偷哭kU', '偷哭'],
    'To偷哭ku': ['derder', 'DerDer', 'DER', 'To偷哭ku', 'To偷哭kU', '偷哭'],
    'To偷哭kU': ['derder', 'DerDer', 'DER', 'To偷哭ku', 'To偷哭kU', '偷哭'],
    '偷哭': ['derder', 'DerDer', 'DER', 'To偷哭ku', 'To偷哭kU', '偷哭']
};

function getMemberBoundRoster(surveyMemberName) {
    if (!surveyMemberName) return [];
    const rawName = surveyMemberName.trim();
    const rawLower = rawName.toLowerCase();

    // 建立所有相關別名的小寫集合（不分大小寫比對）
    const aliasSet = new Set([rawLower]);
    for (const [key, list] of Object.entries(MEMBER_NAME_ALIASES)) {
        const keyLower = key.toLowerCase();
        const listLower = list.map(a => a.toLowerCase());
        if (keyLower === rawLower || listLower.includes(rawLower)) {
            aliasSet.add(keyLower);
            listLower.forEach(a => aliasSet.add(a));
        }
    }

    // 若填寫名稱明確為「偷哭」或「der」，確保自動綁定 derder
    if (rawLower.includes('偷哭') || rawLower === 'der' || rawLower === 'derder') {
        aliasSet.add('derder');
    }

    const matched = CHARACTER_ROSTER.filter(c => {
        const cIdLower = (c.id || '').trim().toLowerCase();
        // 1. 完全比對別名集合（例如 c.id 為 derder 或 WonderW）
        if (aliasSet.has(cIdLower)) return true;
        // 2. 僅對含中文的別名進行多字元包含比對（例如問卷填寫「毛毛娃」，自動對應「長吉毛毛娃」）
        // 絕對不對純英文字串做 includes 比對，避免 "der" 誤判比對到 "wonderw"
        for (const alias of aliasSet) {
            const hasChinese = /[\u4e00-\u9fa5]/.test(alias);
            if (hasChinese && alias.length >= 2 && (cIdLower.includes(alias) || alias.includes(cIdLower))) {
                return true;
            }
        }
        return false;
    });

    return matched;
}

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
        note: "", // Raid note / tactics (如魅惑位、進場順序)
        slots: [], // Array of { slotIndex, name, job, level, roleTag, isCreator }
        activeSlotIndex: 0,
        filterCat: "all",
        searchKeyword: "",
        editingRaidId: null
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

    // 動態計算問卷調查起始週二：每週五早上 08:00 自動切換至下週調查，當週調查自問卷移除
    function getActiveSurveyTuesday(d = new Date()) {
        const date = new Date(d);
        const day = date.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
        let daysSinceFri;
        if (day === 5) {
            daysSinceFri = (date.getHours() >= 8) ? 0 : 7;
        } else {
            daysSinceFri = (day + 7 - 5) % 7;
        }
        const fri = new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceFri, 8, 0, 0, 0);
        return new Date(fri.getFullYear(), fri.getMonth(), fri.getDate() + 4, 0, 0, 0, 0);
    }

    function getActiveSurveyWeekId(d = new Date()) {
        return formatDateISO(getActiveSurveyTuesday(d));
    }

    const TARGET_DEFAULT_WEEK_ID = getActiveSurveyWeekId();

    // 問卷調查週次（每週五 08:00 自動輪替下週，往後推 4 週）
    function getSurveyWeekOptions() {
        const baseTue = getActiveSurveyTuesday();
        baseTue.setHours(0, 0, 0, 0);
        const options = [];

        for (let w = 0; w < 4; w++) {
            const tue = new Date(baseTue.getTime() + w * 7 * 86400000);
            const mon = new Date(tue.getTime() + 6 * 86400000);
            
            const tueM = tue.getMonth() + 1;
            const tueD = tue.getDate();
            const monM = mon.getMonth() + 1;
            const monD = mon.getDate();

            const weekId = formatDateISO(tue); // e.g. "2026-10-13"
            let tag = '';
            if (w === 0) tag = '【本期調查】';
            else if (w === 1) tag = '【下週調查】';
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

    // 報表週次選項：調查週次在前，本週出團（尚未超過時間者）移到下拉選項最下面，超過時間自動隱藏
    function getReportWeekOptions() {
        const activeTue = getActiveSurveyTuesday();
        activeTue.setHours(0, 0, 0, 0);
        const prevTue = new Date(activeTue.getTime() - 7 * 86400000);
        const prevMonEnd = new Date(prevTue.getFullYear(), prevTue.getMonth(), prevTue.getDate() + 6, 23, 59, 59, 999);
        const now = new Date();

        // 1. 先放調查中的週次（以本期調查為首）
        const options = [...getSurveyWeekOptions()];

        // 2. 本週出團：移至下拉選項最下面；超過時間（週一 23:59 後）則自動隱藏
        if (now <= prevMonEnd) {
            const prevMon = new Date(prevTue.getTime() + 6 * 86400000);
            const prevWeekId = formatDateISO(prevTue);
            options.push({
                weekId: prevWeekId,
                tueDate: prevTue,
                label: `📅 ${prevTue.getMonth() + 1}/${prevTue.getDate()}(二) ～ ${prevMon.getMonth() + 1}/${prevMon.getDate()}(一) 【本週進行中】`,
                shortLabel: `${prevTue.getMonth() + 1}/${prevTue.getDate()}(二) ~ ${prevMon.getMonth() + 1}/${prevMon.getDate()}(一)`,
                isOngoing: true,
                isDefault: false
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
        // 2. Exact date prefix match (e.g., "10/6(二) 晚" or "10/6(二)_晚")
        if (dayDef && dayDef.dateLabel) {
            const prefix = dayDef.dateLabel;
            if (slotDef.period === '午') {
                if (userSlots.some(s => s.startsWith(prefix) && (s.includes('午') || s.includes('下午')))) return true;
            } else if (slotDef.period === '晚') {
                if (userSlots.some(s => s.startsWith(prefix) && s.includes('晚'))) return true;
            }
        }
        // 3. Legacy fallback (e.g. "週二(晚)", "週六(下午)")
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

    function isResponseMatchWeek(r, targetWeekId) {
        if (!r) return false;
        const rWeek = r.weekId || "2026-10-06";
        return rWeek === targetWeekId;
    }

    let currentSurveyFormWeekId = TARGET_DEFAULT_WEEK_ID;
    let currentMatrixWeekId = null;
    let showExpiredSurveySlots = false;

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
        return isAdmin() || 
               !!getLoggedInUser() || 
               localStorage.getItem('soulmine_is_admin') === 'true' || 
               !!localStorage.getItem('soulmine_admin_user') || 
               !!sessionStorage.getItem('artale_admin_user') ||
               !!sessionStorage.getItem('artale_session') ||
               Boolean(typeof getAdminUser === 'function' && getAdminUser());
    }
    window.canCreateTeam = canCreateTeam;

    function getCurrentEffectiveUser() {
        return getLoggedInUser() || 
               (isAdmin() ? (getAdminUser() || '管理員') : '') || 
               localStorage.getItem('soulmine_admin_user') || 
               sessionStorage.getItem('artale_admin_user') || 
               localStorage.getItem('soulmine_logged_user') || 
               sessionStorage.getItem('artale_session') || 
               '';
    }
    window.getCurrentEffectiveUser = getCurrentEffectiveUser;
    window.getLoggedInUser = getLoggedInUser;
    window.isAdmin = isAdmin;

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

        // Auto-repair creator for Bagel's raids if accidentally overwritten to Lumi
        Object.values(raidsDB).forEach(r => {
            if (r && r.creator === 'Lumi') {
                const rMembers = Array.isArray(r.members) ? r.members : [];
                const hasBagel = rMembers.some(m => m && m.name && m.name.toLowerCase() === 'bagel');
                const isBagelNote = r.note && (r.note.includes('主教掛繩清球') || r.note.includes('121鏢') || r.note.includes('阿甘'));
                if (hasBagel || isBagelNote) {
                    r.creator = 'Bagel';
                    if (rMembers[0] && rMembers[0].name === 'Bagel') {
                        rMembers[0].isCreator = true;
                    }
                    rMembers.forEach(m => {
                        if (m && m.name && m.name.toLowerCase() === 'lumi') {
                            m.isCreator = false;
                        }
                    });
                    if (typeof db !== 'undefined' && db && db.ref && r.id) {
                        db.ref(`raids/${r.id}/creator`).set('Bagel');
                        db.ref(`raids/${r.id}/members`).set(rMembers);
                    }
                }
            }
        });

        // Auto-repair creator for Bagel's confirmed teams if accidentally overwritten to Lumi
        if (Array.isArray(confirmedTeams)) {
            let teamsRepaired = false;
            confirmedTeams.forEach(t => {
                if (t && t.creator === 'Lumi') {
                    const tMembers = Array.isArray(t.members) ? t.members : (t.members ? Object.values(t.members) : []);
                    const hasBagel = tMembers.some(m => m && m.name && m.name.toLowerCase() === 'bagel');
                    const isBagelNote = t.note && (t.note.includes('主教掛繩清球') || t.note.includes('121鏢') || t.note.includes('阿甘'));
                    if (hasBagel || isBagelNote) {
                        t.creator = 'Bagel';
                        if (tMembers[0] && tMembers[0].name === 'Bagel') {
                            tMembers[0].isCreator = true;
                        }
                        tMembers.forEach(m => {
                            if (m && m.name && m.name.toLowerCase() === 'lumi') {
                                m.isCreator = false;
                            }
                        });
                        teamsRepaired = true;
                    }
                }
            });
            if (teamsRepaired && typeof db !== 'undefined' && db && db.ref) {
                db.ref('teams').set(confirmedTeams);
            }
        }

        // Auto-unify DER / DerDer / To偷哭ku / To偷哭kU / 偷哭 -> derder
        const unifyToDerder = (name) => {
            if (!name) return name;
            const n = name.trim().toLowerCase();
            if (n === 'der' || n === 'derder' || n === 'to偷哭ku' || n === '偷哭' || n.includes('偷哭')) {
                return 'derder';
            }
            return name;
        };

        Object.values(raidsDB).forEach(r => {
            if (r && Array.isArray(r.members)) {
                let changed = false;
                r.members.forEach(m => {
                    if (m && m.name) {
                        const unified = unifyToDerder(m.name);
                        if (unified !== m.name) {
                            m.name = unified;
                            changed = true;
                        }
                    }
                });
                if (changed && typeof db !== 'undefined' && db && db.ref && r.id) {
                    db.ref(`raids/${r.id}/members`).set(r.members);
                }
            }
        });

        if (Array.isArray(confirmedTeams)) {
            let teamsChanged = false;
            confirmedTeams.forEach(t => {
                if (t && Array.isArray(t.members)) {
                    t.members.forEach(m => {
                        if (m && m.name) {
                            const unified = unifyToDerder(m.name);
                            if (unified !== m.name) {
                                m.name = unified;
                                teamsChanged = true;
                            }
                        }
                    });
                }
            });
            if (teamsChanged && typeof db !== 'undefined' && db && db.ref) {
                db.ref('teams').set(confirmedTeams);
            }
        }

        // Auto-unify survey responses DER / DerDer / To偷哭ku / To偷哭kU / 偷哭 -> derder
        if (surveyResponses && typeof surveyResponses === 'object') {
            Object.entries(surveyResponses).forEach(([sKey, sVal]) => {
                if (sVal && sVal.name) {
                    const unified = unifyToDerder(sVal.name);
                    if (unified !== sVal.name) {
                        sVal.name = unified;
                        if (typeof db !== 'undefined' && db && db.ref) {
                            db.ref(`surveys/${sKey}/name`).set(unified);
                        }
                    }
                }
            });
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
            setupSurveyPreDraftModal();
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
                    holidayHint.innerHTML = `㊗️ <strong>${escapeHtml(holNames)}</strong>`;
                } else {
                    holidayHint.innerHTML = '';
                }
            }

            // Build slot chips - 7 columns (Tuesday to Monday), stacked vertically for weekend/holiday
            let html = '';
            days.forEach(d => {
                const daySlotsHtml = d.slots.map(s => {
                    const isWk = s.isWeekend;
                    const isHol = s.isSpecialHoliday;
                    const holCornerText = (s.holidayName && (s.holidayName.includes('補') || s.holidayName.includes('連假'))) ? '補' : (s.holidayName ? s.holidayName.slice(0, 2) : '補');
                    const tagHtml = isHol ? `<span class="slot-holiday-corner-badge" style="background: #ef4444 !important; color: #ffffff !important;" title="${escapeHtml(s.holidayName || '補假')}">${escapeHtml(holCornerText)}</span>` : '';
                    return `
                        <label class="survey-slot-chip ${isWk ? 'weekend' : ''} ${isHol ? 'holiday' : ''}" data-slot-key="${s.key}">
                            ${tagHtml}
                            <input type="checkbox" name="survey-slot" value="${s.key}">
                            <span>${s.label}</span>
                        </label>
                    `;
                }).join('');

                html += `
                    <div class="survey-day-col ${d.isWeekend ? 'weekend' : ''} ${d.isSpecialHoliday ? 'holiday' : ''}">
                        ${daySlotsHtml}
                    </div>
                `;
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
            const existing = Object.values(surveyResponses || {}).find(r => 
                r && r.name === curName && isResponseMatchWeek(r, targetWeekId)
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
                    return isResponseMatchWeek(r, targetWeekId);
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
                        if (isResponseMatchWeek(r, targetWeekId)) {
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
                const allOpts = getReportWeekOptions();
                const weekOpt = allOpts.find(o => o.weekId === targetWeekId) || allOpts[0];
                const responses = Object.values(surveyResponses || {}).filter(r => isResponseMatchWeek(r, targetWeekId));

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

        // Setup Detail Modal (彈出視窗)
        const btnOpenDetail = document.getElementById('btn-open-survey-detail');
        if (btnOpenDetail) {
            btnOpenDetail.onclick = () => {
                const modal = document.getElementById('survey-detail-modal');
                if (modal) {
                    modal.style.display = 'flex';
                    const reportWeekOptions = getReportWeekOptions();
                    const ongoingOpt = reportWeekOptions.find(o => o.isOngoing);
                    const defaultOpt = reportWeekOptions[0];
                    if (!currentMatrixWeekId || !reportWeekOptions.some(o => o.weekId === currentMatrixWeekId)) {
                        currentMatrixWeekId = ongoingOpt ? ongoingOpt.weekId : defaultOpt.weekId;
                    }
                    const modalWeekSelect = document.getElementById('survey-matrix-week-select');
                    if (modalWeekSelect) {
                        modalWeekSelect.value = currentMatrixWeekId;
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

        const btnToggleExpired = document.getElementById('btn-toggle-expired-slots');
        if (btnToggleExpired) {
            btnToggleExpired.onclick = () => {
                showExpiredSurveySlots = !showExpiredSurveySlots;
                renderSurveySummary();
            };
        }

        // Setup Confirmed Teams Weekly Report Modal (當週已確認出團名單明細)
        const btnOpenConfirmedReport = document.getElementById('btn-open-confirmed-report');
        if (btnOpenConfirmedReport) {
            btnOpenConfirmedReport.onclick = () => {
                if (typeof window.openConfirmedReportModal === 'function') {
                    window.openConfirmedReportModal();
                }
            };
        }

        const btnCloseConfirmedReportX = document.getElementById('btn-close-confirmed-report-x');
        if (btnCloseConfirmedReportX) {
            btnCloseConfirmedReportX.onclick = () => {
                if (typeof window.closeConfirmedReportModal === 'function') {
                    window.closeConfirmedReportModal();
                }
            };
        }

        const btnCloseConfirmedReport = document.getElementById('btn-close-confirmed-report');
        if (btnCloseConfirmedReport) {
            btnCloseConfirmedReport.onclick = () => {
                if (typeof window.closeConfirmedReportModal === 'function') {
                    window.closeConfirmedReportModal();
                }
            };
        }

        const btnCopyConfirmedReport = document.getElementById('btn-copy-confirmed-report-text');
        if (btnCopyConfirmedReport) {
            btnCopyConfirmedReport.onclick = () => {
                if (typeof window.copyConfirmedReportText === 'function') {
                    window.copyConfirmedReportText();
                }
            };
        }

        const confirmedReportModal = document.getElementById('confirmed-report-modal');
        if (confirmedReportModal) {
            confirmedReportModal.addEventListener('click', (e) => {
                if (e.target === confirmedReportModal) {
                    if (typeof window.closeConfirmedReportModal === 'function') {
                        window.closeConfirmedReportModal();
                    }
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

    window.switchMatrixWeek = function(wId) {
        currentMatrixWeekId = wId;
        const modalWeekSelect = document.getElementById('survey-matrix-week-select');
        if (modalWeekSelect) modalWeekSelect.value = wId;
        renderSurveySummary();
    };

    function renderSurveySummary() {
        const totalBadge = document.getElementById('survey-total-respondents');
        const list = document.getElementById('survey-respondents-list');
        const modalWeekSelect = document.getElementById('survey-matrix-week-select');
        if (!list) return;

        const reportWeekOptions = getReportWeekOptions();
        const ongoingOpt = reportWeekOptions.find(o => o.isOngoing);
        const defaultWeekId = reportWeekOptions[0].weekId;

        if (!currentMatrixWeekId || !reportWeekOptions.some(o => o.weekId === currentMatrixWeekId)) {
            currentMatrixWeekId = ongoingOpt ? ongoingOpt.weekId : defaultWeekId;
        }

        // Initialize report week dropdown
        if (modalWeekSelect) {
            const currentOptsKey = reportWeekOptions.map(o => o.weekId).join(',');
            if (modalWeekSelect.dataset.renderedOptsKey !== currentOptsKey) {
                modalWeekSelect.innerHTML = reportWeekOptions.map(opt => `
                    <option value="${opt.weekId}">${opt.label}</option>
                `).join('');
                modalWeekSelect.dataset.renderedOptsKey = currentOptsKey;
            }
            modalWeekSelect.value = currentMatrixWeekId;
            modalWeekSelect.onchange = () => {
                currentMatrixWeekId = modalWeekSelect.value;
                renderSurveySummary();
            };
        }

        const activeWeekId = currentMatrixWeekId || defaultWeekId;
        const weekDays = getWeekDaysDetails(activeWeekId);

        // Filter responses strictly for this chosen week
        const responses = Object.entries(surveyResponses || {})
            .map(([k, v]) => ({ key: k, ...v }))
            .filter(r => isResponseMatchWeek(r, activeWeekId));

        if (totalBadge) totalBadge.textContent = `已回覆 ${responses.length} 人`;
        const countPill = document.getElementById('survey-count-pill');
        if (countPill) countPill.textContent = `${responses.length}人填寫`;

        // 計算各時段是否已過期 (標註已過期時段，但保持完整7天欄位顯示，不隱藏欄位)
        const nowTs = Date.now();
        let expiredDaysCount = 0;
        const dayStatus = weekDays.map(d => {
            const aftExpiry = new Date(d.dateObj.getFullYear(), d.dateObj.getMonth(), d.dateObj.getDate(), 17, 30, 0).getTime();
            const eveExpiry = new Date(d.dateObj.getFullYear(), d.dateObj.getMonth(), d.dateObj.getDate(), 23, 0, 0).getTime();
            const isAftExpired = nowTs > aftExpiry;
            const isEveExpired = nowTs > eveExpiry;
            const isDayExpired = isEveExpired;
            if (isDayExpired) expiredDaysCount++;
            return { isAftExpired, isEveExpired, isDayExpired };
        });

        const allDaysExpired = (expiredDaysCount === 7);
        const shouldHideExpired = false; // 永遠完整顯示週二至週一 7 天欄位，不隱藏欄位避免日期被遮蔽

        // 控制「顯示已過期時段」按鈕與提示（欄位固定完整顯示，此按鈕隱藏）
        const btnToggleExpired = document.getElementById('btn-toggle-expired-slots');
        const expiredHint = document.getElementById('survey-expired-hint');
        if (btnToggleExpired) btnToggleExpired.style.display = 'none';
        if (expiredHint) expiredHint.style.display = 'none';

        // Render Matrix Table (週二 ~ 週一 排班明細總表)
        try {
            list.innerHTML = '';
            if (responses.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 2.5rem 1rem; color: #64748b;">
                    <p style="font-size: 1.05rem; font-weight: 700; margin: 0 0 0.4rem 0;">📝 本週次尚無人填寫問卷</p>
                    <p style="font-size: 0.85rem; margin: 0;">請在上方輸入名字並勾選可出團時段送出，或切換上方週次檢視！</p>
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

            // Day cells
            const dayCellsHtml = weekDays.map((d, dIdx) => {
                const status = dayStatus[dIdx];
                const isMultiSlot = d.isWeekend || d.isSpecialHoliday;
                let cellContent = '<span class="matrix-empty-cell">-</span>';

                if (isMultiSlot) {
                    const aftSlot = d.slots[0];
                    const eveSlot = d.slots[1];
                    const aftChecked = isUserSlotChecked(slots, aftSlot, d);
                    const eveChecked = isUserSlotChecked(slots, eveSlot, d);

                    let cornerBadge = '';
                    if (aftChecked && eveChecked) {
                        const extraCls = (status.isAftExpired && !status.isEveExpired) ? '' : (status.isDayExpired ? 'passed' : '');
                        cornerBadge = `<span class="matrix-cell-corner-badge all ${extraCls}" title="全天">全</span>`;
                    } else if (aftChecked) {
                        const extraCls = status.isAftExpired ? 'passed' : '';
                        cornerBadge = `<span class="matrix-cell-corner-badge afternoon ${extraCls}" title="下午">午</span>`;
                    } else if (eveChecked) {
                        const extraCls = status.isEveExpired ? 'passed' : '';
                        cornerBadge = `<span class="matrix-cell-corner-badge evening ${extraCls}" title="晚上">晚</span>`;
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
                const colExpiredCls = status.isDayExpired 
                    ? (shouldHideExpired ? 'col-expired-hidden' : 'col-expired-dimmed') 
                    : '';
                return `<td class="col-day ${isHolidayCol ? 'col-weekend' : ''} ${colExpiredCls}" style="color: ${rowColor};">${cellContent}</td>`;
            }).join('');

            // Actions (操作)
            const actionsContent = canManage ? `
                <button type="button" class="matrix-action-btn" title="修改我的問卷" onclick="window.loadMySurveyForEdit('${r.key}')">✏️</button>
                <button type="button" class="matrix-action-btn" title="刪除此紀錄" style="color:#ef4444;" onclick="window.deleteSurveyResponse('${r.key}', '${escapeHtml(r.name)}')">✕</button>
            ` : '<span style="color:#cbd5e1;">-</span>';

            // Member Cell with Floating Tooltip
            const boundChars = getMemberBoundRoster(r.name);
            let boundCharsHtml = '';
            if (boundChars.length > 0) {
                boundCharsHtml = boundChars.map(c => `<span style="font-weight:700; color:#38bdf8;">${escapeHtml(c.id)} (${escapeHtml(c.job)} Lv.${c.level})</span>`).join('<br>');
            } else {
                boundCharsHtml = '<span style="color:#94a3b8;">未綁定（自訂）</span>';
            }

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
                                <strong>⚔️ 角色名冊：</strong>
                                <div style="font-size:0.78rem; line-height:1.4; margin-top:2px;">${boundCharsHtml}</div>
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

        // Header Date Columns (含時段預排按鈕，已過期時段不提供預排按鈕)
        const headerThs = weekDays.map((d, dIdx) => {
            const status = dayStatus[dIdx];
            const isHolidayCol = d.isWeekend || d.isSpecialHoliday;
            let holCornerBadge = '';
            if (d.isSpecialHoliday) {
                const badgeText = (d.holidayName && (d.holidayName.includes('補') || d.holidayName.includes('連假'))) ? '補' : (d.holidayName ? d.holidayName.slice(0, 2) : '補');
                holCornerBadge = `<span class="matrix-holiday-corner-badge" style="background: #ef4444 !important; color: #ffffff !important;" title="${escapeHtml(d.holidayName || '補假')}">${escapeHtml(badgeText)}</span>`;
            }

            const isMultiSlot = d.isWeekend || d.isSpecialHoliday;
            const hasAdmin = typeof isAdmin === 'function' && isAdmin();
            let predraftBtnHtml = '';
            if (hasAdmin) {
                if (isMultiSlot) {
                    const aftSlot = d.slots[0];
                    const eveSlot = d.slots[1];
                    const aftCount = responses.filter(r => isUserSlotChecked(r.slots, aftSlot, d)).length;
                    const eveCount = responses.filter(r => isUserSlotChecked(r.slots, eveSlot, d)).length;

                    let btns = [];
                    // 人數達 6 人或以上即顯示預排 (>= 6)，且如果該時段已過期則不顯示預排
                    if (aftCount >= 6 && !status.isAftExpired) {
                        btns.push(`<button type="button" class="matrix-predraft-badge" onclick="window.openSurveyPreDraftModal('${d.dateStr}', '${d.dateLabel}', '午', ${dIdx})" title="快速預排此時段 (午: ${aftCount}人)">午</button>`);
                    }
                    if (eveCount >= 6 && !status.isEveExpired) {
                        btns.push(`<button type="button" class="matrix-predraft-badge" onclick="window.openSurveyPreDraftModal('${d.dateStr}', '${d.dateLabel}', '晚', ${dIdx})" title="快速預排此時段 (晚: ${eveCount}人)">晚</button>`);
                    }
                    if (btns.length === 1) {
                        predraftBtnHtml = btns[0];
                    } else if (btns.length > 1) {
                        predraftBtnHtml = `<div class="matrix-predraft-corner-group">${btns.join('')}</div>`;
                    }
                } else {
                    const eveSlot = d.slots[0];
                    const eveCount = responses.filter(r => isUserSlotChecked(r.slots, eveSlot, d)).length;
                    if (eveCount >= 6 && !status.isEveExpired) {
                        predraftBtnHtml = `<button type="button" class="matrix-predraft-badge" onclick="window.openSurveyPreDraftModal('${d.dateStr}', '${d.dateLabel}', '晚', ${dIdx})" title="快速預排此時段 (${eveCount}人)">排</button>`;
                    }
                }
            }

            const colExpiredCls = status.isDayExpired 
                ? (shouldHideExpired ? 'col-expired-hidden' : 'col-expired-dimmed') 
                : '';

            return `<th class="col-day ${isHolidayCol ? 'col-weekend' : ''} ${colExpiredCls}" style="position: relative;">
                ${holCornerBadge}
                <span>${d.dateLabel}</span>
                ${predraftBtnHtml}
            </th>`;
        }).join('');

        // Footer Daily Counts
        const footerTds = weekDays.map((d, dIdx) => {
            const status = dayStatus[dIdx];
            const isMultiSlot = d.isWeekend || d.isSpecialHoliday;
            const isHolidayCol = d.isWeekend || d.isSpecialHoliday;
            const hasAdmin = typeof isAdmin === 'function' && isAdmin();
            const colExpiredCls = status.isDayExpired 
                ? (shouldHideExpired ? 'col-expired-hidden' : 'col-expired-dimmed') 
                : '';

            if (isMultiSlot) {
                const aftSlot = d.slots[0];
                const eveSlot = d.slots[1];
                const aftCount = responses.filter(r => isUserSlotChecked(r.slots, aftSlot, d)).length;
                const eveCount = responses.filter(r => isUserSlotChecked(r.slots, eveSlot, d)).length;
                const totalCount = responses.filter(r => isUserSlotChecked(r.slots, aftSlot, d) || isUserSlotChecked(r.slots, eveSlot, d)).length;

                return `
                    <td class="col-day ${isHolidayCol ? 'col-weekend' : ''} ${colExpiredCls}">
                        <div class="matrix-total-count">${totalCount}</div>
                        <span class="matrix-total-sub">午:${aftCount} 晚:${eveCount}</span>
                    </td>
                `;
            } else {
                const eveSlot = d.slots[0];
                const eveCount = responses.filter(r => isUserSlotChecked(r.slots, eveSlot, d)).length;

                return `
                    <td class="col-day ${isHolidayCol ? 'col-weekend' : ''} ${colExpiredCls}">
                        <div class="matrix-total-count">${eveCount}</div>
                    </td>
                `;
            }
        }).join('');

        // 動態計算可見日期欄位寬度
        const visibleDaysCount = weekDays.filter((_, i) => !(dayStatus[i].isDayExpired && shouldHideExpired)).length;
        const colDayWidth = `calc((100% - 183px) / ${visibleDaysCount > 0 ? visibleDaysCount : 1})`;
        const colgroupDaysHtml = weekDays.map((_, i) => {
            if (dayStatus[i].isDayExpired && shouldHideExpired) return '';
            return `<col class="colgroup-day" style="width: ${colDayWidth};">`;
        }).join('');

        const allExpiredBanner = allDaysExpired ? `
            <div style="text-align: center; padding: 0.45rem 1rem; background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 8px; color: #b91c1c; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.6rem;">
                ⏱️ 此週次出團時段已全部過期（僅供查閱歷史紀錄）
            </div>
        ` : '';

        list.innerHTML = `
            ${allExpiredBanner}
            <table class="survey-matrix-table">
                <colgroup>
                    <col class="colgroup-member" style="width: 105px;">
                    ${colgroupDaysHtml}
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
                            <div style="font-size:0.75rem; font-weight:800; color:#475569; white-space:nowrap;">總填寫 <strong style="color:#2563eb; font-size:0.86rem;">${responses.length}人</strong></div>
                        </td>
                        ${footerTds}
                        <td class="matrix-footer-summary">
                            合計 ${responses.length} 人
                        </td>
                    </tr>
                </tfoot>
            </table>
        `;
        } catch (err) {
            console.error("Error in renderSurveySummary:", err);
            list.innerHTML = `<div style="color:#ef4444; padding:1.5rem; text-align:center; font-weight:700;">⚠️ 載入報表明細時發生錯誤：${escapeHtml(err.message)}</div>`;
        }
    }

    // --- Survey Pre-Draft State & Logic (時段快速預排) ---
    const preDraftState = {
        editingRaidId: null,
        editingConfirmedTeamId: null,
        editingConfirmedTeamIndex: null,
        dateStr: '',
        dateLabel: '',
        period: '晚',
        dayIndex: 0,
        dateObj: null,
        targetTimeStr: '20:00',
        boss: '克雷塞爾',
        games: 7,
        catFilter: 'all',
        slots: Array.from({ length: 6 }, (_, i) => ({ slotIndex: i, name: '', job: '', level: '' })),
        availableRespondents: []
    };

    function parseTeamOrRaidDate(entity) {
        if (!entity) return { dateObj: new Date(), timeStr: '20:00' };

        let targetDateObj = null;
        let targetTimeStr = '';

        // 1. Check explicit timeStr
        if (entity.timeStr && typeof entity.timeStr === 'string') {
            const tm = entity.timeStr.match(/(\d{1,2}:\d{2})/);
            if (tm) targetTimeStr = tm[1];
        }

        // 2. Check time / timeText / timeslot for time
        if (!targetTimeStr && (entity.time || entity.timeText || entity.timeslot)) {
            const str = entity.time || entity.timeText || entity.timeslot || '';
            const tm = str.match(/(\d{1,2}:\d{2})/);
            if (tm) targetTimeStr = tm[1];
        }

        // A. Priority 1: Check entity.date (e.g. "2026-10-19", "2026/10/19", "10月19日", "10/19")
        if (entity.date && typeof entity.date === 'string') {
            const m = entity.date.match(/(?:(\d{4})[年/-])?(\d{1,2})[月/-](\d{1,2})/);
            if (m) {
                const yr = m[1] ? parseInt(m[1], 10) : new Date().getFullYear();
                const mo = parseInt(m[2], 10) - 1;
                const dy = parseInt(m[3], 10);
                const d = new Date(yr, mo, dy);
                if (!isNaN(d.getTime())) {
                    targetDateObj = d;
                }
            }
        }

        // B. Priority 2: Check entity.time / entity.timeText / entity.timeslot for date (e.g. "10/19 (一) 20:00")
        if (!targetDateObj && (entity.time || entity.timeText || entity.timeslot)) {
            const str = entity.time || entity.timeText || entity.timeslot || '';
            const m = str.match(/(?:(\d{4})[/.-])?(\d{1,2})[/.-](\d{1,2})/);
            if (m) {
                const yr = m[1] ? parseInt(m[1], 10) : new Date().getFullYear();
                const mo = parseInt(m[2], 10) - 1;
                const dy = parseInt(m[3], 10);
                const d = new Date(yr, mo, dy);
                if (!isNaN(d.getTime())) {
                    targetDateObj = d;
                }
            }
        }

        // C. Priority 3: scheduledTimestamp (if neither date nor time text contained date)
        if (!targetDateObj && entity.scheduledTimestamp && !isNaN(Number(entity.scheduledTimestamp))) {
            const d = new Date(Number(entity.scheduledTimestamp));
            if (!isNaN(d.getTime())) {
                targetDateObj = d;
                if (!targetTimeStr) {
                    targetTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                }
            }
        }

        // D. Priority 4: getTeamTimestamp(entity)
        if (!targetDateObj && typeof getTeamTimestamp === 'function') {
            const ts = getTeamTimestamp(entity);
            if (ts > 0) {
                const d = new Date(ts);
                if (!isNaN(d.getTime())) {
                    targetDateObj = d;
                    if (!targetTimeStr) {
                        targetTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    }
                }
            }
        }

        // E. Fallback
        if (!targetDateObj) {
            targetDateObj = new Date();
        }
        if (!targetTimeStr) {
            targetTimeStr = '20:00';
        }

        // Apply hour and minute to targetDateObj
        const [tHour, tMin] = targetTimeStr.split(':').map(Number);
        if (!isNaN(tHour)) {
            targetDateObj.setHours(tHour, tMin || 0, 0, 0);
        }

        return { dateObj: targetDateObj, timeStr: targetTimeStr };
    }

    function populatePreDraftDateSelect(selectedDateObj) {
        const dateSelect = document.getElementById('predraft-date-select');
        if (!dateSelect) return;
        dateSelect.innerHTML = '';

        const dObj = selectedDateObj || new Date();
        const yr = dObj.getFullYear();
        const mo = String(dObj.getMonth() + 1).padStart(2, '0');
        const dy = String(dObj.getDate()).padStart(2, '0');
        const targetIso = `${yr}-${mo}-${dy}`;

        const weekOptions = (typeof getReportWeekOptions === 'function') ? getReportWeekOptions() : getSurveyWeekOptions();
        const targetTue = getTuesdayOfWeek(dObj);
        const targetWeekId = `${targetTue.getFullYear()}-${String(targetTue.getMonth() + 1).padStart(2, '0')}-${String(targetTue.getDate()).padStart(2, '0')}`;

        let allWeeks = [...weekOptions];
        if (!allWeeks.some(w => w.weekId === targetWeekId)) {
            const mon = new Date(targetTue.getTime() + 6 * 86400000);
            allWeeks.unshift({
                weekId: targetWeekId,
                tueDate: targetTue,
                label: `📅 ${targetTue.getMonth() + 1}/${targetTue.getDate()}(二) ～ ${mon.getMonth() + 1}/${mon.getDate()}(一)`,
                shortLabel: `${targetTue.getMonth() + 1}/${targetTue.getDate()}(二) ~ ${mon.getMonth() + 1}/${mon.getDate()}(一)`
            });
        }

        allWeeks.forEach(w => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = w.label ? w.label.replace(/📅\s*/, '') : w.weekId;
            const days = getWeekDaysDetails(w.weekId);
            days.forEach(day => {
                const dIso = `${day.dateObj.getFullYear()}-${String(day.dateObj.getMonth() + 1).padStart(2, '0')}-${String(day.dateObj.getDate()).padStart(2, '0')}`;
                const opt = document.createElement('option');
                opt.value = dIso;
                let holSuffix = '';
                if (day.holidayName && day.holidayName.includes('補')) {
                    holSuffix = ' (補假)';
                } else if (day.isWeekend || day.isSpecialHoliday || day.holidayName) {
                    holSuffix = ' (假日)';
                }
                opt.textContent = `${day.dateLabel}${holSuffix}`;
                if (dIso === targetIso) opt.selected = true;
                optgroup.appendChild(opt);
            });
            dateSelect.appendChild(optgroup);
        });

        dateSelect.value = targetIso;

        dateSelect.onchange = () => {
            const [y, m, d] = dateSelect.value.split('-').map(Number);
            const newDate = new Date(y, m - 1, d);
            if (preDraftState.targetTimeStr) {
                const [th, tm] = preDraftState.targetTimeStr.split(':').map(Number);
                newDate.setHours(th || 20, tm || 0, 0, 0);
            }
            preDraftState.dateObj = newDate;
            preDraftState.dateStr = dateSelect.value;
            const dayNames = ['日','一','二','三','四','五','六'];
            const weekDay = dayNames[newDate.getDay()];
            preDraftState.dateLabel = `${m}/${d}(${weekDay})`;

            const tue = getTuesdayOfWeek(newDate);
            const curWeekId = `${tue.getFullYear()}-${String(tue.getMonth() + 1).padStart(2, '0')}-${String(tue.getDate()).padStart(2, '0')}`;
            const weekDays = getWeekDaysDetails(curWeekId);
            let dayDef = weekDays.find(wd => 
                wd.dateObj.getFullYear() === newDate.getFullYear() &&
                wd.dateObj.getMonth() === newDate.getMonth() &&
                wd.dateObj.getDate() === newDate.getDate()
            );
            if (!dayDef) {
                const dayMap = [5, 6, 0, 1, 2, 3, 4];
                dayDef = weekDays[dayMap[newDate.getDay()]] || weekDays[0];
            }

            let targetSlotDef = null;
            if (dayDef.isWeekend || dayDef.isSpecialHoliday) {
                targetSlotDef = (preDraftState.period === '午') ? dayDef.slots[0] : dayDef.slots[1];
            } else {
                targetSlotDef = dayDef.slots[0];
            }

            const responses = Object.values(surveyResponses || {}).filter(r => {
                if (!isResponseMatchWeek(r, curWeekId)) return false;
                return isUserSlotChecked(r.slots, targetSlotDef, dayDef);
            });
            preDraftState.availableRespondents = responses;

            const badgeEl = document.getElementById('predraft-timeslot-badge');
            if (badgeEl) {
                badgeEl.textContent = `📅 ${preDraftState.dateLabel}【${preDraftState.period === '午' ? '下午' : '晚上'}】`;
            }
            const countBadge = document.getElementById('predraft-members-count-badge');
            if (countBadge) {
                countBadge.textContent = `可出團成員 ${responses.length} 人`;
            }

            renderPreDraftAvailableCharacters();
        };
    }

    function populatePreDraftTimeSelect(selectedTimeStr) {
        const timeSelect = document.getElementById('predraft-time-select');
        if (!timeSelect) return;
        timeSelect.innerHTML = '';

        const allTimes = [];
        for (let h = 9; h <= 23; h++) {
            const hh = String(h).padStart(2, '0');
            allTimes.push(`${hh}:00`);
            allTimes.push(`${hh}:30`);
        }

        const targetTime = selectedTimeStr || preDraftState.targetTimeStr || '20:00';
        if (!allTimes.includes(targetTime)) {
            allTimes.push(targetTime);
            allTimes.sort();
        }

        allTimes.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            if (t === targetTime) opt.selected = true;
            timeSelect.appendChild(opt);
        });

        timeSelect.value = targetTime;
        preDraftState.targetTimeStr = targetTime;

        timeSelect.onchange = () => {
            preDraftState.targetTimeStr = timeSelect.value;
            const [newHour, newMin] = timeSelect.value.split(':').map(Number);
            if (preDraftState.dateObj) {
                preDraftState.dateObj.setHours(newHour || 20, newMin || 0, 0, 0);
            }
            const newPeriod = (!isNaN(newHour) && newHour < 18) ? '午' : '晚';
            if (newPeriod !== preDraftState.period) {
                preDraftState.period = newPeriod;

                const curDate = preDraftState.dateObj || new Date();
                const tue = getTuesdayOfWeek(curDate);
                const curWeekId = `${tue.getFullYear()}-${String(tue.getMonth() + 1).padStart(2, '0')}-${String(tue.getDate()).padStart(2, '0')}`;
                const weekDays = getWeekDaysDetails(curWeekId);
                let dayDef = weekDays.find(d => 
                    d.dateObj.getFullYear() === curDate.getFullYear() &&
                    d.dateObj.getMonth() === curDate.getMonth() &&
                    d.dateObj.getDate() === curDate.getDate()
                );
                if (!dayDef) {
                    const dayMap = [5, 6, 0, 1, 2, 3, 4];
                    dayDef = weekDays[dayMap[curDate.getDay()]] || weekDays[0];
                }

                let newTargetSlotDef = null;
                if (dayDef.isWeekend || dayDef.isSpecialHoliday) {
                    newTargetSlotDef = (newPeriod === '午') ? dayDef.slots[0] : dayDef.slots[1];
                } else {
                    newTargetSlotDef = dayDef.slots[0];
                }

                const newResponses = Object.values(surveyResponses || {}).filter(r => {
                    if (!isResponseMatchWeek(r, curWeekId)) return false;
                    return isUserSlotChecked(r.slots, newTargetSlotDef, dayDef);
                });
                preDraftState.availableRespondents = newResponses;
                const countBadge = document.getElementById('predraft-members-count-badge');
                if (countBadge) {
                    countBadge.textContent = `可出團成員 ${newResponses.length} 人`;
                }
                renderPreDraftAvailableCharacters();
            }

            const badgeEl = document.getElementById('predraft-timeslot-badge');
            if (badgeEl) {
                badgeEl.textContent = `📅 ${preDraftState.dateLabel || ''}【${preDraftState.period === '午' ? '下午' : '晚上'}】`;
            }
        };
    }

    window.openSurveyPreDraftModal = function(dateStr, dateLabel, period, dayIndex) {
        if (typeof isAdmin === 'function' && !isAdmin()) {
            alert("⚠️ 預排功能僅限管理員使用！請先以管理員身分登入。");
            const adminAuthBtn = document.getElementById('btn-admin-auth');
            if (adminAuthBtn) adminAuthBtn.click();
            return;
        }

        const modal = document.getElementById('survey-predraft-modal');
        if (!modal) return;

        preDraftState.editingRaidId = null;
        preDraftState.editingConfirmedTeamId = null;
        preDraftState.editingConfirmedTeamIndex = null;

        const titleEl = document.getElementById('predraft-modal-title');
        if (titleEl) titleEl.textContent = '🎯 時段快速預排';

        const applyBtnText = document.getElementById('predraft-apply-btn-text');
        if (applyBtnText) applyBtnText.textContent = '🚀 直接發佈出隊至看板';

        const charsTitle = document.getElementById('predraft-chars-section-title');
        if (charsTitle) charsTitle.textContent = '🎴 當天可出戰角色卡';

        const activeWeekId = currentMatrixWeekId || TARGET_DEFAULT_WEEK_ID;
        const weekDays = getWeekDaysDetails(activeWeekId);
        const dayDef = weekDays[dayIndex] || weekDays[0];

        preDraftState.dateStr = dateStr;
        preDraftState.dateLabel = dateLabel;
        preDraftState.period = period || '晚';
        preDraftState.dayIndex = dayIndex;
        preDraftState.dateObj = dayDef.dateObj || new Date();
        preDraftState.catFilter = 'all';

        // Filter available survey respondents for this specific slot
        const targetSlotPeriod = period === '午' ? '午' : '晚';
        let targetSlotDef = null;
        if (dayDef.isWeekend || dayDef.isSpecialHoliday) {
            targetSlotDef = (period === '午') ? dayDef.slots[0] : dayDef.slots[1];
        } else {
            targetSlotDef = dayDef.slots[0];
        }

        const responses = Object.values(surveyResponses || {}).filter(r => {
            if (!isResponseMatchWeek(r, activeWeekId)) return false;
            return isUserSlotChecked(r.slots, targetSlotDef, dayDef);
        });

        preDraftState.availableRespondents = responses;

        // Reset or init slots based on boss
        const isDragonKing = isDragonKingBoss(preDraftState.boss);
        const maxSlots = isDragonKing ? 12 : 6;
        preDraftState.slots = Array.from({ length: maxSlots }, (_, i) => ({ slotIndex: i, name: '', job: '', level: '' }));

        // Update Badges & UI
        const badgeEl = document.getElementById('predraft-timeslot-badge');
        if (badgeEl) {
            badgeEl.textContent = `📅 ${dateLabel}【${period === '午' ? '下午' : '晚上'}】`;
        }

        const countBadge = document.getElementById('predraft-members-count-badge');
        if (countBadge) {
            countBadge.textContent = `可出團成員 ${responses.length} 人`;
        }

        // Init Boss Select
        const bossSelect = document.getElementById('predraft-boss-select');
        if (bossSelect) {
            bossSelect.innerHTML = BOSS_LIST.map(b => `
                <option value="${b.name}" ${b.name === preDraftState.boss ? 'selected' : ''}>${b.icon} ${b.name}</option>
            `).join('');
            bossSelect.onchange = () => {
                preDraftState.boss = bossSelect.value;
                const newMaxSlots = isDragonKingBoss(preDraftState.boss) ? 12 : 6;
                const newSlots = [];
                for (let i = 0; i < newMaxSlots; i++) {
                    newSlots.push(preDraftState.slots[i] || { slotIndex: i, name: '', job: '', level: '' });
                }
                preDraftState.slots = newSlots;
                renderPreDraftSlots();
            };
        }

        // Init Games Select
        const gamesSelect = document.getElementById('predraft-games-select');
        if (gamesSelect) {
            gamesSelect.value = String(preDraftState.games || 7);
            gamesSelect.onchange = () => {
                preDraftState.games = parseInt(gamesSelect.value, 10) || 7;
            };
        }

        // Populate Date and Time dropdowns
        populatePreDraftDateSelect(preDraftState.dateObj);
        populatePreDraftTimeSelect((period === '午') ? '14:00' : '20:00');

        // Category Filter Buttons & Search Input
        preDraftState.catFilter = 'all';
        preDraftState.searchKeyword = '';

        const noteInputEl = document.getElementById('predraft-note-input');
        if (noteInputEl) {
            noteInputEl.value = '';
        }

        const searchInput = document.getElementById('predraft-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.oninput = () => {
                preDraftState.searchKeyword = searchInput.value || '';
                renderPreDraftAvailableCharacters();
            };
        }

        const catBtnGroup = document.getElementById('predraft-cat-filter-group');
        if (catBtnGroup) {
            catBtnGroup.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.cat === 'all');
                btn.onclick = () => {
                    catBtnGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    preDraftState.catFilter = btn.dataset.cat || 'all';
                    renderPreDraftAvailableCharacters();
                };
            });
        }

        renderPreDraftSlots();
        renderPreDraftAvailableCharacters();

        modal.style.display = 'flex';
    };

    function getTacticalRoleInfo(roleTag) {
        if (!roleTag) return { icon: '', cssClass: '', label: '' };
        const r = String(roleTag).trim();
        if (r === '控時' || r.includes('控時')) return { icon: '⏳', cssClass: 'time-control', label: r };
        if (r === '副控' || r.includes('副控')) return { icon: '⏱️', cssClass: 'sub-control', label: r };
        if (r === '清球' || r.includes('清球')) return { icon: '🔮', cssClass: 'clear-orb', label: r };
        if (r.includes('魅惑')) return { icon: '💖', cssClass: 'seduce', label: r };
        if (r === '煙1' || r === '煙2') return { icon: '💨', cssClass: 'smoke', label: r };
        if (r === '煙' || r.includes('煙')) return { icon: '💨', cssClass: 'smoke', label: r };
        if (r === '火' || r.includes('火')) return { icon: '🔥', cssClass: 'fire', label: r };
        if (r === '轉屬' || r.includes('轉屬')) return { icon: '🌀', cssClass: 'trans', label: r };
        if (r.includes('楓20') || r.includes('楓')) return { icon: '🍁', cssClass: 'maple', label: r };
        if (r === '速' || r.includes('速')) return { icon: '⚡', cssClass: 'speed', label: r };
        if (r.includes('腿')) return { icon: '🦵', cssClass: 'leg', label: r };
        if (r.includes('醬油')) return { icon: '🍮', cssClass: 'soy', label: r };
        return { icon: '🏷️', cssClass: 'general', label: r };
    }

    function getTacticalRoleSelectOptionsHtml(bossOrIsDk, roleTag) {
        let isDk = false;
        let isHardPap = false;

        if (typeof bossOrIsDk === 'boolean') {
            isDk = bossOrIsDk;
        } else if (typeof bossOrIsDk === 'string') {
            isDk = isDragonKingBoss(bossOrIsDk);
            isHardPap = isHardPapulatusBoss(bossOrIsDk);
        }

        let standardRoles = [];
        if (isDk) {
            standardRoles = ['魅惑1', '魅惑2', '魅惑3', '魅惑4', '煙1', '煙2', '火', '煙', '轉屬', '楓20', '速'];
        } else if (isHardPap) {
            standardRoles = ['控時', '副控', '清球', '火', '煙', '轉屬', '楓20', '速'];
        } else {
            standardRoles = ['火', '煙', '轉屬', '楓20', '速'];
        }
        const isCustom = roleTag && !standardRoles.includes(roleTag);

        if (isDk) {
            return `
                <option value="">定位</option>
                <option value="魅惑1" ${roleTag === '魅惑1' ? 'selected' : ''}>💖 魅惑 1</option>
                <option value="魅惑2" ${roleTag === '魅惑2' ? 'selected' : ''}>💖 魅惑 2</option>
                <option value="魅惑3" ${roleTag === '魅惑3' ? 'selected' : ''}>💖 魅惑 3</option>
                <option value="魅惑4" ${roleTag === '魅惑4' ? 'selected' : ''}>💖 魅惑 4</option>
                <option value="煙1" ${roleTag === '煙1' ? 'selected' : ''}>💨 煙 1</option>
                <option value="煙2" ${roleTag === '煙2' ? 'selected' : ''}>💨 煙 2</option>
                <option value="火" ${roleTag === '火' ? 'selected' : ''}>🔥 火</option>
                <option value="煙" ${roleTag === '煙' ? 'selected' : ''}>💨 煙</option>
                <option value="轉屬" ${roleTag === '轉屬' ? 'selected' : ''}>🌀 轉屬</option>
                <option value="楓20" ${roleTag === '楓20' ? 'selected' : ''}>🍁 楓20</option>
                <option value="速" ${roleTag === '速' ? 'selected' : ''}>⚡ 速</option>
                ${isCustom ? `<option value="${escapeHtml(roleTag)}" selected>🏷️ ${escapeHtml(roleTag)}</option>` : ''}
                <option value="__custom__">✏️ 自訂...</option>
            `;
        } else if (isHardPap) {
            return `
                <option value="">定位</option>
                <option value="控時" ${roleTag === '控時' ? 'selected' : ''}>⏳ 控時</option>
                <option value="副控" ${roleTag === '副控' ? 'selected' : ''}>⏱️ 副控</option>
                <option value="清球" ${roleTag === '清球' ? 'selected' : ''}>🔮 清球</option>
                <option value="火" ${roleTag === '火' ? 'selected' : ''}>🔥 火</option>
                <option value="煙" ${roleTag === '煙' ? 'selected' : ''}>💨 煙</option>
                <option value="轉屬" ${roleTag === '轉屬' ? 'selected' : ''}>🌀 轉屬</option>
                <option value="楓20" ${roleTag === '楓20' ? 'selected' : ''}>🍁 楓20</option>
                <option value="速" ${roleTag === '速' ? 'selected' : ''}>⚡ 速</option>
                ${isCustom ? `<option value="${escapeHtml(roleTag)}" selected>🏷️ ${escapeHtml(roleTag)}</option>` : ''}
                <option value="__custom__">✏️ 自訂...</option>
            `;
        } else {
            return `
                <option value="">定位</option>
                <option value="火" ${roleTag === '火' ? 'selected' : ''}>🔥 火</option>
                <option value="煙" ${roleTag === '煙' ? 'selected' : ''}>💨 煙</option>
                <option value="轉屬" ${roleTag === '轉屬' ? 'selected' : ''}>🌀 轉屬</option>
                <option value="楓20" ${roleTag === '楓20' ? 'selected' : ''}>🍁 楓20</option>
                <option value="速" ${roleTag === '速' ? 'selected' : ''}>⚡ 速</option>
                ${isCustom ? `<option value="${escapeHtml(roleTag)}" selected>🏷️ ${escapeHtml(roleTag)}</option>` : ''}
                <option value="__custom__">✏️ 自訂...</option>
            `;
        }
    }

    window.handlePreDraftSlotRoleChange = function(slotIdx, val) {
        if (!preDraftState.slots[slotIdx]) return;
        if (val === '__custom__') {
            const currentRole = preDraftState.slots[slotIdx].roleTag || '';
            const isDk = isDragonKingBoss(preDraftState.boss);
            const isHardPap = isHardPapulatusBoss(preDraftState.boss);
            let exampleText = "火、煙、轉屬、楓20、速、自訂備註";
            if (isDk) exampleText = "魅惑1、煙1、火、轉屬、楓20、速、自訂備註";
            else if (isHardPap) exampleText = "控時、副控、清球、火、煙、轉屬、楓20、速、自訂備註";
            const customVal = prompt(`請輸入此席位的自訂定位或備註 (例如: ${exampleText})：`, currentRole);
            if (customVal !== null) {
                preDraftState.slots[slotIdx].roleTag = customVal.trim();
            }
        } else {
            preDraftState.slots[slotIdx].roleTag = val;
        }
        renderPreDraftSlots();
    };

    function renderSinglePreDraftSlotHtml(idx, slotNum, teamPrefix) {
        const s = preDraftState.slots[idx] || { slotIndex: idx, name: '', job: '', level: '', roleTag: '' };
        const isFilled = !!(s && s.name);
        const numLabel = teamPrefix ? `${teamPrefix}-${slotNum}` : `#${slotNum}`;
        const roleTag = s.roleTag || '';
        const roleInfo = getTacticalRoleInfo(roleTag);

        const optionsHtml = getTacticalRoleSelectOptionsHtml(preDraftState.boss, roleTag);

        const roleSelectHtml = `
            <select class="slot-role-select ${roleTag ? 'role-active' : ''} ${roleInfo.cssClass}" 
                    onclick="event.stopPropagation();" 
                    onchange="event.stopPropagation(); window.handlePreDraftSlotRoleChange(${idx}, this.value);"
                    title="席位定位/自訂備註">
                ${optionsHtml}
            </select>
        `;

        if (isFilled) {
            const jobColor = getHighContrastJobColor(s.job);
            return `
                <div class="predraft-slot-box filled">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.2rem; line-height: 1;">
                        <span style="font-size: 0.7rem; font-weight: 800; color: #64748b; background: #f1f5f9; padding: 0.05rem 0.25rem; border-radius: 3px; white-space: nowrap;">${numLabel}</span>
                        ${roleSelectHtml}
                        <button type="button" onclick="window.removePreDraftSlot(${idx})" style="background: none; border: none; color: #ef4444; font-weight: 800; cursor: pointer; padding: 0 0.15rem; font-size: 0.9rem; line-height: 1;" title="移出席位">✕</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 0.2rem; margin-top: 2px;">
                        <span style="font-size: 0.86rem; font-weight: 900; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span>
                        <span style="font-size: 0.72rem; font-weight: 800; color: ${jobColor}; white-space: nowrap;">${escapeHtml(s.job)} <small style="color: #64748b; font-weight: 700;">Lv.${s.level}</small></span>
                    </div>
                </div>
            `;
        } else {
            let roleColor = '#2563eb';
            if (roleInfo.cssClass === 'time-control') roleColor = '#dc2626';
            else if (roleInfo.cssClass === 'sub-control') roleColor = '#b45309';
            else if (roleInfo.cssClass === 'clear-orb') roleColor = '#0d9488';
            else if (roleInfo.cssClass === 'seduce') roleColor = '#db2777';
            else if (roleInfo.cssClass === 'smoke') roleColor = '#475569';
            else if (roleInfo.cssClass === 'fire') roleColor = '#ea580c';
            else if (roleInfo.cssClass === 'trans') roleColor = '#7c3aed';
            else if (roleInfo.cssClass === 'maple') roleColor = '#d97706';
            else if (roleInfo.cssClass === 'speed') roleColor = '#ca8a04';

            return `
                <div class="predraft-slot-box empty">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 0.2rem; line-height: 1;">
                        <span style="font-size: 0.7rem; font-weight: 800; color: #94a3b8; background: #f1f5f9; padding: 0.05rem 0.25rem; border-radius: 3px; white-space: nowrap;">${numLabel}</span>
                        ${roleSelectHtml}
                    </div>
                    <div style="font-size: 0.75rem; color: ${roleTag ? roleColor : '#94a3b8'}; font-weight: 700; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; margin-top: 2px;">
                        ${roleTag ? `(${roleInfo.icon ? roleInfo.icon + ' ' : ''}${escapeHtml(roleTag)})` : '待排空位'}
                    </div>
                </div>
            `;
        }
    }

    function renderPreDraftSlots() {
        const list = document.getElementById('predraft-slots-list');
        const countText = document.getElementById('predraft-slot-count-text');
        const headerTitle = document.getElementById('predraft-slots-header-title');
        if (!list) return;

        const isDragonKing = isDragonKingBoss(preDraftState.boss);
        const maxSlots = isDragonKing ? 12 : 6;
        const filledCount = preDraftState.slots.filter(s => s && s.name).length;

        if (headerTitle) {
            headerTitle.textContent = preDraftState.editingRaidId
                ? (isDragonKing ? '📋 編輯出戰席位 (兩隊 12人)' : '📋 編輯出戰席位 (3×2)')
                : (isDragonKing ? '📋 預排出戰席位 (兩隊 12人)' : '📋 預排出戰席位 (3×2)');
        }

        if (countText) {
            countText.textContent = `已入座 ${filledCount}/${maxSlots} 人`;
        }

        let html = '';
        if (isDragonKing) {
            html += `
                <div class="predraft-team-block">
                    <div class="predraft-team-title">
                        <span>🐉 第一隊 (6人)</span>
                        <span style="font-size: 0.74rem; color: #64748b; font-weight: 700;">第 1 ~ 6 席</span>
                    </div>
                    <div class="predraft-slots-grid-3x2">
            `;
            for (let i = 0; i < 6; i++) {
                html += renderSinglePreDraftSlotHtml(i, i + 1, '隊1');
            }
            html += `
                    </div>
                </div>
                <div class="predraft-team-block">
                    <div class="predraft-team-title">
                        <span>🐉 第二隊 (6人)</span>
                        <span style="font-size: 0.74rem; color: #64748b; font-weight: 700;">第 7 ~ 12 席</span>
                    </div>
                    <div class="predraft-slots-grid-3x2">
            `;
            for (let i = 6; i < 12; i++) {
                html += renderSinglePreDraftSlotHtml(i, i - 5, '隊2');
            }
            html += `
                    </div>
                </div>
            `;
        } else {
            // Regular boss: exactly 3x2 grid of 6 slots
            html += `<div class="predraft-slots-grid-3x2">`;
            for (let i = 0; i < 6; i++) {
                html += renderSinglePreDraftSlotHtml(i, i + 1, '');
            }
            html += `</div>`;
        }
        list.innerHTML = html;
    }

    window.removePreDraftSlot = function(slotIdx) {
        if (preDraftState.slots[slotIdx]) {
            const existingRole = preDraftState.slots[slotIdx].roleTag || '';
            preDraftState.slots[slotIdx] = { slotIndex: slotIdx, name: '', job: '', level: '', roleTag: existingRole };
            renderPreDraftSlots();
            renderPreDraftAvailableCharacters();
        }
    };

    function renderPreDraftAvailableCharacters() {
        const container = document.getElementById('predraft-characters-container');
        const badgeTotal = document.getElementById('predraft-chars-total-badge');
        const charsTitle = document.getElementById('predraft-chars-section-title');
        if (!container) return;

        if (charsTitle) {
            charsTitle.textContent = '🎴 當天可出戰角色卡';
        }

        const respondents = preDraftState.availableRespondents || [];
        const catFilter = preDraftState.catFilter || 'all';
        const searchKeyword = (preDraftState.searchKeyword || '').trim().toLowerCase();

        let allAvailableCards = [];

        // Gather all bound characters from available respondents (抓該時段有登記的成員角色)
        respondents.forEach(r => {
            const boundChars = getMemberBoundRoster(r.name);
            const isScrollYes = (r.scroll === '是');
            if (boundChars.length > 0) {
                boundChars.forEach(c => {
                    allAvailableCards.push({
                        ...c,
                        memberName: r.name,
                        scroll: r.scroll,
                        isScrollYes: isScrollYes,
                        notes: r.notes || ''
                    });
                });
            } else {
                // If member has no bound roster yet, provide default adventurer card
                allAvailableCards.push({
                    id: r.name,
                    job: '冒險家',
                    level: 150,
                    category: '力職',
                    memberName: r.name,
                    scroll: r.scroll,
                    isScrollYes: isScrollYes,
                    notes: r.notes || ''
                });
            }
        });

        // 若為編輯模式，且隊伍席位已有特定角色（可能在之前已入座），一併納入可選清單以便顯示打勾狀態與退選
        if (preDraftState.editingRaidId) {
            preDraftState.slots.forEach(s => {
                if (s && s.name && !allAvailableCards.some(c => c.id.toLowerCase() === s.name.toLowerCase() && c.job === s.job)) {
                    allAvailableCards.push({
                        id: s.name,
                        job: s.job || '冒險家',
                        level: s.level || 120,
                        category: getCategoryByJob(s.job),
                        memberName: s.name,
                        scroll: '否',
                        isScrollYes: false,
                        notes: ''
                    });
                }
            });
        }

        if (allAvailableCards.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8;">
                    <p style="font-size: 1.05rem; font-weight: 700; margin: 0 0 0.5rem 0;">📝 此時段尚無成員登記有空</p>
                    <p style="font-size: 0.85rem; margin: 0;">請在問卷總表確認成員是否勾選此時段！</p>
                </div>
            `;
            if (badgeTotal) badgeTotal.textContent = '(共 0 張)';
            return;
        }

        // Deduplicate cards so no duplicate character appears in available pool (名字與職業不重複)
        const seenKeys = new Set();
        const uniqueCards = [];
        allAvailableCards.forEach(c => {
            const key = `${(c.id || '').trim().toLowerCase()}_${(c.job || '').trim()}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueCards.push(c);
            }
        });
        allAvailableCards = uniqueCards;

        // Update Category Counts on filter buttons
        const forceCount = allAvailableCards.filter(c => c.category === '力職').length;
        const dexCount = allAvailableCards.filter(c => c.category === '敏職').length;
        const intCount = allAvailableCards.filter(c => c.category === '法職').length;

        const btnAll = document.querySelector('#predraft-cat-filter-group button[data-cat="all"]');
        const btnForce = document.querySelector('#predraft-cat-filter-group button[data-cat="力職"]');
        const btnDex = document.querySelector('#predraft-cat-filter-group button[data-cat="敏職"]');
        const btnInt = document.querySelector('#predraft-cat-filter-group button[data-cat="法職"]');
        if (btnAll) btnAll.textContent = `全部 (${allAvailableCards.length})`;
        if (btnForce) btnForce.textContent = `💪 力 (${forceCount})`;
        if (btnDex) btnDex.textContent = `🎯 敏 (${dexCount})`;
        if (btnInt) btnInt.textContent = `✨ 法 (${intCount})`;

        if (badgeTotal) {
            badgeTotal.textContent = `(共 ${allAvailableCards.length} 張)`;
        }

        // Sort by Job Category (力職 ➔ 敏職 ➔ 法職), then Job priority, then Level descending
        const CATEGORY_ORDER = { '力職': 1, '敏職': 2, '法職': 3 };
        const JOB_ORDER_RANK = {
            '黑騎士': 10, '聖騎士': 11, '英雄': 12,
            '神射手': 20, '箭神': 21, '神偷': 22, '暗影神偷': 22, '夜使者': 23, '槍神': 24, '拳霸': 25,
            '主教': 30, '火毒': 31, '火毒魔導士': 31, '火毒大魔導士': 31, '冰雷': 32, '冰雷魔導士': 32, '冰雷大魔導士': 32
        };

        allAvailableCards.sort((a, b) => {
            const catA = CATEGORY_ORDER[a.category] || 99;
            const catB = CATEGORY_ORDER[b.category] || 99;
            if (catA !== catB) return catA - catB;

            const jobA = JOB_ORDER_RANK[a.job] || 99;
            const jobB = JOB_ORDER_RANK[b.job] || 99;
            if (jobA !== jobB) return jobA - jobB;

            if ((b.level || 0) !== (a.level || 0)) {
                return (b.level || 0) - (a.level || 0);
            }
            return (a.id || '').localeCompare(b.id || '');
        });

        // Filter by category
        let filteredCards = allAvailableCards;
        if (catFilter !== 'all') {
            filteredCards = filteredCards.filter(c => c.category === catFilter);
        }

        // Filter by search keyword
        if (searchKeyword) {
            filteredCards = filteredCards.filter(c => 
                (c.id && c.id.toLowerCase().includes(searchKeyword)) ||
                (c.job && c.job.toLowerCase().includes(searchKeyword)) ||
                (c.memberName && c.memberName.toLowerCase().includes(searchKeyword))
            );
        }

        if (filteredCards.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8;">
                    <p style="font-size: 0.95rem; font-weight: 700; margin: 0 0 0.4rem 0;">🔍 查無符合條件的角色卡</p>
                    <p style="font-size: 0.8rem; margin: 0;">請調整職業分類或搜尋關鍵字。</p>
                </div>
            `;
            return;
        }

        const isDragonKing = isDragonKingBoss(preDraftState.boss);

        // Dense flow container: 統一固定長寬，有空間就上補，名字不重複
        let html = '<div class="predraft-cards-flow">';

        filteredCards.forEach(c => {
            const slotIdx = preDraftState.slots.findIndex(s => s && s.name === c.id && s.job === c.job);
            const isSelected = slotIdx !== -1;
            const slotNum = isSelected ? (isDragonKing ? (slotIdx < 6 ? `隊1-${slotIdx+1}` : `隊2-${slotIdx-5}`) : `#${slotIdx+1}`) : '';

            // Check if another character from the same member is already drafted
            const memberChars = getMemberBoundRoster(c.memberName);
            const isSameMemberDrafted = !isSelected && preDraftState.slots.some(s => s && s.name && memberChars.some(mc => mc.id.toLowerCase() === s.name.toLowerCase() && mc.job === s.job));

            const catClass = c.category === '力職' ? 'cat-force' : (c.category === '敏職' ? 'cat-dex' : 'cat-int');
            const selectedClass = isSelected ? 'selected' : '';
            const jobColor = getHighContrastJobColor(c.job);

            const scrollTag = c.isScrollYes 
                ? '<span style="font-size:0.64rem; color:#15803d; background:#dcfce7; padding:1px 3px; border-radius:3px; font-weight:800; white-space:nowrap;">吃券</span>' 
                : '<span style="font-size:0.64rem; color:#dc2626; background:#fee2e2; padding:1px 3px; border-radius:3px; font-weight:800; white-space:nowrap;">不吃</span>';

            const cardTitle = isSelected 
                ? `[席位 ${slotNum}] 點擊退選` 
                : `角色: ${escapeHtml(c.id)} (${escapeHtml(c.job)} Lv.${c.level}) | 擁有者: ${escapeHtml(c.memberName)}${c.notes ? ' | 備註: ' + escapeHtml(c.notes) : ''} (點擊入座)`;

            // 名字不重複：卡片頂部只顯示角色 ID，下方顯示職業與吃券狀態，擁有者在 hover tooltip 中提示
            html += `
                <div class="predraft-card-chip ${catClass} ${selectedClass}"
                     onclick="window.togglePreDraftCharacter('${escapeHtml(c.id)}', '${escapeHtml(c.job)}', ${c.level})"
                     title="${cardTitle}">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.15rem; line-height: 1.15;">
                        <strong style="font-size: 0.82rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(c.id)}</strong>
                        ${isSelected ? `<span style="background: #16a34a; color: #ffffff; font-size: 0.64rem; font-weight: 800; padding: 1px 4px; border-radius: 3px; white-space: nowrap;">✓ ${slotNum}</span>` : 
                          (isSameMemberDrafted ? `<span style="background: #fef3c7; color: #b45309; font-size: 0.62rem; font-weight: 700; padding: 1px 3px; border-radius: 3px; white-space: nowrap;" title="${escapeHtml(c.memberName)} 已出戰其他角色">同人</span>` : 
                          `<span style="font-size: 0.68rem; color: #64748b; font-weight: 700; white-space: nowrap;">Lv.${c.level}</span>`)}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.15rem; line-height: 1.15;">
                        <span style="font-size: 0.74rem; font-weight: 800; color: ${jobColor}; white-space: nowrap;">${escapeHtml(c.job)}</span>
                        ${scrollTag}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    window.togglePreDraftCharacter = function(charId, charJob, charLevel) {
        const existingIdx = preDraftState.slots.findIndex(s => s && s.name === charId && s.job === charJob);
        if (existingIdx !== -1) {
            // Already drafted -> unassign (keep roleTag if set)
            const existingRole = preDraftState.slots[existingIdx].roleTag || '';
            preDraftState.slots[existingIdx] = { slotIndex: existingIdx, name: '', job: '', level: '', roleTag: existingRole };
        } else {
            // Find first empty slot
            const isDragonKing = isDragonKingBoss(preDraftState.boss);
            const maxSlots = isDragonKing ? 12 : 6;
            const emptyIdx = preDraftState.slots.findIndex((s, i) => i < maxSlots && (!s || !s.name));
            if (emptyIdx === -1) {
                alert(`⚠️ 目前預排席位已滿 (${maxSlots}人)！若要替換請先退選其他角色。`);
                return;
            }
            const existingRole = (preDraftState.slots[emptyIdx] && preDraftState.slots[emptyIdx].roleTag) || '';
            preDraftState.slots[emptyIdx] = {
                slotIndex: emptyIdx,
                name: charId,
                job: charJob,
                level: charLevel,
                roleTag: existingRole
            };
        }
        renderPreDraftSlots();
        renderPreDraftAvailableCharacters();
    };

    function setupSurveyPreDraftModal() {
        const modal = document.getElementById('survey-predraft-modal');
        const closeX = document.getElementById('btn-close-predraft-x');
        const cancelBtn = document.getElementById('btn-cancel-predraft');
        const clearSlotsBtn = document.getElementById('btn-clear-predraft-slots');
        const applyBtn = document.getElementById('btn-apply-predraft-to-create');

        const closeModal = () => {
            if (modal) modal.style.display = 'none';
            preDraftState.editingRaidId = null;
            preDraftState.editingConfirmedTeamId = null;
            preDraftState.editingConfirmedTeamIndex = null;
            const titleEl = document.getElementById('predraft-modal-title');
            if (titleEl) titleEl.textContent = '🎯 時段快速預排';
            const applyBtnText = document.getElementById('predraft-apply-btn-text');
            if (applyBtnText) applyBtnText.textContent = '🚀 直接發佈出隊至看板';
            const charsTitle = document.getElementById('predraft-chars-section-title');
            if (charsTitle) charsTitle.textContent = '🎴 當天可出戰角色卡';
        };

        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) closeModal();
            };
        }

        if (closeX) closeX.onclick = closeModal;
        if (cancelBtn) cancelBtn.onclick = closeModal;
        if (clearSlotsBtn) {
            clearSlotsBtn.onclick = () => {
                const isDragonKing = isDragonKingBoss(preDraftState.boss);
                const maxSlots = isDragonKing ? 12 : 6;
                preDraftState.slots = Array.from({ length: maxSlots }, (_, i) => ({ slotIndex: i, name: '', job: '', level: '', roleTag: '' }));
                renderPreDraftSlots();
                renderPreDraftAvailableCharacters();
            };
        }

        if (applyBtn) {
            applyBtn.onclick = async () => {
                const validMembers = preDraftState.slots.filter(s => s && s.name);
                if (validMembers.length === 0) {
                    alert("請至少安排一位角色入座再建立出團！");
                    return;
                }

                try {
                    const bossName = preDraftState.boss || '闇黑龍王';
                    const isDk = isDragonKingBoss(bossName);
                    const gamesCount = parseInt(preDraftState.games, 10) || 7;
                    const maxPlayers = isDk ? 12 : 6;

                    // Date & Time computation
                    const dateSelectEl = document.getElementById('predraft-date-select');
                    const timeSelectEl = document.getElementById('predraft-time-select');
                    let dateStr = (dateSelectEl && dateSelectEl.value) ? dateSelectEl.value : preDraftState.dateStr;
                    const timeStr = (timeSelectEl && timeSelectEl.value) ? timeSelectEl.value : (preDraftState.targetTimeStr || '20:00');
                    const dateObj = preDraftState.dateObj || new Date();

                    // Parse parts into scheduled timestamp
                    let y = 0, m = 0, d = 0;
                    if (dateStr && typeof dateStr === 'string') {
                        const ym = dateStr.match(/(?:(\d{4})[年/-])?(\d{1,2})[月/-](\d{1,2})/);
                        if (ym) {
                            y = ym[1] ? parseInt(ym[1], 10) : dateObj.getFullYear();
                            m = parseInt(ym[2], 10);
                            d = parseInt(ym[3], 10);
                        }
                    }
                    if (!y || !m || !d) {
                        y = dateObj.getFullYear();
                        m = dateObj.getMonth() + 1;
                        d = dateObj.getDate();
                    }
                    const [hrs, mins] = timeStr.split(':').map(Number);
                    const schedDate = new Date(y, m - 1, d, hrs || 20, mins || 0, 0);

                    const weekDays = ['日','一','二','三','四','五','六'];
                    const weekDay = weekDays[schedDate.getDay()];
                    const fullTimeText = `${m}/${d} (${weekDay}) ${timeStr}`;
                    const standardDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                    const predraftNoteInput = document.getElementById('predraft-note-input');
                    const noteText = predraftNoteInput ? predraftNoteInput.value.trim() : '';

                    let creatorName = getCurrentEffectiveUser() || '管理員';
                    if (preDraftState.editingRaidId && raidsDB[preDraftState.editingRaidId]) {
                        const origRaid = raidsDB[preDraftState.editingRaidId];
                        if (origRaid.creator && origRaid.creator !== '隊長' && origRaid.creator !== '未知') {
                            creatorName = origRaid.creator;
                        }
                    } else if (preDraftState.editingConfirmedTeamId !== null && preDraftState.editingConfirmedTeamId !== undefined) {
                        const origTeam = confirmedTeams.find(t => t && t.id === preDraftState.editingConfirmedTeamId);
                        if (origTeam && origTeam.creator && origTeam.creator !== '隊長' && origTeam.creator !== '未知') {
                            creatorName = origTeam.creator;
                        }
                    }

                    // Slot roles map
                    const slotRolesMap = {};
                    preDraftState.slots.forEach((s, idx) => {
                        if (s && s.roleTag) {
                            slotRolesMap[idx] = s.roleTag;
                        }
                    });

                    // Build final members
                    const finalMembers = validMembers.map(m => {
                        const isThisCreator = Boolean(m.name && creatorName && m.name.toLowerCase() === creatorName.toLowerCase());
                        return {
                            slotIndex: m.slotIndex,
                            name: m.name,
                            job: m.job || '',
                            level: m.level || 120,
                            roleTag: m.roleTag || (slotRolesMap[m.slotIndex] || ''),
                            clientId: isThisCreator ? myClientId : 'assigned',
                            isCreator: isThisCreator
                        };
                    });

                    if (preDraftState.editingConfirmedTeamId !== null && preDraftState.editingConfirmedTeamId !== undefined) {
                        // UPDATE EXISTING CONFIRMED TEAM
                        const teamIdx = confirmedTeams.findIndex(t => t && t.id === preDraftState.editingConfirmedTeamId);
                        const targetTeam = teamIdx !== -1 ? confirmedTeams[teamIdx] : confirmedTeams[preDraftState.editingConfirmedTeamIndex];
                        if (!targetTeam) {
                            alert("找不到該已確認隊伍資料！");
                            return;
                        }

                        targetTeam.boss = bossName;
                        targetTeam.gamesCount = gamesCount;
                        targetTeam.maxPlayers = maxPlayers;
                        targetTeam.date = standardDateStr;
                        targetTeam.timeStr = timeStr;
                        targetTeam.time = fullTimeText;
                        targetTeam.timeText = fullTimeText;
                        targetTeam.timeslot = fullTimeText;
                        targetTeam.scheduledTimestamp = !isNaN(schedDate.getTime()) ? schedDate.getTime() : (targetTeam.scheduledTimestamp || Date.now());
                        targetTeam.note = noteText;
                        targetTeam.slotRoles = slotRolesMap;
                        targetTeam.members = finalMembers;
                        targetTeam.updatedAt = Date.now();

                        saveDB();
                        closeModal();
                        renderConfirmedTeams();

                        alert(`🎉【${bossName}】已確認隊伍修改已成功儲存！\n時間：${fullTimeText}\n人數：${finalMembers.length}/${maxPlayers} 人`);
                    } else if (preDraftState.editingRaidId) {
                        // UPDATE EXISTING RAID
                        const raidId = preDraftState.editingRaidId;
                        await db.ref('raids/' + raidId).update({
                            boss: bossName,
                            gamesCount: gamesCount,
                            maxPlayers: maxPlayers,
                            date: standardDateStr,
                            timeStr: timeStr,
                            time: fullTimeText,
                            scheduledTimestamp: !isNaN(schedDate.getTime()) ? schedDate.getTime() : Date.now(),
                            note: noteText,
                            slotRoles: slotRolesMap,
                            members: finalMembers,
                            updatedAt: Date.now()
                        });

                        closeModal();
                        currentSelectedBoss = bossName;
                        renderRecruitBoard();

                        alert(`🎉【${bossName}】出團隊伍已成功更新！\n時間：${fullTimeText}\n人數：${finalMembers.length}/${maxPlayers} 人`);
                    } else {
                        // Directly push to Firebase raids
                        const newRaidRef = db.ref('raids').push();
                        await newRaidRef.set({
                            id: newRaidRef.key,
                            boss: bossName,
                            gamesCount: gamesCount,
                            maxPlayers: maxPlayers,
                            date: standardDateStr,
                            timeStr: timeStr,
                            time: fullTimeText,
                            scheduledTimestamp: !isNaN(schedDate.getTime()) ? schedDate.getTime() : Date.now(),
                            creator: creatorName,
                            creatorClientId: myClientId,
                            note: noteText,
                            slotRoles: slotRolesMap,
                            isConfirmed: false,
                            members: finalMembers,
                            createdAt: Date.now()
                        });

                        // Close survey predraft modal & detail modal
                        closeModal();
                        const detailModal = document.getElementById('survey-detail-modal');
                        if (detailModal) detailModal.style.display = 'none';

                        // Switch to Tab 2 (Recruit Board)
                        const tabBtn = document.querySelector('.tab-btn[data-target="tab-recruit"]');
                        if (tabBtn) tabBtn.click();

                        currentSelectedBoss = bossName;
                        renderRecruitBoard();

                        alert(`🎉【${bossName}】出團隊伍已直接建立並發佈至看板！\n時間：${fullTimeText}\n人數：${finalMembers.length}/${maxPlayers} 人`);

                        const recruitCard = document.getElementById('recruit-container');
                        if (recruitCard) {
                            recruitCard.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                } catch (err) {
                    console.error("預排直接出團錯誤:", err);
                    alert("儲存出團失敗：" + err.message);
                }
            };
        }
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
                const isDk = isDragonKingBoss(createRaidState.boss);
                const maxSlots = isDk ? 12 : 6;
                if (createRaidState.slots.length !== maxSlots) {
                    const newSlots = [];
                    for (let i = 0; i < maxSlots; i++) {
                        newSlots.push(createRaidState.slots[i] || { slotIndex: i, name: '', job: '', level: '', roleTag: '' });
                    }
                    createRaidState.slots = newSlots;
                    if (createRaidState.activeSlotIndex >= maxSlots) {
                        createRaidState.activeSlotIndex = 0;
                    }
                }
                const noteInput = document.getElementById('create-raid-note');
                if (noteInput) {
                    noteInput.placeholder = isDk
                        ? "例如：魅惑1大鎖/魅惑2Eric、進場站位、各隊配置..."
                        : "例如：進場提醒、吃券分配、注意事項...";
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

        window.handleCreateSlotRoleChange = function(slotIdx, val) {
            if (!createRaidState.slots[slotIdx]) return;
            if (val === '__custom__') {
                const currentRole = createRaidState.slots[slotIdx].roleTag || '';
                const isDk = isDragonKingBoss(createRaidState.boss);
                const isHardPap = isHardPapulatusBoss(createRaidState.boss);
                let exampleText = "火、煙、轉屬、楓20、速、自訂備註";
                if (isDk) exampleText = "魅惑1、煙1、火、轉屬、楓20、速、自訂備註";
                else if (isHardPap) exampleText = "控時、副控、清球、火、煙、轉屬、楓20、速、自訂備註";
                const customVal = prompt(`請輸入此席位的自訂定位或備註 (例如: ${exampleText})：`, currentRole);
                if (customVal !== null) {
                    createRaidState.slots[slotIdx].roleTag = customVal.trim();
                }
            } else {
                createRaidState.slots[slotIdx].roleTag = val;
            }
            renderCreateSlotsList();
        };

        // --- Render Slots in Left Column ---
        function renderCreateSlotsList() {
            const container = document.getElementById('create-team-slots-container');
            if (!container) return;
            container.innerHTML = '';

            const isDragonKing = isDragonKingBoss(createRaidState.boss);
            const maxSlots = isDragonKing ? 12 : 6;

            while (createRaidState.slots.length < maxSlots) {
                createRaidState.slots.push({ slotIndex: createRaidState.slots.length, name: '', job: '', level: '', roleTag: '' });
            }
            if (createRaidState.slots.length > maxSlots) {
                createRaidState.slots = createRaidState.slots.slice(0, maxSlots);
            }

            const buildSlotItem = (s, idx) => {
                const isFilled = !!(s && s.name);
                const isActive = (createRaidState.activeSlotIndex === idx);
                const slotNum = isDragonKing ? (idx < 6 ? idx + 1 : idx - 5) : idx + 1;
                const roleTag = (s && s.roleTag) || '';
                const roleInfo = getTacticalRoleInfo(roleTag);

                const roleSelectHtml = `
                    <select class="slot-role-select ${roleTag ? 'role-active' : ''} ${roleInfo.cssClass}" 
                            onclick="event.stopPropagation();" 
                            onchange="event.stopPropagation(); window.handleCreateSlotRoleChange(${idx}, this.value);"
                            title="設定席位戰術定位">
                        ${getTacticalRoleSelectOptionsHtml(createRaidState.boss, roleTag)}
                    </select>
                `;

                const item = document.createElement('div');
                item.className = `create-slot-box ${isFilled ? 'filled' : 'empty'} ${isActive ? 'active' : ''}`;
                
                if (isFilled) {
                    const jobColor = getHighContrastJobColor(s.job);
                    item.innerHTML = `
                        <div class="slot-box-top">
                            <span class="slot-box-num">#${slotNum}</span>
                            ${roleSelectHtml}
                            <button type="button" class="slot-box-del" onclick="event.stopPropagation(); window.removeCreateSlotMember(${idx});" title="移除此成員">✕</button>
                        </div>
                        <div class="slot-box-id">${escapeHtml(s.name)}</div>
                        <div class="slot-box-bottom">
                            <span style="color:${jobColor}; font-weight:700;">${escapeHtml(s.job)}</span>
                            <span style="color:#64748b; font-weight:600;">Lv.${s.level}</span>
                        </div>
                    `;
                } else {
                    let roleColor = '#2563eb';
                    if (roleInfo.cssClass === 'time-control') roleColor = '#dc2626';
                    else if (roleInfo.cssClass === 'sub-control') roleColor = '#b45309';
                    else if (roleInfo.cssClass === 'clear-orb') roleColor = '#0d9488';
                    else if (roleInfo.cssClass === 'seduce') roleColor = '#db2777';
                    else if (roleInfo.cssClass === 'smoke') roleColor = '#475569';
                    else if (roleInfo.cssClass === 'fire') roleColor = '#ea580c';
                    else if (roleInfo.cssClass === 'trans') roleColor = '#7c3aed';
                    else if (roleInfo.cssClass === 'maple') roleColor = '#d97706';
                    else if (roleInfo.cssClass === 'speed') roleColor = '#ca8a04';

                    item.innerHTML = `
                        <div class="slot-box-top">
                            <span class="slot-box-num">#${slotNum}</span>
                            ${roleSelectHtml}
                        </div>
                        <div class="slot-box-empty-title">
                            ${roleTag ? `<span style="font-size:0.8rem; font-weight:800; color:${roleColor};">(${roleInfo.icon ? roleInfo.icon + ' ' : ''}${escapeHtml(roleTag)} 空位)</span>` : `席位 ${slotNum}`}
                        </div>
                        <div style="font-size: 0.68rem; color: #94a3b8; text-align: center;">點擊入座</div>
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
                // Clicking assigned character unassigns it! Keep roleTag if present
                const existingRole = createRaidState.slots[existingIdx].roleTag || '';
                createRaidState.slots[existingIdx] = { slotIndex: existingIdx, name: '', job: '', level: '', roleTag: existingRole };
                createRaidState.activeSlotIndex = existingIdx;
                renderCreateSlotsList();
                renderCreateRosterKeys();
                return;
            }

            const maxSlots = isDragonKingBoss(createRaidState.boss) ? 12 : 6;
            let targetIdx = createRaidState.activeSlotIndex;
            if (targetIdx < 0 || targetIdx >= maxSlots) targetIdx = 0;

            const currentOrganizer = getCurrentEffectiveUser();
            const existingRole = (createRaidState.slots[targetIdx] && createRaidState.slots[targetIdx].roleTag) || '';
            createRaidState.slots[targetIdx] = {
                slotIndex: targetIdx,
                name: charId,
                job: charJob,
                level: charLevel,
                roleTag: existingRole,
                isCreator: Boolean(currentOrganizer && charId.toLowerCase() === currentOrganizer.toLowerCase())
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
                const existingRole = createRaidState.slots[slotIdx].roleTag || '';
                createRaidState.slots[slotIdx] = { slotIndex: slotIdx, name: '', job: '', level: '', roleTag: existingRole };
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

        // --- Open Create Raid Modal (支援帶入複製隊伍 copyFromTeam，以及編輯現有隊伍 editingRaidId) ---
        window.openCreateRaidModal = function(preferredBoss, copyFromTeam = null, editingRaidId = null) {
            try {
                if (!canCreateTeam()) {
                    if (typeof window.openGeneralLoginModal === 'function') {
                        window.openGeneralLoginModal(() => {
                            window.openCreateRaidModal(preferredBoss, copyFromTeam, editingRaidId);
                        });
                    } else {
                        alert('建立隊伍需先登入帳號或管理員！');
                    }
                    return;
                }

                createRaidState.editingRaidId = editingRaidId || null;

            const modalTitleSpan = document.getElementById('create-raid-modal-title');
            const submitBtn = document.getElementById('btn-confirm-create-raid');
            if (modalTitleSpan) {
                modalTitleSpan.textContent = editingRaidId ? '✏️ 編輯出團與席位調整' : '⚔️ 建立出團與席位挑選';
            }
            if (submitBtn) {
                submitBtn.textContent = editingRaidId ? '💾 儲存修改' : '✅ 確認建立出團';
            }

            const identityBadge = document.getElementById('create-modal-current-identity');
            if (identityBadge) {
                const loggedName = getLoggedInUser();
                if (loggedName) {
                    identityBadge.textContent = `👤 發起人：${loggedName}`;
                    identityBadge.style.color = '#15803d';
                    identityBadge.style.background = '#f0fdf4';
                    identityBadge.style.borderColor = '#bbf7d0';
                } else if (isAdmin()) {
                    const adm = getAdminUser() || '管理員';
                    identityBadge.textContent = `👑 管理員已授權 (${adm})`;
                    identityBadge.style.color = '#15803d';
                    identityBadge.style.background = '#f0fdf4';
                    identityBadge.style.borderColor = '#bbf7d0';
                } else {
                    identityBadge.textContent = `⚠️ 未登入`;
                    identityBadge.style.color = '#dc2626';
                    identityBadge.style.background = '#fef2f2';
                    identityBadge.style.borderColor = '#fecaca';
                }
            }

            const targetBoss = (copyFromTeam && copyFromTeam.boss) ? normalizeBossName(copyFromTeam.boss) : (preferredBoss || "克雷塞爾");
            const targetGames = (copyFromTeam && copyFromTeam.gamesCount) ? copyFromTeam.gamesCount : 7;
            createRaidState.boss = targetBoss;
            createRaidState.games = targetGames;
            createRaidState.note = (copyFromTeam && copyFromTeam.note) ? copyFromTeam.note : '';
            createRaidState.searchKeyword = "";
            createRaidState.filterCat = "all";

            const isTargetDk = isDragonKingBoss(targetBoss);
            const createNoteInput = document.getElementById('create-raid-note');
            if (createNoteInput) {
                createNoteInput.value = createRaidState.note;
                createNoteInput.placeholder = isTargetDk
                    ? "例如：魅惑1大鎖/魅惑2Eric、進場站位、各隊配置..."
                    : "例如：進場提醒、吃券分配、注意事項...";
            }

            // Sync Dropdowns on the left
            if (bossSelect) bossSelect.value = targetBoss;
            if (gamesSelect) gamesSelect.value = String(targetGames);

            const createSearchInput = document.getElementById('create-roster-search');
            if (createSearchInput) createSearchInput.value = '';

            const maxSlots = isTargetDk ? 12 : 6;

            const loggedName = getCurrentEffectiveUser();

            if (copyFromTeam && copyFromTeam.members) {
                const sourceMembers = Array.isArray(copyFromTeam.members) ? copyFromTeam.members : Object.values(copyFromTeam.members);
                createRaidState.slots = Array.from({ length: maxSlots }, (_, i) => {
                    const found = sourceMembers.find((m, idx) => (m && (m.slotIndex !== undefined ? m.slotIndex : idx) === i));
                    const presetRole = copyFromTeam.slotRoles && copyFromTeam.slotRoles[i] ? copyFromTeam.slotRoles[i] : '';
                    if (found && found.name) {
                        return {
                            slotIndex: i,
                            name: found.name,
                            job: found.job || '',
                            level: found.level || 120,
                            roleTag: found.roleTag || presetRole || '',
                            isCreator: Boolean(loggedName && found.name && found.name.toLowerCase() === loggedName.toLowerCase())
                        };
                    }
                    return { slotIndex: i, name: '', job: '', level: '', roleTag: presetRole || '' };
                });
                const firstEmpty = createRaidState.slots.findIndex(s => !s.name);
                createRaidState.activeSlotIndex = firstEmpty !== -1 ? firstEmpty : 0;
            } else {
                createRaidState.slots = Array.from({ length: maxSlots }, (_, i) => ({ slotIndex: i, name: '', job: '', level: '', roleTag: '' }));

                // Auto-fill slot 0 with organizer's saved character or logged-in user if available
                const saved = getSavedChar();
                if (saved && saved.name) {
                    createRaidState.slots[0] = {
                        slotIndex: 0,
                        name: saved.name,
                        job: saved.job || '黑騎士',
                        level: saved.level || 120,
                        roleTag: '',
                        isCreator: Boolean(loggedName && saved.name && saved.name.toLowerCase() === loggedName.toLowerCase())
                    };
                    createRaidState.activeSlotIndex = 1; // start picking for slot 2
                } else if (loggedName) {
                    const foundRoster = CHARACTER_ROSTER.find(c => {
                        const cName = c && (c.id || c.name);
                        return cName && loggedName && cName.toLowerCase() === loggedName.toLowerCase();
                    });
                    createRaidState.slots[0] = {
                        slotIndex: 0,
                        name: loggedName,
                        job: foundRoster ? foundRoster.job : '黑騎士',
                        level: foundRoster ? foundRoster.level : 120,
                        roleTag: '',
                        isCreator: true
                    };
                    createRaidState.activeSlotIndex = 1;
                } else {
                    createRaidState.activeSlotIndex = 0;
                }
            }

            // Reset cat buttons
            if (catGroup) {
                catGroup.querySelectorAll('.btn-select-chip').forEach(b => {
                    b.classList.toggle('active', b.dataset.cat === 'all');
                });
            }

            // Set Date & Time (若有傳入特定日期/時間，如預排時段，優先採用；否則預設為今天)
            const targetDate = (copyFromTeam && copyFromTeam.targetDateObj) ? copyFromTeam.targetDateObj : new Date();
            createRaidState.dateObj = targetDate;
            if (raidDatePicker) raidDatePicker.setDate(targetDate);
            updateCreateTimeDropdown(targetDate);

            if (copyFromTeam && copyFromTeam.targetTimeStr) {
                createRaidState.timeStr = copyFromTeam.targetTimeStr;
                if (timeSelect) {
                    // Check if option exists in dropdown, if not add it
                    let exists = false;
                    for (let i = 0; i < timeSelect.options.length; i++) {
                        if (timeSelect.options[i].value === copyFromTeam.targetTimeStr) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        const opt = document.createElement('option');
                        opt.value = copyFromTeam.targetTimeStr;
                        opt.textContent = copyFromTeam.targetTimeStr;
                        timeSelect.appendChild(opt);
                    }
                    timeSelect.value = copyFromTeam.targetTimeStr;
                }
            }

            // Switch to Tab 2 (Recruit / Planner Lobby) if not currently active
            const tabBtn = document.querySelector('.tab-btn[data-target="tab-recruit"]');
            if (tabBtn && !tabBtn.classList.contains('active')) {
                tabBtn.click();
            }

            renderCreateSlotsList();
            renderCreateRosterKeys();
            checkAndDisplayDraftBanner();

            if (createModal) createModal.style.display = 'flex';
        } catch (err) {
            console.error("開啟建立出團視窗錯誤:", err);
            alert("開啟建立出團視窗時發生錯誤：" + err.message);
        }
    };

        // --- Draft Save / Load / Discard Functionality (點選完可先按暫存) ---
        function saveRaidDraft() {
            try {
                const draft = {
                    boss: createRaidState.boss,
                    games: createRaidState.games,
                    dateStr: document.getElementById('raid-date') ? document.getElementById('raid-date').value : '',
                    timeStr: createRaidState.timeStr,
                    note: document.getElementById('create-raid-note') ? document.getElementById('create-raid-note').value : '',
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
                createRaidState.note = draft.note || '';
                createRaidState.slots = draft.slots || [];
                createRaidState.activeSlotIndex = draft.activeSlotIndex !== undefined ? draft.activeSlotIndex : 0;

                const createNoteInput = document.getElementById('create-raid-note');
                if (createNoteInput) createNoteInput.value = createRaidState.note;

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
            btnConfirmCreate.onclick = async () => {
                if (!canCreateTeam()) {
                    alert("建立隊伍需先登入帳號或管理員！");
                    if (typeof window.openGeneralLoginModal === 'function') {
                        window.openGeneralLoginModal();
                    }
                    return;
                }
                try {
                    const validMembers = createRaidState.slots.filter(s => s && s.name);

                    // Determine creator name strictly from logged-in account ID, admin name or fallback
                    const loggedId = getCurrentEffectiveUser();
                    let creatorName = loggedId || getSavedCreator() || (isAdmin() ? (getAdminUser() || '管理員') : '公會成員');
                    if (createRaidState.editingRaidId && raidsDB[createRaidState.editingRaidId]) {
                        const origRaid = raidsDB[createRaidState.editingRaidId];
                        if (origRaid.creator && origRaid.creator !== '隊長' && origRaid.creator !== '未知') {
                            creatorName = origRaid.creator;
                        }
                    } else {
                        setSavedCreator(creatorName);
                    }

                    // Save Slot 0 character as saved char if present
                    const slot0 = createRaidState.slots[0];
                    if (slot0 && slot0.name) {
                        setSavedChar(slot0.name, slot0.job, slot0.level);
                    }

                    const dObj = createRaidState.dateObj || (raidDatePicker && raidDatePicker.selectedDates && raidDatePicker.selectedDates[0]) || new Date();
                    const y = dObj.getFullYear();
                    const m = (dObj.getMonth() + 1).toString().padStart(2, '0');
                    const d = dObj.getDate().toString().padStart(2, '0');
                    const dateStr = `${y}/${m}/${d}`;

                    const timeSelectEl = document.getElementById('raid-time-select');
                    const actualTimeStr = createRaidState.timeStr || (timeSelectEl ? timeSelectEl.value : '') || '20:00';
                    createRaidState.timeStr = actualTimeStr;

                    const timeParts = actualTimeStr.split(':');
                    const schedHour = parseInt(timeParts[0] || '20', 10);
                    const schedMin = parseInt(timeParts[1] || '0', 10);
                    const schedDate = new Date(y, dObj.getMonth(), dObj.getDate(), schedHour, schedMin);
                    const weekDays = ['日','一','二','三','四','五','六'];
                    const weekDay = weekDays[schedDate.getDay()];
                    const fullTimeText = `${m}/${d} (${weekDay}) ${actualTimeStr}`;

                    const noteInput = document.getElementById('create-raid-note');
                    const noteText = noteInput ? noteInput.value.trim() : (createRaidState.note || '');
                    createRaidState.note = noteText;

                    const isDk = isDragonKingBoss(createRaidState.boss);
                    const slotRolesMap = {};
                    createRaidState.slots.forEach((s, idx) => {
                        if (s && s.roleTag) {
                            slotRolesMap[idx] = s.roleTag;
                        }
                    });

                    const finalMembers = validMembers.map(m => {
                        const isThisCreator = Boolean(m.name && creatorName && m.name.toLowerCase() === creatorName.toLowerCase());
                        return {
                            slotIndex: m.slotIndex,
                            name: m.name,
                            job: m.job,
                            level: m.level,
                            roleTag: m.roleTag || (slotRolesMap[m.slotIndex] || ''),
                            clientId: isThisCreator ? myClientId : 'assigned',
                            isCreator: isThisCreator
                        };
                    });

                    if (createRaidState.editingRaidId) {
                        const targetId = createRaidState.editingRaidId;
                        await db.ref(`raids/${targetId}`).update({
                            boss: createRaidState.boss,
                            gamesCount: createRaidState.games,
                            maxPlayers: isDragonKingBoss(createRaidState.boss) ? 12 : 6,
                            date: dateStr,
                            timeStr: createRaidState.timeStr,
                            time: fullTimeText,
                            scheduledTimestamp: !isNaN(schedDate.getTime()) ? schedDate.getTime() : Date.now(),
                            note: noteText,
                            slotRoles: slotRolesMap,
                            members: finalMembers,
                            updatedAt: Date.now()
                        });

                        discardRaidDraft();
                        createRaidState.editingRaidId = null;

                        if (createModal) createModal.style.display = 'none';
                        currentSelectedBoss = createRaidState.boss;
                        renderRecruitBoard();

                        alert(`🎉【${createRaidState.boss}】出團隊伍已成功更新！`);
                        const recruitCard = document.getElementById('recruit-container');
                        if (recruitCard) recruitCard.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        const newRaidRef = db.ref('raids').push();
                        await newRaidRef.set({
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
                            note: noteText,
                            slotRoles: slotRolesMap,
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
                    }
                } catch (err) {
                    console.error("建立或更新出團錯誤:", err);
                    alert("操作失敗：" + err.message);
                }
            };
        }

        const btnCloseCreateX = document.getElementById('btn-close-create-x');
        if (btnCloseCreateX && createModal) {
            btnCloseCreateX.onclick = () => { 
                createModal.style.display = 'none'; 
                createRaidState.editingRaidId = null;
            };
        }
        const btnCancelCreate = document.getElementById('btn-cancel-create');
        if (btnCancelCreate && createModal) {
            btnCancelCreate.onclick = () => { 
                createModal.style.display = 'none'; 
                createRaidState.editingRaidId = null;
            };
        }
        if (createModal) {
            createModal.addEventListener('click', (e) => {
                if (e.target === createModal) {
                    createModal.style.display = 'none';
                    createRaidState.editingRaidId = null;
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
        if (joinModal) {
            joinModal.addEventListener('click', (e) => {
                if (e.target === joinModal) {
                    joinModal.style.display = 'none';
                }
            });
        }

        window.switchJoinModalTab = function(tabName) {
            const tabRoster = document.getElementById('tab-join-roster');
            const tabManual = document.getElementById('tab-join-manual');
            const viewRoster = document.getElementById('join-view-roster');
            const viewManual = document.getElementById('join-view-manual');

            if (tabName === 'manual') {
                if (tabRoster) {
                    tabRoster.style.background = 'transparent';
                    tabRoster.style.color = '#64748b';
                    tabRoster.style.boxShadow = 'none';
                }
                if (tabManual) {
                    tabManual.style.background = '#ffffff';
                    tabManual.style.color = 'var(--primary-color)';
                    tabManual.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }
                if (viewRoster) viewRoster.style.display = 'none';
                if (viewManual) viewManual.style.display = 'block';
                const nameInput = document.getElementById('join-char-name');
                if (nameInput) setTimeout(() => nameInput.focus(), 60);
            } else {
                if (tabRoster) {
                    tabRoster.style.background = '#ffffff';
                    tabRoster.style.color = 'var(--primary-color)';
                    tabRoster.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }
                if (tabManual) {
                    tabManual.style.background = 'transparent';
                    tabManual.style.color = '#64748b';
                    tabManual.style.boxShadow = 'none';
                }
                if (viewRoster) viewRoster.style.display = 'flex';
                if (viewManual) viewManual.style.display = 'none';
            }
        };

        const tabRoster = document.getElementById('tab-join-roster');
        if (tabRoster) {
            tabRoster.onclick = () => window.switchJoinModalTab('roster');
        }
        const tabManual = document.getElementById('tab-join-manual');
        if (tabManual) {
            tabManual.onclick = () => window.switchJoinModalTab('manual');
        }

        const btnJoinOpenRoster = document.getElementById('btn-join-open-roster-modal');
        if (btnJoinOpenRoster) {
            btnJoinOpenRoster.onclick = () => {
                if (typeof openRosterManageModal === 'function') {
                    openRosterManageModal();
                }
            };
        }

        const rosterSearchInput = document.getElementById('roster-search-input');
        if (rosterSearchInput) {
            rosterSearchInput.addEventListener('input', (e) => {
                const raidId = document.getElementById('join-raid-id').value;
                const slotIdx = parseInt(document.getElementById('join-slot-index').value) || 0;
                if (typeof window.renderRosterCards === 'function') {
                    window.renderRosterCards(raidId, slotIdx, e.target.value);
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

                    const maxSlots = (raid.boss && isDragonKingBoss(raid.boss)) ? 12 : (raid.maxPlayers || 6);
                    if (members.length >= maxSlots) {
                        alert("隊伍已滿額！");
                        joinModal.style.display = 'none';
                        return;
                    }

                    const slotRole = (raid && raid.slotRoles && raid.slotRoles[slotIdx]) ? raid.slotRoles[slotIdx] : '';
                    members.push({
                        slotIndex: slotIdx,
                        name: charName,
                        job: charJob,
                        level: charLevel,
                        roleTag: slotRole,
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

        const slotRole = (raid && raid.slotRoles && raid.slotRoles[slotIndex]) ? raid.slotRoles[slotIndex] : '';
        members.push({
            slotIndex: slotIndex,
            name: charName,
            job: charJob,
            level: charLevel,
            roleTag: slotRole,
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
        const slotRole = (raid && raid.slotRoles && raid.slotRoles[currentJoinSlotIdx]) ? raid.slotRoles[currentJoinSlotIdx] : '';
        const roleInfo = getTacticalRoleInfo(slotRole);
        const roleText = slotRole ? ` 【${roleInfo.icon ? roleInfo.icon + ' ' : ''}${slotRole}】` : '';
        const descEl = document.getElementById('join-slot-desc');
        if (descEl) {
            descEl.textContent = `報名席位：${teamName}第 ${slotNum} 位${roleText}。點選角色卡即可直接入座！`;
        }

        // Reset search input
        const searchInput = document.getElementById('roster-search-input');
        if (searchInput) searchInput.value = '';

        // Reset tab to Roster view by default
        if (typeof window.switchJoinModalTab === 'function') {
            window.switchJoinModalTab('roster');
        }

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
        const raid = raidsDB[raidId];
        const rawCreator = raid ? (raid.creator || '') : '';
        const creatorName = (rawCreator && rawCreator !== '未知' && rawCreator !== '隊長') ? rawCreator : '發起人';
        
        const isMaster = (typeof isAdmin === 'function' && isAdmin());
        const currentLoggedIn = (typeof getCurrentEffectiveUser === 'function') ? getCurrentEffectiveUser() : '';
        const isOwner = Boolean(currentLoggedIn && rawCreator && currentLoggedIn.toLowerCase() === rawCreator.toLowerCase());

        if (!isMaster && !isOwner) {
            alert(`請聯絡【${creatorName}】`);
            return;
        }

        if (confirm(`確定要退出/移除角色「${memberName}」嗎？`)) {
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
            const raidMembers = raid.members || [];
            const firstMemberName = (raidMembers[0] && raidMembers[0].name) ? raidMembers[0].name : '';
            const currentLoggedIn = getCurrentEffectiveUser();
            let effectiveCreator = (raid.creator && raid.creator !== '隊長' && raid.creator !== '未知') ? raid.creator : (firstMemberName || currentLoggedIn || '公會成員');

            const newTeam = {
                id: raid.id || ('team_' + Date.now()),
                boss: raid.boss,
                timeslot: raid.time,
                timeText: raid.time,
                date: raid.date || '',
                timeStr: raid.timeStr || '',
                scheduledTimestamp: raid.scheduledTimestamp || Date.now(),
                members: raidMembers,
                gamesCount: raid.gamesCount || 7,
                note: raid.note || '',
                slotRoles: raid.slotRoles || {},
                rolledChannels: [Math.floor(Math.random() * 2000) + 1],
                finalChannel: null,
                creator: effectiveCreator,
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

    window.copyRaidToCreate = function(raidId) {
        const raid = raidsDB[raidId];
        if (!raid) {
            alert('找不到該隊伍資料！');
            return;
        }
        if (typeof window.openCreateRaidModal === 'function') {
            window.openCreateRaidModal(raid.boss, raid);
        }
    };

    window.editRaid = function(raidId) {
        const raid = raidsDB[raidId];
        if (!raid) {
            alert('找不到該隊伍資料！');
            return;
        }

        const loggedUser = getCurrentEffectiveUser();
        const isOwner = Boolean(loggedUser && raid.creator && loggedUser.toLowerCase() === raid.creator.toLowerCase());
        const isMaster = (typeof isAdmin === 'function' && isAdmin());
        if (!isOwner && !isMaster) {
            alert('⚠️ 編輯出團隊伍僅限管理員或隊伍建立者！請先以管理員身分登入。');
            const adminAuthBtn = document.getElementById('btn-admin-auth');
            if (adminAuthBtn) adminAuthBtn.click();
            return;
        }

        const modal = document.getElementById('survey-predraft-modal');
        if (!modal) {
            alert('找不到預排視窗元件！');
            return;
        }

        preDraftState.editingRaidId = raidId;

        // Parse date and time accurately
        const parsedDateTime = parseTeamOrRaidDate(raid);
        const targetDateObj = parsedDateTime.dateObj;
        const targetTimeStr = parsedDateTime.timeStr;

        const [tHour] = targetTimeStr.split(':').map(Number);
        const period = (!isNaN(tHour) && tHour < 18) ? '午' : '晚';

        preDraftState.period = period;
        preDraftState.targetTimeStr = targetTimeStr;
        preDraftState.dateObj = targetDateObj;
        preDraftState.dateStr = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;

        const mNum = targetDateObj.getMonth() + 1;
        const dNum = targetDateObj.getDate();
        const dayNames = ['日','一','二','三','四','五','六'];
        const weekDay = dayNames[targetDateObj.getDay()];
        preDraftState.dateLabel = `${mNum}/${dNum}(${weekDay})`;

        preDraftState.boss = normalizeBossName(raid.boss || '克雷塞爾');
        preDraftState.games = parseInt(raid.gamesCount, 10) || 7;
        preDraftState.catFilter = 'all';
        preDraftState.searchKeyword = '';

        // Initialize slots
        const isDragonKing = isDragonKingBoss(preDraftState.boss);
        const maxSlots = isDragonKing ? 12 : 6;
        const newSlots = Array.from({ length: maxSlots }, (_, i) => ({
            slotIndex: i,
            name: '',
            job: '',
            level: '',
            roleTag: (raid.slotRoles && raid.slotRoles[i]) || ''
        }));

        if (Array.isArray(raid.members)) {
            raid.members.forEach(member => {
                if (member && typeof member.slotIndex === 'number' && member.slotIndex < maxSlots) {
                    newSlots[member.slotIndex] = {
                        slotIndex: member.slotIndex,
                        name: member.name || '',
                        job: member.job || '',
                        level: member.level || 120,
                        roleTag: member.roleTag || (raid.slotRoles && raid.slotRoles[member.slotIndex]) || ''
                    };
                }
            });
        }
        preDraftState.slots = newSlots;

        // Determine week, dayDef, and targetSlotDef for this raid's scheduled date & period
        const tue = getTuesdayOfWeek(targetDateObj);
        const targetWeekId = `${tue.getFullYear()}-${String(tue.getMonth() + 1).padStart(2, '0')}-${String(tue.getDate()).padStart(2, '0')}`;

        const weekDays = getWeekDaysDetails(targetWeekId);
        let dayDef = weekDays.find(d => 
            d.dateObj.getFullYear() === targetDateObj.getFullYear() &&
            d.dateObj.getMonth() === targetDateObj.getMonth() &&
            d.dateObj.getDate() === targetDateObj.getDate()
        );
        if (!dayDef) {
            const dayMap = [5, 6, 0, 1, 2, 3, 4];
            dayDef = weekDays[dayMap[targetDateObj.getDay()]] || weekDays[0];
        }

        let targetSlotDef = null;
        if (dayDef.isWeekend || dayDef.isSpecialHoliday) {
            targetSlotDef = (period === '午') ? dayDef.slots[0] : dayDef.slots[1];
        } else {
            targetSlotDef = dayDef.slots[0];
        }

        // Filter respondents specifically for this raid's scheduled timeslot
        const responses = Object.values(surveyResponses || {}).filter(r => {
            if (!isResponseMatchWeek(r, targetWeekId)) return false;
            return isUserSlotChecked(r.slots, targetSlotDef, dayDef);
        });

        preDraftState.availableRespondents = responses;

        // Set UI text & Badges
        const titleEl = document.getElementById('predraft-modal-title');
        if (titleEl) titleEl.textContent = '✏️ 編輯出團隊伍';

        const applyBtnText = document.getElementById('predraft-apply-btn-text');
        if (applyBtnText) applyBtnText.textContent = '💾 儲存隊伍修改';

        const charsTitle = document.getElementById('predraft-chars-section-title');
        if (charsTitle) charsTitle.textContent = '🎴 當天可出戰角色卡';

        const badgeEl = document.getElementById('predraft-timeslot-badge');
        if (badgeEl) {
            badgeEl.textContent = `📅 ${dayDef.dateLabel}【${period === '午' ? '下午' : '晚上'}】`;
        }

        const countBadge = document.getElementById('predraft-members-count-badge');
        if (countBadge) {
            countBadge.textContent = `可出團成員 ${responses.length} 人`;
        }

        // Init Boss Select
        const bossSelect = document.getElementById('predraft-boss-select');
        if (bossSelect) {
            bossSelect.innerHTML = BOSS_LIST.map(b => `
                <option value="${b.name}" ${b.name === preDraftState.boss ? 'selected' : ''}>${b.icon} ${b.name}</option>
            `).join('');
            bossSelect.onchange = () => {
                preDraftState.boss = bossSelect.value;
                const newMaxSlots = isDragonKingBoss(preDraftState.boss) ? 12 : 6;
                const updatedSlots = [];
                for (let i = 0; i < newMaxSlots; i++) {
                    updatedSlots.push(preDraftState.slots[i] || { slotIndex: i, name: '', job: '', level: '', roleTag: '' });
                }
                preDraftState.slots = updatedSlots;
                renderPreDraftSlots();
            };
        }

        // Init Games Select
        const gamesSelect = document.getElementById('predraft-games-select');
        if (gamesSelect) {
            gamesSelect.value = String(preDraftState.games || 7);
            gamesSelect.onchange = () => {
                preDraftState.games = parseInt(gamesSelect.value, 10) || 7;
            };
        }

        // Populate Date and Time dropdowns
        populatePreDraftDateSelect(targetDateObj);
        populatePreDraftTimeSelect(targetTimeStr);

        // Note Input
        const noteInput = document.getElementById('predraft-note-input');
        if (noteInput) {
            noteInput.value = raid.note || '';
        }

        // Search Input & Filter
        const searchInput = document.getElementById('predraft-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.oninput = () => {
                preDraftState.searchKeyword = searchInput.value || '';
                renderPreDraftAvailableCharacters();
            };
        }

        const catBtnGroup = document.getElementById('predraft-cat-filter-group');
        if (catBtnGroup) {
            catBtnGroup.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.cat === 'all');
                btn.onclick = () => {
                    catBtnGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    preDraftState.catFilter = btn.dataset.cat || 'all';
                    renderPreDraftAvailableCharacters();
                };
            });
        }

        renderPreDraftSlots();
        renderPreDraftAvailableCharacters();

        modal.style.display = 'flex';
    };

    window.editConfirmedTeam = function(team) {
        if (!team) {
            alert('找不到該隊伍資料！');
            return;
        }

        const loggedUser = getCurrentEffectiveUser();
        const isOwner = Boolean(loggedUser && team.creator && loggedUser.toLowerCase() === team.creator.toLowerCase());
        const isMaster = (typeof isAdmin === 'function' && isAdmin());
        if (!isOwner && !isMaster) {
            alert('⚠️ 編輯出團隊伍僅限管理員或隊伍建立者！請先以管理員身分登入。');
            const adminAuthBtn = document.getElementById('btn-admin-auth');
            if (adminAuthBtn) adminAuthBtn.click();
            return;
        }

        const modal = document.getElementById('survey-predraft-modal');
        if (!modal) {
            alert('找不到預排視窗元件！');
            return;
        }

        const actualIdx = confirmedTeams.indexOf(team);
        if (actualIdx === -1) {
            alert('找不到該隊伍資料！');
            return;
        }

        if (!team.id) {
            team.id = 'team_' + (team.createdAt || Date.now()) + '_' + Math.random().toString(36).substr(2, 6);
            saveDB();
        }

        preDraftState.editingRaidId = null;
        preDraftState.editingConfirmedTeamId = team.id;
        preDraftState.editingConfirmedTeamIndex = actualIdx;

        // Parse date and time accurately
        const parsedDateTime = parseTeamOrRaidDate(team);
        const targetDateObj = parsedDateTime.dateObj;
        const targetTimeStr = parsedDateTime.timeStr;

        const [tHour] = targetTimeStr.split(':').map(Number);
        const period = (!isNaN(tHour) && tHour < 18) ? '午' : '晚';

        preDraftState.period = period;
        preDraftState.targetTimeStr = targetTimeStr;
        preDraftState.dateObj = targetDateObj;
        preDraftState.dateStr = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;

        const mNum = targetDateObj.getMonth() + 1;
        const dNum = targetDateObj.getDate();
        const dayNames = ['日','一','二','三','四','五','六'];
        const weekDay = dayNames[targetDateObj.getDay()];
        preDraftState.dateLabel = `${mNum}/${dNum}(${weekDay})`;

        preDraftState.boss = normalizeBossName(team.boss || '克雷塞爾');
        preDraftState.games = parseInt(team.gamesCount, 10) || 7;
        preDraftState.catFilter = 'all';
        preDraftState.searchKeyword = '';

        // Initialize slots
        const isDragonKing = isDragonKingBoss(preDraftState.boss);
        const maxSlots = isDragonKing ? 12 : 6;
        const newSlots = Array.from({ length: maxSlots }, (_, i) => ({
            slotIndex: i,
            name: '',
            job: '',
            level: '',
            roleTag: (team.slotRoles && team.slotRoles[i]) || ''
        }));

        const teamMembers = team.members ? (Array.isArray(team.members) ? team.members : Object.values(team.members)) : [];
        teamMembers.forEach((member, idx) => {
            const sIdx = (member && typeof member.slotIndex === 'number') ? member.slotIndex : idx;
            if (member && sIdx < maxSlots) {
                newSlots[sIdx] = {
                    slotIndex: sIdx,
                    name: member.name || '',
                    job: member.job || '',
                    level: member.level || 120,
                    roleTag: member.roleTag || (team.slotRoles && team.slotRoles[sIdx]) || ''
                };
            }
        });
        preDraftState.slots = newSlots;

        // Determine week, dayDef, and targetSlotDef for this team's scheduled date & period
        const tue = getTuesdayOfWeek(targetDateObj);
        const targetWeekId = `${tue.getFullYear()}-${String(tue.getMonth() + 1).padStart(2, '0')}-${String(tue.getDate()).padStart(2, '0')}`;

        const weekDays = getWeekDaysDetails(targetWeekId);
        let dayDef = weekDays.find(d => 
            d.dateObj.getFullYear() === targetDateObj.getFullYear() &&
            d.dateObj.getMonth() === targetDateObj.getMonth() &&
            d.dateObj.getDate() === targetDateObj.getDate()
        );
        if (!dayDef) {
            const dayMap = [5, 6, 0, 1, 2, 3, 4];
            dayDef = weekDays[dayMap[targetDateObj.getDay()]] || weekDays[0];
        }

        let targetSlotDef = null;
        if (dayDef.isWeekend || dayDef.isSpecialHoliday) {
            targetSlotDef = (period === '午') ? dayDef.slots[0] : dayDef.slots[1];
        } else {
            targetSlotDef = dayDef.slots[0];
        }

        // Filter respondents specifically for this team's scheduled timeslot
        const responses = Object.values(surveyResponses || {}).filter(r => {
            if (!isResponseMatchWeek(r, targetWeekId)) return false;
            return isUserSlotChecked(r.slots, targetSlotDef, dayDef);
        });

        preDraftState.availableRespondents = responses;

        // Set UI text & Badges
        const titleEl = document.getElementById('predraft-modal-title');
        if (titleEl) titleEl.textContent = '✏️ 編輯已確認隊伍 (陣容與定位)';

        const applyBtnText = document.getElementById('predraft-apply-btn-text');
        if (applyBtnText) applyBtnText.textContent = '💾 儲存隊伍修改';

        const charsTitle = document.getElementById('predraft-chars-section-title');
        if (charsTitle) charsTitle.textContent = '🎴 當天可出戰角色卡';

        const badgeEl = document.getElementById('predraft-timeslot-badge');
        if (badgeEl) {
            badgeEl.textContent = `📅 ${dayDef.dateLabel}【${period === '午' ? '下午' : '晚上'}】`;
        }

        const countBadge = document.getElementById('predraft-members-count-badge');
        if (countBadge) {
            countBadge.textContent = `可出團成員 ${responses.length} 人`;
        }

        // Init Boss Select
        const bossSelect = document.getElementById('predraft-boss-select');
        if (bossSelect) {
            bossSelect.innerHTML = BOSS_LIST.map(b => `
                <option value="${b.name}" ${b.name === preDraftState.boss ? 'selected' : ''}>${b.icon} ${b.name}</option>
            `).join('');
            bossSelect.onchange = () => {
                preDraftState.boss = bossSelect.value;
                const newMaxSlots = isDragonKingBoss(preDraftState.boss) ? 12 : 6;
                const updatedSlots = [];
                for (let i = 0; i < newMaxSlots; i++) {
                    updatedSlots.push(preDraftState.slots[i] || { slotIndex: i, name: '', job: '', level: '', roleTag: '' });
                }
                preDraftState.slots = updatedSlots;
                renderPreDraftSlots();
            };
        }

        // Init Games Select
        const gamesSelect = document.getElementById('predraft-games-select');
        if (gamesSelect) {
            gamesSelect.value = String(preDraftState.games || 7);
            gamesSelect.onchange = () => {
                preDraftState.games = parseInt(gamesSelect.value, 10) || 7;
            };
        }

        // Populate Date and Time dropdowns
        populatePreDraftDateSelect(targetDateObj);
        populatePreDraftTimeSelect(targetTimeStr);

        // Note Input
        const noteInput = document.getElementById('predraft-note-input');
        if (noteInput) {
            noteInput.value = team.note || '';
        }

        // Search Input & Filter
        const searchInput = document.getElementById('predraft-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.oninput = () => {
                preDraftState.searchKeyword = searchInput.value || '';
                renderPreDraftAvailableCharacters();
            };
        }

        const catBtnGroup = document.getElementById('predraft-cat-filter-group');
        if (catBtnGroup) {
            catBtnGroup.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.cat === 'all');
                btn.onclick = () => {
                    catBtnGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    preDraftState.catFilter = btn.dataset.cat || 'all';
                    renderPreDraftAvailableCharacters();
                };
            });
        }

        renderPreDraftSlots();
        renderPreDraftAvailableCharacters();

        modal.style.display = 'flex';
    };

    // --- Tab 1: Recruitment Board (Boss Category & Teams View) ---
    window.selectBossCategory = function(bossName) {
        try {
            currentSelectedBoss = bossName;
            renderRecruitBoard();
            const mainCard = document.getElementById('tab-recruit');
            if (mainCard) {
                mainCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (err) {
            console.error('Error in selectBossCategory:', err);
            alert('進入隊伍清單失敗：' + err.message);
        }
    };

    window.openCreateModalForBoss = function(bossName) {
        window.openCreateRaidModal(bossName);
    };

    function getCreateLoginButtonHtml() {
        const loggedUser = getLoggedInUser();
        if (loggedUser) {
            return `<button onclick="openGeneralLoginModal()" class="btn-secondary" style="font-size: 0.88rem; padding: 0.5rem 0.9rem; border-radius: 8px; border: 1.5px solid #22c55e; background: #f0fdf4; color: #15803d; font-weight: 700; cursor: pointer; white-space: nowrap;" title="目前已登入：${escapeHtml(loggedUser)}，點擊切換">👤 ${escapeHtml(loggedUser)}</button>`;
        }
        if (isAdmin()) {
            const adminName = getAdminUser() || '管理員';
            return `<button onclick="openGeneralLoginModal()" class="btn-secondary" style="font-size: 0.88rem; padding: 0.5rem 0.9rem; border-radius: 8px; border: 1.5px solid #22c55e; background: #f0fdf4; color: #15803d; font-weight: 700; cursor: pointer; white-space: nowrap;" title="管理員權限已開通，點擊亦可登入專屬隊長帳號">👑 管理員 ${escapeHtml(adminName)} (已授權)</button>`;
        }
        return `<button onclick="openGeneralLoginModal()" class="btn-secondary" style="font-size: 0.88rem; padding: 0.5rem 0.9rem; border-radius: 8px; border: 1.5px solid #3b82f6; background: #eff6ff; color: #2563eb; font-weight: 700; cursor: pointer; white-space: nowrap;" title="登入或建立帳號以發起出團隊伍">👤 建立隊伍登入</button>`;
    }

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
                            <h2 style="margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                                <span style="color: #ff9800; font-weight: 700;">📋 突襲王專區</span>
                                <span style="font-size: 0.88rem; color: #ff9800; font-weight: 600; background: rgba(255, 152, 0, 0.12); border: 1px solid rgba(255, 152, 0, 0.3); padding: 0.2rem 0.65rem; border-radius: 16px;">(共 ${allActiveRaids.length} 組待組隊伍)</span>
                                <button type="button" onclick="window.selectBossCategory('ALL')" class="btn-secondary" style="font-size: 0.85rem; padding: 0.35rem 0.85rem; border-radius: 8px; border: 1.5px solid var(--primary-color); background: rgba(255, 117, 24, 0.12); color: var(--primary-color); font-weight: 700; cursor: pointer;" title="直接查看所有 Boss 的待組隊伍">
                                    👀 查看全部待組隊伍 (${allActiveRaids.length})
                                </button>
                            </h2>
                            <p class="subtitle" style="margin: 0.35rem 0 0 0; color: #64748b; font-size: 0.95rem;">請點選想討伐的 Boss 卡片查看隊伍，或點擊「查看全部待組隊伍」！</p>
                        </div>
                        <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
                            ${getCreateLoginButtonHtml()}
                            <button id="btn-open-create-modal" class="btn-primary" onclick="openCreateRaidModal()" style="font-size: 1.05rem; padding: 0.75rem 1.4rem; background: var(--success-color); border: none; border-radius: 8px; color: #111; font-weight: 700; cursor: pointer;">➕ 建立新出團</button>
                        </div>
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
                card.setAttribute('data-boss', b.name);
                card.setAttribute('onclick', `window.selectBossCategory('${escapeHtml(b.name)}')`);
                card.style.cursor = 'pointer';
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
                    <div style="margin-top: 1.2rem; display: flex; justify-content: flex-end; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.7rem;">
                        <button type="button" onclick="event.stopPropagation(); window.selectBossCategory('${escapeHtml(b.name)}')" style="background: none; border: none; color: var(--primary-color); font-weight: 700; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0;">
                            進入查看隊伍 ➔
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });
            return;
        }

        // --- View 2: Drill-Down View for Selected Boss ---
        const isShowAll = (currentSelectedBoss === 'ALL');
        const currentBossInfo = isShowAll
            ? { name: "全部待組隊伍", icon: "⚔️" }
            : (BOSS_LIST.find(b => matchesBoss(b.name, currentSelectedBoss)) || { name: currentSelectedBoss, icon: "⚔️" });

        const bossRaids = isShowAll 
            ? allRaids 
            : allRaids.filter(r => matchesBoss(r.boss, currentSelectedBoss));

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
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; gap: 0.8rem; overflow-x: auto; padding-bottom: 0.3rem;">
                        <div style="display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0;">
                            <button onclick="window.selectBossCategory(null)" class="btn-back-boss" title="返回 Boss 分類專區" style="cursor: pointer; padding: 0.45rem 0.75rem; font-size: 0.88rem; white-space: nowrap; flex-shrink: 0;">
                                ⬅ 返回
                            </button>
                            <div style="display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0;">
                                <span style="font-size: 1.5rem; line-height: 1;">${currentBossInfo.icon}</span>
                                <h2 style="margin: 0; font-size: 1.3rem; color: #ff9800; font-weight: 700; white-space: nowrap;">
                                    【${currentBossInfo.name}】待組隊伍
                                </h2>
                                <span style="background: rgba(255, 152, 0, 0.12); color: #ff9800; border: 1px solid rgba(255, 152, 0, 0.3); padding: 0.15rem 0.55rem; border-radius: 14px; font-size: 0.82rem; font-weight: 600; white-space: nowrap;">
                                    ${countBadge}
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0;">
                            ${getCreateLoginButtonHtml()}
                            <button onclick="openCreateModalForBoss('${isShowAll ? '普通拉圖斯' : currentBossInfo.name}')" class="btn-primary" style="font-size: 0.92rem; padding: 0.5rem 1.1rem; background: var(--success-color); border: none; border-radius: 8px; color: #111; font-weight: 700; cursor: pointer; white-space: nowrap;">
                                ➕ 建立出團
                            </button>
                        </div>
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
                    <div style="display: flex; gap: 0.6rem; align-items: center; justify-content: center; flex-wrap: wrap;">
                        ${getCreateLoginButtonHtml()}
                        <button onclick="openCreateModalForBoss('${currentBossInfo.name}')" class="btn-primary" style="font-size: 1rem; padding: 0.65rem 1.6rem; background: var(--success-color); border: none; border-radius: 8px; color: #111; font-weight: 700; cursor: pointer;">
                            ➕ 發起【${currentBossInfo.name}】出團
                        </button>
                    </div>
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
                <div style="display: flex; gap: 0.6rem; align-items: center; justify-content: center; flex-wrap: wrap;">
                    ${getCreateLoginButtonHtml()}
                    <button onclick="openCreateModalForBoss('${currentBossInfo.name}')" class="btn-primary" style="font-size: 1rem; padding: 0.65rem 1.6rem; background: var(--success-color); border: none; border-radius: 8px; color: #111; font-weight: 700; cursor: pointer;">
                        ➕ 發起【${currentBossInfo.name}】新出團
                    </button>
                </div>
            `;
            container.appendChild(emptyBanner);
        }

        const myCreatorName = getSavedCreator();

        const buildRaidCard = (raid, isExpired) => {
            const rawMembers = raid.members ? (Array.isArray(raid.members) ? raid.members : Object.values(raid.members)) : [];
            const members = rawMembers.filter(m => m !== null && m !== undefined);
            const isDragonKing = isDragonKingBoss(raid.boss);
            const maxSlots = isDragonKing ? 12 : (raid.maxPlayers || 6);
            const isFull = members.length >= maxSlots;

            const currentLoggedIn = (typeof getCurrentEffectiveUser === 'function') ? getCurrentEffectiveUser() : '';
            const firstMemberName = (members[0] && members[0].name) ? members[0].name : '';
            let displayCreator = (raid.creator && raid.creator !== '未知' && raid.creator !== '隊長') ? raid.creator : (firstMemberName || '公會成員');

            const renderSlot = (slotIdx) => {
                const m = members.find((item, index) => item && (item.slotIndex !== undefined ? item.slotIndex : index) === slotIdx);
                const slotNum = isDragonKing ? (slotIdx < 6 ? slotIdx + 1 : slotIdx - 5) : slotIdx + 1;
                const slotRole = (m && m.roleTag) ? m.roleTag : ((raid.slotRoles && raid.slotRoles[slotIdx]) ? raid.slotRoles[slotIdx] : '');
                const roleInfo = getTacticalRoleInfo(slotRole);

                let roleBadgeHtml = '';
                if (slotRole) {
                    roleBadgeHtml = `<span class="member-role-badge ${roleInfo.cssClass}" title="戰術定位">${roleInfo.icon ? roleInfo.icon + ' ' : ''}${escapeHtml(slotRole)}</span>`;
                }

                if (m) {
                    const isActuallyCreator = Boolean(m.name && displayCreator && String(m.name).toLowerCase() === String(displayCreator).toLowerCase());
                    if (isExpired) {
                        return `
                            <div style="background: rgba(255,255,255,0.03); padding: 0.45rem 0.55rem; border-radius: 8px; font-size: 0.88rem; display: flex; justify-content: space-between; align-items: center; gap: 0.3rem; border: 1px solid rgba(255,255,255,0.06); min-height: 40px; box-sizing: border-box;">
                                <div style="display: flex; align-items: center; flex-wrap: nowrap; overflow: hidden; white-space: nowrap; gap: 0.2rem; flex: 1; min-width: 0;">
                                    <strong style="color: #94a3b8; font-size: 0.86rem; flex-shrink: 0;">${m.job}</strong> 
                                    <span style="color: #cbd5e1; font-weight: 500; font-size: 0.86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.name}</span> 
                                    <span style="color: #64748b; font-size: 0.76rem; flex-shrink: 0;">(Lv.${m.level})</span>
                                    ${isActuallyCreator ? '<span style="color:#94a3b8; font-size:0.8rem; flex-shrink: 0;" title="團長">👑</span>' : ''}
                                    ${roleBadgeHtml}
                                </div>
                                <button onclick="leaveRaid('${raid.id}', '${m.name}')" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #94a3b8; border-radius: 50%; width: 20px; height: 20px; min-width: 20px; min-height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; cursor: pointer; flex-shrink: 0; padding: 0; line-height: 1;" title="移除此席位">✕</button>
                            </div>
                        `;
                    }
                    return `
                        <div style="background: rgba(255,255,255,0.08); padding: 0.45rem 0.55rem; border-radius: 8px; font-size: 0.88rem; display: flex; justify-content: space-between; align-items: center; gap: 0.3rem; border: 1px solid rgba(255,255,255,0.12); min-height: 40px; box-sizing: border-box;">
                            <div style="display: flex; align-items: center; flex-wrap: nowrap; overflow: hidden; white-space: nowrap; gap: 0.2rem; flex: 1; min-width: 0;">
                                <strong style="color: var(--primary-color); font-size: 0.86rem; flex-shrink: 0;">${m.job}</strong> 
                                <span style="color: #fff; font-weight: 600; font-size: 0.86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.name}</span> 
                                <span style="color: var(--text-muted); font-size: 0.76rem; flex-shrink: 0;">(Lv.${m.level})</span>
                                <span style="color:var(--primary-color); font-size:0.8rem; flex-shrink: 0;" title="團長">${isActuallyCreator ? '👑' : ''}</span>
                                ${roleBadgeHtml}
                            </div>
                            <button onclick="leaveRaid('${raid.id}', '${m.name}')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; border-radius: 50%; width: 20px; height: 20px; min-width: 20px; min-height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; cursor: pointer; flex-shrink: 0; padding: 0; line-height: 1; transition: all 0.15s ease;" onmouseover="this.style.background='#ef4444'; this.style.color='#fff';" onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#f87171';" title="退出或移除此席位">✕</button>
                        </div>
                    `;
                } else {
                    if (isExpired) {
                        return `
                            <div style="border: 1px dashed rgba(255,255,255,0.1); background: rgba(0, 0, 0, 0.2); padding: 0.65rem 0.8rem; border-radius: 8px; font-size: 0.85rem; color: #64748b; text-align: center; min-height: 44px; box-sizing: border-box; display: flex; align-items: center; justify-content: center;">未入座 (已流團)</div>
                        `;
                    }
                    const slotRoleText = slotRole ? ` - ${roleInfo.icon ? roleInfo.icon + ' ' : ''}${slotRole}` : '';
                    return `
                        <div onclick="openJoinModal('${raid.id}', ${slotIdx})" style="cursor: pointer; border: 1.5px dashed var(--primary-color); background: rgba(255, 117, 24, 0.08); padding: 0.65rem 0.8rem; border-radius: 8px; font-size: 0.85rem; color: var(--primary-color); text-align: center; font-weight: 700; transition: all 0.2s; min-height: 44px; box-sizing: border-box; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='rgba(255, 117, 24, 0.18)'" onmouseout="this.style.background='rgba(255, 117, 24, 0.08)'" title="點擊報名此位置 (第 ${slotNum} 位${slotRoleText})">➕ 點擊報名 (第 ${slotNum} 位${slotRoleText})</div>
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
                    <div style="display: flex; flex-direction: column; gap: 0.45rem; margin-top: auto; padding-top: 0.8rem;">
                        <div style="text-align: center; font-size: 0.85rem; color: #ef4444; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 0.65rem; font-weight: 600;">
                            ⏳ 時段已過．已流團
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="window.copyRaidToCreate('${raid.id}')" class="btn-secondary" style="flex: 1.2; min-width: 95px; border: 1px solid var(--primary-color); color: var(--primary-color); background: transparent; border-radius: 8px; padding: 0.6rem; font-size: 0.9rem; font-weight: bold; cursor: pointer;" title="以此隊伍名單重新開團">📋 複製重開</button>
                            <button onclick="window.editRaid('${raid.id}')" class="btn-secondary" style="flex: 1; min-width: 90px; border: 1px solid #3b82f6; color: #60a5fa; background: transparent; border-radius: 8px; padding: 0.6rem; font-size: 0.9rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.25rem;" title="修改時段重新編輯">✏️ 編輯隊伍</button>
                            <button onclick="deleteRaid('${raid.id}')" class="btn-secondary" style="flex: 0.8; min-width: 65px; border: 1px solid rgba(239,68,68,0.5); color: #ef4444; background: transparent; border-radius: 8px; padding: 0.6rem; font-size: 0.9rem; cursor: pointer;" title="提前手動刪除此流團紀錄">刪除</button>
                        </div>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div style="display: flex; flex-direction: column; gap: 0.45rem; margin-top: auto; padding-top: 0.8rem;">
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="confirmRaid('${raid.id}')" class="btn-primary" style="flex: 1.4; min-width: 110px; padding: 0.65rem; font-size: 0.95rem; font-weight: bold; background: var(--primary-color); border: none; border-radius: 8px; cursor: pointer; color: #fff;">✅ 確認出團</button>
                            <button onclick="window.copyRaidToCreate('${raid.id}')" class="btn-secondary" style="flex: 1; min-width: 95px; border: 1px solid var(--primary-color); color: var(--primary-color); background: transparent; border-radius: 8px; padding: 0.65rem; font-size: 0.9rem; font-weight: bold; cursor: pointer;" title="複製原班人馬建立新出團">📋 複製隊伍</button>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="window.editRaid('${raid.id}')" class="btn-secondary" style="flex: 1; min-width: 95px; border: 1px solid #3b82f6; color: #60a5fa; background: transparent; border-radius: 8px; padding: 0.6rem; font-size: 0.9rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.3rem;" title="編輯此出團隊伍設定與成員">✏️ 編輯隊伍</button>
                            <button onclick="deleteRaid('${raid.id}')" class="btn-secondary" style="flex: 1; min-width: 80px; border: 1px solid var(--danger-color); color: var(--danger-color); background: transparent; border-radius: 8px; padding: 0.6rem; font-size: 0.9rem; cursor: pointer;">刪除</button>
                        </div>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'glass-card' + (isDragonKing ? ' dragon-recruit-card' : '');
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.boxSizing = 'border-box';
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
                ? `<div style="display:flex; flex-direction: column; gap: 0.35rem; width: 100%;">
                     <div style="display:flex; justify-content: space-between; align-items: center;">
                       <h3 style="margin:0; color:#94a3b8; font-size: 1.18rem; font-weight: 800; line-height: 1.25;">[${bossTitleName}]${raid.gamesCount || 7}場 <span style="color: #ef4444; font-size: 0.8rem; font-weight: bold; background: rgba(239, 68, 68, 0.15); padding: 0.1rem 0.45rem; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3); margin-left: 0.2rem;">(流團)</span></h3>
                     </div>
                     <div style="font-weight:700; font-size: 1.05rem; color: #64748b; line-height: 1.25; text-decoration: line-through;" title="出團時間已過">${raid.time}</div>
                   </div>`
                : `<div style="display:flex; flex-direction: column; gap: 0.35rem; width: 100%;">
                     <div style="display:flex; justify-content: space-between; align-items: center;">
                       <h3 style="margin:0; color:var(--primary-color); font-size: 1.2rem; font-weight: 800; line-height: 1.25;">[${bossTitleName}]${raid.gamesCount || 7}場</h3>
                     </div>
                     <div style="font-weight:700; font-size: 1.05rem; color: #fff; line-height: 1.25;">${raid.time}</div>
                   </div>`;

            const noteBannerHtml = raid.note ? `
                <div class="raid-note-banner" style="color: ${isExpired ? '#94a3b8' : '#fed7aa'};">
                    <strong style="color: var(--primary-color); white-space: nowrap;">📝 出團備註：</strong>
                    <span>${escapeHtml(raid.note)}</span>
                </div>
            ` : '';

            card.innerHTML = `
                <div style="margin-bottom: 0.8rem; border-bottom: 1px solid ${isExpired ? 'rgba(255,255,255,0.08)' : 'var(--card-border)'}; padding-bottom: 0.6rem; min-height: 56px; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box;">
                    ${titleHtml}
                </div>
                ${noteBannerHtml}
                <div style="margin-bottom: 0.8rem; color: ${isExpired ? '#64748b' : 'var(--text-muted)'}; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; min-height: 24px; box-sizing: border-box;">
                    <span>發起人：<strong style="color: ${isExpired ? '#94a3b8' : '#fff'};">${displayCreator}</strong></span>
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

    // --- Confirmed Teams Weekly Report Modal State & Logic ---
    let currentConfirmedReportWeekId = '';

    function parseConfirmedTeamDate(team) {
        if (!team) return null;
        if (team.scheduledTimestamp && typeof team.scheduledTimestamp === 'number' && team.scheduledTimestamp > 0) {
            const d = new Date(team.scheduledTimestamp);
            if (!isNaN(d.getTime())) return d;
        }
        if (team.timeslot && typeof team.timeslot === 'string') {
            const parts = team.timeslot.split('-');
            if (parts.length >= 4) {
                const year = parseInt(parts[0], 10) || 0;
                const month = (parseInt(parts[1], 10) || 1) - 1;
                const day = parseInt(parts[2], 10) || 1;
                const row = parseInt(parts[3], 10) || 0;
                const hour = Math.floor(row / 2) + 8;
                const min = row % 2 === 0 ? 0 : 30;
                const d = new Date(year, month, day, hour, min);
                if (!isNaN(d.getTime())) return d;
            }
        }
        const str = team.timeText || team.timeslot || team.time || '';
        const m = str.match(/(?:(\d{4})[/-])?(\d{1,2})[/-](\d{1,2}).*?(\d{1,2}):(\d{2})/);
        if (m) {
            const year = m[1] ? parseInt(m[1], 10) : new Date().getFullYear();
            const month = parseInt(m[2], 10) - 1;
            const day = parseInt(m[3], 10);
            const hour = parseInt(m[4], 10);
            const min = parseInt(m[5], 10);
            const d = new Date(year, month, day, hour, min);
            if (!isNaN(d.getTime())) return d;
        }
        const ts = typeof getTeamTimestamp === 'function' ? getTeamTimestamp(team) : 0;
        if (ts > 0) {
            const d = new Date(ts);
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    }

    function getConfirmedReportWeekOptions() {
        const weekTeamsMap = new Map();

        if (Array.isArray(confirmedTeams)) {
            confirmedTeams.forEach(team => {
                if (!team) return;
                const d = parseConfirmedTeamDate(team);
                let weekId = '';
                let tue = null;
                if (d) {
                    tue = getTuesdayOfWeek(d);
                    weekId = formatDateISO(tue);
                } else if (team.weekId) {
                    weekId = team.weekId;
                    const parts = weekId.split('-');
                    if (parts.length === 3) {
                        tue = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    }
                }
                if (weekId && tue) {
                    if (!weekTeamsMap.has(weekId)) {
                        weekTeamsMap.set(weekId, { tueDate: tue, teams: [] });
                    }
                    weekTeamsMap.get(weekId).teams.push(team);
                }
            });
        }

        const now = new Date();
        const curTue = getTuesdayOfWeek(now);

        // If no confirmed teams exist at all, provide fallback for current ongoing week
        if (weekTeamsMap.size === 0) {
            const curWeekId = formatDateISO(curTue);
            const curMon = new Date(curTue.getTime() + 6 * 86400000);
            return [{
                weekId: curWeekId,
                tueDate: curTue,
                teamsCount: 0,
                isOngoing: true,
                isExpired: false,
                label: `📅 ${curTue.getMonth() + 1}/${curTue.getDate()}(二) ～ ${curMon.getMonth() + 1}/${curMon.getDate()}(一) 【本週進行中】`,
                shortLabel: `${curTue.getMonth() + 1}/${curTue.getDate()}(二) ~ ${curMon.getMonth() + 1}/${curMon.getDate()}(一)`
            }];
        }

        const allWeeks = [];
        weekTeamsMap.forEach((data, weekId) => {
            const tue = data.tueDate;
            const mon = new Date(tue.getTime() + 6 * 86400000);
            const monEnd = new Date(tue.getFullYear(), tue.getMonth(), tue.getDate() + 6, 23, 59, 59, 999);
            const isExpired = now > monEnd;
            const isOngoing = now >= tue && now <= monEnd;
            const teamsCount = data.teams.length;

            let tag = '';
            if (isOngoing) tag = ' 【本週進行中】';
            else if (isExpired) tag = ' 【歷史紀錄】';
            else tag = ' 【預排】';

            allWeeks.push({
                weekId: weekId,
                tueDate: tue,
                teamsCount: teamsCount,
                isOngoing: isOngoing,
                isExpired: isExpired,
                label: `📅 ${tue.getMonth() + 1}/${tue.getDate()}(二) ～ ${mon.getMonth() + 1}/${mon.getDate()}(一)${tag} (${teamsCount}隊)`,
                shortLabel: `${tue.getMonth() + 1}/${tue.getDate()}(二) ~ ${mon.getMonth() + 1}/${mon.getDate()}(一)`
            });
        });

        // Split into active/ongoing weeks vs expired historical weeks
        const activeWeeks = allWeeks.filter(w => !w.isExpired);
        const expiredWeeks = allWeeks.filter(w => w.isExpired);

        // Active weeks: ongoing week first, then upcoming weeks by soonest date
        activeWeeks.sort((a, b) => {
            if (a.isOngoing && !b.isOngoing) return -1;
            if (!a.isOngoing && b.isOngoing) return 1;
            return a.tueDate.getTime() - b.tueDate.getTime();
        });

        // Expired weeks: sorted at the bottom, newest expired week first
        expiredWeeks.sort((a, b) => b.tueDate.getTime() - a.tueDate.getTime());

        return [...activeWeeks, ...expiredWeeks];
    }

    window.openConfirmedReportModal = function() {
        const modal = document.getElementById('confirmed-report-modal');
        if (!modal) return;
        modal.style.display = 'flex';

        const weekOptions = getConfirmedReportWeekOptions();
        if (!currentConfirmedReportWeekId || !weekOptions.some(o => o.weekId === currentConfirmedReportWeekId)) {
            // Default to the first option (ongoing week with confirmed teams, or nearest active week)
            currentConfirmedReportWeekId = weekOptions[0] ? weekOptions[0].weekId : '';
        }

        const selectEl = document.getElementById('confirmed-report-week-select');
        if (selectEl) {
            selectEl.innerHTML = weekOptions.map(o => `
                <option value="${escapeHtml(o.weekId)}" ${o.weekId === currentConfirmedReportWeekId ? 'selected' : ''}>
                    ${escapeHtml(o.label)}
                </option>
            `).join('');

            selectEl.onchange = function() {
                currentConfirmedReportWeekId = this.value;
                renderConfirmedReportTable();
            };
        }

        renderConfirmedReportTable();
    };

    window.closeConfirmedReportModal = function() {
        const modal = document.getElementById('confirmed-report-modal');
        if (modal) modal.style.display = 'none';
    };

    function renderConfirmedReportTable() {
        const container = document.getElementById('confirmed-report-table-container');
        const badgeEl = document.getElementById('confirmed-report-total-badge');
        if (!container) return;

        const weekOptions = getConfirmedReportWeekOptions();
        if (!currentConfirmedReportWeekId) {
            const ongoingOpt = weekOptions.find(o => o.isOngoing);
            currentConfirmedReportWeekId = ongoingOpt ? ongoingOpt.weekId : (weekOptions[0] ? weekOptions[0].weekId : '');
        }

        const weekDays = getWeekDaysDetails(currentConfirmedReportWeekId);
        const currentUser = typeof getCurrentEffectiveUser === 'function' ? getCurrentEffectiveUser() : '';

        // Filter confirmed teams for this week
        const matchingTeams = (confirmedTeams || []).filter(team => {
            if (!team) return false;
            const d = parseConfirmedTeamDate(team);
            if (d) {
                const tue = getTuesdayOfWeek(d);
                return formatDateISO(tue) === currentConfirmedReportWeekId;
            }
            return team.weekId === currentConfirmedReportWeekId;
        });

        // Group matching teams by day (0 to 6)
        const dayTeams = [ [], [], [], [], [], [], [] ];
        let totalParticipations = 0;

        matchingTeams.forEach(team => {
            const teamDate = parseConfirmedTeamDate(team);
            let dayIdx = -1;
            if (teamDate) {
                dayIdx = weekDays.findIndex(wd => 
                    wd.dateObj.getFullYear() === teamDate.getFullYear() &&
                    wd.dateObj.getMonth() === teamDate.getMonth() &&
                    wd.dateObj.getDate() === teamDate.getDate()
                );
            }
            if (dayIdx === -1 && (team.timeText || team.timeslot || team.time)) {
                const fullText = (team.timeText || team.timeslot || team.time || '');
                dayIdx = weekDays.findIndex(wd => fullText.includes(wd.dateLabel.split('(')[0]));
            }

            const teamMembers = team.members ? (Array.isArray(team.members) ? team.members : Object.values(team.members)) : [];
            totalParticipations += teamMembers.length;

            if (dayIdx >= 0 && dayIdx < 7) {
                dayTeams[dayIdx].push(team);
            }
        });

        // Sort teams within each day by timestamp
        dayTeams.forEach(teams => {
            teams.sort((a, b) => (getTeamTimestamp(a) || 0) - (getTeamTimestamp(b) || 0));
        });

        if (badgeEl) {
            badgeEl.textContent = `已確認 ${matchingTeams.length} 隊 ｜ ${totalParticipations} 人次`;
        }

        if (matchingTeams.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem 1.5rem; color: #64748b;">
                    <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📅</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: #334155;">所選週次尚無任何已確認出團隊伍</div>
                    <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.35rem;">當團隊發佈並在「出團招募看板」點擊【確認出團】後，名單明細將自動統整於此。</div>
                </div>
            `;
            return;
        }

        const getBossNickname = (bossName) => {
            if (!bossName) return '出團';
            const b = String(bossName).trim();
            if (b.includes('困難拉圖斯') || b.includes('困拉')) return '困拉';
            if (b.includes('拉圖斯') || b.includes('普通拉圖斯') || b.includes('普拉')) return '普拉';
            if (b.includes('混沌暗黑龍王') || b.includes('混龍')) return '混龍';
            if (b.includes('暗黑龍王') || b.includes('龍王')) return '龍王';
            if (b.includes('克雷塞爾') || b.includes('樹王')) return '樹王';
            if (b.includes('困難炎魔') || b.includes('困炎')) return '困炎';
            if (b.includes('炎魔') || b.includes('普通炎魔') || b.includes('普炎')) return '普炎';
            if (b.includes('蝴蝶') || b.includes('露希妲')) return '蝴蝶';
            if (b.includes('皮卡丘') || b.includes('皮卡')) return '皮卡';
            return normalizeBossName(b).replace(/\[|\]/g, '').slice(0, 3);
        };

        const getBossBadgeIcon = (boss) => {
            const b = normalizeBossName(boss || '');
            if (b.includes('龍王')) return '🐲';
            if (b.includes('拉圖斯') || b.includes('拉')) return '🔮';
            if (b.includes('克雷塞爾') || b.includes('樹')) return '🌳';
            if (b.includes('炎魔') || b.includes('炎')) return '🔥';
            if (b.includes('蝴蝶') || b.includes('露希妲')) return '🦋';
            if (b.includes('皮卡丘') || b.includes('皮卡')) return '🐱';
            return '⚔️';
        };

        // Determine maxSlots across all teams (6 for regular bosses, 12 if Dragon King)
        let maxSlots = 6;
        matchingTeams.forEach(t => {
            if (isDragonKingBoss(t.boss)) maxSlots = Math.max(maxSlots, 12);
        });

        // Calculate total columns across the 7 days (days with 0 teams take 1 column, days with N teams take N columns)
        const totalColumns = dayTeams.reduce((sum, teams) => sum + Math.max(1, teams.length), 0);
        const colWidthPct = (100 / totalColumns).toFixed(3);

        // Build colgroup so all columns share the exact same width without forcing overflow
        let colgroupHtml = '<colgroup>';
        for (let i = 0; i < totalColumns; i++) {
            colgroupHtml += `<col style="width: ${colWidthPct}%;">`;
        }
        colgroupHtml += '</colgroup>';

        // Header Row 1: Dates (with colspan for multi-team days)
        const headerDatesThs = weekDays.map((wd, dIdx) => {
            const teams = dayTeams[dIdx];
            const colSpan = Math.max(1, teams.length);
            const isWeekend = wd.isWeekend || wd.isSpecialHoliday;
            let holBadge = '';
            if (wd.isSpecialHoliday) {
                const badgeText = (wd.holidayName && (wd.holidayName.includes('補') || wd.holidayName.includes('連假'))) ? '補' : (wd.holidayName ? wd.holidayName.slice(0, 2) : '補');
                holBadge = `<span class="matrix-holiday-corner-badge" style="background: #ef4444 !important; color: #ffffff !important;" title="${escapeHtml(wd.holidayName || '補假')}">${escapeHtml(badgeText)}</span>`;
            }

            return `
                <th colspan="${colSpan}" class="col-day ${isWeekend ? 'col-weekend' : ''}" style="position: relative;">
                    <span>${escapeHtml(wd.dateLabel)}</span>${holBadge}
                    ${teams.length > 1 ? `<span style="font-size: 0.72rem; background: rgba(37,99,235,0.12); color: #2563eb; padding: 1px 4px; border-radius: 8px; margin-left: 3px; font-weight: 800;">${teams.length}團</span>` : ''}
                </th>
            `;
        }).join('');

        // Header Row 2: Raid (突襲綽號) and Time (時間) directly under date
        const headerTeamsThs = weekDays.map((wd, dIdx) => {
            const teams = dayTeams[dIdx];
            if (teams.length === 0) {
                return `<th class="col-empty-team-header"><span style="color:#94a3b8; font-weight:normal;">無出團</span></th>`;
            }
            return teams.map((team) => {
                const boss = normalizeBossName(team.boss || '');
                const bossIcon = getBossBadgeIcon(boss);
                const bossNick = getBossNickname(boss);
                const gamesStr = team.gamesCount ? ` ${team.gamesCount}場` : '';
                const timeStr = team.timeText ? (team.timeText.match(/\d{1,2}:\d{2}/) ? team.timeText.match(/\d{1,2}:\d{2}/)[0] : '') : '';
                const channelStr = team.finalChannel ? `(${team.finalChannel}頻)` : (team.channels && team.channels !== '未指定' ? `(${team.channels}頻)` : '');
                const noteHtml = team.note ? `<div class="report-team-note" title="${escapeHtml(team.note)}">📝 ${escapeHtml(team.note)}</div>` : '';

                return `
                    <th class="col-team-header" title="${escapeHtml(boss)}${gamesStr}">
                        <div class="report-team-title">${bossIcon} ${bossNick}${gamesStr}</div>
                        <div class="report-team-time">⏰ ${timeStr} <span class="report-team-ch">${channelStr}</span></div>
                        ${noteHtml}
                    </th>
                `;
            }).join('');
        }).join('');

        // Body Rows: Slots 1 to maxSlots (No numbers 1.2.3, display Job, ID, Role)
        let rowsHtml = '';
        for (let slotIdx = 0; slotIdx < maxSlots; slotIdx++) {
            let rowCells = '';

            weekDays.forEach((wd, dIdx) => {
                const teams = dayTeams[dIdx];
                if (teams.length === 0) {
                    if (slotIdx === 0) {
                        rowCells += `<td rowspan="${maxSlots}" class="col-empty-cell"><span style="color:#cbd5e1; font-weight:500;">-</span></td>`;
                    }
                    return;
                }

                teams.forEach(team => {
                    const members = team.members ? (Array.isArray(team.members) ? team.members : Object.values(team.members)) : [];
                    const isDk = isDragonKingBoss(team.boss);

                    // For 6-person teams, if slotIdx >= 6, show blank
                    if (!isDk && slotIdx >= 6) {
                        rowCells += `<td class="col-slot-cell" style="background:#f8fafc; opacity:0.35;">-</td>`;
                        return;
                    }

                    const m = members.find((item, idx) => (item.slotIndex !== undefined ? item.slotIndex : idx) === slotIdx) || members[slotIdx];
                    const squadHeader = (isDk && slotIdx === 0) ? '<div class="squad-divider">第一隊</div>' : ((isDk && slotIdx === 6) ? '<div class="squad-divider">第二隊</div>' : '');

                    if (!m || !m.name) {
                        const reservedRole = (team.slotRoles && team.slotRoles[slotIdx]) ? team.slotRoles[slotIdx] : '';
                        const roleInfo = getTacticalRoleInfo(reservedRole);
                        const roleBadge = reservedRole ? `<span class="member-role-badge ${roleInfo.cssClass}">${roleInfo.icon ? roleInfo.icon + ' ' : ''}${escapeHtml(reservedRole)}</span>` : '';

                        rowCells += `
                            <td class="col-slot-cell is-empty-slot" style="text-align: center;">
                                ${squadHeader}
                                <div class="slot-inner" style="justify-content: center;">
                                    <span class="slot-empty-text">-</span>
                                    ${roleBadge}
                                </div>
                            </td>
                        `;
                    } else {
                        const name = String(m.name).trim();
                        const isMe = currentUser && name.toLowerCase() === currentUser.toLowerCase();
                        const roleTag = m.roleTag || ((team.slotRoles && team.slotRoles[slotIdx]) ? team.slotRoles[slotIdx] : '');
                        const roleInfo = getTacticalRoleInfo(roleTag);
                        const roleBadge = roleTag ? `<span class="member-role-badge ${roleInfo.cssClass}">${roleInfo.icon ? roleInfo.icon + ' ' : ''}${escapeHtml(roleTag)}</span>` : '';
                        const jobTag = m.job ? `<span class="slot-job-text" title="Lv.${m.level || '?'}">${escapeHtml(m.job)}</span>` : '';

                        rowCells += `
                            <td class="col-slot-cell ${isMe ? 'is-my-slot' : ''}">
                                ${squadHeader}
                                <div class="slot-inner">
                                    <div style="display:inline-flex; align-items:center; gap:2px; min-width:0; overflow:hidden; white-space:nowrap; flex:1;">
                                        ${jobTag}
                                        <span class="slot-member-name ${isMe ? 'is-me-name' : ''}">
                                            ${escapeHtml(name)}
                                            ${isMe ? '<small style="background:#22c55e; color:#fff; font-size:0.6rem; font-weight:800; padding:0 3px; border-radius:4px; margin-left:1px;">我</small>' : ''}
                                        </span>
                                    </div>
                                    ${roleBadge}
                                </div>
                            </td>
                        `;
                    }
                });
            });

            rowsHtml += `<tr class="report-slot-row">${rowCells}</tr>`;
        }

        // Footer Row: Squad capacity counts
        const footerTds = weekDays.map((wd, dIdx) => {
            const teams = dayTeams[dIdx];
            if (teams.length === 0) {
                return `<td class="col-empty-team-header" style="text-align:center; font-size:0.78rem; color:#94a3b8; font-weight:700;">-</td>`;
            }
            return teams.map(team => {
                const members = team.members ? (Array.isArray(team.members) ? team.members : Object.values(team.members)) : [];
                const maxCap = isDragonKingBoss(team.boss) ? 12 : 6;
                return `
                    <td style="text-align:center; padding:0.45rem 0.2rem; font-weight:800; font-size:0.82rem; color:#2563eb; background:#f8fafc;">
                        <span>👥 ${members.length} / ${maxCap} 人</span>
                    </td>
                `;
            }).join('');
        }).join('');

        container.innerHTML = `
            <table class="confirmed-report-table">
                ${colgroupHtml}
                <thead>
                    <tr class="report-header-dates">
                        ${headerDatesThs}
                    </tr>
                    <tr class="report-header-teams">
                        ${headerTeamsThs}
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        ${footerTds}
                    </tr>
                </tfoot>
            </table>
        `;
    }

    window.copyConfirmedReportText = function() {
        const weekOptions = getConfirmedReportWeekOptions();
        const opt = weekOptions.find(o => o.weekId === currentConfirmedReportWeekId) || weekOptions[0];
        const weekLabel = opt ? opt.label : currentConfirmedReportWeekId;
        const weekDays = getWeekDaysDetails(currentConfirmedReportWeekId);

        const matchingTeams = (confirmedTeams || []).filter(team => {
            if (!team) return false;
            const d = parseConfirmedTeamDate(team);
            if (d) {
                const tue = getTuesdayOfWeek(d);
                return formatDateISO(tue) === currentConfirmedReportWeekId;
            }
            return team.weekId === currentConfirmedReportWeekId;
        });

        matchingTeams.sort((a, b) => (getTeamTimestamp(a) || 0) - (getTeamTimestamp(b) || 0));

        let text = `【SoulMine 當週已確認出團名單】\n`;
        text += `${weekLabel}\n`;
        text += `共確認 ${matchingTeams.length} 隊出團\n`;
        text += `===============================\n\n`;

        weekDays.forEach(wd => {
            const dayTeams = matchingTeams.filter(team => {
                const td = parseConfirmedTeamDate(team);
                if (td) {
                    return wd.dateObj.getFullYear() === td.getFullYear() &&
                           wd.dateObj.getMonth() === td.getMonth() &&
                           wd.dateObj.getDate() === td.getDate();
                }
                const fullText = (team.timeText || team.timeslot || team.time || '');
                return fullText.includes(wd.dateLabel.split('(')[0]);
            });

            if (dayTeams.length > 0) {
                text += `📅 ● ${wd.dateLabel} (共 ${dayTeams.length} 隊)：\n`;
                dayTeams.forEach((t, tIdx) => {
                    const boss = normalizeBossName(t.boss || 'Boss');
                    const timeStr = t.timeText || t.time || '時間未定';
                    const channel = t.finalChannel ? ` (頻道: ${t.finalChannel})` : (t.channels && t.channels !== '未指定' ? ` (頻道: ${t.channels})` : '');
                    text += `  ▶ [隊伍 ${tIdx + 1}] [${boss}] ${t.gamesCount || 7}場 ⏰ ${timeStr}${channel}\n`;
                    if (t.note) {
                        text += `     📝 備註：${t.note}\n`;
                    }
                    const members = t.members ? (Array.isArray(t.members) ? t.members : Object.values(t.members)) : [];
                    text += `     👥 成員 (${members.length}人)：\n`;
                    members.forEach((m, mIdx) => {
                        const role = m.roleTag ? `【${m.roleTag}】` : '';
                        text += `        ${mIdx + 1}. [${m.job || '冒險者'}] ${m.name} (Lv.${m.level || '?'}) ${role}\n`;
                    });
                    text += `\n`;
                });
                text += `-------------------------------\n`;
            }
        });

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                alert("✅ 已成功複製當週已確認出團名單文字至剪貼簿！可直接傳送至 LINE 或 Discord！");
            }).catch(() => {
                prompt("請手動複製下方出團名單文字：", text);
            });
        } else {
            prompt("請手動複製下方出團名單文字：", text);
        }
    };

    // --- Tab 2: Confirmed & Historical Teams ---
    function renderConfirmedTeams() {
        const container = document.getElementById('confirmed-teams-container');
        const historyContainer = document.getElementById('historical-teams-container');
        if (container) container.innerHTML = '';
        if (historyContainer) historyContainer.innerHTML = '';

        const now = Date.now();
        const currentLoggedIn = getCurrentEffectiveUser();
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

            // Fallback for legacy teams missing creator: only if undefined or '隊長'/'未知'
            const teamMembers = team.members ? (Array.isArray(team.members) ? team.members : Object.values(team.members)) : [];
            const firstMemberName = (teamMembers[0] && teamMembers[0].name) ? teamMembers[0].name : '';
            if (!team.creator || team.creator === '隊長' || team.creator === '未知') {
                team.creator = firstMemberName || '公會成員';
                changed = true;
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
                const displayCreator = team.creator || currentLoggedIn || '公會成員';
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
                header.style.marginBottom = '1rem';
                header.style.borderBottom = '1px solid var(--card-border)';
                header.style.paddingBottom = '0.5rem';

                const timeDisplay = team.timeText ? team.timeText : window.formatSlotKeyToText(team.timeslot || "");
                const channelDisplay = team.finalChannel ? team.finalChannel : (team.channels && team.channels !== '未指定' ? team.channels : '');
                const channelInfo = channelDisplay ? `<span style="color: var(--primary-color); font-weight: bold; white-space: nowrap; display: inline-block; font-size: 1.05rem;">(頻道: ${channelDisplay})</span>` : '';

                header.innerHTML = `
                    <div style="display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.3rem 0.6rem; width: 100%;">
                        <h3 style="color: var(--primary-color); margin: 0; font-size: 1.15rem; font-weight: 800; line-height: 1.4;">[${bossName}]${team.gamesCount || 7}場 ${timeDisplay}</h3>
                        ${channelInfo}
                    </div>
                `;
                card.appendChild(header);

                // Note Banner in Confirmed Team Card
                if (team.note) {
                    const noteBanner = document.createElement('div');
                    noteBanner.style.background = '#fef3c7';
                    noteBanner.style.borderLeft = '4px solid #f59e0b';
                    noteBanner.style.padding = '0.55rem 0.85rem';
                    noteBanner.style.borderRadius = '6px';
                    noteBanner.style.marginBottom = '1rem';
                    noteBanner.style.fontSize = '0.88rem';
                    noteBanner.style.display = 'flex';
                    noteBanner.style.alignItems = 'flex-start';
                    noteBanner.style.gap = '0.4rem';
                    noteBanner.innerHTML = `
                        <strong style="color: #b45309; white-space: nowrap;">📝 出團備註：</strong>
                        <span style="color: #92400e; font-weight: 700;">${escapeHtml(team.note)}</span>
                    `;
                    card.appendChild(noteBanner);
                }

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
                        const slotRole = (member && member.roleTag) ? member.roleTag : ((team.slotRoles && team.slotRoles[memberIndex]) ? team.slotRoles[memberIndex] : '');
                        const isSeduce = slotRole && slotRole.includes('魅惑');
                        const isSmoke = slotRole && slotRole.includes('煙');

                        if (member) {
                            const isActuallyCreator = Boolean(member.name && displayCreator && member.name.toLowerCase() === displayCreator.toLowerCase());
                            let roleBadge = '';
                            if (slotRole) {
                                if (isSeduce) {
                                    roleBadge = `<span style="background:#fdf2f8; color:#db2777; border:1px solid #f472b6; padding:1px 5px; border-radius:10px; font-size:0.72rem; font-weight:800; margin-left:0.35rem;">💖 ${escapeHtml(slotRole)}</span>`;
                                } else if (isSmoke) {
                                    roleBadge = `<span style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; padding:1px 5px; border-radius:10px; font-size:0.72rem; font-weight:800; margin-left:0.35rem;">💨 ${escapeHtml(slotRole)}</span>`;
                                } else {
                                    roleBadge = `<span style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:1px 5px; border-radius:10px; font-size:0.72rem; font-weight:700; margin-left:0.35rem;">🏷️ ${escapeHtml(slotRole)}</span>`;
                                }
                            }

                            memberSlot.style.background = '#ffffff';
                            memberSlot.innerHTML = `
                                <div style="font-weight: 600; color: #4a4559; display: flex; align-items: center; flex-wrap: wrap;">
                                    <span>${escapeHtml(member.name)} ${isActuallyCreator ? '👑' : ''}</span>
                                    ${roleBadge}
                                </div>
                                <div style="font-size: 0.85rem; color: #4a4559;">Lv.${member.level || '?'} / ${escapeHtml(member.job || '冒險家')}</div>
                            `;
                        } else {
                            const emptyRoleText = slotRole ? ` (${slotRole})` : '';
                            memberSlot.style.background = 'transparent';
                            memberSlot.style.borderStyle = 'dashed';
                            memberSlot.style.display = 'flex';
                            memberSlot.style.alignItems = 'center';
                            memberSlot.style.justifyContent = 'center';
                            memberSlot.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">(空位${emptyRoleText})</span>`;
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

                // Creator & Action options (複製隊伍 / 刪除紀錄)
                const footer = document.createElement('div');
                footer.style.display = 'flex';
                footer.style.justifyContent = 'space-between';
                footer.style.alignItems = 'center';
                footer.style.marginTop = '1rem';
                footer.style.flexWrap = 'wrap';
                footer.style.gap = '0.6rem';

                footer.innerHTML = `
                    <span style="font-size: 0.85rem; color: var(--text-muted);">建立者: ${displayCreator}</span>
                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="copy-team-btn" style="background: var(--primary-color); border: none; color: #fff; border-radius: 6px; padding: 0.35rem 0.85rem; cursor: pointer; font-size: 0.85rem; font-weight: bold; display: flex; align-items: center; gap: 0.3rem;" title="複製原班人馬建立新出團">
                            📋 複製隊伍
                        </button>
                        <button type="button" class="edit-team-btn" style="background: transparent; border: 1px solid #3b82f6; color: #60a5fa; border-radius: 6px; padding: 0.35rem 0.85rem; cursor: pointer; font-size: 0.85rem; font-weight: bold; display: flex; align-items: center; gap: 0.25rem;" title="編輯調整成員站位與戰術定位">
                            ✏️ 編輯隊伍
                        </button>
                        <button type="button" class="delete-team-btn" style="background: transparent; border: 1px solid var(--danger-color); color: #ff6666; border-radius: 6px; padding: 0.35rem 0.8rem; cursor: pointer; font-size: 0.85rem;">
                            刪除紀錄
                        </button>
                    </div>
                `;

                const copyBtn = footer.querySelector('.copy-team-btn');
                if (copyBtn) {
                    copyBtn.onclick = () => {
                        window.openCreateRaidModal(team.boss, team);
                    };
                }

                const editBtn = footer.querySelector('.edit-team-btn');
                if (editBtn) {
                    editBtn.onclick = () => {
                        window.editConfirmedTeam(team);
                    };
                }

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

        // Auto-refresh confirmed report table if modal is visible
        const confirmedReportModal = document.getElementById('confirmed-report-modal');
        if (confirmedReportModal && confirmedReportModal.style.display !== 'none' && typeof renderConfirmedReportTable === 'function') {
            renderConfirmedReportTable();
        }
    }

    // --- Admin Authentication & Controls ---
    function getAdminUser() {
        const u = localStorage.getItem('soulmine_admin_user') || sessionStorage.getItem('artale_admin_user');
        if (!u) {
            if (localStorage.getItem('soulmine_is_admin') === 'true') return '管理員';
            return null;
        }
        const lower = u.toLowerCase();
        if (lower === 'lumi') return 'Lumi';
        if (lower === 'eric') return 'Eric';
        if (lower === 'ohni' || lower === '阿甘') return '阿甘';
        return u;
    }

    function isAdmin() {
        return !!getAdminUser() || 
               localStorage.getItem('soulmine_is_admin') === 'true' || 
               !!localStorage.getItem('soulmine_admin_user') || 
               !!sessionStorage.getItem('artale_admin_user');
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
            userBtn.style.display = 'inline-flex';
            if (loggedUser) {
                userBtn.innerHTML = `👤 ${escapeHtml(loggedUser)} (登出)`;
                userBtn.title = '點擊登出目前使用者';
                userBtn.style.borderColor = '#22c55e';
                userBtn.style.background = '#f0fdf4';
                userBtn.style.color = '#15803d';
                userBtn.onclick = () => {
                    if (confirm(`確定要登出使用者 (${loggedUser}) 嗎？`)) {
                        setLoggedInUser(null);
                        alert('已退出登入。');
                        updateAdminUI();
                    }
                };
            } else if (!isAdmin()) {
                userBtn.innerHTML = `👤 建立隊伍登入`;
                userBtn.title = '點擊登入或建立帳號以發起出團隊伍';
                userBtn.style.borderColor = '#3b82f6';
                userBtn.style.background = '#eff6ff';
                userBtn.style.color = '#2563eb';
                userBtn.onclick = () => {
                    if (typeof openGeneralLoginModal === 'function') {
                        openGeneralLoginModal();
                    }
                };
            } else {
                userBtn.innerHTML = `👤 建立隊伍登入 (已具管理權限)`;
                userBtn.title = '目前已具備管理員建隊權限，亦可點此登入或切換專屬隊長帳號';
                userBtn.style.borderColor = '#22c55e';
                userBtn.style.background = '#f0fdf4';
                userBtn.style.color = '#15803d';
                userBtn.onclick = () => {
                    if (typeof openGeneralLoginModal === 'function') {
                        openGeneralLoginModal();
                    }
                };
            }
        }

        // 6. Refresh recruit board and survey summary matrix
        if (typeof renderRecruitBoard === 'function') {
            const recruitTab = document.getElementById('tab-recruit');
            if (recruitTab && recruitTab.classList.contains('active')) {
                renderRecruitBoard();
            }
        }
        if (typeof renderSurveySummary === 'function') {
            renderSurveySummary();
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
