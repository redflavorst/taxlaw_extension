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

    // URL 파라미터에서 ntstDcmClCd 확인
    const urlParams = new URLSearchParams(window.location.search);
    const ntstDcmClCd = urlParams.get('ntstDcmClCd');
    if (ntstDcmClCd === '09' || ntstDcmClCd === '10') {
      precedentInfo.forceExtractGistAndDecision = true;
      precedentInfo.ntstDcmClCd = ntstDcmClCd;
      console.log('[Capture] ntstDcmClCd=' + ntstDcmClCd + ' - 요지/결정내용 추출 강제');
    }
    
    // 페이지에 따라 다른 선택자 사용
    // 1. USEPDI001M.do - #bdltCtl > li
    // 2. USEPDA001M.do - #dcmListBox > li
    // 3. 검색 페이지 - ul[data-collection-ul="precedent"] > li
    let closestLI = target.closest('#bdltCtl > li');
    let parentUL = document.getElementById('bdltCtl');

    // dcmListBox 페이지인 경우
    if (!closestLI) {
      closestLI = target.closest('#dcmListBox > li');
      if (closestLI) {
        parentUL = document.getElementById('dcmListBox');
        console.log('[Capture] Found item in dcmListBox');
      }
    }

    // 검색 페이지인 경우 - 판례 컬렉션 (data-collection-ul="precedent")
    if (!closestLI) {
      closestLI = target.closest('ul[data-collection-ul="precedent"] > li');
      if (closestLI) {
        parentUL = document.querySelector('ul[data-collection-ul="precedent"]');
        console.log('[Capture] Found item in search result page (data-collection-ul="precedent")');
        precedentInfo.collectionType = '판례';
      }
    }

    // 검색 페이지인 경우 - 질의 컬렉션 (data-collection-ul="question")
    if (!closestLI) {
      closestLI = target.closest('ul[data-collection-ul="question"] > li');
      if (closestLI) {
        parentUL = document.querySelector('ul[data-collection-ul="question"]');
        console.log('[Capture] Found item in search result page (data-collection-ul="question")');
        precedentInfo.collectionType = '질의';
      }
    }

    if (!closestLI) {
      console.log('[Capture] No list item found in any known container');
    } else if (!parentUL) {
      console.log('[Capture] Found item in bdltCtl');
    }

    // 상세페이지(USEPDA002P.do) 처리
    if (window.location.pathname.includes('USEPDA002P.do')) {
      console.log('[Capture] Detail page detected - extracting doc_id from URL');
      const urlParams = new URLSearchParams(window.location.search);
      const docId = urlParams.get('ntstDcmId');

      if (docId) {
        precedentInfo.docId = docId;
        precedentInfo.isDetailPage = true;
        precedentInfo.hasData = true;

        // 페이지에서 추가 정보 추출
        const titleElement = document.querySelector('.tit_area h3, .board_view_head h3, h2.tit, h3.tit');
        if (titleElement) {
          precedentInfo.title = titleElement.textContent.trim();
        }

        // caseType 추출 시도
        const scrnNmElement = document.querySelector('#scrnNm');
        if (scrnNmElement) {
          const scrnNm = scrnNmElement.textContent;
          const caseTypeMap = {
            '판례상세': '판례',
            '심판상세': '심판',
            '심사상세': '심사',
            '헌재상세': '헌재',
            '종소상세': '종소',
            '질의상세': '질의'
          };
          precedentInfo.caseType = caseTypeMap[scrnNm] || scrnNm;
        }

        console.log('[Capture] Detail page info:', {
          docId: precedentInfo.docId,
          title: precedentInfo.title,
          caseType: precedentInfo.caseType
        });
      }
    } else if (closestLI) {
      console.log('[Capture] Right-clicked on precedent item');
      
      // 1. rowIndex 저장 (가장 중요!)
      if (parentUL) {
        const allLIs = Array.from(parentUL.children);
        precedentInfo.rowIndex = allLIs.indexOf(closestLI);
        console.log('[Capture] ===== ROW INDEX 계산 =====');
        console.log('[Capture] Container ID:', parentUL.id);
        console.log('[Capture] 전체 LI 개수:', allLIs.length);
        console.log('[Capture] 클릭한 항목의 Row Index:', precedentInfo.rowIndex);
        console.log('[Capture] 클릭한 LI 요소:', closestLI);
        console.log('[Capture] =============================');
      } else {
        console.log('[Capture] ERROR: Parent UL 요소를 찾을 수 없음');
      }
      
      // 2. 키워드 검색 페이지에서는 제목과 번호만 추출
      if (precedentInfo.collectionType) {
        // 키워드 검색 페이지인 경우
        console.log('[Capture] Keyword search page - extracting limited info');

        // 제목 추출
        const titleElement = closestLI.querySelector('.tit');
        if (titleElement) {
          precedentInfo.title = titleElement.textContent.trim();
        }

        // 사건번호 추출 - 심사 유형의 경우 다른 위치에서 가져옴
        // div.board_box > div.substance_wrap > ul.subs_detail > li:first-child
        const subsDetailElement = closestLI.querySelector('div.board_box div.substance_wrap ul.subs_detail li:first-child');
        if (subsDetailElement) {
          precedentInfo.caseNumber = subsDetailElement.textContent.trim();
          console.log('[Capture] Case number from subs_detail:', precedentInfo.caseNumber);
        } else {
          // 기존 방식으로 시도 (다른 유형용)
          const numberElement = closestLI.querySelector('.num');
          if (numberElement) {
            precedentInfo.caseNumber = numberElement.textContent.trim();
            console.log('[Capture] Case number from .num:', precedentInfo.caseNumber);
          }
        }

        // 유형 추출 - legislation_list의 첫 번째 li 확인
        const legislationFirstLi = closestLI.querySelector('div.board_box div.substance_wrap a ul.legislation_list li:first-child');
        if (legislationFirstLi) {
          const typeText = legislationFirstLi.textContent.trim();
          console.log('[Capture] Type text from legislation_list:', typeText);

          precedentInfo.caseType = typeText;  // 유형 저장 (심사, 심판, 적부, 이의, 헌재, 판례 등)

          // 심사/심판/적부/이의/헌재/판례 유형 판별
          if (typeText === '심사' || typeText.includes('심사')) {
            console.log('[Capture] Case type detected as 심사 from legislation_list');
          } else if (typeText === '심판' || typeText.includes('심판')) {
            console.log('[Capture] Case type detected as 심판 from legislation_list');
          } else if (typeText === '적부' || typeText.includes('적부')) {
            console.log('[Capture] Case type detected as 적부 from legislation_list');
          } else if (typeText === '이의' || typeText.includes('이의')) {
            console.log('[Capture] Case type detected as 이의 from legislation_list');
          } else if (typeText === '헌재' || typeText.includes('헌재')) {
            console.log('[Capture] Case type detected as 헌재 from legislation_list');
          } else if (typeText === '판례' || typeText.includes('판례')) {
            console.log('[Capture] Case type detected as 판례 from legislation_list');
          } else if (typeText === '종소' || typeText.includes('종소')) {
            console.log('[Capture] Case type detected as 종소 from legislation_list');
          }
        }

        // 대체 방법: subs_detail에서도 확인 (사건번호에서 유추)
        if (!precedentInfo.caseType) {
          const subsDetailFirstLi = closestLI.querySelector('div.board_box div.substance_wrap ul.subs_detail li:first-child');
          if (subsDetailFirstLi) {
            const text = subsDetailFirstLi.textContent.trim();
            console.log('[Capture] First li text in subs_detail:', text);

            // 심사/심판/적부/이의/헌재/판례 유형 판별 - "국심2009서1234" 같은 패턴 확인
            if (text.includes('국심') || text.includes('조심')) {
              precedentInfo.caseType = '심사';
              console.log('[Capture] Case type detected as 심사 from case number pattern:', text);
            } else if (text.includes('국판') || text.includes('조판')) {
              precedentInfo.caseType = '심판';
              console.log('[Capture] Case type detected as 심판 from case number pattern:', text);
            } else if (text.includes('적부')) {
              precedentInfo.caseType = '적부';
              console.log('[Capture] Case type detected as 적부 from case number pattern:', text);
            } else if (text.includes('이의')) {
              precedentInfo.caseType = '이의';
              console.log('[Capture] Case type detected as 이의 from case number pattern:', text);
            } else if (text.includes('헌재') || text.includes('헌법재판')) {
              precedentInfo.caseType = '헌재';
              console.log('[Capture] Case type detected as 헌재 from case number pattern:', text);
            } else if (text.includes('대법원') || text.includes('고등법원') || text.includes('지방법원')) {
              precedentInfo.caseType = '판례';
              console.log('[Capture] Case type detected as 판례 from case number pattern:', text);
            } else if (text.includes('종소')) {
              precedentInfo.caseType = '종소';
              console.log('[Capture] Case type detected as 종소 from case number pattern:', text);
            }
          }
        }

        console.log('[Capture] Search page info:', {
          title: precedentInfo.title?.substring(0, 30),
          caseNumber: precedentInfo.caseNumber,
          caseType: precedentInfo.caseType,
          rowIndex: precedentInfo.rowIndex,
          collectionType: precedentInfo.collectionType,
          ntstDcmClCd: precedentInfo.ntstDcmClCd,
          forceExtractGistAndDecision: precedentInfo.forceExtractGistAndDecision
        });
      } else {
        // 기존 판례 목록 페이지
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
      }

      // 3. 판례번호 추출 (키워드 검색 페이지가 아닌 경우)
      if (!precedentInfo.collectionType) {
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
      if (precedentInfo.forceExtractGistAndDecision) {
        console.log('[Capture] 강제 추출: ntstDcmClCd=' + precedentInfo.ntstDcmClCd);
      }
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