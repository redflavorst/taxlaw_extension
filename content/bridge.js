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
    
    // 1. rowIndex 매칭 (최우선)
    console.log('[Bridge] ===== ROW INDEX 매칭 시도 =====');
    console.log('[Bridge] 저장된 판례 목록 개수:', savedPrecedentList.length);
    console.log('[Bridge] 클릭한 rowIndex:', clickedInfo.rowIndex);
    console.log('[Bridge] rowIndex 타입:', typeof clickedInfo.rowIndex);

    if (savedPrecedentList.length > 0) {
      if (typeof clickedInfo.rowIndex === 'number' &&
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
      const urlDocId = urlParams.get('docId') || urlParams.get('doc_id');
      
      if (urlDocId) {
        matchedDocId = urlDocId.replace(/\D/g, '');
        matchMethod = 'url';
        
        console.log('[Bridge] ⚠️ Fallback to URL parameter:', {
          docId: matchedDocId
        });
      }
    }
    
    // 매칭 결과 처리
    if (matchedDocId) {
      // Background script로 판례 상세 내용 가져오기 요청
      try {
        // URL 미리보기 (디버깅용)
        const paddedDocId = String(matchedDocId).padStart(12, '0');
        const previewUrl = `https://taxlaw.nts.go.kr/pd/USEPDA002P.do?ntstDcmId=${paddedDocId}`;
        console.log('[Bridge] 📌 Fetching detail from URL:', previewUrl);
        
        chrome.runtime.sendMessage({
          type: 'MSG_FETCH_DETAIL',
          docId: matchedDocId
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
          window.postMessage({
            type: 'MSG_UPDATE_PANEL',
            data: {
              docId: matchedDocId,
              success: detailResponse.success,
              detail: detailResponse.content,
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