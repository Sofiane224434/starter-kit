import { useTranslation } from 'react-i18next';
import EmailComposer from '../components/EmailComposer.jsx';

function EmailPage() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 px-4 py-10">
            <div className="mx-auto max-w-3xl">
                <div className="mb-8 text-center">
                    <h1 className="mb-3 text-4xl font-bold text-gray-900">{t('email.title')}</h1>
                    <p className="text-lg text-gray-600">{t('email.subtitle')}</p>
                </div>
                <EmailComposer />
            </div>
        </div>
    );
}

export default EmailPage;