// Main-world 스크립트 - 네트워크 요청 인터셉트 (CSP 우회)
// 이 스크립트는 "world": "MAIN" 설정으로 페이지 컨텍스트에서 실행됨

(function() {
  'use strict';
  
  console.log('[Injector] Main-world script loaded');
  
  // 전역 변수 초기화
  window.__precedentListData = [];
  window.__debugMode = true;
  
  // 디버깅 헬퍼 함수
  window.__debugGetPrecedentInfo = function(index) {
    if (window.__precedentListData && window.__precedentListData[index]) {
      return window.__precedentListData[index];
    }
    return null;
  };
  
  // fetch 패치
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // action.do 요청 감지
    if (args[0] && args[0].includes && args[0].includes('action.do')) {
      console.log('[Injector] Intercepted action.do request');
      
      // POST body 확인
      if (args[1] && args[1].body) {
        try {
          const bodyStr = typeof args[1].body === 'string' ? args[1].body : '';
          console.log('[Injector] Request body preview:', bodyStr.substring(0, 100));
          
          // 판례 목록 요청인지 확인 (ASIPDI002PR01 또는 유사 패턴)
          if (bodyStr.includes('ASIPDI002PR01') || bodyStr.includes('PRDC') || bodyStr.includes('precedent')) {
            console.log('[Injector] This is a precedent list request');
          }
        } catch (e) {
          console.log('[Injector] Could not parse request body');
        }
      }
      
      // 응답 복제 및 파싱
      response.clone().text().then(text => {
        try {
          const jsonObj = JSON.parse(text);
          console.log('[Injector] Response keys:', Object.keys(jsonObj.data || {}));
          
          // 다양한 응답 구조 처리
          let precedentList = null;
          
          // 구조 1: ASIPDI002PR01.body
          if (jsonObj.data && jsonObj.data.ASIPDI002PR01 && jsonObj.data.ASIPDI002PR01.body) {
            precedentList = jsonObj.data.ASIPDI002PR01.body;
            console.log('[Injector] Found precedent list in ASIPDI002PR01:', precedentList.length, 'items');
          }
          // 구조 2: 다른 가능한 키들 확인
          else if (jsonObj.data) {
            // data 객체의 모든 키 확인
            for (const key in jsonObj.data) {
              const value = jsonObj.data[key];
              if (value && value.body && Array.isArray(value.body)) {
                // body가 배열이고 판례 데이터 구조인지 확인
                if (value.body.length > 0 && (
                  value.body[0].DOC_ID || 
                  value.body[0].NTST_DCM_DSCM_CNTN ||
                  value.body[0].dcm
                )) {
                  precedentList = value.body;
                  console.log('[Injector] Found precedent list in', key, ':', precedentList.length, 'items');
                  break;
                }
              }
            }
          }
          
          if (precedentList) {
            
            // 데이터 정규화 및 저장
            window.__precedentListData = precedentList.map((item, index) => {
              // item이 중첩된 구조인 경우 처리
              const dcm = item.dcm || item;
              
              const normalizedItem = {
                index: index,
                docId: String(dcm.DOC_ID || '').replace(/\D/g, ''), // 숫자만 추출
                caseNumber: dcm.NTST_DCM_DSCM_CNTN || '', // 판례번호 필드
                title: dcm.TTL || '',
                date: dcm.DCM_RGT_DTM || '',
                rawData: dcm // 원본 데이터 보존
              };
              
              if (window.__debugMode && index < 3) {
                console.log('[Injector] Sample item:', normalizedItem);
              }
              
              return normalizedItem;
            });
            
            // Content script로 데이터 전송
            window.postMessage({
              type: 'MSG_PRECEDENT_LIST_SAVED',
              data: {
                list: window.__precedentListData,
                count: window.__precedentListData.length,
                timestamp: Date.now()
              }
            }, window.location.origin);
            
            console.log('[Injector] Precedent list saved and sent to bridge');
          }
        } catch (error) {
          console.error('[Injector] Error parsing response:', error);
        }
      }).catch(error => {
        console.error('[Injector] Error reading response:', error);
      });
    }
    
    return response;
  };
  
  // XMLHttpRequest 패치 (일부 사이트는 XHR 사용)
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._interceptUrl = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._interceptUrl && this._interceptUrl.includes('action.do')) {
      console.log('[Injector] Intercepted XHR action.do request');
      
      this.addEventListener('load', function() {
        try {
          const jsonObj = JSON.parse(this.responseText);
          
          // ASIPDI002PR01.body에서 판례 목록 추출
          if (jsonObj.data && jsonObj.data.ASIPDI002PR01 && jsonObj.data.ASIPDI002PR01.body) {
            const precedentList = jsonObj.data.ASIPDI002PR01.body;
            console.log('[Injector XHR] Found precedent list:', precedentList.length, 'items');
            
            // 데이터 정규화 및 저장
            window.__precedentListData = precedentList.map((item, index) => {
              const dcm = item.dcm || item;
              
              return {
                index: index,
                docId: String(dcm.DOC_ID || '').replace(/\D/g, ''),
                caseNumber: dcm.NTST_DCM_DSCM_CNTN || '',
                title: dcm.TTL || '',
                date: dcm.DCM_RGT_DTM || '',
                rawData: dcm
              };
            });
            
            // Content script로 데이터 전송
            window.postMessage({
              type: 'MSG_PRECEDENT_LIST_SAVED',
              data: {
                list: window.__precedentListData,
                count: window.__precedentListData.length,
                timestamp: Date.now()
              }
            }, window.location.origin);
            
            console.log('[Injector XHR] Precedent list saved and sent to bridge');
          }
        } catch (error) {
          console.error('[Injector XHR] Error parsing response:', error);
        }
      });
    }
    
    return originalXHRSend.apply(this, args);
  };
  
  console.log('[Injector] Network interception ready');
})();