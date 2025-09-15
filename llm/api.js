// LLM API 호출 모듈

(function() {
  'use strict';

  // Module loaded - 운영 환경에서는 console.log 제거

  // API 설정은 background script에서 관리
  // 직접 호출하지 않고 메시지를 통해 위임

  // 프롬프트 템플릿
  const PROMPTS = {
    summarize: {
      system: `너는 판결문 요약 보조자다. 아래 규칙을 지켜라.

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
5) '주문'은 요약의 앵커로 삼되 스코어링에는 포함하지 않는다.`,
      user: `[사용자 입력]
판례 정보:
- 유형: {caseType} 
- 제목: {title}
- 판례번호: {caseNumber}

주문:
{jumun}

요약이 필요한 부분:
{reasonContent}

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
제한: 전체 600~800자`
    },
    analyze: {
      system: '당신은 법률 전문가입니다. 판례의 법적 쟁점을 분석합니다.',
      user: `다음 판례의 법적 쟁점을 분석해주세요:

{content}

분석 내용:
1. 주요 법적 쟁점
2. 적용된 법리
3. 판단 기준
4. 실무적 시사점`
    }
  };

  // LLM API 호출 함수 - background script로 위임
  async function callLLM(content, promptType = 'summarize', provider = 'openai') {
    // 프롬프트 생성
    const prompt = PROMPTS[promptType];
    const userMessage = formatPrompt(prompt.user, content);

    // background script로 메시지 전송
    const payload = {
      model: 'gpt-4o-mini',  // GPT-4o-mini 모델 사용
      messages: [  // OpenAI API는 messages 형식 사용
        { role: 'system', content: prompt.system },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 2000,  // OpenAI는 max_tokens 사용
      temperature: 0.2,
      stream: false  // 일단 스트리밍 비활성화 (안정성)
    };

    // 요청 식별자 생성 (동시 요청 구분용)
    const reqId = crypto.randomUUID?.() || String(Date.now()) + '_' + Math.random();

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ topic: 'llm:call', reqId, payload }, (response) => {
        // Chrome runtime 에러 체크
        if (chrome.runtime.lastError) {
          console.error('[LLM API] Chrome runtime error:', chrome.runtime.lastError);
          return resolve({
            success: false,
            error: 'Extension error: ' + chrome.runtime.lastError.message
          });
        }

        // 응답 처리
        if (!response || !response.ok) {
          return resolve({
            success: false,
            error: response?.error || 'Background call failed'
          });
        }

        resolve({
          success: true,
          result: response.text,
          usage: response.usage
        });
      });
    });
  }

  // 프롬프트 포맷팅 함수
  function formatPrompt(template, content) {
    let formatted = template;

    // 기본 정보 치환
    if (content.caseType) {
      formatted = formatted.replace('{caseType}', content.caseType);
    }
    if (content.title) {
      formatted = formatted.replace('{title}', content.title);
    }
    if (content.caseNumber) {
      formatted = formatted.replace('{caseNumber}', content.caseNumber);
    }
    if (content.jumun) {
      formatted = formatted.replace('{jumun}', content.jumun);
    }

    // 이유 섹션 처리
    if (content.reasonUnits && content.reasonUnits.length > 0) {
      // 특정 단위만 선택하거나 전체 사용
      const reasonContent = content.reasonUnits
        .map(unit => `${unit.number}. ${unit.title}\n${unit.content}`)
        .join('\n\n');
      formatted = formatted.replace('{reasonContent}', reasonContent);
    } else if (content.reason) {
      formatted = formatted.replace('{reasonContent}', content.reason);
    }

    // 전체 내용
    if (content.formatted) {
      formatted = formatted.replace('{content}', content.formatted);
    }

    return formatted;
  }

  // 판례 요약 함수
  async function summarizePrecedent(processedContent, options = {}) {
    // console.log 제거 - 운영 환경에서 불필요한 로깅 방지

    // 옵션 설정
    const {
      provider = 'openai',
      promptType = 'summarize',
      specificUnits = null  // 특정 단위만 요약하려면 인덱스 배열 전달
    } = options;

    // 특정 단위만 선택
    let contentToSummarize = { ...processedContent };
    if (specificUnits && Array.isArray(specificUnits)) {
      contentToSummarize.reasonUnits = processedContent.reasonUnits.filter(
        (unit, index) => specificUnits.includes(index)
      );
    }

    // LLM 호출
    const result = await callLLM(contentToSummarize, promptType, provider);

    return result;
  }

  // 전역 객체에 노출
  window.LLMApi = {
    callLLM: callLLM,
    summarizePrecedent: summarizePrecedent,
    setApiKey: function(apiKey) {
      // background script로 API 키 설정 위임
      chrome.runtime.sendMessage({ topic: 'llm:setApiKey', apiKey }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[LLM API] Failed to set API key:', chrome.runtime.lastError);
        } else if (response?.ok) {
          console.log('[LLM API] API key set successfully');
        }
      });
    },
    addPromptTemplate: function(name, template) {
      PROMPTS[name] = template;
      // Prompt template added
    }
  };

  // Module ready - 운영 환경에서는 console.log 제거
})();