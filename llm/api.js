// LLM API 호출 모듈

(function() {
  'use strict';

  // Module loaded - 운영 환경에서는 console.log 제거

  // API 설정은 background script에서 관리
  // 직접 호출하지 않고 메시지를 통해 위임

  // 프롬프트 템플릿
  const PROMPTS = {
    summarize: {
      system: `너는 판결문 요약 보조자다. 아래 규칙을 반드시 엄격하게 지켜라.

[출력 포맷 고정 규칙] ★최우선 준수사항★
- 섹션 제목은 아래 정확한 문자열과 콜론(:)을 사용한다. 이모지/숫자/괄호 머리글 절대 금지.
  * "이 사건 간단 압축 요약" (콜론 없음, 하위 항목은 - 로 시작)
  * "쟁점:"
  * "주요 사실:"
  * "법리 요지:"
  * "구체 판단:"
  * "결론/주문:"
- 모든 섹션을 반드시 출력한다. 내용이 없으면 "- 없음" 명시(섹션 자체 생략 금지).
- 각 섹션의 내용은 "- "로 시작하는 불릿 포인트로 작성한다.
- 이모지, 숫자 머리글(1), 2), 3)), 마크다운 헤더(#, ##) 사용 금지.

[문단 인식 규칙]
- 머리표시(1., 2., 가., 나., 1), 2), 가), 나))는 '제목행'으로 분류한다.
- 제목행은 바로 뒤 본문과 결합해 하나의 문단으로 간주한다(단독이면 스코어 0).
- '주문/청구취지/항소취지/이유/판단/결론' 같은 섹션 제목은 앵커로만 사용, 스코어링 제외.
- 한 줄짜리라도 금액·일시·등기·송금·결론 연결어가 포함된 완결 문장이면 본문으로 인정.
- 본문 내 가)나)다) 열거는 하위 서브문단으로 인식해 각각 1문장 요약 후 합친다.

[인과·증거 강화 규칙]
- 반드시 Why→How→What(원인→과정/증거→결과) 구조로 '구체 판단'을 작성한다.
- 시간순 흐름이 중요한 경우 날짜를 명시한다.
- '구체 판단' 각 불릿은 다음 요소를 포함: 원인, 증거(금액/일자/증빙), 법리(조문/판례 번호), 판단, 결과
- 반론이 있으면 '구체 판단' 섹션 내에서 언급한다.
- 가능하면 content.reasonUnits의 unit.number를 이용해 (근거: 문단 n, m) 표기.

[중요도 선별 규칙]
1) 문단들에 내부적으로 중요도 점수(0~5)를 매겨 상위 K개만 사용한다(K=7를 기본으로, 필요시 6~8 조정).
   - 가중치+: 금액·일시·등기·송금, 자금흐름, 결론 연결어(따라서/그러나/결국/… 판단한다), 항변 인용/배척, 조문·판례 번호
   - 가중치-: 원론적 법리 서설, 증거목록/호증 나열
2) 상위 문단만 근거로 OUTPUT을 작성한다.
3) 숫자·날짜·법적 효과(피보전채권/증여/사해/선의 항변 배척 등)는 반드시 남긴다.
4) 한국어로, 불필요한 수식어 금지. 과도한 일반론·모호어 사용 금지.
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

[OUTPUT 형식 - 아래 구조를 정확히 지켜서 출력]

이 사건 간단 압축 요약
- (첫 번째 핵심 내용, 80~120자)
- (두 번째 핵심 내용, 80~120자)
- (세 번째 핵심 내용, 80~120자)

쟁점:
- (첫 번째 쟁점)
- (두 번째 쟁점)
- (세 번째 쟁점, 필요시)

주요 사실:
- (중요 사실 1, 금액/일시 포함)
- (중요 사실 2)
- (중요 사실 3)
- (중요 사실 4, 필요시)
- (중요 사실 5, 필요시)

법리 요지:
- (적용 법리 1, 조문/판례 번호)
- (적용 법리 2)
- (적용 법리 3)
- (적용 법리 4, 필요시)

구체 판단:
- (판단 1: 원인→증거→법리→결과 포함)
- (판단 2)
- (판단 3)
- (판단 4, 필요시)
- (판단 5, 필요시)

결론/주문:
- (최종 판결 내용)
- (세액/이자/기산점 등)
- (기타 중요 결정사항, 필요시)

제한: 총 1,300~1,600자. 모든 섹션 필수 출력(내용 없으면 "- 없음" 명시)`
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

    // 실제 전달되는 프롬프트 확인용 로그
    console.log('[LLM API] Using prompt type:', promptType);
    console.log('===== SYSTEM PROMPT FULL CONTENT START =====');
    console.log(prompt.system);  // 별도 줄로 출력하면 Chrome이 자르지 않음
    console.log('===== SYSTEM PROMPT FULL CONTENT END =====');
    console.log(`[LLM API] System prompt length: ${prompt.system.length} characters`);
    console.log(`[LLM API] User message length: ${userMessage.length} characters`);
    console.log('[LLM API] User message preview (first 500 chars):', userMessage.substring(0, 500) + '...');

    // 프롬프트 섹션별 길이 확인 (디버깅용)
    const sections = prompt.system.split('\n\n');
    console.log(`[LLM API] System prompt has ${sections.length} sections:`);
    sections.forEach((section, idx) => {
      const title = section.split('\n')[0].substring(0, 30);
      console.log(`  - Section ${idx + 1}: "${title}..." (${section.length} chars)`);
    });

    // background script로 메시지 전송
    const payload = {
      model: 'gpt-4o-mini',  // GPT-4o-mini 모델 사용
      messages: [  // OpenAI API는 messages 형식 사용
        { role: 'system', content: prompt.system },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 2300,  // 더 긴 응답을 위해 2300으로 증가
      temperature: 0.2,  // 일관된 포맷 준수를 위해 0.2로 낮춤
      top_p: 0.9,
      stream: false  // 일단 스트리밍 비활성화 (안정성)
    };

    // 요청 식별자 생성 (동시 요청 구분용)
    const reqId = crypto.randomUUID?.() || String(Date.now()) + '_' + Math.random();

    // 전송할 payload 로깅
    console.log('[LLM API] Sending payload to background:', {
      model: payload.model,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
      messagesCount: payload.messages.length
    });

    return new Promise((resolve) => {
      // Chrome extension context 확인
      if (!chrome.runtime?.id) {
        console.error('[LLM API] Extension context invalidated');
        return resolve({
          success: false,
          error: 'Extension context invalidated. Please refresh the page.'
        });
      }

      try {
        chrome.runtime.sendMessage({ topic: 'llm:call', reqId, payload }, (response) => {
          // Chrome runtime 에러 체크
          if (chrome.runtime.lastError) {
            console.error('[LLM API] Chrome runtime error:', chrome.runtime.lastError);

            // 특정 에러는 더 친화적인 메시지로 변환
            let errorMessage = chrome.runtime.lastError.message;
            if (errorMessage.includes('Receiving end does not exist')) {
              errorMessage = 'Extension is loading. Please try again in a moment.';
            } else if (errorMessage.includes('Extension context invalidated')) {
              errorMessage = 'Extension was updated. Please refresh the page.';
            }

            return resolve({
              success: false,
              error: errorMessage
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
      } catch (error) {
        console.error('[LLM API] Unexpected error:', error);
        return resolve({
          success: false,
          error: 'Failed to connect to extension: ' + error.message
        });
      }
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
      // Chrome extension context 확인
      if (!chrome.runtime?.id) {
        console.error('[LLM API] Cannot set API key: Extension context invalidated');
        return;
      }

      // background script로 API 키 설정 위임
      try {
        chrome.runtime.sendMessage({ topic: 'llm:setApiKey', apiKey }, (response) => {
          if (chrome.runtime.lastError) {
            // "Receiving end does not exist" 에러는 무시 (extension이 로딩 중일 수 있음)
            if (!chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
              console.error('[LLM API] Failed to set API key:', chrome.runtime.lastError);
            }
          } else if (response?.ok) {
            console.log('[LLM API] API key set successfully');
          }
        });
      } catch (error) {
        console.error('[LLM API] Error setting API key:', error);
      }
    },
    addPromptTemplate: function(name, template) {
      PROMPTS[name] = template;
      // Prompt template added
    }
  };

  // Module ready - 운영 환경에서는 console.log 제거
})();