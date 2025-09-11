// Content Script - 우클릭 이벤트 캡처

(function() {
  'use strict';
  
  console.log('[Capture] Right-click capture loaded');
  
  // 전역 변수로 마지막 클릭 정보 저장
  window.__lastClickedPrecedentInfo = null;
  window.__captureWindowTime = 5000; // 5초 동안 캡처 유지
  let captureTimer = null;
  
  // 우클릭 이벤트 리스너
  document.addEventListener('contextmenu', function(event) {
    let target = event.target;
    let precedentInfo = {
      timestamp: Date.now(),
      targetElement: target.tagName,
      targetText: target.textContent ? target.textContent.substring(0, 100) : ''
    };
    
    // bdltCtl 구조에서 판례 LI 찾기
    const closestLI = target.closest('#bdltCtl > li');
    
    if (closestLI) {
      console.log('[Capture] Right-clicked on precedent item');
      
      // 1. rowIndex 저장 (가장 중요!)
      const parentUL = document.getElementById('bdltCtl');
      if (parentUL) {
        const allLIs = Array.from(parentUL.children);
        precedentInfo.rowIndex = allLIs.indexOf(closestLI);
        console.log('[Capture] Row index:', precedentInfo.rowIndex);
      }
      
      // 2. 판례번호 추출
      // 구조: div > div > ul > li:first-child > strong
      const caseNumberElement = closestLI.querySelector(
        'div:first-child > div:first-child > ul > li:first-child > strong'
      );
      if (caseNumberElement) {
        precedentInfo.caseNumber = caseNumberElement.textContent.trim();
        console.log('[Capture] Case number:', precedentInfo.caseNumber);
      }
      
      // 3. 날짜 추출
      // 구조: div > div > ul > li:nth-child(2) > span
      const dateElement = closestLI.querySelector(
        'div:first-child > div:first-child > ul > li:nth-child(2) > span'
      );
      if (dateElement) {
        precedentInfo.registrationDate = dateElement.textContent.trim();
        console.log('[Capture] Date:', precedentInfo.registrationDate);
      }
      
      // 4. 제목 추출
      // 구조: div > div > a > strong
      const titleElement = closestLI.querySelector(
        'div:first-child > div:first-child > a > strong'
      );
      if (titleElement) {
        precedentInfo.title = titleElement.textContent.trim();
        console.log('[Capture] Title:', precedentInfo.title.substring(0, 50) + '...');
      }
      
      // 5. 추가 정보 수집
      precedentInfo.pageUrl = window.location.href;
      precedentInfo.hasData = !!(precedentInfo.caseNumber || precedentInfo.title);
      
    } else {
      // bdltCtl 외부 클릭
      console.log('[Capture] Right-clicked outside precedent list');
      precedentInfo.isOutside = true;
    }
    
    // 전역 변수에 저장
    window.__lastClickedPrecedentInfo = precedentInfo;
    
    // 타이머 설정 (5초 후 클리어)
    if (captureTimer) {
      clearTimeout(captureTimer);
    }
    captureTimer = setTimeout(() => {
      console.log('[Capture] Capture window expired');
      window.__lastClickedPrecedentInfo = null;
    }, window.__captureWindowTime);
    
    // 디버깅 출력
    if (precedentInfo.hasData) {
      console.log('[Capture] Captured precedent info:', {
        rowIndex: precedentInfo.rowIndex,
        caseNumber: precedentInfo.caseNumber,
        date: precedentInfo.registrationDate,
        titlePreview: precedentInfo.title ? precedentInfo.title.substring(0, 30) + '...' : null
      });
    }
  }, true); // capture phase에서 실행
  
  // 페이지 네비게이션 시 캡처 클리어
  window.addEventListener('beforeunload', function() {
    window.__lastClickedPrecedentInfo = null;
    if (captureTimer) {
      clearTimeout(captureTimer);
    }
  });
  
  // 디버깅 헬퍼 함수
  window.__debugGetLastClick = function() {
    return window.__lastClickedPrecedentInfo;
  };
  
  window.__debugSimulateClick = function(index) {
    const parentUL = document.getElementById('bdltCtl');
    if (parentUL) {
      const allLIs = Array.from(parentUL.children);
      if (allLIs[index]) {
        const li = allLIs[index];
        
        // 판례번호 추출
        const caseNumberElement = li.querySelector(
          'div:first-child > div:first-child > ul > li:first-child > strong'
        );
        
        // 날짜 추출
        const dateElement = li.querySelector(
          'div:first-child > div:first-child > ul > li:nth-child(2) > span'
        );
        
        // 제목 추출
        const titleElement = li.querySelector(
          'div:first-child > div:first-child > a > strong'
        );
        
        window.__lastClickedPrecedentInfo = {
          rowIndex: index,
          caseNumber: caseNumberElement ? caseNumberElement.textContent.trim() : null,
          registrationDate: dateElement ? dateElement.textContent.trim() : null,
          title: titleElement ? titleElement.textContent.trim() : null,
          timestamp: Date.now(),
          simulated: true
        };
        
        console.log('[Capture] Simulated click on index:', index);
        return window.__lastClickedPrecedentInfo;
      }
    }
    return null;
  };
  
  console.log('[Capture] Right-click capture ready');
})();