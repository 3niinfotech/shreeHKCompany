const flagMap = {
    INR: '🇮🇳', RUPEE: '🇮🇳', RUPEES: '🇮🇳', RUPPEE: '🇮🇳', INDIA: '🇮🇳',
    USD: '🇺🇸',
    EUR: '🇪🇺', EURO: '🇪🇺',
    GBP: '🇬🇧', POUND: '🇬🇧',
    JPY: '🇯🇵', YEN: '🇯🇵',
    CNY: '🇨🇳', YUAN: '🇨🇳', RMB: '🇨🇳',
    AED: '🇦🇪', DHIRAM: '🇦🇪', DIRHAM: '🇦🇪',
    HKD: '🇭🇰',
    SGD: '🇸🇬',
    AUD: '🇦🇺',
    CAD: '🇨🇦',
    CHF: '🇨🇭',
    THB: '🇹🇭', BAHT: '🇹🇭',
    SAR: '🇸🇦', RIYAL: '🇸🇦',
    ZAR: '🇿🇦',
    BRL: '🇧🇷',
    KRW: '🇰🇷',
    MYR: '🇲🇾',
    TWD: '🇹🇼',
    NZD: '🇳🇿',
    SEK: '🇸🇪',
    NOK: '🇳🇴',
    DKK: '🇩🇰',
    RUB: '🇷🇺',
    TRY: '🇹🇷', LIRA: '🇹🇷',
    ILS: '🇮🇱',
    PKR: '🇵🇰',
    BDT: '🇧🇩',
    LKR: '🇱🇰',
    NPR: '🇳🇵',
};

export const getCurrencyFlag = (currency) => {
    if (!currency) return '💱';
    const key = String(currency).trim().toUpperCase().split(/[\s\-–]/)[0];
    return flagMap[key] || '💱';
};
