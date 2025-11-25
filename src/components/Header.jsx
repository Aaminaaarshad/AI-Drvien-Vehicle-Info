import React from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const {t} = useTranslation('app');
  return (
    <header className="bg-white shadow flex justify-around">
      <div className="py-4 px-4 sm:px-6">
        <h1 className="text-xl font-semibold text-gray-900">{t('vehDash')}</h1>
      </div>
      <LanguageSwitcher />
    </header>
  );
}