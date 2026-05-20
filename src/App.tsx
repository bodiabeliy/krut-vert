/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {React, useState, useEffect, useCallback, useRef } from 'react';
import { Play, Square } from 'lucide-react';

// Image cache for preloading
const IMAGE_CACHE: Record<string, boolean> = {};

const preloadImages = async () => {
  const imageSources = [
    '/left longer.webp',
    '/right longer.webp',
    '/nose.webp',
    '/clap.webp',
  ];

  return Promise.all(
    imageSources.map(
      src =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            IMAGE_CACHE[src] = true;
            resolve(true);
          };
          img.onerror = () => {
            IMAGE_CACHE[src] = false;
            resolve(false);
          };
          img.src = src;
        })
    )
  );
};

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [displayItem, setDisplayItem] = useState<'left' | 'right' | 'clap' | 'nose'>('right');
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const [isInvited, setIsInvited] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<2 | 3 | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Preload images on component mount
  useEffect(() => {
    preloadImages();
  }, []);

  useEffect(() => {
    const code = localStorage.getItem('invitationCode');
    if (code) {
      setIsInvited(true);
    }
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-zA-Z0-9]{6}$/.test(inviteCode)) {
      setInviteError('Код має складатись з 6 англійських літер та/або цифр');
      return;
    }

    setIsLoading(true);
    setInviteError('');

    try {
      const response = await fetch('https://soundgame-server.onrender.com/api/code/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: inviteCode }),
      });

      if (response.ok) {
        console.log(response);
        
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
            setInviteError('Невірний код запрошення!');
          }
          else if (data.message === 'Code already activated!') {
            setInviteError('Код вже активований!');
          }
          else {
            setInviteError(data.message || 'помилка сервера. Спробуйте пізніше.');
          }
        } catch (_) {
          setInviteError('Неочікувана помилка сервера');
        }
      }
    } catch (error) {
      setInviteError('Помилка з\'єднання з сервером');
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
      // Reset image loaded state to trigger onLoad on new image
      setIsImageLoaded(false);
      
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
       // Reset image loaded and schedule next change
       setIsImageLoaded(false);
       scheduleNextChange();
    }
  }, [level, isRunning, scheduleNextChange]);

  // Schedule next change when image is loaded (not before)
  useEffect(() => {
    if (isRunning && isImageLoaded) {
      scheduleNextChange();
    }
  }, [isImageLoaded, isRunning, scheduleNextChange]);

  const getImageSrc = () => {
    if (displayItem === 'left') return '/left longer.webp';
    if (displayItem === 'right') return '/right longer.webp';
    if (displayItem === 'nose') return '/nose.webp';
    return '/clap.webp';
  };

  const getSubTitle = () => {
    if (level === 1) return 'Тільки стрілки (3-5 сек)';
    if (level === 2) return 'Стрілки + Оплески (Швидко: 1.5-2 сек)';
    return 'Стрілки + Оплески + Ніс (Швидко: 1.5-2 сек)';
  };

  return (
    <div className="w-full flex flex-col items-center justify-between p-4 sm:p-8 overflow-hidden">
      {/* Invitation Modal */}
      {showModal && !isInvited && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl">
            <h2 className="text-2xl font-bold text-[#0c325d] mb-2">Код доступу</h2>
            <p className="text-slate-500 mb-6 text-sm">
              Будь ласка, введіть 6-значний код запрошення (літери та цифри), щоб продовжити.
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
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#0c325d] text-white rounded-xl font-bold hover:bg-[#0c325d]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? 'Перевірка...' : 'Підтвердити'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-2 flex-shrink-0">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0c325d] tracking-tight">
          Круть-верть!
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
            Рівень {lvl}
          </button>
        ))}
      </div>
      
      {/* Main Display Area */}
      <div className="flex-1 w-full flex items-center justify-center my-4 min-h-0">
        <div className="flex items-center justify-center bg-white w-full max-w-md aspect-square rounded-3xl shadow-sm border border-slate-100">
          <img 
            src={getImageSrc()} 
            alt={displayItem}
            className="w-full h-full object-contain"
            onLoad={() => {
              if (isRunning) {
                setIsImageLoaded(true);
              }
            }}
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
              Стоп
            </>
          ) : (
            <>
              <Play size={28} className="fill-current" />
              Старт
            </>
          )}
        </button>
      </div>
    </div>
  );
}
