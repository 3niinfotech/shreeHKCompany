import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input, Spin, Tooltip, message } from "antd";
import { AudioOutlined, SearchOutlined } from "@ant-design/icons";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import styles from "../../assets/scss/components/inventorySmartSearch.module.scss";

const TYPE_CLASS = {
  sku: styles.typeSku,
  mfg: styles.typeMfg,
  report: styles.typeReport,
  shape: styles.typeShape,
  cut: styles.typeCut,
  polish: styles.typePolish,
  carat: styles.typeCarat,
};

const TYPE_SHORT = {
  sku: "SKU",
  mfg: "MFG",
  report: "RPT",
  shape: "SHP",
  cut: "CUT",
  polish: "POL",
  carat: "CT",
};

const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

const InventorySmartSearch = ({
  value = "",
  onChange,
  onSearch,
  onSuggestionSelect,
  placeholder = "SKU · Shape · Cut · Polish · Carat · Report",
  className = "",
  variant = "default",
  inputRef = null,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const onDocMouseDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      abortRef.current?.abort();
    };
  }, []);

  const fetchSuggestions = useCallback(async (query) => {
    const trimmed = String(query ?? "").trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setFetching(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setFetching(true);
    setDropdownOpen(true);

    try {
      const res = await api.get(ENDPOINTS.product.inventorySuggest, {
        params: { q: trimmed, limit: 12 },
        signal: controller.signal,
      });
      if (requestId !== requestIdRef.current) return;

      const items = Array.isArray(res.data?.Data) ? res.data.Data : [];
      setSuggestions(items);
      setDropdownOpen(true);
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      setSuggestions([]);
      message.error("Search suggestions unavailable — check login / backend");
    } finally {
      if (requestId === requestIdRef.current) {
        setFetching(false);
      }
    }
  }, []);

  const debouncedFetch = useMemo(
    () => debounce((query) => fetchSuggestions(query), 250),
    [fetchSuggestions],
  );

  const handleSpeechResult = useCallback(
    (transcript, isFinal) => {
      if (!transcript) return;
      onChange?.(transcript);
      debouncedFetch(transcript);
      if (isFinal) onSearch?.();
    },
    [onChange, debouncedFetch, onSearch],
  );

  const { listening, supported, toggle, stop } = useSpeechRecognition({
    onResult: handleSpeechResult,
    lang: "en-IN",
  });

  const handleInputChange = (event) => {
    const text = String(event.target?.value ?? "");
    onChange?.(text);
    if (!text.trim()) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    setDropdownOpen(true);
    debouncedFetch(text);
  };

  const handleSuggestionClick = (item) => {
    stop();
    setDropdownOpen(false);
    setSuggestions([]);

    if (item.type === "shape" || item.type === "carat") {
      onChange?.("");
    } else {
      onChange?.(item.value);
    }
    onSuggestionSelect?.(item);
  };

  const handleMicClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!supported) {
      message.warning("Voice search: use Chrome or Edge and allow microphone");
      return;
    }
    toggle();
  };

  const handlePressEnter = () => {
    stop();
    setDropdownOpen(false);
    setSuggestions([]);
    onSearch?.();
  };

  const showDropdown = dropdownOpen && (fetching || suggestions.length > 0);

  const wrapperClass = [
    styles.searchWrapper,
    variant === "header" ? styles.searchWrapperHeader : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const micControl = (
    <Tooltip
      title={
        supported
          ? listening
            ? "Listening… click to stop"
            : "Voice search"
          : "Voice search (Chrome / Edge)"
      }
    >
      <button
        type="button"
        className={`${styles.micBtn} ${variant === "default" ? styles.micBtnInside : ""} ${listening ? styles.micBtnActive : ""}`}
        onClick={handleMicClick}
        aria-label={listening ? "Stop voice search" : "Start voice search"}
      >
        <AudioOutlined />
      </button>
    </Tooltip>
  );

  return (
    <div ref={wrapperRef} className={wrapperClass}>
      <div className={styles.searchRow}>
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setDropdownOpen(true);
          }}
          placeholder={placeholder}
          prefix={<SearchOutlined />}
          className={styles.searchInput}
          onPressEnter={handlePressEnter}
          allowClear={variant !== "header"}
          suffix={
            variant === "header" ? (
              <span className={styles.headerInputSuffix}>{micControl}</span>
            ) : (
              micControl
            )
          }
        />

        {variant === "header" ? (
          <span className={styles.shortcutBadge} aria-hidden="true">
            Ctrl + K
          </span>
        ) : null}
      </div>

      {showDropdown ? (
        <div className={styles.suggestList} role="listbox">
          {fetching && suggestions.length === 0 ? (
            <div className={styles.loadingRow}>
              <Spin size="small" /> Searching…
            </div>
          ) : null}
          {suggestions.map((item, index) => (
            <button
              key={`${item.type}-${item.value}-${index}`}
              type="button"
              className={styles.suggestItem}
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSuggestionClick(item)}
            >
              <span className={styles.optionLabel}>
                <span className={`${styles.typeTag} ${TYPE_CLASS[item.type] || ""}`}>
                  {TYPE_SHORT[item.type] || item.type}
                </span>
                {item.label}
              </span>
              {item.meta ? <span className={styles.optionMeta}>{item.meta}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {listening ? (
        <span className={styles.listeningHint} role="status">
          Listening — speak SKU, shape, cut, polish, or carat…
        </span>
      ) : null}
    </div>
  );
};

export default InventorySmartSearch;
