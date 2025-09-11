// 네트워크 요청 판별 로직

(function() {
  'use strict';
  
  // 네트워크 요청 식별 유틸리티
  window.NetworkIdentifier = {
    
    // 판례 목록 API 요청인지 확인
    isPrecedentListRequest: function(url, method, body) {
      if (!url) return false;
      
      // URL 패턴 체크
      const urlPatterns = [
        /action\.do/i,
        /ASIPDI002PR01/i,
        /precedent/i,
        /list/i
      ];
      
      // URL이 패턴 중 하나와 매칭되는지 확인
      const urlMatches = urlPatterns.some(pattern => pattern.test(url));
      
      if (urlMatches) {
        console.log('[NetworkID] Detected precedent list request:', url);
        return true;
      }
      
      // POST body 체크 (있는 경우)
      if (method === 'POST' && body) {
        try {
          const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
          if (bodyStr.includes('ASIPDI002PR01') || 
              bodyStr.includes('precedent') ||
              bodyStr.includes('판례')) {
            console.log('[NetworkID] Detected precedent list request from body');
            return true;
          }
        } catch (e) {
          // Body 파싱 실패 무시
        }
      }
      
      return false;
    },
    
    // 판례 상세 API 요청인지 확인
    isPrecedentDetailRequest: function(url, method, body) {
      if (!url) return false;
      
      const urlPatterns = [
        /detail/i,
        /view/i,
        /DOC_ID/i
      ];
      
      return urlPatterns.some(pattern => pattern.test(url));
    },
    
    // API 응답에서 판례 목록 데이터 추출
    extractPrecedentList: function(responseData) {
      if (!responseData) return null;
      
      // 문자열인 경우 JSON 파싱
      let data = responseData;
      if (typeof responseData === 'string') {
        try {
          data = JSON.parse(responseData);
        } catch (e) {
          console.error('[NetworkID] Failed to parse response:', e);
          return null;
        }
      }
      
      // 다양한 응답 구조 처리
      let precedentList = null;
      
      // 구조 1: data.ASIPDI002PR01.body
      if (data.data && data.data.ASIPDI002PR01 && data.data.ASIPDI002PR01.body) {
        precedentList = data.data.ASIPDI002PR01.body;
      }
      // 구조 2: ASIPDI002PR01.body
      else if (data.ASIPDI002PR01 && data.ASIPDI002PR01.body) {
        precedentList = data.ASIPDI002PR01.body;
      }
      // 구조 3: body 직접
      else if (data.body && Array.isArray(data.body)) {
        precedentList = data.body;
      }
      // 구조 4: data 직접 배열
      else if (Array.isArray(data)) {
        precedentList = data;
      }
      
      if (precedentList) {
        console.log('[NetworkID] Extracted precedent list:', precedentList.length, 'items');
        return precedentList;
      }
      
      return null;
    },
    
    // URL에서 doc_id 추출
    extractDocIdFromUrl: function(url) {
      if (!url) return null;
      
      try {
        const urlObj = new URL(url);
        
        // Query parameter에서 추출
        const params = ['docId', 'doc_id', 'DOC_ID', 'id'];
        for (const param of params) {
          const value = urlObj.searchParams.get(param);
          if (value) {
            return value.replace(/\D/g, ''); // 숫자만 추출
          }
        }
        
        // Path에서 추출 (예: /precedent/123456789012)
        const pathMatch = urlObj.pathname.match(/\/(\d{12})/);
        if (pathMatch) {
          return pathMatch[1];
        }
      } catch (e) {
        console.error('[NetworkID] Failed to parse URL:', e);
      }
      
      return null;
    },
    
    // 요청 타입 판별
    identifyRequestType: function(url, method, body) {
      return {
        isPrecedentList: this.isPrecedentListRequest(url, method, body),
        isPrecedentDetail: this.isPrecedentDetailRequest(url, method, body),
        docId: this.extractDocIdFromUrl(url)
      };
    }
  };
  
  console.log('[NetworkID] Network identifier loaded');
})();