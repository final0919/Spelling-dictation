/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Word, DictationConfig, DictationResult } from './types';
import { DEFAULT_WORDS } from './data/words';
import VocabularyManager from './components/VocabularyManager';
import DictationSetup from './components/DictationSetup';
import DictationSession from './components/DictationSession';
import DictationReport from './components/DictationReport';
import { Sparkles, BookOpen, Settings2, ShieldCheck, Keyboard, HelpCircle } from 'lucide-react';

const LOCAL_STORAGE_WORDS_KEY = 'dictation_words_dataset_v1';
const LOCAL_STORAGE_CONFIG_KEY = 'dictation_config_pref_v1';

export default function App() {
  // 1. Initial State Loaders
  const [words, setWords] = useState<Word[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [config, setConfig] = useState<DictationConfig>({
    selectionType: 'range',
    rangeStart: 1,
    rangeEnd: 15,
    customIds: '',
    mode: 'zh-to-en',
    repeatTimes: 3,
    interval: 10,
    autoNext: true,
    speakRate: 1.0,
    voiceLanguage: 'en-US',
    voiceName: '',
    soundEngine: 'youdao',
    shuffle: false
  });

  // Active Dictation State: 'idle' | 'active' | 'report'
  const [appState, setAppState] = useState<'idle' | 'active' | 'report'>('idle');
  const [activeSessionWords, setActiveSessionWords] = useState<Word[]>([]);
  const [activeSessionResults, setActiveSessionResults] = useState<DictationResult[]>([]);

  // Sub-tab selection for the idle screen: 'setup' | 'manage'
  const [idleTab, setIdleTab] = useState<'setup' | 'manage'>('setup');

  // Load dataset and config from localStorage on mount
  useEffect(() => {
    // Words
    const savedWords = localStorage.getItem(LOCAL_STORAGE_WORDS_KEY);
    if (savedWords) {
      try {
        const parsed = JSON.parse(savedWords);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWords(parsed);
          setSelectedIds(parsed.map(w => w.id));
        } else {
          setWords(DEFAULT_WORDS);
          setSelectedIds(DEFAULT_WORDS.map(w => w.id));
        }
      } catch (e) {
        setWords(DEFAULT_WORDS);
        setSelectedIds(DEFAULT_WORDS.map(w => w.id));
      }
    } else {
      setWords(DEFAULT_WORDS);
      setSelectedIds(DEFAULT_WORDS.map(w => w.id));
    }

    // Config
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        // use default
      }
    }
  }, []);

  // Save words to localStorage whenever they change
  useEffect(() => {
    if (words.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_WORDS_KEY, JSON.stringify(words));
    }
  }, [words]);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  // 2. Action Handlers
  const handleStartDictation = (targetWords: Word[]) => {
    // Trigger session
    setActiveSessionWords(targetWords);
    setAppState('active');
  };

  const handleFinishDictation = (results: DictationResult[]) => {
    setActiveSessionResults(results);
    setAppState('report');
  };

  const handleReviewIncorrect = (incorrectWords: Word[]) => {
    // Quick-start a session with just the incorrect words
    setActiveSessionWords(incorrectWords);
    setAppState('active');
  };

  const handleGoHome = () => {
    setAppState('idle');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-200 flex flex-col font-sans transition-colors duration-200 select-none">
      
      {/* Dynamic Navigation Header banner */}
      <header className="bg-[#0f0f12] border-b border-white/5 py-4 px-6 sticky top-0 z-50 shadow-lg/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & title branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center font-serif italic text-amber-500 font-bold text-lg shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              LM
            </div>
            <div>
              <h1 className="text-lg font-serif italic tracking-wide text-amber-100 flex items-center gap-2">
                LexiMaster
                <span className="text-[10px] font-sans not-italic font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  高考高频听写套件
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                支持听中拼英、标准听英默写、混听自测，数据本地保存
              </p>
            </div>
          </div>

          {/* Quick instructions / tips link */}
          <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              本地安全存储
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Keyboard className="w-4 h-4 text-amber-500" />
              支持全键盘操作
            </span>
          </div>

        </div>
      </header>

      {/* Main Body Stage Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {appState === 'idle' && (
          <div className="space-y-6">
            
            {/* Elegant Welcome Info card */}
            <div className="bg-gradient-to-r from-amber-500/10 via-[#0f0f12] to-amber-500/5 border border-white/5 rounded-3xl p-6 sm:p-8 text-slate-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] px-3 py-1 rounded-full font-bold tracking-widest uppercase inline-block">
                  欢迎进入听写沙盒 🚀
                </span>
                <h2 className="text-2xl font-serif italic text-amber-100 tracking-wide">高考高频 688 核心词汇精选听写自测</h2>
                <p className="text-xs leading-relaxed text-slate-400 max-w-xl">
                  当前听写套件已默认加载了 <strong className="text-amber-200 font-semibold font-serif">200个精选高考核心常考词汇</strong>。您可以配置词义听写范围，定制发音人音速和朗读重复次数。
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto shrink-0">
                <button
                  id="tab-btn-setup"
                  onClick={() => setIdleTab('setup')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase border transition duration-200 ${
                    idleTab === 'setup'
                      ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  听写参数设置
                </button>
                <button
                  id="tab-btn-manage"
                  onClick={() => setIdleTab('manage')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase border transition duration-200 ${
                    idleTab === 'manage'
                      ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  管理当前词库 ({words.length})
                </button>
              </div>
            </div>

            {/* Content Stage based on tabs */}
            <div className="grid grid-cols-1 gap-6">
              {idleTab === 'setup' ? (
                <DictationSetup
                  words={words}
                  selectedIds={selectedIds}
                  config={config}
                  setConfig={setConfig}
                  onStart={handleStartDictation}
                />
              ) : (
                <VocabularyManager
                  words={words}
                  setWords={setWords}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                />
              )}
            </div>

          </div>
        )}

        {appState === 'active' && (
          <div className="animate-fadeIn">
            <DictationSession
              selectedWords={activeSessionWords}
              config={config}
              onFinish={handleFinishDictation}
              onCancel={handleGoHome}
            />
          </div>
        )}

        {appState === 'report' && (
          <div className="animate-fadeIn">
            <DictationReport
              results={activeSessionResults}
              onReviewIncorrect={handleReviewIncorrect}
              onGoHome={handleGoHome}
              voiceLanguage={config.voiceLanguage}
              speakRate={config.speakRate}
            />
          </div>
        )}
      </main>

      {/* Decorative clean footer */}
      <footer className="py-6 border-t border-white/5 text-center text-[11px] text-slate-500 mt-auto bg-[#0a0a0b]">
        <p className="max-w-md mx-auto leading-relaxed">
          LexiMaster 智能拼写听写沙盒套件 &copy; 2026. 兼容PC及平板、移动客户端。
          <br />
          <span className="text-slate-600 font-mono text-[10px]">STANDARD WEB SPEECH SYNTHESIS ENGINE LOADED</span>
        </p>
      </footer>
    </div>
  );
}
