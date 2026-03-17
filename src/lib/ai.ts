// 범용 AI API 인터페이스 - 어떤 LLM이든 API URL + Key로 사용 가능

export interface AIConfig {
  provider: 'openai' | 'claude' | 'custom';
  apiUrl: string;
  apiKey: string;
  model: string;
}

const STORAGE_KEY = 'skct-ai-config';

const PROVIDER_DEFAULTS: Record<string, { url: string; model: string }> = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  claude: { url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514' },
  custom: { url: '', model: '' },
};

export function loadAIConfig(): AIConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getProviderDefaults(provider: string) {
  return PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.custom;
}

const SYSTEM_PROMPT = `당신은 SKCT(SK 종합역량검사) 인지검사 문제 출제 전문가입니다.
주어진 텍스트를 기반으로 SKCT 스타일의 문제를 생성합니다.

문제는 반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트를 포함하지 마세요:
[
  {
    "section": "language|data-analysis|math|logic|sequence",
    "type": "유형명",
    "passage": "지문 (필요시)",
    "question": "문제 텍스트",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
    "answer": "정답 선택지 텍스트 (options에 있는 값과 정확히 동일하게)",
    "explanation": "해설",
    "difficulty": 1
  }
]

중요: answer는 인덱스 번호가 아니라, options 배열에 있는 정답 선택지의 텍스트를 그대로 적으세요.

영역별 특징:
- language(언어이해): 지문 기반 독해, 중심내용/세부내용/구조/비판
- data-analysis(자료해석): 표/그래프 데이터 해석, 계산, 추론
- math(창의수리): 수학 응용문제 (속력, 농도, 일의 양, 경우의 수 등)
- logic(언어추리): 명제, 조건 추리 (순서/위치/참거짓)
- sequence(수열추리): 수열 규칙 파악`;

async function callOpenAI(config: AIConfig, userMessage: string): Promise<string> {
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callClaude(config: AIConfig, userMessage: string): Promise<string> {
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function callCustom(config: AIConfig, userMessage: string): Promise<string> {
  // OpenAI-compatible API format (most providers support this)
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });
  const data = await res.json();
  // Try multiple response formats
  return data.choices?.[0]?.message?.content || data.content?.[0]?.text || data.response || '';
}

export async function generateQuestions(config: AIConfig, text: string, section?: string, count: number = 5): Promise<unknown[]> {
  const sectionHint = section ? `\n영역: ${section}에 해당하는 문제만 생성하세요.` : '';
  const userMessage = `아래 텍스트를 기반으로 SKCT 스타일 문제를 ${count}개 생성하세요.${sectionHint}\n\n---\n${text.slice(0, 8000)}`;

  let response: string;
  switch (config.provider) {
    case 'openai': response = await callOpenAI(config, userMessage); break;
    case 'claude': response = await callClaude(config, userMessage); break;
    default: response = await callCustom(config, userMessage); break;
  }

  // Parse JSON from response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}

const RAG_SYSTEM_PROMPT = `당신은 SKCT(SK 종합역량검사) 인지검사 문제 출제 전문가입니다.
아래 제공된 교재 내용을 참고하여 SKCT 스타일의 문제를 생성합니다.

중요: 교재의 내용, 유형, 스타일을 참고하되, 단순 복사가 아닌 새로운 문제를 만들어주세요.
교재에 나온 개념이나 주제를 활용하여 유사한 난이도와 형식의 문제를 생성하세요.

문제는 반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트를 포함하지 마세요:
[
  {
    "section": "language|data-analysis|math|logic|sequence",
    "type": "유형명",
    "passage": "지문 (필요시)",
    "question": "문제 텍스트",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
    "answer": "정답 선택지 텍스트 (options에 있는 값과 정확히 동일하게)",
    "explanation": "해설",
    "difficulty": 1
  }
]

중요: answer는 인덱스 번호가 아니라, options 배열에 있는 정답 선택지의 텍스트를 그대로 적으세요.

영역별 특징:
- language(언어이해): 지문 기반 독해, 중심내용/세부내용/구조/비판
- data-analysis(자료해석): 표/그래프 데이터 해석, 계산, 추론
- math(창의수리): 수학 응용문제 (속력, 농도, 일의 양, 경우의 수 등)
- logic(언어추리): 명제, 조건 추리 (순서/위치/참거짓)
- sequence(수열추리): 수열 규칙 파악`;

async function callLLM(config: AIConfig, systemPrompt: string, userMessage: string): Promise<string> {
  switch (config.provider) {
    case 'openai': {
      const res = await fetch(config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
          temperature: 0.7, max_tokens: 4096,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }
    case 'claude': {
      const res = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.model, max_tokens: 4096, system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }
    default: {
      const res = await fetch(config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
          temperature: 0.7, max_tokens: 4096,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || data.content?.[0]?.text || data.response || '';
    }
  }
}

export interface RAGChunk {
  text: string;
  page?: number;
  section?: string;
  score: number;
}

export async function generateFromRAG(
  config: AIConfig,
  chunks: RAGChunk[],
  topic: string,
  section?: string,
  count: number = 5,
): Promise<unknown[]> {
  const context = chunks.map((c, i) => `[참고 ${i + 1} (p.${c.page || '?'})]:\n${c.text}`).join('\n\n---\n\n');
  const sectionHint = section ? `\n영역: ${section}에 해당하는 문제만 생성하세요.` : '';
  const userMessage = `주제/키워드: "${topic}"${sectionHint}\n\n아래 교재 내용을 참고하여 SKCT 스타일 문제를 ${count}개 생성하세요.\n\n===교재 내용===\n${context.slice(0, 12000)}`;

  const response = await callLLM(config, RAG_SYSTEM_PROMPT, userMessage);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}
