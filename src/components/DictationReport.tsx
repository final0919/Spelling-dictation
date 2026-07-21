/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DictationResult, Word } from '../types';
import { CheckCircle, XCircle, Volume2, ArrowRight, RotateCcw, AlertTriangle, Home } from 'lucide-react';

interface DictationReportProps {
  results: DictationResult[];
  onReviewIncorrect: (incorrectWords: Word[]) => void;
  onGoHome: () => void;
  voiceLanguage: string;
  speakRate: number;
}

export default function DictationReport({
  results,
  onReviewIncorrect,
  onGoHome,
  voiceLanguage,
  speakRate
}: DictationReportProps) {
  // Compute analytics
  const totalCount = results.length;
  const correctCount = results.filter((r) => r.isCorrect).length;
  const incorrectCount = results.filter((r) => !r.isCorrect && !r.skipped).length;
  const skippedCount = results.filter((r) => r.skipped).length;
  
  const correctRate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  // Extract incorrect/skipped words to review
  const incorrectWords = React.useMemo(() => {
    return results.filter((r) => !r.isCorrect).map((r) => r.word);
  }, [results]);

  // Handle single word speaker trigger
  const handleSpeakWord = (word: string, langCode: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = langCode;
    utterance.rate = speakRate;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div id="dictation-report-panel" className="max-w-3xl mx-auto bg-[#0f0f12] rounded-3xl border border-white/5 p-8 shadow-2xl relative overflow-hidden">
      
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none"></div>

      {/* Upper header report state */}
      <div className="text-center pb-8 border-b border-white/5 mb-8 relative z-10">
        <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded-full uppercase tracking-widest">
          听写结算报告 Session Summary 📊
        </span>
        <h2 className="text-xl font-serif italic text-amber-100 mt-2">英语单词听写测试已结算</h2>
        <p className="text-xs text-slate-400 mt-1">
          以下是您在本轮拼写测试中的掌握度与多维学情反馈
        </p>

        {/* Analytics scores layout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <div className="bg-[#131318] p-4 rounded-2xl border border-white/5">
            <span className="text-[9px] uppercase font-bold text-amber-500/80 tracking-widest block">正确率 Ratio</span>
            <span className="text-2xl font-bold text-amber-400 font-mono mt-1.5 block">
              {correctRate}%
            </span>
          </div>

          <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
            <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest block">拼写正确 Passed</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono mt-1.5 block">
              {correctCount} <span className="text-[11px] font-sans font-medium text-emerald-500">词</span>
            </span>
          </div>

          <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
            <span className="text-[9px] uppercase font-bold text-rose-400 tracking-widest block">拼写错误 Failed</span>
            <span className="text-2xl font-bold text-rose-400 font-mono mt-1.5 block">
              {incorrectCount} <span className="text-[11px] font-sans font-medium text-rose-500">词</span>
            </span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest block">跳过未填 Skipped</span>
            <span className="text-2xl font-bold text-slate-300 font-mono mt-1.5 block">
              {skippedCount} <span className="text-[11px] font-sans font-medium text-slate-500">词</span>
            </span>
          </div>
        </div>
      </div>

      {/* CTA action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 relative z-10">
        <button
          id="btn-report-go-home"
          onClick={onGoHome}
          className="w-full sm:w-auto px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/5 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4 text-slate-400" />
          返回配置主页 Home
        </button>

        {incorrectWords.length > 0 ? (
          <button
            id="btn-review-incorrect-dictation"
            onClick={() => onReviewIncorrect(incorrectWords)}
            className="w-full sm:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.15)] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-black" />
            重新听写错词/漏词 ({incorrectWords.length} 词)
          </button>
        ) : (
          <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-5 py-3 rounded-xl border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
            完美测试！所有单词全部正确通关！
          </div>
        )}
      </div>

      {/* Word-by-word comparison report table */}
      <div className="relative z-10">
        <h3 className="text-sm font-serif italic text-amber-100 mb-4 flex items-center gap-1.5">
          词库掌握明细与纠错面板 List Details
        </h3>
        
        <div className="border border-white/5 bg-[#131318] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[420px] scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0b0b0d] text-slate-400 font-bold uppercase sticky top-0 z-10 border-b border-white/5">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">状态 Status</th>
                  <th className="py-3 px-4 w-12 text-center">序号</th>
                  <th className="py-3 px-4">标准单词 Model</th>
                  <th className="py-3 px-4">音标 Phonetic</th>
                  <th className="py-3 px-4">拼写结果 Typing</th>
                  <th className="py-3 px-4">词义释义 Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500 bg-black/40">
                      暂无任何听写单词数据记录
                    </td>
                  </tr>
                ) : (
                  results.map((result, idx) => {
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-white/[0.02] transition-colors ${
                          result.isCorrect ? 'bg-emerald-500/[0.01]' : 'bg-rose-500/[0.01]'
                        }`}
                      >
                        {/* Status icon column */}
                        <td className="py-3 px-4 text-center">
                          {result.isCorrect ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400 inline-block" />
                          ) : result.skipped ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500 inline-block" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 inline-block" />
                          )}
                        </td>

                        {/* ID Sequence */}
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500 text-center">
                          #{result.word.id}
                        </td>

                        {/* English Spelling + Voice speaker trigger */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">
                              {result.word.word}
                            </span>
                            <button
                              id={`btn-speak-report-word-${idx}`}
                              onClick={() => {
                                handleSpeakWord(result.word.word, voiceLanguage || 'en-US');
                              }}
                              className="p-1 hover:bg-white/5 text-slate-500 hover:text-amber-400 rounded-lg transition"
                              title="播放标准发音"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Phonetic */}
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {result.word.phonetic}
                        </td>

                        {/* User spelling answer */}
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {result.isCorrect ? (
                            <span className="text-emerald-400 font-bold">{result.userAnswer}</span>
                          ) : result.skipped ? (
                            <span className="text-amber-500 italic text-[10px]">已跳过</span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-rose-400/80 line-through text-[10px]">
                                {result.userAnswer || '未填'}
                              </span>
                              <span className="text-emerald-400 font-bold text-[10px] mt-0.5">
                                正确: {result.correctAnswer}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Translate */}
                        <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate" title={result.word.translation}>
                          {result.word.translation}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
