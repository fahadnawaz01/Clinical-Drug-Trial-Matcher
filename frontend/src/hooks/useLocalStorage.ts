import { useState, useEffect } from 'react';

interface UseLocalStorageOptions {
  syncAcrossComponents?: boolean;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = { syncAcrossComponents: false }
): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      setStoredValue((currentValue) => {
        // Compute the new value using the current state, not closure
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        
        // Update localStorage
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        // Dispatch event if sync is enabled
        if (options.syncAcrossComponents) {
          window.dispatchEvent(new CustomEvent('localStorageChange', { 
            detail: { key, value: valueToStore } 
          }));
        }
        
        return valueToStore;
      });
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Listen for changes from other components (only if sync is enabled)
  useEffect(() => {
    if (!options.syncAcrossComponents) return;

    const handleStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.key === key) {
        setStoredValue(customEvent.detail.value);
      }
    };

    window.addEventListener('localStorageChange', handleStorageChange);
    return () => window.removeEventListener('localStorageChange', handleStorageChange);
  }, [key, options.syncAcrossComponents]);

  return [storedValue, setValue];
}
