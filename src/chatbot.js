import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { POKEMON_TYPES } from './config.js';
import PokemonAPI from './pokemon-api.js';
import { 
  calculateTypeEffectiveness, 
  getEffectivenessText, 
  getGenerationByPokemonId,
  POKEMON_GENERATIONS,
  KOREAN_TYPE_NAMES 
} from './utils/typeEffectiveness.js';
import { 
  convertKoreanToEnglishType,
  findPokemonType,
  findAllPokemonTypes 
} from './utils/typeConverter.js';
import { 
  extractGeneration,
  getGenerationByRegion 
} from './utils/generationHelper.js';
import { 
  extractPokemonName,
  extractSearchQuery 
} from './utils/pokemonNameExtractor.js';

class PokemonChatbot {
  constructor() {
    this.client = null;
    this.mcpServerProcess = null;
    this.isConnected = false;
    this.isInitialized = false;
    this.pokemonAPI = new PokemonAPI();
  }

  async start() {
    try {
      console.log('🤖 포켓몬 챗봇을 시작합니다...');
      
      // MCP 서버 연결을 시도하되, 실패하면 직접 API 모드로 전환
      try {
        // MCP 서버 프로세스 시작
        this.mcpServerProcess = spawn('node', ['src/server.js'], {
          stdio: ['pipe', 'pipe', 'inherit']
        });

        // MCP 클라이언트 설정
        const transport = new StdioClientTransport({
          reader: this.mcpServerProcess.stdout,
          writer: this.mcpServerProcess.stdin
        });

        this.client = new Client(
          {
            name: 'pokemon-chatbot',
            version: '1.0.0'
          },
          {
            capabilities: {}
          }
        );

        await this.client.connect(transport);
        this.isConnected = true;
        console.log('✅ MCP 서버에 연결되었습니다!');
      } catch (mcpError) {
        console.log('⚠️ MCP 서버 연결 실패, 직접 API 모드로 전환합니다.');
        this.isConnected = false;
      }
      
      console.log('✅ 포켓몬 챗봇이 준비되었습니다!');
      console.log('💬 사용 가능한 명령어:');
      console.log('   • "전기 타입 포켓몬 알려줘"');
      console.log('   • "피카츄 정보 보여줘"');
      console.log('   • "포켓몬 타입들 알려줘"');
      console.log('   • "불꽃으로 시작하는 포켓몬 찾아줘"');
      console.log('   • "quit" 또는 "exit"로 종료');
      console.log('');

    } catch (error) {
      console.error('❌ 챗봇 시작 중 오류:', error.message);
      throw error;
    }
  }

  async processMessage(userInput) {
    // MCP 서버 연결 여부와 관계없이 처리 가능

    try {
      console.log('Processing message:', userInput);
      const intent = this.analyzeIntent(userInput);
      console.log('Analyzed intent:', intent);
      return await this.executeIntent(intent, userInput);
    } catch (error) {
      console.error('Error processing message:', error);
      return `❌ 오류가 발생했습니다: ${error.message}`;
    }
  }

  analyzeIntent(userInput) {
    const input = userInput.toLowerCase().trim();
    
    // 종료 명령
    if (input.includes('quit') || input.includes('exit') || input.includes('종료')) {
      return { type: 'quit' };
    }

    // 도감번호로 포켓몬 조회 (세대보다 먼저 체크!)
    if (input.includes('도감') || input.includes('번호')) {
      const idMatch = input.match(/(\d+)/);
      if (idMatch) {
        const pokemonId = parseInt(idMatch[1]);
        if (pokemonId >= 1 && pokemonId <= 1025) {
          console.log('✅ Pokedex number detected:', pokemonId);
          return {
            type: 'get_pokemon_info',
            parameters: { identifier: pokemonId.toString() }
          };
        }
      }
    }

    // 숫자만 입력한 경우 (ex: "151", "25")
    if (/^\d+$/.test(input.trim())) {
      const pokemonId = parseInt(input.trim());
      if (pokemonId >= 1 && pokemonId <= 1025) {
        console.log('✅ Direct number input detected:', pokemonId);
        return {
          type: 'get_pokemon_info',
          parameters: { identifier: pokemonId.toString() }
        };
      }
    }

    // "151번" 형식
    const numberOnlyPattern = /^(\d+)번?$/;
    const numberOnlyMatch = input.match(numberOnlyPattern);
    if (numberOnlyMatch) {
      const pokemonId = parseInt(numberOnlyMatch[1]);
      if (pokemonId >= 1 && pokemonId <= 1025) {
        console.log('✅ Number + 번 format detected:', pokemonId);
        return {
          type: 'get_pokemon_info',
          parameters: { identifier: pokemonId.toString() }
        };
      }
    }

    // 타입 상성 관련 질문
    if (input.includes('상성') || input.includes('효과') || input.includes('약점') || input.includes('강점')) {
      return this.analyzeTypeEffectivenessQuery(input);
    }

    // 복합 질문 분석 (세대 + 타입)
    const complexQuery = this.analyzeComplexQuery(input);
    if (complexQuery) {
      return complexQuery;
    }

    // 세대 관련 질문
    if (input.includes('세대') || input.includes('1세대') || input.includes('2세대') || 
        input.includes('3세대') || input.includes('4세대') || input.includes('5세대') ||
        input.includes('6세대') || input.includes('7세대') || input.includes('8세대') || 
        input.includes('9세대') || input.includes('관동') || input.includes('성도') || 
        input.includes('호연') || input.includes('신오') || input.includes('하나') ||
        input.includes('칼로스') || input.includes('알로라') || input.includes('가라르') || 
        input.includes('팔데아')) {
      return this.analyzeGenerationQuery(input);
    }

    // 포켓몬 타입별 조회
    const typeMatch = findPokemonType(input);
    if (typeMatch) {
      return { 
        type: 'get_pokemon_by_type', 
        parameters: { type: typeMatch } 
      };
    }

    // 특정 포켓몬 정보 조회
    const pokemonName = extractPokemonName(input);
    if (pokemonName) {
      if (input.includes('능력치') || input.includes('스탯') || input.includes('스텟')) {
        return { 
          type: 'get_pokemon_stats', 
          parameters: { identifier: pokemonName } 
        };
      }
      return { 
        type: 'get_pokemon_info', 
        parameters: { identifier: pokemonName } 
      };
    }

    // 포켓몬 검색
    if (input.includes('찾') || input.includes('검색') || input.includes('어떤') || input.includes('포켓몬이')) {
      const searchQuery = extractSearchQuery(input);
      if (searchQuery) {
        return { 
          type: 'search_pokemon', 
          parameters: { query: searchQuery } 
        };
      }
    }

    // 포켓몬 타입 목록 조회
    if ((input.includes('타입') && (input.includes('목록') || input.includes('종류') || input.includes('모든'))) ||
        input.includes('어떤 타입들이')) {
      return { type: 'get_pokemon_types', parameters: {} };
    }

    // 기본 응답
    return { 
      type: 'help', 
      parameters: {} 
    };
  }

  analyzeTypeEffectivenessQuery(input) {
    // 타입 상성 분석
    const allTypes = findAllPokemonTypes(input);
    
    if (allTypes.length >= 2) {
      return {
        type: 'get_type_vs_type_effectiveness',
        parameters: { type1: allTypes[0], type2: allTypes[1] }
      };
    } else if (allTypes.length === 1) {
      return {
        type: 'get_type_effectiveness_info',
        parameters: { type: allTypes[0] }
      };
    }
    
    return { type: 'help', parameters: {} };
  }

  analyzeGenerationQuery(input) {
    // 세대 분석
    const generation = extractGeneration(input);
    
    if (generation) {
      return {
        type: 'get_generation_pokemon',
        parameters: { generation }
      };
    }
    
    return { type: 'help', parameters: {} };
  }

  getKnownDragonPokemon(generation) {
    const dragonPokemonByGeneration = {
      1: [147, 148, 149], // 미뇽, 신뇽, 망나뇽
      2: [230], // 킹드라
      3: [371, 372, 373, 384], // 아공이, 쉘곤, 보만다, 레쿠쟈
      4: [483, 484, 487], // 디아루가, 펄기아, 기라티나
      5: [610, 611, 612, 621, 633, 634, 635, 643, 644, 646], // 터검니, 액슨도, 액스라이즈, 크리만, 모노두, 디헤드, 삼삼드래, 레시라무, 제크로무, 큐레무
      6: [704, 705, 706, 717], // 누리레, 누리레, 누리레, 이벨타르
      7: [782, 783, 784, 800], // 드라꼰, 드래캄, 드래캄, 네크로즈마
      8: [884, 890], // 알로라 드래곤, 에테르나스
      9: [1007, 1008, 1009] // 팔데아 드래곤들
    };
    
    return dragonPokemonByGeneration[generation] || [];
  }

  analyzeComplexQuery(input) {
    // 세대 + 타입 복합 질문 분석
    const generation = extractGeneration(input);
    const types = findAllPokemonTypes(input);
    
    // 세대 + 타입 조합
    if (generation && types.length > 0) {
      return {
        type: 'get_generation_type_pokemon',
        parameters: { generation, type: types[0] }
      };
    }
    
    // 타입 + 타입 상성 질문 분석 (세대가 없는 경우에만)
    if (types.length >= 2 && !generation) {
      return {
        type: 'get_type_vs_type_effectiveness',
        parameters: { type1: types[0], type2: types[1] }
      };
    }

    return null;
  }

  async executeIntent(intent, userInput) {
    switch (intent.type) {
      case 'quit':
        return await this.quit();

      case 'get_pokemon_info':
      case 'get_pokemon_stats':
      case 'get_pokemon_by_type':
      case 'search_pokemon':
      case 'get_pokemon_types':
        return await this.callMCPTool(intent.type, intent.parameters);

      case 'get_type_effectiveness':
        return await this.handleTypeEffectiveness(intent.parameters);

      case 'get_type_effectiveness_info':
        return await this.handleTypeEffectivenessInfo(intent.parameters);

      case 'get_generation_pokemon':
        return await this.handleGenerationPokemon(intent.parameters);

      case 'get_generation_type_pokemon':
        return await this.handleGenerationTypePokemon(intent.parameters);

      case 'get_type_vs_type_effectiveness':
        return await this.handleTypeVsTypeEffectiveness(intent.parameters);

      case 'help':
      default:
        return this.getHelpMessage();
    }
  }

  async callMCPTool(toolName, parameters) {
    try {
      // MCP 서버가 연결되지 않은 경우 직접 API 호출
      if (!this.isConnected) {
        return await this.callPokemonAPIDirect(toolName, parameters);
      }

      const result = await this.client.callTool({
        name: toolName,
        arguments: parameters
      });

      if (result.content && result.content.length > 0) {
        return result.content[0].text;
      }
      
      return '결과를 가져올 수 없습니다.';
    } catch (error) {
      return `도구 실행 중 오류가 발생했습니다: ${error.message}`;
    }
  }

  async callPokemonAPIDirect(toolName, parameters) {
    try {
      switch (toolName) {
        case 'get_pokemon_info': {
          const pokemon = await this.pokemonAPI.getPokemonByName(parameters.identifier);
          const typesText = pokemon.types.map(t => t.koreanName).join(', ');
          const abilitiesText = pokemon.abilities.map(a => a.name).join(', ');
          
          const statsText = pokemon.stats.map(stat => {
            const statNames = {
              hp: 'HP',
              attack: '공격',
              defense: '방어',
              'special-attack': '특수공격',
              'special-defense': '특수방어',
              speed: '스피드'
            };
            return `${statNames[stat.name] || stat.name}: ${stat.baseStat}`;
          }).join(', ');

          return `🔍 **${pokemon.koreanName} (${pokemon.name})**

📊 **기본 정보**
• ID: #${pokemon.id.toString().padStart(3, '0')}
• 키: ${pokemon.height}m
• 몸무게: ${pokemon.weight}kg

⚡ **타입**: ${typesText}

🌟 **특성**: ${abilitiesText}

📈 **능력치**
${statsText}

🖼️ 이미지: ${pokemon.sprite}`;
        }

        case 'get_pokemon_by_type': {
          const result = await this.pokemonAPI.getPokemonByType(parameters.type);
          const pokemonList = result.pokemon.slice(0, 20).map(p => 
            `• ${p.koreanName} (${p.name})`
          ).join('\n');

          const moreCount = result.pokemonCount > 20 ? `\n\n... 그리고 ${result.pokemonCount - 20}마리 더!` : '';

          return `⚡ **${result.typeKorean} 타입 포켓몬들** (총 ${result.pokemonCount}마리)

${pokemonList}${moreCount}

💡 더 자세한 정보를 원하시면 특정 포켓몬 이름을 말씀해 주세요!`;
        }

        case 'get_pokemon_types': {
          const allTypes = await this.pokemonAPI.getPokemonTypes();
          const allTypesText = allTypes.map(t => `• ${t.koreanName} (${t.name})`).join('\n');

          return `🎯 **모든 포켓몬 타입**

${allTypesText}

💡 특정 타입의 포켓몬들을 보고 싶으시면 "전기 타입 포켓몬 알려줘" 같은 식으로 말씀해 주세요!`;
        }

        case 'search_pokemon': {
          const results = await this.pokemonAPI.searchPokemon(parameters.query);
          
          if (results.length === 0) {
            return `"${parameters.query}"에 해당하는 포켓몬을 찾을 수 없습니다. 다른 이름으로 검색해 보세요!`;
          }

          const resultsText = results.slice(0, 10).map(p => 
            `• ${p.koreanName} (${p.name})`
          ).join('\n');

          const moreCount = results.length > 10 ? `\n\n... 그리고 ${results.length - 10}마리 더!` : '';

          return `🔍 **"${parameters.query}" 검색 결과** (${results.length}마리 발견)

${resultsText}${moreCount}

💡 더 자세한 정보를 원하시면 특정 포켓몬 이름을 말씀해 주세요!`;
        }

        case 'get_pokemon_stats': {
          const pokemonStats = await this.pokemonAPI.getPokemonByName(parameters.identifier);
          
          const statsDetail = pokemonStats.stats.map(stat => {
            const statNames = {
              hp: 'HP',
              attack: '공격',
              defense: '방어',
              'special-attack': '특수공격',
              'special-defense': '특수방어',
              speed: '스피드'
            };
            
            const bar = '█'.repeat(Math.floor(stat.baseStat / 10));
            const percentage = Math.floor((stat.baseStat / 255) * 100);
            
            return `${statNames[stat.name] || stat.name}: ${stat.baseStat} ${bar} (${percentage}%)`;
          }).join('\n');

          return `📊 **${pokemonStats.koreanName}의 능력치 상세**

${statsDetail}

💡 능력치는 0~255 범위이며, 바 차트는 대략적인 수치를 나타냅니다.`;
        }

        case 'get_generation_type_pokemon': {
          return await this.handleGenerationTypePokemon(parameters);
        }

        case 'get_type_effectiveness': {
          return await this.handleTypeEffectiveness(parameters);
        }

        case 'get_type_effectiveness_info': {
          return await this.handleTypeEffectivenessInfo(parameters);
        }

        case 'get_generation_pokemon': {
          return await this.handleGenerationPokemon(parameters);
        }

        case 'get_type_vs_type_effectiveness': {
          return await this.handleTypeVsTypeEffectiveness(parameters);
        }

        default:
          return '지원하지 않는 도구입니다.';
      }
    } catch (error) {
      return `API 호출 중 오류가 발생했습니다: ${error.message}`;
    }
  }

  async handleTypeEffectiveness(parameters) {
    const { attackType, defenseType } = parameters;
    
    // 한국어 타입명을 영어로 변환
    const englishAttackType = convertKoreanToEnglishType(attackType);
    const englishDefenseType = convertKoreanToEnglishType(defenseType);
    
    if (!englishAttackType || !englishDefenseType) {
      return `❌ 타입 정보를 찾을 수 없습니다: ${attackType}, ${defenseType}`;
    }
    
    const multiplier = calculateTypeEffectiveness(englishAttackType, [englishDefenseType]);
    const effectivenessText = getEffectivenessText(multiplier);
    
    return `⚔️ **타입 상성 분석**

${attackType} → ${defenseType}

**결과**: ${effectivenessText} (배수: ${multiplier}x)

💡 ${multiplier > 1 ? '강력한 공격이 가능합니다!' : 
    multiplier < 1 ? '다른 타입 공격을 고려해보세요.' : 
    '평범한 효과입니다.'}`;
  }

  async handleTypeEffectivenessInfo(parameters) {
    const { type } = parameters;
    
    // 한국어 타입명을 영어로 변환
    const englishType = convertKoreanToEnglishType(type);
    if (!englishType) {
      return `❌ "${type}" 타입을 찾을 수 없습니다.`;
    }
    
    const effectiveness = TYPE_EFFECTIVENESS[englishType];
    if (!effectiveness) {
      return `❌ "${type}" 타입의 상성 정보를 찾을 수 없습니다.`;
    }

    const superEffective = effectiveness.superEffective.map(t => KOREAN_TYPE_NAMES[t]).join(', ');
    const notVeryEffective = effectiveness.notVeryEffective.map(t => KOREAN_TYPE_NAMES[t]).join(', ');
    const noEffect = effectiveness.noEffect.map(t => KOREAN_TYPE_NAMES[t]).join(', ');

    return `⚔️ **${type} 타입 상성 정보**

🔥 **효과가 굉장한 타입** (2배)
${superEffective || '없음'}

🛡️ **효과가 별로인 타입** (0.5배)
${notVeryEffective || '없음'}

🚫 **효과가 없는 타입** (0배)
${noEffect || '없음'}

💡 이 정보를 활용해서 전략적으로 포켓몬 배틀을 해보세요!`;
  }

  async handleGenerationPokemon(parameters) {
    const { generation } = parameters;
    const genInfo = POKEMON_GENERATIONS[generation];
    
    if (!genInfo) {
      return `❌ ${generation}세대 정보를 찾을 수 없습니다.`;
    }

    // 해당 세대의 포켓몬들 가져오기 (처음 10마리만)
    const pokemonList = [];
    for (let i = genInfo.start; i <= Math.min(genInfo.start + 9, genInfo.end); i++) {
      try {
        const pokemon = await this.pokemonAPI.getPokemonById(i);
        pokemonList.push(pokemon);
      } catch (error) {
        console.error(`Failed to get Pokemon ${i}:`, error.message);
      }
    }

    const pokemonText = pokemonList.map(p => `• ${p.koreanName} (${p.name})`).join('\n');
    const totalCount = genInfo.end - genInfo.start + 1;

    return `🌟 **${genInfo.name} 포켓몬들** (${genInfo.region})

📊 **기본 정보**
• 포켓몬 번호: #${genInfo.start} ~ #${genInfo.end}
• 총 포켓몬 수: ${totalCount}마리
• 지역: ${genInfo.region}

🎮 **대표 포켓몬들**
${pokemonText}

💡 더 자세한 정보를 원하시면 특정 포켓몬 이름을 말씀해 주세요!`;
  }

  async handleGenerationTypePokemon(parameters) {
    try {
      const { generation, type } = parameters;
      console.log('handleGenerationTypePokemon called with:', { generation, type });
      
      const genInfo = POKEMON_GENERATIONS[generation];
      
      if (!genInfo) {
        return `❌ ${generation}세대 정보를 찾을 수 없습니다.`;
      }

      console.log('Generation info:', genInfo);

      // 해당 세대의 포켓몬들 중에서 특정 타입 찾기
      const pokemonList = [];
      
      // 세대 범위 내에서 포켓몬들을 직접 검색
      console.log(`Searching for ${type} type Pokemon in generation ${generation} (${genInfo.start}-${genInfo.end})`);
      
      // 성능을 위해 세대별로 적절한 수만 검색하고, 드래곤 타입의 경우 특별 처리
      let maxSearch = Math.min(genInfo.end, genInfo.start + 20); // 기본 20마리만 검색
      
      // 알려진 포켓몬들을 우선 검색 (모든 타입 지원)
      const knownPokemon = this.getKnownPokemonByType(generation, type);
      if (knownPokemon.length > 0) {
        console.log(`Checking known ${type} type Pokemon for generation ${generation}: ${knownPokemon.join(', ')}`);
        for (const pokemonId of knownPokemon) {
          if (pokemonId >= genInfo.start && pokemonId <= genInfo.end) {
            try {
              const pokemon = await this.pokemonAPI.getPokemonById(pokemonId);
              const hasType = pokemon.types && pokemon.types.some(t => t.koreanName === type);
              if (hasType) {
                pokemonList.push(pokemon);
                console.log(`Found ${type} type Pokemon: ${pokemon.koreanName} (${pokemon.name})`);
              }
            } catch (error) {
              console.error(`Failed to get Pokemon ${pokemonId}:`, error.message);
            }
          }
        }
        
        // 알려진 포켓몬을 찾았으면 추가 검색 중단
        if (pokemonList.length > 0) {
          console.log(`Found ${pokemonList.length} known ${type} type Pokemon, skipping further search`);
        } else {
          console.log(`No known ${type} type Pokemon found, continuing with general search`);
        }
      }
      
      // 일반적인 검색 (드래곤 타입이 아니거나 알려진 포켓몬을 찾지 못한 경우)
      if (pokemonList.length === 0) {
        for (let i = genInfo.start; i <= maxSearch; i++) {
          try {
            const pokemon = await this.pokemonAPI.getPokemonById(i);
            const hasType = pokemon.types && pokemon.types.some(t => t.koreanName === type);
            if (hasType) {
              pokemonList.push(pokemon);
              console.log(`Found ${type} type Pokemon: ${pokemon.koreanName} (${pokemon.name})`);
            }
          } catch (error) {
            console.error(`Failed to get Pokemon ${i}:`, error.message);
            // 연속 실패 시 중단
            if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
              console.log('API connection issues detected, stopping search');
              break;
            }
          }
        }
      }
      
      console.log(`Found ${pokemonList.length} ${type} type Pokemon in generation ${generation}`);

      if (pokemonList.length === 0) {
        return `❌ ${genInfo.name}에는 ${type} 타입 포켓몬이 없습니다.`;
      }

      const pokemonText = pokemonList.map(p => {
        const types = p.types ? p.types.map(t => t.koreanName).join(', ') : '알 수 없음';
        return `• ${p.koreanName} (${p.name}) - ${types}`;
      }).join('\n');

      return `🌟 **${genInfo.name} ${type} 타입 포켓몬들** (${genInfo.region})

📊 **기본 정보**
• 세대: ${genInfo.name} (${genInfo.region})
• 타입: ${type}
• 총 포켓몬 수: ${pokemonList.length}마리

🎮 **포켓몬 목록**
${pokemonText}

💡 더 자세한 정보를 원하시면 특정 포켓몬 이름을 말씀해 주세요!`;
    } catch (error) {
      console.error('Error in handleGenerationTypePokemon:', error);
      return `❌ 세대별 타입 포켓몬 조회 중 오류가 발생했습니다: ${error.message}`;
    }
  }

  async handleTypeVsTypeEffectiveness(parameters) {
    try {
      const { type1, type2 } = parameters;
      
      if (!type1 || !type2) {
        return `❌ 타입 정보가 부족합니다: ${type1}, ${type2}`;
      }
      
      // 한국어 타입명을 영어로 변환
      const englishType1 = convertKoreanToEnglishType(type1);
      const englishType2 = convertKoreanToEnglishType(type2);
      
      if (!englishType1 || !englishType2) {
        return `❌ 타입 정보를 찾을 수 없습니다: ${type1}, ${type2}`;
      }
      
      // type1 → type2 상성
      const multiplier1 = calculateTypeEffectiveness(englishType1, [englishType2]);
      const effectiveness1 = getEffectivenessText(multiplier1);
      
      // type2 → type1 상성
      const multiplier2 = calculateTypeEffectiveness(englishType2, [englishType1]);
      const effectiveness2 = getEffectivenessText(multiplier2);

      return `⚔️ **${type1} vs ${type2} 상성 분석**

🔄 **상호 상성**
• ${type1} → ${type2}: ${effectiveness1} (${multiplier1}x)
• ${type2} → ${type1}: ${effectiveness2} (${multiplier2}x)

📊 **전략 분석**
${this.getTypeVsTypeStrategy(type1, type2, multiplier1, multiplier2)}

💡 이 정보를 활용해서 포켓몬 배틀 전략을 세워보세요!`;
    } catch (error) {
      console.error('Error in handleTypeVsTypeEffectiveness:', error);
      return `❌ 타입 상성 분석 중 오류가 발생했습니다: ${error.message}`;
    }
  }

  getTypeVsTypeStrategy(type1, type2, multiplier1, multiplier2) {
    if (multiplier1 > 1 && multiplier2 < 1) {
      return `🎯 **${type1}가 유리**: ${type1} 타입이 ${type2} 타입을 효과적으로 공격할 수 있습니다.`;
    } else if (multiplier1 < 1 && multiplier2 > 1) {
      return `🎯 **${type2}가 유리**: ${type2} 타입이 ${type1} 타입을 효과적으로 공격할 수 있습니다.`;
    } else if (multiplier1 > 1 && multiplier2 > 1) {
      return `⚡ **상호 강력**: 양쪽 모두 서로에게 강한 공격을 할 수 있어 치열한 배틀이 예상됩니다.`;
    } else if (multiplier1 < 1 && multiplier2 < 1) {
      return `🛡️ **상호 약함**: 양쪽 모두 서로에게 약한 공격을 하므로 오래 지속되는 배틀이 될 것입니다.`;
    } else {
      return `⚖️ **균형**: 양쪽 모두 평범한 효과를 주고받는 균형잡힌 배틀입니다.`;
    }
  }

  // 세대별 타입별 알려진 포켓몬 ID 목록
  getKnownPokemonByType(generation, type) {
    const pokemonData = {
      1: {
        '노말': [16, 17, 18, 19, 20, 21, 22, 39, 40, 52, 53, 83, 84, 85, 108, 113, 115, 128, 132, 133, 137, 143],
        '불꽃': [4, 5, 6, 37, 38, 58, 59, 77, 78, 126, 136],
        '물': [7, 8, 9, 54, 55, 60, 61, 62, 72, 73, 86, 87, 90, 91, 98, 99, 116, 117, 118, 119, 120, 121, 129, 130, 131, 134, 138, 139, 140, 141],
        '전기': [25, 26, 81, 82, 100, 101, 125, 135, 145],
        '풀': [1, 2, 3, 43, 44, 45, 46, 47, 69, 70, 71, 102, 103, 114],
        '얼음': [87, 91, 124, 131, 144],
        '격투': [56, 57, 62, 66, 67, 68, 106, 107],
        '독': [1, 2, 3, 13, 14, 15, 23, 24, 29, 30, 31, 32, 33, 34, 41, 42, 43, 44, 45, 48, 49, 69, 70, 71, 72, 73, 88, 89, 109, 110],
        '땅': [27, 28, 31, 34, 50, 51, 74, 75, 76, 95, 104, 105, 111, 112],
        '비행': [6, 12, 15, 16, 17, 18, 21, 22, 41, 42, 83, 84, 85, 123, 130, 142, 144, 145, 146, 149],
        '에스퍼': [63, 64, 65, 79, 80, 96, 97, 102, 103, 121, 122, 124, 150, 151],
        '벌레': [10, 11, 12, 13, 14, 15, 46, 47, 48, 49, 123, 127],
        '바위': [74, 75, 76, 95, 111, 112, 138, 139, 140, 141, 142],
        '고스트': [92, 93, 94],
        '드래곤': [147, 148, 149],
        '악': [],
        '강철': [81, 82],
        '페어리': [35, 36, 39, 40, 122]
      },
      2: {
        '노말': [161, 162, 163, 164, 174, 190, 203, 206, 216, 217, 233, 234, 235, 241, 242],
        '불꽃': [155, 156, 157, 218, 219, 240, 244],
        '물': [158, 159, 160, 170, 171, 183, 184, 186, 194, 195, 211, 222, 223, 224, 226, 230, 245],
        '전기': [161, 162, 172, 179, 180, 181, 243],
        '풀': [152, 153, 154, 182, 187, 188, 189, 191, 192, 251],
        '얼음': [86, 87, 91, 124, 131, 144, 215, 220, 221, 225],
        '격투': [56, 57, 62, 66, 67, 68, 106, 107, 236, 237],
        '독': [167, 168, 169, 193, 211],
        '땅': [194, 195, 206, 207, 208, 218, 219, 247],
        '비행': [16, 17, 18, 21, 22, 83, 84, 85, 123, 130, 142, 144, 145, 146, 149, 163, 164, 165, 166, 169, 176, 193, 198, 207, 225, 226, 227, 249, 250],
        '에스퍼': [63, 64, 65, 79, 80, 96, 97, 102, 103, 121, 122, 124, 150, 151, 177, 178, 196, 199, 201, 202, 203, 249, 251],
        '벌레': [10, 11, 12, 13, 14, 15, 46, 47, 48, 49, 123, 127, 165, 166, 167, 168, 193, 204, 205, 212, 213, 214],
        '바위': [74, 75, 76, 95, 111, 112, 138, 139, 140, 141, 142, 185, 208, 213, 219, 246, 247, 248],
        '고스트': [92, 93, 94, 200],
        '드래곤': [147, 148, 149, 230],
        '악': [197, 198, 215, 228, 229, 248],
        '강철': [81, 82, 205, 208, 212, 227],
        '페어리': [35, 36, 39, 40, 122, 173, 174, 175, 176, 183, 184, 209, 210]
      },
      3: {
        '노말': [263, 264, 276, 277, 287, 288, 289, 293, 294, 295, 300, 301, 327, 333, 334, 335, 351, 352],
        '불꽃': [255, 256, 257, 322, 323, 324, 351, 383],
        '물': [258, 259, 260, 270, 271, 272, 278, 279, 283, 284, 318, 319, 320, 321, 339, 340, 341, 342, 349, 350, 363, 364, 365, 366, 367, 368, 369, 370, 382],
        '전기': [309, 310, 311, 312, 351],
        '풀': [252, 253, 254, 270, 271, 272, 273, 274, 275, 285, 286, 315, 331, 332, 345, 346, 357],
        '얼음': [361, 362, 363, 364, 365, 378],
        '격투': [256, 257, 286, 296, 297, 307, 308],
        '독': [269, 316, 317, 336, 342, 434, 435, 451, 452, 453, 454],
        '땅': [260, 290, 291, 322, 323, 328, 329, 330, 339, 340, 343, 344, 383],
        '비행': [267, 269, 276, 277, 278, 279, 283, 284, 333, 334, 357, 358, 373, 384],
        '에스퍼': [280, 281, 282, 307, 308, 325, 326, 337, 338, 343, 344, 358, 360, 375, 376, 380, 381, 385, 386],
        '벌레': [265, 266, 267, 268, 269, 283, 284, 290, 291, 313, 314, 347, 348, 401, 402, 412, 413, 414, 415, 416],
        '바위': [299, 304, 305, 306, 337, 338, 345, 346, 347, 348, 369, 377, 408, 409, 410, 411],
        '고스트': [292, 302, 353, 354, 355, 356, 359, 477, 478, 487],
        '드래곤': [329, 330, 371, 372, 373, 384],
        '악': [261, 262, 275, 302, 318, 319, 332, 335, 342, 359, 430, 461, 491, 509, 510],
        '강철': [304, 305, 306, 374, 375, 376, 379, 410, 411, 448, 462],
        '페어리': [280, 281, 282, 303, 439]
      },
      4: {
        '노말': [396, 397, 398, 399, 400, 424, 427, 428, 431, 432, 440, 441, 446, 463, 474, 486, 493],
        '불꽃': [390, 391, 392, 467, 485, 494],
        '물': [393, 394, 395, 400, 418, 419, 422, 423, 456, 457, 484, 489, 490],
        '전기': [403, 404, 405, 417, 462, 466, 479, 522, 523],
        '풀': [387, 388, 389, 406, 407, 420, 421, 455, 459, 460, 465, 470, 492],
        '얼음': [459, 460, 461, 471, 473, 478],
        '격투': [391, 392, 447, 448, 475, 532, 533, 534, 538, 539, 559, 560],
        '독': [434, 435, 451, 452, 453, 454, 543, 544, 545, 568, 569, 590, 591],
        '땅': [389, 422, 423, 443, 444, 445, 449, 450, 472, 473, 529, 530, 551, 552, 553, 618, 622, 623, 645],
        '비행': [396, 397, 398, 414, 415, 416, 425, 426, 430, 441, 456, 457, 458, 468, 469, 479, 487, 488, 493, 519, 520, 521, 527, 528, 561, 567, 628, 630, 641, 642],
        '에스퍼': [385, 386, 439, 475, 480, 481, 482, 488, 493, 517, 518, 561, 574, 575, 576, 577, 578, 579, 605, 606, 648],
        '벌레': [401, 402, 412, 413, 414, 415, 416, 451, 452, 469, 540, 541, 542, 543, 544, 545, 588, 589, 595, 596, 616, 617, 632],
        '바위': [299, 408, 409, 410, 411, 438, 464, 476, 524, 525, 526, 564, 565, 567, 639],
        '고스트': [425, 426, 429, 442, 477, 478, 479, 487, 562, 563, 592, 593, 607, 608, 609, 622, 623],
        '드래곤': [443, 444, 445, 483, 484, 487, 610, 611, 612, 621, 633, 634, 635, 643, 644, 646, 718],
        '악': [198, 215, 228, 229, 248, 275, 302, 318, 319, 332, 335, 342, 359, 430, 434, 435, 442, 452, 461, 491, 509, 510, 551, 552, 553, 560, 624, 625, 629, 630, 633, 634, 635, 658, 675],
        '강철': [81, 82, 205, 208, 212, 227, 304, 305, 306, 374, 375, 376, 379, 395, 410, 411, 436, 437, 448, 462, 476, 483, 485, 530, 589, 597, 598, 599, 623, 624, 625, 632, 638, 649, 679, 680, 681],
        '페어리': [35, 36, 39, 40, 122, 173, 174, 175, 176, 183, 184, 209, 210, 280, 281, 282, 303, 439, 468, 546, 547]
      },
      5: {
        '노말': [504, 505, 506, 507, 508, 519, 520, 521, 531, 572, 573, 585, 586, 626, 627, 628, 648],
        '불꽃': [498, 499, 500, 513, 514, 554, 555, 607, 608, 609, 631, 643, 653, 654, 655],
        '물': [501, 502, 503, 515, 516, 535, 536, 537, 550, 564, 565, 580, 581, 592, 593, 594, 647, 656, 657, 658],
        '전기': [522, 523, 587, 595, 596, 602, 603, 604, 618, 644, 659, 660, 661, 694, 695],
        '풀': [495, 496, 497, 511, 512, 540, 541, 542, 546, 547, 548, 549, 556, 585, 586, 590, 591, 640, 650, 651, 652],
        '얼음': [582, 583, 584, 613, 614, 615, 646],
        '격투': [532, 533, 534, 538, 539, 559, 560, 619, 620, 638, 639, 647, 648, 674, 675, 676, 701, 739, 740, 745, 759, 760],
        '독': [543, 544, 545, 568, 569, 590, 591, 690, 691],
        '땅': [529, 530, 551, 552, 553, 618, 622, 623, 645, 718, 749, 750],
        '비행': [519, 520, 521, 527, 528, 561, 566, 567, 580, 581, 587, 627, 628, 630, 641, 642, 645, 661, 663, 664, 665, 666, 667, 668, 669, 670, 671, 701, 714, 715, 717, 722, 723, 724],
        '에스퍼': [517, 518, 527, 528, 561, 574, 575, 576, 577, 578, 579, 605, 606, 648, 655, 677, 678, 686, 687, 720, 765, 779, 786],
        '벌레': [540, 541, 542, 543, 544, 545, 557, 558, 588, 589, 595, 596, 616, 617, 632, 664, 665, 666, 736, 737, 738, 742, 743, 767, 768],
        '바위': [524, 525, 526, 564, 565, 566, 567, 622, 623, 639, 688, 689, 696, 697, 698, 699, 703],
        '고스트': [562, 563, 592, 593, 607, 608, 609, 622, 623, 678, 679, 680, 681, 708, 709, 710, 711, 720, 724, 769, 770, 778, 781],
        '드래곤': [610, 611, 612, 621, 633, 634, 635, 643, 644, 646, 691, 696, 697, 698, 704, 705, 706, 714, 715, 718, 776, 780, 782, 783, 784],
        '악': [509, 510, 551, 552, 553, 560, 570, 571, 624, 625, 629, 630, 633, 634, 635, 658, 675, 686, 687, 717, 720, 727, 799],
        '강철': [524, 525, 526, 530, 589, 597, 598, 599, 623, 624, 625, 632, 638, 649, 679, 680, 681, 797, 798, 801],
        '페어리': [546, 547, 669, 670, 671, 682, 683, 684, 685, 700, 703, 707, 716, 730, 778, 786, 788]
      },
      6: {
        '노말': [659, 660, 661, 667, 668, 676],
        '불꽃': [653, 654, 655, 662, 663, 664, 667, 668],
        '물': [656, 657, 658, 690, 691, 692, 693],
        '전기': [659, 660, 661, 694, 695, 702],
        '풀': [650, 651, 652, 672, 673],
        '얼음': [698, 699, 712, 713],
        '격투': [674, 675, 676, 701],
        '독': [690, 691],
        '땅': [718],
        '비행': [661, 663, 664, 665, 666, 667, 668, 669, 670, 671, 701, 714, 715, 717, 722, 723, 724],
        '에스퍼': [655, 677, 678, 686, 687, 720],
        '벌레': [664, 665, 666, 736, 737, 738],
        '바위': [688, 689, 696, 697, 698, 699, 703],
        '고스트': [678, 679, 680, 681, 708, 709, 710, 711, 720, 724],
        '드래곤': [691, 696, 697, 698, 704, 705, 706, 714, 715, 718],
        '악': [658, 675, 686, 687, 717, 720, 727],
        '강철': [679, 680, 681, 703, 707],
        '페어리': [669, 670, 671, 682, 683, 684, 685, 700, 703, 707, 716, 730]
      },
      7: {
        '노말': [734, 735, 759, 760, 765, 772, 775, 780],
        '불꽃': [725, 726, 727, 741, 757, 758],
        '물': [728, 729, 730, 746, 747, 748, 751, 752, 771],
        '전기': [737, 738, 777, 785],
        '풀': [722, 723, 724, 753, 754, 755, 756, 781, 787],
        '얼음': [712, 713, 739, 740],
        '격투': [739, 740, 745, 759, 760, 766, 794],
        '독': [747, 748, 757, 758, 793],
        '땅': [749, 750],
        '비행': [722, 723, 724, 741, 774, 787],
        '에스퍼': [765, 779, 786],
        '벌레': [736, 737, 738, 742, 743, 767, 768],
        '바위': [744, 745, 774, 776],
        '고스트': [769, 770, 778, 781, 792],
        '드래곤': [776, 780, 782, 783, 784],
        '악': [799],
        '강철': [777, 797, 798, 801],
        '페어리': [778, 788]
      },
      8: {
        '노말': [819, 820, 831, 832, 862, 863],
        '불꽃': [813, 814, 815, 838, 839, 850],
        '물': [816, 817, 818, 833, 834, 835, 836, 846, 847],
        '전기': [835, 836, 848, 849],
        '풀': [810, 811, 812, 829, 830, 840, 841, 842, 893],
        '얼음': [872, 873, 875, 881],
        '격투': [870, 871, 889, 890, 891, 892],
        '독': [747, 748, 843, 844],
        '땅': [843, 844, 867, 868],
        '비행': [820, 821, 822, 823, 842, 845],
        '에스퍼': [856, 857, 858, 876, 877, 878, 898],
        '벌레': [825, 826, 850, 872, 873],
        '바위': [837, 838, 839, 874],
        '고스트': [854, 855, 864, 885, 886, 887, 888, 896],
        '드래곤': [882, 883, 884, 885, 886, 887, 894, 895],
        '악': [827, 828, 859, 860, 861, 862, 863, 893],
        '강철': [863, 878, 879, 884, 888],
        '페어리': [868, 869]
      },
      9: {
        '노말': [819, 820, 831, 832, 915, 916, 921, 922, 924, 925, 967, 968],
        '불꽃': [909, 910, 911, 935, 936, 937],
        '물': [912, 913, 914, 961, 962, 963, 964, 965],
        '전기': [921, 922, 940, 941],
        '풀': [906, 907, 908, 927, 928, 952, 953],
        '얼음': [974, 975, 996],
        '격투': [949, 950, 951, 973],
        '독': [927, 928, 944, 945],
        '땅': [967, 968, 984],
        '비행': [916, 917, 918, 919, 931, 962, 963, 964, 965, 973],
        '에스퍼': [976, 977, 978, 1001, 1002, 1003],
        '벌레': [919, 920, 946, 947, 948],
        '바위': [932, 933, 934],
        '고스트': [971, 972, 987, 988, 989, 999, 1000],
        '드래곤': [996, 997, 1007, 1008, 1009],
        '악': [923, 924, 925, 944, 945, 970, 983, 1005],
        '강철': [957, 958, 959, 960, 990],
        '페어리': [954, 955, 956, 985, 986, 1001, 1002, 1003]
      }
    };

    return pokemonData[generation]?.[type] || [];
  }

  getHelpMessage() {
    return `🤖 **포켓몬 챗봇 도움말**

다음과 같은 명령어를 사용할 수 있습니다:

🔍 **포켓몬 정보 조회**
• "피카츄 정보 보여줘"
• "리자몽 능력치 알려줘"
• "도감번호 25번" 또는 "120번 포켓몬"

⚡ **타입별 포켓몬 검색**
• "전기 타입 포켓몬 알려줘"
• "불꽃 타입은 어떤 포켓몬들이 있어?"

🔎 **포켓몬 검색**
• "불꽃으로 시작하는 포켓몬 찾아줘"
• "전기 포켓몬 검색"

⚔️ **타입 상성 정보**
• "전기 타입 상성 알려줘"
• "불꽃이 물에 어떤 효과인지 알려줘"
• "피카츄의 약점은 뭐야?"

🌟 **세대별 포켓몬**
• "1세대 포켓몬 알려줘"
• "관동지방 포켓몬들 보여줘"
• "3세대에는 어떤 포켓몬들이 있어?"

🔥 **복합 질문 (NEW!)**
• "1세대 드래곤 타입 포켓몬 알려줘"
• "관동지방 전기 타입 포켓몬들"
• "3세대 불꽃 타입은 어떤 포켓몬들이 있어?"

⚔️ **타입 간 상성 (NEW!)**
• "전기와 물 타입 상성 알려줘"
• "불꽃 vs 물 타입 효과는?"
• "격투와 고스트 타입 상성"

📋 **기타**
• "포켓몬 타입들 알려줘"
• "quit" 또는 "exit"로 종료

💡 자연스럽게 대화하듯이 말씀해 주세요!`;
  }

  async quit() {
    if (this.mcpServerProcess) {
      this.mcpServerProcess.kill();
    }
    if (this.client) {
      await this.client.close();
    }
    this.isConnected = false;
    return '👋 포켓몬 챗봇을 종료합니다. 안녕히 가세요!';
  }
}

export default PokemonChatbot;

