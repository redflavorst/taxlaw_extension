// 폴더 UI 컴포넌트
(function() {
  'use strict';

  // 스타일 정의
  const folderStyles = `
    /* 폴더 섹션 스타일 */
    .folder-section {
      margin-top: 20px;
      border-top: 2px solid #e0e0e0;
      padding-top: 20px;
    }

    .folder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .folder-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .new-folder-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .new-folder-btn:hover {
      background: #218838;
    }

    /* 폴더 리스트 */
    .folder-list {
      max-height: 60vh;
      overflow-y: auto;
    }

    .folder-item {
      margin-bottom: 10px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      background: white;
    }

    .folder-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;
    }

    .folder-item-header:hover {
      background: #f8f9fa;
    }

    .folder-item-header.expanded {
      background: #f0f8ff;
      border-bottom: 1px solid #dee2e6;
    }

    .folder-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .folder-icon {
      font-size: 18px;
      transition: transform 0.1s;  /* 200ms -> 100ms로 단축 */
    }

    .folder-icon.expanded {
      transform: rotate(90deg);
    }

    .folder-name {
      font-weight: 500;
      color: #333;
      flex: 1;
    }

    .folder-name.default {
      color: #6c757d;
      font-style: italic;
    }

    .folder-count {
      background: #e9ecef;
      color: #495057;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .folder-actions {
      display: flex;
      gap: 4px;
    }

    .folder-action-btn {
      background: none;
      border: none;
      color: #6c757d;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .folder-action-btn:hover {
      background: #e9ecef;
      color: #495057;
    }

    .folder-action-btn.delete:hover {
      background: #f8d7da;
      color: #721c24;
    }

    /* 폴더 내용 (요약 리스트) */
    .folder-content {
      padding: 12px;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.15s ease-out;  /* 300ms -> 150ms로 단축 */
    }

    .folder-content.expanded {
      max-height: 500px;
      overflow-y: auto;
    }

    .summary-card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .summary-card:hover {
      background: #e9ecef;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .summary-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .summary-case-number {
      font-weight: 600;
      color: #0066cc;
      font-size: 14px;
    }

    .summary-actions {
      display: flex;
      gap: 4px;
    }

    .summary-action-btn {
      background: none;
      border: none;
      color: #6c757d;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
    }

    .summary-action-btn:hover {
      background: #dee2e6;
    }

    .summary-title {
      color: #495057;
      font-size: 13px;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .summary-preview {
      color: #6c757d;
      font-size: 12px;
      line-height: 1.5;
      max-height: 3em;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .summary-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #dee2e6;
    }

    .summary-date {
      color: #6c757d;
      font-size: 11px;
    }

    .summary-open-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 3px 10px;
      border-radius: 3px;
      font-size: 12px;
      cursor: pointer;
    }

    .summary-open-btn:hover {
      background: #0056b3;
    }

    /* 빈 폴더 메시지 */
    .empty-folder {
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-size: 14px;
    }

    /* 새 폴더 입력 */
    /* 검색창 스타일 */
    .folder-search-container {
      padding: 12px;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .folder-search-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .folder-search-input:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
    }

    .folder-search-input::placeholder {
      color: #999;
    }

    /* 검색 결과 스타일 */
    .search-result-header {
      padding: 12px;
      background: #e9f5ff;
      border-bottom: 1px solid #b3d9ff;
      font-size: 14px;
      color: #0066cc;
      font-weight: 500;
    }

    .search-result-clear {
      float: right;
      color: #666;
      cursor: pointer;
      font-weight: normal;
      font-size: 12px;
    }

    .search-result-clear:hover {
      color: #0066cc;
      text-decoration: underline;
    }

    .new-folder-input-wrapper {
      display: flex;
      gap: 8px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .new-folder-input {
      flex: 1;
      padding: 8px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 14px;
    }

    .new-folder-input:focus {
      outline: none;
      border-color: #80bdff;
      box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
    }

    .new-folder-confirm,
    .new-folder-cancel {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }

    .new-folder-confirm {
      background: #28a745;
      color: white;
    }

    .new-folder-confirm:hover {
      background: #218838;
    }

    .new-folder-cancel {
      background: #6c757d;
      color: white;
    }

    .new-folder-cancel:hover {
      background: #5a6268;
    }

    /* 드래그 앤 드롭 */
    .folder-item-header.drag-over {
      background: #d4edda;
      border-color: #28a745;
    }

    .summary-card.dragging {
      opacity: 0.5;
    }

    /* 저장 컨트롤 */
    .save-controls {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      padding: 12px;
      background: #f0f8ff;
      border-radius: 6px;
    }

    .folder-select {
      flex: 1;
      padding: 8px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 14px;
    }

    .save-to-folder-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .save-to-folder-btn:hover {
      background: #0056b3;
    }

    .save-to-folder-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    /* 토스트 메시지 */
    .toast-message {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000000;
      animation: slideInUp 0.3s ease-out;
    }

    @keyframes slideInUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .toast-message.success {
      background: #28a745;
    }

    .toast-message.error {
      background: #dc3545;
    }

    .toast-message.info {
      background: #17a2b8;
    }
  `;

  // 스타일 주입
  function injectFolderStyles() {
    if (!document.getElementById('tax-law-folder-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'tax-law-folder-styles';
      styleElement.textContent = folderStyles;
      document.head.appendChild(styleElement);
    }
  }

  // 폴더 UI 클래스
  class FolderUI {
    constructor(container) {
      this.container = container;
      this.folders = [];
      this.expandedFolders = new Set();
      this.currentSummary = null;
      this.folderContentCache = new Map();  // 폴더 내용 캐싱
      this.init();
    }

    async init() {
      injectFolderStyles();

      // 스토리지 초기화
      if (window.FolderStorage) {
        await window.FolderStorage.init();
      }

      this.render();
      this.loadFolders();
    }

    render() {
      const folderSection = document.createElement('div');
      folderSection.className = 'folder-section';
      folderSection.id = 'folder-section';
      folderSection.innerHTML = `
        <div class="folder-header">
          <div class="folder-title">
            📁 내 요약 보관함
          </div>
          <button class="new-folder-btn" id="new-folder-btn">
            ➕ 새 폴더
          </button>
        </div>
        <div id="new-folder-input-container"></div>
        <div class="folder-search-container">
          <input type="text"
                 class="folder-search-input"
                 id="folder-search-input"
                 placeholder="판례번호 또는 제목으로 검색..."
                 maxlength="100">
        </div>
        <div class="folder-list" id="folder-list">
          <div class="loading">폴더 목록을 불러오는 중...</div>
        </div>
      `;

      this.container.appendChild(folderSection);
      this.attachEventListeners();
    }

    attachEventListeners() {
      // 새 폴더 버튼
      document.getElementById('new-folder-btn')?.addEventListener('click', () => {
        this.showNewFolderInput();
      });

      // 검색 입력창
      const searchInput = document.getElementById('folder-search-input');
      if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            this.searchSummaries(e.target.value);
          }, 300); // 300ms 디바운싱
        });

        searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.searchSummaries(e.target.value);
          }
        });
      }
    }

    showNewFolderInput() {
      const container = document.getElementById('new-folder-input-container');
      container.innerHTML = `
        <div class="new-folder-input-wrapper">
          <input type="text"
                 class="new-folder-input"
                 id="new-folder-name"
                 placeholder="폴더 이름 입력..."
                 maxlength="50">
          <button class="new-folder-confirm" id="confirm-new-folder">확인</button>
          <button class="new-folder-cancel" id="cancel-new-folder">취소</button>
        </div>
      `;

      const input = document.getElementById('new-folder-name');
      const confirmBtn = document.getElementById('confirm-new-folder');
      const cancelBtn = document.getElementById('cancel-new-folder');

      input.focus();

      const createFolder = async () => {
        const name = input.value.trim();
        if (name) {
          try {
            await window.FolderStorage.folders.createFolder(name);
            this.showToast(`'${name}' 폴더가 생성되었습니다.`, 'success');
            container.innerHTML = '';
            await this.loadFolders();  // await 추가
            this.updateSaveDropdown();  // 드롭다운 업데이트
          } catch (error) {
            this.showToast('폴더 생성 실패: ' + error.message, 'error');
          }
        }
      };

      confirmBtn.addEventListener('click', createFolder);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
        if (e.key === 'Escape') container.innerHTML = '';
      });
      cancelBtn.addEventListener('click', () => {
        container.innerHTML = '';
      });
    }

    async loadFolders() {
      try {
        this.folders = await window.FolderStorage.folders.getAllFolders();
        this.renderFolders();
      } catch (error) {
        console.error('[FolderUI] Failed to load folders:', error);
        this.showToast('폴더 목록을 불러올 수 없습니다.', 'error');
      }
    }

    renderFolders() {
      const listContainer = document.getElementById('folder-list');

      // 요소가 없으면 리턴 (패널이 아직 생성되지 않은 경우)
      if (!listContainer) {
        console.log('[FolderUI] folder-list element not found yet');
        return;
      }

      if (this.folders.length === 0) {
        listContainer.innerHTML = '<div class="empty-folder">폴더가 없습니다.</div>';
        return;
      }

      listContainer.innerHTML = this.folders.map(folder => `
        <div class="folder-item" data-folder-id="${folder.id}">
          <div class="folder-item-header ${this.expandedFolders.has(folder.id) ? 'expanded' : ''}"
               data-folder-id="${folder.id}">
            <div class="folder-info">
              <span class="folder-icon ${this.expandedFolders.has(folder.id) ? 'expanded' : ''}">▶</span>
              <span class="folder-name ${folder.isDefault ? 'default' : ''}">${folder.name}</span>
              <span class="folder-count">${folder.summaryCount || 0}</span>
            </div>
            <div class="folder-actions">
              ${!folder.isDefault ? `
                <button class="folder-action-btn rename" data-folder-id="${folder.id}" title="이름 변경">✏️</button>
                <button class="folder-action-btn delete" data-folder-id="${folder.id}" title="삭제">🗑️</button>
              ` : ''}
            </div>
          </div>
          <div class="folder-content ${this.expandedFolders.has(folder.id) ? 'expanded' : ''}"
               id="folder-content-${folder.id}">
            ${this.expandedFolders.has(folder.id) ? '<div class="loading">요약 목록을 불러오는 중...</div>' : ''}
          </div>
        </div>
      `).join('');

      // 이벤트 리스너 추가
      this.attachFolderEventListeners();

      // 열려있던 폴더의 내용 로드
      for (const folderId of this.expandedFolders) {
        this.loadFolderContent(folderId);
      }
    }

    attachFolderEventListeners() {
      // 폴더 헤더 클릭 (토글)
      document.querySelectorAll('.folder-item-header').forEach(header => {
        header.addEventListener('click', (e) => {
          if (e.target.closest('.folder-actions')) return;

          const folderId = header.dataset.folderId;
          this.toggleFolder(folderId);
        });
      });

      // 폴더 이름 변경
      document.querySelectorAll('.folder-action-btn.rename').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const folderId = btn.dataset.folderId;
          const folder = this.folders.find(f => f.id === folderId);

          const newName = prompt('새 폴더 이름:', folder.name);
          if (newName && newName.trim() !== folder.name) {
            try {
              await window.FolderStorage.folders.renameFolder(folderId, newName.trim());
              this.showToast('폴더 이름이 변경되었습니다.', 'success');
              await this.loadFolders();
              this.updateSaveDropdown();  // 드롭다운 업데이트
            } catch (error) {
              this.showToast('이름 변경 실패: ' + error.message, 'error');
            }
          }
        });
      });

      // 폴더 삭제
      document.querySelectorAll('.folder-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const folderId = btn.dataset.folderId;
          const folder = this.folders.find(f => f.id === folderId);

          if (confirm(`'${folder.name}' 폴더와 내부의 모든 요약을 삭제하시겠습니까?\n이 작업은 취소할 수 없습니다.`)) {
            try {
              await window.FolderStorage.folders.deleteFolder(folderId);
              this.showToast('폴더가 삭제되었습니다.', 'success');
              this.expandedFolders.delete(folderId);
              await this.loadFolders();
              this.updateSaveDropdown();  // 드롭다운 업데이트
            } catch (error) {
              this.showToast('삭제 실패: ' + error.message, 'error');
            }
          }
        });
      });
    }

    async toggleFolder(folderId) {
      const content = document.getElementById(`folder-content-${folderId}`);
      const header = document.querySelector(`.folder-item-header[data-folder-id="${folderId}"]`);
      const icon = header.querySelector('.folder-icon');

      if (this.expandedFolders.has(folderId)) {
        // 닫기
        this.expandedFolders.delete(folderId);
        header.classList.remove('expanded');
        content.classList.remove('expanded');
        icon.classList.remove('expanded');
      } else {
        // 열기
        this.expandedFolders.add(folderId);
        header.classList.add('expanded');
        content.classList.add('expanded');
        icon.classList.add('expanded');

        // 캐시된 내용이 없으면 로드
        if (!this.folderContentCache.has(folderId)) {
          await this.loadFolderContent(folderId);
        } else {
          // 캐시된 내용 사용
          content.innerHTML = this.folderContentCache.get(folderId);
          this.attachSummaryEventListeners(content);
        }
      }
    }

    async loadFolderContent(folderId) {
      const contentContainer = document.getElementById(`folder-content-${folderId}`);

      try {
        const summaries = await window.FolderStorage.summaries.getSummariesByFolder(folderId);

        if (summaries.length === 0) {
          contentContainer.innerHTML = '<div class="empty-folder">이 폴더에 저장된 요약이 없습니다.</div>';
          this.folderContentCache.set(folderId, contentContainer.innerHTML);
          return;
        }

        const htmlContent = summaries.map(summary => `
          <div class="summary-card"
               data-summary-id="${summary.id}"
               draggable="true">
            <div class="summary-card-header">
              <span class="summary-case-number">${summary.metadata?.caseNumber || summary.metadata?.caseType || '판례'}</span>
              <div class="summary-actions">
                <button class="summary-action-btn delete-summary"
                        data-summary-id="${summary.id}"
                        title="삭제">🗑️</button>
              </div>
            </div>
            ${summary.metadata?.title ? `
              <div class="summary-title">${summary.metadata.title}</div>
            ` : ''}
            <div class="summary-preview">📝 ${summary.preview || '요약 내용 없음'}</div>
            <div class="summary-meta">
              <span class="summary-date">${new Date(summary.createdAt).toLocaleDateString('ko-KR')}</span>
              <button class="summary-open-btn" data-summary-id="${summary.id}">📑 원본열기</button>
            </div>
          </div>
        `).join('');

        // HTML 설정
        contentContainer.innerHTML = htmlContent;

        // 캐시에 저장
        this.folderContentCache.set(folderId, htmlContent);

        this.attachSummaryEventListeners(contentContainer);
      } catch (error) {
        console.error('[FolderUI] Failed to load folder content:', error);
        contentContainer.innerHTML = '<div class="error">요약 목록을 불러올 수 없습니다.</div>';
      }
    }

    attachSummaryEventListeners(container) {
      // 요약 카드 클릭 (사이드패널에 표시)
      container.querySelectorAll('.summary-card').forEach(card => {
        card.addEventListener('click', async (e) => {
          if (e.target.closest('.summary-actions') || e.target.closest('.summary-open-btn')) return;

          const summaryId = card.dataset.summaryId;
          // 사이드패널에 요약 표시
          await this.showSummaryInPanel(summaryId);
        });
      });

      // 열기 버튼 (새 탭으로 원본 판례 열기)
      container.querySelectorAll('.summary-open-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const summaryId = btn.dataset.summaryId;
          await this.openSummary(summaryId);
        });
      });

      // 삭제 버튼
      container.querySelectorAll('.delete-summary').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const summaryId = btn.dataset.summaryId;

          if (confirm('이 요약을 삭제하시겠습니까?')) {
            try {
              await window.FolderStorage.summaries.deleteSummary(summaryId);
              this.showToast('요약이 삭제되었습니다.', 'success');

              // 캐시 무효화
              this.folderContentCache.clear();

              // 현재 열린 폴더 다시 로드
              for (const folderId of this.expandedFolders) {
                await this.loadFolderContent(folderId);
              }
            } catch (error) {
              this.showToast('삭제 실패: ' + error.message, 'error');
            }
          }
        });
      });

      // 드래그 앤 드롭 설정
      this.setupDragAndDrop(container);
    }

    setupDragAndDrop(container) {
      let draggedSummary = null;

      container.querySelectorAll('.summary-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
          draggedSummary = {
            id: card.dataset.summaryId,
            element: card
          };
          card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          draggedSummary = null;
        });
      });

      // 폴더 헤더를 드롭 타겟으로
      document.querySelectorAll('.folder-item-header').forEach(header => {
        header.addEventListener('dragover', (e) => {
          e.preventDefault();
          header.classList.add('drag-over');
        });

        header.addEventListener('dragleave', () => {
          header.classList.remove('drag-over');
        });

        header.addEventListener('drop', async (e) => {
          e.preventDefault();
          header.classList.remove('drag-over');

          if (draggedSummary) {
            const targetFolderId = header.dataset.folderId;

            try {
              await window.FolderStorage.summaries.moveSummary(draggedSummary.id, targetFolderId);
              this.showToast('요약이 이동되었습니다.', 'success');

              // 캐시 무효화
              this.folderContentCache.clear();

              // 관련 폴더들 다시 로드
              for (const folderId of this.expandedFolders) {
                await this.loadFolderContent(folderId);
              }

              // 폴더 카운트 업데이트
              await this.loadFolders();
            } catch (error) {
              this.showToast('이동 실패: ' + error.message, 'error');
            }
          }
        });
      });
    }

    async openSummary(summaryId) {
      try {
        const summary = await window.FolderStorage.summaries.getSummary(summaryId);
        if (summary && summary.docId) {
          // docId가 12자리가 아니면 패딩
          const paddedDocId = String(summary.docId).padStart(12, '0');

          // UUID 생성 (wnkey 파라미터용)
          const wnkey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });

          // 판례 상세 페이지 URL 생성
          const detailUrl = `https://taxlaw.nts.go.kr/pd/USEPDA002P.do?ntstDcmId=${paddedDocId}&wnkey=${wnkey}`;

          // 새 탭에서 열기
          window.open(detailUrl, '_blank');

          this.showToast('판례 페이지를 새 탭에서 열고 있습니다.', 'info');
        } else {
          this.showToast('판례 ID를 찾을 수 없습니다.', 'error');
        }
      } catch (error) {
        console.error('[FolderUI] Failed to open summary:', error);
        this.showToast('요약을 열 수 없습니다.', 'error');
      }
    }

    // 사이드패널에 요약 표시 (카드 클릭 시)
    async showSummaryInPanel(summaryId) {
      try {
        const summary = await window.FolderStorage.summaries.getSummary(summaryId);
        if (summary) {
          this.displaySummary(summary);
        }
      } catch (error) {
        console.error('[FolderUI] Failed to show summary:', error);
        this.showToast('요약을 표시할 수 없습니다.', 'error');
      }
    }

    displaySummary(summary) {
      // 기존 LLM 결과 컨테이너 찾기 또는 생성
      let resultContainer = document.getElementById('llm-result-container');
      if (!resultContainer) {
        const panelContent = document.getElementById('panel-content');
        const aiSection = document.createElement('div');
        aiSection.className = 'ai-section';
        aiSection.innerHTML = '<div id="llm-result-container"></div>';
        panelContent.insertBefore(aiSection, panelContent.firstChild);
        resultContainer = document.getElementById('llm-result-container');
      }

      // 포맷된 HTML 생성
      const formattedHTML = this.formatSummaryToHTML(summary.sections);

      resultContainer.innerHTML = `
        <div class="llm-result">
          <div class="llm-result-header">
            <h4 class="llm-result-title">📋 저장된 요약: ${summary.metadata?.caseNumber || '판례'}</h4>
            <button class="llm-copy-btn" id="saved-summary-copy">📄 복사</button>
          </div>
          ${formattedHTML}
        </div>
      `;

      // 복사 버튼 이벤트
      document.getElementById('saved-summary-copy')?.addEventListener('click', () => {
        const text = this.formatSummaryToText(summary.sections);
        this.copyToClipboard(text);
      });

      // 스크롤 위치 조정
      resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    formatSummaryToHTML(sections) {
      const SECTION_TITLES = {
        summary: '이 사건 간단 압축 요약',
        issues: '쟁점',
        facts: '주요 사실',
        legal: '법리 요지',
        judgment: '구체 판단',
        conclusion: '결론/주문',
        rebuttal: '반론/배척 사유'
      };

      let html = '<div class="llm-result-content">';
      const renderOrder = ['summary', 'issues', 'facts', 'legal', 'judgment', 'conclusion', 'rebuttal'];

      for (const key of renderOrder) {
        if (!sections[key] || sections[key].length === 0) continue;

        html += '<div class="llm-content-section">';
        html += `<div class="llm-section-title">${SECTION_TITLES[key] || key}</div>`;
        html += '<div class="llm-section-content">';
        html += '<ul class="llm-bullet-list">';
        html += sections[key].map(item => `<li>${this.escapeHTML(item)}</li>`).join('');
        html += '</ul>';
        html += '</div></div>';
      }

      html += '</div>';
      return html;
    }

    formatSummaryToText(sections) {
      const SECTION_TITLES = {
        summary: '이 사건 간단 압축 요약',
        issues: '쟁점',
        facts: '주요 사실',
        legal: '법리 요지',
        judgment: '구체 판단',
        conclusion: '결론/주문',
        rebuttal: '반론/배척 사유'
      };

      let text = '';
      const renderOrder = ['summary', 'issues', 'facts', 'legal', 'judgment', 'conclusion', 'rebuttal'];

      for (const key of renderOrder) {
        if (!sections[key] || sections[key].length === 0) continue;

        text += `${SECTION_TITLES[key] || key}\n`;
        sections[key].forEach(item => {
          text += `- ${item}\n`;
        });
        text += '\n';
      }

      return text.trim();
    }

    escapeHTML(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('클립보드에 복사되었습니다.', 'success');
      }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showToast('클립보드에 복사되었습니다.', 'success');
      });
    }

    // 요약 저장 UI 렌더링
    renderSaveControls(container, currentSummary) {
      // 기존 저장 컨트롤이 있으면 제거
      const existing = container.querySelector('.save-controls');
      if (existing) {
        existing.remove();
      }

      const saveSection = document.createElement('div');
      saveSection.className = 'save-controls';
      saveSection.innerHTML = `
        <select class="folder-select" id="save-folder-select">
          <option value="">폴더 선택...</option>
          ${this.folders.map(folder =>
            `<option value="${folder.id}">${folder.name} (${folder.summaryCount || 0})</option>`
          ).join('')}
        </select>
        <button class="save-to-folder-btn" id="save-to-folder" disabled>
          💾 폴더에 저장
        </button>
      `;

      container.appendChild(saveSection);

      const select = document.getElementById('save-folder-select');
      const saveBtn = document.getElementById('save-to-folder');

      select.addEventListener('change', () => {
        saveBtn.disabled = !select.value;
      });

      saveBtn.addEventListener('click', async () => {
        const folderId = select.value;
        if (folderId && currentSummary) {
          await this.saveSummary(folderId, currentSummary);
        }
      });
    }

    // 저장 드롭다운 업데이트 (폴더 목록이 변경될 때)
    updateSaveDropdown() {
      const select = document.getElementById('save-folder-select');
      if (select) {
        const currentValue = select.value;
        select.innerHTML = `
          <option value="">폴더 선택...</option>
          ${this.folders.map(folder =>
            `<option value="${folder.id}" ${folder.id === currentValue ? 'selected' : ''}>
              ${folder.name} (${folder.summaryCount || 0})
            </option>`
          ).join('')}
        `;

        // 선택 상태 복원
        if (currentValue && this.folders.find(f => f.id === currentValue)) {
          select.value = currentValue;
        }
      }
    }

    // 검색 기능
    async searchSummaries(query) {
      const listContainer = document.getElementById('folder-list');

      if (!query || query.trim() === '') {
        // 검색어가 없으면 원래 폴더 목록 표시
        this.renderFolders();
        return;
      }

      const searchQuery = query.trim().toLowerCase();
      listContainer.innerHTML = '<div class="loading">검색 중...</div>';

      try {
        // 모든 폴더의 요약을 검색
        const searchResults = [];

        for (const folder of this.folders) {
          const summaries = await window.FolderStorage.summaries.getSummariesByFolder(folder.id);

          for (const summary of summaries) {
            // 판례번호 또는 제목에서 검색
            const caseNumber = (summary.metadata?.caseNumber || '').toLowerCase();
            const title = (summary.metadata?.title || '').toLowerCase();
            const preview = (summary.preview || '').toLowerCase();

            if (caseNumber.includes(searchQuery) ||
                title.includes(searchQuery) ||
                preview.includes(searchQuery)) {
              searchResults.push({
                ...summary,
                folderName: folder.name,
                folderId: folder.id
              });
            }
          }
        }

        // 검색 결과 표시
        this.renderSearchResults(searchResults, query);

      } catch (error) {
        console.error('[FolderUI] Search failed:', error);
        listContainer.innerHTML = '<div class="error">검색 중 오류가 발생했습니다.</div>';
      }
    }

    // 검색 결과 렌더링
    renderSearchResults(results, query) {
      const listContainer = document.getElementById('folder-list');

      if (results.length === 0) {
        listContainer.innerHTML = `
          <div class="search-result-header">
            '🔍 ${query}' 검색 결과: 0건
            <span class="search-result-clear" id="search-clear-btn">
              ❌ 초기화
            </span>
          </div>
          <div class="empty-folder">검색 결과가 없습니다.</div>
        `;
        return;
      }

      // 폴더별로 그룹화
      const groupedResults = {};
      results.forEach(result => {
        if (!groupedResults[result.folderId]) {
          groupedResults[result.folderId] = {
            folderName: result.folderName,
            summaries: []
          };
        }
        groupedResults[result.folderId].summaries.push(result);
      });

      let html = `
        <div class="search-result-header">
          '🔍 ${query}' 검색 결과: ${results.length}건
          <span class="search-result-clear" id="search-clear-btn">
            ❌ 초기화
          </span>
        </div>
      `;

      // 각 폴더의 검색 결과 표시
      for (const [folderId, group] of Object.entries(groupedResults)) {
        html += `
          <div class="folder-item expanded">
            <div class="folder-header">
              <span class="folder-icon expanded">📂</span>
              <span class="folder-name">${group.folderName}</span>
              <span class="folder-count">${group.summaries.length}</span>
            </div>
            <div class="folder-content expanded">
        `;

        group.summaries.forEach(summary => {
          const highlightedCaseNumber = this.highlightSearchTerm(summary.metadata?.caseNumber || '판례번호 없음', query);
          const highlightedTitle = this.highlightSearchTerm(summary.metadata?.title || '제목 없음', query);
          const highlightedPreview = this.highlightSearchTerm(summary.preview || '내용 없음', query);

          html += `
            <div class="summary-card" data-summary-id="${summary.id}" data-folder-id="${folderId}">
              <div class="summary-card-header">
                <div class="summary-case-number">${highlightedCaseNumber}</div>
                <div class="summary-actions">
                  <button class="summary-action-btn" onclick="window.__folderUI.viewSummaryDetail('${summary.id}', '${folderId}')" title="상세보기">🔍</button>
                  <button class="summary-action-btn delete" onclick="window.__folderUI.deleteSummary('${summary.id}', '${folderId}')" title="삭제">🗑️</button>
                </div>
              </div>
              <div class="summary-title">${highlightedTitle}</div>
              <div class="summary-preview">${highlightedPreview}</div>
              <div class="summary-date">${new Date(summary.createdAt).toLocaleDateString()}</div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      }

      listContainer.innerHTML = html;

      // 초기화 버튼에 이벤트 리스너 추가
      const clearBtn = document.getElementById('search-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.clearSearch();
        });
      }
    }

    // 검색어 하이라이트
    highlightSearchTerm(text, searchTerm) {
      if (!text || !searchTerm) return text;

      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark style="background-color: #ffeb3b; padding: 2px;">$1</mark>');
    }

    // 검색 초기화
    clearSearch() {
      const searchInput = document.getElementById('folder-search-input');
      if (searchInput) {
        searchInput.value = '';
      }
      this.renderFolders();
    }

    async saveSummary(folderId, summaryData) {
      try {
        const { docId, metadata, sections, preview } = summaryData;

        // 중복 체크
        const existing = await window.FolderStorage.summaries.findByDocIdAndFolder(docId, folderId);
        if (existing) {
          if (!confirm('이 판례가 이미 해당 폴더에 저장되어 있습니다. 덮어쓰시겠습니까?')) {
            return;
          }
        }

        await window.FolderStorage.summaries.saveSummary(folderId, docId, metadata, sections, preview);

        this.showToast('요약이 저장되었습니다.', 'success');

        // 캐시 무효화 (새 요약이 추가되었으므로)
        this.folderContentCache.delete(folderId);

        // 폴더 자동 펼치기
        if (!this.expandedFolders.has(folderId)) {
          await this.toggleFolder(folderId);
        } else {
          await this.loadFolderContent(folderId);
        }

        // 폴더 목록 새로고침 (카운트 업데이트)
        await this.loadFolders();
        this.updateSaveDropdown();  // 드롭다운의 카운트도 업데이트
      } catch (error) {
        console.error('[FolderUI] Failed to save summary:', error);
        this.showToast('저장 실패: ' + error.message, 'error');
      }
    }

    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast-message ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  }

  // 전역 노출
  window.FolderUI = FolderUI;

  // 전역 함수로 초기화 기능 등록
  window.__clearFolderSearch = function() {
    const searchInput = document.getElementById('folder-search-input');
    if (searchInput) {
      searchInput.value = '';
    }
    if (window.__folderUI && window.__folderUI.renderFolders) {
      window.__folderUI.renderFolders();
    }
  };

})();