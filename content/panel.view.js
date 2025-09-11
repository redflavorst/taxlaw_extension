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
          
          ${data.clickedInfo && data.clickedInfo.registrationDate ? `
          <div class="info-section">
            <div class="info-label">등록일자</div>
            <div class="info-value">${data.clickedInfo.registrationDate}</div>
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
  
  // 패널 업데이트 함수
  function updatePanel(data) {
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
        
        ${detail.caseNumber ? `
        <div class="info-section">
          <div class="info-label">판례번호</div>
          <div class="info-value">${detail.caseNumber}</div>
        </div>
        ` : ''}
        
        ${detail.date ? `
        <div class="info-section">
          <div class="info-label">날짜</div>
          <div class="info-value">${detail.date}</div>
        </div>
        ` : ''}
        
        ${detail.title ? `
        <div class="info-section">
          <div class="info-label">제목</div>
          <div class="info-value">${detail.title}</div>
        </div>
        ` : ''}
        
        ${detail.content ? `
        <div class="info-section">
          <div class="info-label">판례 상세 내용</div>
          <div class="detail-content">
            <pre>${detail.content}</pre>
          </div>
        </div>
        ` : ''}
        
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