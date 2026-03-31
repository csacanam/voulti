import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { MetaTags } from './MetaTags';

export const HomePage: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <>
      <MetaTags
        title="Crypto payments made simple for merchants | Voulti"
        description="Accept crypto payments anywhere: in-store or online. No middlemen. Only 1% fee."
      />
      <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="hover:text-violet-700 transition-colors duration-200">
              <h1 className="text-xl font-bold text-violet-600">{t.header.logo}</h1>
            </Link>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-gray-900">
            {t.home.heroTitle}
          </h1>

          {/* Subtitle */}
          <div className="text-lg md:text-xl text-gray-600 mb-8 space-y-2 leading-relaxed">
            <p>{t.home.heroSubtitle}</p>
          </div>

          {/* CTA Button */}
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg shadow-lg hover:shadow-xl"
          >
            {t.home.ctaButton}
          </Link>

          {/* Subcopy */}
          <p className="text-sm text-gray-400 mt-6">
            {t.home.subcopy}
          </p>
        </div>
      </section>

      {/* Why Choose Voulti Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-900">
            {t.home.whyChooseTitle}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Instant Payments */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center hover:border-violet-300 transition-colors duration-300">
              <div className="text-4xl mb-6">⚡</div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">{t.home.whyChoose.instantPayments.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.whyChoose.instantPayments.description}
              </p>
            </div>

            {/* Low Fees */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center hover:border-violet-300 transition-colors duration-300">
              <div className="text-4xl mb-6">💰</div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">{t.home.whyChoose.lowFees.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.whyChoose.lowFees.description}
              </p>
            </div>

            {/* Real World */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center hover:border-violet-300 transition-colors duration-300">
              <div className="text-4xl mb-6">🌍</div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">{t.home.whyChoose.realWorld.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.whyChoose.realWorld.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-900">
            {t.home.howItWorksTitle}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center hover:border-violet-300 transition-colors duration-300">
              <div className="text-5xl mb-6">1️⃣</div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">{t.home.step1Title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.step1Description}
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center hover:border-violet-300 transition-colors duration-300">
              <div className="text-5xl mb-6">2️⃣</div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">{t.home.step2Title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.step2Description}
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center hover:border-violet-300 transition-colors duration-300">
              <div className="text-5xl mb-6">3️⃣</div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">{t.home.step3Title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.step3Description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tagline Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-violet-50 to-violet-100 rounded-xl border border-violet-200 p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">
              {t.home.tagline}
            </h2>
            <div className="flex justify-center space-x-4 mt-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-green-600">✓</span>
                <span className="text-sm">{t.features.noSetupFees}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-green-600">✓</span>
                <span className="text-sm">{t.features.instantSettlement}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-green-600">✓</span>
                <span className="text-sm">{t.features.globalReach}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            &copy; Voulti {new Date().getFullYear()} &middot; A{' '}
            <a href="https://sakalabs.xyz" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-violet-600 font-medium transition-colors">Saka Labs</a>{' '}
            product
          </p>
        </div>
      </footer>
    </div>
    </>
  );
};
