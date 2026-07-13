import { useState } from "react";
import { toast } from "sonner";
import InventorySmartSearch from "../inventory/InventorySmartSearch";

const SKU_TYPES = new Set(["sku", "mfg", "report"]);

const TopbarSearch = ({ onSkuSearch, onInventoryFilter, inputRef }) => {
  const [searchText, setSearchText] = useState("");

  const handleSearch = () => {
    const value = searchText.trim();
    if (!value) {
      toast.error("Please enter SKU, shape, cut, polish or carat", { duration: 1500 });
      return;
    }
    onSkuSearch?.(value);
  };

  const handleSuggestionSelect = (suggestion) => {
    const { type, value } = suggestion;
    if (SKU_TYPES.has(type)) {
      onSkuSearch?.(value);
      setSearchText("");
      return;
    }
    onInventoryFilter?.(suggestion);
    setSearchText("");
  };

  return (
    <InventorySmartSearch
      variant="header"
      className="topbar-smart-search"
      inputRef={inputRef}
      value={searchText}
      onChange={setSearchText}
      onSearch={handleSearch}
      onSuggestionSelect={handleSuggestionSelect}
      placeholder="Search by SKU, Shape, Cut, Polish, Carat..."
    />
  );
};

export default TopbarSearch;
