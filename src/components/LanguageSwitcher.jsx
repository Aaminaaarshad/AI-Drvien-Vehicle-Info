// LanguageSwitcher.jsx
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";


const Flag = ({ code, ...props }) =>
  code === "no" ? (
    /* NORWAY */
    <svg viewBox="0 0 22 16" {...props}>
      <path fill="#EF2B2D" d="M0 0h22v16H0z" />
      <path fill="#fff" d="M0 0h8v16H0zM0 6h22v4H0z" />
      <path fill="#002868" d="M0 7h22v2H0zM5 0h2v16H5z" />
    </svg>
  ) : (
    /* UNITED STATES */
    <svg viewBox="0 0 22 16" {...props}>
      <defs>
        <path id="s" d="M0 0l1 1h1z" />
      </defs>
      <rect fill="#B22234" width="22" height="16" />
      <path fill="#fff" d="M0 1h22v1H0zm0 2h22v1H0zm0 2h22v1H0zm0 2h22v1H0zm0 2h22v1H0zm0 2h22v1H0z" />
      <rect fill="#3C3B6E" width="9.5" height="7" />
      <g fill="#fff">
        <use href="#s" x="1" y="1" />
        <use href="#s" x="3" y="1" />
        <use href="#s" x="5" y="1" />
        <use href="#s" x="7" y="1" />
        <use href="#s" x="2" y="2" />
        <use href="#s" x="4" y="2" />
        <use href="#s" x="6" y="2" />
        <use href="#s" x="1" y="3" />
        <use href="#s" x="3" y="3" />
        <use href="#s" x="5" y="3" />
        <use href="#s" x="7" y="3" />
        <use href="#s" x="2" y="4" />
        <use href="#s" x="4" y="4" />
        <use href="#s" x="6" y="4" />
        <use href="#s" x="1" y="5" />
        <use href="#s" x="3" y="5" />
        <use href="#s" x="5" y="5" />
        <use href="#s" x="7" y="5" />
      </g>
    </svg>
  );


export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [current, setCurrent] = useState(i18n.language || "no");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved && saved !== current) {
      i18n.changeLanguage(saved);
      setCurrent(saved);
    }
  }, []);

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    setCurrent(lang);
  };

  /* SVG flags – inline so no extra files */
  // const Flag = ({ code, ...props }) =>
  //   code === "no" ? (
  //     <svg viewBox="0 0 24 18" {...props}><path fill="#ED2939" d="M0 0h24v18H0z"/><path fill="#fff" d="M0 0h8v18H0z"/><path fill="#002868" d="M0 0h24v7H0z"/><path fill="#fff" d="M0 11h24v7H0z"/></svg>
  //   ) : (
  //     <svg viewBox="0 0 24 18" {...props}><path fill="#012169" d="M0 0h24v18H0z"/><path fill="#C8102E" d="M0 0h24v1.8H0zm0 3.6h24v1.8H0zm0 3.6h24v1.8H0zm0 3.6h24v1.8H0zm0 3.6h24v1.8H0z"/><path fill="#fff" d="M0 1.8h24v1.8H0zm0 3.6h24v1.8H0zm0 3.6h24v1.8H0zm0 3.6h24v1.8H0z"/></svg>
  //   );

  return (
    <div className="flex items-center gap-2">
      {["no", "en"].map((lang) => (
        <button
          key={lang}
          onClick={() => changeLang(lang)}
          className={`rounded overflow-hidden transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${current === lang ? "ring-2 ring-blue-600" : ""}`}
          aria-label={lang === "no" ? "Norsk" : "English"}
        >
          <Flag code={lang} className="w-7 h-5" />
        </button>
      ))}
    </div>
  );
}