/* =========================================================
   storage.js  (BaseAlert)
   - 데이터 계층: 브라우저 localStorage 사용 (서버/DB 없이 동작)
   - PRD의 CSV/딕셔너리 데이터 관리 역할을 localStorage가 대신한다.
   - KBO 경기/좌석 시드(seed) 데이터 + 공통 유틸 포함

   데이터 구조
     db = {
       users: [ { email, password, nickname } ],
       session: email | null,
       games: [ { id, date, home, away, stadium,
                  sections: [ { name, price, total, remaining } ] } ],
       data: {                       // 사용자별 데이터
         [email]: {
           alerts: [ { id, gameId, section, maxPrice, active, found, createdAt } ],
           logs:   [ { id, gameId, section, price, remaining, time } ]
         }
       }
     }
   ========================================================= */

window.BA = window.BA || {};

/* ---------- KBO 팀 / 좌석 기준 데이터 ---------- */
BA.TEAMS = [
  { name: 'LG 트윈스',   short: 'LG',  color: '#c30452', stadium: '서울 잠실야구장' },
  { name: '두산 베어스', short: '두산', color: '#1a1748', stadium: '서울 잠실야구장' },
  { name: '키움 히어로즈', short: '키움', color: '#820024', stadium: '서울 고척스카이돔' },
  { name: 'KT 위즈',     short: 'KT',  color: '#231f20', stadium: '수원 KT위즈파크' },
  { name: 'SSG 랜더스',  short: 'SSG', color: '#ce0e2d', stadium: '인천 SSG랜더스필드' },
  { name: 'NC 다이노스', short: 'NC',  color: '#315288', stadium: '창원 NC파크' },
  { name: 'KIA 타이거즈', short: 'KIA', color: '#ea0029', stadium: '광주 기아챔피언스필드' },
  { name: '롯데 자이언츠', short: '롯데', color: '#041e42', stadium: '부산 사직야구장' },
  { name: '삼성 라이온즈', short: '삼성', color: '#074ca1', stadium: '대구 삼성라이온즈파크' },
  { name: '한화 이글스', short: '한화', color: '#fc4e00', stadium: '대전 한화생명볼파크' }
];

BA.SECTION_TEMPLATE = [
  { name: '프리미엄석',       price: 70000, total: 200 },
  { name: '테이블석',         price: 55000, total: 240 },
  { name: '익사이팅존',       price: 45000, total: 180 },
  { name: '응원지정석(1루)',  price: 20000, total: 1200 },
  { name: '응원지정석(3루)',  price: 20000, total: 1200 },
  { name: '블루석',           price: 16000, total: 1500 },
  { name: '레드석',           price: 13000, total: 1800 },
  { name: '외야그린석',       price: 9000,  total: 2000 }
];

BA.store = (function () {
  const KEY = 'basealert_db_v1';

  function emptyDb() { return { users: [], session: null, games: [], data: {} }; }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyDb();
      const db = JSON.parse(raw);
      db.users = db.users || [];
      db.games = db.games || [];
      db.data = db.data || {};
      if (!('session' in db)) db.session = null;
      return db;
    } catch (e) {
      console.error('DB 읽기 실패, 초기화합니다.', e);
      return emptyDb();
    }
  }
  function write(db) { localStorage.setItem(KEY, JSON.stringify(db)); }

  /* ----- 사용자 / 세션 ----- */
  function findUser(email) {
    const e = email.trim().toLowerCase();
    return read().users.find(u => u.email.toLowerCase() === e);
  }
  function addUser(user) {
    const db = read();
    db.users.push(user);
    db.data[user.email] = { alerts: [], logs: [] };
    write(db);
  }
  function setSession(email) { const db = read(); db.session = email; write(db); }
  function clearSession() { const db = read(); db.session = null; write(db); }
  function currentUser() {
    const db = read();
    if (!db.session) return null;
    return db.users.find(u => u.email === db.session) || null;
  }

  /* ----- 경기(공유 데이터) ----- */
  function getGames() { return read().games; }
  function getGame(id) { return read().games.find(g => g.id === id) || null; }
  function setGames(games) { const db = read(); db.games = games; write(db); }

  /* ----- 사용자별 데이터 ----- */
  function bucket(db) {
    const e = db.session;
    if (!e) return null;
    if (!db.data[e]) db.data[e] = { alerts: [], logs: [] };
    return db.data[e];
  }

  function getAlerts() { const db = read(); const b = bucket(db); return b ? b.alerts : []; }

  function saveAlert(alert) {
    const db = read(); const b = bucket(db); if (!b) return;
    if (alert.id) {
      const i = b.alerts.findIndex(a => a.id === alert.id);
      if (i > -1) b.alerts[i] = alert;
    } else {
      alert.id = BA.util.uid();
      alert.createdAt = new Date().toISOString();
      b.alerts.push(alert);
    }
    write(db);
    return alert;
  }
  function deleteAlert(id) {
    const db = read(); const b = bucket(db); if (!b) return;
    b.alerts = b.alerts.filter(a => a.id !== id);
    write(db);
  }

  function getLogs() { const db = read(); const b = bucket(db); return b ? b.logs : []; }
  function addLog(log) {
    const db = read(); const b = bucket(db); if (!b) return;
    log.id = BA.util.uid();
    log.time = new Date().toISOString();
    b.logs.unshift(log);                 // 최신 알림이 위로
    if (b.logs.length > 100) b.logs.length = 100;
    write(db);
    return log;
  }
  function clearLogs() { const db = read(); const b = bucket(db); if (!b) return; b.logs = []; write(db); }

  return {
    findUser, addUser, setSession, clearSession, currentUser,
    getGames, getGame, setGames,
    getAlerts, saveAlert, deleteAlert,
    getLogs, addLog, clearLogs,
    _read: read, _write: write, _key: KEY
  };
})();


/* =========================================================
   BA.util : 공통 유틸리티
   ========================================================= */
BA.util = (function () {
  function uid() { return 'id-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36); }

  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  // 경기 시간 표시: "6월 20일(토) 18:30"
  function fmtGame(dt) {
    const d = new Date(dt);
    const p = n => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}월 ${d.getDate()}일(${DAYS[d.getDay()]}) ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // 시간만: "18:30"
  function fmtTime(iso) {
    const d = new Date(iso);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // 알림 기록 상대시간: "방금 전", "3분 전"
  function ago(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 10) return '방금 전';
    if (s < 60) return `${s}초 전`;
    if (s < 3600) return `${Math.floor(s / 60)}분 전`;
    if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
    return `${Math.floor(s / 86400)}일 전`;
  }
  function won(n) { return Number(n).toLocaleString('ko-KR') + '원'; }

  // 로컬 시간대 기준 'YYYY-MM-DD' (UTC 변환으로 인한 날짜 밀림 방지)
  function localDay(dateLike) {
    const d = dateLike ? new Date(dateLike) : new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function team(name) { return BA.TEAMS.find(t => t.name === name) || { name, short: name, color: '#64748b' }; }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 좌석 상태: 0 → 매진 / 그 외 → 판매중
  function seatStatus(remaining) { return remaining > 0 ? 'available' : 'soldout'; }

  return { uid, fmtGame, fmtTime, ago, won, localDay, team, esc, seatStatus, DAYS };
})();
