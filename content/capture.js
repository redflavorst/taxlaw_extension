// Content Script - 우클릭 이벤트 캡처

(function() {
  'use strict';
  
  console.log('[Capture] ===== Right-click capture loaded =====');
  console.log('[Capture] Current URL:', window.location.href);
  console.log('[Capture] DOM ready state:', document.readyState);
  
  // 전역 변수로 마지막 클릭 정보 저장
  window.__lastClickedPrecedentInfo = null;
  window.__captureWindowTime = 5000; // 5초 동안 캡처 유지
  let captureTimer = null;
  
  // 우클릭 이벤트 리스너
  document.addEventListener('contextmenu', function(event) {
    console.log('[Capture] ===== 우클릭 감지됨 =====');
    console.log('[Capture] Target element:', event.target);

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
        console.log('[Capture] ===== ROW INDEX 계산 =====');
        console.log('[Capture] 전체 LI 개수:', allLIs.length);
        console.log('[Capture] 클릭한 항목의 Row Index:', precedentInfo.rowIndex);
        console.log('[Capture] 클릭한 LI 요소:', closestLI);
        console.log('[Capture] =============================');
      } else {
        console.log('[Capture] ERROR: bdltCtl 요소를 찾을 수 없음');
      }
      
      // 2. 유형 추출 (첫 번째 li 요소)
      // 구조: div > div > a > ul > li:first-child
      console.log('[Capture] Looking for caseType element...');
      const caseTypeElement = closestLI.querySelector(
        'div:first-child > div:first-child > a > ul > li:first-child'
      );
      console.log('[Capture] caseTypeElement found:', !!caseTypeElement);
      if (caseTypeElement) {
        precedentInfo.caseType = caseTypeElement.textContent.trim();
        console.log('[Capture] Case type extracted:', precedentInfo.caseType);
      } else {
        console.log('[Capture] Failed to find caseType element');
        // 다른 선택자 시도
        const altCaseType = closestLI.querySelector('a ul li:first-child');
        console.log('[Capture] Alternative caseType element:', !!altCaseType);
        if (altCaseType) {
          precedentInfo.caseType = altCaseType.textContent.trim();
          console.log('[Capture] Case type (alt):', precedentInfo.caseType);
        }
      }

      // 3. 판례번호 추출
      // 구조: div > div > ul > li:first-child > strong
      console.log('[Capture] Looking for caseNumber element...');
      const caseNumberElement = closestLI.querySelector(
        'div:first-child > div:first-child > ul > li:first-child > strong'
      );
      console.log('[Capture] caseNumberElement found:', !!caseNumberElement);
      if (caseNumberElement) {
        precedentInfo.caseNumber = caseNumberElement.textContent.trim();
        console.log('[Capture] Case number extracted:', precedentInfo.caseNumber);
      } else {
        console.log('[Capture] Failed to find caseNumber element');
      }

      // 4. 제목 추출
      // 구조: div > div > a > strong
      console.log('[Capture] Looking for title element...');
      const titleElement = closestLI.querySelector(
        'div:first-child > div:first-child > a > strong'
      );
      console.log('[Capture] titleElement found:', !!titleElement);
      if (titleElement) {
        precedentInfo.title = titleElement.textContent.trim();
        console.log('[Capture] Title extracted:', precedentInfo.title.substring(0, 50) + '...');
      } else {
        console.log('[Capture] Failed to find title element');
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
      console.log('[Capture] ========== 우클릭한 판례 정보 ==========');
      console.log('[Capture] 유형:', precedentInfo.caseType || '유형 없음');
      console.log('[Capture] 제목:', precedentInfo.title || '제목 없음');
      console.log('[Capture] 판례번호:', precedentInfo.caseNumber || '판례번호 없음');
      console.log('[Capture] Row Index:', precedentInfo.rowIndex);
      console.log('[Capture] ======================================');
      console.log('[Capture] 전체 데이터:', precedentInfo);
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