export interface Phrase {
  id: string;
  category: string;
  english: string;
  arabic: string;
  transliteration: string;
  categoryAr: string;
}

export const QUICK_PHRASES: Phrase[] = [
  {
    id: "p1",
    category: "Greetings",
    categoryAr: "التحيات",
    english: "Hello / Peace be upon you",
    arabic: "السلام عليكم",
    transliteration: "As-salamu alaykum"
  },
  {
    id: "p2",
    category: "Greetings",
    categoryAr: "التحيات",
    english: "Good morning",
    arabic: "صباح الخير",
    transliteration: "Sabah al-khayr"
  },
  {
    id: "p3",
    category: "Greetings",
    categoryAr: "التحيات",
    english: "Good evening",
    arabic: "مساء الخير",
    transliteration: "Masa' al-khayr"
  },
  {
    id: "p4",
    category: "Greetings",
    categoryAr: "التحيات",
    english: "Welcome",
    arabic: "أهلاً وسهلاً",
    transliteration: "Ahlan wa sahlan"
  },
  {
    id: "p5",
    category: "Essentials",
    categoryAr: "أساسيات",
    english: "Thank you very much",
    arabic: "شكراً جزيلأ",
    transliteration: "Shukran jazeelan"
  },
  {
    id: "p6",
    category: "Essentials",
    categoryAr: "أساسيات",
    english: "Please",
    arabic: "من فضلك",
    transliteration: "Min fadlik"
  },
  {
    id: "p7",
    category: "Essentials",
    categoryAr: "أساسيات",
    english: "How are you?",
    arabic: "كيف حالك؟",
    transliteration: "Kayfa haluk?"
  },
  {
    id: "p8",
    category: "Essentials",
    categoryAr: "أساسيات",
    english: "I am fine, thank God",
    arabic: "أنا بخير، والحمد لله",
    transliteration: "Ana bikhair, walhamdulillah"
  },
  {
    id: "p9",
    category: "Conversation",
    categoryAr: "محادثة",
    english: "What is your name?",
    arabic: "ما اسمك؟",
    transliteration: "Ma ismuka?"
  },
  {
    id: "p10",
    category: "Conversation",
    categoryAr: "محادثة",
    english: "Nice to meet you",
    arabic: "تشرفنا بمعرفتك",
    transliteration: "Tasharrafna bi-ma'rifatik"
  },
  {
    id: "p11",
    category: "Conversation",
    categoryAr: "محادثة",
    english: "Do you speak English?",
    arabic: "هل تتحدث الإنجليزية؟",
    transliteration: "Hal tatahaddath al-injleeziah?"
  },
  {
    id: "p12",
    category: "Conversation",
    categoryAr: "محادثة",
    english: "I don't speak Arabic well",
    arabic: "أنا لا أتحدث العربية جيداً",
    transliteration: "Ana la atahaddath al-arabiah jayyidan"
  },
  {
    id: "p13",
    category: "Directions",
    categoryAr: "اتجاهات",
    english: "Where is the hotel?",
    arabic: "أين الفندق؟",
    transliteration: "Ayna al-funduq?"
  },
  {
    id: "p14",
    category: "Directions",
    categoryAr: "اتجاهات",
    english: "Where is the nearest restaurant?",
    arabic: "أين أقرب مطعم؟",
    transliteration: "Ayna aqrab mat'am?"
  },
  {
    id: "p15",
    category: "Directions",
    categoryAr: "اتجاهات",
    english: "Excuse me, where is the bathroom?",
    arabic: "المعذرة، أين المرحاض؟",
    transliteration: "Al-ma'dhirah, ayna al-mirhad?"
  },
  {
    id: "p16",
    category: "Directions",
    categoryAr: "اتجاهات",
    english: "Go straight, then turn right",
    arabic: "اذهب مباشرة، ثم انعطف يميناً",
    transliteration: "Idhhab mubasharatan, thumma in'atif yameenan"
  },
  {
    id: "p17",
    category: "Emergency",
    categoryAr: "طوارئ",
    english: "Can you help me?",
    arabic: "هل يمكنك مساعدتي؟",
    transliteration: "Hal yumkinuka musa'adati?"
  },
  {
    id: "p18",
    category: "Emergency",
    categoryAr: "طوارئ",
    english: "I need a doctor",
    arabic: "أحتاج إلى طبيب",
    transliteration: "Ahtaj ila tabeeb"
  }
];

// Offline fuzzy direct-matching translator
export const checkOfflinePhrases = (text: string, source: string, target: string): { translatedText: string; transliteration: string; explanation: string } | null => {
  const normalized = text.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  
  for (const phrase of QUICK_PHRASES) {
    const pEng = phrase.english.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    const pEngSlash = phrase.english.split("/")[0].toLowerCase().trim();
    const pAr = phrase.arabic.trim();

    // Check if matching English
    if (source === "en" && (normalized.includes(pEng) || normalized.includes(pEngSlash) || pEng.includes(normalized))) {
      return {
        translatedText: phrase.arabic,
        transliteration: phrase.transliteration,
        explanation: `Offline Match Found! Category: ${phrase.category}. Pronunciation: ${phrase.transliteration}`
      };
    }
    
    // Check if matching Arabic
    if (source === "ar" && (normalized.includes(pAr) || pAr.includes(normalized))) {
      return {
        translatedText: phrase.english,
        transliteration: phrase.transliteration,
        explanation: `تمت المطابقة دون إنترنت! تصنيف: ${phrase.categoryAr}`
      };
    }
  }
  
  return null;
};
