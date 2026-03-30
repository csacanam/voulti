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
      <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="hover:text-blue-300 transition-colors duration-200">
              <h1 className="text-xl font-bold text-blue-400">{t.header.logo}</h1>
            </Link>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {t.home.heroTitle}
          </h1>
          
          {/* Subtitle */}
          <div className="text-lg md:text-xl text-gray-300 mb-8 space-y-2 leading-relaxed">
            <p>{t.home.heroSubtitle}</p>
          </div>
          
          {/* CTA Button */}
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg shadow-lg hover:shadow-xl"
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
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            {t.home.whyChooseTitle}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Instant Payments */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center hover:border-blue-500/30 transition-colors duration-300">
              <div className="text-4xl mb-6">⚡</div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.home.whyChoose.instantPayments.title}</h3>
              <p className="text-gray-300 leading-relaxed">
                {t.home.whyChoose.instantPayments.description}
              </p>
            </div>

            {/* Low Fees */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center hover:border-blue-500/30 transition-colors duration-300">
              <div className="text-4xl mb-6">💰</div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.home.whyChoose.lowFees.title}</h3>
              <p className="text-gray-300 leading-relaxed">
                {t.home.whyChoose.lowFees.description}
              </p>
            </div>

            {/* Real World */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center hover:border-blue-500/30 transition-colors duration-300">
              <div className="text-4xl mb-6">🌍</div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.home.whyChoose.realWorld.title}</h3>
              <p className="text-gray-300 leading-relaxed">
                {t.home.whyChoose.realWorld.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            {t.home.howItWorksTitle}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-gray-800 rounded-lg border border-gray-600 p-8 text-center hover:border-blue-500/30 transition-colors duration-300">
              <div className="text-5xl mb-6">1️⃣</div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.home.step1Title}</h3>
              <p className="text-gray-300 leading-relaxed">
                {t.home.step1Description}
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-800 rounded-lg border border-gray-600 p-8 text-center hover:border-blue-500/30 transition-colors duration-300">
              <div className="text-5xl mb-6">2️⃣</div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.home.step2Title}</h3>
              <p className="text-gray-300 leading-relaxed">
                {t.home.step2Description}
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-800 rounded-lg border border-gray-600 p-8 text-center hover:border-blue-500/30 transition-colors duration-300">
              <div className="text-5xl mb-6">3️⃣</div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.home.step3Title}</h3>
              <p className="text-gray-300 leading-relaxed">
                {t.home.step3Description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tagline Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg border border-blue-500/20 p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              {t.home.tagline}
            </h2>
            <div className="flex justify-center space-x-4 mt-6">
              <div className="flex items-center space-x-2 text-gray-300">
                <span className="text-green-400">✓</span>
                <span className="text-sm">{t.features.noSetupFees}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <span className="text-green-400">✓</span>
                <span className="text-sm">{t.features.instantSettlement}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <span className="text-green-400">✓</span>
                <span className="text-sm">{t.features.globalReach}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-6 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            {t.footer.builtWithLove}{' '}
            <a 
              href="https://x.com/camilosaka" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
            >
              camilosaka
            </a>
          </p>
        </div>
      </footer>
    </div>
    </>
  );
}; 