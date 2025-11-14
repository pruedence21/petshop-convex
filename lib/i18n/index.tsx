"use client";

import React, { createContext, useContext, useMemo, useState } from 'react';
import { messagesId } from './messages-id';
import { messagesEn } from './messages-en';

export type Locale = 'id' | 'en';

const messageMap: Record<Locale, Record<string, string>> = {
  id: messagesId,
  en: messagesEn,
};

interface I18nContextValue {
  locale: Locale;
  t: (key: string, fallback?: string) => string;
  switchLocale: (loc: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider: React.FC<React.PropsWithChildren<{ initialLocale?: Locale }>> = ({
  initialLocale = 'id',
  children,
}) => {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = useMemo(() => {
    const dict = messageMap[locale] || {};
    return (key: string, fallback?: string) => dict[key] ?? fallback ?? key;
  }, [locale]);
  const switchLocale = (loc: Locale) => setLocale(loc);
  return (
    <I18nContext.Provider value={{ locale, t, switchLocale }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
