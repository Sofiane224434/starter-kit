// components/Header.jsx
import { useTranslation } from 'react-i18next';

const languages = [
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
];

function Header() {
    const { t, i18n } = useTranslation();
    const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'fr').slice(0, 2);

    const handleLanguageChange = (event) => {
        i18n.changeLanguage(event.target.value);
    };

    return (
        <header className="poetry-header">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 md:px-6">
                <a href="#hero" className="poetry-brand" aria-label={t('nav.home')}>
                    {t('site.title')}
                </a>

                <nav className="hidden items-center gap-6 text-sm font-medium tracking-wide md:flex">
                    <a href="#collection" className="poetry-link">{t('nav.collection')}</a>
                    <a href="#manifest" className="poetry-link">{t('nav.manifest')}</a>
                </nav>

                <div className="flex items-center gap-3">
                    <select
                        value={currentLanguage}
                        onChange={handleLanguageChange}
                        className="rounded-full border border-amber-100/40 bg-stone-900/60 px-3 py-1.5 text-sm text-amber-100 outline-none transition hover:border-amber-100/70"
                        title="Changer de langue"
                    >
                        {languages.map((language) => (
                            <option key={language.code} value={language.code} className="text-black">
                                {language.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </header>
    );
}
export default Header;