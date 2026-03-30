import { useState, useEffect, useRef, useCallback } from 'react';

// Global state to track which dropdown is open
let activeDropdownId: string | null = null;
const dropdownCallbacks: Set<() => void> = new Set();

export const useDropdown = (dropdownId: string) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close this dropdown
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    if (activeDropdownId === dropdownId) {
      activeDropdownId = null;
    }
  }, [dropdownId]);

  // Open this dropdown (and close others)
  const openDropdown = useCallback(() => {
    // Close all other dropdowns
    dropdownCallbacks.forEach(callback => callback());
    
    // Open this one
    setIsOpen(true);
    activeDropdownId = dropdownId;
  }, [dropdownId]);

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }, [isOpen, closeDropdown, openDropdown]);

  // Register callback for global close
  useEffect(() => {
    dropdownCallbacks.add(closeDropdown);
    return () => {
      dropdownCallbacks.delete(closeDropdown);
    };
  }, [closeDropdown]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, closeDropdown]);

  // Close when component unmounts
  useEffect(() => {
    return () => {
      closeDropdown();
    };
  }, [closeDropdown]);

  return {
    isOpen,
    toggleDropdown,
    closeDropdown,
    ref,
    zIndex: isOpen ? 'z-30' : 'z-20',
  };
}; 