import ReactCountryFlag from "react-country-flag";

const LOCATION_TO_COUNTRY = {
  hk: "HK",
  "hong kong": "HK",
  ny: "US",
  "new york": "US",
  la: "US",
  "los angeles": "US",
  usa: "US",
  mumbai: "IN",
  surat: "IN",
  india: "IN",
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
  return LOCATION_TO_COUNTRY[String(location).trim().toLowerCase()] || null;
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
  <LocationWithFlag location={location} />
);

export default LocationWithFlag;
