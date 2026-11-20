import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SportKey } from '../../services/sports/types';

export interface FavoriteItem {
  id: string;
  name: string;
  type: 'team' | 'league';
  sport: SportKey;
  logo?: string;
}

interface FavoritesContextValue {
  favorites: FavoriteItem[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
  clearFavorites: () => void;
}

const STORAGE_KEY = 'sn_favorites_v1';

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: [],
  isFavorite: () => false,
  toggleFavorite: () => {},
  clearFavorites: () => {},
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  const isFavorite = (id: string) => favorites.some((f) => f.id === id);

  const toggleFavorite = (item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === item.id);
      if (exists) return prev.filter((f) => f.id !== item.id);
      return [item, ...prev];
    });
  };

  const clearFavorites = () => setFavorites([]);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, clearFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
