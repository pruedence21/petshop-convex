"use client";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LocaleSwitcher() {
  const { locale, switchLocale } = useI18n();

  const handleSwitch = () => {
    const newLocale = locale === "id" ? "en" : "id";
    switchLocale(newLocale);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      className="gap-2"
      aria-label={`Switch to ${locale === "id" ? "English" : "Indonesian"}`}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-medium uppercase">{locale}</span>
    </Button>
  );
}
