import { POKEMON_NAME_MAP } from '../data/pokemonNames.js';
import PokemonAPI from '../pokemon-api.js';

const pokemonAPI = new PokemonAPI();

/**
 * 입력에서 포켓몬 이름 추출
 * @param {string} input - 입력 문자열
 * @returns {string|null} - 포켓몬 영어 이름 또는 null
 */
export function extractPokemonName(input) {
  const inputWords = input.split(/\s+/);
  
  // 각 단어에 대해 API를 통해 한국어 이름을 영어로 변환 시도
  for (const word of inputWords) {
    const englishName = pokemonAPI.getEnglishName(word);
    if (englishName) {
      return englishName;
    }
    
    // 영어 이름도 체크
    if (/^[a-zA-Z]+$/.test(word)) {
      return word.toLowerCase();
    }
  }

  // 미리 정의된 매핑에서 한국어 포켓몬 이름 찾기
  for (const [koreanName, englishName] of Object.entries(POKEMON_NAME_MAP)) {
    if (input.includes(koreanName)) {
      return englishName;
    }
  }

  // 영어 포켓몬 이름 찾기
  const words = input.split(/\s+/);
  for (const word of words) {
    if (POKEMON_NAME_MAP[word] || /^[a-zA-Z]+$/.test(word)) {
      return word.toLowerCase();
    }
  }

  return null;
}

/**
 * 입력에서 검색어 추출
 * @param {string} input - 입력 문자열
 * @returns {string|null} - 검색어 또는 null
 */
export function extractSearchQuery(input) {
  // "불꽃으로 시작하는", "전기로 끝나는" 등의 패턴 찾기
  const patterns = [
    /(.+?)로\s*시작하는/,
    /(.+?)로\s*끝나는/,
    /(.+?)가\s*들어간/,
    /(.+?)포켓몬/
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // 단순한 검색어 추출
  const words = input.split(/\s+/).filter(word => 
    word.length > 1 && !['포켓몬', '찾아줘', '검색', '알려줘'].includes(word)
  );
  
  return words.length > 0 ? words[0] : null;
}

