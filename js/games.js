/* =========================================================
   games.js  (BaseAlert)
   - 경기 검색(팀/날짜/경기장 필터) — PRD 기능 2
   - 좌석 현황 조회(구역/가격/판매상태/잔여석) — PRD 기능 3
   ========================================================= */

BA.state = { currentGameId: null };

BA.games = (function () {
  const $ = s => document.querySelector(s);
  const U = BA.util;
  const esc = U.esc;

  /* ---------- 필터 select 채우기 ---------- */
  function fillFilters() {
    const games = BA.store.getGames();

    // 팀
    const teamSel = $('#filter-team');
    const tcur = teamSel.value || 'all';
    teamSel.innerHTML = '<option value="all">전체 팀</option>'
      + BA.TEAMS.map(t => `<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('');
    teamSel.value = [...teamSel.options].some(o => o.value === tcur) ? tcur : 'all';

    // 날짜
    const dateSel = $('#filter-date');
    const dcur = dateSel.value || 'all';
    const dates = [...new Set(games.map(g => U.localDay(g.date)))];
    dateSel.innerHTML = '<option value="all">전체 날짜</option>'
      + dates.map(d => {
        const dt = new Date(d + 'T00:00');
        return `<option value="${d}">${dt.getMonth() + 1}월 ${dt.getDate()}일(${U.DAYS[dt.getDay()]})</option>`;
      }).join('');
    dateSel.value = [...dateSel.options].some(o => o.value === dcur) ? dcur : 'all';

    // 경기장
    const stSel = $('#filter-stadium');
    const scur = stSel.value || 'all';
    const stadiums = [...new Set(games.map(g => g.stadium))];
    stSel.innerHTML = '<option value="all">전체 경기장</option>'
      + stadiums.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    stSel.value = [...stSel.options].some(o => o.value === scur) ? scur : 'all';
  }

  /* ---------- 경기 목록 ---------- */
  function getFiltered() {
    const team = $('#filter-team').value;
    const date = $('#filter-date').value;
    const stadium = $('#filter-stadium').value;
    return BA.store.getGames().filter(g => {
      if (team !== 'all' && g.home !== team && g.away !== team) return false;
      if (date !== 'all' && U.localDay(g.date) !== date) return false;
      if (stadium !== 'all' && g.stadium !== stadium) return false;
      return true;
    });
  }

  function teamBadge(name) {
    const t = U.team(name);
    return `<span class="team-badge" style="background:${t.color}">${esc(t.short)}</span>`;
  }

  function renderGames() {
    fillFilters();
    const list = getFiltered();
    $('#games-count').textContent = `총 ${list.length}경기`;
    const box = $('#game-list');

    if (!list.length) {
      box.innerHTML = `<div class="empty"><div class="em-ico">🔍</div><p>조건에 맞는 경기가 없습니다.<br>필터를 바꿔보세요.</p></div>`;
      return;
    }

    box.innerHTML = list.map(g => {
      const ok = g.sections.filter(s => s.remaining > 0).length;
      const no = g.sections.length - ok;
      return `<div class="game-card">
        <div class="game-date">📅 ${U.fmtGame(g.date)}</div>
        <div class="game-stadium">📍 ${esc(g.stadium)}</div>
        <div class="matchup">
          <div class="team away">${teamBadge(g.away)}<span class="tname">${esc(g.away)}</span></div>
          <span class="vs">VS</span>
          <div class="team">${teamBadge(g.home)}<span class="tname">${esc(g.home)}</span></div>
        </div>
        <div class="game-foot">
          <span class="game-seat-summary">판매중 <b class="ok">${ok}</b> · 매진 <b class="no">${no}</b></span>
          <button class="btn btn-primary btn-sm" data-seats="${g.id}">좌석 보기</button>
        </div>
      </div>`;
    }).join('');

    box.querySelectorAll('[data-seats]').forEach(b =>
      b.addEventListener('click', () => openSeats(b.dataset.seats)));
  }

  /* ---------- 좌석 현황 ---------- */
  function openSeats(gameId) {
    BA.state.currentGameId = gameId;
    BA.app.switchView('seats');   // 좌석 뷰로 전환(렌더는 switchView가 호출)
  }

  function renderSeats() {
    const g = BA.store.getGame(BA.state.currentGameId);
    if (!g) return;
    const myAlerts = BA.store.getAlerts();

    $('#seats-header').innerHTML = `
      <div class="sh-date">📅 ${U.fmtGame(g.date)}</div>
      <div class="sh-match">${teamBadge(g.away)} ${esc(g.away)} <span style="opacity:.6">VS</span> ${esc(g.home)} ${teamBadge(g.home)}</div>
      <div class="sh-stadium">📍 ${esc(g.stadium)}</div>`;

    $('#seat-list').innerHTML = g.sections.map(s => {
      const status = U.seatStatus(s.remaining);     // available | soldout
      const watching = myAlerts.find(a => a.gameId === g.id && a.section === s.name && a.active);

      let action;
      if (watching) {
        action = `<button class="btn btn-ghost btn-sm" data-go-alerts="1">✓ 감시 중</button>`;
      } else if (status === 'soldout') {
        action = `<button class="btn btn-live btn-sm" data-alert="${esc(s.name)}">🔔 빈자리 알림</button>`;
      } else {
        action = `<button class="btn btn-ghost btn-sm" data-alert="${esc(s.name)}">🔔 알림 설정</button>`;
      }

      return `<div class="seat-card ${status}">
        <div class="seat-info">
          <div class="seat-name">${esc(s.name)}</div>
          <div class="seat-price">${U.won(s.price)}</div>
        </div>
        <div class="seat-status">
          <span class="status-badge ${status}">${status === 'available' ? '판매 중' : '매진'}</span>
          <span class="seat-remain">${status === 'available' ? `잔여 ${s.remaining.toLocaleString('ko-KR')}석` : '잔여 0석'}</span>
        </div>
        <div>${action}</div>
      </div>`;
    }).join('');

    $('#seat-list').querySelectorAll('[data-alert]').forEach(b =>
      b.addEventListener('click', () => BA.alerts.openCreate(g.id, b.dataset.alert)));
    $('#seat-list').querySelectorAll('[data-go-alerts]').forEach(b =>
      b.addEventListener('click', () => BA.app.switchView('alerts')));
  }

  return { fillFilters, renderGames, openSeats, renderSeats };
})();
