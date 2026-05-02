import { Brand } from "@/constants/theme";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

export interface AutocompleteItem {
  id: string;
  name: string;
  metadata?: any;
}

interface AppAutocompleteProps extends Omit<TextInputProps, "onChangeText"> {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  onSelect: (item: AutocompleteItem) => void;
  fetchSuggestions: (query: string) => Promise<AutocompleteItem[]>;
  error?: string;
  minSearchLength?: number;
  debounceMs?: number;
  allowCustom?: boolean;
  customLabel?: string;
}

export function AppAutocomplete({
  label,
  placeholder,
  value,
  onChangeText,
  onSelect,
  fetchSuggestions,
  error,
  minSearchLength = 2,
  debounceMs = 300,
  allowCustom = true,
  customLabel = "Not listed? Add manually",
  ...props
}: AppAutocompleteProps) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectingRef = useRef(false);
  const inputRef = useRef<TextInput | null>(null);

  const runFetch = async (query: string) => {
    setLoading(true);
    try {
      const results = await fetchSuggestions(query);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    } catch (err) {
      console.error("Autocomplete search error:", err);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!focused || value.length < minSearchLength) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      void runFetch(value);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, focused, minSearchLength, debounceMs, fetchSuggestions]);

  const handleSelect = (item: AutocompleteItem) => {
    selectingRef.current = false;
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    onSelect(item);
    setShowDropdown(false);
    setFocused(false);
    Keyboard.dismiss();
  };

  const handleManualEntry = () => {
    selectingRef.current = false;
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setShowDropdown(false);
    setFocused(false);
    Keyboard.dismiss();
  };

  const handleToggleDropdown = async () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    if (showDropdown) {
      setShowDropdown(false);
      return;
    }

    setFocused(true);
    await runFetch("");
  };

  return (
    <View
      style={[
        styles.wrapper,
        (focused || showDropdown) && styles.wrapperActive,
      ]}
    >
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[
          styles.inputRow,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
        onPress={() => {
          if (props.editable === false) {
            void handleToggleDropdown();
            return;
          }
          inputRef.current?.focus();
        }}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
            }
            setFocused(true);
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => {
              if (selectingRef.current) return;
              setFocused(false);
              setShowDropdown(false);
            }, 220);
          }}
          {...props}
        />

        {!loading ? (
          <TouchableOpacity
            onPress={() => {
              void handleToggleDropdown();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.dropdownIcon}>{showDropdown ? "▲" : "▼"}</Text>
          </TouchableOpacity>
        ) : (
          <ActivityIndicator size="small" color={Brand.primary} />
        )}
      </Pressable>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {showDropdown && (focused || suggestions.length > 0) && (
        <View style={styles.dropdown}>
          <ScrollView
            nestedScrollEnabled
            style={styles.dropdownList}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={suggestions.length > 5}
          >
            {suggestions.map((item) => (
              <Pressable
                key={item.id}
                style={styles.suggestionItem}
                onPressIn={() => {
                  selectingRef.current = true;
                }}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.suggestionText}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {allowCustom && (
            <TouchableOpacity
              style={styles.customOption}
              onPress={handleManualEntry}
              activeOpacity={0.7}
            >
              <Text style={styles.customOptionText}>➕ {customLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    zIndex: 1,
    elevation: 1,
    position: "relative",
  },
  wrapperActive: {
    zIndex: 9999,
    elevation: 9999,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: Brand.primary,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  dropdown: {
    position: "absolute",
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10000,
    zIndex: 10000,
    overflow: "hidden",
  },
  dropdownList: {
    maxHeight: 220,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  suggestionText: {
    fontSize: 14,
    color: "#334155",
  },
  customOption: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  customOptionText: {
    fontSize: 13,
    color: Brand.primary,
    fontWeight: "600",
  },
  dropdownIcon: {
    fontSize: 14,
    color: Brand.primary,
    fontWeight: "700",
    marginLeft: 8,
  },
});
