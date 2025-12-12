'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { PostcodeData } from '../types';

interface LocationSearchProps {
  postcodes: Record<string, PostcodeData>;
  onLocationSelect: (location: { lat: number; lng: number; zoom: number; label: string }) => void;
  placeholder?: string;
}

interface SearchResult {
  type: 'postcode' | 'suburb';
  postcode: string;
  state: string;
  locality?: string;
  lat: number;
  lng: number;
  label: string;
}

export default function LocationSearch({
  postcodes,
  onLocationSelect,
  placeholder = 'Search suburb, city, or postcode...',
}: LocationSearchProps) {
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Build a searchable index of postcodes and suburbs
  const searchIndex = useMemo(() => {
    const index: SearchResult[] = [];

    Object.values(postcodes).forEach((pc) => {
      // Add postcode entry
      index.push({
        type: 'postcode',
        postcode: pc.postcode,
        state: pc.state,
        lat: pc.lat,
        lng: pc.long,
        label: `${pc.postcode} - ${pc.state}`,
      });

      // Add each locality/suburb as a separate entry
      pc.localities.forEach((locality) => {
        index.push({
          type: 'suburb',
          postcode: pc.postcode,
          state: pc.state,
          locality,
          lat: pc.lat,
          lng: pc.long,
          label: `${locality}, ${pc.state} ${pc.postcode}`,
        });
      });
    });

    return index;
  }, [postcodes]);

  // Search and filter results
  useEffect(() => {
    if (searchInput.length < 2) {
      setSuggestions([]);
      return;
    }

    const query = searchInput.toLowerCase().trim();
    const isNumeric = /^\d+$/.test(query);

    let results: SearchResult[] = [];

    if (isNumeric) {
      // Searching for postcode - match from start
      results = searchIndex
        .filter((item) => item.type === 'postcode' && item.postcode.startsWith(query))
        .slice(0, 10);
    } else {
      // Searching for suburb/city name - match anywhere in locality
      results = searchIndex
        .filter((item) => item.type === 'suburb' && item.locality?.toLowerCase().includes(query))
        .slice(0, 10);
    }

    // Remove duplicates by label
    const seen = new Set<string>();
    results = results.filter((r) => {
      if (seen.has(r.label)) return false;
      seen.add(r.label);
      return true;
    });

    setSuggestions(results);
    setSelectedIndex(-1);
  }, [searchInput, searchIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          handleSelect(suggestions[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle selection
  const handleSelect = (result: SearchResult) => {
    setSearchInput(result.label);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);

    // Zoom level: 14 for suburb, 13 for postcode
    const zoom = result.type === 'suburb' ? 14 : 13;

    onLocationSelect({
      lat: result.lat,
      lng: result.lng,
      zoom,
      label: result.label,
    });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search
  const handleClear = () => {
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
        />
        {searchInput && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((result, index) => (
            <button
              key={`${result.postcode}-${result.locality || ''}-${index}`}
              onClick={() => handleSelect(result)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
            >
              <span className="text-gray-400">
                {result.type === 'postcode' ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                )}
              </span>
              <span className="flex-1 truncate">{result.label}</span>
              <span className="text-xs text-gray-400 uppercase">{result.state}</span>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && searchInput.length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-sm text-gray-500">
          No locations found for "{searchInput}"
        </div>
      )}
    </div>
  );
}
