// 폴더 및 요약 관리 시스템
(function() {
  'use strict';

  // IndexedDB 설정
  const DB_NAME = 'TaxLawSummaryDB';
  const DB_VERSION = 1;
  let db = null;

  // 스토어 이름
  const STORE_FOLDERS = 'folders';
  const STORE_SUMMARIES = 'summaries';

  // IndexedDB 초기화
  async function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[Storage] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log('[Storage] IndexedDB opened successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 폴더 스토어 생성
        if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
          const folderStore = db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
          folderStore.createIndex('name', 'name', { unique: false });
          folderStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 요약 스토어 생성
        if (!db.objectStoreNames.contains(STORE_SUMMARIES)) {
          const summaryStore = db.createObjectStore(STORE_SUMMARIES, { keyPath: 'id' });
          summaryStore.createIndex('folderId', 'folderId', { unique: false });
          summaryStore.createIndex('docId', 'docId', { unique: false });
          summaryStore.createIndex('createdAt', 'createdAt', { unique: false });
          // 복합 인덱스: folderId + docId (중복 방지용)
          summaryStore.createIndex('folder_doc', ['folderId', 'docId'], { unique: true });
        }
      };
    });
  }

  // ID 생성 함수
  function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 폴더 관련 함수들
  const FolderManager = {
    // 기본 폴더 생성
    async createDefaultFolder() {
      const defaultFolder = {
        id: 'folder_default',
        name: '미분류',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true,
        summaryCount: 0
      };

      try {
        const transaction = db.transaction([STORE_FOLDERS], 'readwrite');
        const store = transaction.objectStore(STORE_FOLDERS);
        await store.add(defaultFolder);
        console.log('[Storage] Default folder created');
      } catch (error) {
        // 이미 존재하는 경우 무시
        if (error.name !== 'ConstraintError') {
          console.error('[Storage] Failed to create default folder:', error);
        }
      }
    },

    // 모든 폴더 조회
    async getAllFolders() {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FOLDERS], 'readonly');
        const store = transaction.objectStore(STORE_FOLDERS);
        const request = store.getAll();

        request.onsuccess = () => {
          const folders = request.result;
          // 기본 폴더를 맨 위로, 나머지는 생성 시간 순
          folders.sort((a, b) => {
            if (a.isDefault) return -1;
            if (b.isDefault) return 1;
            return b.createdAt - a.createdAt;
          });
          resolve(folders);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    },

    // 폴더 생성
    async createFolder(name) {
      const folder = {
        id: generateId('folder'),
        name: name.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: false,
        summaryCount: 0
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FOLDERS], 'readwrite');
        const store = transaction.objectStore(STORE_FOLDERS);
        const request = store.add(folder);

        request.onsuccess = () => {
          console.log('[Storage] Folder created:', folder.name);
          resolve(folder);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    },

    // 폴더명 변경
    async renameFolder(folderId, newName) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FOLDERS], 'readwrite');
        const store = transaction.objectStore(STORE_FOLDERS);
        const getRequest = store.get(folderId);

        getRequest.onsuccess = () => {
          const folder = getRequest.result;
          if (!folder) {
            reject(new Error('Folder not found'));
            return;
          }

          if (folder.isDefault) {
            reject(new Error('Cannot rename default folder'));
            return;
          }

          folder.name = newName.trim();
          folder.updatedAt = Date.now();

          const putRequest = store.put(folder);
          putRequest.onsuccess = () => {
            console.log('[Storage] Folder renamed:', folder.name);
            resolve(folder);
          };
          putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
      });
    },

    // 폴더 삭제 (내부 요약도 함께 삭제)
    async deleteFolder(folderId) {
      if (folderId === 'folder_default') {
        throw new Error('Cannot delete default folder');
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FOLDERS, STORE_SUMMARIES], 'readwrite');

        // 폴더 삭제
        const folderStore = transaction.objectStore(STORE_FOLDERS);
        folderStore.delete(folderId);

        // 해당 폴더의 모든 요약 삭제
        const summaryStore = transaction.objectStore(STORE_SUMMARIES);
        const index = summaryStore.index('folderId');
        const request = index.openCursor(IDBKeyRange.only(folderId));

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            summaryStore.delete(cursor.primaryKey);
            cursor.continue();
          }
        };

        transaction.oncomplete = () => {
          console.log('[Storage] Folder and summaries deleted:', folderId);
          resolve();
        };

        transaction.onerror = () => {
          reject(transaction.error);
        };
      });
    },

    // 폴더별 요약 개수 업데이트
    async updateSummaryCount(folderId) {
      const count = await SummaryManager.getCountByFolder(folderId);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FOLDERS], 'readwrite');
        const store = transaction.objectStore(STORE_FOLDERS);
        const request = store.get(folderId);

        request.onsuccess = () => {
          const folder = request.result;
          if (folder) {
            folder.summaryCount = count;
            folder.updatedAt = Date.now();
            store.put(folder);
          }
          resolve();
        };

        request.onerror = () => reject(request.error);
      });
    }
  };

  // 요약 관련 함수들
  const SummaryManager = {
    // 요약 저장
    async saveSummary(folderId, docId, metadata, sections, preview) {
      const summaryId = generateId('summary');

      // 중복 체크
      const existing = await this.findByDocIdAndFolder(docId, folderId);
      if (existing) {
        // 덮어쓰기
        return this.updateSummary(existing.id, { sections, preview, updatedAt: Date.now() });
      }

      const summary = {
        id: summaryId,
        folderId: folderId || 'folder_default',
        docId,
        metadata,
        sections,
        preview: preview || this.generatePreview(sections),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SUMMARIES], 'readwrite');
        const store = transaction.objectStore(STORE_SUMMARIES);
        const request = store.add(summary);

        request.onsuccess = async () => {
          console.log('[Storage] Summary saved:', summaryId);
          // 폴더 카운트 업데이트
          await FolderManager.updateSummaryCount(folderId);
          resolve(summary);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    },

    // 요약 미리보기 생성
    generatePreview(sections) {
      // summary 섹션에서 첫 200자 추출
      if (sections.summary && sections.summary.length > 0) {
        const fullText = sections.summary.join(' ');
        return fullText.substring(0, 200) + (fullText.length > 200 ? '...' : '');
      }
      return '요약 내용이 없습니다.';
    },

    // docId와 folderId로 요약 찾기
    async findByDocIdAndFolder(docId, folderId) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SUMMARIES], 'readonly');
        const store = transaction.objectStore(STORE_SUMMARIES);
        const index = store.index('folder_doc');
        const request = index.get([folderId, docId]);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    },

    // 폴더별 요약 목록 조회
    async getSummariesByFolder(folderId) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SUMMARIES], 'readonly');
        const store = transaction.objectStore(STORE_SUMMARIES);
        const index = store.index('folderId');
        const request = index.getAll(folderId);

        request.onsuccess = () => {
          const summaries = request.result;
          // 최신순 정렬
          summaries.sort((a, b) => b.createdAt - a.createdAt);
          resolve(summaries);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    },

    // 폴더별 요약 개수
    async getCountByFolder(folderId) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SUMMARIES], 'readonly');
        const store = transaction.objectStore(STORE_SUMMARIES);
        const index = store.index('folderId');
        const request = index.count(folderId);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    },

    // 특정 요약 조회
    async getSummary(summaryId) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SUMMARIES], 'readonly');
        const store = transaction.objectStore(STORE_SUMMARIES);
        const request = store.get(summaryId);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    },

    // 요약 삭제
    async deleteSummary(summaryId) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SUMMARIES], 'readwrite');
        const store = transaction.objectStore(STORE_SUMMARIES);

        // 먼저 요약 정보 가져오기 (폴더 ID 확인용)
        const getRequest = store.get(summaryId);

        getRequest.onsuccess = () => {
          const summary = getRequest.result;
          if (!summary) {
            reject(new Error('Summary not found'));
            return;
          }

          const deleteRequest = store.delete(summaryId);

          deleteRequest.onsuccess = async () => {
            console.log('[Storage] Summary deleted:', summaryId);
            // 폴더 카운트 업데이트
            await FolderManager.updateSummaryCount(summary.folderId);
            resolve();
          };

          deleteRequest.onerror = () => reject(deleteRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
      });
    },

    // 요약 이동
    async moveSummary(summaryId, newFolderId) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SUMMARIES], 'readwrite');
        const store = transaction.objectStore(STORE_SUMMARIES);
        const request = store.get(summaryId);

        request.onsuccess = () => {
          const summary = request.result;
          if (!summary) {
            reject(new Error('Summary not found'));
            return;
          }

          const oldFolderId = summary.folderId;
          summary.folderId = newFolderId;
          summary.updatedAt = Date.now();

          const putRequest = store.put(summary);

          putRequest.onsuccess = async () => {
            console.log('[Storage] Summary moved:', summaryId);
            // 두 폴더의 카운트 업데이트
            await FolderManager.updateSummaryCount(oldFolderId);
            await FolderManager.updateSummaryCount(newFolderId);
            resolve(summary);
          };

          putRequest.onerror = () => reject(putRequest.error);
        };

        request.onerror = () => reject(request.error);
      });
    },

    // 요약 업데이트
    async updateSummary(summaryId, updates) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SUMMARIES], 'readwrite');
        const store = transaction.objectStore(STORE_SUMMARIES);
        const request = store.get(summaryId);

        request.onsuccess = () => {
          const summary = request.result;
          if (!summary) {
            reject(new Error('Summary not found'));
            return;
          }

          Object.assign(summary, updates);
          summary.updatedAt = Date.now();

          const putRequest = store.put(summary);
          putRequest.onsuccess = () => {
            console.log('[Storage] Summary updated:', summaryId);
            resolve(summary);
          };
          putRequest.onerror = () => reject(putRequest.error);
        };

        request.onerror = () => reject(request.error);
      });
    }
  };

  // 검색 기능
  const SearchManager = {
    // 키워드로 요약 검색
    async searchSummaries(keyword) {
      const allSummaries = await this.getAllSummaries();
      const lowerKeyword = keyword.toLowerCase();

      return allSummaries.filter(summary => {
        // 메타데이터에서 검색
        if (summary.metadata) {
          if (summary.metadata.caseNumber?.toLowerCase().includes(lowerKeyword)) return true;
          if (summary.metadata.title?.toLowerCase().includes(lowerKeyword)) return true;
          if (summary.metadata.caseType?.toLowerCase().includes(lowerKeyword)) return true;
        }

        // 섹션 내용에서 검색
        if (summary.sections) {
          for (const section of Object.values(summary.sections)) {
            if (Array.isArray(section)) {
              const sectionText = section.join(' ').toLowerCase();
              if (sectionText.includes(lowerKeyword)) return true;
            }
          }
        }

        return false;
      });
    },

    // 모든 요약 가져오기
    async getAllSummaries() {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SUMMARIES], 'readonly');
        const store = transaction.objectStore(STORE_SUMMARIES);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    }
  };

  // 내보내기/가져오기 기능
  const BackupManager = {
    // 모든 데이터 내보내기
    async exportAll() {
      const folders = await FolderManager.getAllFolders();
      const summaries = await SearchManager.getAllSummaries();

      const exportData = {
        version: DB_VERSION,
        exportDate: new Date().toISOString(),
        folders,
        summaries
      };

      return JSON.stringify(exportData, null, 2);
    },

    // 데이터 가져오기
    async importData(jsonString) {
      try {
        const data = JSON.parse(jsonString);

        if (!data.folders || !data.summaries) {
          throw new Error('Invalid import data format');
        }

        // 트랜잭션으로 일괄 처리
        const transaction = db.transaction([STORE_FOLDERS, STORE_SUMMARIES], 'readwrite');

        // 폴더 가져오기
        const folderStore = transaction.objectStore(STORE_FOLDERS);
        for (const folder of data.folders) {
          await folderStore.put(folder);
        }

        // 요약 가져오기
        const summaryStore = transaction.objectStore(STORE_SUMMARIES);
        for (const summary of data.summaries) {
          await summaryStore.put(summary);
        }

        return new Promise((resolve, reject) => {
          transaction.oncomplete = () => {
            console.log('[Storage] Data imported successfully');
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        });
      } catch (error) {
        console.error('[Storage] Import failed:', error);
        throw error;
      }
    }
  };

  // 초기화 및 API 노출
  async function initialize() {
    try {
      await initDB();
      await FolderManager.createDefaultFolder();
      console.log('[Storage] Folder manager initialized');
    } catch (error) {
      console.error('[Storage] Initialization failed:', error);
      throw error;
    }
  }

  // 전역 API 노출
  window.FolderStorage = {
    init: initialize,
    folders: FolderManager,
    summaries: SummaryManager,
    search: SearchManager,
    backup: BackupManager
  };

})();