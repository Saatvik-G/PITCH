"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Accessibility, Languages, Send, ShieldAlert, Sparkles, User, Volume2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isAccessible?: boolean;
}

export const WayfindingConcierge: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: "PITCH STADIUM ANNOUNCEMENT SYSTEM: Active. Ready to assist with wayfinding, accessibility, food stands, and transit routing."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState<'en' | 'es' | 'fr'>('en');
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick select suggestions depending on language
  const suggestions = {
    en: [
      { label: "Find Section 125", query: "How do I get to Section 125 from Gate B?" },
      { label: "Accessible Restroom", query: "Where is the nearest accessible restroom near Section 105?" },
      { label: "Vegan Food near Gate E", query: "Where can I find vegan food near Gate E?" },
      { label: "Fast Egress Route", query: "What is the fastest way to leave the stadium after the final whistle from Section 325?" }
    ],
    es: [
      { label: "Buscar Sección 125", query: "¿Cómo llego a la Sección 125 desde la Puerta B?" },
      { label: "Baño Accesible", query: "¿Dónde está el baño accesible más cercano a la Sección 105?" },
      { label: "Comida Vegana Puerta E", query: "¿Dónde encuentro comida vegana cerca de la Puerta E?" },
      { label: "Salida Rápida", query: "¿Cuál es la ruta de salida más rápida desde la Sección 325 después del pitido final?" }
    ],
    fr: [
      { label: "Trouver Section 125", query: "Comment me rendre à la Section 125 depuis la Porte B?" },
      { label: "Toilettes Accessibles", query: "Où se trouvent les toilettes accessibles les plus proches de la Section 105?" },
      { label: "Vegan près de Porte E", query: "Où trouver de la nourriture végétalienne près de la Porte E?" },
      { label: "Sortie Rapide", query: "Quel est le chemin le plus rapide pour quitter le stade après le coup de sifflet final depuis la Section 325?" }
    ]
  };

  const currentSuggestions = suggestions[language];

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: ChatMessage = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Build history for API request (omitting welcome message at index 0 to ensure it starts with a 'user' message)
      const chatHistory = messages
        .filter((_, idx) => idx > 0)
        .map(msg => ({
          role: msg.role,
          text: msg.text
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: chatHistory,
          language,
          accessibilityMode
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'model',
          text: data.answer,
          isAccessible: data.isAccessibleFormatting
        }]);
      } else {
        const errData = await response.json();
        setMessages(prev => [...prev, {
          role: 'model',
          text: `SYSTEM ERROR: ${errData.error || 'Failed to connect to PA System.'}`
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: "SYSTEM OFFLINE: Connection error. Check server status."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-glass rounded-xl p-5 flex flex-col h-[500px] relative scanlines">
      {/* PA System Header / Scoreboard Look */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-card-border pb-3 mb-3 gap-2">
        <div className="flex items-center space-x-2">
          <div className="bg-accent-gold/20 p-1.5 rounded border border-accent-gold/30">
            <Volume2 className="text-accent-gold w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-scoreboard text-base tracking-wider text-foreground">AI WAYFINDING & CONCIERGE</h2>
            <div className="text-[9px] text-accent-gold font-scoreboard tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block mr-1 animate-pulse"></span>
              PA AMPLIFIER ACTIVE
            </div>
          </div>
        </div>

        {/* Control toggles */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Accessibility Mode Toggle */}
          <button
            onClick={() => setAccessibilityMode(!accessibilityMode)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-all ${
              accessibilityMode
                ? 'bg-accent-gold text-stadium-green-dark border-accent-gold font-bold glow-gold'
                : 'bg-stadium-green-dark/40 text-foreground/80 border-card-border hover:bg-stadium-green-light/40'
            }`}
            title="Toggles a second LLM reformatting call to simplify instructions"
          >
            <Accessibility className="w-3.5 h-3.5" />
            <span className="font-scoreboard text-[10px]">ACC MODE</span>
          </button>

          {/* Languages Selector */}
          <div className="bg-stadium-green-dark/40 border border-card-border rounded flex overflow-hidden">
            {(['en', 'es', 'fr'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-all ${
                  language === lang
                    ? 'bg-accent-gold text-stadium-green-dark'
                    : 'text-foreground/75 hover:bg-stadium-green-light/40'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Output */}
      <div className="flex-1 overflow-y-auto pr-1 mb-3 space-y-3 scrollbar">
        {messages.map((msg, index) => {
          const isSystem = msg.role === 'model';
          return (
            <div
              key={index}
              className={`flex items-start space-x-2 max-w-[85%] ${
                isSystem ? 'mr-auto' : 'ml-auto flex-row-reverse space-x-reverse'
              }`}
            >
              <div
                className={`p-1 rounded ${
                  isSystem ? 'bg-stadium-green-light/20 text-accent-gold border border-stadium-green-light/30' : 'bg-accent-gold/10 text-foreground border border-accent-gold/25'
                }`}
              >
                {isSystem ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>
              <div
                className={`rounded-lg p-3 text-xs leading-relaxed ${
                  isSystem
                    ? 'bg-stadium-green-dark/60 text-foreground border border-stadium-green/20'
                    : 'bg-card-bg text-foreground border border-accent-gold/20'
                }`}
              >
                {/* Visual indicator of the 2nd LLM accessibility call */}
                {isSystem && msg.isAccessible && (
                  <div className="bg-accent-gold/20 border border-accent-gold/40 text-accent-gold text-[9px] px-1.5 py-0.5 rounded font-scoreboard w-fit mb-2 flex items-center space-x-1 font-bold">
                    <Accessibility className="w-2.5 h-2.5" />
                    <span>ACCESSIBILITY FILTERED: SHORT STEP-BY-STEP</span>
                  </div>
                )}
                
                <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center space-x-2 text-accent-gold/70 text-xs italic pl-2">
            <span className="w-1.5 h-1.5 bg-accent-gold rounded-full animate-bounce"></span>
            <span className="w-1.5 h-1.5 bg-accent-gold rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-1.5 h-1.5 bg-accent-gold rounded-full animate-bounce [animation-delay:0.4s]"></span>
            <span className="font-scoreboard tracking-wider text-[10px]">PA broadcast transmission loading...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex flex-wrap gap-1.5 pb-3 border-t border-card-border/50 pt-2">
        {currentSuggestions.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(sug.query)}
            disabled={loading}
            className="text-[10px] bg-stadium-green-dark/40 hover:bg-stadium-green-light/40 border border-stadium-green/30 text-foreground/80 rounded px-2.5 py-1 text-left transition-all truncate max-w-full cursor-pointer hover:border-accent-gold/40"
          >
            {sug.label}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="flex items-center space-x-2 border-t border-card-border pt-3"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            language === 'es'
              ? "Pregunte a PITCH..."
              : language === 'fr'
              ? "Demandez à PITCH..."
              : "Ask PITCH (e.g. 'restroom near Gate B')..."
          }
          className="flex-1 bg-stadium-green-dark/60 border border-card-border rounded px-3 py-2 text-xs text-foreground placeholder-foreground/45 focus:outline-none focus:border-accent-gold"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="bg-accent-gold hover:bg-accent-gold-hover disabled:opacity-40 disabled:hover:bg-accent-gold text-stadium-green-dark p-2 rounded transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
