// Main-world 스크립트 - 네트워크 요청 인터셉트 (CSP 우회)
// 이 스크립트는 "world": "MAIN" 설정으로 페이지 컨텍스트에서 실행됨

(function() {
  'use strict';
  
  // console.log('[Injector] Main-world script loaded');
  
  // 전역 변수 초기화
  window.__precedentListData = [];
  window.__debugMode = true;  // 디버그 모드 활성화 (임시)
  
  // 디버깅 헬퍼 함수
  window.__debugGetPrecedentInfo = function(index) {
    if (window.__precedentListData && window.__precedentListData[index]) {
      return window.__precedentListData[index];
    }
    return null;
  };
  
  // fetch 패치
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // action.do 요청 감지
    if (args[0] && args[0].includes && args[0].includes('action.do')) {
      console.log('[Injector] Intercepted action.do request:', args[0]);
      
      // POST body 확인
      if (args[1] && args[1].body) {
        try {
          const bodyStr = typeof args[1].body === 'string' ? args[1].body : '';
          console.log('[Injector] Request body preview:', bodyStr.substring(0, 100));

          // 판례 목록 요청인지 확인 (ASIPDI002PR01 또는 유사 패턴)
          if (bodyStr.includes('ASIPDI002PR01') || bodyStr.includes('PRDC') || bodyStr.includes('precedent')) {
            console.log('[Injector] This is a precedent list request');
          }
          // 키워드 검색 요청인지 확인 (ASEISA001MR01)
          else if (bodyStr.includes('ASEISA001MR01') || bodyStr.includes('keyword')) {
            console.log('[Injector] This is a keyword search request');
          }
        } catch (e) {
          console.log('[Injector] Could not parse request body');
        }
      }
      
      // 응답 복제 및 파싱
      response.clone().text().then(text => {
        try {
          const jsonObj = JSON.parse(text);
          console.log('[Injector] Response data keys:', Object.keys(jsonObj.data || {}));

          // ASEISA001MR01 존재 여부 확인
          if (jsonObj.data && jsonObj.data.ASEISA001MR01) {
            console.log('[Injector] ✅ ASEISA001MR01 found!');
            console.log('[Injector] Structure check:', {
              hasSearchResultVO: !!jsonObj.data.ASEISA001MR01.searchResultVO,
              hasCollectionList: !!(jsonObj.data.ASEISA001MR01.searchResultVO && jsonObj.data.ASEISA001MR01.searchResultVO.collectionList),
              collectionListLength: jsonObj.data.ASEISA001MR01.searchResultVO?.collectionList?.length || 0
            });

            // 전체 구조 디버깅 (임시)
            if (window.__debugMode) {
              console.log('[Injector] Full ASEISA001MR01 structure:', jsonObj.data.ASEISA001MR01);
            }
          } else {
            console.log('[Injector] ⚠️ No ASEISA001MR01 in response');
          }
          
          // 다양한 응답 구조 처리
          let precedentList = null;

          // 구조 1: .body (기존 판례 목록)
          if (jsonObj.data && jsonObj.data.ASIPDI002PR01 && jsonObj.data.ASIPDI002PR01.body) {
            precedentList = jsonObj.data.ASIPDI002PR01.body;
            console.log('[Injector] Found precedent list in ASIPDI002PR01:', precedentList.length, 'items');
          }
          // 구조 2: 키워드 검색 API 응답 (ASEISA001MR01)
          else if (jsonObj.data && jsonObj.data.ASEISA001MR01) {
            console.log('[Injector] Found keyword search response ASEISA001MR01');
            const aseisa = jsonObj.data.ASEISA001MR01;
            const combinedList = [];

            // searchResultVO.collectionList 구조 처리
            if (aseisa.searchResultVO && aseisa.searchResultVO.collectionList) {
              console.log('[Injector] Found collectionList:', aseisa.searchResultVO.collectionList.length, 'collections');

              // 컬렉션 내용 디버그
              aseisa.searchResultVO.collectionList.forEach((col, idx) => {
                console.log(`[Injector] Collection ${idx}:`, {
                  nameKr: col.nameKr,
                  hasResultList: !!col.resultList,
                  resultListLength: col.resultList?.length || 0
                });
              });

              aseisa.searchResultVO.collectionList.forEach(collection => {
                // nameKr이 "질의" 또는 "판례"인 컬렉션만 처리
                if (collection.nameKr === '질의' || collection.nameKr === '판례') {
                  console.log(`[Injector] Processing ${collection.nameKr} collection:`,
                    collection.resultList ? collection.resultList.length : 0, 'items');

                  if (collection.resultList && Array.isArray(collection.resultList)) {
                    collection.resultList.forEach((item, idx) => {
                      if (item.DOCID) {
                        combinedList.push({
                          docId: String(item.DOCID).replace(/\D/g, ''),
                          caseNumber: item.searchNo || item.SEARCHNO || '',
                          title: item.title || item.TITLE || '',
                          date: item.date || item.DATE || '',
                          collectionType: collection.nameKr,
                          originalIndex: idx,
                          rawData: item
                        });
                      }
                    });
                  }
                }
              });
            }
            // 기존 body 구조도 폴백으로 지원 (호환성)
            else if (aseisa.body) {
              const searchBody = aseisa.body;

              // 질의 컬렉션
              if (searchBody['질의'] && searchBody['질의'].list) {
                console.log('[Injector] Processing 질의 (legacy):', searchBody['질의'].list.length, 'items');
                searchBody['질의'].list.forEach((item, idx) => {
                  if (item.docid || item.DOCID) {
                    combinedList.push({
                      docId: String(item.docid || item.DOCID).replace(/\D/g, ''),
                      caseNumber: item.searchNo || '',
                      title: item.title || '',
                      date: item.date || '',
                      collectionType: '질의',
                      originalIndex: idx,
                      rawData: item
                    });
                  }
                });
              }

              // 판례 컬렉션
              if (searchBody['판례'] && searchBody['판례'].list) {
                console.log('[Injector] Processing 판례 (legacy):', searchBody['판례'].list.length, 'items');
                searchBody['판례'].list.forEach((item, idx) => {
                  if (item.docid || item.DOCID) {
                    combinedList.push({
                      docId: String(item.docid || item.DOCID).replace(/\D/g, ''),
                      caseNumber: item.searchNo || '',
                      title: item.title || '',
                      date: item.date || '',
                      collectionType: '판례',
                      originalIndex: idx,
                      rawData: item
                    });
                  }
                });
              }
            }

            if (combinedList.length > 0) {
              precedentList = combinedList;
              console.log('[Injector] Combined list from search API:', precedentList.length, 'items');
            }
          }
          // 구조 3: 다른 가능한 키들 확인
          else if (jsonObj.data) {
            // data 객체의 모든 키 확인
            for (const key in jsonObj.data) {
              const value = jsonObj.data[key];
              if (value && value.body && Array.isArray(value.body)) {
                // body가 배열이고 판례 데이터 구조인지 확인
                if (value.body.length > 0 && (
                  value.body[0].DOC_ID ||
                  value.body[0].NTST_DCM_DSCM_CNTN ||
                  value.body[0].dcm
                )) {
                  precedentList = value.body;
                  console.log('[Injector] Found precedent list in', key, ':', precedentList.length, 'items');
                  break;
                }
              }
            }
          }
          
          if (precedentList) {
            
            // 데이터 정규화 및 저장
            window.__precedentListData = precedentList.map((item, index) => {
              // 이미 정규화된 검색 API 데이터인 경우
              if (item.collectionType) {
                return {
                  index: index,
                  docId: item.docId,
                  caseNumber: item.caseNumber,
                  title: item.title,
                  date: item.date,
                  collectionType: item.collectionType,
                  rawData: item.rawData
                };
              }

              // item이 중첩된 구조인 경우 처리
              const dcm = item.dcm || item;

              const normalizedItem = {
                index: index,
                docId: String(dcm.DOC_ID || '').replace(/\D/g, ''), // 숫자만 추출
                caseNumber: dcm.NTST_DCM_DSCM_CNTN || '', // 판례번호 필드
                title: dcm.TTL || '',
                date: dcm.DCM_RGT_DTM || '',
                rawData: dcm // 원본 데이터 보존
              };
              
              if (window.__debugMode && index < 3) {
                console.log('[Injector] Sample item:', normalizedItem);
              }
              
              return normalizedItem;
            });
            
            // Content script로 데이터 전송
            window.postMessage({
              type: 'MSG_PRECEDENT_LIST_SAVED',
              data: {
                list: window.__precedentListData,
                count: window.__precedentListData.length,
                timestamp: Date.now()
              }
            }, window.location.origin);
            
            console.log('[Injector] Precedent list saved and sent to bridge');
          }
        } catch (error) {
          console.error('[Injector] Error parsing response:', error);
        }
      }).catch(error => {
        console.error('[Injector] Error reading response:', error);
      });
    }
    
    return response;
  };
  
  // XMLHttpRequest 패치 (일부 사이트는 XHR 사용)
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._interceptUrl = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    if (this._interceptUrl && this._interceptUrl.includes('action.do')) {
      console.log('[Injector XHR] Intercepted action.do request:', this._interceptUrl);

      // 요청 body 확인
      if (args[0]) {
        console.log('[Injector XHR] Request body preview:', String(args[0]).substring(0, 100));
      }

      this.addEventListener('load', function() {
        try {
          const jsonObj = JSON.parse(this.responseText);
          console.log('[Injector XHR] Response data keys:', Object.keys(jsonObj.data || {}));

          // ASEISA001MR01 처리 (키워드 검색)
          if (jsonObj.data && jsonObj.data.ASEISA001MR01) {
            console.log('[Injector XHR] ✅ Found ASEISA001MR01 in XHR response!');
            const aseisa = jsonObj.data.ASEISA001MR01;

            if (aseisa.searchResultVO && aseisa.searchResultVO.collectionList) {
              const combinedList = [];

              aseisa.searchResultVO.collectionList.forEach(collection => {
                if (collection.nameKr === '질의' || collection.nameKr === '판례') {
                  console.log(`[Injector XHR] Processing ${collection.nameKr}:`,
                    collection.resultList ? collection.resultList.length : 0, 'items');

                  if (collection.resultList && Array.isArray(collection.resultList)) {
                    collection.resultList.forEach((item, idx) => {
                      if (item.DOCID) {
                        combinedList.push({
                          docId: String(item.DOCID).replace(/\D/g, ''),
                          caseNumber: item.searchNo || item.SEARCHNO || '',
                          title: item.title || item.TITLE || '',
                          date: item.date || item.DATE || '',
                          collectionType: collection.nameKr,
                          originalIndex: idx,
                          rawData: item
                        });
                      }
                    });
                  }
                }
              });

              if (combinedList.length > 0) {
                window.__precedentListData = combinedList;

                // Content script로 데이터 전송
                window.postMessage({
                  type: 'MSG_PRECEDENT_LIST_SAVED',
                  data: {
                    list: window.__precedentListData,
                    count: window.__precedentListData.length,
                    timestamp: Date.now()
                  }
                }, window.location.origin);

                console.log('[Injector XHR] ASEISA001MR01 data saved:', combinedList.length, 'items');
              }
            }
          }
          
          // ASIPDI002PR01.body에서 판례 목록 추출
          if (jsonObj.data && jsonObj.data.ASIPDI002PR01 && jsonObj.data.ASIPDI002PR01.body) {
            const precedentList = jsonObj.data.ASIPDI002PR01.body;
            console.log('[Injector XHR] Found precedent list:', precedentList.length, 'items');
            
            // 데이터 정규화 및 저장
            window.__precedentListData = precedentList.map((item, index) => {
              const dcm = item.dcm || item;
              
              return {
                index: index,
                docId: String(dcm.DOC_ID || '').replace(/\D/g, ''),
                caseNumber: dcm.NTST_DCM_DSCM_CNTN || '',
                title: dcm.TTL || '',
                date: dcm.DCM_RGT_DTM || '',
                rawData: dcm
              };
            });
            
            // Content script로 데이터 전송
            window.postMessage({
              type: 'MSG_PRECEDENT_LIST_SAVED',
              data: {
                list: window.__precedentListData,
                count: window.__precedentListData.length,
                timestamp: Date.now()
              }
            }, window.location.origin);
            
            console.log('[Injector XHR] Precedent list saved and sent to bridge');
          }
        } catch (error) {
          console.error('[Injector XHR] Error parsing response:', error);
        }
      });
    }
    
    return originalXHRSend.apply(this, args);
  };
  
  console.log('[Injector] Network interception ready');

  // 검색 페이지 DOM 변경 감지
  function observeSearchPageChanges() {
    // USEISA001M.do 페이지인지 확인
    if (!window.location.pathname.includes('USEISA001M.do')) {
      return;
    }

    console.log('[Injector] Keyword search page detected (USEISA001M.do)');

    // 판례 컬렉션 (data-collection-ul="precedent" 또는 data-namekr="판례")
    let precedentNode = document.querySelector('ul[data-collection-ul="precedent"]');
    if (!precedentNode) {
      const precedentSection = document.querySelector('div[data-namekr="판례"]');
      if (precedentSection) {
        precedentNode = precedentSection.querySelector('ul');
      }
    }

    if (precedentNode) {
      const observer = new MutationObserver(function(mutations) {
        // DOM 변경 감지 시 데이터 추출
        setTimeout(() => extractSearchPageData('precedent'), 300);
      });

      observer.observe(precedentNode, {
        childList: true,
        subtree: true
      });

      console.log('[Injector] Precedent collection observer installed');
    }

    // 질의 컬렉션 (data-collection-ul="query" 또는 data-namekr="질의")
    let queryNode = document.querySelector('ul[data-collection-ul="query"]');
    if (!queryNode) {
      const querySection = document.querySelector('div[data-namekr="질의"]');
      if (querySection) {
        queryNode = querySection.querySelector('ul');
      }
    }

    if (queryNode) {
      const observer = new MutationObserver(function(mutations) {
        // DOM 변경 감지 시 데이터 추출
        setTimeout(() => extractSearchPageData('query'), 300);
      });

      observer.observe(queryNode, {
        childList: true,
        subtree: true
      });

      console.log('[Injector] Query collection observer installed');
    }
  }

  // 검색 페이지 데이터 추출
  function extractSearchPageData(collectionType) {
    // 컬렉션 타입에 따라 선택자 결정
    let collectionUL = null;

    if (collectionType === 'query') {
      // 질의 컬렉션 찾기
      collectionUL = document.querySelector('ul[data-collection-ul="query"]');
      if (!collectionUL) {
        const querySection = document.querySelector('div[data-namekr="질의"]');
        if (querySection) {
          collectionUL = querySection.querySelector('ul');
        }
      }
    } else {
      // 판례 컬렉션 찾기
      collectionUL = document.querySelector('ul[data-collection-ul="precedent"]');
      if (!collectionUL) {
        const precedentSection = document.querySelector('div[data-namekr="판례"]');
        if (precedentSection) {
          collectionUL = precedentSection.querySelector('ul');
        }
      }
    }

    if (!collectionUL) {
      console.log(`[Injector] Could not find ${collectionType} collection UL`);
      return;
    }

    const listItems = collectionUL.querySelectorAll('li');
    const itemList = [];

    listItems.forEach((li, index) => {
      // 각 li에서 docId 추출
      const link = li.querySelector('a');
      let docId = null;
      let caseNumber = null;
      let title = null;

      if (link) {
        // onclick 속성에서 docId 추출 시도
        const onclickStr = link.getAttribute('onclick');
        if (onclickStr) {
          // onclick="fncDetailGoLink('200000000000014058')" 형식에서 추출
          const docIdMatch = onclickStr.match(/'(\d+)'/);
          if (docIdMatch) {
            docId = docIdMatch[1];
          }
        }

        // href 속성에서 docId 추출 시도
        if (!docId) {
          const href = link.getAttribute('href');
          if (href) {
            const docIdMatch = href.match(/ntstDcmId=(\d+)/);
            if (docIdMatch) {
              docId = docIdMatch[1];
            }
          }
        }

        // 제목 추출
        const titleElement = link.querySelector('.tit');
        if (titleElement) {
          title = titleElement.textContent.trim();
        } else {
          title = link.textContent.trim();
        }
      }

      // 번호 추출 (판례번호 또는 질의번호)
      const numberElement = li.querySelector('.num');
      if (numberElement) {
        caseNumber = numberElement.textContent.trim();
      }

      if (docId) {
        itemList.push({
          index: index,
          docId: String(docId).replace(/\D/g, ''), // 숫자만 추출
          caseNumber: caseNumber || '',
          title: title || '',
          date: '',
          collectionType: collectionType === 'query' ? '질의' : '판례',
          rawData: { pageType: 'search', collection: collectionType }
        });
      }
    });

    if (itemList.length > 0) {
      console.log(`[Injector] ${collectionType} data extracted:`, itemList.length, 'items');

      // 기존 데이터와 병합 또는 새로 설정
      if (!window.__precedentListData) {
        window.__precedentListData = [];
      }

      // 같은 컬렉션의 기존 데이터 제거
      window.__precedentListData = window.__precedentListData.filter(
        item => item.collectionType !== (collectionType === 'query' ? '질의' : '판례')
      );

      // 새 데이터 추가
      window.__precedentListData = window.__precedentListData.concat(itemList);

      // 인덱스 재정렬
      window.__precedentListData.forEach((item, idx) => {
        item.index = idx;
      });

      // Content script로 데이터 전송
      window.postMessage({
        type: 'MSG_PRECEDENT_LIST_SAVED',
        data: {
          list: window.__precedentListData,
          count: window.__precedentListData.length,
          timestamp: Date.now(),
          pageType: 'search'
        }
      }, window.location.origin);
    }
  }

  // 메시지 리스너 추가 - Bridge에서의 요청 처리
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;

    const { type } = event.data || {};

    if (type === 'MSG_REQUEST_PRECEDENT_LIST') {
      // Bridge에서 요청한 판례 목록 데이터 전송
      if (window.__precedentListData && window.__precedentListData.length > 0) {
        window.postMessage({
          type: 'MSG_PRECEDENT_LIST_SAVED',
          data: {
            list: window.__precedentListData,
            count: window.__precedentListData.length,
            timestamp: Date.now()
          }
        }, window.location.origin);
        console.log('[Injector] Sent precedent list to bridge:', window.__precedentListData.length, 'items');
      } else {
        console.log('[Injector] No precedent list data available');
      }
    }
  });

  // 페이지 로드 시 검색 페이지 확인
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      observeSearchPageChanges();
      // 초기 데이터 추출
      if (window.location.pathname.includes('USEISA001M.do')) {
        setTimeout(() => {
          extractSearchPageData('precedent');
          extractSearchPageData('query');
        }, 1000);
      }
    });
  } else {
    observeSearchPageChanges();
    // 초기 데이터 추출
    if (window.location.pathname.includes('USEISA001M.do')) {
      setTimeout(() => {
        extractSearchPageData('precedent');
        extractSearchPageData('query');
      }, 1000);
    }
  }
})();