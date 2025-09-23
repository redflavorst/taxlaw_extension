// Content Script - 메시지 라우팅 및 상태 관리

(function() {
  'use strict';
  
  console.log('[Bridge] Content script loaded');
  
  // 저장된 판례 목록
  let savedPrecedentList = [];
  let lastUpdateTime = 0;
  
  // Main-world로부터 메시지 수신
  window.addEventListener('message', async (event) => {
    // Origin 검증
    if (event.origin !== window.location.origin) return;
    
    const { type, data } = event.data || {};
    
    switch(type) {
      case 'MSG_PRECEDENT_LIST_SAVED':
        // 판례 목록 저장
        if (data && data.list) {
          savedPrecedentList = data.list;
          lastUpdateTime = data.timestamp || Date.now();
          console.log('[Bridge] Saved precedent list:', savedPrecedentList.length, 'items');
          
          // Background script에 알림 (옵션)
          try {
            chrome.runtime.sendMessage({
              type: 'MSG_LOG',
              data: `Precedent list updated: ${savedPrecedentList.length} items`
            }, () => {
              // Chrome runtime 에러 체크 (더 안전한 방법)
              if (chrome.runtime.lastError) {
                // Extension이 재로드되었을 때 발생하는 에러만 무시
                if (!chrome.runtime.lastError.message.includes('Extension context invalidated') &&
                    !chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
                  console.error('[Bridge] Runtime error:', chrome.runtime.lastError);
                }
              }
            });
          } catch (error) {
            // Extension이 재로드되었을 때 발생하는 에러 무시
            if (!error.message.includes('Extension context invalidated')) {
              console.error('[Bridge] Error sending message to background:', error);
            }
          }
        }
        break;
        
      case 'MSG_REQUEST_SUMMARY':
        // 요약 요청 처리
        if (data && data.docId) {
          console.log('[Bridge] Summary requested for docId:', data.docId);
          // 여기에 요약 API 호출 로직 추가 가능
        }
        break;
        
      case 'MSG_DETAIL_FETCHED':
        // 판례 상세 내용 수신 후 패널 업데이트
        if (data) {
          console.log('[Bridge] Detail fetched:', data.success ? 'Success' : 'Failed');
          // 패널에 상세 내용 전달
          window.postMessage({
            type: 'MSG_UPDATE_PANEL',
            data: data
          }, window.location.origin);
        }
        break;
    }
  });
  
  // Background script로부터 메시지 수신
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Bridge] Received message from background:', request.type);

    switch(request.type) {
      case 'MSG_ARM_CAPTURE':
        // 우클릭 캡처 활성화 신호
        handleArmCapture(sendResponse);
        return true; // 비동기 응답을 위해 true 반환

      case 'MSG_GET_PRECEDENT_LIST':
        // 저장된 판례 목록 반환
        sendResponse({
          success: true,
          data: savedPrecedentList,
          lastUpdate: lastUpdateTime
        });
        break;


      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }

    return false; // 동기적 응답
  });
  
  // ARM 캡처 처리 함수
  function handleArmCapture(sendResponse) {
    // 클릭된 정보 가져오기
    const clickedInfo = window.__lastClickedPrecedentInfo;
    console.log('[Bridge] Clicked info:', clickedInfo);
    
    if (!clickedInfo) {
      sendResponse({ 
        success: false, 
        error: 'No click information available' 
      });
      return;
    }
    
    let matchedDocId = null;
    let matchMethod = null;

    // 0. 키워드 검색 페이지인 경우 window.__precedentListData에서 직접 가져오기
    if (window.location.pathname.includes('USEISA001M.do') && clickedInfo.collectionType) {
      console.log('[Bridge] Keyword search page detected, checking window.__precedentListData');

      if (window.__precedentListData && window.__precedentListData.length > 0) {
        console.log('[Bridge] Found data in window.__precedentListData:', window.__precedentListData.length, 'items');
        savedPrecedentList = window.__precedentListData;
      } else {
        console.log('[Bridge] No data in window.__precedentListData, will try to get from injector');

        // Injector에서 데이터 가져오기 시도 - postMessage 사용
        window.postMessage({
          type: 'MSG_REQUEST_PRECEDENT_LIST',
          data: {
            timestamp: Date.now()
          }
        }, window.location.origin);
        console.log('[Bridge] Requested precedent list from injector');

        // 잠시 대기 후 다시 확인
        setTimeout(() => {
          if (savedPrecedentList.length === 0) {
            console.log('[Bridge] Still no data after retry');
          }
        }, 100);
      }
    }

    // 1. rowIndex 매칭 (최우선)
    console.log('[Bridge] ===== ROW INDEX 매칭 시도 =====');
    console.log('[Bridge] 저장된 판례 목록 개수:', savedPrecedentList.length);
    console.log('[Bridge] 클릭한 rowIndex:', clickedInfo.rowIndex);
    console.log('[Bridge] rowIndex 타입:', typeof clickedInfo.rowIndex);
    console.log('[Bridge] collectionType:', clickedInfo.collectionType);

    if (savedPrecedentList.length > 0) {
      // 키워드 검색 페이지의 경우 컬렉션 타입도 확인
      if (clickedInfo.collectionType) {
        // 컬렉션 타입과 인덱스로 매칭
        const matchingItems = savedPrecedentList.filter(
          item => item.collectionType === clickedInfo.collectionType
        );

        if (matchingItems[clickedInfo.rowIndex]) {
          const matchedItem = matchingItems[clickedInfo.rowIndex];
          matchedDocId = matchedItem.docId;
          matchMethod = 'index_collection';

          console.log('[Bridge] ✓ COLLECTION + INDEX 매칭 성공!');
          console.log('[Bridge] 매칭된 항목:', {
            collectionType: clickedInfo.collectionType,
            rowIndex: clickedInfo.rowIndex,
            docId: matchedDocId,
            caseNumber: matchedItem.caseNumber,
            title: matchedItem.title
          });
        }
      } else if (typeof clickedInfo.rowIndex === 'number' &&
          clickedInfo.rowIndex >= 0 &&
          savedPrecedentList[clickedInfo.rowIndex]) {

        const matchedItem = savedPrecedentList[clickedInfo.rowIndex];
        matchedDocId = matchedItem.docId;
        matchMethod = 'index';

        console.log('[Bridge] ✓ INDEX 매칭 성공!');
        console.log('[Bridge] 매칭된 항목:', {
          rowIndex: clickedInfo.rowIndex,
          docId: matchedDocId,
          caseNumber: matchedItem.caseNumber,
          title: matchedItem.title
        });
      } else {
        console.log('[Bridge] ✗ INDEX 매칭 실패');
        console.log('[Bridge] 이유:', {
          isNumber: typeof clickedInfo.rowIndex === 'number',
          isPositive: clickedInfo.rowIndex >= 0,
          itemExists: !!savedPrecedentList[clickedInfo.rowIndex]
        });
      }
    }
    console.log('[Bridge] ============================');
    
    // 2. 판례번호 매칭 (차선책)
    if (!matchedDocId && clickedInfo.caseNumber) {
      const matched = savedPrecedentList.find(item => 
        item.caseNumber === clickedInfo.caseNumber
      );
      
      if (matched) {
        matchedDocId = matched.docId;
        matchMethod = 'caseNumber';
        
        console.log('[Bridge] ✅ Matched by case number:', {
          caseNumber: clickedInfo.caseNumber,
          docId: matchedDocId
        });
      }
    }
    
    // 3. URL 파라미터 폴백 (최후 수단)
    if (!matchedDocId) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDocId = urlParams.get('docId') || urlParams.get('doc_id') || urlParams.get('ntstDcmId');

      if (urlDocId) {
        matchedDocId = urlDocId.replace(/\D/g, '');
        matchMethod = 'url';

        console.log('[Bridge] ⚠️ Fallback to URL parameter:', {
          docId: matchedDocId
        });
      }
    }

    // 4. USEPDA002P.do 페이지 확인 (이미 상세 페이지인 경우)
    const isDetailPage = window.location.pathname.includes('USEPDA002P.do');
    if (isDetailPage && !matchedDocId) {
      const urlParams = new URLSearchParams(window.location.search);
      matchedDocId = urlParams.get('ntstDcmId');
      matchMethod = 'detailPage';
      console.log('[Bridge] 📄 Detail page detected, using ntstDcmId:', matchedDocId);
    }
    
    // 매칭 결과 처리
    if (matchedDocId) {
      // USEPDA002P.do 페이지에서는 직접 콘텐츠 추출
      if (isDetailPage) {
        console.log('[Bridge] Extracting content from current detail page');

        // scrnNm 확인 (헌재상세 페이지 처리를 위해)
        const scrnNmElement = document.querySelector('#scrnNm');
        const isHeonjaeDetail = scrnNmElement && scrnNmElement.textContent === '헌재상세';
        console.log('[Bridge] Page type check - isHeonjaeDetail:', isHeonjaeDetail);

        // 기존 extractContentFromPage 함수와 동일한 방식으로 추출
        const result = {
          content: null,
          title: null,
          caseNumber: null,
          caseType: null,
          date: null,
          debug: {},
          isHeonjaeDetail: isHeonjaeDetail
        };

        try {
          // 방법 1: 정확한 경로로 찾기
          const bodyContent = document.querySelector('div[data-center-type="body_content"]');

          if (bodyContent) {
            const wordGroups = bodyContent.querySelectorAll('div.word_group');

            // 3번째 word_group (인덱스 2)
            if (wordGroups.length >= 3) {
              const thirdWordGroup = wordGroups[2];

              // 3번째 word_group 자체가 body_content_htmlCntn인지 확인
              if (thirdWordGroup.getAttribute('data-center-type') === 'body_content_htmlCntn') {
                result.content = thirdWordGroup.innerText || thirdWordGroup.textContent;
                result.debug.method = 'body_content > word_group[2] with data-center-type';
              } else {
                // 3번째 word_group 내부에서 body_content_htmlCntn 찾기
                const htmlContent = thirdWordGroup.querySelector('[data-center-type="body_content_htmlCntn"]');
                if (htmlContent) {
                  result.content = htmlContent.innerText || htmlContent.textContent;
                  result.debug.method = 'body_content > word_group[2] > body_content_htmlCntn';
                }
              }
            }
          }

          // 위 방법이 실패하면 폴백
          if (!result.content) {
            const contentElement = document.querySelector('[data-center-type="body_content_htmlCntn"]');
            if (contentElement) {
              result.content = contentElement.innerText || contentElement.textContent;
              result.debug.method = 'data-center-type (fallback)';
            }
          }

          // 방법 2: word_group 클래스로 찾기
          if (!result.content) {
            const wordGroups = document.querySelectorAll('.word_group');
            if (wordGroups.length >= 3) {
              result.content = wordGroups[2].innerText || wordGroups[2].textContent;
              result.debug.method = 'word_group[2]';
            }
          }

          // 방법 3: bo_body_cont 내의 모든 word_group 확인
          if (!result.content) {
            const boBodyCont = document.querySelector('.bo_body_cont');
            if (boBodyCont) {
              const innerWordGroups = boBodyCont.querySelectorAll('.word_group');

              for (let i = 0; i < innerWordGroups.length; i++) {
                const group = innerWordGroups[i];
                const dataType = group.getAttribute('data-center-type');
                const text = group.innerText || group.textContent;

                // body_content_htmlCntn를 찾았거나, 충분한 길이의 텍스트를 가진 word_group 사용
                if (dataType === 'body_content_htmlCntn' || (!result.content && text && text.length > 500)) {
                  result.content = text;
                  result.debug.method = `word_group[${i}]${dataType ? ' with data-center-type' : ' by length'}`;
                }
              }
            }
          }

          // 방법 4: 보통 substance_wrap 클래스 사용 (마지막 폴백)
          if (!result.content) {
            const substanceWrap = document.querySelector('.substance_wrap');
            if (substanceWrap) {
              result.content = substanceWrap.innerText || substanceWrap.textContent;
              result.debug.method = 'substance_wrap (last fallback)';
            }
          }

          console.log('[Bridge] Content extraction result:', result.debug);
        } catch (error) {
          console.error('[Bridge] Error extracting content:', error);
          result.debug.error = error.message;
        }

        if (result.content) {
          // 유형(caseType) 추출 시도 - 상세 페이지에서
          let extractedCaseType = null;

          // 방법 1: 페이지 내의 유형 정보 찾기
          const typeLabels = document.querySelectorAll('td, th, span, div');
          for (const element of typeLabels) {
            const text = element.textContent.trim();
            if (text === '구분' || text === '유형' || text === '분류') {
              // 다음 형제 요소에서 값 추출
              const nextSibling = element.nextElementSibling;
              if (nextSibling) {
                extractedCaseType = nextSibling.textContent.trim();
                console.log('[Bridge] Case type found via label:', extractedCaseType);
                break;
              }
              // 또는 부모의 다음 형제에서 찾기
              const parentNext = element.parentElement?.nextElementSibling;
              if (parentNext) {
                const valueElement = parentNext.querySelector('td, span, div');
                if (valueElement) {
                  extractedCaseType = valueElement.textContent.trim();
                  console.log('[Bridge] Case type found via parent:', extractedCaseType);
                  break;
                }
              }
            }
          }

          // 방법 2: 특정 패턴으로 찾기 (심사, 심판, 판례 등)
          if (!extractedCaseType) {
            const pageText = document.body.textContent;
            const typePatterns = ['심사', '심판', '판례', '대법원', '헌재', '질의'];

            // 다양한 형식으로 찾기
            for (const pattern of typePatterns) {
              // 다양한 구분자 패턴으로 시도
              const patterns = [
                `유형 : ${pattern}`,
                `구분 : ${pattern}`,
                `유형: ${pattern}`,
                `구분: ${pattern}`,
                `유형　${pattern}`,  // 전각 공백
                `구분　${pattern}`,  // 전각 공백
              ];

              for (const p of patterns) {
                if (pageText.includes(p)) {
                  extractedCaseType = pattern;
                  console.log('[Bridge] Case type found via pattern:', extractedCaseType);
                  break;
                }
              }

              if (extractedCaseType) break;
            }
          }

          // 방법 3: 테이블 구조에서 찾기
          if (!extractedCaseType) {
            const tables = document.querySelectorAll('table');
            for (const table of tables) {
              const cells = table.querySelectorAll('td, th');
              for (let i = 0; i < cells.length - 1; i++) {
                const cellText = cells[i].textContent.trim();
                if (cellText === '유형' || cellText === '구분' || cellText === '분류') {
                  const nextCellText = cells[i + 1].textContent.trim();
                  if (nextCellText) {
                    extractedCaseType = nextCellText;
                    console.log('[Bridge] Case type found in table:', extractedCaseType);
                    break;
                  }
                }
              }
              if (extractedCaseType) break;
            }
          }

          result.caseType = extractedCaseType;

          // 패널 표시 (직접 추출한 데이터로)
          window.dispatchEvent(new CustomEvent('showPrecedentPanel', {
            detail: {
              loading: false,
              docId: matchedDocId,
              matchMethod: matchMethod,
              clickedInfo: {
                ...clickedInfo,
                caseType: result.caseType || clickedInfo?.caseType  // caseType 추가
              },
              content: result.content,
              isDirectExtract: true,
              isHeonjaeDetail: result.isHeonjaeDetail
            }
          }));

          sendResponse({
            success: true,
            docId: matchedDocId,
            method: matchMethod,
            isDetailPage: true
          });
          return;
        } else {
          console.error('[Bridge] Content not found on detail page');
        }
      }

      // 기존 페이지 처리 (Background script로 판례 상세 내용 가져오기 요청)
      try {
        // URL 미리보기 (디버깅용)
        const paddedDocId = String(matchedDocId).padStart(12, '0');
        const previewUrl = `https://taxlaw.nts.go.kr/pd/USEPDA002P.do?ntstDcmId=${paddedDocId}`;
        console.log('[Bridge] 📌 Fetching detail from URL:', previewUrl);
        
        console.log('[Bridge] Sending MSG_FETCH_DETAIL with:', {
          docId: matchedDocId,
          docType: clickedInfo.collectionType,
          caseType: clickedInfo.caseType,  // 심사 유형 정보 추가
          forceExtractGistAndDecision: clickedInfo.forceExtractGistAndDecision,
          ntstDcmClCd: clickedInfo.ntstDcmClCd
        });

        chrome.runtime.sendMessage({
          type: 'MSG_FETCH_DETAIL',
          docId: matchedDocId,
          docType: clickedInfo.collectionType, // '질의' 또는 '판례' 전달
          caseType: clickedInfo.caseType,  // '심사' 정보 추가
          forceExtractGistAndDecision: clickedInfo.forceExtractGistAndDecision,  // ntstDcmClCd가 09/10일 때
          ntstDcmClCd: clickedInfo.ntstDcmClCd
        }, (detailResponse) => {
          // Chrome runtime 에러 체크
          if (chrome.runtime.lastError) {
            console.error('[Bridge] Chrome runtime error:', chrome.runtime.lastError);
            window.postMessage({
              type: 'MSG_UPDATE_PANEL',
              data: {
                docId: matchedDocId,
                success: false,
                error: 'Extension error: ' + chrome.runtime.lastError.message
              }
            }, window.location.origin);
            return;
          }
          
          console.log('[Bridge] Detail fetch response:', detailResponse);
          
          // 응답 확인
          if (!detailResponse) {
            console.error('[Bridge] No response from background script');
            window.postMessage({
              type: 'MSG_UPDATE_PANEL',
              data: {
                docId: matchedDocId,
                success: false,
                error: 'Background script did not respond'
              }
            }, window.location.origin);
            return;
          }
          
          // 패널 업데이트 (clickedInfo 포함)
          // detailResponse.content contains the entire extractedData object
          const detailData = detailResponse.content || {};

          console.log('[Bridge] Detail data received from background:', {
            hasContent: !!detailData.content,
            contentLength: detailData.content ? detailData.content.length : 0,
            hasGist: !!detailData.gist,
            gistLength: detailData.gist ? detailData.gist.length : 0,
            hasDecision: !!detailData.decision,
            decisionLength: detailData.decision ? detailData.decision.length : 0,
            hasReply: !!detailData.reply,
            replyLength: detailData.reply ? detailData.reply.length : 0,
            docType: detailData.docType,
            caseType: detailData.caseType
          });

          window.postMessage({
            type: 'MSG_UPDATE_PANEL',
            data: {
              docId: matchedDocId,
              success: detailResponse.success,
              detail: {
                content: detailData.content,
                caseNumber: detailData.caseNumber,
                caseType: detailData.caseType,
                title: detailData.title,
                date: detailData.date,
                gist: detailData.gist,
                reply: detailData.reply,
                decision: detailData.decision,
                docType: detailData.docType
              },
              error: detailResponse.error,
              clickedInfo: clickedInfo  // 클릭한 정보 유지
            }
          }, window.location.origin);
        });
      } catch (error) {
        console.error('[Bridge] Error sending message to background:', error);
        window.postMessage({
          type: 'MSG_UPDATE_PANEL',
          data: {
            docId: matchedDocId,
            success: false,
            error: 'Failed to communicate with extension'
          }
        }, window.location.origin);
      }
      
      // 사이드 패널 열기 (로딩 상태로)
      console.log('[Bridge] Opening panel with clickedInfo:', {
        caseNumber: clickedInfo?.caseNumber,
        caseType: clickedInfo?.caseType,
        title: clickedInfo?.title,
        rowIndex: clickedInfo?.rowIndex,
        hasClickedInfo: !!clickedInfo
      });

      window.postMessage({
        type: 'MSG_OPEN_PANEL',
        data: {
          docId: matchedDocId,
          matchMethod: matchMethod,
          clickedInfo: clickedInfo,
          loading: true
        }
      }, window.location.origin);
      
      sendResponse({ 
        success: true, 
        docId: matchedDocId,
        method: matchMethod
      });
    } else {
      console.error('[Bridge] ❌ No matching doc_id found');
      sendResponse({ 
        success: false, 
        error: 'No matching doc_id found',
        clickedInfo: clickedInfo
      });
    }
  }
  
  // 전역 헬퍼 함수
  window.__bridgeGetSavedList = function() {
    return savedPrecedentList;
  };
  
  window.__bridgeGetLastUpdate = function() {
    return new Date(lastUpdateTime).toLocaleString();
  };
  
  console.log('[Bridge] Message routing ready');
})();