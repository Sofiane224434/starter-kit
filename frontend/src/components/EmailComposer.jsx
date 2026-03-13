import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { emailService } from '../services/api.js';

function EmailComposer() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [formData, setFormData] = useState({ to: '', subject: '', message: '', name: '' });
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.email) {
            setFormData((current) => ({ ...current, to: current.to || user.email, name: current.name || user.firstname || '' }));
        }
    }, [user]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFeedback({ type: '', message: '' });
        setLoading(true);

        try {
            const response = await emailService.send(formData);
            setFeedback({ type: 'success', message: response.message || t('email.success') });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || t('email.error') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-lg">
            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <label htmlFor="to" className="mb-1 block text-sm font-medium text-gray-700">{t('email.to')}</label>
                    <input id="to" name="to" type="email" value={formData.to} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">{t('email.name')}</label>
                    <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>
            <div>
                <label htmlFor="subject" className="mb-1 block text-sm font-medium text-gray-700">{t('email.subject')}</label>
                <input id="subject" name="subject" type="text" value={formData.subject} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">{t('email.message')}</label>
                <textarea id="message" name="message" value={formData.message} onChange={handleChange} required rows="7" className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {feedback.message && (
                <p className={feedback.type === 'success' ? 'rounded-lg bg-green-50 px-4 py-3 text-green-700' : 'rounded-lg bg-red-50 px-4 py-3 text-red-700'}>
                    {feedback.message}
                </p>
            )}
            <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400">
                {loading ? t('email.sending') : t('email.submit')}
            </button>
        </form>
    );
}

export default EmailComposer;