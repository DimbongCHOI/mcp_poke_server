/**
 * 지역명으로 세대 번호 조회
 * @param {string} region - 지역명
 * @returns {number|null} - 세대 번호 또는 null
 */
export function getGenerationByRegion(region) {
  const regionMap = {
    '관동': 1,
    '성도': 2,
    '호연': 3,
    '신오': 4,
    '하나': 5,
    '칼로스': 6,
    '알로라': 7,
    '가라르': 8,
    '팔데아': 9
  };
  return regionMap[region] || null;
}

/**
 * 입력에서 세대 번호 추출
 * @param {string} input - 입력 문자열
 * @returns {number|null} - 세대 번호 또는 null
 */
export function extractGeneration(input) {
  // 숫자로 된 세대 번호 찾기
  const generationMatch = input.match(/(\d+)세대/);
  if (generationMatch) {
    return parseInt(generationMatch[1]);
  }
  
  // 지역명으로 세대 번호 찾기
  const regionMatch = input.match(/(관동|성도|호연|신오|하나|칼로스|알로라|가라르|팔데아)/);
  if (regionMatch) {
    return getGenerationByRegion(regionMatch[1]);
  }
  
  return null;
}

