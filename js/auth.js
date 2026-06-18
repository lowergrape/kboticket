/* =========================================================
   auth.js  (BaseAlert)
   - 회원가입 / 로그인 / 로그아웃 / 세션 (PRD 기능 1)
   - 데모 계정 + 샘플 알림 시드
   ========================================================= */

BA.auth = (function () {
  const $ = s => document.querySelector(s);

  function initTabs() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const isLogin = tab.dataset.tab === 'login';
        $('#login-form').classList.toggle('hidden', !isLogin);
        $('#signup-form').classList.toggle('hidden', isLogin);
        $('#login-error').textContent = '';
        $('#signup-error').textContent = '';
      });
    });
  }

  function initSignup() {
    $('#signup-form').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      const email = f.email.value.trim();
      const nickname = f.nickname.value.trim();
      const pw = f.password.value;
      const pw2 = f.passwordConfirm.value;
      const err = $('#signup-error');
      err.textContent = '';

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = '올바른 이메일 형식을 입력해 주세요.'; return; }
      if (!nickname) { err.textContent = '닉네임을 입력해 주세요.'; return; }
      if (pw.length < 6) { err.textContent = '비밀번호는 6자 이상이어야 합니다.'; return; }
      if (pw !== pw2) { err.textContent = '비밀번호가 일치하지 않습니다.'; return; }
      if (BA.store.findUser(email)) { err.textContent = '이미 가입된 이메일입니다.'; return; }

      // ※ 학습용 데모이므로 비밀번호를 단순 저장합니다.
      //   실서비스라면 서버에서 해시 처리가 필요합니다.
      BA.store.addUser({ email, password: pw, nickname });
      BA.store.setSession(email);
      BA.toast('회원가입 완료! 환영합니다 ⚾', 'ok');
      BA.app.showApp();
      f.reset();
    });
  }

  function initLogin() {
    $('#login-form').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      const email = f.email.value.trim();
      const pw = f.password.value;
      const err = $('#login-error');
      err.textContent = '';

      const user = BA.store.findUser(email);
      if (!user || user.password !== pw) { err.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.'; return; }
      BA.store.setSession(user.email);
      BA.toast(`${user.nickname}님, 환영합니다 👋`, 'ok');
      BA.app.showApp();
      f.reset();
    });
  }

  function initDemo() {
    $('#demo-login').addEventListener('click', () => {
      const DEMO = 'demo@base.alert';
      BA.seed.ensureGames();                  // 경기 데이터 보장
      if (!BA.store.findUser(DEMO)) {
        BA.store.addUser({ email: DEMO, password: 'demo', nickname: '야구광' });
        BA.store.setSession(DEMO);
        seedDemoAlerts();
      } else {
        BA.store.setSession(DEMO);
      }
      BA.toast('데모 계정으로 둘러보는 중이에요 🚀', 'ok');
      BA.app.showApp();
    });
  }

  // 데모용 샘플 알림: 다가오는 경기 중 '매진' 구역 몇 개를 감시 대상으로 등록
  function seedDemoAlerts() {
    const now = Date.now();
    const games = BA.store.getGames().filter(g => new Date(g.date).getTime() > now);
    let added = 0;
    for (const g of games) {
      if (added >= 3) break;
      const soldout = g.sections.find(s => s.remaining === 0);
      if (soldout) {
        BA.store.saveAlert({
          gameId: g.id,
          section: soldout.name,
          maxPrice: soldout.price,
          active: true,
          found: false
        });
        added++;
      }
    }
  }

  function init() { initTabs(); initSignup(); initLogin(); initDemo(); }
  return { init };
})();
