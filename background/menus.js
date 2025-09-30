// Background Service Worker - 백엔드 서버 연동 버전
// 주요 변경: OpenAI 직접 호출 → 백엔드 서버 경유

// 백엔드 서버 설정
// const BACKEND_URL = 'http://localhost:3000';  // 로컬 개발용
const BACKEND_URL = 'https://taxlaw-backend.vercel.app';  // 프로덕션용

// API 키는 이제 백엔드 서버에서 관리하므로 Extension에서는 불필요
// let OPENAI_API_KEY = null;  // 제거

// 백엔드 서버 상태 확인
async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const data = await response.json();
    console.log('[Background] Backend server status:', data.status);
    console.log('[Background] OpenAI status:', data.openaiStatus);
    return data.apiKeyConfigured && data.openaiStatus === 'connected';
  } catch (error) {
    console.error('[Background] Backend server not available:', error);
    return false;
  }
}

// 확장 프로그램 설치/업데이트 시 실행
chrome.runtime.onInstalled.addListener(async () => {
  // 컨텍스트 메뉴 생성
  chrome.contextMenus.create({
    id: "summarizePrecedent",
    title: "AI로 판례 요약하기",
    contexts: ["all"],
    documentUrlPatterns: ["https://taxlaw.nts.go.kr/*"]
  });

  // 백엔드 서버 상태 확인
  const serverReady = await checkBackendHealth();
  if (serverReady) {
    console.log('[Background] Backend server is ready');
  } else {
    console.warn('[Background] Backend server is not ready. Please check server status.');
  }
});

// 확장 프로그램 시작 시 백엔드 서버 확인
chrome.runtime.onStartup.addListener(async () => {
  await checkBackendHealth();
});

// 컨텍스트 메뉴 클릭 이벤트 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarizePrecedent") {
    console.log('[Background] Context menu clicked - AI 요약 시작');

    // First, check if content scripts are already injected
    chrome.tabs.sendMessage(tab.id, {
      type: 'MSG_ARM_CAPTURE',
      timestamp: Date.now()
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script가 아직 로드되지 않은 경우
        if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
          console.log('[Background] Content script not ready, injecting...');

          // Content scripts 주입
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
              'lib/network-id.js',
              'lib/docid-utils.js',
              'llm/prompts/default.js',
              'llm/prompts/simpan.js',
              'llm/prompts/simsa.js',
              'llm/prompts/index.js',
              'llm/api.js',
              'content/capture.js',
              'content/bridge.js',
              'content/panel.view.js'
            ]
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('[Background] Failed to inject content scripts:', chrome.runtime.lastError);
              return;
            }

            // 스크립트 주입 후 잠시 대기 후 재시도
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                type: 'MSG_ARM_CAPTURE',
                timestamp: Date.now()
              }, (retryResponse) => {
                if (chrome.runtime.lastError) {
                  console.error('[Background] Still failed after injection:', chrome.runtime.lastError);
                } else {
                  console.log('[Background] Success after injection:', retryResponse);
                }
              });
            }, 500);
          });
        } else {
          console.error('[Background] Unexpected error:', chrome.runtime.lastError);
        }
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

// 백엔드 서버를 통한 OpenAI API 호출
async function callOpenAI({ messages, model = 'gpt-4o-mini', temperature = 0.2, max_tokens = 2000, stream = false, timeout = 30000, reqId = null }) {
  console.log('[Background] Calling backend server for OpenAI API');
  console.log('[Background] Request details:');
  console.log('- Model:', model);
  console.log('- Temperature:', temperature);
  console.log('- Max tokens:', max_tokens);
  console.log('- Messages count:', messages ? messages.length : 0);
  console.log('- Backend URL:', BACKEND_URL);

  // 메시지 로깅 (디버깅용)
  if (messages && messages.length > 0) {
    messages.forEach((msg, idx) => {
      if (msg.role === 'system') {
        console.log(`- Message ${idx} [SYSTEM]: ${msg.content.length} characters`);
      } else {
        console.log(`- Message ${idx} [${msg.role}]: ${msg.content.substring(0, 100)}...`);
      }
    });
  }

  try {
    // 백엔드 서버로 요청 전송
    const response = await fetch(`${BACKEND_URL}/api/llm/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Id': chrome.runtime.id,  // Extension ID 전송
        'X-Request-Id': reqId || Date.now().toString()
      },
      body: JSON.stringify({
        messages,
        model,
        temperature,
        max_tokens,
        stream,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Backend server error (${response.status}): ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log('[Background] Backend server response received:', {
      success: data.success,
      textLength: data.text ? data.text.length : 0,
      usage: data.usage
    });

    // Extension이 기대하는 형식으로 반환
    return {
      text: data.text || data.result,  // 백엔드가 text 또는 result로 반환
      usage: data.usage,
      ok: data.success || data.ok
    };

  } catch (error) {
    console.error('[Background] Backend server call error:', error);

    // 백엔드 서버 연결 실패 시 사용자 친화적 메시지
    if (error.message.includes('Failed to fetch')) {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }

    throw error;
  }
}

// 판례 상세 페이지 가져오기 함수 (새 탭 방식)
async function fetchPrecedentDetailViaTab(docId, senderId, docType, caseType) {
  return new Promise((resolve) => {
    console.log('[Background] Opening new tab for docId:', docId, 'docType:', docType, 'caseType:', caseType);

    // docId가 001로 시작하면 제거 (질의의 경우)
    let processedDocId = String(docId);
    if (processedDocId.startsWith('001')) {
      processedDocId = processedDocId.substring(3);
      console.log('[Background] Removed 001 prefix, new docId:', processedDocId);
    }

    // UUID 생성
    const wnkey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    // docType에 따라 다른 URL 사용
    console.log('[Background] DocType check:', docType, 'is 질의?', docType === '질의');

    let detailUrl;
    if (docType === 'question' || docType === '질의') {
      console.log('[Background] Using QUESTION URL (qt)');
      detailUrl = `https://taxlaw.nts.go.kr/qt/USEQTA002P.do?ntstDcmId=${processedDocId}&wnKey=${wnkey}`;
    } else {
      console.log('[Background] Using PRECEDENT URL (pd)');
      // 판례의 경우 12자리 패딩 필요할 수 있음
      const paddedDocId = processedDocId.length < 12 ? processedDocId.padStart(12, '0') : processedDocId;
      detailUrl = `https://taxlaw.nts.go.kr/pd/USEPDA002P.do?ntstDcmId=${paddedDocId}&wnkey=${wnkey}`;
    }
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
            console.log('[Background] Tab loaded, waiting for specific elements...');

            // 특정 요소가 나타날 때까지 기다리는 스크립트 주입
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: () => {
                return new Promise((resolve) => {
                  let attempts = 0;
                  const maxAttempts = 40; // 최대 20초 대기 (500ms * 40)

                  const checkElements = setInterval(() => {
                    attempts++;

                    // 정확한 경로의 요소 확인
                    const bodyContent = document.querySelector('div[data-center-type="body_content"]');
                    let targetElement = null;

                    if (bodyContent) {
                      const wordGroups = bodyContent.querySelectorAll('div.word_group');

                      // 3번째 word_group (인덱스 2) 확인
                      if (wordGroups.length >= 3) {
                        const thirdWordGroup = wordGroups[2];

                        // 3번째 word_group 자체가 body_content_htmlCntn인지 확인
                        if (thirdWordGroup.getAttribute('data-center-type') === 'body_content_htmlCntn') {
                          targetElement = thirdWordGroup;
                        } else {
                          // 3번째 word_group 내부에서 body_content_htmlCntn 찾기
                          targetElement = thirdWordGroup.querySelector('[data-center-type="body_content_htmlCntn"]');
                        }
                      }
                    }

                    console.log(`[Background] Attempt ${attempts}: bodyContent=${!!bodyContent}, wordGroups=${bodyContent ? bodyContent.querySelectorAll('div.word_group').length : 0}, targetFound=${!!targetElement}`);

                    // 목표 요소를 찾았거나 최대 시도 횟수 도달
                    if (targetElement || attempts >= maxAttempts) {
                      clearInterval(checkElements);
                      if (targetElement) {
                        console.log('[Background] Target element found! Text length:', targetElement.innerText?.length || 0);
                      } else {
                        console.log('[Background] Timeout - target element not found');
                      }
                      resolve(true);
                    }
                  }, 500);
                });
              }
            }, (results) => {
              // 첫 번째 스크립트 실행 에러 체크
              if (chrome.runtime.lastError) {
                console.error('[Background] Error waiting for elements:', chrome.runtime.lastError);
                chrome.tabs.remove(tabId, () => {});
                resolve({
                  success: false,
                  docId: docId,
                  error: 'Failed to wait for page elements: ' + chrome.runtime.lastError.message
                });
                return;
              }

              if (!results || !results[0]) {
                console.error('[Background] No results from wait script');
                chrome.tabs.remove(tabId, () => {});
                resolve({
                  success: false,
                  docId: docId,
                  error: 'Failed to execute wait script'
                });
                return;
              }
              // 요소가 로드된 후 콘텐츠 추출
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: extractContentFromPage,
                args: [caseType]  // caseType을 인자로 전달
              }, (results) => {
                // 탭 닫기 (에러 처리 포함)
                chrome.tabs.remove(tabId, () => {
                  if (chrome.runtime.lastError) {
                    console.log('[Background] Tab already closed:', chrome.runtime.lastError.message);
                  }
                });

                // 두 번째 스크립트 실행 에러 체크
                if (chrome.runtime.lastError) {
                  console.error('[Background] Error extracting content:', chrome.runtime.lastError);
                  resolve({
                    success: false,
                    docId: docId,
                    error: 'Failed to extract content: ' + chrome.runtime.lastError.message
                  });
                  return;
                }

                if (results && results[0] && results[0].result) {
                  const extractedData = results[0].result;
                  console.log('[Background] Content extracted successfully:', {
                    hasContent: !!extractedData.content,
                    contentLength: extractedData.content ? extractedData.content.length : 0,
                    caseNumber: extractedData.caseNumber,
                    date: extractedData.date,
                    hasGist: !!extractedData.gist,
                    gistLength: extractedData.gist ? extractedData.gist.length : 0,
                    hasDecision: !!extractedData.decision,
                    decisionLength: extractedData.decision ? extractedData.decision.length : 0,
                    hasReply: !!extractedData.reply,
                    replyLength: extractedData.reply ? extractedData.reply.length : 0,
                    docType: extractedData.docType,
                    debug: extractedData.debug
                  });

                  // 디버그 정보 상세 출력
                  if (extractedData.debug) {
                    console.log('[Background] Extraction Debug Info:', extractedData.debug);
                  }

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
            });
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
function extractContentFromPage(passedCaseType) {
  const result = {
    content: null,
    title: null,
    caseNumber: null,
    date: null,
    gist: null,  // 요지 추가
    reply: null, // 회신 추가
    decision: null, // 결정내용 추가
    docType: null, // 문서 타입 추가
    caseType: passedCaseType, // 전달받은 caseType 저장
    debug: {}
  };

  try {
    // 디버깅 정보 수집
    result.debug.url = window.location.href;
    result.debug.hasDataCenterType = !!document.querySelector('[data-center-type="body_content_htmlCntn"]');
    result.debug.wordGroupCount = document.querySelectorAll('.word_group').length;
    result.debug.bodyLength = document.body ? document.body.innerHTML.length : 0;
    result.debug.hasBodyContent = !!document.querySelector('[data-center-type="body_content"]');
    result.debug.hasBoBodyCont = !!document.querySelector('.bo_body_cont');

    // 모든 클래스 이름 수집 (디버깅용)
    const allClasses = new Set();
    document.querySelectorAll('*').forEach(el => {
      if (el.className && typeof el.className === 'string') {
        el.className.split(' ').forEach(cls => {
          if (cls) allClasses.add(cls);
        });
      }
    });
    result.debug.uniqueClasses = Array.from(allClasses).slice(0, 20); // 처음 20개만

    // URL에서 문서 타입 확인 (qt = 질의, pd = 판례)
    const isQuestion = window.location.pathname.includes('/qt/');
    result.docType = isQuestion ? '질의' : '판례';

    // URL 파라미터에서 ntstDcmClCd 확인
    const urlParams = new URLSearchParams(window.location.search);
    const ntstDcmClCd = urlParams.get('ntstDcmClCd');
    const shouldExtractGistAndDecision = (ntstDcmClCd === '09' || ntstDcmClCd === '10');
    console.log('[Extract] ntstDcmClCd:', ntstDcmClCd, 'shouldExtractGistAndDecision:', shouldExtractGistAndDecision);

    // 심사/심판/적부/이의/헌재/판례/종소 유형 확인 - 상세 페이지의 특정 위치에서 확인
    let isSimsa = false;
    let isSimpan = false;
    let isJeokbu = false;
    let isEui = false;
    let isHeonjae = false;
    let isPanrye = false;
    let isJongso = false;
    let hasGistAndDecision = false;  // 요지와 결정/판결내용이 있는 유형인지 확인
    let detectedCaseType = null;

    // 1. 상세 페이지의 legislation_list에서 유형 추출 (상세 페이지 구조)
    // 상세 페이지에서는 ul.legislation_list가 직접적으로 존재
    const legislationListElement = document.querySelector('ul.legislation_list li:first-child');

    if (legislationListElement) {
      detectedCaseType = legislationListElement.textContent.trim();
      console.log('[Extract] legislation_list에서 유형 추출:', detectedCaseType);

      if (detectedCaseType === '심사' || detectedCaseType.includes('심사')) {
        isSimsa = true;
        result.docType = '심사';
        result.caseType = '심사';
        console.log('[Extract] 심사 유형 확인됨 (legislation_list)');
      } else if (detectedCaseType === '심판' || detectedCaseType.includes('심판')) {
        isSimpan = true;
        result.docType = '심판';
        result.caseType = '심판';
        console.log('[Extract] 심판 유형 확인됨 (legislation_list)');
      } else if (detectedCaseType === '적부' || detectedCaseType.includes('적부')) {
        isJeokbu = true;
        result.docType = '적부';
        result.caseType = '적부';
        console.log('[Extract] 적부 유형 확인됨 (legislation_list)');
      } else if (detectedCaseType === '이의' || detectedCaseType.includes('이의')) {
        isEui = true;
        result.docType = '이의';
        result.caseType = '이의';
        console.log('[Extract] 이의 유형 확인됨 (legislation_list)');
      } else if (detectedCaseType === '헌재' || detectedCaseType.includes('헌재')) {
        isHeonjae = true;
        result.docType = '헌재';
        result.caseType = '헌재';
        console.log('[Extract] 헌재 유형 확인됨 (legislation_list)');
      } else if (detectedCaseType === '판례' || detectedCaseType.includes('판례')) {
        isPanrye = true;
        result.docType = '판례';
        result.caseType = '판례';
        console.log('[Extract] 판례 유형 확인됨 (legislation_list)');
      } else if (detectedCaseType === '종소' || detectedCaseType.includes('종소')) {
        isJongso = true;
        result.docType = '종소';
        result.caseType = '종소';
        console.log('[Extract] 종소 유형 확인됨 (legislation_list)');
      }

      // 모든 유형에 대해 요지와 결정/판결내용 추출 필요
      if (detectedCaseType || shouldExtractGistAndDecision) {
        hasGistAndDecision = true;
        console.log('[Extract] 요지와 결정/판결내용 추출 필요 유형:', detectedCaseType, '(ntstDcmClCd:', ntstDcmClCd, ')');
      }
    }

    // 2. 대체 방법: data-value-type 속성 확인
    if (!detectedCaseType) {
      const typeElements = document.querySelectorAll('[data-value-type]');
      typeElements.forEach(el => {
        const typeValue = el.getAttribute('data-value-type');
        const typeText = el.textContent.trim();
        console.log('[Extract] data-value-type element:', typeValue, typeText);

        if (typeText === '심사' || typeText.includes('심사')) {
          detectedCaseType = typeText;
          isSimsa = true;
          result.docType = '심사';
          result.caseType = '심사';
          console.log('[Extract] 심사 유형 확인됨 (data-value-type)');
        } else if (typeText === '심판' || typeText.includes('심판')) {
          detectedCaseType = typeText;
          isSimpan = true;
          result.docType = '심판';
          result.caseType = '심판';
          console.log('[Extract] 심판 유형 확인됨 (data-value-type)');
        } else if (typeText === '적부' || typeText.includes('적부')) {
          detectedCaseType = typeText;
          isJeokbu = true;
          result.docType = '적부';
          result.caseType = '적부';
          console.log('[Extract] 적부 유형 확인됨 (data-value-type)');
        } else if (typeText === '이의' || typeText.includes('이의')) {
          detectedCaseType = typeText;
          isEui = true;
          result.docType = '이의';
          result.caseType = '이의';
          console.log('[Extract] 이의 유형 확인됨 (data-value-type)');
        } else if (typeText === '헌재' || typeText.includes('헌재')) {
          detectedCaseType = typeText;
          isHeonjae = true;
          result.docType = '헌재';
          result.caseType = '헌재';
          console.log('[Extract] 헌재 유형 확인됨 (data-value-type)');
        } else if (typeText === '판례' || typeText.includes('판례')) {
          detectedCaseType = typeText;
          isPanrye = true;
          result.docType = '판례';
          result.caseType = '판례';
          console.log('[Extract] 판례 유형 확인됨 (data-value-type)');
        }
      });
    }

    // 3. 전달받은 caseType이 있으면 사용 ('강제추출' 포함)
    if (!hasGistAndDecision) {
      // '강제추출'일 때는 무조건 요지와 결정내용 추출
      if (passedCaseType === '강제추출') {
        hasGistAndDecision = true;
        console.log('[Extract] 강제추출 모드 - 유형에 관계없이 요지/결정내용 추출');
      }
      if (passedCaseType === '심사') {
        isSimsa = true;
        result.docType = '심사';
        result.caseType = '심사';
        console.log('[Extract] 전달받은 caseType으로 심사 유형 확인:', passedCaseType);
      } else if (passedCaseType === '심판') {
        isSimpan = true;
        result.docType = '심판';
        result.caseType = '심판';
        console.log('[Extract] 전달받은 caseType으로 심판 유형 확인:', passedCaseType);
      } else if (passedCaseType === '적부') {
        isJeokbu = true;
        result.docType = '적부';
        result.caseType = '적부';
        console.log('[Extract] 전달받은 caseType으로 적부 유형 확인:', passedCaseType);
      } else if (passedCaseType === '이의') {
        isEui = true;
        result.docType = '이의';
        result.caseType = '이의';
        console.log('[Extract] 전달받은 caseType으로 이의 유형 확인:', passedCaseType);
      } else if (passedCaseType === '헌재') {
        isHeonjae = true;
        result.docType = '헌재';
        result.caseType = '헌재';
        console.log('[Extract] 전달받은 caseType으로 헌재 유형 확인:', passedCaseType);
      } else if (passedCaseType === '판례') {
        isPanrye = true;
        result.docType = '판례';
        result.caseType = '판례';
        console.log('[Extract] 전달받은 caseType으로 판례 유형 확인:', passedCaseType);
      } else if (passedCaseType === '종소') {
        isJongso = true;
        result.docType = '종소';
        result.caseType = '종소';
        console.log('[Extract] 전달받은 caseType으로 종소 유형 확인:', passedCaseType);
      }

      // 전달받은 caseType이 있거나 ntstDcmClCd가 09/10이면 요지와 결정/판겲내용 추출
      if (passedCaseType || shouldExtractGistAndDecision) {
        hasGistAndDecision = true;
        console.log('[Extract] 요지/결정내용 추출 필요:', passedCaseType, '(ntstDcmClCd:', ntstDcmClCd, ')');
      }
    }

    // 4. 마지막 폴백: 페이지 텍스트에서 확인
    if (!isSimsa && !isSimpan && !isJeokbu && !isEui && !isHeonjae && !isPanrye) {
      const pageText = document.body.textContent;
      if (pageText.includes('유형 : 심사') || pageText.includes('구분 : 심사')) {
        isSimsa = true;
        result.docType = '심사';
        result.caseType = '심사';
        console.log('[Extract] 페이지 텍스트에서 심사 유형 감지');
      } else if (pageText.includes('유형 : 심판') || pageText.includes('구분 : 심판')) {
        isSimpan = true;
        result.docType = '심판';
        result.caseType = '심판';
        console.log('[Extract] 페이지 텍스트에서 심판 유형 감지');
      } else if (pageText.includes('유형 : 적부') || pageText.includes('구분 : 적부')) {
        isJeokbu = true;
        result.docType = '적부';
        result.caseType = '적부';
        console.log('[Extract] 페이지 텍스트에서 적부 유형 감지');
      } else if (pageText.includes('유형 : 이의') || pageText.includes('구분 : 이의')) {
        isEui = true;
        result.docType = '이의';
        result.caseType = '이의';
        console.log('[Extract] 페이지 텍스트에서 이의 유형 감지');
      } else if (pageText.includes('유형 : 헌재') || pageText.includes('구분 : 헌재')) {
        isHeonjae = true;
        result.docType = '헌재';
        result.caseType = '헌재';
        console.log('[Extract] 페이지 텍스트에서 헌재 유형 감지');
      } else if (pageText.includes('유형 : 판례') || pageText.includes('구분 : 판례')) {
        isPanrye = true;
        result.docType = '판례';
        result.caseType = '판례';
        console.log('[Extract] 페이지 텍스트에서 판례 유형 감지');
      }
    }

    console.log('[Extract] 최종 유형 판단:', {
      isSimsa: isSimsa,
      isSimpan: isSimpan,
      isJeokbu: isJeokbu,
      isEui: isEui,
      isHeonjae: isHeonjae,
      isPanrye: isPanrye,
      docType: result.docType,
      caseType: result.caseType,
      detectedCaseType: detectedCaseType,
      passedCaseType: passedCaseType
    });

    // 질의 유형인 경우 요지와 회신 추출
    if (isQuestion) {
      // 요지 추출
      const gistElement = document.querySelector('div.word_group[data-center-type="body_content_gist"]');
      if (gistElement) {
        result.gist = gistElement.innerText || gistElement.textContent;
        result.debug.gistFound = true;
        result.debug.gistLength = result.gist ? result.gist.length : 0;
      }

      // 회신 추출
      const replyElement = document.querySelector('div.word_group[data-center-type="body_content_cntn"]');
      if (replyElement) {
        result.reply = replyElement.innerText || replyElement.textContent;
        result.debug.replyFound = true;
        result.debug.replyLength = result.reply ? result.reply.length : 0;
      }
    }

    // 모든 유형에 대해 요지와 결정/판결내용 추출 시도 (ntstDcmClCd가 09/10일 때 포함)
    if (hasGistAndDecision || detectedCaseType || passedCaseType || shouldExtractGistAndDecision) {
      const typeName = result.caseType || detectedCaseType || passedCaseType || '판례';
      console.log(`[Extract] ===== ${typeName} 유형 요지/결정내용 추출 시작 =====`);

      // 디버깅을 위한 모든 word_group 요소 확인 (먼저 실행)
      const allWordGroups = document.querySelectorAll('div.word_group');
      console.log('[Extract] 전체 word_group 수:', allWordGroups.length);
      const wordGroupInfo = [];
      allWordGroups.forEach((group, index) => {
        const dataType = group.getAttribute('data-center-type');
        const hasContent = group.textContent && group.textContent.trim().length > 0;
        const info = {
          index: index,
          'data-center-type': dataType,
          'hasContent': hasContent,
          'contentLength': group.textContent ? group.textContent.trim().length : 0
        };
        wordGroupInfo.push(info);
        console.log(`[Extract] word_group[${index}]:`, info);
      });

      // 요지 추출 (심사도 동일한 data-center-type 사용)
      const gistElement = document.querySelector('div.word_group[data-center-type="body_content_gist"]');
      console.log('[Extract] 요지 요소 찾기:', !!gistElement);

      if (gistElement) {
        result.gist = gistElement.innerText || gistElement.textContent;
        result.debug.gistFound = true;
        result.debug.gistLength = result.gist ? result.gist.length : 0;
        console.log('[Extract] ✓ 요지 추출 성공:', {
          length: result.debug.gistLength,
          preview: result.gist ? result.gist.substring(0, 100) + '...' : 'empty'
        });
      } else {
        console.log('[Extract] ✗ 요지 요소를 찾을 수 없음');
        result.debug.gistFound = false;
      }

      // 결정내용/판결내용 추출 (판례의 경우 '판결내용'이지만 동일하게 처리)
      const decisionElement = document.querySelector('div.word_group[data-center-type="body_content_cntn"]');
      console.log('[Extract] 결정내용/판결내용 요소 찾기 (body_content_cntn):', !!decisionElement);

      if (decisionElement) {
        result.decision = decisionElement.innerText || decisionElement.textContent;
        result.debug.decisionFound = true;
        result.debug.decisionLength = result.decision ? result.decision.length : 0;
        console.log('[Extract] ✓ 결정내용 추출 성공:', {
          length: result.debug.decisionLength,
          preview: result.decision ? result.decision.substring(0, 100) + '...' : 'empty'
        });
      } else {
        // 대체 시도: body_content_decision
        const altDecisionElement = document.querySelector('div.word_group[data-center-type="body_content_decision"]');
        console.log('[Extract] 결정내용 요소 찾기 (body_content_decision):', !!altDecisionElement);

        if (altDecisionElement) {
          result.decision = altDecisionElement.innerText || altDecisionElement.textContent;
          result.debug.decisionFound = true;
          result.debug.decisionLength = result.decision ? result.decision.length : 0;
          console.log('[Extract] ✓ 결정내용 추출 성공 (대체):', {
            length: result.debug.decisionLength,
            preview: result.decision ? result.decision.substring(0, 100) + '...' : 'empty'
          });
        } else {
          console.log('[Extract] ✗ 결정내용 요소를 찾을 수 없음');
          result.debug.decisionFound = false;
        }
      }

      // 추가 디버깅: 사용 가능한 data-center-type 목록
      const availableTypes = wordGroupInfo.filter(info => info['data-center-type']).map(info => info['data-center-type']);
      console.log('[Extract] 사용 가능한 data-center-type 목록:', availableTypes);

      console.log(`[Extract] ===== ${typeName} 유형 처리 완료 =====`, {
        gistFound: result.debug.gistFound,
        decisionFound: result.debug.decisionFound
      });
    }

    // 방법 1: 정확한 경로로 찾기
    // div[data-center-type="body_content"] > div.word_group (3번째) > [data-center-type="body_content_htmlCntn"]
    const bodyContent = document.querySelector('div[data-center-type="body_content"]');

    if (bodyContent) {
      const wordGroups = bodyContent.querySelectorAll('div.word_group');
      result.debug.bodyContentWordGroups = wordGroups.length;

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
        result.debug.boBodyWordGroups = innerWordGroups.length;

        // 각 word_group의 data-center-type 확인
        for (let i = 0; i < innerWordGroups.length; i++) {
          const group = innerWordGroups[i];
          const dataType = group.getAttribute('data-center-type');
          const text = group.innerText || group.textContent;

          result.debug[`wordGroup${i}`] = {
            dataType: dataType,
            textLength: text ? text.length : 0,
            textPreview: text ? text.substring(0, 100) : ''
          };

          // body_content_htmlCntn를 찾았거나, 충분한 길이의 텍스트를 가진 word_group 사용
          if (dataType === 'body_content_htmlCntn' || (!result.content && text && text.length > 500)) {
            result.content = text;
            result.debug.method = `word_group[${i}]${dataType ? ' with data-center-type' : ' by length'}`;
          }
        }
      }
    }

    // 방법 4: 다른 가능한 선택자들 시도
    if (!result.content) {
      const alternativeSelectors = [
        '.content_area',
        '.content_body',
        '#content',
        '.detail_content',
        '[class*="content"]'
      ];

      for (const selector of alternativeSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.innerText || element.textContent;
          if (text && text.length > 500) {
            result.content = text;
            result.debug.method = `alternative selector: ${selector}`;
            break;
          }
        }
      }
    }

    // 제목 추출 시도
    // 방법 1: legislation_list와 함께 있는 strong 태그 찾기
    const titleElement = document.querySelector('div.substance_wrap a strong');
    if (titleElement) {
      result.title = titleElement.textContent.trim();
      console.log('[Extract] Title found via substance_wrap:', result.title);
    }

    // 방법 2: 대체 방법 - 페이지의 첫 번째 strong 태그 (일정 길이 이상)
    if (!result.title) {
      const strongElements = document.querySelectorAll('strong');
      for (const elem of strongElements) {
        const text = elem.textContent.trim();
        if (text && text.length > 10 && text.length < 300 && !text.includes('조심-') && !text.includes('국심-')) {
          result.title = text;
          console.log('[Extract] Title found via strong element:', result.title);
          break;
        }
      }
    }

    // 판례번호 찾기
    // 방법 1: subs_detail의 첫 번째 li에서 찾기
    const subsDetailLi = document.querySelector('ul.subs_detail li:first-child strong');
    if (subsDetailLi) {
      result.caseNumber = subsDetailLi.textContent.trim();
      console.log('[Extract] Case number found via subs_detail:', result.caseNumber);
    }

    // 방법 2: 텍스트에서 패턴 매칭
    if (!result.caseNumber) {
      const caseNumberMatch = document.body.innerText.match(/조심-\d{4}-[가-힣]+-\d+|국심-\d{4}-\d+|대법원\s*\d{4}[가-힣]+\d+/);
      if (caseNumberMatch) {
        result.caseNumber = caseNumberMatch[0];
        console.log('[Extract] Case number found via regex:', result.caseNumber);
      }
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

// 메시지 리스너 (Content script와의 통신)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request.type || request.topic);

  // 새로운 메시지 형식 처리 (topic 기반)
  if (request.topic === 'llm:call') {
    console.log('[Background] LLM call requested with reqId:', request.reqId);
    console.log('[Background] Using backend server at:', BACKEND_URL);

    // reqId를 payload에 포함시켜 전달
    const payloadWithReqId = { ...request.payload, reqId: request.reqId };

    // 백엔드 서버를 통해 OpenAI 호출
    callOpenAI(payloadWithReqId).then(
      (result) => {
        console.log('[Background] LLM call success for reqId:', request.reqId);
        sendResponse({ ok: true, reqId: request.reqId, ...result });
      },
      (error) => {
        console.error('[Background] LLM call error for reqId:', request.reqId, error);
        sendResponse({ ok: false, reqId: request.reqId, error: error.message });
      }
    );
    return true; // 비동기 응답
  }

  // API 키 관련 요청들은 이제 불필요 (백엔드에서 관리)
  if (request.topic === 'llm:setApiKey' || request.topic === 'llm:checkApiKey') {
    console.log('[Background] API key management is now handled by backend server');
    sendResponse({
      ok: true,
      message: 'API key is managed by backend server'
    });
    return false;
  }

  // 백엔드 서버 상태 확인 요청 추가
  if (request.topic === 'backend:health') {
    checkBackendHealth().then(
      (isHealthy) => {
        sendResponse({ ok: true, healthy: isHealthy });
      },
      (error) => {
        sendResponse({ ok: false, error: error.message });
      }
    );
    return true;
  }

  // 기존 메시지 형식 처리 (type 기반) - 변경 없음
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
      // forceExtractGistAndDecision이 true면 caseType을 '강제추출'로 설정하여 전달
      let effectiveCaseType = request.caseType;
      if (request.forceExtractGistAndDecision) {
        console.log('[Background] forceExtractGistAndDecision=true (ntstDcmClCd:', request.ntstDcmClCd, ')');
        effectiveCaseType = effectiveCaseType || '강제추출';  // caseType이 없으면 '강제추출'로 설정
      }

      fetchPrecedentDetailViaTab(request.docId, sender.tab.id, request.docType, effectiveCaseType).then(result => {
        sendResponse(result);
      }).catch(error => {
        console.error('[Background] Tab method failed:', error);
        sendResponse({
          success: false,
          docId: request.docId,
          error: error.message
        });
      });
      return true; // 비동기 응답을 위해 true 반환

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return false; // 동기적 응답
});

console.log('[Background] Tax Law Extension with Backend Server initialized');
console.log('[Background] Backend URL:', BACKEND_URL);