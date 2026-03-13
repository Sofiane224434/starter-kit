// components/Footer.jsx
import { useTranslation } from 'react-i18next';
function Footer() {
    const { t } = useTranslation();
    return (
        <footer className="bg-gray-800 text-white py-6 mt-auto">
            <div className="container mx-auto px-4 text-center">
                <p className="text-sm">
                    Starter Kit - {t('footer.copyright', { year: new Date().getFullYear() })}
                </p>
            </div>
        </footer>
    );
}
export default Footer;