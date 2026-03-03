/**
 * Maps country names to their primary currency codes (ISO 4217).
 */
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Africa
  Nigeria: "NGN",
  "South Africa": "ZAR",
  Kenya: "KES",
  Ghana: "GHS",
  Egypt: "EGP",
  Tanzania: "TZS",
  Ethiopia: "ETB",
  Uganda: "UGX",
  Rwanda: "RWF",
  Cameroon: "XAF",
  Senegal: "XOF",
  Morocco: "MAD",

  // North America
  "United States": "USD",
  Canada: "CAD",
  Mexico: "MXN",

  // Europe
  "United Kingdom": "GBP",
  Germany: "EUR",
  France: "EUR",
  Italy: "EUR",
  Spain: "EUR",
  Netherlands: "EUR",
  Belgium: "EUR",
  Ireland: "EUR",
  Portugal: "EUR",
  Austria: "EUR",
  Greece: "EUR",
  Finland: "EUR",
  Switzerland: "CHF",
  Sweden: "SEK",
  Norway: "NOK",
  Denmark: "DKK",
  Poland: "PLN",
  "Czech Republic": "CZK",
  Romania: "RON",
  Hungary: "HUF",
  Turkey: "TRY",

  // Asia
  India: "INR",
  China: "CNY",
  Japan: "JPY",
  "South Korea": "KRW",
  Indonesia: "IDR",
  Malaysia: "MYR",
  Singapore: "SGD",
  Thailand: "THB",
  Philippines: "PHP",
  Vietnam: "VND",
  Pakistan: "PKR",
  Bangladesh: "BDT",
  "Sri Lanka": "LKR",

  // Middle East
  "United Arab Emirates": "AED",
  "Saudi Arabia": "SAR",
  Qatar: "QAR",
  Kuwait: "KWD",
  Bahrain: "BHD",
  Oman: "OMR",
  Israel: "ILS",

  // South America
  Brazil: "BRL",
  Argentina: "ARS",
  Colombia: "COP",
  Chile: "CLP",
  Peru: "PEN",

  // Oceania
  Australia: "AUD",
  "New Zealand": "NZD",
};

/**
 * Get the ISO 4217 currency code for a given country name.
 * Falls back to 'NGN' if the country is not found.
 */
export function getCurrencyFromCountry(country?: string): string {
  if (!country) return "NGN";
  return COUNTRY_CURRENCY_MAP[country] || "NGN";
}
