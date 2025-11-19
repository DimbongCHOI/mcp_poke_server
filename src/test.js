#!/usr/bin/env node

import PokemonAPI from './pokemon-api.js';

async function testPokemonAPI() {
  console.log('🧪 포켓몬 API 테스트를 시작합니다...\n');
  
  const pokemonAPI = new PokemonAPI();

  try {
    // 1. 특정 포켓몬 정보 조회 테스트
    console.log('1️⃣ 피카츄 정보 조회 테스트');
    const pikachu = await pokemonAPI.getPokemonByName('pikachu');
    console.log(`✅ ${pikachu.koreanName} (${pikachu.name})`);
    console.log(`   타입: ${pikachu.types.map(t => t.koreanName).join(', ')}`);
    console.log(`   키: ${pikachu.height}m, 몸무게: ${pikachu.weight}kg\n`);

    // 2. 전기 타입 포켓몬 조회 테스트
    console.log('2️⃣ 전기 타입 포켓몬 조회 테스트');
    const electricPokemon = await pokemonAPI.getPokemonByType('전기');
    console.log(`✅ 전기 타입 포켓몬 ${electricPokemon.pokemonCount}마리 발견`);
    console.log(`   대표 포켓몬: ${electricPokemon.pokemon.slice(0, 5).map(p => p.koreanName).join(', ')}\n`);

    // 3. 포켓몬 검색 테스트
    console.log('3️⃣ 포켓몬 검색 테스트 (불꽃)');
    const firePokemon = await pokemonAPI.searchPokemon('불꽃');
    console.log(`✅ "불꽃" 검색 결과 ${firePokemon.length}마리 발견`);
    console.log(`   대표 결과: ${firePokemon.slice(0, 3).map(p => p.koreanName).join(', ')}\n`);

    // 4. 포켓몬 타입 목록 조회 테스트
    console.log('4️⃣ 포켓몬 타입 목록 조회 테스트');
    const types = await pokemonAPI.getPokemonTypes();
    console.log(`✅ 총 ${types.length}개 타입 발견`);
    console.log(`   타입들: ${types.slice(0, 8).map(t => t.koreanName).join(', ')}\n`);

    // 5. 한국어 포켓몬 이름 테스트
    console.log('5️⃣ 한국어 포켓몬 이름 테스트');
    const charmander = await pokemonAPI.getPokemonByName('파이리');
    console.log(`✅ 파이리 → ${charmander.name} (${charmander.koreanName})`);
    console.log(`   진화형: 리자드, 리자몽\n`);

    console.log('🎉 모든 테스트가 성공적으로 완료되었습니다!');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

async function testChatbotIntent() {
  console.log('\n🤖 챗봇 의도 분석 테스트\n');

  // 챗봇 클래스 import (순환 참조 방지를 위해 여기서 import)
  const { default: PokemonChatbot } = await import('./chatbot.js');
  const chatbot = new PokemonChatbot();

  const testCases = [
    '전기 타입 포켓몬 알려줘',
    '피카츄 정보 보여줘',
    '리자몽 능력치 알려줘',
    '포켓몬 타입들 알려줘',
    '불꽃으로 시작하는 포켓몬 찾아줘',
    'quit'
  ];

  for (const testCase of testCases) {
    const intent = chatbot.analyzeIntent(testCase);
    console.log(`📝 "${testCase}"`);
    console.log(`   → 의도: ${intent.type}`);
    if (intent.parameters) {
      console.log(`   → 매개변수: ${JSON.stringify(intent.parameters)}`);
    }
    console.log('');
  }
}

// 테스트 실행
async function runTests() {
  await testPokemonAPI();
  await testChatbotIntent();
}

runTests().catch(console.error);

