import { POKEMON_TYPES } from '../config.js';

/**
 * 한국어 타입명을 영어로 변환
 * @param {string} koreanType - 한국어 타입명
 * @returns {string|null} - 영어 타입명 또는 null
 */
export function convertKoreanToEnglishType(koreanType) {
  if (!koreanType || typeof koreanType !== 'string') {
    return null;
  }
  return POKEMON_TYPES[koreanType] || null;
}

/**
 * 여러 한국어 타입명들을 영어로 변환
 * @param {string[]} koreanTypes - 한국어 타입명 배열
 * @returns {string[]} - 영어 타입명 배열
 */
export function convertKoreanTypesToEnglish(koreanTypes) {
  if (!Array.isArray(koreanTypes)) {
    return [];
  }
  return koreanTypes
    .map(type => convertKoreanToEnglishType(type))
    .filter(type => type !== null);
}

/**
 * 입력에서 포켓몬 타입 찾기
 * @param {string} input - 입력 문자열
 * @param {boolean} findSecond - 두 번째 타입 찾기 여부
 * @returns {string|null} - 찾은 타입 또는 null
 */
export function findPokemonType(input, findSecond = false) {
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  const foundTypes = [];
  
  for (const [koreanType] of Object.entries(POKEMON_TYPES)) {
    if (koreanType && input.includes(koreanType)) {
      foundTypes.push(koreanType);
    }
  }
  
  if (findSecond && foundTypes.length > 1) {
    return foundTypes[1];
  }
  
  return foundTypes.length > 0 ? foundTypes[0] : null;
}

/**
 * 입력에서 모든 포켓몬 타입 찾기
 * @param {string} input - 입력 문자열
 * @returns {string[]} - 찾은 타입 배열
 */
export function findAllPokemonTypes(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }
  
  const foundTypes = [];
  
  for (const [koreanType] of Object.entries(POKEMON_TYPES)) {
    if (koreanType && input.includes(koreanType)) {
      foundTypes.push(koreanType);
    }
  }
  
  return foundTypes;
}

