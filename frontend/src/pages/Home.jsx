import { useTranslation } from 'react-i18next';

function Home() {
    const { t } = useTranslation();
    const poems = t('poems.items', { returnObjects: true });
    const featuredPoem = poems[0];
    const otherPoems = poems.slice(1);

    return (
        <div className="poetry-page text-stone-100">
            <section id="hero" className="mx-auto flex min-h-[58vh] w-full max-w-6xl flex-col justify-center px-4 pb-10 pt-14 md:px-6 md:pt-20">
                <p className="mb-5 text-xs uppercase tracking-[0.35em] text-amber-100/70">{t('home.kicker')}</p>
                <h1 className="poetry-title mb-5 max-w-4xl text-5xl leading-tight md:text-7xl">{t('home.title')}</h1>
                <p className="max-w-2xl text-lg leading-relaxed text-amber-50/85 md:text-xl">{t('home.subtitle')}</p>
            </section>

            <section className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-6" id="collection">
                <h2 className="mb-4 text-3xl md:text-4xl">{t('home.featured')}</h2>
                <article className="poem-card poem-card-featured mb-8">
                    <p className="mb-2 text-xs uppercase tracking-[0.3em] text-amber-200/80">{featuredPoem.theme}</p>
                    <h3 className="mb-4 text-3xl leading-tight md:text-4xl">{featuredPoem.title}</h3>
                    <div className="space-y-1 text-lg text-amber-50/90">
                        {featuredPoem.lines.map((line, index) => (
                            <p key={`featured-line-${index}`}>{line}</p>
                        ))}
                    </div>
                </article>

                <div className="grid gap-5 md:grid-cols-2">
                    {otherPoems.map((poem, poemIndex) => (
                        <article className="poem-card" key={poem.title} style={{ animationDelay: `${poemIndex * 120}ms` }}>
                            <p className="mb-2 text-xs uppercase tracking-[0.28em] text-amber-200/70">{poem.theme}</p>
                            <h3 className="mb-3 text-2xl">{poem.title}</h3>
                            <div className="space-y-1 text-base text-amber-50/90">
                                {poem.lines.map((line, lineIndex) => (
                                    <p key={`${poem.title}-line-${lineIndex}`}>{line}</p>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section id="manifest" className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 md:px-6">
                <div className="manifest-card">
                    <h2 className="mb-3 text-2xl md:text-3xl">{t('home.manifestTitle')}</h2>
                    <p className="max-w-3xl leading-relaxed text-amber-50/85">{t('home.manifestText')}</p>
                </div>
            </section>
        </div>
    );
}

export default Home;