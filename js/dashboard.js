/* =========================================================
   dashboard.js  (BaseAlert)
   - 대시보드: 요약 카드 + 감시 목록 + 최근 빈자리 알림
   - 알림 기록(로그) 화면
   - 배지/브라우저 알림 권한 안내
   ========================================================= */

BA.dashboard = (function () {
  const $ = s => document.querySelector(s);
  const U = BA.util;
  const esc = U.esc;

  function teamBadge(name) {
    const t = U.team(name);
    return `<span class="team-badge" style="background:${t.color}">${esc(t.short)}</span>`;
  }

  /* ---------- 대시보드 ---------- */
  function renderDash() {
    const now = Date.now();
    const games = BA.store.getGames();
    const upcoming = games.filter(g => new Date(g.date).getTime() > now);
    const todayStr = U.localDay();
    const todayGames = games.filter(g => U.localDay(g.date) === todayStr).length;
    const alerts = BA.store.getAlerts();
    const activeAlerts = alerts.filter(a => a.active);
    const logs = BA.store.getLogs();

    renderNotifBanner();

    $('#dash-cards').innerHTML = `
      <div class="stat-card accent-navy"><div class="num">${activeAlerts.length}</div><div class="lbl">감시 중인 알림</div></div>
      <div class="stat-card accent-live"><div class="num">${logs.length}</div><div class="lbl">빈자리 발견(누적)</div></div>
      <div class="stat-card accent-green"><div class="num">${todayGames}</div><div class="lbl">오늘 경기</div></div>
      <div class="stat-card accent-amber"><div class="num">${upcoming.length}</div><div class="lbl">예정 경기</div></div>`;

    // 감시 목록(미니)
    if (!activeAlerts.length) {
      $('#dash-alerts').innerHTML = `<div class="empty" style="padding:28px 16px"><div class="em-ico">🔔</div><p>감시 중인 알림이 없어요.<br>경기를 찾아 빈자리 알림을 신청해 보세요.</p></div>`;
    } else {
      $('#dash-alerts').innerHTML = activeAlerts.slice(0, 5).map(a => {
        const g = BA.store.getGame(a.gameId); if (!g) return '';
        const sec = g.sections.find(s => s.name === a.section);
        const hit = sec && sec.remaining > 0 && sec.price <= a.maxPrice;
        return `<div class="alert-mini">
          ${teamBadge(g.home)}
          <span class="am-title" title="${esc(g.away)} vs ${esc(g.home)}">${esc(g.away)} vs ${esc(g.home)}</span>
          <span class="badge section">${esc(a.section)}</span>
          ${hit ? `<span class="badge found">빈자리!</span>` : `<span class="badge watch">감시 중</span>`}
        </div>`;
      }).join('');
    }

    // 최근 빈자리 알림(미니)
    renderLogInto($('#dash-log'), logs.slice(0, 5), true);
  }

  /* ---------- 알림 기록(전체) ---------- */
  function renderLog() {
    const logs = BA.store.getLogs();
    renderLogInto($('#full-log'), logs, false);
  }

  function renderLogInto(box, logs, mini) {
    if (!logs.length) {
      box.innerHTML = `<div class="empty" style="padding:${mini ? '28px 16px' : '50px 20px'}"><div class="em-ico">📭</div><p>아직 발송된 알림이 없어요.<br>감시 중인 구역에 빈자리가 생기면 여기에 표시돼요.</p></div>`;
      return;
    }
    box.innerHTML = logs.map(l => `
      <div class="log-item">
        <span class="log-ico">⚾</span>
        <div class="log-body">
          <div class="log-title">${esc(l.match)} · ${esc(l.section)}</div>
          <div class="log-sub">${l.gameDate ? U.fmtGame(l.gameDate) + ' · ' : ''}${esc(l.stadium || '')} · ${U.won(l.price)} (잔여 ${Number(l.remaining).toLocaleString('ko-KR')}석)</div>
        </div>
        <span class="log-time">${U.ago(l.time)}</span>
      </div>`).join('');
  }

  /* ---------- 브라우저 알림 권한 배너 ---------- */
  function renderNotifBanner() {
    const view = $('#view-dashboard');
    let banner = $('#notif-banner');
    const supported = 'Notification' in window;
    const need = supported && Notification.permission === 'default';

    if (!need) { if (banner) banner.remove(); return; }
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'notif-banner';
      banner.className = 'panel';
      banner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap';
      view.insertBefore(banner, view.firstChild);
    }
    banner.innerHTML = `<span>🔔 브라우저 알림을 켜면 다른 탭을 보고 있어도 빈자리 알림을 받을 수 있어요.</span>
      <button class="btn btn-primary btn-sm" id="enable-notif">알림 켜기</button>`;
    banner.querySelector('#enable-notif').addEventListener('click', () => {
      Notification.requestPermission().then(p => {
        if (p === 'granted') BA.toast('브라우저 알림을 켰어요 🔔', 'ok');
        renderNotifBanner();
      });
    });
  }

  /* ---------- 배지 갱신 ---------- */
  function updateBadges() {
    const unseen = BA.state.unseen || 0;
    const dot = $('#notify-dot');
    const badge = $('#log-badge');
    dot.classList.toggle('hidden', unseen === 0);
    if (unseen > 0) { badge.textContent = unseen; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }

  return { renderDash, renderLog, updateBadges };
})();
