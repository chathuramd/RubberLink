import React, { createContext, useContext, useState, useEffect } from 'react';

export const translations = {
  en: {
    // Branding & Header
    brandName: 'RubberLink',
    brandTagline: 'Supply chain tracking platform',
    platformSubtitle: 'Sri Lankan Rubber Supply Chain',
    commercialSuite: 'Commercial Supply Chain Suite',
    workflowDashboard: 'Commercial workflow dashboard',
    livePulse: 'Live Supply Chain Pulse',
    rawToGrading: 'Raw Latex to Factory Grading',
    readyStatus: 'Ready',
    setupNeeded: 'Setup needed',

    // Nav & Menu
    mainMenu: 'Main Menu',
    account: 'Account',
    dashboard: 'Dashboard',
    newBatch: 'New Batch',
    productionRecords: 'Production Records',
    pendingApproval: 'Pending Approval',
    allRecords: 'All Estate Records',
    gradeTransparency: 'Grade Transparency',
    performance: 'Performance',
    reports: 'Reports',
    factoryIntake: 'Factory Intake',
    priceMatrix: 'Price Matrix',
    factoryGrading: 'Factory Grading',
    payments: 'Payments',
    auditLogs: 'Audit Logs',
    systemUsers: 'System Users',
    estates: 'Estates',
    factories: 'Factories',
    ratesSharing: 'Rates & Sharing',
    notifications: 'Notifications',
    profile: 'Profile',
    logout: 'Logout',

    // Roles
    adminRole: 'System Admin',
    tapperRole: 'Rubber Tapper',
    ownerRole: 'Estate Owner',
    factoryRole: 'Factory Manager',
    adminAccent: 'Admin Console',
    tapperAccent: 'Production Desk',
    ownerAccent: 'Estate Operations',
    factoryAccent: 'Factory Procurement',

    // Workflow
    submit: 'Submit',
    approve: 'Approve',
    reject: 'Reject',
    review: 'Review',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    weight: 'Weight (KG)',
    treeCount: 'Tree Count',
    sheetCount: 'Sheet Count',
    expectedGrade: 'Expected Grade',
    assessedGrade: 'Assessed Grade',
    finalGrade: 'Final Grade',
    suggestedGrade: 'Suggested Grade',
    confidence: 'Confidence',
    pricePerKg: 'Price per KG',
    totalPayment: 'Total Payment',
    remarks: 'Remarks / Notes',
    status: 'Status',
    actions: 'Actions',
    evidencePhoto: 'Batch Photo',
    viewDetails: 'View Details',
    quickReview: 'Quick Review & Approval',

    // Transparency & Flow
    gradingTransparency: 'Grading transparency',
    stepOwnerApproved: 'Owner approved batch',
    stepImageValidated: 'Image validated',
    stepMLSuggestion: 'ML suggestion',
    stepFactoryConfirmation: 'Factory confirmation',
    stepPaymentCalculation: 'Payment calculation',
    modelAdvisoryNotice: 'The model suggests a grade. The factory manager remains responsible for the final decision.',

    // Status Badges
    statusPendingOwner: 'Pending Owner Approval',
    statusPendingFactory: 'Pending Factory Grading',
    statusApproved: 'Owner Approved',
    statusRejected: 'Owner Rejected',
    statusCompleted: 'Transaction Completed',

    // Login & Landing
    welcomeBack: 'Welcome back',
    signInTo: 'Sign in to RubberLink',
    signInDesc: 'Select a demo account below for quick testing.',
    emailAddress: 'Email address',
    password: 'Password',
    signInBtn: 'Sign In',
    signingIn: 'Signing in...',
    openSystem: 'Open System',
    workflow: 'Workflow',
    endToEndWorkflow: 'One rubber batch, five controlled steps',
  },

  si: {
    // Branding & Header
    brandName: 'RubberLink',
    brandTagline: 'රබර් සැපයුම් දාම මෙහෙයුම් පද්ධතිය',
    platformSubtitle: 'ශ්‍රී ලාංකික ස්වභාවික රබර් සැපයුම් දාමය',
    commercialSuite: 'වාණිජ රබර් සැපයුම් දාම පද්ධතිය',
    workflowDashboard: 'වාණිජ මෙහෙයුම් පුවරුව',
    livePulse: 'සජීවී සැපයුම් දාම තොරතුරු',
    rawToGrading: 'අමු රබර් කිරි සිට කර්මාන්තශාලා ශ්‍රේණිගත කිරීම දක්වා',
    readyStatus: 'සක්‍රියයි',
    setupNeeded: 'සැකසීම අවශ්‍යයි',

    // Nav & Menu
    mainMenu: 'ප්‍රධාන මෙනුව',
    account: 'ගිණුම',
    dashboard: 'පාලක පුවරුව',
    newBatch: 'නව තොගය ඇතුලත් කිරීම',
    productionRecords: 'නිෂ්පාදන වාර්තා',
    pendingApproval: 'අනුමැතියට ඇති තොග',
    allRecords: 'සියලු වතු වාර්තා',
    gradeTransparency: 'ශ්‍රේණිගත කිරීම් විනිවිදභාවය',
    performance: 'කාර්යසාධනය',
    reports: 'සාරාංශ වාර්තා',
    factoryIntake: 'කර්මාන්තශාලා තොග භාරගැනීම',
    priceMatrix: 'දෛනික මිල සටහන',
    factoryGrading: 'තත්ත්ව ශ්‍රේණිගත කිරීම',
    payments: 'ගෙවීම් කළමනාකරණය',
    auditLogs: 'විගණන සටහන් (Audit Logs)',
    systemUsers: 'පරිශීලකයින්',
    estates: 'රබර් වතු',
    factories: 'කර්මාන්තශාලා',
    ratesSharing: 'මිල ගණන් සහ ආදායම් බෙදීම',
    notifications: 'දැනුම්දීම්',
    profile: 'පැතිකඩ',
    logout: 'පද්ධතියෙන් පිටවීම',

    // Roles
    adminRole: 'පද්ධති පරිපාලක',
    tapperRole: 'කිරි කපන්නා',
    ownerRole: 'වතු හිමිකරු',
    factoryRole: 'කර්මාන්තශාලා කළමනාකරු',
    adminAccent: 'පරිපාලක පාලක පුවරුව',
    tapperAccent: 'නිෂ්පාදන අංශය',
    ownerAccent: 'වතු මෙහෙයුම් අංශය',
    factoryAccent: 'කර්මාන්තශාලා ප්‍රසම්පාදන අංශය',

    // Workflow
    submit: 'ඉදිරිපත් කරන්න',
    approve: 'අනුමත කරන්න',
    reject: 'ප්‍රතික්ෂේප කරන්න',
    review: 'සමාලෝචනය',
    save: 'සුරකින්න',
    cancel: 'අවලංගු කරන්න',
    confirm: 'තහවුරු කරන්න',
    weight: 'බර (කි.ග්‍රෑ.)',
    treeCount: 'ගස් ගණන',
    sheetCount: 'ෂීට් ගණන',
    expectedGrade: 'අපේක්ෂිත ශ්‍රේණිය',
    assessedGrade: 'තක්සේරු ශ්‍රේණිය',
    finalGrade: 'අවසාන ශ්‍රේණිය',
    suggestedGrade: 'AI යෝජිත ශ්‍රේණිය',
    confidence: 'විශ්වාසනීයත්වය',
    pricePerKg: 'කිලෝවක මිල',
    totalPayment: 'මුළු ගෙවීම් මුදල',
    remarks: 'විශේෂ සටහන්',
    status: 'තත්ත්වය',
    actions: 'ක්‍රියාමාර්ග',
    evidencePhoto: 'තොගයේ ඡායාරූපය',
    viewDetails: 'විස්තර බලන්න',
    quickReview: 'ක්ෂණික සමාලෝචනය සහ අනුමැතිය',

    // Transparency & Flow
    gradingTransparency: 'ශ්‍රේණිගත කිරීමේ විනිවිදභාවය',
    stepOwnerApproved: 'වතු හිමි අනුමැතිය',
    stepImageValidated: 'ඡායාරූප පරීක්ෂාව',
    stepMLSuggestion: 'AI යෝජිත ශ්‍රේණිය',
    stepFactoryConfirmation: 'කර්මාන්තශාලා තහවුරු කිරීම',
    stepPaymentCalculation: 'ගෙවීම් ගණනය කිරීම',
    modelAdvisoryNotice: 'AI මාදිලිය මඟින් ශ්‍රේණියක් යෝජනා කරයි. අවසාන තීරණය කර්මාන්තශාලා කළමනාකරු සතු වේ.',

    // Status Badges
    statusPendingOwner: 'වතු හිමි අනුමැතිය බලාපොරොත්තුවෙන්',
    statusPendingFactory: 'ශ්‍රේණිගත කිරීම බලාපොරොත්තුවෙන්',
    statusApproved: 'වතු හිමිකරු අනුමතයි',
    statusRejected: 'වතු හිමිකරු ප්‍රතික්ෂේප කළා',
    statusCompleted: 'ගනුදෙනුව සම්පූර්ණයි',

    // Login & Landing
    welcomeBack: 'නැවත සාදරයෙන් පිළිගනිමු',
    signInTo: 'RubberLink වෙත පිවිසෙන්න',
    signInDesc: 'පහසුවෙන් පරීක්ෂා කිරීමට පහත ගිණුමක් තෝරන්න.',
    emailAddress: 'විද්‍යුත් තැපෑල',
    password: 'මුරපදය',
    signInBtn: 'ඇතුල් වන්න',
    signingIn: 'ඇතුල් වෙමින් පවතී...',
    openSystem: 'පද්ධතියට පිවිසෙන්න',
    workflow: 'ක්‍රියාවලිය',
    endToEndWorkflow: 'රබර් තොගයක් පියවර 5කින් සම්පූර්ණ වන අයුරු',
  },

  ta: {
    // Branding & Header
    brandName: 'RubberLink',
    brandTagline: 'ரப்பர் விநியோகச் சங்கிலி தளம்',
    platformSubtitle: 'இலங்கை இயற்கை ரப்பர் விநியோகச் சங்கிலி',
    commercialSuite: 'வணிக ரப்பர் விநியோக அமைப்பு',
    workflowDashboard: 'வணிக பணிப்பாய்வு பலகை',
    livePulse: 'நேரலை விநியோக சங்கிலி துடிப்பு',
    rawToGrading: 'மூலப்பால் முதல் தொழிற்சாலை தரம் வரை',
    readyStatus: 'தயார்',
    setupNeeded: 'அமைப்பு தேவை',

    // Nav & Menu
    mainMenu: 'முதன்மை மெனு',
    account: 'கணக்கு',
    dashboard: 'கட்டுப்பாட்டு பலகை',
    newBatch: 'புதிய தொகுதி',
    productionRecords: 'உற்பத்தி பதிவுகள்',
    pendingApproval: 'ஒப்புதலுக்காக நிலுவையில்',
    allRecords: 'அனைத்து தோட்ட பதிவுகள்',
    gradeTransparency: 'தர வெளிப்படைத்தன்மை',
    performance: 'செயல்திறன்',
    reports: 'அறிக்கைகள்',
    factoryIntake: 'தொழிற்சாலை சேர்க்கை',
    priceMatrix: 'விலை அட்டவணை',
    factoryGrading: 'தொழிற்சாலை தரம் பிரித்தல்',
    payments: 'கொடுப்பனவுகள்',
    auditLogs: 'தணிக்கை பதிவுகள்',
    systemUsers: 'பயனர்கள்',
    estates: 'ரப்பர் தோட்டங்கள்',
    factories: 'தொழிற்சாலைகள்',
    ratesSharing: 'விலைகள் & வருவாய் பகிர்வு',
    notifications: 'அறிவிப்புகள்',
    profile: 'சுயவிவரம்',
    logout: 'வெளியேறு',

    // Roles
    adminRole: 'கணினி நிர்வாகி',
    tapperRole: 'ரப்பர் வெட்டுபவர்',
    ownerRole: 'தோட்ட உரிமையாளர்',
    factoryRole: 'தொழிற்சாலை மேலாளர்',
    adminAccent: 'நிர்வாக கன்சோல்',
    tapperAccent: 'உற்பத்தி மையம்',
    ownerAccent: 'தோட்ட செயல்பாடுகள்',
    factoryAccent: 'தொழிற்சாலை கொள்முதல்',

    // Workflow
    submit: 'சமர்ப்பிக்கவும்',
    approve: 'அங்கீகரிக்கவும்',
    reject: 'நிராகரிக்கவும்',
    review: 'மதிப்பாய்வு',
    save: 'சேமிக்கவும்',
    cancel: 'ரத்துசெய்',
    confirm: 'உறுதிப்படுத்தவும்',
    weight: 'எடை (KG)',
    treeCount: 'மரங்களின் எண்ணிக்கை',
    sheetCount: 'தாள் எண்ணிக்கை',
    expectedGrade: 'எதிர்பார்க்கப்படும் தரம்',
    assessedGrade: 'மதிப்பிடப்பட்ட தரம்',
    finalGrade: 'இறுதி தரம்',
    suggestedGrade: 'AI பரிந்துரைத்த தரம்',
    confidence: 'நம்பகத்தன்மை',
    pricePerKg: 'ஒரு கிலோ விலை',
    totalPayment: 'மொத்த தொகை',
    remarks: 'குறிப்புகள்',
    status: 'நிலை',
    actions: 'செயல்கள்',
    evidencePhoto: 'தொகுதி புகைப்படம்',
    viewDetails: 'விவரங்களை காண்க',
    quickReview: 'விரைவான மதிப்பாய்வு & ஒப்புதல்',

    // Transparency & Flow
    gradingTransparency: 'தர வெளிப்படைத்தன்மை',
    stepOwnerApproved: 'உரிமையாளர் அங்கீகாரம்',
    stepImageValidated: 'படம் சரிபார்க்கப்பட்டது',
    stepMLSuggestion: 'AI பரிந்துரை',
    stepFactoryConfirmation: 'தொழிற்சாலை உறுதிப்படுத்தல்',
    stepPaymentCalculation: 'கொடுப்பனவு கணக்கீடு',
    modelAdvisoryNotice: 'AI ஒரு தரத்தை பரிந்துரைக்கிறது. இறுதி முடிவுக்கு தொழிற்சாலை மேலாளரே பொறுப்பு.',

    // Status Badges
    statusPendingOwner: 'உரிமையாளர் ஒப்புதலுக்காக',
    statusPendingFactory: 'தொழிற்சாலை தரத்திற்காக',
    statusApproved: 'உரிமையாளர் அங்கீகரித்தார்',
    statusRejected: 'உரிமையாளர் நிராகரித்தார்',
    statusCompleted: 'பரிவர்த்தனை முடிந்தது',

    // Login & Landing
    welcomeBack: 'மீண்டும் வருக',
    signInTo: 'RubberLink இல் உள்நுழைக',
    signInDesc: 'விரைவான சோதனைக்கு கீழே ஒரு கணக்கைத் தேர்ந்தெடுக்கவும்.',
    emailAddress: 'மின்னஞ்சல் முகவரி',
    password: 'கடவுச்சொல்',
    signInBtn: 'உள்நுழைக',
    signingIn: 'உள்நுழைகிறது...',
    openSystem: 'கணினியைத் திறக்கவும்',
    workflow: 'பணிப்பாய்வு',
    endToEndWorkflow: 'ஒரு ரப்பர் தொகுதி, ஐந்து கட்டுப்பாட்டு நிலைகள்',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('rubberlink_lang') || 'en');

  const setLang = (newLang) => {
    if (translations[newLang]) {
      setLangState(newLang);
      localStorage.setItem('rubberlink_lang', newLang);
    }
  };

  const t = (key, fallback) => {
    return translations[lang]?.[key] || translations.en?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: 'en',
      setLang: () => {},
      t: (k, fallback) => fallback || k,
    };
  }
  return ctx;
}

export function LanguageToggle({ className = '' }) {
  const { lang, setLang } = useLanguage();

  const options = [
    { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
    { code: 'si', label: 'සිංහල', flag: '🇱🇰', short: 'සිං' },
    { code: 'ta', label: 'தமிழ்', flag: '🇱🇰', short: 'தமி' },
  ];

  return (
    <div className={`inline-flex items-center rounded-2xl bg-white/90 p-1 shadow-sm ring-1 ring-slate-200/90 backdrop-blur ${className}`}>
      {options.map((opt) => {
        const active = lang === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLang(opt.code)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-black transition-all ${
              active
                ? 'bg-green-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={opt.label}
          >
            <span>{opt.flag}</span>
            <span className="hidden sm:inline">{opt.label}</span>
            <span className="sm:hidden">{opt.short}</span>
          </button>
        );
      })}
    </div>
  );
}
