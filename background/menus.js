// Background Service Worker - 컨텍스트 메뉴 관리

// 컨텍스트 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizePrecedent",
    title: "요약하기",
    contexts: ["all"],
    documentUrlPatterns: ["https://taxlaw.nts.go.kr/*"]
  });
});

// 컨텍스트 메뉴 클릭 이벤트 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarizePrecedent") {
    console.log('[Background] Context menu clicked');
    
    // Content script에 ARM (Activate Right-click Menu) 신호 전송
    chrome.tabs.sendMessage(tab.id, {
      type: 'MSG_ARM_CAPTURE',
      timestamp: Date.now()
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Error sending message:', chrome.runtime.lastError);
      } else {
        console.log('[Background] Response from content script:', response);
      }
    });
  }
});

// Extension 아이콘 클릭 이벤트 (옵션)
chrome.action.onClicked.addListener((tab) => {
  console.log('[Background] Extension icon clicked');
});

// 판례 상세 페이지 가져오기 함수 (새 탭 방식)
async function fetchPrecedentDetailViaTab(docId, senderId) {
  return new Promise((resolve) => {
    console.log('[Background] Opening new tab for docId:', docId);
    
    // docId가 12자리가 아니면 패딩
    const paddedDocId = String(docId).padStart(12, '0');
    
    // UUID 생성
    const wnkey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    const detailUrl = `https://taxlaw.nts.go.kr/pd/USEPDA002P.do?ntstDcmId=${paddedDocId}&wnkey=${wnkey}`;
    console.log('[Background] Opening URL:', detailUrl);
    
    // 새 탭을 백그라운드에서 열기
    chrome.tabs.create({ 
      url: detailUrl, 
      active: false  // 백그라운드에서 열기
    }, (tab) => {
      const tabId = tab.id;
      console.log('[Background] Created tab:', tabId);
      
      // 페이지 로딩 완료 대기
      const checkLoaded = setInterval(() => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            clearInterval(checkLoaded);
            resolve({
              success: false,
              docId: docId,
              error: 'Tab was closed'
            });
            return;
          }
          
          if (tab.status === 'complete') {
            clearInterval(checkLoaded);
            console.log('[Background] Tab loaded, waiting for content to render...');
            
            // 페이지가 완전히 렌더링될 때까지 추가 대기
            setTimeout(() => {
              console.log('[Background] Injecting extraction script...');
              
              // 콘텐츠 스크립트 주입
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: extractContentFromPage
              }, (results) => {
              // 탭 닫기 (에러 처리 포함)
              chrome.tabs.remove(tabId, () => {
                if (chrome.runtime.lastError) {
                  console.log('[Background] Tab already closed:', chrome.runtime.lastError.message);
                }
              });
              
              if (results && results[0] && results[0].result) {
                const extractedData = results[0].result;
                console.log('[Background] Content extracted successfully:', {
                  hasContent: !!extractedData.content,
                  contentLength: extractedData.content ? extractedData.content.length : 0,
                  contentPreview: extractedData.content ? extractedData.content.substring(0, 100) + '...' : 'null',
                  caseNumber: extractedData.caseNumber,
                  date: extractedData.date,
                  debug: extractedData.debug
                });
                resolve({
                  success: true,
                  docId: docId,
                  content: extractedData,
                  htmlLength: extractedData.content ? extractedData.content.length : 0
                });
              } else {
                console.log('[Background] Content extraction failed');
                resolve({
                  success: false,
                  docId: docId,
                  error: 'Failed to extract content'
                });
              }
            });
            }, 3000); // 3초 추가 대기
          }
        });
      }, 500);
      
      // 30초 타임아웃
      setTimeout(() => {
        clearInterval(checkLoaded);
        chrome.tabs.remove(tabId, () => {
          if (chrome.runtime.lastError) {
            console.log('[Background] Tab cleanup on timeout:', chrome.runtime.lastError.message);
          }
        });
        resolve({
          success: false,
          docId: docId,
          error: 'Timeout'
        });
      }, 30000);
    });
  });
}

// 페이지에서 콘텐츠 추출하는 함수 (주입될 스크립트)
function extractContentFromPage() {
  const result = {
    content: null,
    title: null,
    caseNumber: null,
    date: null,
    debug: {}
  };
  
  try {
    // 디버깅 정보 수집
    result.debug.url = window.location.href;
    result.debug.hasDataCenterType = !!document.querySelector('[data-center-type="body_content_htmlCntn"]');
    result.debug.wordGroupCount = document.querySelectorAll('.word_group').length;
    result.debug.hasBoBodyCont = !!document.querySelector('.bo_body_cont.vertical_scroll');
    result.debug.hasBoBodyContAny = !!document.querySelector('.bo_body_cont');
    result.debug.bodyLength = document.body ? document.body.innerText.length : 0;
    
    // 방법 1: bo_body_cont.vertical_scroll 내부에서 data-center-type 속성으로 찾기 (가장 정확한 방법)
    const boBodyContainer = document.querySelector('.bo_body_cont.vertical_scroll');
    if (boBodyContainer) {
      const contentElement = boBodyContainer.querySelector('[data-center-type="body_content_htmlCntn"]');
      if (contentElement) {
        result.content = contentElement.innerText || contentElement.textContent;
        result.debug.method = 'bo_body_cont > data-center-type';
        console.log('Found content via bo_body_cont > data-center-type, length:', result.content.length);
      }
    }
    
    // 방법 2: 전체 문서에서 data-center-type 속성으로 찾기 (fallback)
    if (!result.content) {
      const contentElement = document.querySelector('[data-center-type="body_content_htmlCntn"]');
      if (contentElement) {
        result.content = contentElement.innerText || contentElement.textContent;
        result.debug.method = 'data-center-type (global)';
        console.log('Found content via data-center-type (global), length:', result.content.length);
      }
    }
    
    // 방법 3: word_group 클래스로 찾기
    if (!result.content) {
      const wordGroups = document.querySelectorAll('.word_group');
      if (wordGroups.length >= 3) {
        result.content = wordGroups[2].innerText || wordGroups[2].textContent;
        result.debug.method = 'word_group[2]';
        console.log('Found content via word_group[2], length:', result.content.length);
      } else if (wordGroups.length > 0) {
        // 첫 번째 word_group이라도 사용
        result.content = wordGroups[0].innerText || wordGroups[0].textContent;
        result.debug.method = 'word_group[0]';
        console.log('Found content via word_group[0], length:', result.content.length);
      }
    }
    
    // 방법 4: bo_body_cont 내부에서 word_group 찾기
    if (!result.content) {
      const boBody = document.querySelector('.bo_body_cont.vertical_scroll');
      if (boBody) {
        const wordGroupsInBody = boBody.querySelectorAll('.word_group');
        result.debug.wordGroupsInBoBody = wordGroupsInBody.length;
        
        for (let i = 0; i < wordGroupsInBody.length; i++) {
          const group = wordGroupsInBody[i];
          if (group.getAttribute('data-center-type') === 'body_content_htmlCntn') {
            result.content = group.innerText || group.textContent;
            result.debug.method = 'bo_body_cont word_group[' + i + ']';
            console.log('Found content in bo_body_cont at index', i, ', length:', result.content.length);
            break;
          }
        }
        
        // data-center-type이 없으면 그냥 첫 번째 word_group 사용
        if (!result.content && wordGroupsInBody.length > 0) {
          result.content = wordGroupsInBody[0].innerText || wordGroupsInBody[0].textContent;
          result.debug.method = 'bo_body_cont fallback';
          console.log('Using first word_group in bo_body_cont, length:', result.content.length);
        }
      }
    }
    
    // 방법 4: 아무 콘텐츠나 찾기 (최후의 수단)
    if (!result.content) {
      const anyContent = document.querySelector('.content, .detail, .body, [class*="content"]');
      if (anyContent) {
        result.content = anyContent.innerText || anyContent.textContent;
        result.debug.method = 'any content selector';
        console.log('Found content via generic selector, length:', result.content.length);
      }
    }
    
    // 방법 5: 페이지에 텍스트가 있는지 확인 (극단적 폴백)
    if (!result.content && document.body && document.body.innerText.length > 100) {
      // body의 텍스트 중 일부 추출
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').filter(line => line.trim().length > 10);
      
      // 중요한 부분 찾기
      let startIndex = -1;
      const keywords = ['사실관계', '이유', '판단', '사건', '청구', '처분', '결정'];
      
      for (let i = 0; i < lines.length; i++) {
        for (const keyword of keywords) {
          if (lines[i].includes(keyword)) {
            startIndex = i;
            break;
          }
        }
        if (startIndex >= 0) break;
      }
      
      if (startIndex >= 0) {
        // 키워드 이후 100줄 추출
        result.content = lines.slice(startIndex, startIndex + 100).join('\n');
        result.debug.method = 'body text extraction from line ' + startIndex;
      } else {
        // 그냥 처음 100줄 추출
        result.content = lines.slice(0, 100).join('\n');
        result.debug.method = 'body text first 100 lines';
      }
      
      console.log('Extracted from body text, length:', result.content.length);
    }
    
    // 판례번호 찾기
    const caseNumberMatch = document.body.innerText.match(/조심-\d{4}-[가-힣]+-\d+|국심-\d{4}-\d+|대법원\s*\d{4}[가-힣]+\d+/);
    if (caseNumberMatch) {
      result.caseNumber = caseNumberMatch[0];
    }
    
    // 날짜 찾기
    const dateMatch = document.body.innerText.match(/\d{4}\.\d{2}\.\d{2}/);
    if (dateMatch) {
      result.date = dateMatch[0];
    }
    
  } catch (error) {
    console.error('Error extracting content:', error);
  }
  
  return result;
}

// 기존 fetch 함수 (폴백용)
async function fetchPrecedentDetail(docId) {
  try {
    console.log('[Background] Fetching precedent detail for docId:', docId);
    
    // docId가 12자리가 아니면 패딩
    const paddedDocId = String(docId).padStart(12, '0');
    
    // UUID 생성
    const wnkey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    const detailUrl = `https://taxlaw.nts.go.kr/pd/USEPDA002P.do?ntstDcmId=${paddedDocId}&wnkey=${wnkey}`;
    console.log('[Background] Fetching URL:', detailUrl);
    
    // Background script에서는 CORS 제한 없이 fetch 가능
    const response = await fetch(detailUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('[Background] Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('[Background] Received HTML, length:', html.length);
    
    // HTML 일부를 콘솔에 출력 (디버깅용)
    if (html.includes('조심') || html.includes('국심') || html.includes('대법원')) {
      console.log('[Background] HTML contains case number');
    }
    
    // HTML을 파일로 저장하는 방법 (디버깅용 - 임시)
    console.log('[Background] To debug, copy this to console:');
    console.log('copy(', JSON.stringify(html.substring(0, 10000)), ')');
    
    // HTML에서 data-center-type 속성 확인
    const dataCenterTypes = html.match(/data-center-type="[^"]+"/g);
    if (dataCenterTypes) {
      console.log('[Background] Found data-center-type attributes:', dataCenterTypes.slice(0, 10));
      
      // body_content_htmlCntn 찾기
      const hasBodyContent = dataCenterTypes.some(attr => attr.includes('body_content_htmlCntn'));
      console.log('[Background] Has body_content_htmlCntn:', hasBodyContent);
    }
    
    // word_group 클래스 확인
    const wordGroupCount = (html.match(/class="[^"]*word_group[^"]*"/g) || []).length;
    console.log('[Background] Found word_group classes:', wordGroupCount);
    
    // HTML 샘플 저장 (디버깅용)
    if (html.includes('data-center-type')) {
      const sampleStart = html.indexOf('data-center-type');
      const sample = html.substring(Math.max(0, sampleStart - 100), Math.min(html.length, sampleStart + 500));
      console.log('[Background] HTML sample around data-center-type:', sample);
    }
    
    // HTML 파싱 및 콘텐츠 추출
    // DOMParser는 background script에서 사용 불가, 정규식으로 추출
    const content = extractContentFromHTML(html);
    
    // 콘텐츠가 비어있으면 전체 HTML에서 텍스트 추출 시도
    if (!content.content) {
      console.log('[Background] Content extraction failed, trying fallback...');
      
      // 간단한 테스트: HTML에 실제 내용이 있는지 확인
      if (html.includes('판례') || html.includes('사실관계') || html.includes('판단')) {
        console.log('[Background] HTML contains legal terms');
        
        // 모든 텍스트 추출 (태그 제거)
        const allText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
        
        // 판례 내용 부분만 추출 (키워드 기반)
        const startKeywords = ['사실관계', '이유', '판단', '결정', '사건개요'];
        let contentStart = -1;
        
        for (const keyword of startKeywords) {
          const index = allText.indexOf(keyword);
          if (index > 0 && (contentStart === -1 || index < contentStart)) {
            contentStart = index;
          }
        }
        
        if (contentStart > 0) {
          content.content = allText.substring(contentStart, Math.min(contentStart + 5000, allText.length));
          console.log('[Background] Extracted content from keyword position, length:', content.content.length);
        } else {
          // 그냥 중간 부분 추출
          const midPoint = Math.floor(allText.length / 2);
          content.content = allText.substring(midPoint - 2500, midPoint + 2500);
          console.log('[Background] Extracted middle portion, length:', content.content.length);
        }
      }
    }
    
    console.log('[Background] Final extraction result:', {
      hasContent: !!content.content,
      contentLength: content.content ? content.content.length : 0,
      caseNumber: content.caseNumber,
      date: content.date
    });
    
    return {
      success: true,
      docId: docId,
      content: content,
      htmlLength: html.length
    };
    
  } catch (error) {
    console.error('[Background] Error fetching precedent detail:', error);
    return {
      success: false,
      docId: docId,
      error: error.message
    };
  }
}

// HTML에서 콘텐츠 추출 (정규식 사용)
function extractContentFromHTML(html) {
  const result = {
    content: null,
    title: null,
    caseNumber: null,
    date: null
  };
  
  try {
    console.log('[Background] Starting content extraction from HTML');
    
    // 방법 1: data-center-type="body_content_htmlCntn" 속성을 가진 div 찾기 (중첩 div 고려)
    const contentRegex = /data-center-type="body_content_htmlCntn"[^>]*>([\s\S]*?)(<div[^>]*data-center-type|<\/div[^>]*class="word_group")/;
    const contentMatch = html.match(contentRegex);
    if (contentMatch) {
      result.content = contentMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
      console.log('[Background] Method 1: Extracted content length:', result.content.length);
    }
    
    // 방법 2: word_group 클래스와 data-center-type 속성 함께 찾기
    if (!result.content || result.content.length < 100) {
      // 더 정확한 패턴: class 속성과 data-center-type 속성 순서 상관없이
      const patterns = [
        /<div[^>]*class="[^"]*word_group[^"]*"[^>]*data-center-type="body_content_htmlCntn"[^>]*>([\s\S]*?)(<\/div>[\s\S]*?<div[^>]*class="word_group"|$)/,
        /<div[^>]*data-center-type="body_content_htmlCntn"[^>]*class="[^"]*word_group[^"]*"[^>]*>([\s\S]*?)(<\/div>[\s\S]*?<div[^>]*class="word_group"|$)/
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const extracted = match[1]
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (extracted.length > (result.content ? result.content.length : 0)) {
            result.content = extracted;
            console.log('[Background] Method 2: Extracted content length:', result.content.length);
          }
        }
      }
    }
    
    // 방법 3: bo_body_cont 내부의 모든 word_group 확인
    if (!result.content || result.content.length < 100) {
      // bo_body_cont 찾기
      const boBodyMatch = html.match(/<div[^>]*class="[^"]*bo_body_cont[^"]*"[^>]*>([\s\S]*?)<\/div>[\s]*<\/div>[\s]*<\/div>/);
      if (boBodyMatch) {
        const boBodyContent = boBodyMatch[1];
        // word_group들 찾기
        const wordGroups = boBodyContent.match(/<div[^>]*class="[^"]*word_group[^"]*"[^>]*>[\s\S]*?<\/div>/g);
        if (wordGroups && wordGroups.length >= 3) {
          // 3번째 word_group 추출 (0-indexed로 2)
          const thirdGroup = wordGroups[2];
          result.content = thirdGroup
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          console.log('[Background] Method 3: Used 3rd word_group, length:', result.content.length);
        }
      }
    }
    
    // 방법 4: 더 넓은 범위에서 찾기 (최후의 수단)
    if (!result.content || result.content.length < 100) {
      // 가장 간단한 패턴으로 시도
      const simpleMatch = html.match(/data-center-type="body_content_htmlCntn"[^>]*>([^<]+)</);
      if (simpleMatch) {
        result.content = simpleMatch[1]
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .trim();
        console.log('[Background] Method 4: Simple pattern, length:', result.content.length);
      }
    }
    
    // 판례번호 추출
    const caseNumberMatch = html.match(/조심-\d{4}-[가-힣]+-\d+|국심-\d{4}-\d+|대법원\s*\d{4}[가-힣]+\d+/);
    if (caseNumberMatch) {
      result.caseNumber = caseNumberMatch[0];
    }
    
    // 날짜 추출
    const dateMatch = html.match(/\d{4}\.\d{2}\.\d{2}/);
    if (dateMatch) {
      result.date = dateMatch[0];
    }
    
  } catch (error) {
    console.error('[Background] Error extracting content:', error);
  }
  
  return result;
}

// 메시지 리스너 (Content script와의 통신)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request.type);
  
  switch(request.type) {
    case 'MSG_GET_TAB_INFO':
      sendResponse({
        tabId: sender.tab.id,
        url: sender.tab.url
      });
      break;
      
    case 'MSG_LOG':
      console.log('[Background Log]', request.data);
      sendResponse({ success: true });
      break;
      
    case 'MSG_FETCH_DETAIL':
      // 새 탭 방식 시도
      fetchPrecedentDetailViaTab(request.docId, sender.tab.id).then(result => {
        sendResponse(result);
      }).catch(error => {
        console.error('[Background] Tab method failed, trying fetch:', error);
        // 실패시 기존 fetch 방식으로 폴백
        fetchPrecedentDetail(request.docId).then(result => {
          sendResponse(result);
        });
      });
      return true; // 비동기 응답을 위해 true 반환
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return false; // 동기적 응답
});