# Chrome Extension 백엔드 서버 연동 가이드

## 🚀 빠른 시작

### 1. 백엔드 서버 실행
```bash
# 백엔드 디렉토리로 이동
cd D:\PythonProject\llm\taxlaw_backend

# .env 파일에 OpenAI API 키 설정
# OPENAI_API_KEY=sk-your-api-key-here

# 서버 실행
npm run dev
```

### 2. Chrome Extension 파일 교체
```bash
# 기존 menus.js 백업
copy D:\PythonProject\llm\taxlaw_extension\background\menus.js D:\PythonProject\llm\taxlaw_extension\background\menus_backup.js

# 새 버전으로 교체
copy D:\PythonProject\llm\taxlaw_extension\background\menus_updated.js D:\PythonProject\llm\taxlaw_extension\background\menus.js
```

### 3. Chrome Extension 다시 로드
1. Chrome 브라우저에서 `chrome://extensions/` 열기
2. Tax Law Extension 찾기
3. "새로고침" 버튼 클릭

## 📝 작동 방식

### 기존 방식 (보안 취약)
```
사용자 → Extension → OpenAI API (API 키 노출 위험)
```

### 새로운 방식 (보안 강화)
```
사용자 → Extension → 백엔드 서버 → OpenAI API
                    (API 키는 서버에서만 관리)
```

## 🔧 주요 변경사항

### 1. `background/menus.js`
- **제거**: OpenAI API 키 직접 관리
- **추가**: 백엔드 서버 URL 설정
- **수정**: `callOpenAI` 함수가 백엔드 서버로 요청

### 2. API 호출 변경
```javascript
// 이전 (직접 호출)
fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
});

// 현재 (백엔드 경유)
fetch('http://localhost:3000/api/llm/call', {
  headers: { 'X-Extension-Id': chrome.runtime.id }
});
```

## 🎯 사용 방법

1. **백엔드 서버가 실행 중인지 확인**
   - http://localhost:3000/api/health 접속
   - `"status": "healthy"` 확인

2. **taxlaw.nts.go.kr 사이트 방문**
   - 판례 상세 페이지로 이동

3. **우클릭 메뉴 사용**
   - 페이지에서 우클릭
   - "AI로 판례 요약하기" 클릭

4. **결과 확인**
   - 요약 결과가 Extension 팝업으로 표시됨

## ⚠️ 주의사항

### 백엔드 서버 관련
- 서버가 실행 중이어야 Extension이 작동합니다
- 기본 포트는 3000입니다 (변경 시 Extension 코드도 수정 필요)
- `.env` 파일에 올바른 OpenAI API 키가 설정되어 있어야 합니다

### Extension 관련
- Extension을 수정한 후 반드시 "새로고침"을 해야 합니다
- 개발자 모드가 활성화되어 있어야 합니다

### 보안 관련
- API 키는 절대 Extension 코드에 포함시키지 마세요
- 백엔드 서버의 `.env` 파일은 git에 커밋하지 마세요

## 🐛 문제 해결

### "백엔드 서버에 연결할 수 없습니다" 에러
1. 백엔드 서버가 실행 중인지 확인
2. 포트 3000이 사용 가능한지 확인
3. Windows 방화벽 설정 확인

### CORS 에러
1. Extension ID가 올바른지 확인
2. 백엔드 서버의 CORS 설정 확인

### API 호출 실패
1. `.env` 파일의 OpenAI API 키 확인
2. API 키의 사용량 제한 확인
3. 백엔드 서버 로그 확인

## 📊 로그 확인

### Extension 로그
1. Chrome DevTools 열기 (F12)
2. Extension 페이지에서 "서비스 워커" 클릭
3. Console 탭에서 로그 확인

### 백엔드 서버 로그
```bash
# 서버 실행 터미널에서 직접 확인
# [Server], [OpenAIService], [LLMController] 태그로 구분됨
```

## 🚀 프로덕션 배포

### Vercel 배포 시
1. `menus.js`의 `BACKEND_URL` 변경:
```javascript
// const BACKEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'https://your-app.vercel.app';
```

2. Vercel 환경변수 설정:
   - `OPENAI_API_KEY` 추가
   - `NODE_ENV=production` 설정

3. Extension 재패키징 및 배포

## 📝 테스트 체크리스트

- [ ] 백엔드 서버 health check 정상
- [ ] Extension에서 "AI로 판례 요약하기" 메뉴 표시
- [ ] 판례 요약 요청 시 백엔드 서버 로그 확인
- [ ] 요약 결과가 Extension에 정상 표시
- [ ] 에러 발생 시 적절한 에러 메시지 표시

## 🔄 원래 버전으로 되돌리기

```bash
# 백업한 파일로 복원
copy D:\PythonProject\llm\taxlaw_extension\background\menus_backup.js D:\PythonProject\llm\taxlaw_extension\background\menus.js

# Extension 새로고침
```