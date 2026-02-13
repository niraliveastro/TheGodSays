"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";

const SUGGEST_DEBOUNCE_MS = 300;

/**
 * Place input with suggestion dropdown. Uses /api/geocode (Nominatim) for suggestions.
 * Same UI pattern as talk-to-ai-astrologer place field.
 * @param {string} value - Controlled input value
 * @param {function} onChange - (value: string) => void
 * @param {function} onPlaceSelect - ({ latitude, longitude, label }) => void
 * @param {string} [placeholder] - Input placeholder
 * @param {string} [id] - Input id
 * @param {string} [className] - Wrapper class
 * @param {string} [inputClassName] - Input class (e.g. form-field-input)
 * @param {boolean} [disabled]
 * @param {object} [inputStyle] - Inline styles for input
 * @param {string} [ariaLabel]
 */
export default function PlaceInputWithSuggestions({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "e.g. Ujjain, Mumbai, Delhi",
  id,
  className = "",
  inputClassName = "",
  disabled = false,
  inputStyle = {},
  ariaLabel = "Location",
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const q = (value || "").trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSuggestions(
            data.map((item) => ({
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
              label: item.display_name || "",
            }))
          );
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setSuggesting(false);
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    onPlaceSelect({ latitude: item.latitude, longitude: item.longitude, label: item.label });
    onChange(item.label);
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-label={ariaLabel}
        className={inputClassName}
        style={inputStyle}
      />
      {showDropdown && (suggestions.length > 0 || suggesting) && (
        <div
          className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          role="listbox"
        >
          {suggesting && (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              Loading suggestions...
            </div>
          )}
          {!suggesting &&
            suggestions.map((item, index) => (
              <button
                key={`${item.latitude}-${item.longitude}-${index}`}
                type="button"
                role="option"
                onClick={() => handleSelect(item)}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{item.label}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
