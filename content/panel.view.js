// Content Script - 사이드 패널 UI

(function() {
  'use strict';
  
  console.log('[Panel] Side panel view loaded');
  
  // 패널 스타일 정의
  const panelStyles = `
    #tax-law-side-panel {
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      transition: right 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    }
    
    #tax-law-side-panel.open {
      right: 0;
    }
    
    #tax-law-side-panel .panel-header {
      background: #2c3e50;
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    #tax-law-side-panel .panel-title {
      font-size: 18px;
      font-weight: bold;
    }
    
    #tax-law-side-panel .panel-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #tax-law-side-panel .panel-close:hover {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    #tax-law-side-panel .panel-content {
      padding: 20px;
      height: calc(100vh - 60px);
      overflow-y: auto;
    }
    
    #tax-law-side-panel .doc-id-display {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 20px;
    }
    
    #tax-law-side-panel .doc-id-label {
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 5px;
    }
    
    #tax-law-side-panel .doc-id-value {
      font-size: 20px;
      font-weight: bold;
      color: #2c3e50;
      font-family: 'Courier New', monospace;
      user-select: all;
    }
    
    #tax-law-side-panel .info-section {
      margin-bottom: 20px;
    }
    
    #tax-law-side-panel .info-label {
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 5px;
    }
    
    #tax-law-side-panel .info-value {
      font-size: 16px;
      color: #495057;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    
    #tax-law-side-panel .loading {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }
    
    #tax-law-side-panel .error {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #f5c6cb;
    }
    
    #tax-law-side-panel .success {
      background: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #c3e6cb;
    }
    
    #tax-law-side-panel .copy-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    }
    
    #tax-law-side-panel .copy-button:hover {
      background: #0056b3;
    }
    
    #tax-law-side-panel .copy-button.copied {
      background: #28a745;
    }
    
    #tax-law-side-panel .detail-content {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 15px;
      margin-top: 20px;
      max-height: 400px;
      overflow-y: auto;
    }
    
    #tax-law-side-panel .detail-content pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 14px;
      line-height: 1.5;
    }

    #tax-law-side-panel .llm-button {
      background: #28a745;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      margin: 10px 0;
      width: 100%;
    }

    #tax-law-side-panel .llm-button:hover {
      background: #218838;
    }

    #tax-law-side-panel .llm-button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    #tax-law-side-panel .llm-result {
      background: #f0f8ff;
      border: 1px solid #b0d4ff;
      border-radius: 4px;
      padding: 15px;
      margin-top: 15px;
      max-height: 300px;
      overflow-y: auto;
    }
  `;
  
  // 스타일 삽입
  function injectStyles() {
    if (!document.getElementById('tax-law-panel-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'tax-law-panel-styles';
      styleElement.textContent = panelStyles;
      document.head.appendChild(styleElement);
    }
  }
  
  // 패널 생성
  function createPanel() {
    if (document.getElementById('tax-law-side-panel')) {
      return document.getElementById('tax-law-side-panel');
    }
    
    const panel = document.createElement('div');
    panel.id = 'tax-law-side-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">판례 정보</div>
        <button class="panel-close" id="panel-close-btn">×</button>
      </div>
      <div class="panel-content" id="panel-content">
        <div class="loading">판례 정보를 불러오는 중...</div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // 닫기 버튼 이벤트
    document.getElementById('panel-close-btn').addEventListener('click', closePanel);
    
    return panel;
  }
  
  // 패널 열기
  function openPanel(data) {
    console.log('[Panel] openPanel called with data:', {
      docId: data?.docId,
      matchMethod: data?.matchMethod,
      clickedInfo: data?.clickedInfo,
      hasClickedInfo: !!data?.clickedInfo,
      caseType: data?.clickedInfo?.caseType,
      caseNumber: data?.clickedInfo?.caseNumber,
      title: data?.clickedInfo?.title
    });

    injectStyles();
    const panel = createPanel();

    // 데이터 표시
    const contentDiv = document.getElementById('panel-content');

    if (data && data.docId) {
      // 로딩 상태 확인
      if (data.loading) {
        contentDiv.innerHTML = `
          <div class="doc-id-display">
            <div class="doc-id-label">DOC_ID</div>
            <div class="doc-id-value" id="doc-id-value">${data.docId}</div>
            <button class="copy-button" id="copy-doc-id">복사</button>
          </div>
          
          <div class="loading">
            판례 상세 내용을 불러오는 중...
          </div>
        `;
      } else {
        contentDiv.innerHTML = `
          <div class="doc-id-display">
            <div class="doc-id-label">DOC_ID</div>
            <div class="doc-id-value" id="doc-id-value">${data.docId}</div>
            <button class="copy-button" id="copy-doc-id">복사</button>
          </div>
          
          ${data.matchMethod ? `
          <div class="info-section">
            <div class="info-label">매칭 방법</div>
            <div class="info-value">${getMatchMethodText(data.matchMethod)}</div>
          </div>
          ` : ''}
          
          ${data.clickedInfo && data.clickedInfo.caseNumber ? `
          <div class="info-section">
            <div class="info-label">판례번호</div>
            <div class="info-value">${data.clickedInfo.caseNumber}</div>
          </div>
          ` : ''}

          ${data.clickedInfo && data.clickedInfo.caseType ? `
          <div class="info-section">
            <div class="info-label">유형</div>
            <div class="info-value">${data.clickedInfo.caseType}</div>
          </div>
          ` : ''}

          ${data.clickedInfo && data.clickedInfo.title ? `
          <div class="info-section">
            <div class="info-label">제목</div>
            <div class="info-value">${data.clickedInfo.title}</div>
          </div>
          ` : ''}
          
          <div class="success">
            판례 정보가 성공적으로 추출되었습니다.
          </div>
        `;
      }
      
      // 복사 버튼 이벤트
      const copyBtn = document.getElementById('copy-doc-id');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          copyToClipboard(data.docId, copyBtn);
        });
      }
    } else {
      contentDiv.innerHTML = `
        <div class="error">
          판례 정보를 찾을 수 없습니다.
        </div>
      `;
    }
    
    // 패널 열기 애니메이션
    setTimeout(() => {
      panel.classList.add('open');
    }, 10);
  }
  
  // 패널 닫기
  function closePanel() {
    const panel = document.getElementById('tax-law-side-panel');
    if (panel) {
      panel.classList.remove('open');
      setTimeout(() => {
        panel.remove();
      }, 300);
    }
  }
  
  // 클립보드 복사
  function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
      button.textContent = '복사됨!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.textContent = '복사';
        button.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('[Panel] Copy failed:', err);
      // Fallback 방법
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      button.textContent = '복사됨!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.textContent = '복사';
        button.classList.remove('copied');
      }, 2000);
    });
  }
  
  // 매칭 방법 텍스트 변환
  function getMatchMethodText(method) {
    const methodTexts = {
      'index': '행 인덱스 매칭',
      'caseNumber': '판례번호 매칭',
      'url': 'URL 파라미터'
    };
    return methodTexts[method] || method;
  }

  // LLM 요약 처리 함수
  async function handleLLMSummarize() {
    console.log('[Panel] LLM summarize requested');

    const btn = document.getElementById('llm-summarize-btn');
    const resultContainer = document.getElementById('llm-result-container');

    if (!window.__lastProcessedContent) {
      resultContainer.innerHTML = `
        <div class="error">처리된 판례 내용이 없습니다.</div>
      `;
      return;
    }

    // 버튼 비활성화
    btn.disabled = true;
    btn.textContent = '⏳ AI가 분석 중...';

    // 로딩 표시
    resultContainer.innerHTML = `
      <div class="loading">AI가 판례를 분석하고 있습니다...</div>
    `;

    try {
      // LLM API 호출을 위한 메시지 전송
      const response = await callLLMAPI(window.__lastProcessedContent);

      if (response.success) {
        // 성공 시 결과 표시
        resultContainer.innerHTML = `
          <div class="llm-result">
            <h4>📋 AI 요약 결과</h4>
            <pre>${response.result}</pre>
          </div>
        `;
      } else {
        // 실패 시 에러 표시
        resultContainer.innerHTML = `
          <div class="error">
            AI 요약 실패: ${response.error || '알 수 없는 오류'}
          </div>
        `;
      }
    } catch (error) {
      console.error('[Panel] LLM error:', error);
      resultContainer.innerHTML = `
        <div class="error">
          AI 요약 중 오류가 발생했습니다.
        </div>
      `;
    } finally {
      // 버튼 재활성화
      btn.disabled = false;
      btn.textContent = '🤖 AI로 판례 요약하기';
    }
  }

  // LLM API 호출 함수 (background script 경유)
  async function callLLMAPI(processedContent) {
    console.log('[Panel] Calling LLM with content:', {
      jumunLength: processedContent.jumun?.length,
      reasonUnitsCount: processedContent.reasonUnits?.length
    });

    // 프롬프트 생성 (api.js의 프롬프트 템플릿 사용)
    const systemPrompt = `너는 판결문 요약 보조자다. 아래 규칙을 지켜라.

[문단 인식 규칙]
- 머리표시(1., 2., 가., 나., 1), 2), 가), 나))는 '제목행'으로 분류한다.
- 제목행은 바로 뒤 본문과 결합해 하나의 문단으로 간주한다(단독이면 스코어 0).
- '주문/청구취지/항소취지/이유/판단/결론' 같은 섹션 제목은 앵커로만 사용, 스코어링 제외.
- 한 줄짜리라도 금액·일시·등기·송금·결론 연결어가 포함된 완결 문장이면 본문으로 인정.
- 본문 내 가)나)다) 열거는 하위 서브문단으로 인식해 각각 1문장 요약 후 합친다.

[중요도 선별 규칙]
1) 문단들에 내부적으로 중요도 점수(0~5)를 매겨 상위 K개만 사용한다(K=7를 기본으로, 필요시 6~8 조정).
   - 가중치+: 금액·일시·등기·송금, 결론 연결어(따라서/그러나/결국/… 판단한다), 항변 인용/배척, 조문·판례 번호
   - 가중치-: 원론적 법리 서설, 증거목록/호증 나열
2) 상위 문단만 근거로 OUTPUT을 작성한다.
3) 숫자·날짜·법적 효과(피보전채권/증여/사해/선의 항변 배척 등)는 반드시 남긴다.
4) 한국어로, 불필요한 수식어 금지. 분량 제한을 엄수한다.
5) '주문'은 요약의 앵커로 삼되 스코어링에는 포함하지 않는다.`;

    // 이유 섹션 내용 준비
    let reasonContent = '';
    if (processedContent.reasonUnits && processedContent.reasonUnits.length > 0) {
      reasonContent = processedContent.reasonUnits
        .map(unit => `${unit.number}. ${unit.title}\n${unit.content}`)
        .join('\n\n');
    } else if (processedContent.reason) {
      reasonContent = processedContent.reason;
    }

    const userPrompt = `[사용자 입력]
판례 정보:
- 유형: ${processedContent.caseType || '판례'}
- 제목: ${processedContent.title || ''}
- 판례번호: ${processedContent.caseNumber || ''}

주문:
${processedContent.jumun || ''}

요약이 필요한 부분:
${reasonContent}

[OUTPUT 형식(그대로 지켜서 출력)]
1) 이 사건 간단 압축 요약(3문장)
- (문장1) 70~110자
- (문장2) 70~110자
- (문장3) 70~110자

2) 구조화 요약(보고서용 표준형)
- 쟁점: 2~3개 불릿
- 주요 사실: 3~5개 불릿(금액/일시/행위 위주)
- 법리 요지: 3~4개 불릿(조문·판례는 번호만)
- 구체 판단: 3~5개 불릿(항변 인용/배척 포함)
- 결론/주문: 2~3개 불릿(이자율·기산점 포함)
제한: 전체 600~800자`;

    // background script로 메시지 전송
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        topic: 'llm:call',
        payload: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 2000,
          stream: false
        }
      }, (response) => {
        // Chrome runtime 에러 체크
        if (chrome.runtime.lastError) {
          console.error('[Panel] Chrome runtime error:', chrome.runtime.lastError);
          resolve({
            success: false,
            error: 'Extension error: ' + chrome.runtime.lastError.message
          });
          return;
        }

        console.log('[Panel] LLM response:', response);

        if (response && response.ok) {
          resolve({
            success: true,
            result: response.text,
            usage: response.usage
          });
        } else {
          resolve({
            success: false,
            error: response?.error || 'API 호출 실패'
          });
        }
      });
    });
  }

  // reason 섹션을 숫자 단위로 분할하는 함수
  function splitReasonByNumbers(reasonText) {
    if (!reasonText) return [];

    const lines = reasonText.split('\n');
    const units = [];
    let currentUnit = null;
    let currentNumber = 0;
    let expectedNextNumber = 1;  // 다음에 올 것으로 예상되는 숫자

    for (const line of lines) {
      // 숫자. 으로 시작하는 라인 찾기 (예: "1. ", "2. ", "10. " 등)
      const match = line.match(/^(\d+)\.\s/);

      if (match) {
        const number = parseInt(match[1]);

        // 순차적인 숫자인지 확인 (1 -> 2 -> 3 순서)
        if (number === expectedNextNumber) {
          // 이전 단위가 있으면 저장
          if (currentUnit !== null) {
            units.push({
              number: currentNumber,
              title: currentUnit.title,
              content: currentUnit.lines.join('\n').trim()
            });
          }

          // 새 단위 시작
          currentNumber = number;
          expectedNextNumber = number + 1;  // 다음 예상 숫자 업데이트

          // 제목 추출 (숫자. 다음 내용)
          const title = line.substring(match[0].length).trim();
          currentUnit = {
            title: title,
            lines: []
          };
        } else {
          // 순차적이지 않은 숫자는 일반 텍스트로 처리
          if (currentUnit !== null) {
            currentUnit.lines.push(line);
          }
        }
      } else if (currentUnit !== null) {
        // 현재 단위에 라인 추가
        currentUnit.lines.push(line);
      }
    }

    // 마지막 단위 저장
    if (currentUnit !== null) {
      units.push({
        number: currentNumber,
        title: currentUnit.title,
        content: currentUnit.lines.join('\n').trim()
      });
    }

    console.log('[Panel] Reason units found:', units.length);
    units.forEach(unit => {
      console.log(`[Panel] Unit ${unit.number}: ${unit.title} (${unit.content.length} chars)`);
    });

    return units;
  }

  // 판례 내용 전처리 함수
  function preprocessContent(content, caseType) {
    if (!content) return { formatted: content, jumun: '', reason: '', reasonUnits: [] };

    let processedContent = content;
    let jumun = '';
    let reason = '';
    let reasonUnits = [];

    // 유형별 전처리
    switch(caseType) {
      case '판례':
        // '주 문'과 '이 유' 섹션 찾기
        const mainTextIndex = processedContent.indexOf('주 문');
        const reasonIndex = processedContent.indexOf('이 유');

        if (mainTextIndex !== -1) {
          if (reasonIndex !== -1 && reasonIndex > mainTextIndex) {
            // 주문 섹션: '주 문'부터 '이 유' 전까지
            jumun = processedContent.substring(mainTextIndex, reasonIndex)
              .replace('주 문', '')
              .trim();
            // 이유 섹션: '이 유'부터 끝까지
            reason = processedContent.substring(reasonIndex)
              .replace('이 유', '')
              .trim();

            // reason을 숫자 단위로 분할
            reasonUnits = splitReasonByNumbers(reason);
          } else {
            // '이 유'가 없으면 전체를 주문으로
            jumun = processedContent.substring(mainTextIndex)
              .replace('주 문', '')
              .trim();
          }

          // 섹션 구분하여 표시
          processedContent = '';
          if (jumun) {
            processedContent += '【주문】\n' + jumun;
          }
          if (reason) {
            // reasonUnits가 있으면 단위별로 구분선 추가
            if (reasonUnits && reasonUnits.length > 0) {
              processedContent += '\n\n【이유】\n';
              reasonUnits.forEach((unit, index) => {
                processedContent += `${unit.number}. ${unit.title}\n`;
                processedContent += unit.content;
                // 마지막 단위가 아니면 구분선 추가
                if (index < reasonUnits.length - 1) {
                  processedContent += '\n------------\n\n';
                }
              });
            } else {
              // 단위 구분이 없으면 원본 그대로
              processedContent += '\n\n【이유】\n' + reason;
            }
          }

          console.log('[Panel] 판례 섹션 구분:', {
            jumunLength: jumun.length,
            reasonLength: reason.length,
            reasonUnitsCount: reasonUnits.length
          });
        } 
        break;

      case '심판':
        // '결정' 또는 '주문' 이전 내용 제거
        const decisionIndex = processedContent.indexOf('결정');
        const orderIndex = processedContent.indexOf('주문');
        const startIndex = Math.min(
          decisionIndex > -1 ? decisionIndex : Infinity,
          orderIndex > -1 ? orderIndex : Infinity
        );
        if (startIndex !== Infinity) {
          processedContent = processedContent.substring(startIndex);
        }
        break;

      case '이의':
      case '적부':
      case '심사':
        // '결정내용' 또는 '판단' 이전 내용 제거
        const decisionContentIndex = processedContent.indexOf('결정내용');
        const judgmentIndex = processedContent.indexOf('판단');
        const startPoint = Math.min(
          decisionContentIndex > -1 ? decisionContentIndex : Infinity,
          judgmentIndex > -1 ? judgmentIndex : Infinity
        );
        if (startPoint !== Infinity) {
          processedContent = processedContent.substring(startPoint);
        }
        break;

      default:
        // 기타 유형은 전처리하지 않음
        console.log('[Panel] Unknown case type:', caseType);
        break;
    }

    // 앞뒤 공백 제거
    processedContent = processedContent.trim();

    // 연속된 줄바꿈 정리 (3개 이상의 줄바꿈을 2개로)
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n');

    // 객체로 반환 (formatted: 표시용, jumun: 주문 내용, reason: 이유 내용, reasonUnits: 이유 섹션의 숫자 단위들)
    return {
      formatted: processedContent,
      jumun: jumun,
      reason: reason,
      reasonUnits: reasonUnits
    };
  }
  
  // 패널 업데이트 함수
  function updatePanel(data) {
    console.log('[Panel] updatePanel called with data:', {
      docId: data?.docId,
      success: data?.success,
      detail: data?.detail,
      caseType: data?.detail?.caseType,
      caseNumber: data?.detail?.caseNumber,
      title: data?.detail?.title
    });

    const contentDiv = document.getElementById('panel-content');
    if (!contentDiv) return;

    if (data.success && data.detail) {
      const detail = data.detail;
      contentDiv.innerHTML = `
        <div class="doc-id-display">
          <div class="doc-id-label">DOC_ID</div>
          <div class="doc-id-value" id="doc-id-value">${data.docId}</div>
          <button class="copy-button" id="copy-doc-id">복사</button>
        </div>

        ${data.clickedInfo && data.clickedInfo.caseNumber ? `
        <div class="info-section">
          <div class="info-label">판례번호</div>
          <div class="info-value">${data.clickedInfo.caseNumber}</div>
        </div>
        ` : detail.caseNumber ? `
        <div class="info-section">
          <div class="info-label">판례번호</div>
          <div class="info-value">${detail.caseNumber}</div>
        </div>
        ` : ''}

        ${data.clickedInfo && data.clickedInfo.caseType ? `
        <div class="info-section">
          <div class="info-label">유형</div>
          <div class="info-value">${data.clickedInfo.caseType}</div>
        </div>
        ` : detail.caseType ? `
        <div class="info-section">
          <div class="info-label">유형</div>
          <div class="info-value">${detail.caseType}</div>
        </div>
        ` : ''}

        ${data.clickedInfo && data.clickedInfo.title ? `
        <div class="info-section">
          <div class="info-label">제목</div>
          <div class="info-value">${data.clickedInfo.title}</div>
        </div>
        ` : detail.title ? `
        <div class="info-section">
          <div class="info-label">제목</div>
          <div class="info-value">${detail.title}</div>
        </div>
        ` : ''}

        ${detail.content ? (() => {
          const processed = preprocessContent(detail.content, data.clickedInfo?.caseType || detail.caseType);
          // 나중에 jumun, reason, reasonUnits를 별도로 사용 가능
          window.__lastProcessedContent = {
            jumun: processed.jumun,
            reason: processed.reason,
            reasonUnits: processed.reasonUnits
          };
          console.log('[Panel] Processed content saved:', {
            jumunLength: processed.jumun.length,
            reasonLength: processed.reason.length,
            reasonUnitsCount: processed.reasonUnits.length
          });
          return `
          <div class="info-section">
            <div class="info-label">판례 상세 내용</div>
            <div class="detail-content">
              <pre>${processed.formatted}</pre>
            </div>
            <button class="llm-button" id="llm-summarize-btn">
              🤖 AI로 판례 요약하기
            </button>
            <div id="llm-result-container"></div>
          </div>
          `;
        })() : ''}

        <div class="success">
          판례 상세 내용을 성공적으로 불러왔습니다.
        </div>
      `;

      // 복사 버튼 이벤트 재설정
      const copyBtn = document.getElementById('copy-doc-id');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          copyToClipboard(data.docId, copyBtn);
        });
      }

      // LLM 요약 버튼 이벤트 설정
      const llmBtn = document.getElementById('llm-summarize-btn');
      if (llmBtn) {
        llmBtn.addEventListener('click', function() {
          handleLLMSummarize();
        });
      }
    } else {
      contentDiv.innerHTML = `
        <div class="doc-id-display">
          <div class="doc-id-label">DOC_ID</div>
          <div class="doc-id-value">${data.docId}</div>
        </div>

        <div class="error">
          판례 상세 내용을 불러올 수 없습니다.
          ${data.error ? `<br>오류: ${data.error}` : ''}
        </div>
      `;
    }
  }
  
  // 메시지 리스너
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    
    const { type, data } = event.data || {};
    
    switch(type) {
      case 'MSG_OPEN_PANEL':
        console.log('[Panel] Opening panel with data:', data);
        openPanel(data);
        break;
        
      case 'MSG_UPDATE_PANEL':
        console.log('[Panel] Updating panel with detail:', data);
        updatePanel(data);
        break;
    }
  });
  
  // 전역 헬퍼 함수 (디버깅용)
  window.__debugOpenPanel = function(docId) {
    openPanel({
      docId: docId || '123456789012',
      matchMethod: 'debug',
      clickedInfo: {
        caseNumber: '조심-2025-중-2139',
        registrationDate: '2025.09.08',
        title: '디버그 테스트 판례'
      }
    });
  };
  
  window.__debugClosePanel = closePanel;
  
  console.log('[Panel] Side panel ready');
})();