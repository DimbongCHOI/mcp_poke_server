// 포켓몬 타입 상성표
export const TYPE_EFFECTIVENESS = {
  normal: {
    superEffective: [],
    notVeryEffective: ['rock', 'steel'],
    noEffect: ['ghost']
  },
  fire: {
    superEffective: ['grass', 'ice', 'bug', 'steel'],
    notVeryEffective: ['fire', 'water', 'rock', 'dragon']
  },
  water: {
    superEffective: ['fire', 'ground', 'rock'],
    notVeryEffective: ['water', 'grass', 'dragon']
  },
  electric: {
    superEffective: ['water', 'flying'],
    notVeryEffective: ['electric', 'grass', 'dragon'],
    noEffect: ['ground']
  },
  grass: {
    superEffective: ['water', 'ground', 'rock'],
    notVeryEffective: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel']
  },
  ice: {
    superEffective: ['grass', 'ground', 'flying', 'dragon'],
    notVeryEffective: ['fire', 'water', 'ice', 'steel']
  },
  fighting: {
    superEffective: ['normal', 'ice', 'rock', 'dark', 'steel'],
    notVeryEffective: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
    noEffect: ['ghost']
  },
  poison: {
    superEffective: ['grass', 'fairy'],
    notVeryEffective: ['poison', 'ground', 'rock', 'ghost'],
    noEffect: ['steel']
  },
  ground: {
    superEffective: ['fire', 'electric', 'poison', 'rock', 'steel'],
    notVeryEffective: ['grass', 'bug'],
    noEffect: ['flying']
  },
  flying: {
    superEffective: ['fighting', 'bug', 'grass'],
    notVeryEffective: ['electric', 'rock', 'steel']
  },
  psychic: {
    superEffective: ['fighting', 'poison'],
    notVeryEffective: ['psychic', 'steel'],
    noEffect: ['dark']
  },
  bug: {
    superEffective: ['grass', 'psychic', 'dark'],
    notVeryEffective: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy']
  },
  rock: {
    superEffective: ['fire', 'ice', 'flying', 'bug'],
    notVeryEffective: ['fighting', 'ground', 'steel']
  },
  ghost: {
    superEffective: ['psychic', 'ghost'],
    notVeryEffective: ['dark'],
    noEffect: ['normal']
  },
  dragon: {
    superEffective: ['dragon'],
    notVeryEffective: ['steel'],
    noEffect: ['fairy']
  },
  dark: {
    superEffective: ['psychic', 'ghost'],
    notVeryEffective: ['fighting', 'dark', 'fairy']
  },
  steel: {
    superEffective: ['ice', 'rock', 'fairy'],
    notVeryEffective: ['fire', 'water', 'electric', 'steel']
  },
  fairy: {
    superEffective: ['fighting', 'dragon', 'dark'],
    notVeryEffective: ['fire', 'poison', 'steel']
  }
}

// 한국어 타입명 매핑
export const KOREAN_TYPE_NAMES = {
  normal: '노말',
  fire: '불꽃',
  water: '물',
  electric: '전기',
  grass: '풀',
  ice: '얼음',
  fighting: '격투',
  poison: '독',
  ground: '땅',
  flying: '비행',
  psychic: '에스퍼',
  bug: '벌레',
  rock: '바위',
  ghost: '고스트',
  dragon: '드래곤',
  dark: '악',
  steel: '강철',
  fairy: '페어리'
}

// 타입 상성 계산 함수
export function calculateTypeEffectiveness(attackType, defenseTypes) {
  if (!Array.isArray(defenseTypes)) {
    defenseTypes = [defenseTypes]
  }

  let totalMultiplier = 1

  for (const defenseType of defenseTypes) {
    const effectiveness = TYPE_EFFECTIVENESS[attackType]
    if (!effectiveness) continue

    if (effectiveness.superEffective && effectiveness.superEffective.includes(defenseType)) {
      totalMultiplier *= 2
    } else if (effectiveness.notVeryEffective && effectiveness.notVeryEffective.includes(defenseType)) {
      totalMultiplier *= 0.5
    } else if (effectiveness.noEffect && effectiveness.noEffect.includes(defenseType)) {
      totalMultiplier *= 0
    }
  }

  return totalMultiplier
}

// 상성 설명 텍스트 생성
export function getEffectivenessText(multiplier) {
  if (multiplier === 0) return '효과가 없습니다'
  if (multiplier === 0.25) return '매우 효과가 별로입니다'
  if (multiplier === 0.5) return '효과가 별로입니다'
  if (multiplier === 1) return '보통 효과입니다'
  if (multiplier === 2) return '효과가 굉장합니다'
  if (multiplier === 4) return '매우 효과가 굉장합니다'
  return '알 수 없는 효과입니다'
}

// 포켓몬 세대 정보
export const POKEMON_GENERATIONS = {
  1: { name: '1세대', start: 1, end: 151, region: '관동지방' },
  2: { name: '2세대', start: 152, end: 251, region: '성도지방' },
  3: { name: '3세대', start: 252, end: 386, region: '호연지방' },
  4: { name: '4세대', start: 387, end: 493, region: '신오지방' },
  5: { name: '5세대', start: 494, end: 649, region: '하나지방' },
  6: { name: '6세대', start: 650, end: 721, region: '칼로스지방' },
  7: { name: '7세대', start: 722, end: 809, region: '알로라지방' },
  8: { name: '8세대', start: 810, end: 905, region: '가라르지방' },
  9: { name: '9세대', start: 906, end: 1025, region: '팔데아지방' }
}

// 포켓몬 ID로 세대 찾기
export function getGenerationByPokemonId(pokemonId) {
  for (const [gen, info] of Object.entries(POKEMON_GENERATIONS)) {
    if (pokemonId >= info.start && pokemonId <= info.end) {
      return { generation: parseInt(gen), ...info }
    }
  }
  return null
}

