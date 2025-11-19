#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import PokemonAPI from './pokemon-api.js';
import axios from 'axios';

class PokemonMCPServer {
  constructor() {
    this.pokemonAPI = new PokemonAPI();
    this.server = new Server(
      {
        name: 'pokemon-mcp-server',
        version: '1.0.0',
        description: '포켓몬 정보를 조회하고 검색할 수 있는 MCP 서버입니다. 한국어 포켓몬 이름을 지원하며, 타입별 검색, 능력치 조회 등의 기능을 제공합니다.',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // 도구 목록 제공
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_pokemon_info',
            description: '포켓몬의 상세 정보를 조회합니다. 이름이나 ID로 검색할 수 있습니다.',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: '포켓몬 이름 또는 ID',
                },
              },
              required: ['identifier'],
            },
          },
          {
            name: 'get_pokemon_by_type',
            description: '특정 타입의 포켓몬 목록을 조회합니다.',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: '포켓몬 타입 (예: 전기, 불꽃, 물, 풀 등)',
                },
              },
              required: ['type'],
            },
          },
          {
            name: 'get_pokemon_types',
            description: '모든 포켓몬 타입 목록을 조회합니다.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'search_pokemon',
            description: '포켓몬 이름으로 검색합니다.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '검색할 포켓몬 이름 (일부만 입력해도 됩니다)',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_pokemon_stats',
            description: '포켓몬의 능력치 정보를 조회합니다.',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: '포켓몬 이름 또는 ID',
                },
              },
              required: ['identifier'],
            },
          },
        ],
      };
    });

    // 도구 실행 처리
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_pokemon_info':
            return await this.handleGetPokemonInfo(args.identifier);

          case 'get_pokemon_by_type':
            return await this.handleGetPokemonByType(args.type);

          case 'get_pokemon_types':
            return await this.handleGetPokemonTypes();

          case 'search_pokemon':
            return await this.handleSearchPokemon(args.query);

          case 'get_pokemon_stats':
            return await this.handleGetPokemonStats(args.identifier);

          default:
            throw new Error(`알 수 없는 도구: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `오류가 발생했습니다: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleGetPokemonInfo(identifier) {
    const pokemon = await this.pokemonAPI.getPokemonByName(identifier);
    
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

    // 이미지 다운로드 및 base64 인코딩
    let imageContent = null;
    try {
      const imageResponse = await axios.get(pokemon.sprite, { 
        responseType: 'arraybuffer' 
      });
      const base64Image = Buffer.from(imageResponse.data).toString('base64');
      imageContent = {
        type: 'image',
        data: base64Image,
        mimeType: 'image/png'
      };
    } catch (error) {
      console.error('이미지 로드 실패:', error.message);
    }

    const content = [
      {
        type: 'text',
        text: `🔍 **${pokemon.koreanName} (${pokemon.name})**

📊 **기본 정보**
• ID: #${pokemon.id.toString().padStart(3, '0')}
• 키: ${pokemon.height}m
• 몸무게: ${pokemon.weight}kg

⚡ **타입**: ${typesText}

🌟 **특성**: ${abilitiesText}

📈 **능력치**
${statsText}`,
      }
    ];

    // 이미지가 성공적으로 로드되었으면 추가
    if (imageContent) {
      content.push(imageContent);
    }

    return { content };
  }

  async handleGetPokemonByType(type) {
    const result = await this.pokemonAPI.getPokemonByType(type);
    
    const pokemonList = result.pokemon.slice(0, 20).map(p => 
      `• ${p.koreanName} (${p.name})`
    ).join('\n');

    const moreCount = result.pokemonCount > 20 ? `\n\n... 그리고 ${result.pokemonCount - 20}마리 더!` : '';

    return {
      content: [
        {
          type: 'text',
          text: `⚡ **${result.typeKorean} 타입 포켓몬들** (총 ${result.pokemonCount}마리)

${pokemonList}${moreCount}

💡 더 자세한 정보를 원하시면 특정 포켓몬 이름을 말씀해 주세요!`,
        },
      ],
    };
  }

  async handleGetPokemonTypes() {
    const types = await this.pokemonAPI.getPokemonTypes();
    
    const typesText = types.map(t => `• ${t.koreanName} (${t.name})`).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `🎯 **모든 포켓몬 타입**

${typesText}

💡 특정 타입의 포켓몬들을 보고 싶으시면 "전기 타입 포켓몬 알려줘" 같은 식으로 말씀해 주세요!`,
        },
      ],
    };
  }

  async handleSearchPokemon(query) {
    const results = await this.pokemonAPI.searchPokemon(query);
    
    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `"${query}"에 해당하는 포켓몬을 찾을 수 없습니다. 다른 이름으로 검색해 보세요!`,
          },
        ],
      };
    }

    const resultsText = results.slice(0, 10).map(p => 
      `• ${p.koreanName} (${p.name})`
    ).join('\n');

    const moreCount = results.length > 10 ? `\n\n... 그리고 ${results.length - 10}마리 더!` : '';

    return {
      content: [
        {
          type: 'text',
          text: `🔍 **"${query}" 검색 결과** (${results.length}마리 발견)

${resultsText}${moreCount}

💡 더 자세한 정보를 원하시면 특정 포켓몬 이름을 말씀해 주세요!`,
        },
      ],
    };
  }

  async handleGetPokemonStats(identifier) {
    const pokemon = await this.pokemonAPI.getPokemonByName(identifier);
    
    const statsDetail = pokemon.stats.map(stat => {
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

    // 이미지 다운로드 및 base64 인코딩
    let imageContent = null;
    try {
      const imageResponse = await axios.get(pokemon.sprite, { 
        responseType: 'arraybuffer' 
      });
      const base64Image = Buffer.from(imageResponse.data).toString('base64');
      imageContent = {
        type: 'image',
        data: base64Image,
        mimeType: 'image/png'
      };
    } catch (error) {
      console.error('이미지 로드 실패:', error.message);
    }

    const content = [
      {
        type: 'text',
        text: `📊 **${pokemon.koreanName}의 능력치 상세**

${statsDetail}

💡 능력치는 0~255 범위이며, 바 차트는 대략적인 수치를 나타냅니다.`,
      }
    ];

    // 이미지가 성공적으로 로드되었으면 추가
    if (imageContent) {
      content.push(imageContent);
    }

    return { content };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('포켓몬 MCP 서버가 시작되었습니다! 🎮');
  }
}

// 서버 실행
const server = new PokemonMCPServer();
server.run().catch(console.error);

