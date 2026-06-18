/* =========================================================
   app.js  (BaseAlert)
   - 초기화 / 화면 전환(로그인↔앱) / 뷰 라우팅
   - 공통 UI: 모달, 확인창, 토스트
   - 실시간 감시(monitor) 시작·정지
   ========================================================= */

(function () {
  const $ = s => document.querySelector(s);

  /* ---------- 토스트 (HTML 허용 + 지속시간) ---------- */
  BA.toast = function (msg, type, duration) {
    const wrap = $('#toast-wrap');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = msg;                      // 내용은 내부 상수/시드에서 생성(외부 입력 아님)
    wrap.appendChild(el);
    const dur = duration || 2800;
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; }, dur);
    setTimeout(() => el.remove(), dur + 400);
  };

  /* ---------- 모달 ---------- */
  BA.modal = {
    open({ title, bodyHTML, onMount }) {
      $('#modal-title').textContent = title;
      $('#modal-body').innerHTML = bodyHTML;
      $('#modal-root').classList.remove('hidden');
      if (typeof onMount === 'function') onMount($('#modal-body'));
    },
    close() { $('#modal-root').classList.add('hidden'); $('#modal-body').innerHTML = ''; }
  };

  /* ---------- 확인창 ---------- */
  BA.confirm = function (message, onYes) {
    BA.modal.open({
      title: '확인',
      bodyHTML: `<p class="confirm-text">${message}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="c-no">취소</button>
          <button class="btn btn-danger" id="c-yes">삭제</button>
        </div>`,
      onMount(body) {
        body.querySelector('#c-no').addEventListener('click', BA.modal.close);
        body.querySelector('#c-yes').addEventListener('click', () => { BA.modal.close(); onYes && onYes(); });
      }
    });
  };

  /* ---------- 라우팅 ---------- */
  const TITLES = { dashboard: '대시보드', games: '경기 검색', seats: '좌석 현황', alerts: '내 알림', log: '알림 기록' };

  function switchView(name) {
    const navName = name === 'seats' ? 'games' : name;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === navName));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
    $('#page-title').textContent = TITLES[name] || 'BaseAlert';
    closeSidebar();

    if (name === 'log') { BA.state.unseen = 0; refreshBadges(); }
    refreshAll();
  }
  BA.app = BA.app || {};
  BA.app.switchView = switchView;

  /* ---------- 전체 갱신 ---------- */
  function refreshAll() {
    BA.dashboard.renderDash();
    BA.games.renderGames();
    if (BA.state.currentGameId) BA.games.renderSeats();
    BA.alerts.renderAlerts();
    BA.dashboard.renderLog();
    refreshBadges();
  }
  function refreshBadges() { BA.dashboard.updateBadges(); }
  BA.app.refreshAll = refreshAll;
  BA.app.refreshBadges = refreshBadges;

  /* ---------- 모바일 사이드바 ---------- */
  function openSidebar() { $('#sidebar').classList.add('open'); $('#backdrop').classList.add('show'); }
  function closeSidebar() { $('#sidebar').classList.remove('open'); $('#backdrop').classList.remove('show'); }

  /* ---------- 화면 전환 ---------- */
  BA.app.showApp = function () {
    const u = BA.store.currentUser();
    if (!u) return BA.app.showAuth();
    BA.seed.ensureGames();
    $('#auth-screen').classList.add('hidden');
    $('#app-screen').classList.remove('hidden');
    $('#user-name').textContent = u.nickname;
    $('#user-email').textContent = u.email;
    $('#user-avatar').textContent = (u.nickname || 'U').charAt(0);
    BA.state.unseen = 0;
    switchView('dashboard');
    BA.monitor.start();     // 실시간 감시 시작
    BA.monitor.kick();      // 곧바로 한 번 흔들어 변화를 보여줌
  };
  BA.app.showAuth = function () {
    BA.monitor.stop();
    BA.store.clearSession();
    BA.state.currentGameId = null;
    $('#app-screen').classList.add('hidden');
    $('#auth-screen').classList.remove('hidden');
  };

  /* ---------- 이벤트 바인딩 ---------- */
  function bindEvents() {
    document.querySelectorAll('.nav-item').forEach(n =>
      n.addEventListener('click', () => switchView(n.dataset.view)));
    document.querySelectorAll('[data-go]').forEach(b =>
      b.addEventListener('click', () => switchView(b.dataset.go)));

    $('#logout-btn').addEventListener('click', () => { BA.app.showAuth(); BA.toast('로그아웃 되었습니다.'); });
    $('#notify-btn').addEventListener('click', () => switchView('log'));
    $('#seats-back').addEventListener('click', () => switchView('games'));
    $('#clear-log').addEventListener('click', () => {
      if (!BA.store.getLogs().length) return BA.toast('비울 기록이 없어요.', 'warn');
      BA.confirm('알림 기록을 모두 비울까요?', () => { BA.store.clearLogs(); BA.toast('기록을 비웠어요.', 'warn'); refreshAll(); });
    });

    // 경기 필터
    ['#filter-team', '#filter-date', '#filter-stadium'].forEach(sel =>
      $(sel).addEventListener('change', () => BA.games.renderGames()));

    // 모바일 사이드바
    $('#menu-toggle').addEventListener('click', openSidebar);
    $('#backdrop').addEventListener('click', closeSidebar);

    // 모달 닫기
    $('#modal-close').addEventListener('click', BA.modal.close);
    $('#modal-backdrop').addEventListener('click', BA.modal.close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('#modal-root').classList.contains('hidden')) BA.modal.close();
    });
  }

  /* ---------- 시작 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    BA.state.unseen = BA.state.unseen || 0;
    BA.auth.init();
    bindEvents();
    if (BA.store.currentUser()) BA.app.showApp();
    else $('#auth-screen').classList.remove('hidden');
  });
})();
