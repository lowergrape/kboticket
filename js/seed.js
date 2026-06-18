/* =========================================================
   seed.js  (BaseAlert)
   - KBO 경기 일정/좌석 데이터를 생성한다(실제 예매 API가 없으므로 데모용 가상 데이터).
   - 오늘부터 7일간, 하루 3경기씩 생성한다.
   - 일부 구역은 처음부터 '매진' 상태로 두어, 실시간 감시 시뮬레이션에서
     취소표(빈자리)가 발생하는 모습을 보여줄 수 있게 한다.
   ========================================================= */

BA.seed = (function () {
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 좌석 구역 생성(기준 데이터를 복제 + 잔여석 무작위 설정)
  function makeSections() {
    return BA.SECTION_TEMPLATE.map(s => {
      // 인기/저가 구역일수록 매진 확률을 높게
      const soldoutChance = s.price <= 20000 ? 0.55 : 0.3;
      const remaining = Math.random() < soldoutChance ? 0 : rand(1, Math.max(2, Math.floor(s.total * 0.15)));
      return { name: s.name, price: s.price, total: s.total, remaining };
    });
  }

  function makeGames() {
    const games = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 0; d < 7; d++) {
      const day = new Date(today);
      day.setDate(day.getDate() + d);
      const weekend = day.getDay() === 0 || day.getDay() === 6;

      // 그날 경기할 팀들을 섞어 3경기(6팀) 편성
      const teams = shuffle(BA.TEAMS);
      for (let g = 0; g < 3; g++) {
        const home = teams[g * 2];
        const away = teams[g * 2 + 1];
        if (!home || !away) break;

        const start = new Date(day);
        const hour = weekend ? pick([14, 17]) : 18;
        const min = weekend ? 0 : 30;
        start.setHours(hour, min, 0, 0);

        games.push({
          id: BA.util.uid(),
          date: start.toISOString(),
          home: home.name,
          away: away.name,
          stadium: home.stadium,
          sections: makeSections()
        });
      }
    }
    // 날짜순 정렬
    games.sort((a, b) => new Date(a.date) - new Date(b.date));
    return games;
  }

  // 경기 데이터가 없거나, 모든 경기가 과거이면 새로 생성한다.
  function ensureGames() {
    const games = BA.store.getGames();
    const now = Date.now();
    const hasFuture = games.some(g => new Date(g.date).getTime() > now - 3 * 3600000);
    if (!games.length || !hasFuture) {
      BA.store.setGames(makeGames());
    }
  }

  return { ensureGames, makeGames };
})();
