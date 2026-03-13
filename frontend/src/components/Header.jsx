// components/Header.jsx
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';

const languages = [
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
];

function Header() {
    const { user, isAuthenticated, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'fr').slice(0, 2);
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    const handleLanguageChange = (event) => {
        i18n.changeLanguage(event.target.value);
    };
    return (
        <header className="bg-blue-600 text-white shadow-lg">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold hover:text-blue-200 transition">
                    Starter Kit
                </Link>
                <nav className="flex gap-6 items-center">
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `hover:text-blue-200 transition ${isActive ? 'font-bold' : ''}`
                        }
                    >
                        {t('nav.home')}
                    </NavLink>
                    {isAuthenticated && (
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                                `hover:text-blue-200 transition ${isActive ? 'font-bold' : ''}`
                            }
                        >
                            {t('nav.dashboard')}
                        </NavLink>
                    )}
                    {isAuthenticated && (
                        <NavLink
                            to="/email"
                            className={({ isActive }) =>
                                `hover:text-blue-200 transition ${isActive ? 'font-bold' : ''}`
                            }
                        >
                            {t('nav.email')}
                        </NavLink>
                    )}
                </nav>
                <div className="flex gap-4 items-center">
                    <select
                        value={currentLanguage}
                        onChange={handleLanguageChange}
                        className="text-sm bg-blue-500 hover:bg-blue-400 px-2 py-1 rounded transition font-mono text-white"
                        title="Changer de langue"
                    >
                        {languages.map((language) => (
                            <option key={language.code} value={language.code} className="text-black">
                                {language.label}
                            </option>
                        ))}
                    </select>
                    {isAuthenticated ? (
                        <>
                            <span className="text-sm">{user?.email}</span>
                            <button
                                onClick={handleLogout}
                                className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition font-medium"
                            >
                                {t('nav.logout')}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="hover:text-blue-200 transition font-medium"
                            >
                                {t('nav.login')}
                            </Link>
                            <Link
                                to="/register"
                                className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition font-medium"
                            >
                                {t('nav.register')}
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
export default Header;