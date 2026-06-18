/* =========================================================
   monitor.js  (BaseAlert) — 핵심 기능
   - 실시간 좌석 감시 시뮬레이션 (PRD 기능 5)
   - 빈자리 발견 시 알림 발송 (PRD 기능 6)

   ※ 실제 예매 사이트 API에 접근할 수 없으므로, 좌석 현황이 시간에 따라
     변하는 모습을 무작위로 시뮬레이션한다. 감시 중인 구역에 '취소표(빈자리)'가
     발생하면 즉시 알림(토스트 + 브라우저 알림 + 기록)을 발송한다.
   ========================================================= */

BA.monitor = (function () {
  const TICK_MS = 4500;          // 감시 주기
  let timer = null;
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  function start() {
    if (timer) return;
    timer = setInterval(tick, TICK_MS);
  }
  function stop() { clearInterval(timer); timer = null; }

  // 한 주기: 좌석 변화 → 알림 조건 비교 → 발송
  function tick() {
    const now = Date.now();
    const games = BA.store.getGames();
    let changed = false;

    // 1) 좌석 데이터 변화 (미래 경기만)
    games.forEach(g => {
      if (new Date(g.date).getTime() < now) return;
      g.sections.forEach(s => {
        const r = Math.random();
        if (s.remaining === 0) {
          // 매진 → 일정 확률로 취소표(빈자리) 발생
          if (r < 0.18) { s.remaining = rand(1, 3); changed = true; }
        } else {
          // 판매 중 → 더 팔리거나(감소) 추가 취소표(증가)
          if (r < 0.30) { s.remaining = Math.max(0, s.remaining - rand(1, 2)); changed = true; }
          else if (r < 0.40) { s.remaining += rand(1, 2); changed = true; }
        }
      });
    });
    if (changed) BA.store.setGames(games);

    // 2) 알림 조건 비교 & 발송
    const alerts = BA.store.getAlerts();
    let newHits = 0;
    alerts.forEach(a => {
      if (!a.active) return;
      const g = BA.store.getGame(a.gameId);
      if (!g || new Date(g.date).getTime() < now) return;
      const sec = g.sections.find(s => s.name === a.section);
      if (!sec) return;

      const met = sec.remaining > 0 && sec.price <= a.maxPrice;
      if (met && !a.found) {
        // 새로운 빈자리 발견 → 발송
        a.found = true;
        BA.store.saveAlert(a);
        fire(g, sec);
        newHits++;
      } else if (!met && a.found) {
        // 다시 매진/조건 미충족 → 다음 취소표를 위해 초기화
        a.found = false;
        BA.store.saveAlert(a);
      }
    });

    // 3) UI 갱신
    if (changed || newHits) BA.app.refreshAll();
    if (newHits) {
      BA.state.unseen = (BA.state.unseen || 0) + newHits;
      BA.app.refreshBadges();
    }
  }

  // 알림 발송: 기록 + 토스트 + 브라우저 알림
  function fire(g, sec) {
    const U = BA.util;
    const match = `${g.away} vs ${g.home}`;
    BA.store.addLog({ gameId: g.id, match, stadium: g.stadium, gameDate: g.date, section: sec.name, price: sec.price, remaining: sec.remaining });

    BA.toast(`<span class="t-title">⚾ 빈자리 발견!</span>${match} · ${sec.name} (잔여 ${sec.remaining}석)`, 'live', 5000);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⚾ BaseAlert · 빈자리 발견!', {
        body: `${match}\n${sec.name} · ${U.won(sec.price)} (잔여 ${sec.remaining}석)`,
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext y="82" font-size="84"%3E⚾%3C/text%3E%3C/svg%3E'
      });
    }
  }

  // 데모 체감용: 로그인 직후 한 번 좌석을 흔들어 빠르게 변화를 보여준다
  function kick() { setTimeout(tick, 1200); }

  return { start, stop, tick, kick };
})();
