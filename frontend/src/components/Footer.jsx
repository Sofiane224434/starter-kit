// components/Footer.jsx
import { useTranslation } from 'react-i18next';

function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="mx-auto w-full max-w-6xl px-4 pb-10 pt-2 md:px-6">
            <div className="border-t border-amber-100/15 pt-6 text-sm text-amber-100/70">
                <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
            </div>
        </footer>
    );
}

export default Footer;