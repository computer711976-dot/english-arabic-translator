import React, { useState, useEffect, useRef } from "react";
import {
  Languages,
  ArrowLeftRight,
  Mic,
  MicOff,
  Star,
  History,
  Copy,
  Volume2,
  Trash2,
  Settings,
  Wifi,
  WifiOff,
  BookOpen,
  X,
  VolumeX,
  Sparkles,
  Info,
  Check,
  Moon,
  Sun,
  Globe,
  CornerDownRight
} from "lucide-react";
import { Language, TranslationRecord, AppSettings } from "./types";
import { LANGUAGES, getLanguageName, getLanguageFlag } from "./utils/languages";
import { TRANSLATIONS } from "./utils/localization";
import { QUICK_PHRASES, checkOfflinePhrases, Phrase } from "./utils/phrases";
import LanguageDropdown from "./components/LanguageDropdown";

export default function App() {
  // Application State
  const [sourceLang, setSourceLang] = useState<string>("en");
  const [targetLang, setTargetLang] = useState<string>("ar");
  const [inputText, setInputText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [transliteration, setTransliteration] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  
  // App UI configuration
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    offlineMode: false,
    voiceGender: "female",
    vibrateFeedback: true,
    appLocale: "en"
  });

  const [history, setHistory] = useState<TranslationRecord[]>(() => {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("tarjim_history");
        return saved ? JSON.parse(saved) : [];
      }
    } catch (e) {
      console.warn("localStorage is not accessible in this context. Using in-memory fallback.", e);
    }
    return [];
  });

  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false
  });

  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [activePhraseCategory, setActivePhraseCategory] = useState<string>("Greetings");

  // Web Speech Recognition reference
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sync state to LocalStorage safely
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        localStorage.setItem("tarjim_history", JSON.stringify(history));
      }
    } catch (e) {
      console.warn("Storage sync failed or was blocked inside the sandboxed iframe:", e);
    }
  }, [history]);

  // Read theme preferences
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  // Localization shortcut
  const t = TRANSLATIONS[settings.appLocale];

  // Helper to detect if a text contains any Arabic characters
  const isArabicText = (text: string): boolean => {
    return /[\u0600-\u06FF]/.test(text);
  };

  // Show status feedback toaster
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    try {
      if (settings.vibrateFeedback && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(40);
      }
    } catch (error) {
      console.warn("Haptic vibrate is blocked in this container context.", error);
    }
    setTimeout(() => {
      setToast({ message: "", visible: false });
    }, 2800);
  };

  // Switch Source and Target languages
  const handleSwap = () => {
    if (sourceLang === "auto") {
      setSourceLang(targetLang);
      setTargetLang("en");
    } else {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }
    const tempText = inputText;
    setInputText(translatedText);
    setTranslatedText(tempText);
    setTransliteration("");
    setExplanation("");
  };

  // Perform translation
  const handleTranslate = async (textToTranslate: string = inputText) => {
    const text = textToTranslate.trim();
    if (!text) {
      setTranslatedText("");
      setTransliteration("");
      setExplanation("");
      return;
    }

    setIsTranslating(true);

    // 1. Offline translation Simulation / Fuzzy logic offline match
    if (settings.offlineMode) {
      const match = checkOfflinePhrases(text, sourceLang, targetLang);
      if (match) {
        setTimeout(() => {
          setTranslatedText(match.translatedText);
          setTransliteration(match.transliteration);
          setExplanation(match.explanation);
          setIsTranslating(false);
          saveToHistory(text, match.translatedText, match.transliteration, match.explanation);
          showToast(t.offlineActive);
        }, 350);
        return;
      } else {
        // Fallback translation if offline mode is on but no quick phrase matched: Use basic word dictionary simulation
        setTimeout(() => {
          // Pre-baked basic vocabulary fallbacks
          const basicDict: Record<string, string> = {
            "hello": "مرحباً",
            "world": "العالم",
            "book": "كتاب",
            "thank you": "شكراً لك",
            "yes": "نعم",
            "no": "لا",
            "good": "جيد",
            "love": "حب",
            "peace": "سلام",
            "مرحباً": "Hello",
            "شكراً": "Thank you",
            "كتاب": "Book",
            "نعم": "Yes",
            "لا": "No",
            "سلام": "Peace"
          };
          const lowercaseText = text.toLowerCase();
          const translatedVal = basicDict[lowercaseText] || `${text} [Offline Translation Approximation]`;
          setTranslatedText(translatedVal);
          setTransliteration(sourceLang === "en" ? "Mutarjam offline" : "Pronunciation Offline");
          setExplanation(t.offlineBanner);
          setIsTranslating(false);
          saveToHistory(text, translatedVal, "Offline cache", t.offlineBanner);
        }, 400);
        return;
      }
    }

    // 2. Online live Gemini API translation (Proxied via local server)
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang
        })
      });

      if (!response.ok) {
        throw new Error("Translation failed");
      }

      const data = await response.json();
      setTranslatedText(data.translatedText);
      setTransliteration(data.transliteration || "");
      setExplanation(data.explanation || "");
      
      saveToHistory(text, data.translatedText, data.transliteration, data.explanation);
    } catch (error) {
      console.error(error);
      // Fail gracefully: generate smart local translation anyway
      const match = checkOfflinePhrases(text, sourceLang, targetLang);
      if (match) {
        setTranslatedText(match.translatedText);
        setTransliteration(match.transliteration);
        setExplanation(match.explanation);
        saveToHistory(text, match.translatedText, match.transliteration, match.explanation);
      } else {
        setTranslatedText(text + " (Translation unavailable - Check API Key)");
        setExplanation("Please make sure your GEMINI_API_KEY is configured in Settings.");
      }
      showToast("Offline fallback active");
    } finally {
      setIsTranslating(false);
    }
  };

  // Add search translation to historical logger
  const saveToHistory = (
    src: string,
    translated: string,
    translit?: string,
    expl?: string
  ) => {
    // Avoid duplicates in recent entries
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.text.toLowerCase() !== src.toLowerCase());
      const newRecord: TranslationRecord = {
        id: Math.random().toString(36).substring(2, 9),
        text: src,
        sourceLang,
        targetLang,
        translatedText: translated,
        transliteration: translit,
        explanation: expl,
        timestamp: Date.now(),
        isFavorite: false
      };
      return [newRecord, ...filtered].slice(0, 50); // Cutoff top 50
    });
  };

  // Toggle favorite on existing record
  const toggleFavorite = (id: string) => {
    setHistory((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newState = !item.isFavorite;
          showToast(newState ? t.favoriteAdded : t.favoriteRemoved);
          return { ...item, isFavorite: newState };
        }
        return item;
      })
    );
  };

  // Clear translation history logs
  const clearHistory = () => {
    setHistory([]);
    showToast(t.allCleared);
  };

  // Quick helper to copy to clipboard
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(t.copied);
  };

  // Text-To-Speech Pronunciation engine
  const handleSpeak = async (textToSpeak: string, languageCode: string) => {
    if (!textToSpeak) return;
    setIsSpeaking(true);

    try {
      // Try high-quality cloud synthesis voice
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, lang: languageCode })
      });

      if (!response.ok) {
        throw new Error("Cloud synthesis failed");
      }

      const data = await response.json();
      if (data.audio) {
        const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
        
        // Use modern Web Audio API to play linear 24kHz raw PCM samples
        if (typeof window !== "undefined") {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            if (!audioCtxRef.current) {
              audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
            }
            const ctx = audioCtxRef.current;
            const pcmData = new Float32Array(audioBytes.buffer);
            const audioBuffer = ctx.createBuffer(1, pcmData.length, 24000);
            audioBuffer.copyToChannel(pcmData, 0);

            const sourceNode = ctx.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(ctx.destination);
            sourceNode.onended = () => setIsSpeaking(false);
            sourceNode.start();
            return;
          }
        }
      }
    } catch (e) {
      console.warn("TTS API fallback to local SpeechSynthesis:", e);
    }

    // Fallback: use standard HTML5 local Web Speech Synthesis
    let hasSpeechSynthesis = false;
    try {
      hasSpeechSynthesis = typeof window !== "undefined" && "speechSynthesis" in window && !!window.speechSynthesis;
    } catch (_) {
      hasSpeechSynthesis = false;
    }

    if (hasSpeechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = languageCode === "ar" ? "ar-SA" : "en-US";
        
        // Attempt choosing fitting local female vs male voices if available
        let voices: SpeechSynthesisVoice[] = [];
        try {
          voices = window.speechSynthesis.getVoices() || [];
        } catch (_) {}

        const matchVoice = voices.find(v => 
          v.lang.startsWith(languageCode) && 
          v.name.toLowerCase().includes(settings.voiceGender)
        );
        if (matchVoice) {
          utterance.voice = matchVoice;
        }

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch (voiceError) {
        console.warn("Local speech synthesis failed in sandbox environment", voiceError);
        setIsSpeaking(false);
        showToast(t.speechError);
      }
    } else {
      setIsSpeaking(false);
      showToast(t.speechError);
    }
  };

  // Speech Recognition (Voice Translation input)
  const startVoiceInput = () => {
    if (typeof window === "undefined") return;
    
    let SpeechRecognitionClass: any = null;
    try {
      SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    } catch (e) {
      console.warn("Could not retrieve SpeechRecognition class", e);
    }

    if (!SpeechRecognitionClass) {
      showToast(t.speechError);
      return;
    }

    if (isListening) {
      stopVoiceInput();
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = sourceLang === "ar" ? "ar-EG" : sourceLang === "en" ? "en-US" : "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        showToast(t.listening);
      };

      recognition.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setInputText(speechToText);
        handleTranslate(speechToText);
      };

      recognition.onerror = (event: any) => {
        console.error(event.error);
        setIsListening(false);
        showToast(t.speechError);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition live error:", e);
      setIsListening(false);
      showToast(t.speechError);
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Phrase book categorization list helper
  const categories = Array.from(new Set(QUICK_PHRASES.map(p => p.category)));
  const filteredPhrases = QUICK_PHRASES.filter(p => p.category === activePhraseCategory);

  return (
    <div className={`min-h-screen font-sans transition-all duration-300 ${settings.darkMode ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"}`}>
      
      {/* Dynamic Status / Simulated Alert Bar when Offline */}
      {settings.offlineMode && (
        <div className="bg-amber-500 text-zinc-950 font-semibold py-1.5 px-4 text-xs flex items-center justify-between gap-1 border-b border-amber-600 shadow-inner">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-bounce" />
            <span>{t.offlineBanner}</span>
          </div>
          <button 
            type="button" 
            className="text-xs underline cursor-pointer hover:opacity-80"
            onClick={() => setSettings(prev => ({ ...prev, offlineMode: false }))}
          >
            {settings.appLocale === "ar" ? "تعطيل محاكاة أوفلاين" : "Turn Online"}
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        
        {/* Header Action Bar */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Languages className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
                {t.appName}
                <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Android OS
                </span>
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {t.welcomeTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2" id="header-controls">
            {/* Dark & Light Toggle */}
            <button
              id="theme-toggler"
              type="button"
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:scale-105 active:scale-95 transition"
              onClick={() => setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }))}
              title={t.darkMode}
            >
              {settings.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Offline Simulator Switch */}
            <button
              id="offline-toggler"
              type="button"
              className={`p-2.5 rounded-xl transition flex items-center gap-1.5 border hover:scale-105 active:scale-95 ${
                settings.offlineMode 
                  ? "bg-amber-100 dark:bg-amber-950/30 text-amber-600 border-amber-300 dark:border-amber-800" 
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-transparent"
              }`}
              onClick={() => {
                setSettings(prev => ({ ...prev, offlineMode: !prev.offlineMode }));
                showToast(settings.offlineMode ? "Online Enabled" : t.offlineActive);
              }}
              title={t.offlineMode}
            >
              {settings.offlineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            </button>

            {/* Language UI Translation Toggle */}
            <button
              id="locale-toggler"
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition flex items-center gap-1.5"
              onClick={() => setSettings(prev => ({ 
                ...prev, 
                appLocale: prev.appLocale === "en" ? "ar" : "en" 
              }))}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t.toggleInterface}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Card App Center */}
        <main className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Translation Studio Board */}
          <section className="md:col-span-8 space-y-6">

            {/* Picker Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-2 bg-zinc-100/80 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80">
              
              <LanguageDropdown
                id="source-language-selector"
                selectedCode={sourceLang}
                onChange={(code) => setSourceLang(code)}
                locale={settings.appLocale}
              />

              {/* Central Swap button */}
              <button
                id="swap-lang-btn"
                type="button"
                className="p-3 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-md bg-white dark:bg-zinc-800 active:rotate-180 transition duration-300 focus:outline-none"
                onClick={handleSwap}
                title={t.swapLanguages}
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>

              <LanguageDropdown
                id="target-language-selector"
                selectedCode={targetLang}
                onChange={(code) => setTargetLang(code)}
                excludeCode={sourceLang}
                locale={settings.appLocale}
              />
            </div>

            {/* Input & Output Translation Widget Panel */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xl overflow-hidden">
              
              {/* Input section */}
              <div className="p-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/60 relative">
                <textarea
                  id="source-text-input"
                  rows={4}
                  dir={isArabicText(inputText) ? "rtl" : "ltr"}
                  className="w-full bg-transparent resize-none outline-none border-none text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-600 text-lg md:text-xl font-medium text-left rtl:text-right"
                  placeholder={t.sourcePlaceholder}
                  value={inputText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputText(val);
                    if (!val || translatedText) {
                      setTranslatedText("");
                      setTransliteration("");
                      setExplanation("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleTranslate();
                    }
                  }}
                />
                
                {inputText && (
                  <button
                    id="clear-input-btn"
                    type="button"
                    className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-600"
                    onClick={() => {
                      setInputText("");
                      setTranslatedText("");
                      setTransliteration("");
                      setExplanation("");
                    }}
                    title={t.clearText}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Input utility strip */}
                <div className="flex items-center justify-between mt-3 pt-2">
                  <div className="flex items-center gap-1.5">
                    {/* Voice speech synthesis input button with cool listening waves */}
                    <button
                      id="speech-recognition-btn"
                      type="button"
                      onClick={startVoiceInput}
                      className={`flex items-center justify-center p-3 rounded-2xl transition duration-300 group ${
                        isListening 
                          ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20" 
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}
                      title={t.speakTitle}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-5 h-5 mr-1" />
                          <span className="text-xs font-semibold animate-ping">●</span>
                        </>
                      ) : (
                        <Mic className="w-5 h-5 group-hover:scale-110" />
                      )}
                    </button>
                    {isListening && (
                      <span className="text-xs text-rose-500 dark:text-rose-400 font-medium animate-pulse">
                        {t.listening}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-zinc-400 font-medium">
                    {inputText.length} / 1000
                  </span>
                </div>
              </div>

              {/* Output translation board */}
              <div className={`p-5 bg-zinc-50/50 dark:bg-zinc-950/40 relative ${isTranslating ? "opacity-75" : ""}`}>
                
                {isTranslating ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin"></div>
                      <Sparkles className="w-4 h-4 text-emerald-500 absolute animate-pulse" />
                    </div>
                    <span className="text-xs text-zinc-400 font-medium mt-1">
                      {t.translating}
                    </span>
                  </div>
                ) : translatedText ? (
                  <div className="space-y-4">
                    
                    {/* The Translation text rendering */}
                    <div className="flex justify-between gap-3">
                      <p 
                        id="target-text-value"
                        dir={isArabicText(translatedText) ? "rtl" : "ltr"}
                        className="text-lg md:text-xl font-bold text-teal-600 dark:text-teal-400 select-all text-left rtl:text-right w-full"
                      >
                        {translatedText}
                      </p>
                      
                      {/* Copy and Play voice widgets */}
                      <div className="flex gap-1.5 shrink-0 self-start">
                        <button
                          id="btn-pronounce-target"
                          type="button"
                          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 dark:hover:text-emerald-400 hover:scale-105 transition"
                          onClick={() => handleSpeak(translatedText, targetLang)}
                          title={t.speakTranslated}
                        >
                          <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-bounce text-emerald-500" : ""}`} />
                        </button>
                        <button
                          id="btn-copy-target"
                          type="button"
                          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 dark:hover:text-emerald-400 hover:scale-105 transition"
                          onClick={() => handleCopy(translatedText)}
                          title={t.copiedToast}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Phonetic Pronunciation transliteration helper */}
                    {transliteration && (
                      <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                            {t.transliteration}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 italic font-medium leading-relaxed">
                          "{transliteration}"
                        </p>
                      </div>
                    )}

                    {/* Grammar notes and Cultural explanation card */}
                    {explanation && (
                      <div className="p-3.5 bg-sky-50/30 dark:bg-sky-950/10 rounded-2xl border border-sky-100/40 dark:border-sky-900/10">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-widest">
                            {t.explanation}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                          {explanation}
                        </p>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="py-8 text-center text-zinc-400 dark:text-zinc-600 text-sm">
                    {t.targetPlaceholder}
                  </div>
                )}
              </div>

              {/* Action translate trigger strip */}
              {!translatedText && inputText && (
                <div className="p-3 bg-zinc-100 dark:bg-zinc-900/50 flex justify-end">
                  <button
                    id="submit-translate-btn"
                    type="button"
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2.5 px-6 rounded-xl transition shadow-md shadow-emerald-500/20 text-sm flex items-center gap-2"
                    onClick={() => handleTranslate()}
                  >
                    <Sparkles className="w-4 h-4 text-white/90" />
                    <span>{t.translateButton}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tap-To-Translate Phrasebook */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/80 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <h3 className="text-sm font-extrabold text-zinc-700 dark:text-zinc-300">
                    {t.quickPhrases}
                  </h3>
                </div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2.5 py-1 rounded-full uppercase font-semibold">
                  {settings.appLocale === "ar" ? "ثنائية اللغة" : "Bilingual"}
                </span>
              </div>

              {/* Categories Tabs layout */}
              <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-thin">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`px-3 py-1.5 text-xs rounded-xl font-semibold shrink-0 transition ${
                      activePhraseCategory === cat
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                        : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                    }`}
                    onClick={() => setActivePhraseCategory(cat)}
                  >
                    {settings.appLocale === "ar" 
                      ? QUICK_PHRASES.find(p => p.category === cat)?.categoryAr || cat 
                      : cat}
                  </button>
                ))}
              </div>

              {/* Phrase items list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {filteredPhrases.map((phrase) => (
                  <button
                    key={phrase.id}
                    type="button"
                    className="p-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 hover:border-emerald-200 dark:hover:border-emerald-900/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 text-left transition group relative flex justify-between items-center"
                    onClick={() => {
                      setInputText(phrase.english);
                      setSourceLang("en");
                      setTargetLang("ar");
                      handleTranslate(phrase.english);
                      showToast(t.tapToTranslate);
                    }}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {phrase.english}
                      </p>
                      <p className="text-xs text-zinc-500 text-right font-medium dir-rtl">
                        {phrase.arabic}
                      </p>
                      <p className="text-[10px] text-zinc-400 italic">
                        {phrase.transliteration}
                      </p>
                    </div>
                    <CornerDownRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>

          </section>

          {/* Android Panel (Favorites, History Logs & Quick Settings Sidebar) */}
          <section className="md:col-span-4 space-y-6">

            {/* Quick configuration settings component */}
            <div className="bg-white dark:bg-zinc-900/50 rounded-3xl p-5 border border-zinc-200/50 dark:border-zinc-800/80 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                  {t.settings}
                </h3>
              </div>

              <div className="space-y-4">
                {/* Voice Gender Switch */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                    {settings.appLocale === "ar" ? "نوع الصوت الصوتي" : "Speech Synthesis Voice"}
                  </span>
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg flex">
                    <button
                      type="button"
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                        settings.voiceGender === "female"
                          ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-600"
                      }`}
                      onClick={() => setSettings(prev => ({ ...prev, voiceGender: "female" }))}
                    >
                      {settings.appLocale === "ar" ? "أنثى" : "Female"}
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                        settings.voiceGender === "male"
                          ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-600"
                      }`}
                      onClick={() => setSettings(prev => ({ ...prev, voiceGender: "male" }))}
                    >
                      {settings.appLocale === "ar" ? "ذكر" : "Male"}
                    </button>
                  </div>
                </div>

                {/* Haptic Toggle */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                    {t.vibrationFeedback}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.vibrateFeedback}
                    onChange={(e) => setSettings(prev => ({ ...prev, vibrateFeedback: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>

                {/* Offline Mode Status Banner context card */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl text-[11px] text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/80 leading-relaxed font-light">
                  <p className="font-medium text-zinc-500 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {settings.appLocale === "ar" ? "تقنية خفيفة الوزن" : "Lightweight translation mode"}
                  </p>
                  {settings.appLocale === "ar" 
                    ? "تطبيق الهواتف يزن أقل من 7 ميجابايت ويعمل فوراً في الخلفية مع ميزة حفظ الكاش." 
                    : "Instantly caches and queries 18 core bilingual conversation classes offline."}
                </div>
              </div>
            </div>

            {/* Translation Record Logs (History & Favorites list) */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/80 shadow-md flex flex-col max-h-[420px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                    {t.historyTitle}
                  </h3>
                </div>

                {history.length > 0 && (
                  <button
                    id="btn-clear-history"
                    type="button"
                    className="text-[11px] text-rose-500 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    onClick={clearHistory}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.clearAll}</span>
                  </button>
                )}
              </div>

              {/* Records feed list */}
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {history.map((record) => (
                  <div
                    key={record.id}
                    id={`history-row-${record.id}`}
                    className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/55 dark:border-zinc-800/90 relative group hover:border-emerald-300 dark:hover:border-emerald-800/80 transition"
                  >
                    {/* Header flags log indication */}
                    <div className="flex items-center justify-between mb-1.5 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                      <span>
                        {getLanguageFlag(record.sourceLang)} {getLanguageName(record.sourceLang)} ⟶ {getLanguageFlag(record.targetLang)} {getLanguageName(record.targetLang)}
                      </span>

                      {/* Spark star favoriting option */}
                      <button
                        type="button"
                        className="opacity-95 text-zinc-400 hover:text-amber-500 active:scale-110 transition"
                        onClick={() => toggleFavorite(record.id)}
                        title={record.isFavorite ? "Unsave" : "Save to Favorites"}
                      >
                        <Star className={`w-3.5 h-3.5 ${record.isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
                      </button>
                    </div>

                    {/* Source & Translated Text */}
                    <div 
                      className="space-y-1 cursor-pointer"
                      onClick={() => {
                        setInputText(record.text);
                        setTranslatedText(record.translatedText);
                        setTransliteration(record.transliteration || "");
                        setExplanation(record.explanation || "");
                        setSourceLang(record.sourceLang);
                        setTargetLang(record.targetLang);
                        showToast("Recalled translation");
                      }}
                      title="Click to recall translation"
                    >
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {record.text}
                      </p>
                      <p className="text-xs text-teal-600 dark:text-teal-400 font-extrabold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500" />
                        {record.translatedText}
                      </p>
                    </div>

                    {/* Utilities within listing */}
                    <div className="flex justify-end gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition duration-150">
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
                        onClick={() => handleSpeak(record.translatedText, record.targetLang)}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
                        onClick={() => handleCopy(record.translatedText)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {history.length === 0 && (
                  <div className="py-12 text-center text-zinc-400 dark:text-zinc-600 text-xs flex flex-col items-center justify-center gap-2">
                    <History className="w-8 h-8 text-zinc-300 dark:text-zinc-800 mb-1 stroke-1" />
                    <span>{t.noHistory}</span>
                  </div>
                )}
              </div>
            </div>

          </section>

        </main>
      </div>

      {/* Floating status Toast Notification */}
      {toast.visible && (
        <div 
          id="system-toast"
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-800 dark:bg-zinc-100 dark:border-zinc-200 text-zinc-100 dark:text-zinc-900 font-bold text-xs py-3 px-6 rounded-full shadow-2xl flex items-center gap-2 transition-all duration-300 transform scale-100"
        >
          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
