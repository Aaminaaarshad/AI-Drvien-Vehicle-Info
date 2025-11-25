import React from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const { t } = useTranslation("app");

  return (
    <header className="bg-white shadow flex justify-between items-center w-full px-4 sm:px-6">
      {/* Left side */}
      <h1 className="text-xl font-semibold text-gray-900 py-4">
        {t("vehDash")}
      </h1>

      {/* Right side */}
      <LanguageSwitcher />
    </header>
  );
}
