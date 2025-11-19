#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import PokemonAPI from './pokemon-api.js';
import PokemonChatbot from './chatbot.js';

class PokemonWebServer {
  constructor() {
    this.app = express();
    this.pokemonAPI = new PokemonAPI();
    this.chatbot = new PokemonChatbot();
    this.port = process.env.PORT || 3001;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS 설정
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];

    this.app.use(
      cors({
        origin: (origin, callback) => {
          // 개발 편의를 위해 origin 없을 때 (예: Insomnia) 허용
          if (!origin) {
            return callback(null, true);
          }
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          console.warn(`CORS 차단: ${origin}`);
          return callback(new Error('CORS not allowed'), false);
        },
        credentials: true
      })
    );

    // JSON 파싱
    this.app.use(express.json());

    // 요청 로깅
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Pokemon API Routes
    this.app.get('/api/pokemon', async (req, res) => {
      try {
        const { offset = 0, limit = 20 } = req.query;
        
        // 간단한 포켓몬 목록 반환 (첫 20마리)
        const pokemonIds = Array.from({ length: parseInt(limit) }, (_, i) => i + 1 + parseInt(offset));
        
        const pokemonList = await Promise.all(
          pokemonIds.map(async (id) => {
            try {
              return await this.pokemonAPI.getPokemonById(id);
            } catch (error) {
              console.error(`Failed to fetch Pokemon ${id}:`, error.message);
              return null;
            }
          })
        );

        // null 값 제거
        const validPokemonList = pokemonList.filter(pokemon => pokemon !== null);
        
        res.json(validPokemonList);
      } catch (error) {
        console.error('Pokemon list error:', error);
        res.status(500).json({ error: '포켓몬 목록을 가져오는데 실패했습니다.' });
      }
    });

    this.app.get('/api/pokemon/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const pokemon = await this.pokemonAPI.getPokemonByName(id);
        res.json(pokemon);
      } catch (error) {
        console.error('Pokemon detail error:', error);
        res.status(404).json({ error: '포켓몬을 찾을 수 없습니다.' });
      }
    });

    this.app.get('/api/type/:type', async (req, res) => {
      try {
        const { type } = req.params;
        const result = await this.pokemonAPI.getPokemonByType(type);
        res.json(result.pokemon);
      } catch (error) {
        console.error('Pokemon by type error:', error);
        res.status(404).json({ error: '타입별 포켓몬을 찾을 수 없습니다.' });
      }
    });

    this.app.get('/api/types', async (req, res) => {
      try {
        const types = await this.pokemonAPI.getPokemonTypes();
        res.json(types);
      } catch (error) {
        console.error('Pokemon types error:', error);
        res.status(500).json({ error: '포켓몬 타입 목록을 가져오는데 실패했습니다.' });
      }
    });

    this.app.get('/api/search', async (req, res) => {
      try {
        const { q } = req.query;
        if (!q) {
          return res.status(400).json({ error: '검색어가 필요합니다.' });
        }
        
        const results = await this.pokemonAPI.searchPokemon(q);
        
        // 검색 결과에 상세 정보 추가
        const detailedResults = await Promise.all(
          results.slice(0, 20).map(async (pokemon) => {
            try {
              const detailedPokemon = await this.pokemonAPI.getPokemonByName(pokemon.name);
              return detailedPokemon;
            } catch (error) {
              console.error(`Failed to get details for ${pokemon.name}:`, error.message);
              return pokemon; // 기본 정보만 반환
            }
          })
        );
        
        res.json(detailedResults);
      } catch (error) {
        console.error('Pokemon search error:', error);
        res.status(500).json({ error: '포켓몬 검색에 실패했습니다.' });
      }
    });

    this.app.get('/api/pokemon/:id/stats', async (req, res) => {
      try {
        const { id } = req.params;
        const pokemon = await this.pokemonAPI.getPokemonByName(id);
        res.json(pokemon.stats);
      } catch (error) {
        console.error('Pokemon stats error:', error);
        res.status(404).json({ error: '포켓몬 능력치를 찾을 수 없습니다.' });
      }
    });

    // Chat API Routes
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { message } = req.body;
        if (!message) {
          return res.status(400).json({ error: '메시지가 필요합니다.' });
        }

        // 챗봇을 MCP 없이 직접 API 모드로 초기화
        if (!this.chatbot.isInitialized) {
          this.chatbot.isConnected = false; // MCP 연결 비활성화
          this.chatbot.isInitialized = true;
        }

        const response = await this.chatbot.processMessage(message);
        res.json({ message: response });
      } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'AI 어시스턴트와의 통신에 실패했습니다.' });
      }
    });

    this.app.get('/api/chat/history', (req, res) => {
      // 간단한 채팅 기록 저장 (실제로는 데이터베이스 사용)
      res.json({ history: [] });
    });

    this.app.delete('/api/chat/history', (req, res) => {
      // 채팅 기록 삭제
      res.json({ message: '채팅 기록이 삭제되었습니다.' });
    });

    // 404 핸들러
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'API 엔드포인트를 찾을 수 없습니다.' });
    });

    // 에러 핸들러
    this.app.use((error, req, res, next) => {
      console.error('Server error:', error);
      res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    });
  }

  async start() {
    try {
      // 챗봇을 MCP 없이 직접 API 모드로 초기화
      this.chatbot.isConnected = false;
      this.chatbot.isInitialized = true;
      
      this.app.listen(this.port, () => {
        console.log(`🚀 Pokedex Assistant API 서버가 시작되었습니다!`);
        console.log(`📡 서버 주소: http://localhost:${this.port}`);
        console.log(`🔗 API 문서: http://localhost:${this.port}/health`);
        console.log('');
        console.log('📋 사용 가능한 API 엔드포인트:');
        console.log('  GET  /api/pokemon - 포켓몬 목록');
        console.log('  GET  /api/pokemon/:id - 포켓몬 상세 정보');
        console.log('  GET  /api/type/:type - 타입별 포켓몬');
        console.log('  GET  /api/types - 모든 포켓몬 타입');
        console.log('  GET  /api/search?q=query - 포켓몬 검색');
        console.log('  POST /api/chat - AI 어시스턴트 채팅');
        console.log('');
      });
    } catch (error) {
      console.error('서버 시작 중 오류:', error);
      process.exit(1);
    }
  }
}

// 서버 실행
const server = new PokemonWebServer();
server.start().catch(console.error);
