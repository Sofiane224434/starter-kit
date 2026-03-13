import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
function Dashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                    {t('dashboard.title', { name: user?.firstname })}
                </h1>
                <p className="text-lg text-gray-600">
                    {t('dashboard.email_label')} <span className="font-semibold">{user?.email}</span>
                </p>
            </div>
        </div>
    );
}
export default Dashboard;