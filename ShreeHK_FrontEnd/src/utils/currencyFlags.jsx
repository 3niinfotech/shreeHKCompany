import React from 'react';
import ReactCountryFlag from 'react-country-flag';
import { Coins } from 'lucide-react';

const currencyToCountryMap = {
    // Standard ISO Currency Codes
    USD: 'US',
    INR: 'IN',
    HKD: 'HK',
    EUR: 'EU',
    GBP: 'GB',
    JPY: 'JP',
    CNY: 'CN',
    AED: 'AE',
    SGD: 'SG',
    AUD: 'AU',
    CAD: 'CA',
    CHF: 'CH',
    THB: 'TH',
    SAR: 'SA',
    ZAR: 'ZA',
    BRL: 'BR',
    KRW: 'KR',
    MYR: 'MY',
    TWD: 'TW',
    NZD: 'NZ',
    SEK: 'SE',
    NOK: 'NO',
    DKK: 'DK',
    RUB: 'RU',
    TRY: 'TR',
    ILS: 'IL',
    PKR: 'PK',
    BDT: 'BD',
    LKR: 'LK',
    NPR: 'NP',
    EGP: 'EG',
    VND: 'VN',
    IDR: 'ID',
    PHP: 'PH',
    MXN: 'MX',
    PLN: 'PL',
    KWD: 'KW',
    QAR: 'QA',
    BHD: 'BH',
    OMR: 'OM',
    KGS: 'KG',
    KZT: 'KZ',
    UZS: 'UZ',

    // Alternate Currency Names / Terms
    DOLLAR: 'US',
    RUPEE: 'IN',
    RUPEES: 'IN',
    RUPPEE: 'IN',
    RS: 'IN',
    INDIA: 'IN',
    EURO: 'EU',
    POUND: 'GB',
    UK: 'GB',
    YEN: 'JP',
    JAPAN: 'JP',
    YUAN: 'CN',
    RMB: 'CN',
    CHINA: 'CN',
    DIRHAM: 'AE',
    DHIRAM: 'AE',
    DUBAI: 'AE',
    UAE: 'AE',
    BAHT: 'TH',
    RIYAL: 'SA',
    RINGGIT: 'MY',
    WON: 'KR',
    LIRA: 'TR',
    SHEKEL: 'IL',
    TAKA: 'BD',
    DONG: 'VN',
    RUPIAH: 'ID',
    PESO: 'PH',
};

// eslint-disable-next-line react-refresh/only-export-components
export const getCountryCodeFromCurrency = (currency) => {
    if (!currency) return null;
    const cleanStr = String(currency).trim().toUpperCase();

    if (currencyToCountryMap[cleanStr]) {
        return currencyToCountryMap[cleanStr];
    }

    const tokens = cleanStr.split(/[^A-Z0-9]+/);
    for (const token of tokens) {
        if (token && currencyToCountryMap[token]) {
            return currencyToCountryMap[token];
        }
    }
    return null;
};

export const CurrencyFlag = ({ currency, className, style }) => {
    const countryCode = getCountryCodeFromCurrency(currency);

    if (countryCode) {
        return (
            <ReactCountryFlag
                countryCode={countryCode}
                svg
                aria-label={currency}
                title={currency}
                style={{
                    width: '22px',
                    height: '16px',
                    borderRadius: '2px',
                    objectFit: 'cover',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.18)',
                    verticalAlign: 'middle',
                    display: 'inline-block',
                    ...style,
                }}
                className={className}
            />
        );
    }

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                verticalAlign: 'middle',
            }}
            title={currency || 'Unknown Currency'}
        >
            <Coins size={16} style={{ color: 'var(--color-text-muted, #94a3b8)' }} />
        </span>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const getCurrencyFlag = (currency) => {
    return <CurrencyFlag currency={currency} />;
};

export default CurrencyFlag;
