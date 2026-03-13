// pages/Home.jsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';

function Home() {
    const { isAuthenticated } = useAuth();
    const { t } = useTranslation();
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('home.title')}</h1>
                <p className="text-lg text-gray-600 mb-8">{t('home.subtitle')}</p>
                <div className="flex gap-4 justify-center">
                    {isAuthenticated ? (
                        <Link to="/dashboard" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
                            {t('home.cta_dashboard')}
                        </Link>
                    ) : (
                        <>
                            <Link to="/register" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
                                {t('home.cta_start')}
                            </Link>
                            <Link to="/login" className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition">
                                {t('home.cta_login')}
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Home;