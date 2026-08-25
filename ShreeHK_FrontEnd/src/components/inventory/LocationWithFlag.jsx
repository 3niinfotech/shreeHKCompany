import ReactCountryFlag from "react-country-flag";
import React from "react";
const LOCATION_TO_COUNTRY = {
  hk: "HK",
  hks: "HK",
  "hk-s": "HK",
  "hk s": "HK",
  hd: "HK",
  "hong kong": "HK",
  ny: "US",
  "new york": "US",
  la: "US",
  "los angeles": "US",
  usa: "US",
  mumbai: "IN",
  surat: "IN",
  india: "IN",
  ind: "IN",
  delhi: "IN",
  jaipur: "IN",
  chennai: "IN",
  kolkata: "IN",
  antwerp: "BE",
  belgium: "BE",
  london: "UK",
  uk: "GB",
  dubai: "AE",
  uae: "AE",
  tokyo: "JP",
  japan: "JP",
  bangkok: "TH",
  thailand: "TH",
  israel: "IL",
  "tel aviv": "IL",
  ramat_gan: "IL",
  switzerland: "CH",
  geneva: "CH",
  singapore: "SG",
  china: "CN",
  shanghai: "CN",
  shenzhen: "CN",
  australia: "AU",
  sydney: "AU",
  canada: "CA",
  toronto: "CA",
  russia: "RU",
  moscow: "RU",
  botswana: "BW",
  "south africa": "ZA",
  johannesburg: "ZA",
};

const getCountryCode = (location) => {
  if (!location) return null;
  const str = String(location).trim().toLowerCase();
  if (LOCATION_TO_COUNTRY[str]) return LOCATION_TO_COUNTRY[str];
  if (str.length === 2) return str.toUpperCase();
  if (str.startsWith("ind")) return "IN";
  if (str.startsWith("hks") || str.startsWith("hk") || str.startsWith("hd")) return "HK";
  if (str.startsWith("united states") || str.startsWith("u.s")) return "US";
  if (str.startsWith("united arab") || str.startsWith("u.a.e")) return "AE";
  if (str.startsWith("united kingdom") || str.startsWith("u.k")) return "GB";
  return null;
};

const LocationWithFlag = ({ location }) => {
  if (!location) return "-";
  const code = getCountryCode(location);
  return (
    <span className="inventory-location-cell">
      {code ? (
        <ReactCountryFlag
          countryCode={code}
          svg
          className="inventory-location-flag"
          style={{ width: 18, height: 14 }}
        />
      ) : null}
      <span className="inventory-location-label">{location}</span>
    </span>
  );
};

export const renderLocationWithFlag = (location) => (
  <MemoizedLocationWithFlag location={location} />
);

const MemoizedLocationWithFlag = React.memo(LocationWithFlag);

export default MemoizedLocationWithFlag;
