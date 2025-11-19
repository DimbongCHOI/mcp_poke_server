export const POKEMON_API_BASE_URL = 'https://pokeapi.co/api/v2';
export const SERVER_PORT = process.env.PORT || 3000;

export const POKEMON_TYPES = {
  '노말': 'normal',
  '불꽃': 'fire', 
  '물': 'water',
  '풀': 'grass',
  '전기': 'electric',
  '얼음': 'ice',
  '격투': 'fighting',
  '독': 'poison',
  '땅': 'ground',
  '비행': 'flying',
  '에스퍼': 'psychic',
  '벌레': 'bug',
  '바위': 'rock',
  '고스트': 'ghost',
  '드래곤': 'dragon',
  '악': 'dark',
  '강철': 'steel',
  '페어리': 'fairy'
};

export const POKEMON_TYPE_REVERSE = Object.fromEntries(
  Object.entries(POKEMON_TYPES).map(([k, v]) => [v, k])
);

