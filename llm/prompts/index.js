// 프롬프트 로더 - 모든 프롬프트를 관리하고 적절한 프롬프트를 선택

(function() {
  'use strict';

  // 프롬프트 파일들을 동적으로 로드
  const loadPrompts = async function() {
    const prompts = {};

    try {
      // Chrome Extension의 경우 스크립트를 직접 실행해서 전역 변수에서 가져옴
      if (window.DEFAULT_PROMPT) {
        prompts.default = window.DEFAULT_PROMPT;
      }

      if (window.SIMPAN_PROMPT) {
        prompts.simpan = window.SIMPAN_PROMPT;
      }

      if (window.SIMSA_PROMPT) {
        prompts.simsa = window.SIMSA_PROMPT;
      }

      // 나중에 추가될 프롬프트들
      // if (window.EUI_PROMPT) prompts.eui = window.EUI_PROMPT;
      // if (window.JEOKBU_PROMPT) prompts.jeokbu = window.JEOKBU_PROMPT;
      // if (window.PANRYE_PROMPT) prompts.panrye = window.PANRYE_PROMPT;

    } catch (error) {
      console.error('[Prompt Loader] Error loading prompts:', error);
    }

    return prompts;
  };

  // caseType에 따라 적절한 프롬프트 선택
  const selectPrompt = function(caseType, loadedPrompts) {
    // caseType 매핑 테이블
    const promptMapping = {
      '심판': 'simpan',
      '심사': 'simsa',  // 심사청구 전용 프롬프트
      '이의': 'simsa',  // 이의신청도 심사청구 프롬프트 사용
      '적부': 'default',  // 나중에 'jeokbu'로 변경 가능
      '헌재': 'default',
      '판례': 'default',  // 나중에 'panrye'로 변경 가능
      '종소': 'default',
      '질의': 'default'
    };

    const promptKey = promptMapping[caseType] || 'default';
    const selectedPrompt = loadedPrompts[promptKey] || loadedPrompts.default;

    console.log(`[Prompt Loader] Case type: ${caseType}, Using prompt: ${promptKey}`);

    return selectedPrompt;
  };

  // 프롬프트 가져오기 함수
  const getPrompt = async function(caseType) {
    const prompts = await loadPrompts();
    return selectPrompt(caseType, prompts);
  };

  // 모든 프롬프트 목록 반환
  const getAllPrompts = async function() {
    return await loadPrompts();
  };

  // 프롬프트 추가/업데이트 함수
  const addPrompt = function(name, prompt) {
    // 전역 변수로 저장
    window[`${name.toUpperCase()}_PROMPT`] = prompt;
    console.log(`[Prompt Loader] Added/Updated prompt: ${name}`);
  };

  // 전역 객체에 노출
  window.PromptLoader = {
    loadPrompts,
    selectPrompt,
    getPrompt,
    getAllPrompts,
    addPrompt
  };

  console.log('[Prompt Loader] Ready');
})();