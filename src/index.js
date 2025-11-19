#!/usr/bin/env node

import readline from 'readline';
import PokemonChatbot from './chatbot.js';

class PokemonChatbotApp {
  constructor() {
    this.chatbot = new PokemonChatbot();
    this.rl = null;
  }

  async start() {
    try {
      await this.chatbot.start();
      this.setupReadline();
      this.showWelcomeMessage();
      this.startChat();
    } catch (error) {
      console.error('❌ 애플리케이션 시작 중 오류:', error.message);
      process.exit(1);
    }
  }

  setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🎮 포켓몬 챗봇> '
    });

    this.rl.on('close', async () => {
      await this.chatbot.quit();
      console.log('\n👋 포켓몬 챗봇을 종료합니다.');
      process.exit(0);
    });
  }

  showWelcomeMessage() {
    console.log('');
    console.log('🎉 포켓몬 챗봇에 오신 것을 환영합니다!');
    console.log('💬 무엇을 도와드릴까요?');
    console.log('');
  }

  startChat() {
    this.rl.prompt();

    this.rl.on('line', async (input) => {
      const userInput = input.trim();
      
      if (userInput === '') {
        this.rl.prompt();
        return;
      }

      console.log(''); // 빈 줄 추가
      
      try {
        const response = await this.chatbot.processMessage(userInput);
        console.log(response);
      } catch (error) {
        console.log(`❌ 오류가 발생했습니다: ${error.message}`);
      }

      console.log(''); // 빈 줄 추가
      this.rl.prompt();
    });
  }
}

// 애플리케이션 시작
const app = new PokemonChatbotApp();
app.start().catch(console.error);

