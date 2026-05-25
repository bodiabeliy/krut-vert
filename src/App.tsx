/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Square, Globe, Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BLIK from '../public/blik.png';
import { log } from 'console';

export default function App() {
  const { t, i18n } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [displayItem, setDisplayItem] = useState<'left' | 'right' | 'clap' | 'nose'>('right');
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isInvited, setIsInvited] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBlikPayment, setShowBlikPayment] = useState(false);
  const [blikCode, setBlikCode] = useState('');
  const [blikStep, setBlikStep] = useState<'input' | 'waiting' | 'success'>('input');
  const [blikMethod, setBlikMethod] = useState<'code' | 'phone'>('phone');
  const [blikPhone, setBlikPhone] = useState('');
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<2 | 3 | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const code = localStorage.getItem('invitationCode');
    if (code) {
      setIsInvited(true);
    }
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-zA-Z0-9]{6}$/.test(inviteCode)) {
      setInviteError(t('Код має складатись з 6 літер та/або цифр'));
      return;
    }

    setIsLoading(true);
    setInviteError('');

    try {
      const response = await fetch('/api/code/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: inviteCode }),
      });

      if (response.ok) {
        localStorage.setItem('invitationCode', inviteCode);
        setIsInvited(true);
        setShowModal(false);
        if (pendingLevel) {
          setLevel(pendingLevel);
          setPendingLevel(null);
        }
      } else {
        try {
          const data = await response.json();
          if (data.message === 'Invalid invite code!') {
            setInviteError(t('Невірний код запрошення!'));
          } else {
            setInviteError(data.message || t('Невірний код або помилка сервера'));
          }
        } catch (_) {
          setInviteError(t('Неочікувана помилка сервера'));
        }
      }
    } catch (error) {
      setInviteError(t("Помилка з'єднання з сервером"));
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleNextChange = useCallback(() => {
    let minDelay = 3000;
    let maxDelay = 5000;
    
    if (level === 2 || level === 3) {
       minDelay = 1500;
       maxDelay = 2000;
    }

    const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
    
    timeoutRef.current = setTimeout(() => {
      setDisplayItem(prev => {
         const options: Array<'left' | 'right' | 'clap' | 'nose'> = ['left', 'right'];
         if (level === 2 || level === 3) {
            options.push('clap');
         }
         if (level === 3) {
            options.push('nose');
         }
         let nextItem;
         do {
            nextItem = options[Math.floor(Math.random() * options.length)];
         } while (nextItem === prev && options.length > 1);
         return nextItem;
      }); 
      scheduleNextChange();
    }, randomDelay);
  }, [level]);

  useEffect(() => {
    if (isRunning) {
      scheduleNextChange();
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isRunning, scheduleNextChange]);

  // Restart sequence when level changes while running
  useEffect(() => {
    if (isRunning) {
       if (timeoutRef.current) clearTimeout(timeoutRef.current);
       scheduleNextChange();
    }
  }, [level, isRunning, scheduleNextChange]);

  const getImageSrc = () => {
    if (displayItem === 'left') return '/left longer.webp';
    if (displayItem === 'right') return '/right longer.webp';
    if (displayItem === 'nose') return '/nose.webp';
    return '/clap.jpg';
  };

  const getSubTitle = () => {
    if (level === 1) return t('Тільки стрілки (3-5 сек)');
    if (level === 2) return t('Стрілки + Оплески (Швидко: 1.5-2 сек)');
    return t('Стрілки + Оплески + Ніс (Швидко: 1.5-2 сек)');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'pl' ? 'uk' : 'pl';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="h-screen w-full bg-[#f3f7f9] flex flex-col items-center justify-between p-4 sm:p-8 overflow-hidden">
      {/* Settings / Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleLanguage}
          className="bg-white px-3 py-2 rounded-full shadow-sm border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <Globe size={16} />
          {i18n.language === 'pl' ? 'PL' : 'UA'}
        </button>
      </div>

      {/* Invitation Modal */}
      {showModal && !isInvited && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl">
            {showBlikPayment ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <img src={BLIK} alt="BLIK" className="h-10" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0c325d]">{t('Оплата')}</h2>
                </div>
                
                {blikStep === 'input' && (
                  <>
                    <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        disabled
                        onClick={() => setBlikMethod('code')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                          blikMethod === 'code' ? 'bg-white text-[#0c325d] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {t('Код BLIK')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlikMethod('phone')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                          blikMethod === 'phone' ? 'bg-white text-[#0c325d] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {t('Номер телефону')}
                      </button>
                    </div>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const isValid = blikMethod === 'code' 
                        ? /^\d{6}$/.test(blikCode)
                        : /^\+?\d{9,15}$/.test(blikPhone.replace(/[\s-]/g, ''));

                      if (isValid) {
                        setBlikStep('waiting');
                        try {
                          const res = await fetch('/api/payment/blik', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              method: blikMethod,
                              identifier: blikMethod === 'code' ? blikCode : blikPhone
                            })
                          });
                          
                          if (res.ok) {
                            setBlikStep('success');
                            setTimeout(() => {
                              localStorage.setItem('invitationCode', 'BLIK24');
                              setIsInvited(true);
                              setShowModal(false);
                              setShowBlikPayment(false);
                              setBlikStep('input');
                              setBlikCode('');
                              setBlikPhone('');
                              if (pendingLevel) {
                                setLevel(pendingLevel);
                                setPendingLevel(null);
                              }
                            }, 2000);
                          } else {
                            const errorData = await res.json();
                            alert(`${t('Помилка оплати:')} ${errorData.message}`);
                            setBlikStep('input');
                          }
                        } catch (err) {
                           alert(t("Помилка з'єднання з сервером"));
                           setBlikStep('input');
                        }
                      }
                    }} className="space-y-4">
                      {blikMethod === 'code' ? (
                        <div>
                          <p className="text-slate-500 mb-4 text-sm text-center">
                            {t('Введіть 6-значний код з банківського додатка.')}
                          </p>
                          <input
                            type="tel"
                            maxLength={6}
                            value={blikCode}
                            onChange={(e) => setBlikCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#52b8fb] text-center tracking-[0.5em] text-3xl font-bold text-[#0c325d] font-mono mb-2"
                            placeholder="000000"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-slate-500 mb-4 text-sm text-center">
                            {t("Введіть номер телефону, прив'язаний до BLIK.")}
                          </p>
                          <div className="flex">
                            <input
                            type="tel"
                            // value={blikPhone} // test
                            disabled // test
                            value={"+48 574 177 036"}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val.length < 4 && blikPhone.length >= 4) {
                                setBlikPhone('');
                                return;
                              }
                              let digits = val.replace(/\D/g, '');
                              if (!digits.startsWith('48') && digits.length > 0) {
                                digits = '48' + digits;
                              }
                              let localNumbers = digits.substring(2);
                              if (localNumbers.length > 9) localNumbers = localNumbers.substring(0, 9);
                              
                              if (digits.length === 0) {
                                setBlikPhone('');
                                return;
                              }
                              
                              let formatted = '+48';
                              if (localNumbers.length > 0) formatted += ' ' + localNumbers.substring(0, 3);
                              if (localNumbers.length > 3) formatted += ' ' + localNumbers.substring(3, 6);
                              if (localNumbers.length > 6) formatted += ' ' + localNumbers.substring(6, 9);
                              
                              setBlikPhone(formatted);
                            }}
                            onFocus={() => {
                              if (!blikPhone) setBlikPhone('+48 ');
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#52b8fb] text-center text-xl font-bold text-[#0c325d] mb-2 font-mono"
                            placeholder="+48 000 000 000"
                            autoFocus
                          />
                           <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText("+48574177036");
                                setPhoneCopied(true);
                                setTimeout(() => setPhoneCopied(false), 2000);
                                navigator.clipboard.readText().then((clipText) => setBlikPhone(clipText));
                                
                              }}
                              className="flex-shrink-0 flex items-center justify-center px-2 py-1  "
                              aria-label="Copy phone number"
                            >
                              {phoneCopied ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 text-left leading-relaxed flex items-start gap-2">
                        <svg className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div className="space-y-1">
                          <p>{t("Після підтвердження успішної оплати з вами зв'яжеться адміністратор щодо надання коду.")}</p>
                          <p><strong className="font-bold">{t('ВАЖЛИВО!')}</strong> {t("В призначенні платежу обов'язково вкажіть:")} <strong className="font-bold whitespace-nowrap">Zwrot (krut vert)</strong>. {t('В противному випадку транзакція не буде зарахована.')}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowBlikPayment(false);
                            setShowModal(false)
                            setBlikStep('input');
                            setBlikCode('');
                            setBlikPhone('');
                          }}
                          className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                          {t('Назад')}
                        </button>
                        {/* <button
                          type="submit"
                          disabled={blikMethod === 'code' ? blikCode.length !== 6 : !blikPhone}
                          className="w-full py-3 bg-[#0c325d] text-white rounded-xl font-bold hover:bg-[#0c325d]/90 transition-colors disabled:opacity-50"
                        >
                          {t('Оплатити')}
                        </button> */}
                      </div>
                    </form>
                  </>
                )}

                {blikStep === 'waiting' && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-[#0c325d] mx-auto mb-6"></div>
                    <p className="text-[#0c325d] font-bold text-lg">{t('Підтвердіть у додатку')}</p>
                    <p className="text-slate-500 text-sm mt-2">{t('Очікуємо на підтвердження в банківському додатку...')}</p>
                  </div>
                )}

                {blikStep === 'success' && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-[#0c325d] font-bold text-2xl">{t('Оплата успішна!')}</p>
                    <p className="text-slate-500 text-sm mt-2">{t('Повний доступ активовано.')}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-[#0c325d] mb-2">{t('Код доступу')}</h2>
                <p className="text-slate-500 mb-6 text-sm">
                  {t('Будь ласка, введіть 6-значний код запрошення (літери та цифри), щоб продовжити.')}
                </p>
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value);
                        setInviteError('');
                      }}
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#52b8fb] uppercase text-center tracking-widest text-xl font-bold text-[#0c325d] disabled:opacity-50"
                      placeholder="XXXXXX"
                    />
                    {inviteError && (
                      <p className="text-rose-500 text-xs mt-2 font-medium">{inviteError}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setPendingLevel(null);
                      }}
                      disabled={isLoading}
                      className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      {t('Скасувати')}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-[#0c325d] text-white rounded-xl font-bold hover:bg-[#0c325d]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isLoading ? t('Перевірка...') : t('Підтвердити')}
                    </button>
                  </div>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-500 mb-3">{t('Немає коду доступу?')}</p>
                  <button 
                    type="button"
                    className="w-full py-3 flex items-center justify-center gap-2 bg-slate-100 text-[#0c325d] rounded-xl font-bold hover:bg-slate-200 transition-colors"
                    onClick={() => setShowBlikPayment(true)}
                  >
                    <img src={BLIK} alt="BLIK" className="h-8" />
                    {t('Оплатити 10 PLN')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-2 flex-shrink-0">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0c325d] tracking-tight">
          {t('Круть-верть!')}
        </h1>
        <p className="text-slate-500 font-medium text-sm sm:text-base">
          {getSubTitle()}
        </p>
      </div>

      {/* Level Selection */}
      <div className="flex gap-2 bg-white p-1.5 rounded-full shadow-sm border border-slate-200 mt-2 flex-shrink-0">
        {[1, 2, 3].map((lvl) => (
          <button
            key={lvl}
            onClick={() => {
              if (lvl === 1) {
                setLevel(1);
              } else {
                if (isInvited) {
                  setLevel(lvl as 2 | 3);
                } else {
                  setPendingLevel(lvl as 2 | 3);
                  setShowModal(true);
                }
              }
            }}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              level === lvl 
                ? 'bg-[#0c325d] text-white' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t(`Рівень ${lvl}`)}
          </button>
        ))}
      </div>
      
      {/* Main Display Area */}
      <div className="flex-1 w-full flex items-center justify-center my-4 min-h-0">
        <div className="flex items-center justify-center bg-white w-full max-w-md aspect-square p-8 rounded-3xl shadow-sm border border-slate-100">
          <img 
            src={getImageSrc()} 
            alt={displayItem}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 pb-4">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex items-center gap-3 px-12 py-4 rounded-full font-bold text-xl transition-all shadow-sm active:scale-95 ${
            isRunning 
              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          }`}
        >
          {isRunning ? (
            <>
              <Square size={28} className="fill-current" />
              {t('Стоп')}
            </>
          ) : (
            <>
              <Play size={28} className="fill-current" />
              {t('Старт')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
