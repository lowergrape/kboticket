/* =========================================================
   alerts.js  (BaseAlert)
   - 빈자리 알림 설정/등록 — PRD 기능 4
   - 내 알림(감시 목록) 조회 / on·off / 삭제
   ========================================================= */

BA.alerts = (function () {
  const $ = s => document.querySelector(s);
  const U = BA.util;
  const esc = U.esc;

  function teamBadge(name) {
    const t = U.team(name);
    return `<span class="team-badge" style="background:${t.color}">${esc(t.short)}</span>`;
  }
  function matchLabel(g) { return `${g.away} vs ${g.home}`; }

  /* ---------- 알림 등록 모달 ---------- */
  function openCreate(gameId, sectionName) {
    const g = BA.store.getGame(gameId);
    if (!g) return;
    const sec = g.sections.find(s => s.name === sectionName);
    if (!sec) return;

    // 이미 같은 조건의 활성 알림이 있으면 막기
    if (BA.store.getAlerts().some(a => a.gameId === gameId && a.section === sectionName && a.active)) {
      BA.toast('이미 이 구역을 감시하고 있어요.', 'warn');
      BA.app.switchView('alerts');
      return;
    }

    BA.modal.open({
      title: '빈자리 알림 신청',
      bodyHTML: `
        <div class="form-grid">
          <div class="info-box">
            <div class="ib-row"><span>경기</span><b>${esc(matchLabel(g))}</b></div>
            <div class="ib-row"><span>일시</span><b>${U.fmtGame(g.date)}</b></div>
            <div class="ib-row"><span>구역</span><b>${esc(sec.name)}</b></div>
            <div class="ib-row"><span>현재 상태</span><b style="color:${sec.remaining > 0 ? 'var(--green)' : 'var(--gray)'}">${sec.remaining > 0 ? '판매 중' : '매진'}</b></div>
          </div>
          <label>희망 최대 가격 (이 금액 이하의 빈자리만 알림)
            <input type="number" id="a-price" value="${sec.price}" min="0" step="1000" />
          </label>
          <p class="muted" style="font-size:12.5px">정가는 ${U.won(sec.price)} 입니다. 원하는 상한가를 설정하세요.</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" id="a-cancel">취소</button>
            <button class="btn btn-live" id="a-save">🔔 알림 신청</button>
          </div>
        </div>`,
      onMount(body) {
        body.querySelector('#a-cancel').addEventListener('click', BA.modal.close);
        body.querySelector('#a-save').addEventListener('click', () => {
          const maxPrice = parseInt(body.querySelector('#a-price').value, 10) || sec.price;
          BA.store.saveAlert({ gameId, section: sectionName, maxPrice, active: true, found: false });
          BA.modal.close();
          BA.toast('빈자리 알림을 신청했어요! 실시간으로 감시할게요 🔔', 'ok');
          BA.app.refreshAll();
          BA.app.switchView('alerts');
        });
      }
    });
  }

  /* ---------- 내 알림 목록 ---------- */
  function renderAlerts() {
    const alerts = BA.store.getAlerts();
    const box = $('#alert-list');

    if (!alerts.length) {
      box.innerHTML = `<div class="empty"><div class="em-ico">🔔</div>
        <p>등록된 알림이 없습니다.<br><b>경기 검색</b>에서 원하는 구역의 빈자리 알림을 신청해 보세요.</p></div>`;
      return;
    }

    box.innerHTML = alerts.map(a => {
      const g = BA.store.getGame(a.gameId);
      if (!g) return '';
      const sec = g.sections.find(s => s.name === a.section);
      const remaining = sec ? sec.remaining : 0;
      const hit = a.active && remaining > 0 && sec.price <= a.maxPrice;  // 현재 빈자리 충족

      const statusBadge = !a.active
        ? `<span class="badge section">일시중지</span>`
        : hit
          ? `<span class="badge found">🎉 빈자리 ${remaining.toLocaleString('ko-KR')}석</span>`
          : `<span class="badge watch">감시 중</span>`;

      return `<div class="alert-card ${hit ? 'found' : ''} ${a.active ? '' : 'off'}">
        ${teamBadge(g.home)}
        <div class="alert-main">
          <div class="alert-match">${esc(matchLabel(g))}</div>
          <div class="alert-cond">
            <span class="badge section">${esc(a.section)}</span>
            <span>${U.fmtGame(g.date)}</span>
            <span>· ${U.won(a.maxPrice)} 이하</span>
            ${statusBadge}
          </div>
        </div>
        <div class="alert-actions">
          ${hit ? `<button class="btn btn-live btn-sm" data-book="${a.id}">예매하러 가기</button>` : ''}
          <label class="switch" title="알림 켜기/끄기">
            <input type="checkbox" data-toggle="${a.id}" ${a.active ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <button class="btn-icon" data-del="${a.id}" title="삭제">🗑️</button>
        </div>
      </div>`;
    }).join('');

    box.querySelectorAll('[data-toggle]').forEach(el =>
      el.addEventListener('change', () => {
        const a = BA.store.getAlerts().find(x => x.id === el.dataset.toggle);
        if (a) { a.active = el.checked; if (!a.active) a.found = false; BA.store.saveAlert(a); BA.app.refreshAll(); }
      }));
    box.querySelectorAll('[data-del]').forEach(el =>
      el.addEventListener('click', () => {
        BA.confirm('이 알림을 삭제할까요?', () => {
          BA.store.deleteAlert(el.dataset.del);
          BA.toast('알림을 삭제했어요.', 'warn');
          BA.app.refreshAll();
        });
      }));
    box.querySelectorAll('[data-book]').forEach(el =>
      el.addEventListener('click', () =>
        BA.toast('데모 버전이라 실제 예매 페이지로 연결되진 않아요. (실서비스에선 예매처로 이동)', 'warn')));
  }

  return { openCreate, renderAlerts };
})();
