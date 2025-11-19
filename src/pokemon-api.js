import axios from "axios";
import {
  POKEMON_API_BASE_URL,
  POKEMON_TYPES,
  POKEMON_TYPE_REVERSE,
} from "./config.js";
import { KOREAN_TO_ENGLISH, ENGLISH_TO_KOREAN } from "./pokemon-mappings.js";

class PokemonAPI {
  constructor() {
    this.baseURL = POKEMON_API_BASE_URL;
  }

  async getPokemonByName(name) {
    try {
      // 한국어 이름을 영어로 변환
      const englishName = this.getEnglishName(name) || name.toLowerCase();
      const response = await axios.get(
        `${this.baseURL}/pokemon/${englishName}`
      );
      return this.formatPokemonData(response.data);
    } catch (error) {
      throw new Error(`포켓몬 "${name}"을 찾을 수 없습니다.`);
    }
  }

  async getPokemonById(id) {
    try {
      const response = await axios.get(`${this.baseURL}/pokemon/${id}`);
      return this.formatPokemonData(response.data);
    } catch (error) {
      throw new Error(`ID ${id}에 해당하는 포켓몬을 찾을 수 없습니다.`);
    }
  }

  async getPokemonByType(type) {
    try {
      // 한국어 타입명을 영어로 변환
      const englishType = POKEMON_TYPES[type] || type.toLowerCase();

      const response = await axios.get(`${this.baseURL}/type/${englishType}`);

      const pokemonList = response.data.pokemon.map((pokemon) => ({
        name: pokemon.pokemon.name,
        koreanName: this.getKoreanName(pokemon.pokemon.name),
        url: pokemon.pokemon.url,
      }));

      return {
        type: type,
        typeKorean: type,
        pokemonCount: pokemonList.length,
        pokemon: pokemonList,
      };
    } catch (error) {
      throw new Error(`타입 "${type}"에 해당하는 포켓몬을 찾을 수 없습니다.`);
    }
  }

  async getPokemonTypes() {
    try {
      const response = await axios.get(`${this.baseURL}/type`);
      return response.data.results.map((type) => ({
        name: type.name,
        koreanName: POKEMON_TYPE_REVERSE[type.name] || type.name,
        url: type.url,
      }));
    } catch (error) {
      throw new Error("포켓몬 타입 목록을 가져올 수 없습니다.");
    }
  }

  async searchPokemon(query) {
    try {
      // 전체 포켓몬 목록을 가져와서 검색
      const response = await axios.get(`${this.baseURL}/pokemon?limit=1000`);
      const allPokemon = response.data.results;

      const results = allPokemon.filter(
        (pokemon) =>
          pokemon.name.toLowerCase().includes(query.toLowerCase()) ||
          this.getKoreanName(pokemon.name)
            .toLowerCase()
            .includes(query.toLowerCase())
      );

      return results.map((pokemon) => ({
        name: pokemon.name,
        koreanName: this.getKoreanName(pokemon.name),
        url: pokemon.url,
      }));
    } catch (error) {
      throw new Error("포켓몬 검색 중 오류가 발생했습니다.");
    }
  }

  formatPokemonData(data) {
    return {
      id: data.id,
      name: data.name,
      koreanName: this.getKoreanName(data.name),
      height: data.height / 10, // dm을 m로 변환
      weight: data.weight / 10, // hg를 kg로 변환
      types: data.types.map((type) => ({
        name: type.type.name,
        koreanName: POKEMON_TYPE_REVERSE[type.type.name] || type.type.name,
      })),
      abilities: data.abilities.map((ability) => ({
        name: ability.ability.name,
        isHidden: ability.is_hidden,
      })),
      stats: data.stats.map((stat) => ({
        name: stat.stat.name,
        baseStat: stat.base_stat,
      })),
      sprite: data.sprites.front_default,
    };
  }

  getEnglishName(koreanName) {
    return KOREAN_TO_ENGLISH[koreanName] || null;
  }

  getKoreanName(englishName) {
    return ENGLISH_TO_KOREAN[englishName.toLowerCase()] || englishName;
  }
}

export default PokemonAPI;
