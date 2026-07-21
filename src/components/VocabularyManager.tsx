/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Word } from '../types';
import { parseWordList, stringifyWordList } from '../utils/parser';
import { DEFAULT_WORDS } from '../data/words';
import { Upload, Download, RotateCcw, Search, Trash2, Plus, Edit3, Save, Check, X, FileText, AlertCircle } from 'lucide-react';

interface VocabularyManagerProps {
  words: Word[];
  setWords: React.Dispatch<React.SetStateAction<Word[]>>;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
}

export default function VocabularyManager({
  words,
  setWords,
  selectedIds,
  setSelectedIds
}: VocabularyManagerProps) {
  const [inputText, setInputText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editWordId, setEditWordId] = useState<number | null>(null);
  
  // States for adding a single new word
  const [newWord, setNewWord] = useState({ word: '', phonetic: '', translation: '', frequency: 100 });
  const [isAddingSingle, setIsAddingSingle] = useState(false);

  // States for editing a single word inline
  const [editedWord, setEditedWord] = useState<Partial<Word>>({});

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Custom confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Filtered words for the table
  const filteredWords = useMemo(() => {
    if (!searchQuery) return words;
    const query = searchQuery.toLowerCase();
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(query) ||
        w.translation.toLowerCase().includes(query) ||
        w.id.toString() === query
    );
  }, [words, searchQuery]);

  // Bulk Import handler
  const handleImport = () => {
    if (!inputText.trim()) return;
    const parsed = parseWordList(inputText);
    if (parsed.length > 0) {
      setWords(parsed);
      // Auto-select all newly imported words
      setSelectedIds(parsed.map((w) => w.id));
      setIsImporting(false);
      setInputText('');
      showToast(`成功导入 ${parsed.length} 个单词！`, 'success');
    } else {
      showToast('未能解析出单词，请检查格式是否正确。', 'error');
    }
  };

  // Export handler (trigger download)
  const handleExport = () => {
    const textStr = stringifyWordList(words);
    const blob = new Blob([textStr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gaokao_words_dictation_list.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('当前词表已成功导出为 TXT 文件！', 'success');
  };

  // Reset to default 688 vocabulary (preset list)
  const handleResetToDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: '重置为系统默认词表',
      message: '您确定要重置词表为系统预设的高考高频高分词表吗？这将会覆盖您当前的所有自定义及修改的单词。',
      onConfirm: () => {
        setWords(DEFAULT_WORDS);
        setSelectedIds(DEFAULT_WORDS.map((w) => w.id));
        setSearchQuery('');
        showToast('已成功重置为系统预设词表（共 200 个高考核心词）！', 'success');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Clear all words
  const handleClearAll = () => {
    setConfirmModal({
      isOpen: true,
      title: '清空当前词库',
      message: '确定要清空当前所有单词吗？此操作将擦除本地保存的所有记录。',
      onConfirm: () => {
        setWords([]);
        setSelectedIds([]);
        showToast('词表已成功清空！', 'info');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Select / Deselect individual words
  const toggleSelectWord = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all filtered words
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredWords.map((w) => w.id);
    setSelectedIds((prev) => {
      const otherIds = prev.filter((id) => !filteredIds.includes(id));
      return [...otherIds, ...filteredIds];
    });
  };

  // Deselect all filtered words
  const handleDeselectAllFiltered = () => {
    const filteredIds = filteredWords.map((w) => w.id);
    setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
  };

  // Add single word handler
  const handleAddSingleWord = () => {
    if (!newWord.word.trim() || !newWord.translation.trim()) {
      showToast('请填写完整的英文拼写以及对应的词义解释！', 'error');
      return;
    }
    const nextId = words.length > 0 ? Math.max(...words.map(w => w.id)) + 1 : 1;
    const wordToAdd: Word = {
      id: nextId,
      frequency: newWord.frequency || 100,
      word: newWord.word.trim(),
      phonetic: newWord.phonetic.trim() || '[-]',
      translation: newWord.translation.trim()
    };
    const updated = [...words, wordToAdd];
    setWords(updated);
    // Auto-select the newly added word
    setSelectedIds(prev => [...prev, nextId]);
    setNewWord({ word: '', phonetic: '', translation: '', frequency: 100 });
    setIsAddingSingle(false);
  };

  // Delete single word
  const handleDeleteWord = (id: number) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  // Start editing inline
  const startEditing = (word: Word) => {
    setEditWordId(word.id);
    setEditedWord({ ...word });
  };

  // Save inline edit
  const saveEditing = (id: number) => {
    if (!editedWord.word?.trim() || !editedWord.translation?.trim()) {
      showToast('单词拼写和中文翻译解释不能为空！', 'error');
      return;
    }
    setWords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...editedWord as Word } : w))
    );
    setEditWordId(null);
    setEditedWord({});
  };

  // Cancel inline edit
  const cancelEditing = () => {
    setEditWordId(null);
    setEditedWord({});
  };

  return (
    <div id="vocab-manager-panel" className="bg-[#0f0f12] rounded-3xl border border-white/5 p-6 shadow-2xl relative overflow-hidden">
      
      {/* Upper header action controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-serif italic text-amber-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            英语拼写词库管理 Database
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            系统词本内置 <span className="font-semibold text-amber-400 font-mono">{words.length}</span> 个词，
            勾选参与当前听写词量：<span className="font-semibold text-amber-500 font-mono">{selectedIds.length}</span> 词
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            id="btn-open-import"
            onClick={() => setIsImporting(!isImporting)}
            className="px-3.5 py-2 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            批量导入/OCR 替换
          </button>
          <button
            id="btn-export-vocab"
            onClick={handleExport}
            disabled={words.length === 0}
            className="px-3.5 py-2 text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <Download className="w-4 h-4" />
            导出当前词表
          </button>
          <button
            id="btn-reset-default"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl transition flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            重置系统预设
          </button>
          <button
            id="btn-clear-all"
            onClick={handleClearAll}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-white/5 rounded-xl transition cursor-pointer"
            title="清空词表"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bulk Import Textarea drawer panel */}
      {isImporting && (
        <div id="import-words-section" className="mb-6 p-5 bg-black/40 rounded-2xl border border-white/5 animate-fadeIn">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-serif italic text-amber-200">批量导入/自定义本句 OCR 文本单词</h3>
            <button 
              onClick={() => setIsImporting(false)} 
              className="p-1 hover:bg-white/5 rounded-full text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
            支持直接粘贴高考高频 688 书本 OCR 识别文本，也支持 Tab/逗号/空格分隔。例如：<br />
            <code className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono text-[10px]">1 310 personal ['p:sənl] adj.私人的</code> 或者 
            <code className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono text-[10px]">apple, 苹果</code> (每行一词)
          </p>
          <textarea
            id="import-text-input"
            rows={6}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请在此处粘贴要替换或加入的新单词数据..."
            className="w-full p-3 text-xs bg-black/40 border border-white/10 text-white rounded-xl focus:border-amber-500/50 outline-none transition font-mono"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setIsImporting(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:bg-white/5 rounded-lg transition"
            >
              取消 Cancel
            </button>
            <button
              id="btn-submit-import"
              onClick={handleImport}
              className="px-4 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition cursor-pointer"
            >
              确认导入并完全替换
            </button>
          </div>
        </div>
      )}

      {/* Adding single word form */}
      {isAddingSingle ? (
        <div id="add-single-word-form" className="mb-6 p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-fadeIn">
          <h3 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-3">手动录入单个词 Vocabulary Creation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="单词 (例如: apple)"
              value={newWord.word}
              onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
              className="p-2.5 text-xs bg-black/40 border border-white/10 text-white rounded-xl outline-none focus:border-amber-500/50"
            />
            <input
              type="text"
              placeholder="音标 (例如: [æpl])"
              value={newWord.phonetic}
              onChange={(e) => setNewWord({ ...newWord, phonetic: e.target.value })}
              className="p-2.5 text-xs bg-black/40 border border-white/10 text-white rounded-xl outline-none focus:border-amber-500/50"
            />
            <input
              type="text"
              placeholder="词义/翻译 (例如: n. 苹果)"
              value={newWord.translation}
              onChange={(e) => setNewWord({ ...newWord, translation: e.target.value })}
              className="p-2.5 text-xs bg-black/40 border border-white/10 text-white rounded-xl outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsAddingSingle(false)}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:bg-white/5 rounded-lg"
            >
              取消
            </button>
            <button
              id="btn-save-single-word"
              onClick={handleAddSingleWord}
              className="px-3.5 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg cursor-pointer"
            >
              保存单词 Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center mb-4">
          <button
            id="btn-show-add-single"
            onClick={() => setIsAddingSingle(true)}
            className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 border border-amber-500/20 rounded-lg flex items-center gap-1 font-semibold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            手动录入单个词
          </button>
        </div>
      )}

      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="vocab-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="在本地搜索拼写单词、释义、翻译或序号..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-black/40 border border-white/10 text-white rounded-xl focus:border-amber-500/50 outline-none transition"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            id="btn-select-all-filtered"
            onClick={handleSelectAllFiltered}
            className="px-3 py-2 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl font-medium transition cursor-pointer"
          >
            选中全部搜索结果
          </button>
          <button
            id="btn-deselect-all-filtered"
            onClick={handleDeselectAllFiltered}
            className="px-3 py-2 text-xs bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 rounded-xl font-medium transition cursor-pointer"
          >
            排除当前搜索结果
          </button>
        </div>
      </div>

      {/* Word List Table Container */}
      <div className="border border-white/5 bg-[#131318] rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[360px] scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-[#0b0b0d] text-slate-400 uppercase font-bold tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 w-12 text-center border-b border-white/5">听写</th>
                <th className="py-3 px-4 w-16 border-b border-white/5">序号</th>
                <th className="py-3 px-4 w-20 border-b border-white/5 text-center">频次</th>
                <th className="py-3 px-4 border-b border-white/5">标准拼写 (拼写自测)</th>
                <th className="py-3 px-4 border-b border-white/5">美式音标</th>
                <th className="py-3 px-4 border-b border-white/5">词义词性与考纲用法解释</th>
                <th className="py-3 px-4 w-24 text-center border-b border-white/5">操作 Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredWords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 bg-black/40">
                    本地词库没有找到符合要求的单词
                  </td>
                </tr>
              ) : (
                filteredWords.map((word) => {
                  const isChecked = selectedIds.includes(word.id);
                  const isEditing = editWordId === word.id;

                  return (
                    <tr
                      key={word.id}
                      className={`hover:bg-white/[0.02] transition-colors ${isChecked ? 'bg-amber-500/[0.015]' : ''}`}
                    >
                      {/* Checkbox for selection */}
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectWord(word.id)}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500/50 border-white/10 bg-black/40 accent-amber-500 cursor-pointer"
                        />
                      </td>

                      {/* Sequence ID */}
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-500">
                        {word.id}
                      </td>

                      {/* Frequency */}
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-block px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-[10px] rounded font-semibold">
                          {word.frequency}
                        </span>
                      </td>

                      {/* Word Spell */}
                      <td className="py-2.5 px-4 font-semibold text-slate-100 font-sans">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedWord.word || ''}
                            onChange={(e) => setEditedWord({ ...editedWord, word: e.target.value })}
                            className="p-1 text-xs bg-black/40 border border-amber-500/50 text-white rounded outline-none w-full"
                          />
                        ) : (
                          word.word
                        )}
                      </td>

                      {/* Phonetic */}
                      <td className="py-2.5 px-4 text-[11px] font-mono text-slate-400">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedWord.phonetic || ''}
                            onChange={(e) => setEditedWord({ ...editedWord, phonetic: e.target.value })}
                            className="p-1 text-xs bg-black/40 border border-amber-500/50 text-white rounded outline-none w-full"
                          />
                        ) : (
                          word.phonetic
                        )}
                      </td>

                      {/* Translation */}
                      <td className="py-2.5 px-4 text-[11px] text-slate-300">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedWord.translation || ''}
                            onChange={(e) => setEditedWord({ ...editedWord, translation: e.target.value })}
                            className="p-1 text-xs bg-black/40 border border-amber-500/50 text-white rounded outline-none w-full"
                          />
                        ) : (
                          word.translation
                        )}
                      </td>

                      {/* Operations */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => saveEditing(word.id)}
                              className="p-1 text-emerald-400 hover:bg-white/5 rounded-lg"
                              title="保存"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-slate-500 hover:bg-white/5 rounded-lg"
                              title="取消"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => startEditing(word)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition cursor-pointer"
                              title="编辑单个单词"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteWord(word.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition cursor-pointer"
                              title="删除单个单词"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#131318] border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slideIn">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
            toast.type === 'error' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
          }`}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div className="text-xs text-slate-200 font-medium">
            {toast.message}
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-[#131318] border border-white/10 p-6 rounded-2xl max-w-sm w-full text-center space-y-5 shadow-2xl relative">
            <button 
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 p-1 hover:bg-white/5 rounded-full text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400 animate-pulse">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-amber-100 font-serif italic">{confirmModal.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                取消 Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition cursor-pointer"
              >
                确定 Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
