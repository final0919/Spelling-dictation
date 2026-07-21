/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Word, DictationConfig, DictationItem, DictationResult } from '../types';
import { Volume2, Play, Pause, ArrowRight, CheckCircle, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

interface DictationSessionProps {
  selectedWords: Word[];
  config: DictationConfig;
  onFinish: (results: DictationResult[]) => void;
  onCancel: () => void;
}

export default function DictationSession({
  selectedWords,
  config,
  onFinish,
  onCancel
}: DictationSessionProps) {
  // 1. Convert Word list to concrete DictationItems
  const dictationItems = React.useMemo(() => {
    return selectedWords.map((word) => {
      // Decide mode for each word
      const actualMode: 'zh-to-en' | 'en-to-zh' = config.mode === 'mixed'
        ? (Math.random() > 0.5 ? 'zh-to-en' : 'en-to-zh')
        : config.mode;

      const speakText = word.word;
      const speakLanguage = 'en'; // Always play English pronunciation as requested
      const correctSpelling = word.word;
      const answerType = 'spell-en';
      const displayPrompt = actualMode === 'zh-to-en' ? '看中文写英文 👀📝' : '听英文默词义 🇺🇸🗣️';

      return {
        word,
        displayPrompt,
        speakText,
        speakLanguage,
        correctSpelling,
        answerType,
        itemMode: actualMode
      };
    });
  }, [selectedWords, config.mode]);

  // 2. Active Session States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(config.interval);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [currentRepetition, setCurrentRepetition] = useState(1);
  const [answersCovered, setAnswersCovered] = useState<DictationResult[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Refs for speech triggering and timer tracking
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeechPlayingRef = useRef(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentItem = dictationItems[currentIndex];

  // 3. Pronunciation triggering with automatic repetition handler
  const triggerPronunciation = (item: DictationItem, totalReps: number) => {
    // Clean up any ongoing TTS or Audio playback
    if (activeUtteranceRef.current) {
      activeUtteranceRef.current.onend = null;
      activeUtteranceRef.current.onerror = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.onended = null;
      activeAudioRef.current.onerror = null;
      activeAudioRef.current.pause();
      activeAudioRef.current.src = '';
    }
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    
    let repCount = 1;
    setCurrentRepetition(1);

    const playLocalSpeechBackup = () => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        isSpeechPlayingRef.current = false;
        return;
      }

      isSpeechPlayingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(item.speakText);
      activeUtteranceRef.current = utterance; // Keep strong ref to prevent garbage collection

      // Set speech settings and exact voice
      const voices = window.speechSynthesis.getVoices();
      if (item.speakLanguage === 'en') {
        const matchingVoice = voices.find(v => v.name === config.voiceName);
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        } else {
          utterance.lang = config.voiceLanguage || 'en-US';
        }
      } else {
        const zhVoice = voices.find(v => v.lang.startsWith('zh'));
        if (zhVoice) {
          utterance.voice = zhVoice;
        } else {
          utterance.lang = 'zh-CN';
        }
      }

      utterance.rate = config.speakRate;

      utterance.onend = () => {
        repCount += 1;
        speechTimerRef.current = setTimeout(() => {
          speakNext();
        }, 1300);
      };

      utterance.onerror = (e) => {
        isSpeechPlayingRef.current = false;
        if (e.error !== 'interrupted') {
          repCount += 1;
          speechTimerRef.current = setTimeout(() => {
            speakNext();
          }, 1300);
        }
      };

      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    };

    const speakNext = () => {
      if (repCount > totalReps || currentIndex >= dictationItems.length || showExitConfirm) {
        isSpeechPlayingRef.current = false;
        return;
      }

      isSpeechPlayingRef.current = true;
      setCurrentRepetition(repCount);

      if (config.soundEngine === 'youdao') {
        let fallbackTriggered = false;
        const triggerLocalBackup = () => {
          if (fallbackTriggered) return;
          fallbackTriggered = true;
          playLocalSpeechBackup();
        };

        // High quality human voice via NetEase Youdao dictionary API
        const langType = item.speakLanguage === 'en' ? 'type=2' : 'le=zh';
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(item.speakText)}&${langType}`;
        
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        // Apply rate adjusting
        audio.playbackRate = config.speakRate;

        audio.onended = () => {
          repCount += 1;
          speechTimerRef.current = setTimeout(() => {
            speakNext();
          }, 1300);
        };

        audio.onerror = () => {
          console.warn("Youdao sound engine failed, falling back to local TTS engine.");
          triggerLocalBackup();
        };

        audio.play().catch((err) => {
          console.warn("Youdao autoplay blocked or failed, trying local backup:", err);
          triggerLocalBackup();
        });
      } else {
        // Use local system browser speech synthesis engine directly
        playLocalSpeechBackup();
      }
    };

    speakNext();
  };

  // Trigger speech when state changes
  useEffect(() => {
    if (showExitConfirm) {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (activeUtteranceRef.current) {
        activeUtteranceRef.current.onend = null;
        activeUtteranceRef.current.onerror = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.onended = null;
        activeAudioRef.current.onerror = null;
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      }
      return;
    }

    if (currentItem) {
      setUserInput('');
      setTimeLeft(config.interval);
      triggerPronunciation(currentItem, config.repeatTimes);
    }

    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (activeUtteranceRef.current) {
        activeUtteranceRef.current.onend = null;
        activeUtteranceRef.current.onerror = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.onended = null;
        activeAudioRef.current.onerror = null;
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      }
    };
  }, [currentIndex, currentItem, config.repeatTimes, showExitConfirm]);

  // 4. Timer Countdown effect
  useEffect(() => {
    if (!config.autoNext) {
      // Manual mode has no timer ticks
      return;
    }

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      if (isTimerPaused || showExitConfirm) return;

      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer reached 0! Save answer and move to next
          handleNextWord(true); // Is Timeout trigger
          return config.interval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [currentIndex, isTimerPaused, showExitConfirm, config.autoNext, config.interval]);

  // 5. Next word logic
  const handleNextWord = (isTimeout = false) => {
    if (!currentItem) return;

    // Check spelling
    const typedClean = userInput.trim().toLowerCase();
    const correctClean = currentItem.correctSpelling.trim().toLowerCase();
    const isCorrect = typedClean === correctClean;
    const isSkipped = typedClean === '' && !isTimeout;

    const resultRecord: DictationResult = {
      word: currentItem.word,
      prompt: currentItem.speakText,
      speakLanguage: currentItem.speakLanguage,
      correctAnswer: currentItem.correctSpelling,
      userAnswer: userInput.trim(),
      isCorrect,
      skipped: isSkipped
    };

    const newAnswers = [...answersCovered, resultRecord];
    setAnswersCovered(newAnswers);

    if (currentIndex < dictationItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Finished all words! Display summary
      onFinish(newAnswers);
    }
  };

  // Replay Pronunciation manually
  const handleReplay = () => {
    if (currentItem) {
      triggerPronunciation(currentItem, config.repeatTimes);
    }
  };

  const percentComplete = Math.round(((currentIndex) / dictationItems.length) * 100);

  return (
    <div id="dictation-active-session" className="max-w-2xl mx-auto bg-[#0f0f12] rounded-3xl border border-white/5 p-8 shadow-2xl relative overflow-hidden">
      
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none"></div>

      {/* Session Header details */}
      <div className="flex justify-between items-center border-b border-white/5 pb-5 mb-8 relative z-10">
        <div>
          <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded-full uppercase tracking-widest">
            正在听写中 Active Session 🔊
          </span>
          <h2 className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1.5">
            当前词：第 <span className="font-mono font-bold text-amber-400 text-sm">{currentIndex + 1}</span> / {dictationItems.length} 个单词
            <span className="text-white/10">|</span>
            词库 ID: <span className="font-mono text-slate-300">#{currentItem?.word.id}</span>
          </h2>
        </div>

        {/* Exit Session link */}
        <button
          id="btn-quit-session"
          onClick={() => setShowExitConfirm(true)}
          className="px-3.5 py-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg font-medium transition cursor-pointer"
        >
          终止听写并结算
        </button>
      </div>

      {/* Progress visual bar */}
      <div className="w-full bg-white/5 h-1.5 rounded-full mb-8 overflow-hidden relative z-10">
        <div
          className="bg-amber-500/60 h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)]"
          style={{ width: `${percentComplete}%` }}
        ></div>
      </div>

      {/* Board Panel */}
      <div className="flex flex-col items-center justify-center py-4 relative z-10">
        <span className="text-xs text-amber-500/80 font-bold uppercase tracking-widest font-sans mb-2">
          {currentItem?.displayPrompt}
        </span>

        {/* Big voice speaker trigger */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Pulsing decoration circle */}
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping opacity-25"></div>
          
          <button
            id="btn-replay-pronounce"
            onClick={handleReplay}
            className="w-28 h-28 bg-[#131318] border border-amber-500/30 hover:border-amber-500 text-amber-500 rounded-full flex items-center justify-center hover:scale-105 transition duration-200 active:scale-95 shadow-lg relative group cursor-pointer"
            title="点击重新播报发音"
          >
            <div className="absolute inset-1 rounded-full border border-white/5"></div>
            <Volume2 className="w-10 h-10 group-hover:animate-pulse" />
            
            {/* Repetition circle status */}
            <span className="absolute bottom-3 right-3 text-[10px] font-mono font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded-md leading-none shadow-md">
              {currentRepetition}/{config.repeatTimes}
            </span>
          </button>
        </div>

        {/* Conditional visual help */}
        <div className="text-center mb-8">
          {currentItem?.itemMode === 'zh-to-en' ? (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 font-serif italic">看中文释义写英文 Definition Clue:</p>
              <p className="text-xl font-serif font-bold text-white leading-relaxed max-w-md px-4">
                {currentItem.word.translation}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 font-serif italic">听英文发音与音标 American Phonetic:</p>
              <p className="text-md font-mono text-amber-200 tracking-wider bg-black/40 px-4 py-2 rounded-xl border border-white/5 inline-block">
                {currentItem.word.phonetic || '/.../'}
              </p>
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="w-full max-w-md space-y-5">
          <input
            id="dictation-spelling-input"
            type="text"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleNextWord(false);
              }
            }}
            placeholder={
              currentItem?.itemMode === 'zh-to-en'
                ? "看中文写英文，在此拼写正确的英文单词..."
                : "听音拼写，输入对应的英文单词..."
            }
            className="w-full p-4 text-center font-serif text-xl text-white bg-black/40 border border-white/10 rounded-2xl focus:bg-black/60 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/60 outline-none transition placeholder:text-slate-700 placeholder:text-sm placeholder:font-sans"
          />

          {/* Quick timing & next buttons */}
          <div className="flex items-center justify-between gap-4 mt-2">
            {/* Timer count progress */}
            {config.autoNext ? (
              <div className="flex items-center gap-3">
                <button
                  id="btn-pause-resume-timer"
                  onClick={() => setIsTimerPaused(!isTimerPaused)}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    isTimerPaused 
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
                  title={isTimerPaused ? '继续倒计时' : '暂停倒计时'}
                >
                  {isTimerPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                </button>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">倒计时 Next in</span>
                  <span className={`text-sm font-mono font-bold leading-none ${timeLeft <= 3 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
                    {timeLeft} 秒
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500/50" />
                手动点击“下一个”进行切换
              </span>
            )}

            {/* Next word CTA */}
            <button
              id="btn-submit-next"
              onClick={() => handleNextWord(false)}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.15)] transition flex items-center gap-1.5 cursor-pointer"
            >
              确定并输入下一个
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Footer indices */}
      <div className="mt-8 border-t border-white/5 pt-5 flex items-center justify-between text-[11px] text-slate-600 font-medium uppercase tracking-wider relative z-10">
        <span>声音合成器标准发音 ENGINE: SPEECHSYNTHESIS</span>
        <span>按回车 (Enter) 键直接提交下一词</span>
      </div>

      {/* Custom Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-fadeIn">
          <div className="bg-[#131318] border border-white/10 p-6 rounded-2xl max-w-sm w-full text-center space-y-5 shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-amber-100 font-serif italic">确定要现在终止听写吗？</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                终止后，系统将为您结算当前已完成拼写的部分（共 {currentIndex} 个词）并生成成绩单。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                继续听写 Keep Going
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onFinish(answersCovered);
                }}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-black font-bold rounded-xl text-xs transition cursor-pointer"
              >
                确定终止并结算 End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
