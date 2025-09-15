// Content Script - 판례 상세 내용 가져오기

(function() {
  'use strict';
  
  console.log('[Fetcher] Precedent detail fetcher loaded');
  
  // 판례 상세 페이지 URL 생성
  function buildDetailUrl(docId) {
    // doc_id를 ntstDcmId로 사용
    const baseUrl = 'https://taxlaw.nts.go.kr/pd/USEPDA002P.do';
    
    // wnkey는 임의 생성 (실제로는 서버에서 생성되지만, 대부분의 경우 임의 값도 작동)
    const wnkey = generateWnkey();
    
    const url = `${baseUrl}?ntstDcmId=${docId}&wnkey=${wnkey}`;
    console.log('[Fetcher] Generated detail URL:', url);
    
    return url;
  }
  
  // wnkey 생성 (UUID 형식)
  function generateWnkey() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // 판례 상세 내용 가져오기
  async function fetchPrecedentDetail(docId) {
    try {
      console.log('[Fetcher] Starting fetch for docId:', docId);
      
      // docId가 12자리가 아니면 패딩
      const paddedDocId = String(docId).padStart(12, '0');
      console.log('[Fetcher] Padded docId:', paddedDocId);
      
      // 상세 페이지 URL 생성
      const detailUrl = buildDetailUrl(paddedDocId);
      
      console.log('[Fetcher] Fetching URL:', detailUrl);
      
      // 페이지 가져오기
      const response = await fetch(detailUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
        }
      });
      
      console.log('[Fetcher] Response status:', response.status);
      
      if (!response.ok) {
        console.log('[Fetcher] Response not OK, trying alternate method');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      console.log('[Fetcher] Received HTML, length:', html.length);
      console.log('[Fetcher] HTML preview:', html.substring(0, 200));
      
      // HTML 파싱
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // 상세 내용 추출
      const detailData = extractDetailContent(doc);
      
      return detailData;
      
    } catch (error) {
      console.error('[Fetcher] Error fetching precedent detail:', error);
      throw error;
    }
  }
  
  // HTML에서 상세 내용 추출
  function extractDetailContent(doc) {
    const result = {
      title: null,
      caseNumber: null,
      caseType: null,
      date: null,
      content: null,
      summary: null,
      rawHtml: null
    };
    
    try {
      // 방법 1: 정확한 CSS 선택자로 시도
      // div.bo_body_cont.vertical_scroll 아래의 3번째 div.word_group이고 data-center-type="body_content_htmlCntn"
      const contentElement = doc.querySelector('div.bo_body_cont.vertical_scroll div.word_group[data-center-type="body_content_htmlCntn"]');
      
      if (contentElement) {
        result.content = contentElement.textContent.trim();
        result.rawHtml = contentElement.innerHTML;
        console.log('[Fetcher] Found content via specific selector, length:', result.content.length);
      }
      
      // 방법 2: 모든 word_group 중에서 data-center-type 속성 확인
      if (!result.content) {
        const boBodyCont = doc.querySelector('div.bo_body_cont.vertical_scroll');
        if (boBodyCont) {
          const wordGroups = boBodyCont.querySelectorAll('div.word_group');
          console.log('[Fetcher] Found', wordGroups.length, 'word_group elements');
          
          // 3번째 word_group 또는 data-center-type="body_content_htmlCntn" 속성 가진 요소 찾기
          for (let i = 0; i < wordGroups.length; i++) {
            const group = wordGroups[i];
            if (group.getAttribute('data-center-type') === 'body_content_htmlCntn') {
              result.content = group.textContent.trim();
              result.rawHtml = group.innerHTML;
              console.log('[Fetcher] Found content in word_group index:', i, ', length:', result.content.length);
              break;
            }
          }
          
          // data-center-type 없으면 3번째 word_group 사용
          if (!result.content && wordGroups.length >= 3) {
            const thirdGroup = wordGroups[2]; // 0-indexed, so 2 is the third
            result.content = thirdGroup.textContent.trim();
            result.rawHtml = thirdGroup.innerHTML;
            console.log('[Fetcher] Using 3rd word_group, length:', result.content.length);
          }
        }
      }
      
      // 방법 3: XPath로 시도
      if (!result.content) {
        // XPath: bo_body_cont 클래스를 가진 div 아래의 data-center-type="body_content_htmlCntn" 속성을 가진 word_group
        const xpath = '//div[contains(@class, "bo_body_cont")]//div[contains(@class, "word_group") and @data-center-type="body_content_htmlCntn"]';
        const xpathResult = doc.evaluate(
          xpath,
          doc,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        
        const xpathElement = xpathResult.singleNodeValue;
        if (xpathElement) {
          result.content = xpathElement.textContent.trim();
          result.rawHtml = xpathElement.innerHTML;
          console.log('[Fetcher] Found content via XPath, length:', result.content.length);
        }
      }
      
      // 방법 4: 폴백 - 더 넓은 범위에서 찾기
      if (!result.content) {
        const fallbackElement = doc.querySelector('[data-center-type="body_content_htmlCntn"]');
        if (fallbackElement) {
          result.content = fallbackElement.textContent.trim();
          result.rawHtml = fallbackElement.innerHTML;
          console.log('[Fetcher] Found content via fallback selector, length:', result.content.length);
        }
      }
      
      // 콘텐츠를 찾지 못한 경우 추가 디버깅
      if (!result.content) {
        console.log('[Fetcher] Could not find content, checking document structure...');
        
        // 모든 div.word_group 확인
        const allWordGroups = doc.querySelectorAll('div.word_group');
        console.log('[Fetcher] Total word_group elements in page:', allWordGroups.length);
        
        allWordGroups.forEach((group, index) => {
          const dataType = group.getAttribute('data-center-type');
          console.log(`[Fetcher] word_group[${index}] data-center-type:`, dataType);
          if (dataType === 'body_content_htmlCntn') {
            console.log(`[Fetcher] Found target at index ${index}, content length:`, group.textContent.length);
          }
        });
        
        // bo_body_cont 확인
        const boBodyCont = doc.querySelector('div.bo_body_cont');
        console.log('[Fetcher] bo_body_cont found:', !!boBodyCont);
        if (boBodyCont) {
          console.log('[Fetcher] bo_body_cont classes:', boBodyCont.className);
        }
      }
      
      // 제목 추출 시도 - strong 태그 내의 제목
      const titleElement = doc.querySelector('strong');
      if (!titleElement) {
        const titleFallback = doc.querySelector('.title, h1, h2, [class*="title"]');
        if (titleFallback) {
          result.title = titleFallback.textContent.trim();
        }
      } else {
        result.title = titleElement.textContent.trim();
      }

      // 판례 유형 추출 시도 - li[1] 요소
      const caseTypeElement = doc.querySelector('ul li:first-child');
      if (!caseTypeElement) {
        // XPath로 더 정확히 시도
        const xpath = '//*[@id="bdltCtl"]/li/div[1]/div[1]/a/ul/li[1]';
        const xpathResult = doc.evaluate(
          xpath,
          doc,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        const xpathElement = xpathResult.singleNodeValue;
        if (xpathElement) {
          result.caseType = xpathElement.textContent.trim();
        }
      } else {
        result.caseType = caseTypeElement.textContent.trim();
      }

      // 판례번호 추출 시도
      const caseNumberPattern = /조심-\d{4}-[가-힣]+-\d+|국심-\d{4}-\d+|대법원\s*\d{4}[가-힣]+\d+/;
      const bodyText = doc.body ? doc.body.textContent : '';
      const caseMatch = bodyText.match(caseNumberPattern);
      if (caseMatch) {
        result.caseNumber = caseMatch[0];
      }

      // 날짜 추출 시도
      const datePattern = /\d{4}\.\d{2}\.\d{2}/;
      const dateMatch = bodyText.match(datePattern);
      if (dateMatch) {
        result.date = dateMatch[0];
      }
      
      // 요약 생성 (내용의 처음 500자)
      if (result.content) {
        result.summary = result.content.substring(0, 500) + (result.content.length > 500 ? '...' : '');
      }
      
      console.log('[Fetcher] Extract result:', {
        hasContent: !!result.content,
        contentLength: result.content ? result.content.length : 0,
        hasTitle: !!result.title,
        hasCaseNumber: !!result.caseNumber
      });
      
    } catch (error) {
      console.error('[Fetcher] Error extracting content:', error);
    }
    
    return result;
  }
  
  // 대체 방법: iframe을 통한 콘텐츠 로드 (CORS 이슈 있을 경우)
  async function fetchViaIframe(docId) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = buildDetailUrl(docId);
      
      iframe.onload = function() {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const detailData = extractDetailContent(iframeDoc);
          document.body.removeChild(iframe);
          resolve(detailData);
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      };
      
      iframe.onerror = function(error) {
        document.body.removeChild(iframe);
        reject(error);
      };
      
      document.body.appendChild(iframe);
      
      // 타임아웃 설정
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          reject(new Error('Iframe load timeout'));
        }
      }, 10000);
    });
  }
  
  // 메시지 리스너
  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin) return;
    
    const { type, data } = event.data || {};
    
    if (type === 'MSG_FETCH_DETAIL') {
      console.log('[Fetcher] Received fetch request for docId:', data.docId);
      
      try {
        // 먼저 fetch 시도
        let detailData = await fetchPrecedentDetail(data.docId);
        
        // fetch 실패 시 iframe 시도
        if (!detailData.content) {
          console.log('[Fetcher] Trying iframe method...');
          detailData = await fetchViaIframe(data.docId);
        }
        
        // 응답 전송
        window.postMessage({
          type: 'MSG_DETAIL_FETCHED',
          data: {
            docId: data.docId,
            success: true,
            detail: detailData
          }
        }, window.location.origin);
        
      } catch (error) {
        console.error('[Fetcher] Fetch failed:', error);
        
        // 에러 응답 전송
        window.postMessage({
          type: 'MSG_DETAIL_FETCHED',
          data: {
            docId: data.docId,
            success: false,
            error: error.message
          }
        }, window.location.origin);
      }
    }
  });
  
  // 전역 헬퍼 함수 (디버깅용)
  window.__fetcherTest = async function(docId) {
    try {
      const result = await fetchPrecedentDetail(docId || '200000000000014058');
      console.log('[Fetcher] Test result:', result);
      return result;
    } catch (error) {
      console.error('[Fetcher] Test error:', error);
      return null;
    }
  };
  
  console.log('[Fetcher] Precedent detail fetcher ready');
})();