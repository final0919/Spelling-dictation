/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Word {
  id: number;         // 序号
  frequency: number;  // 考频
  word: string;       // 单词
  phonetic: string;   // 音标
  translation: string; // 词义
}

export type DictationMode = 'zh-to-en' | 'en-to-zh' | 'mixed';

export interface DictationConfig {
  selectionType: 'range' | 'custom';
  rangeStart: number;
  rangeEnd: number;
  customIds: string; // Comma or space-separated list of IDs, e.g. "1, 3, 5, 10-15"
  mode: DictationMode;
  repeatTimes: number; // 每个单词重复次数，默认3次
  interval: number; // 每次间隔时间(秒)，默认10秒
  autoNext: boolean; // 是否自动下一个
  speakRate: number; // 语速 0.5 - 2
  voiceLanguage: string; // 默认发音语言
  voiceName: string; // 默认发音人名称
  soundEngine: 'youdao' | 'local'; // 默认发音引擎
}

export interface DictationItem {
  word: Word;
  displayPrompt: string; // 听写时展示给用户的提示 (如中文含义，或英文单词本身)
  speakText: string;     // 听写时朗读的文本 (对应语音发音)
  speakLanguage: 'en' | 'zh'; // 朗读语言
  correctSpelling: string; // 正确拼写/答案
  answerType: 'spell-en' | 'translate-zh'; // 听写模式类型
  itemMode: 'zh-to-en' | 'en-to-zh'; // 当前项的具体模式
}

export interface DictationResult {
  word: Word;
  prompt: string;
  speakLanguage: 'en' | 'zh';
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  skipped: boolean;
}
