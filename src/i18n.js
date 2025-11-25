import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/* ---- import the two namespace files you created ---- */
import appNB from './locales/no/app.json';
import appEN from './locales/en/app.json';

import listNB from './locales/no/list.json';
import listEN from './locales/en/list.json';

import mdfNB from './locales/no/manualdataform.json';
import mdfEN from './locales/en/manualdataform.json';

/* 1.  Resources */
const resources = {
  no: { app: appNB, list: listNB, mdf: mdfNB }, // ← add list here
  en: { app: appEN, list: listEN, mdf: mdfEN }  // ← add list here
};

/* 2.  Detector config – localStorage key */
const detectorOptions = {
  order: ['localStorage', 'navigator'],
  caches: ['localStorage'],
  lookupLocalStorage: 'i18nextLng'
};

/* 3.  Init */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'no',           // safety net
    debug: false,
    detection: detectorOptions,

    interpolation: { escapeValue: false }
  });

export default i18n;