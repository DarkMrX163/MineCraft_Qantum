import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../game/network/types';
import { MessageSquare, Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatOverlayProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

const QUICK_PHRASES = [
  'Привет всем! 👋',
  'Пошли строить! 🏗️',
  'Посмотри сюда! 👀',
  'Классная постройка! 🔥',
  'Помоги мне тут! 🆘',
  'Ура! 🎉'
];

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ messages, onSendMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onSendMessage(inputVal.trim());
    setInputVal('');
  };

  const handleQuickPhrase = (phrase: string) => {
    onSendMessage(phrase);
  };

  return (
    <div className="fixed top-16 left-4 z-40 max-w-sm w-full pointer-events-auto">
      {/* Toggle Chat Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-white text-xs font-bold shadow-lg transition-all"
      >
        <MessageSquare className="w-4 h-4 text-emerald-400" />
        <span>Чат мира ({messages.length})</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
      </button>

      {/* Expanded Chat Box */}
      {isOpen && (
        <div className="mt-2 bg-stone-900/90 border border-white/20 rounded-2xl p-3 backdrop-blur-lg shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Message List */}
          <div className="h-44 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-stone-700">
            {messages.length === 0 ? (
              <p className="text-stone-400 text-xs italic py-4 text-center">Чат пуст. Напишите первое сообщение!</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="text-xs bg-stone-800/60 p-2 rounded-xl border border-stone-700/50">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: msg.senderColor }} />
                    <span style={{ color: msg.senderColor }}>{msg.senderName}:</span>
                  </div>
                  <p className="text-white break-words pl-4">{msg.text}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Kids Phrase Chips */}
          <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {QUICK_PHRASES.map((phrase) => (
              <button
                key={phrase}
                onClick={() => handleQuickPhrase(phrase)}
                className="shrink-0 text-[11px] font-bold bg-stone-800 hover:bg-emerald-600/30 hover:border-emerald-500/50 border border-stone-700 px-2.5 py-1 rounded-lg text-stone-200 transition-colors"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 pt-1 border-t border-stone-800">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Сообщение..."
              maxLength={100}
              className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black p-2 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
