# Chrome Extension 설계 - 국세법령정보시스템 판례 요약 도우미 (완성된 구현 포함)

## 개요
국세법령정보시스템(https://taxlaw.nts.go.kr)에서 판례 목록을 볼 때, 우클릭 메뉴를 통해 특정 판례의 doc_id를 추출하여 사이드 패널에 표시하는 Chrome Extension

## 핵심 기능
1. 사용자가 판례 항목에서 우클릭 → "요약하기" 메뉴 클릭
2. 해당 판례의 doc_id를 추출하여 사이드 패널에 표시
3. 추출 우선순위: rowIndex 매칭 → 판례번호 매칭 → URL 파라미터 폴백

## 아키텍처 (Chrome Extension Manifest V3)

### 1. 전체 구조
```
taxlawExtension/
├── manifest.json           # MV3 설정
├── background/
│   └── menus.js           # 컨텍스트 메뉴 관리
├── content/
│   ├── injector.js        # Main-world 스크립트 (네트워크 인터셉트)
│   ├── bridge.js          # 메시지 라우팅 및 상태 관리
│   ├── capture.js         # 우클릭 이벤트 캡처
│   └── panel.view.js      # 사이드 패널 UI
└── lib/
    ├── network-id.js      # 네트워크 요청 판별 로직
    └── docid-utils.js     # doc_id 정규화 유틸리티
```

### 2. manifest.json - CSP 우회 설정
```json
{
  "manifest_version": 3,
  "name": "Tax Law Extension",
  "version": "1.0.0",
  "permissions": ["contextMenus", "activeTab", "storage"],
  "host_permissions": ["https://taxlaw.nts.go.kr/*"],
  "background": {
    "service_worker": "background/menus.js"
  },
  "content_scripts": [
    {
      "matches": ["https://taxlaw.nts.go.kr/*"],
      "js": [
        "lib/network-id.js",
        "lib/docid-utils.js",
        "content/capture.js",
        "content/bridge.js",
        "content/panel.view.js"
      ],
      "run_at": "document_start"
    },
    {
      "matches": ["https://taxlaw.nts.go.kr/*"],
      "js": ["content/injector.js"],
      "run_at": "document_start",
      "world": "MAIN",  // ⭐ CSP 우회 핵심 설정
      "all_frames": false
    }
  ]
}
```

## 구현 상세

### 1. 데이터 구조 및 DOM 분석

#### 판례 목록 HTML 구조
```html
<ul id="bdltCtl">
  <li>
    <div>
      <div>
        <ul>
          <li><strong>조심-2025-중-2139</strong></li>  <!-- 판례번호 -->
          <li><span>2025.09.08</span></li>             <!-- 날짜 -->
        </ul>
        <a><strong>제목 내용...</strong></a>           <!-- 제목 -->
      </div>
    </div>
  </li>
  <!-- 더 많은 li 항목들... -->
</ul>
```

#### API 응답 구조
```json
{
  "data": {
    "ASIPDI002PR01": {
      "body": [
        {
          "DOC_ID": "123456789012",
          "NTST_DCM_DSCM_CNTN": "조심-2025-중-2139",  // 판례번호 필드
          "TTL": "제목...",
          "DCM_RGT_DTM": "2025.09.08"
        }
        // ... 50개 항목
      ]
    }
  }
}
```

### 2. 핵심 구현 로직

#### capture.js - 우클릭 정보 캡처
```javascript
document.addEventListener('contextmenu', function(event) {
  let target = event.target;
  let precedentInfo = {};
  
  // bdltCtl 구조에서 LI 찾기
  const closestLI = target.closest('#bdltCtl > li');
  if (closestLI) {
    // rowIndex 저장 (가장 중요!)
    const allLIs = Array.from(document.getElementById('bdltCtl').children);
    precedentInfo.rowIndex = allLIs.indexOf(closestLI);
    
    // 판례번호 추출
    const caseNumberElement = closestLI.querySelector(
      'div:first-child > div:first-child > ul > li:first-child > strong'
    );
    if (caseNumberElement) {
      precedentInfo.caseNumber = caseNumberElement.textContent.trim();
    }
    
    // 날짜 추출
    const dateElement = closestLI.querySelector(
      'div:first-child > div:first-child > ul > li:nth-child(2) > span'
    );
    if (dateElement) {
      precedentInfo.registrationDate = dateElement.textContent.trim();
    }
  }
  
  window.__lastClickedPrecedentInfo = precedentInfo;
});
```

#### injector.js - 네트워크 응답 인터셉트 (Main-world)
```javascript
// fetch 패치
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  
  if (args[0].includes('action.do')) {
    response.clone().text().then(text => {
      const jsonObj = JSON.parse(text);
      
      // ASIPDI002PR01.body에서 판례 목록 추출
      if (jsonObj.data?.ASIPDI002PR01?.body) {
        const precedentList = jsonObj.data.ASIPDI002PR01.body;
        
        // 데이터 정규화
        window.__precedentListData = precedentList.map((item, index) => {
          const dcm = item.dcm || item;
          return {
            index: index,
            docId: String(dcm.DOC_ID || '').replace(/\D/g, ''),
            caseNumber: dcm.NTST_DCM_DSCM_CNTN || '',  // 판례번호 필드
            title: dcm.TTL || '',
            date: dcm.DCM_RGT_DTM || ''
          };
        });
        
        // bridge.js로 데이터 전송
        window.postMessage({
          type: 'MSG_PRECEDENT_LIST_SAVED',
          data: {
            list: window.__precedentListData,
            count: window.__precedentListData.length
          }
        }, window.location.origin);
      }
    });
  }
  
  return response;
};
```

#### bridge.js - 메시지 라우팅 및 매칭 로직
```javascript
// 저장된 판례 목록
let savedPrecedentList = [];

// Main-world로부터 메시지 수신
window.addEventListener('message', async (event) => {
  if (event.origin !== window.location.origin) return;
  
  const { type, data } = event.data || {};
  
  if (type === 'MSG_PRECEDENT_LIST_SAVED') {
    if (data && data.list) {
      savedPrecedentList = data.list;
      console.log('[Bridge] Saved precedent list:', savedPrecedentList.length);
    }
  }
});

// Background script로부터 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'MSG_ARM_CAPTURE') {
    const clickedInfo = window.__lastClickedPrecedentInfo;
    let matchedDocId = null;
    
    // rowIndex 매칭 (최우선)
    if (clickedInfo && savedPrecedentList.length > 0) {
      if (clickedInfo.rowIndex >= 0 && savedPrecedentList[clickedInfo.rowIndex]) {
        const matchedItem = savedPrecedentList[clickedInfo.rowIndex];
        matchedDocId = matchedItem.docId;
        console.log('[Bridge] ✅ Matched by index:', {
          rowIndex: clickedInfo.rowIndex,
          docId: matchedDocId
        });
      }
    }
    
    // 매칭 성공 시 패널 열기
    if (matchedDocId) {
      window.postMessage({
        type: 'MSG_OPEN_PANEL',
        data: { docId: matchedDocId }
      }, window.location.origin);
    }
    
    sendResponse({ success: true, docId: matchedDocId });
  }
  return false;
});
```

### 3. 핵심 해결 방법

#### CSP(Content Security Policy) 우회
- **문제**: 동적 스크립트 주입이 CSP에 의해 차단됨
- **해결**: manifest.json에서 `"world": "MAIN"` 설정 사용
- Chrome이 자동으로 main-world에 스크립트를 주입하여 CSP 우회

#### rowIndex 기반 매칭
- **핵심**: 우클릭한 LI 요소의 인덱스와 API 응답 배열의 인덱스가 일치
- **장점**: 판례번호 파싱 없이 직접 인덱스로 접근 가능
- **구현**: 
  ```javascript
  precedentInfo.rowIndex = allLIs.indexOf(closestLI);
  // ...
  const matchedItem = savedPrecedentList[clickedInfo.rowIndex];
  ```

#### 메시지 통신 구조
```
Main-world (injector.js)
    ↓ postMessage
Content-script (bridge.js)
    ↓ chrome.runtime.sendMessage
Background (menus.js)
    ↓ chrome.tabs.sendMessage
Content-script (bridge.js)
    ↓ postMessage
Panel UI (panel.view.js)
```

### 4. 데이터 흐름
1. **페이지 로드** → injector.js가 fetch/XHR 패치
2. **API 응답** → 판례 목록 50개 추출 및 저장
3. **우클릭** → capture.js가 LI 인덱스 및 정보 캡처
4. **메뉴 클릭** → background가 ARM 신호 전송
5. **매칭** → bridge.js가 rowIndex로 doc_id 찾기
6. **표시** → panel.view.js가 사이드 패널에 doc_id 표시

### 5. 주요 개선 사항
- CSP 우회를 위한 "world": "MAIN" 설정
- rowIndex 우선 매칭으로 정확도 향상
- 전역 변수 대신 postMessage로 안전한 데이터 전달
- 시간 윈도우(5초) 내에서만 캡처 활성화

## 테스트 시나리오
1. 국세법령정보시스템 판례 목록 페이지 접속
2. 판례 항목에서 우클릭 → "요약하기" 클릭
3. 사이드 패널에 doc_id 표시 확인
4. 다른 판례 항목에서 반복 테스트

## 디버깅 도구
```javascript
// 콘솔에서 실행
window.__debugGetPrecedentInfo(0);  // 첫 번째 항목 정보
window.__precedentListData;          // 저장된 판례 목록
window.__lastClickedPrecedentInfo;   // 마지막 클릭 정보
```