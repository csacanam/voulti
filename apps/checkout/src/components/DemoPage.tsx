import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { QRCodeComponent } from './QRCode';
import { MetaTags } from './MetaTags';

export const DemoPage: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleContinue = (option: string) => {
    if (option === 'in-store' || option === 'online') {
      navigate('/pay/demo-commerce');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/pay/ad4837a4-c66a-43fe-a1f5-0cc63843dee4`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    window.open(`${window.location.origin}/pay/ad4837a4-c66a-43fe-a1f5-0cc63843dee4`, '_blank');
  };

  const handleDownloadQR = async () => {
    try {
      // Get the entire QR container element
      const qrContainer = document.querySelector('.qr-code-container')?.parentElement?.parentElement as HTMLElement;
      if (!qrContainer) return;

      // Use html2canvas to capture the exact visual representation
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(qrContainer, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        width: qrContainer.offsetWidth,
        height: qrContainer.offsetHeight,
        useCORS: true,
        allowTaint: true
      });

      // Convert to blob and download
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'voulti-qr-code.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  return (
    <>
      <MetaTags 
        title="Test crypto payments – QR, Links & API | Voulti"
        description="Try Voulti: crypto payments with QR codes, payment links, and API integration. Instant, simple, and 1% fee."
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

      {/* Main Content */}
      <section className="py-8 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-left mb-8 md:mb-16">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">
              {t.demo.title}
            </h1>
            
            {/* Subtitle */}
            <p className="text-base md:text-lg lg:text-xl text-gray-300 leading-relaxed">
              {t.demo.subtitle}
            </p>
          </div>
          
          {/* Demo Options */}
          <div className="space-y-8 md:space-y-16">
            {/* 1. In-store Option */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:space-x-6 space-y-4 md:space-y-0">
                <div className="text-4xl md:text-6xl text-center md:text-left">🏪</div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-center md:text-left">{t.demo.inStore.title}</h2>
                  <p className="text-sm md:text-base text-gray-300 mb-4 md:mb-6 leading-relaxed text-center md:text-left">
                    {t.demo.inStore.description}
                  </p>
                  
                  {/* Demo Content */}
                  <div className="bg-gray-700 rounded-lg p-4 md:p-6">
                    <div className="text-center">
                      <div className="bg-white rounded-lg p-4 md:p-6 inline-block shadow-lg max-w-full">
                        <div className="text-center max-w-xs">
                          {/* Header */}
                          <div className="mb-3 md:mb-4">
                            <div className="text-center text-gray-800 mb-1">
                              <div className="flex items-center justify-center text-base md:text-lg font-bold mb-1">
                                <span className="mr-2">💸</span>
                                <span className="text-sm md:text-base">{t.qrCode.header}</span>
                              </div>
                              <div className="text-xs md:text-sm text-gray-600">
                                {t.qrCode.subtitle}
                              </div>
                            </div>
                          </div>
                          
                          {/* QR Code */}
                          <div className="mb-3 md:mb-4 qr-code-container">
                            <QRCodeComponent 
                              value={`${window.location.origin}/pay/ad4837a4-c66a-43fe-a1f5-0cc63843dee4`}
                              size={120}
                              className="mx-auto md:w-40"
                            />
                          </div>
                          
                          {/* Footer */}
                          <div className="flex items-center justify-center text-xs text-gray-500">
                            <span className="text-xs">{t.poweredBy} Voulti</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Download QR Button */}
                  <button 
                    onClick={handleDownloadQR}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-colors duration-200 text-sm md:text-base w-full md:w-auto mt-4"
                  >
                    📥 {t.demo.inStore.downloadCta}
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Online Option */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:space-x-6 space-y-4 md:space-y-0">
                <div className="text-4xl md:text-6xl text-center md:text-left">📲</div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-center md:text-left">{t.demo.online.title}</h2>
                  <p className="text-sm md:text-base text-gray-300 mb-4 md:mb-6 leading-relaxed text-center md:text-left">
                    {t.demo.online.description}
                  </p>
                  
                  {/* Demo Content */}
                  <div className="bg-gray-700 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
                    <div className="text-center">
                      {/* Link Display */}
                      <div className="bg-gray-800 rounded-lg p-3 md:p-4 mb-3 md:mb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div className="flex-1 text-left">
                            <p className="text-xs md:text-sm text-gray-300 break-all">
                              {`${window.location.origin}/pay/ad4837a4-c66a-43fe-a1f5-0cc63843dee4`}
                            </p>
                          </div>
                          <button 
                            onClick={handleCopy}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors duration-200 w-auto self-end"
                          >
                            {copied ? t.general.copied : t.general.copy}
                          </button>
                        </div>
                      </div>
                      {copied && (
                        <div className="text-center text-green-400 text-xs md:text-sm mt-2">
                          {t.general.copiedMessage}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleOpenLink}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-colors duration-200 text-sm md:text-base w-full md:w-auto"
                  >
                    🔗 {t.demo.online.demoCta}
                  </button>
                </div>
              </div>
            </div>

            {/* 3. API Option */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:space-x-6 space-y-4 md:space-y-0">
                <div className="text-4xl md:text-6xl text-center md:text-left">🛠️</div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-center md:text-left">{t.demo.api.title}</h2>
                  <p className="text-sm md:text-base text-gray-300 mb-4 md:mb-6 leading-relaxed text-center md:text-left">
                    {t.demo.api.description}
                  </p>
                  
                  {/* Demo Content */}
                  <div className="bg-gray-700 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
                    <div className="space-y-4 md:space-y-6">
                      {/* Instructions */}
                      <div className="text-left">
                        <h4 className="text-sm md:text-base font-semibold text-gray-300 mb-2">
                          {t.demo.api.step1Title}
                        </h4>
                        <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                          {t.demo.api.step1Description}
                        </p>
                      </div>
                      
                      <div className="text-center space-y-4 md:space-y-6">
                        {/* Request */}
                        <div className="w-full">
                          <div className="bg-gray-900 rounded-lg p-3 md:p-4 text-left w-full overflow-x-auto">
                            <pre className="text-green-400 text-xs md:text-sm whitespace-pre-wrap">
{`POST /api/invoice
{
  "amount": 1000,
  "currency": "COP",
  "commerce_id": "ad4837a4-c66a-43fe-a1f5-0cc63843dee4"
}`}
                            </pre>
                          </div>
                        </div>
                        
                        {/* Step 2 Instructions */}
                        <div className="text-left">
                          <h4 className="text-sm md:text-base font-semibold text-gray-300 mb-2">
                            {t.demo.api.step2Title}
                          </h4>
                          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                            {t.demo.api.step2Description}
                          </p>
                        </div>
                        
                        {/* Response */}
                        <div className="w-full">
                          <div className="bg-gray-900 rounded-lg p-3 md:p-4 text-left w-full overflow-x-auto">
                            <pre className="text-blue-400 text-xs md:text-sm whitespace-pre-wrap">
{`{
  "success": true,
  "data": {
    "id": "ab6d5372-d7cf-4f4b-bf56-c7c296062e3e",
    "commerce_id": "ad4837a4-c66a-43fe-a1f5-0cc63843dee4",
    "amount_fiat": 1000,
    "fiat_currency": "COP",
    "status": "Pending",
    "confirmation_url": "https://yourdomain.com/your-confirmation-url",
    "response_url": "https://yourdomain.com/your-response-url",
    "expires_at": null,
    "created_at": "2025-07-20T06:33:36.404756+00:00"
  }
}`}
                            </pre>
                          </div>
                        </div>
                        
                        {/* Step 3 Instructions */}
                        <div className="text-left">
                          <h4 className="text-sm md:text-base font-semibold text-gray-300 mb-2">
                            {t.demo.api.step3Title}
                          </h4>
                          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                            {t.demo.api.step3Description}
                          </p>
                        </div>
                        
                        {/* Step 3 Example */}
                        <div className="text-left">
                          <p className="text-sm md:text-base text-gray-300 mb-2">
                            {t.demo.api.step3Example}
                          </p>
                          <div className="bg-gray-900 rounded-lg p-3 md:p-4 text-left w-full">
                            <a 
                              href={`${window.location.origin}/checkout/ab6d5372-d7cf-4f4b-bf56-c7c296062e3e`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs md:text-sm underline transition-colors duration-200"
                            >
                              {window.location.origin}/checkout/ab6d5372-d7cf-4f4b-bf56-c7c296062e3e
                            </a>
                          </div>
                        </div>
                        
                        {/* Note */}
                        <div className="text-left">
                          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 md:p-4">
                            <p className="text-blue-300 text-xs md:text-sm leading-relaxed">
                              {t.demo.api.note}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    disabled
                    className="bg-gray-600 text-gray-400 font-semibold py-2 md:py-3 px-4 md:px-6 rounded-lg text-sm md:text-base w-full md:w-auto cursor-not-allowed"
                  >
                    📚 {t.demo.api.demoCta}
                  </button>
                </div>
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