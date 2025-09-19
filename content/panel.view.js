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
      max-height: 500px;
      overflow-y: auto;
      position: relative;
    }

    #tax-law-side-panel .llm-result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #b0d4ff;
      position: sticky;
      top: 0;
      background: #f0f8ff;
      z-index: 1;
    }

    #tax-law-side-panel .llm-result-title {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin: 0;
    }

    #tax-law-side-panel .llm-copy-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.3s;
    }

    #tax-law-side-panel .llm-copy-btn:hover {
      background: #0056b3;
    }

    #tax-law-side-panel .llm-copy-btn.copied {
      background: #28a745;
    }

    #tax-law-side-panel .llm-content-section {
      margin-bottom: 20px;
    }

    #tax-law-side-panel .llm-section-title {
      font-weight: bold;
      color: #0066cc;
      margin-bottom: 10px;
      font-size: 15px;  /* 섹션 제목은 조금 더 크게 */
    }

    #tax-law-side-panel .llm-section-content {
      background: white;
      padding: 10px;
      border-left: 3px solid #0066cc;
      border-radius: 3px;
      line-height: 1.6;
      font-size: 14px;  /* 텍스트 크기 추가 */
    }

    #tax-law-side-panel .llm-section-content p {
      font-size: 14px;  /* 단락 텍스트 크기 */
      margin: 8px 0;
    }

    #tax-law-side-panel .llm-bullet-list {
      margin: 5px 0;
      padding-left: 20px;
      font-size: 14px;  /* 리스트 텍스트 크기 */
    }

    #tax-law-side-panel .llm-bullet-list li {
      margin: 8px 0;  /* 간격 조정 */
      color: #444;
      font-size: 14px;  /* 리스트 항목 텍스트 크기 */
      line-height: 1.5;  /* 줄 간격 */
    }

    #tax-law-side-panel .llm-result::-webkit-scrollbar {
      width: 8px;
    }

    #tax-law-side-panel .llm-result::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    #tax-law-side-panel .llm-result::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
    }

    #tax-law-side-panel .llm-result::-webkit-scrollbar-thumb:hover {
      background: #555;
    }

    #tax-law-side-panel .detail-toggle-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 10px;
      transition: background 0.3s;
    }

    #tax-law-side-panel .detail-toggle-header:hover {
      background: #e9e9e9;
    }

    #tax-law-side-panel .detail-toggle-title {
      font-weight: bold;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #tax-law-side-panel .toggle-arrow {
      transition: transform 0.3s;
      font-size: 12px;
    }

    #tax-law-side-panel .toggle-arrow.collapsed {
      transform: rotate(-90deg);
    }

    #tax-law-side-panel .detail-content-wrapper {
      max-height: 400px;
      overflow-y: auto;
      transition: max-height 0.3s ease-out;
      margin-bottom: 15px;
    }

    #tax-law-side-panel .detail-content-wrapper.collapsed {
      max-height: 0;
      overflow: hidden;
      margin-bottom: 0;
    }

    #tax-law-side-panel .section-divider {
      border-top: 2px solid #e0e0e0;
      margin: 20px 0;
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

    // 폴더 UI는 나중에 초기화 (패널이 열릴 때)

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

    // 마지막 데이터 저장
    if (data && data.docId) {
      window.__lastPanelData = data;
    }

    injectStyles();

    // 기존 패널이 있으면 재사용, 없으면 생성
    let panel = document.getElementById('tax-law-side-panel');
    if (!panel) {
      panel = createPanel();
    }

    // 데이터 표시
    const contentDiv = document.getElementById('panel-content');


    if (data && data.docId) {
      // 로딩 상태 확인
      if (data.loading) {
        contentDiv.innerHTML = `
          <div class="loading">
            판례 상세 내용을 불러오는 중...
          </div>

          <!-- 폴더 섹션 컨테이너 -->
          <div id="folder-container"></div>
        `;

        // 폴더 UI 초기화 (기존 인스턴스가 없는 경우에만)
        setTimeout(() => {
          if (window.FolderUI && document.getElementById('folder-container') && !window.__folderUI) {
            window.__folderUI = new window.FolderUI(document.getElementById('folder-container'));
          } else if (window.__folderUI && document.getElementById('folder-container')) {
            // 기존 인스턴스가 있으면 컨테이너에 다시 렌더링
            window.__folderUI.container = document.getElementById('folder-container');
            window.__folderUI.render();
          }
        }, 100);
      } else {
        contentDiv.innerHTML = `
          ${data.matchMethod ? `
          <div class="info-section">
            <div class="info-label">매칭 방법</div>
            <div class="info-value">${getMatchMethodText(data.matchMethod)}</div>
          </div>
          ` : ''}
          
          ${data.clickedInfo && data.clickedInfo.caseNumber ? `
          <div class="info-section">
            <div class="info-label">📋 판례번호</div>
            <div class="info-value" style="font-weight: 600; color: #0066cc;">${data.clickedInfo.caseNumber}</div>
          </div>
          ` : ''}

          ${data.clickedInfo && data.clickedInfo.caseType ? `
          <div class="info-section">
            <div class="info-label">📑 유형</div>
            <div class="info-value">${data.clickedInfo.caseType}</div>
          </div>
          ` : ''}

          ${data.clickedInfo && data.clickedInfo.title ? `
          <div class="info-section">
            <div class="info-label">📄 제목</div>
            <div class="info-value">${data.clickedInfo.title}</div>
          </div>
          ` : ''}
          
          <div class="success">
            판례 정보가 성공적으로 추출되었습니다.
          </div>

          <!-- 폴더 섹션 컨테이너 -->
          <div id="folder-container"></div>
        `;

        // 폴더 UI 초기화 (기존 인스턴스가 없는 경우에만)
        setTimeout(() => {
          if (window.FolderUI && document.getElementById('folder-container') && !window.__folderUI) {
            window.__folderUI = new window.FolderUI(document.getElementById('folder-container'));
          } else if (window.__folderUI && document.getElementById('folder-container')) {
            // 기존 인스턴스가 있으면 컨테이너에 다시 렌더링
            window.__folderUI.container = document.getElementById('folder-container');
            window.__folderUI.render();
          }
        }, 100);
      }

    } else {
      contentDiv.innerHTML = `
        <div class="error">
          판례 정보를 찾을 수 없습니다.
        </div>

        <!-- 폴더 섹션 컨테이너 -->
        <div id="folder-container"></div>
      `;

      // 에러 상태에서도 폴더 UI 초기화 (기존 인스턴스가 없는 경우에만)
      setTimeout(() => {
        if (window.FolderUI && document.getElementById('folder-container') && !window.__folderUI) {
          window.__folderUI = new window.FolderUI(document.getElementById('folder-container'));
        } else if (window.__folderUI && document.getElementById('folder-container')) {
          // 기존 인스턴스가 있으면 컨테이너에 다시 렌더링
          window.__folderUI.container = document.getElementById('folder-container');
          window.__folderUI.render();
        }
      }, 100);
    }
    
    // 패널 열기 애니메이션
    setTimeout(() => {
      panel.classList.add('open');
    }, 10);
  }
  
  // 패널 토글
  function togglePanel() {
    const panel = document.getElementById('tax-law-side-panel');

    if (panel) {
      // 기존 패널이 있는 경우
      if (panel.classList.contains('open')) {
        // 열려있으면 닫기
        closePanel();
      } else {
        // 닫혀있으면 다시 열기 (기존 상태 유지)
        panel.classList.add('open');
      }
    } else {
      // 패널이 없는 경우 (첫 번째 열기)
      if (window.__lastPanelData) {
        openPanel(window.__lastPanelData);
      } else {
        // 빈 패널 생성
        injectStyles();
        const newPanel = createPanel();

        // 폴더 UI만 표시
        const contentDiv = document.getElementById('panel-content');
        contentDiv.innerHTML = `
          <div class="info-section">
            <div class="info-label">Tax Law Assistant</div>
            <div class="info-value">판례를 우클릭하고 '요약하기'를 선택하세요</div>
          </div>
          <div id="folder-container"></div>
        `;

        // 패널 열기 애니메이션
        setTimeout(() => {
          newPanel.classList.add('open');

          // 폴더 UI 초기화
          if (window.FolderUI && !window.__folderUI) {
            const container = document.getElementById('folder-container');
            if (container) {
              window.__folderUI = new window.FolderUI(container);
            }
          }
        }, 10);
      }
    }
  }

  // 패널 닫기 (DOM은 유지하고 숨김만 처리)
  function closePanel() {
    const panel = document.getElementById('tax-law-side-panel');
    if (panel) {
      panel.classList.remove('open');
      // DOM과 폴더 UI 인스턴스는 유지 (상태 보존)
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

  // 이모지 제거 함수
  function stripEmojis(str) {
    return str.replace(/[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu, '');
  }

  // 라인 정규화 함수 (이모지, 숫자 머리글, 마크다운 헤더 제거)
  function normalizeLine(str) {
    return stripEmojis(str)
      .trim()
      .replace(/^\d+\)\s*/, '')  // 1), 2) 등 제거
      .replace(/^#*\s*/, '')      // # 마크다운 헤더 제거
      .replace(/^[●○▪▫◆◇]\s*/, '') // 특수 불릿 제거
      .trim();
  }

  // LLM 결과 포맷팅 함수 (관용적 파싱)
  function formatLLMResult(text) {
    const sections = {};
    let currentSection = null;

    const lines = text.split('\n');

    const startSection = (key) => {
      currentSection = key;
      if (!sections[currentSection]) {
        sections[currentSection] = [];
      }
    };

    for (const rawLine of lines) {
      const line = normalizeLine(rawLine);
      if (!line) continue;

      // 섹션 헤더 감지 (관용적)
      if (line.includes('이 사건 간단 압축 요약') ||
          line.match(/^간단.*요약/i) ||
          line.match(/^요약$/i)) {
        startSection('summary');
        continue;
      }

      if (line.includes('구조화 요약')) {
        startSection('structured');
        continue;
      }

      if (/^쟁점:?$/.test(line) ||
          line.startsWith('쟁점') ||
          line.match(/^issues?:?$/i)) {
        startSection('issues');
        continue;
      }

      if (/^주요\s*사실:?$/.test(line) ||
          line.startsWith('주요 사실') ||
          line.startsWith('주요사실') ||
          line.match(/^facts?:?$/i)) {
        startSection('facts');
        continue;
      }

      if (/^법리\s*요지:?$/.test(line) ||
          line.startsWith('법리 요지') ||
          line.startsWith('법리요지') ||
          line.match(/^legal.*:?$/i)) {
        startSection('legal');
        continue;
      }

      if (/^구체\s*판단:?$/.test(line) ||
          line.startsWith('구체 판단') ||
          line.startsWith('구체판단') ||
          line.match(/^judg(e)?ment:?$/i)) {
        startSection('judgment');
        continue;
      }

      if (/^결론\/주문:?$/.test(line) ||
          line.startsWith('결론/주문') ||
          line.startsWith('결론') ||
          line.match(/^conclusion:?$/i)) {
        startSection('conclusion');
        continue;
      }

      if (/^반론\/배척\s*사유:?$/.test(line) ||
          line.startsWith('반론/배척') ||
          line.startsWith('반론')) {
        startSection('rebuttal');
        continue;
      }

      // 내용 수집
      if (currentSection) {
        const trimmedLine = rawLine.trim();

        // 다양한 불릿 형식 처리
        if (trimmedLine.startsWith('- ')) {
          sections[currentSection].push(trimmedLine.substring(2).trim());
        } else if (trimmedLine.startsWith('• ') || trimmedLine.startsWith('· ')) {
          sections[currentSection].push(trimmedLine.substring(2).trim());
        } else if (trimmedLine.match(/^\(.*?\)/)) {
          // (문장1), (첫 번째) 등 형식
          sections[currentSection].push(trimmedLine);
        } else if (trimmedLine.match(/^\d+\./)) {
          // 1. 2. 등 숫자 불릿
          sections[currentSection].push(trimmedLine.replace(/^\d+\.\s*/, ''));
        } else if (!line.includes(':') || currentSection === 'summary') {
          // 라벨이 아닌 일반 문장
          sections[currentSection].push(trimmedLine);
        }
      }
    }

    return sections;
  }

  // 섹션별 이모지 매핑
  const SECTION_ICONS = {
    summary: '📝',
    structured: '📋',
    issues: '🧭',
    facts: '🧾',
    legal: '⚖️',
    judgment: '🔎',
    conclusion: '✅',
    rebuttal: '🗣️'
  };

  // 섹션별 한글 제목 매핑
  const SECTION_TITLES = {
    summary: '이 사건 간단 압축 요약',
    structured: '구조화 요약',
    issues: '쟁점',
    facts: '주요 사실',
    legal: '법리 요지',
    judgment: '구체 판단',
    conclusion: '결론/주문',
    rebuttal: '반론/배척 사유'
  };

  // 이모지 사용 여부 (나중에 설정으로 제어 가능)
  let USE_EMOJIS = true;

  // HTML 이스케이프 함수 (XSS 방지)
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 섹션 헤더 생성 함수
  function createSectionHeader(key) {
    const title = SECTION_TITLES[key] || key;
    const icon = USE_EMOJIS ? (SECTION_ICONS[key] || '') : '';
    return icon ? `${icon} ${title}` : title;
  }

  // 포맷된 결과를 HTML로 변환 (개선된 버전)
  function formatResultToHTML(sections) {
    let html = '<div class="llm-result-content">';

    // 섹션 렌더링 순서
    const renderOrder = ['summary', 'issues', 'facts', 'legal', 'judgment', 'conclusion', 'rebuttal'];

    for (const key of renderOrder) {
      if (!sections[key] || sections[key].length === 0) continue;

      const sectionTitle = createSectionHeader(key);
      const items = sections[key];

      html += '<div class="llm-content-section">';
      html += `<div class="llm-section-title">${escapeHTML(sectionTitle)}</div>`;
      html += '<div class="llm-section-content">';

      // 모든 섹션을 불릿 포인트로 표시
      html += '<ul class="llm-bullet-list">';
      html += items.map(item => `<li>${escapeHTML(item)}</li>`).join('');
      html += '</ul>';

      html += '</div></div>';
    }

    // 섹션이 하나도 없는 경우
    if (Object.keys(sections).length === 0) {
      html += `
        <div class="llm-content-section">
          <div class="llm-section-title">⚠️ 파싱 오류</div>
          <div class="llm-section-content">
            <p>응답 형식이 표준과 다릅니다. 다시 시도해주세요.</p>
          </div>
        </div>
      `;
    }

    html += '</div>';
    return html;
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
        // 결과 포맷팅
        const formattedSections = formatLLMResult(response.result);
        const formattedHTML = formatResultToHTML(formattedSections);

        // 성공 시 결과 표시
        resultContainer.innerHTML = `
          <div class="llm-result">
            <div class="llm-result-header">
              <h4 class="llm-result-title">📋 AI 요약 결과</h4>
              <button class="llm-copy-btn" id="llm-copy-btn">📄 복사</button>
            </div>
            ${formattedHTML}
          </div>
        `;

        // 복사 버튼 이벤트 설정
        const copyBtn = document.getElementById('llm-copy-btn');
        if (copyBtn) {
          copyBtn.addEventListener('click', function() {
            copyToClipboard(response.result, copyBtn);
          });
        }

        // 저장 컨트롤 추가
        if (window.__folderUI) {
          const summaryData = {
            docId: window.__lastProcessedContent?.docId || Date.now().toString(),
            metadata: {
              caseNumber: window.__lastProcessedContent?.caseNumber,
              caseType: window.__lastProcessedContent?.caseType,
              title: window.__lastProcessedContent?.title
            },
            sections: formattedSections,
            preview: formattedSections.summary ? formattedSections.summary.join(' ').substring(0, 200) : '요약 내용 없음'
          };

          window.__folderUI.currentSummary = summaryData;
          window.__folderUI.renderSaveControls(resultContainer, summaryData);
        }
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

  // LLM API 호출 함수 (api.js의 LLMApi 사용)
  async function callLLMAPI(processedContent) {
    console.log('[Panel] Calling LLM with content:', {
      jumunLength: processedContent.jumun?.length,
      reasonUnitsCount: processedContent.reasonUnits?.length
    });

    // LLMApi가 로드되었는지 확인
    if (!window.LLMApi || !window.LLMApi.summarizePrecedent) {
      console.error('[Panel] LLMApi not loaded');
      return { success: false, error: 'LLM API not available' };
    }

    try {
      // api.js의 summarizePrecedent 함수 호출 (프롬프트는 api.js에 정의된 것 사용)
      const result = await window.LLMApi.summarizePrecedent(processedContent, {
        provider: 'openai',
        promptType: 'summarize'
      });

      console.log('[Panel] LLM API response:', result);
      return result;

    } catch (error) {
      console.error('[Panel] Error calling LLM API:', error);
      return {
        success: false,
        error: error.message || 'Failed to call LLM API'
      };
    }
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

  // 독립된 줄에 있는 텍스트 찾기 함수
  function findStandaloneText(content, searchText) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // 특수문자(괄호 등) 제거하고 비교
      const cleanLine = line.replace(/[\[\]【】\(\)]/g, '').trim();

      if (cleanLine === searchText) {
        // 해당 줄이 나타나는 첫 위치 찾기
        let position = 0;
        for (let j = 0; j < i; j++) {
          position += lines[j].length + 1; // +1 for newline
        }
        return position;
      }
    }
    return -1;
  }

  // 판례 내용 전처리 함수
  function preprocessContent(content, caseType) {
    if (!content) return { formatted: content, jumun: '', reason: '', reasonUnits: [] };

    let processedContent = content;
    let jumun = '';
    let reason = '';
    let reasonUnits = [];

    // 먼저 모든 주문/이유 패턴을 표준 형식으로 통일
    const mainPatternReplacements = [
      ['[주 문]', '주 문'],
      ['【주 문】', '주 문'],
      ['【주문】', '주 문']
    ];

    const reasonPatternReplacements = [
      ['[이 유]', '이 유'],
      ['【이 유】', '이 유'],
      ['【이유】', '이 유']
    ];

    // 패턴 치환 (독립된 줄에 있는 것만)
    const lines = processedContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();

      // 주문 패턴 치환
      for (const [pattern, replacement] of mainPatternReplacements) {
        if (trimmedLine === pattern || trimmedLine === pattern.replace(/\s/g, '')) {
          lines[i] = lines[i].replace(trimmedLine, replacement);
          break;
        }
      }

      // 이유 패턴 치환
      for (const [pattern, replacement] of reasonPatternReplacements) {
        if (trimmedLine === pattern || trimmedLine === pattern.replace(/\s/g, '')) {
          lines[i] = lines[i].replace(trimmedLine, replacement);
          break;
        }
      }
    }
    processedContent = lines.join('\n');

    // 유형별 전처리
    switch(caseType) {
      case '판례':
        // '주 문'과 '이 유' 섹션 찾기 (독립된 줄에 있는 것만)
        let mainTextIndex = findStandaloneText(processedContent, '주 문');
        const reasonIndex = findStandaloneText(processedContent, '이 유');

        // '주 문'이 없으면 '1. 처분개요' 또는 '1.처분개요' 찾기
        if (mainTextIndex === -1) {
          mainTextIndex = processedContent.indexOf('1. 처분개요');
          if (mainTextIndex === -1) {
            mainTextIndex = processedContent.indexOf('1.처분개요');
          }
          if (mainTextIndex !== -1) {
            console.log('[Panel] "주 문" 없음 - "처분개요"부터 시작');
          }
        }

        // '주 문'도 '처분개요'도 없으면 불필요한 헤더 텍스트만 제거
        if (mainTextIndex === -1) {
          console.log('[Panel] "주 문"과 "처분개요" 모두 없음 - 헤더 텍스트만 제거');

          // 제거할 텍스트 패턴
          const headerPattern = /상세내용\s*PDF로 보기\s*상세내용 안에 있는 표나 도형 등이 제대로 표시가 되지 않을 경우[^\n]*\?/;
          processedContent = processedContent.replace(headerPattern, '').trim();

          // 전체 내용을 주문으로 설정
          jumun = processedContent;
          mainTextIndex = 0; // 처리된 것으로 표시
        }

        if (mainTextIndex !== -1) {
          if (reasonIndex !== -1 && reasonIndex > mainTextIndex) {
            // 주문 섹션: '주 문' 또는 '1. 처분개요'부터 '이 유' 전까지
            jumun = processedContent.substring(mainTextIndex, reasonIndex)
              .replace('주 문', '')
              .replace('1. 처분개요', '1. 처분개요')  // '1. 처분개요'는 유지
              .replace('1.처분개요', '1.처분개요')      // '1.처분개요'도 유지
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
              .replace('1. 처분개요', '1. 처분개요')  // '1. 처분개요'는 유지
              .replace('1.처분개요', '1.처분개요')      // '1.처분개요'도 유지
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
        // '주 문'과 '이 유' 섹션을 찾기 (독립된 줄에 있는 것만)
        let mainTextIdxSimpan = findStandaloneText(processedContent, '주 문');
        const reasonIdxSimpan = findStandaloneText(processedContent, '이 유');

        // '주 문'이 없으면 '1. 처분개요' 또는 '1.처분개요' 찾기
        if (mainTextIdxSimpan === -1) {
          mainTextIdxSimpan = processedContent.indexOf('1. 처분개요');
          if (mainTextIdxSimpan === -1) {
            mainTextIdxSimpan = processedContent.indexOf('1.처분개요');
          }
          if (mainTextIdxSimpan !== -1) {
            console.log('[Panel] 심판 - "주 문" 없음, "처분개요"부터 시작');
          }
        }

        // '주 문'도 '처분개요'도 없으면 불필요한 헤더 텍스트만 제거
        if (mainTextIdxSimpan === -1) {
          console.log('[Panel] 심판 - "주 문"과 "처분개요" 모두 없음 - 헤더 텍스트만 제거');

          // 제거할 텍스트 패턴
          const headerPattern = /상세내용\s*PDF로 보기\s*상세내용 안에 있는 표나 도형 등이 제대로 표시가 되지 않을 경우[^\n]*\?/;
          processedContent = processedContent.replace(headerPattern, '').trim();

          // 전체 내용을 주문으로 설정
          jumun = processedContent;
          mainTextIdxSimpan = 0; // 처리된 것으로 표시
        }

        if (mainTextIdxSimpan !== -1) {
          // '주 문'부터 시작
          if (reasonIdxSimpan !== -1 && reasonIdxSimpan > mainTextIdxSimpan) {
            // 주문 섹션: '주 문'부터 '이 유' 전까지
            jumun = processedContent.substring(mainTextIdxSimpan, reasonIdxSimpan)
              .replace('주 문', '')
              .trim();

            // 이유 섹션: '이 유'부터 끝까지
            reason = processedContent.substring(reasonIdxSimpan)
              .replace('이 유', '')
              .trim();

            // 섹션 구분하여 표시
            processedContent = '';
            if (jumun) {
              processedContent += '【주문】\n' + jumun;
            }
            if (reason) {
              processedContent += '\n\n【이유】\n' + reason;
            }
          } else {
            // '이 유'가 없으면 '주 문'부터 끝까지
            processedContent = processedContent.substring(mainTextIdxSimpan);
          }
        } else {
          // '주 문'이 없으면 전체 내용 유지
          console.log('[Panel] 심판 유형이지만 "주 문"을 찾을 수 없음');
        }
        break;

      case '이의':
      case '적부':
      case '심사':
        // '주 문'과 '이 유' 섹션을 찾기 (독립된 줄에 있는 것만)
        let mainTextIdx = findStandaloneText(processedContent, '주 문');
        const reasonIdx = findStandaloneText(processedContent, '이 유');

        // '주 문'이 없으면 '1. 처분개요' 또는 '1.처분개요' 찾기
        if (mainTextIdx === -1) {
          mainTextIdx = processedContent.indexOf('1. 처분개요');
          if (mainTextIdx === -1) {
            mainTextIdx = processedContent.indexOf('1.처분개요');
          }
          if (mainTextIdx !== -1) {
            console.log('[Panel] 심사/이의/적부 - "주 문" 없음, "처분개요"부터 시작');
          }
        }

        // '주 문'도 '처분개요'도 없으면 불필요한 헤더 텍스트만 제거
        if (mainTextIdx === -1) {
          console.log('[Panel] 심사/이의/적부 - "주 문"과 "처분개요" 모두 없음 - 헤더 텍스트만 제거');

          // 제거할 텍스트 패턴
          const headerPattern = /상세내용\s*PDF로 보기\s*상세내용 안에 있는 표나 도형 등이 제대로 표시가 되지 않을 경우[^\n]*\?/;
          processedContent = processedContent.replace(headerPattern, '').trim();

          // 전체 내용을 주문으로 설정
          jumun = processedContent;
          mainTextIdx = 0; // 처리된 것으로 표시
        }

        if (mainTextIdx !== -1) {
          // '주 문'부터 시작
          if (reasonIdx !== -1 && reasonIdx > mainTextIdx) {
            // 주문 섹션: '주 문'부터 '이 유' 전까지
            jumun = processedContent.substring(mainTextIdx, reasonIdx)
              .replace('주 문', '')
              .trim();

            // 이유 섹션: '이 유'부터 끝까지
            reason = processedContent.substring(reasonIdx)
              .replace('이 유', '')
              .trim();

            // 섹션 구분하여 표시
            processedContent = '';
            if (jumun) {
              processedContent += '【주문】\n' + jumun;
            }
            if (reason) {
              processedContent += '\n\n【이유】\n' + reason;
            }
          } else {
            // '이 유'가 없으면 '주 문'부터 끝까지
            processedContent = processedContent.substring(mainTextIdx);
          }
        } else {
          // '주 문'이 없으면 전체 내용 유지
          console.log('[Panel] 심사/이의/적부 유형이지만 "주 문"을 찾을 수 없음');
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
            reasonUnits: processed.reasonUnits,
            caseType: data.clickedInfo?.caseType || detail.caseType,
            caseNumber: data.clickedInfo?.caseNumber || detail.caseNumber,
            title: data.clickedInfo?.title || detail.title,
            docId: data.docId // docId 추가
          };
          console.log('[Panel] Processed content saved:', {
            jumunLength: processed.jumun.length,
            reasonLength: processed.reason.length,
            reasonUnitsCount: processed.reasonUnits.length
          });
          return `
          <div class="ai-section">
            <button class="llm-button" id="llm-summarize-btn">
              🤖 AI로 판례 요약하기
            </button>
            <div id="llm-result-container"></div>
          </div>

          <div class="section-divider"></div>

          <div class="info-section">
            <div class="detail-toggle-header" id="detail-toggle-original">
              <div class="detail-toggle-title">
                <span class="toggle-arrow" id="toggle-arrow-original">▼</span>
                📑 판례 상세 내용 (원본)
              </div>
              <span style="font-size: 12px; color: #666;">클릭하여 펼치기/접기</span>
            </div>
            <div class="detail-content-wrapper" id="detail-content-wrapper-original" style="display: none;">
              <div class="detail-content" style="background: #fff9e6; border-color: #ffc107;">
                <pre>${detail.content}</pre>
              </div>
            </div>
          </div>

          <div class="info-section">
            <div class="detail-toggle-header" id="detail-toggle">
              <div class="detail-toggle-title">
                <span class="toggle-arrow" id="toggle-arrow">▼</span>
                📄 판례 상세 내용 (전처리 후)
              </div>
              <span style="font-size: 12px; color: #666;">클릭하여 펼치기/접기</span>
            </div>
            <div class="detail-content-wrapper" id="detail-content-wrapper">
              <div class="detail-content">
                <pre>${processed.formatted}</pre>
              </div>
            </div>
          </div>
          `;
        })() : ''}

        <div class="success">
          판례 상세 내용을 성공적으로 불러왔습니다.
        </div>
      `;

      // 폴더 UI 추가
      if (window.FolderUI && !document.getElementById('folder-section')) {
        const folderContainer = document.createElement('div');
        folderContainer.id = 'folder-container';
        contentDiv.appendChild(folderContainer);
        window.__folderUI = new window.FolderUI(folderContainer);
      }

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

      // 토글 기능 이벤트 설정 - 원본
      const toggleHeaderOriginal = document.getElementById('detail-toggle-original');
      const contentWrapperOriginal = document.getElementById('detail-content-wrapper-original');
      const toggleArrowOriginal = document.getElementById('toggle-arrow-original');

      if (toggleHeaderOriginal && contentWrapperOriginal && toggleArrowOriginal) {
        // 초기 상태: 접힌 상태로 시작
        contentWrapperOriginal.classList.add('collapsed');
        toggleArrowOriginal.classList.add('collapsed');

        toggleHeaderOriginal.addEventListener('click', function() {
          const isCollapsed = contentWrapperOriginal.classList.contains('collapsed');

          if (isCollapsed) {
            // 펼치기
            contentWrapperOriginal.classList.remove('collapsed');
            toggleArrowOriginal.classList.remove('collapsed');
            contentWrapperOriginal.style.display = 'block';
          } else {
            // 접기
            contentWrapperOriginal.classList.add('collapsed');
            toggleArrowOriginal.classList.add('collapsed');
            contentWrapperOriginal.style.display = 'none';
          }
        });
      }

      // 토글 기능 이벤트 설정 - 전처리 후
      const toggleHeader = document.getElementById('detail-toggle');
      const contentWrapper = document.getElementById('detail-content-wrapper');
      const toggleArrow = document.getElementById('toggle-arrow');

      if (toggleHeader && contentWrapper && toggleArrow) {
        // 초기 상태: 접힌 상태로 시작
        contentWrapper.classList.add('collapsed');
        toggleArrow.classList.add('collapsed');

        toggleHeader.addEventListener('click', function() {
          const isCollapsed = contentWrapper.classList.contains('collapsed');

          if (isCollapsed) {
            // 펼치기
            contentWrapper.classList.remove('collapsed');
            toggleArrow.classList.remove('collapsed');
          } else {
            // 접기
            contentWrapper.classList.add('collapsed');
            toggleArrow.classList.add('collapsed');
          }
        });
      }
    } else {
      contentDiv.innerHTML = `

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
  
  // Ctrl+Q 키보드 이벤트 리스너
  document.addEventListener('keydown', function(e) {
    // Ctrl+Q 또는 Cmd+Q (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Panel] Ctrl+Q pressed - toggling panel');
      togglePanel();
    }

    // ESC 키로 패널 닫기
    if (e.key === 'Escape') {
      const panel = document.getElementById('tax-law-side-panel');
      if (panel && panel.classList.contains('open')) {
        e.preventDefault();
        closePanel();
      }
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
  window.__togglePanel = togglePanel;

  console.log('[Panel] Side panel ready - Ctrl+Q to toggle');
})();