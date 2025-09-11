// doc_id 정규화 및 유틸리티 함수

(function() {
  'use strict';
  
  // DocID 유틸리티
  window.DocIdUtils = {
    
    // doc_id 정규화 (12자리 숫자로 변환)
    normalize: function(docId) {
      if (!docId) return null;
      
      // 숫자만 추출
      const numbers = String(docId).replace(/\D/g, '');
      
      // 12자리 체크
      if (numbers.length === 12) {
        return numbers;
      }
      
      // 12자리보다 긴 경우 앞 12자리만
      if (numbers.length > 12) {
        console.warn('[DocIdUtils] DocId longer than 12 digits, truncating:', numbers);
        return numbers.substring(0, 12);
      }
      
      // 12자리보다 짧은 경우 패딩
      if (numbers.length < 12 && numbers.length > 0) {
        console.warn('[DocIdUtils] DocId shorter than 12 digits, padding:', numbers);
        return numbers.padStart(12, '0');
      }
      
      return null;
    },
    
    // doc_id 유효성 검사
    validate: function(docId) {
      if (!docId) return false;
      
      const normalized = this.normalize(docId);
      if (!normalized) return false;
      
      // 12자리 숫자인지 확인
      return /^\d{12}$/.test(normalized);
    },
    
    // 판례번호 정규화 (조심-2025-중-2139 형식)
    normalizeCaseNumber: function(caseNumber) {
      if (!caseNumber) return null;
      
      // 공백 제거
      let normalized = caseNumber.trim();
      
      // 특수문자 정규화
      normalized = normalized.replace(/[－]/g, '-'); // 전각 대시를 반각으로
      normalized = normalized.replace(/\s+/g, ''); // 모든 공백 제거
      
      return normalized;
    },
    
    // 판례번호 비교
    compareCaseNumbers: function(num1, num2) {
      if (!num1 || !num2) return false;
      
      const normalized1 = this.normalizeCaseNumber(num1);
      const normalized2 = this.normalizeCaseNumber(num2);
      
      return normalized1 === normalized2;
    },
    
    // 날짜 정규화 (2025.09.08 형식)
    normalizeDate: function(dateStr) {
      if (!dateStr) return null;
      
      // 다양한 날짜 형식 처리
      let normalized = dateStr.trim();
      
      // 2025-09-08 -> 2025.09.08
      normalized = normalized.replace(/-/g, '.');
      
      // 2025/09/08 -> 2025.09.08
      normalized = normalized.replace(/\//g, '.');
      
      // 20250908 -> 2025.09.08
      if (/^\d{8}$/.test(normalized)) {
        normalized = normalized.substring(0, 4) + '.' + 
                    normalized.substring(4, 6) + '.' + 
                    normalized.substring(6, 8);
      }
      
      return normalized;
    },
    
    // 판례 데이터 정규화
    normalizePrecedentData: function(data) {
      if (!data) return null;
      
      return {
        docId: this.normalize(data.DOC_ID || data.docId || data.doc_id),
        caseNumber: this.normalizeCaseNumber(
          data.NTST_DCM_DSCM_CNTN || data.caseNumber || data.case_number
        ),
        title: (data.TTL || data.title || '').trim(),
        date: this.normalizeDate(
          data.DCM_RGT_DTM || data.registrationDate || data.date
        ),
        original: data
      };
    },
    
    // 배열에서 doc_id로 항목 찾기
    findByDocId: function(array, docId) {
      if (!array || !Array.isArray(array) || !docId) return null;
      
      const normalizedDocId = this.normalize(docId);
      if (!normalizedDocId) return null;
      
      return array.find(item => {
        const itemDocId = this.normalize(
          item.docId || item.DOC_ID || item.doc_id
        );
        return itemDocId === normalizedDocId;
      });
    },
    
    // 배열에서 판례번호로 항목 찾기
    findByCaseNumber: function(array, caseNumber) {
      if (!array || !Array.isArray(array) || !caseNumber) return null;
      
      const normalizedCaseNumber = this.normalizeCaseNumber(caseNumber);
      if (!normalizedCaseNumber) return null;
      
      return array.find(item => {
        const itemCaseNumber = this.normalizeCaseNumber(
          item.caseNumber || item.NTST_DCM_DSCM_CNTN || item.case_number
        );
        return itemCaseNumber === normalizedCaseNumber;
      });
    },
    
    // 디버깅용 포맷팅
    formatForDebug: function(precedentData) {
      if (!precedentData) return 'No data';
      
      return `DocID: ${precedentData.docId || 'N/A'}\n` +
             `Case: ${precedentData.caseNumber || 'N/A'}\n` +
             `Date: ${precedentData.date || 'N/A'}\n` +
             `Title: ${(precedentData.title || 'N/A').substring(0, 50)}...`;
    }
  };
  
  console.log('[DocIdUtils] DocID utilities loaded');
})();