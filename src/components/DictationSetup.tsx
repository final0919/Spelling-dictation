/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { DictationConfig, Word } from '../types';
import { parseCustomIds } from '../utils/parser';
import { Settings2, Play, Sliders, Volume2, HelpCircle } from 'lucide-react';

interface DictationSetupProps {
  words: Word[];
  selectedIds: number[];
  config: DictationConfig;
  setConfig: React.Dispatch<React.SetStateAction<DictationConfig>>;
  onStart: (selectedWords: Word[]) => void;
}

export default function DictationSetup({
  words,
  selectedIds,
  config,
  setConfig,
  onStart
}: DictationSetupProps) {
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  
  // Local configuration states to display warnings if input is malformed
  const [customRangeError, setCustomRangeError] = useState<string>('');
  const [setupError, setSetupError] = useState<string>('');

  // Fetch available Web Speech voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Respect existing config voiceName if found
        if (config.voiceName && voices.some(v => v.name === config.voiceName)) {
          setSelectedVoiceName(config.voiceName);
        } else {
          // Pick a default English voice
          const defaultEng = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')));
          if (defaultEng) {
            setSelectedVoiceName(defaultEng.name);
            setConfig(prev => ({ ...prev, voiceLanguage: defaultEng.lang, voiceName: defaultEng.name }));
          } else if (voices.length > 0) {
            setSelectedVoiceName(voices[0].name);
            setConfig(prev => ({ ...prev, voiceLanguage: voices[0].lang, voiceName: voices[0].name }));
          }
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [setConfig, config.voiceName]);

  // Max ID in the current word dataset
  const maxWordId = words.length > 0 ? Math.max(...words.map(w => w.id)) : 0;

  // Compute selected words list based on setup choice
  const targetWordsForDictation = React.useMemo(() => {
    if (config.selectionType === 'range') {
      const start = config.rangeStart;
      const end = config.rangeEnd;
      // Filter words with IDs inside the range
      const minVal = Math.min(start, end);
      const maxVal = Math.max(start, end);
      return words.filter(w => w.id >= minVal && w.id <= maxVal);
    } else {
      // Custom selection parsing (e.g. "1-15, 30-45")
      const parsedIds = parseCustomIds(config.customIds, maxWordId);
      if (parsedIds.length > 0) {
        return words.filter(w => parsedIds.includes(w.id));
      }
      // Fallback: If custom text is empty or parses to nothing, use checkbox-selected words
      return words.filter(w => selectedIds.includes(w.id));
    }
  }, [config, words, selectedIds, maxWordId]);

  const handleStartSession = () => {
    if (targetWordsForDictation.length === 0) {
      setSetupError('听写单词数量为0，请选择要听写的序号范围、输入有效的自定义序号或者在下方列表勾选单词！');
      return;
    }
    setSetupError('');
    onStart(targetWordsForDictation);
  };

  // Watch custom range formatting
  const handleCustomIdsChange = (val: string) => {
    setConfig(prev => ({ ...prev, customIds: val }));
    setSetupError('');
    if (!val.trim()) {
      setCustomRangeError('');
      return;
    }
    const parsed = parseCustomIds(val, maxWordId);
    if (parsed.length === 0) {
      setCustomRangeError('请输入正确的格式，例如 "1-15, 30, 45"');
    } else {
      setCustomRangeError(`已匹配出 ${parsed.length} 个单词，ID 范围在 ${Math.min(...parsed)}~${Math.max(...parsed)} 之间`);
    }
  };

  return (
    <div id="dictation-setup-panel" className="bg-[#0f0f12] rounded-2xl border border-white/5 p-6 shadow-xl">
      <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
        <Settings2 className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-serif italic text-amber-100">听写参数设置 Suite</h2>
      </div>

      <div className="space-y-6">
        {/* Word Selection Mode */}
        <div>
          <label className="block text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-3">
            1. 选择要听写的单词序号 Range Selection
          </label>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              id="btn-select-by-range"
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, selectionType: 'range' }))}
              className={`p-4 rounded-xl border text-left transition duration-200 cursor-pointer ${
                config.selectionType === 'range'
                  ? 'border-amber-500/40 bg-amber-500/5 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'border-white/5 hover:border-white/10 bg-black/20 text-slate-400'
              }`}
            >
              <span className="text-sm font-semibold block">连续范围选择 🔢</span>
              <span className="text-[11px] text-slate-500 mt-1 block leading-normal">
                选择一段连续的区间（如 1~15，或 30~45）
              </span>
            </button>
            <button
              id="btn-select-by-custom"
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, selectionType: 'custom' }))}
              className={`p-4 rounded-xl border text-left transition duration-200 cursor-pointer ${
                config.selectionType === 'custom'
                  ? 'border-amber-500/40 bg-amber-500/5 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'border-white/5 hover:border-white/10 bg-black/20 text-slate-400'
              }`}
            >
              <span className="text-sm font-semibold block">自选/勾选列表 📝</span>
              <span className="text-[11px] text-slate-500 mt-1 block leading-normal">
                支持逗号连字符格式，或在下方列表勾选单词
              </span>
            </button>
          </div>

          {/* Conditional Input Fields */}
          {config.selectionType === 'range' ? (
            <div id="range-selector-inputs" className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-wrap items-center gap-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">起始序号:</span>
                <input
                  id="range-start-input"
                  type="number"
                  min={1}
                  max={maxWordId}
                  value={config.rangeStart}
                  onChange={(e) => setConfig(prev => ({ ...prev, rangeStart: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                  className="w-20 p-2 text-sm bg-black/50 border border-white/10 rounded-lg text-center font-mono font-bold text-amber-200 outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="h-4 w-px bg-white/5 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">结束序号:</span>
                <input
                  id="range-end-input"
                  type="number"
                  min={1}
                  max={maxWordId}
                  value={config.rangeEnd}
                  onChange={(e) => setConfig(prev => ({ ...prev, rangeEnd: Math.min(maxWordId, parseInt(e.target.value, 10) || maxWordId) }))}
                  className="w-20 p-2 text-sm bg-black/50 border border-white/10 rounded-lg text-center font-mono font-bold text-amber-200 outline-none focus:border-amber-500/50"
                />
              </div>
              <span className="text-xs font-serif italic text-amber-500/80 ml-auto">
                已选中 {targetWordsForDictation.length} 个单词
              </span>
            </div>
          ) : (
            <div id="custom-selector-inputs" className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2.5 animate-fadeIn">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-400">自选序号范围 / 离散序号列表：</span>
                <input
                  id="custom-ids-range-input"
                  type="text"
                  value={config.customIds}
                  onChange={(e) => handleCustomIdsChange(e.target.value)}
                  placeholder="例如: 1-15, 30-45, 52 (留空则默认为勾选表)"
                  className="w-full p-2.5 text-sm bg-black/50 border border-white/10 rounded-xl outline-none focus:border-amber-500/50 text-slate-200 placeholder:text-slate-600 font-mono"
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                {customRangeError ? (
                  <span className={`font-mono text-[11px] ${customRangeError.startsWith('已匹配') ? 'text-amber-400' : 'text-amber-500/80'}`}>
                    {customRangeError}
                  </span>
                ) : (
                  <span className="text-slate-500 leading-normal">
                    若输入框为空，则默认使用下方词库列表选中的 <span className="text-amber-400 font-mono font-semibold">{selectedIds.length}</span> 个词进行听写。
                  </span>
                )}
                <span className="font-serif italic text-amber-500 shrink-0">
                  当前计: {targetWordsForDictation.length}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Dictation Mode Choice */}
        <div>
          <label className="block text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-3">
            2. 选择听背模式 Mode Selection
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              id="btn-mode-zh-to-en"
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, mode: 'zh-to-en' }))}
              className={`p-4 rounded-xl border text-left transition duration-200 cursor-pointer ${
                config.mode === 'zh-to-en'
                  ? 'border-amber-500/40 bg-amber-500/5 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'border-white/5 hover:border-white/10 bg-black/20 text-slate-400'
              }`}
            >
              <span className="text-sm font-semibold block">看中文写英文 👀📝</span>
              <span className="text-[11px] text-slate-500 mt-1 block leading-normal">
                屏幕显示中文含义与释义，播放标准英文发音，在输入框中拼写写出正确的英文单词
              </span>
            </button>
            <button
              id="btn-mode-en-to-zh"
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, mode: 'en-to-zh' }))}
              className={`p-4 rounded-xl border text-left transition duration-200 cursor-pointer ${
                config.mode === 'en-to-zh'
                  ? 'border-amber-500/40 bg-amber-500/5 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'border-white/5 hover:border-white/10 bg-black/20 text-slate-400'
              }`}
            >
              <span className="text-sm font-semibold block">听英文默词义 🇺🇸🗣️</span>
              <span className="text-[11px] text-slate-500 mt-1 block leading-normal">
                播放标准美式英语发音（仅显示音标辅助），拼写出英文单词并在心中回忆对照中文释义
              </span>
            </button>
            <button
              id="btn-mode-mixed"
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, mode: 'mixed' }))}
              className={`p-4 rounded-xl border text-left transition duration-200 cursor-pointer ${
                config.mode === 'mixed'
                  ? 'border-amber-500/40 bg-amber-500/5 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'border-white/5 hover:border-white/10 bg-black/20 text-slate-400'
              }`}
            >
              <span className="text-sm font-semibold block">混合背写 🔀✍️</span>
              <span className="text-[11px] text-slate-500 mt-1 block leading-normal">
                “看中文写英文”与“听英文默词义”随机交替进行，双向训练，彻底消灭记忆盲区
              </span>
            </button>
          </div>
        </div>

        {/* Pronunciation repetition & Timer config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Repeat Times Slider */}
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-400">朗读频次 (每词重复播放次数)：</span>
              <span className="text-sm font-mono font-bold text-amber-400">{config.repeatTimes} 遍</span>
            </div>
            <input
              id="repeat-times-range"
              type="range"
              min={1}
              max={5}
              value={config.repeatTimes}
              onChange={(e) => setConfig(prev => ({ ...prev, repeatTimes: parseInt(e.target.value, 10) }))}
              className="w-full accent-amber-500 h-1.5 bg-white/5 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1.5 leading-normal">
              单词听写时发音人将按指定的数量循环朗读该词，加深声学记忆
            </span>
          </div>

          {/* Timer slider */}
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-400">自动切换间隔倒计时：</span>
              <span className="text-sm font-mono font-bold text-amber-400">
                {config.autoNext ? `${config.interval} 秒` : '手动点击切换'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="interval-seconds-range"
                type="range"
                min={5}
                max={30}
                step={1}
                disabled={!config.autoNext}
                value={config.interval}
                onChange={(e) => setConfig(prev => ({ ...prev, interval: parseInt(e.target.value, 10) }))}
                className="flex-1 accent-amber-500 h-1.5 bg-white/5 rounded-lg disabled:opacity-20 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <input
                  id="chk-auto-next"
                  type="checkbox"
                  checked={config.autoNext}
                  onChange={(e) => setConfig(prev => ({ ...prev, autoNext: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500/50 border-white/10 bg-black/40 accent-amber-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-400">自动跳转</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1.5 leading-normal">
              默认10秒。若关闭，拼写完该词后需手动敲回车或点击“下一词”跳转
            </span>
          </div>
        </div>

        {/* Audio setup details */}
        <div className="p-4 bg-black/30 rounded-xl border border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-500" />
              TTS 听写声音引擎与朗读音速定制
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">发音速度:</span>
              <select
                id="sel-speak-rate"
                value={config.speakRate}
                onChange={(e) => setConfig(prev => ({ ...prev, speakRate: parseFloat(e.target.value) }))}
                className="text-xs bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-slate-300 outline-none focus:border-amber-500/50"
              >
                <option value={0.6}>0.6x (极慢)</option>
                <option value={0.8}>0.8x (慢速)</option>
                <option value={1.0}>1.0x (常速)</option>
                <option value={1.2}>1.2x (偏快)</option>
                <option value={1.5}>1.5x (快速)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label htmlFor="sel-sound-engine" className="text-[10px] text-slate-500 font-bold block mb-1">朗读发音引擎 Voice Engine</label>
              <select
                id="sel-sound-engine"
                value={config.soundEngine || 'youdao'}
                onChange={(e) => {
                  const engine = e.target.value as 'youdao' | 'local';
                  setConfig(prev => ({ ...prev, soundEngine: engine }));
                }}
                className="w-full text-xs p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none text-slate-300 focus:border-amber-500/50"
              >
                <option value="youdao" className="bg-[#0f0f12]">网易有道云高保真真人发音 (推荐 🔊 无限速 100%有声)</option>
                <option value="local" className="bg-[#0f0f12]">浏览器系统本地合成 TTS (支持离线 / 选自定义发音人)</option>
              </select>
            </div>

            {(config.soundEngine === 'local') && (
              <div className="animate-fadeIn">
                <label htmlFor="sel-voice-voice" className="text-[10px] text-slate-500 font-bold block mb-1">选择本地合成发音人 Speech Synthesis Voice</label>
                <select
                  id="sel-voice-voice"
                  value={selectedVoiceName}
                  onChange={(e) => {
                    const voice = availableVoices.find(v => v.name === e.target.value);
                    if (voice) {
                      setSelectedVoiceName(voice.name);
                      setConfig(prev => ({ ...prev, voiceLanguage: voice.lang, voiceName: voice.name }));
                    }
                  }}
                  className="w-full text-xs p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none text-slate-300 focus:border-amber-500/50"
                >
                  <option value="" className="bg-[#0f0f12]">-- 自动选择默认高画质发音人 --</option>
                  {availableVoices.map((v) => (
                    <option key={v.name} value={v.name} className="bg-[#0f0f12]">
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Custom inline setup error */}
        {setupError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
            <HelpCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{setupError}</span>
          </div>
        )}

        {/* Big CTA button */}
        <button
          id="btn-start-dictation"
          onClick={handleStartSession}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] font-sans text-sm tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4.5 h-4.5 fill-current" />
          开始听写流程 Begin Session ({targetWordsForDictation.length} 个单词)
        </button>
      </div>
    </div>
  );
}
