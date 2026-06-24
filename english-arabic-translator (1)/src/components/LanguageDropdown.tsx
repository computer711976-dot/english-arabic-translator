import React, { useState } from "react";
import { ChevronDown, Search, Check, Globe } from "lucide-react";
import { Language } from "../types";
import { LANGUAGES } from "../utils/languages";

interface LanguageDropdownProps {
  id: string;
  selectedCode: string;
  onChange: (code: string) => void;
  excludeCode?: string;
  allowAuto?: boolean;
  locale: "en" | "ar";
}

export default function LanguageDropdown({
  id,
  selectedCode,
  onChange,
  excludeCode,
  allowAuto = false,
  locale,
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedLang = LANGUAGES.find((l) => l.code === selectedCode);

  const filteredLanguages = LANGUAGES.filter((lang) => {
    if (excludeCode && lang.code === excludeCode) return false;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      lang.name.toLowerCase().includes(searchLower) ||
      lang.nativeName.toLowerCase().includes(searchLower) ||
      lang.code.includes(searchLower)
    );
  });

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative inline-block text-left w-full md:w-auto" id={id}>
      <button
        id={`${id}-trigger`}
        type="button"
        className="w-full inline-flex items-center justify-between gap-x-1.5 rounded-xl bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2">
          {selectedCode === "auto" ? (
            <>
              <Globe className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>{locale === "ar" ? "الكشف التلقائي" : "Auto-detect"}</span>
            </>
          ) : (
            <>
              <span className="text-base leading-none">{selectedLang?.flag}</span>
              <span>{selectedLang?.name} ({selectedLang?.nativeName})</span>
            </>
          )}
        </span>
        <ChevronDown className="-mr-1 h-4 w-4 text-zinc-400" aria-hidden="true" />
      </button>

      {isOpen && (
        <div 
          id={`${id}-menu`}
          className="absolute right-0 top-12 z-50 mt-2 w-72 origin-top-right rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none overflow-hidden animate-in fade-in duration-100"
        >
          {/* Search Header */}
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
            <div className="relative flex items-center bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2 py-1">
              <Search className="w-4 h-4 text-zinc-400 mr-2" />
              <input
                id={`${id}-search`}
                type="text"
                placeholder={locale === "ar" ? "ابحث عن لغة..." : "Search language..."}
                className="w-full text-xs bg-transparent border-0 text-zinc-900 dark:text-zinc-100 focus:outline-none h-6 px-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {allowAuto && (
              <button
                id={`${id}-auto-option`}
                type="button"
                className="flex items-center justify-between w-full px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left"
                onClick={() => handleSelect("auto")}
              >
                <span className="flex items-center gap-2 font-medium text-emerald-500">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "اكتشاف تلقائي للهجة" : "Auto-detect language"}</span>
                </span>
                {selectedCode === "auto" && <Check className="w-4 h-4 text-emerald-500" />}
              </button>
            )}

            {filteredLanguages.map((lang) => (
              <button
                id={`${id}-option-${lang.code}`}
                key={lang.code}
                type="button"
                className="flex items-center justify-between w-full px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left"
                onClick={() => handleSelect(lang.code)}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.name} <span className="text-zinc-400 font-normal">({lang.nativeName})</span></span>
                </span>
                {selectedCode === lang.code && <Check className="w-4 h-4 text-emerald-500" />}
              </button>
            ))}

            {filteredLanguages.length === 0 && (
              <div className="px-4 py-4 text-xs text-zinc-500 text-center">
                {locale === "ar" ? "لم يتم العثور على لغات" : "No languages found"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
