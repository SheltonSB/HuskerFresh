import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';

(() => {
  const {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
    useContext,
    createContext,
    Fragment
  } = React;
  const html = (htm as any).bind(React.createElement);

  const AppContext = createContext(null);

  const initialTicker = [
    'A. donated 1 swipe 🫶',
    'Anonymous matched a lunch 🍽️',
    'S. shared 2 swipes 💪',
    'J. picked up dinner 🌟'
  ];

  const initialHalls = [
    {
      id: 'nebraska-union',
      name: 'Nebraska Union',
      lat: 40.817405,
      lng: -96.703468,
      status: 'Open',
      isOpen: true,
      openHours: 'Today · 7:00a — 9:00p',
      pickupSpot: 'North doors near Starbucks',
      pickupWindows: [
        '10:15a - 10:30a · Welcome Desk',
        '12:00p - 12:15p · South Atrium',
        '6:00p - 6:15p · Union Plaza'
      ]
    },
    {
      id: 'abel-sandoz',
      name: 'Abel / Sandoz',
      lat: 40.818961,
      lng: -96.689323,
      status: 'Open',
      isOpen: true,
      openHours: 'Today · 6:30a — 10:00p',
      pickupSpot: 'South lobby by the elevators',
      pickupWindows: [
        '8:00a - 8:10a · Lobby',
        '1:00p - 1:15p · Dining Host',
        '7:30p - 7:45p · East Entrance'
      ]
    },
    {
      id: 'selleck',
      name: 'Selleck',
      lat: 40.819672,
      lng: -96.701255,
      status: 'Closed · Opens 4:00p',
      isOpen: false,
      openHours: 'Reopens at 4:00p',
      pickupSpot: 'Courtyard picnic tables',
      pickupWindows: [
        '4:15p - 4:30p · Courtyard',
        '5:45p - 6:00p · Front Desk'
      ]
    },
    {
      id: 'cather',
      name: 'Cather Dining',
      lat: 40.820751,
      lng: -96.705162,
      status: 'Open',
      isOpen: true,
      openHours: 'Today · 7:00a — 10:00p',
      pickupSpot: 'Academic plaza benches',
      pickupWindows: [
        '9:30a - 9:45a · Plaza',
        '12:30p - 12:45p · Lobby',
        '8:00p - 8:15p · Commons'
      ]
    },
    {
      id: 'harper-schramm-smith',
      name: 'Harper-Schramm-Smith',
      lat: 40.823429,
      lng: -96.703972,
      status: 'Closed · Opens 11:00a',
      isOpen: false,
      openHours: 'Reopens at 11:00a',
      pickupSpot: 'Library entrance',
      pickupWindows: [
        '11:05a - 11:20a · Library',
        '6:05p - 6:20p · Lobby desk'
      ]
    }
  ];

  const initialStats = [
    { id: 'fed', label: 'Huskers Fed This Week', value: 128 },
    { id: 'donations', label: 'Swipes Donated Today', value: 36 },
    { id: 'wait', label: 'Avg. Wait Time', value: 420 }
  ];

  function AppProvider({ children }) {
    const [stats, setStats] = useState(initialStats);
    const [statIndex, setStatIndex] = useState(0);
    const [ticker, setTicker] = useState(initialTicker);
    const [highlightImpact, setHighlightImpact] = useState(false);
    const [halls, setHalls] = useState(initialHalls);
    const [activeHallId, setActiveHallId] = useState(
      initialHalls.find((hall) => hall.isOpen)?.id ?? initialHalls[0].id
    );
    const [requestResult, setRequestResult] = useState(null);
    const [demoMode, setDemoMode] = useState(false);
    const [installPrompt, setInstallPrompt] = useState(null);
    const [offline, setOffline] = useState(!navigator.onLine);
    const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());
    const [fontScale, setFontScale] = useState(1);
    const [pickupModalHall, setPickupModalHall] = useState(null);
    const [darkMode, setDarkMode] = useState(prefersDarkMode());

    const highlightTimeoutRef = useRef<number | null>(null);
    const demoTimerRef = useRef<number | null>(null);
    const statTimerRef = useRef<number | null>(null);

    useEffect(() => {
      const htmlEl = document.documentElement;
      htmlEl.classList.toggle('dark', darkMode);
      htmlEl.classList.toggle('bg-corn-night', darkMode);
    }, [darkMode]);

    useEffect(() => {
      document.documentElement.style.setProperty('--app-font-scale', String(fontScale));
    }, [fontScale]);

    useEffect(() => {
      const timer = setInterval(() => {
        setStatIndex((prev) => (prev + 1) % stats.length);
      }, 3000);
      statTimerRef.current = timer;
      return () => clearInterval(timer);
    }, [stats.length]);

    useEffect(() => {
      if (demoMode) {
        demoTimerRef.current = setInterval(() => {
          seedDonation();
        }, 5000);
      } else if (demoTimerRef.current) {
        clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
      }
      return () => {
        if (demoTimerRef.current) {
          clearInterval(demoTimerRef.current);
          demoTimerRef.current = null;
        }
      };
    }, [demoMode, halls]);

    useEffect(() => {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const listener = (event) => {
        setReducedMotion(event.matches);
        document.documentElement.classList.toggle('reduce-motion', event.matches);
      };
      document.documentElement.classList.toggle('reduce-motion', media.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }, []);

    useEffect(() => {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (event) => setDarkMode(event.matches);
      setDarkMode(media.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }, []);

    useEffect(() => {
      const online = () => setOffline(false);
      const offlineHandler = () => setOffline(true);
      window.addEventListener('online', online);
      window.addEventListener('offline', offlineHandler);
      setOffline(!navigator.onLine);
      return () => {
        window.removeEventListener('online', online);
        window.removeEventListener('offline', offlineHandler);
      };
    }, []);

    useEffect(() => {
      const handler = (event) => {
        event.preventDefault();
        setInstallPrompt(event);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('sw.js')
            .catch((err) => console.error('SW registration failed', err));
        });
      }
    }, []);

    useEffect(() => {
      fetch('demo-data.json')
        .then((res) => res.json())
        .then((data) => {
          if (data?.metrics) {
            setStats((prev) =>
              prev.map((stat) => {
                if (stat.id === 'fed') {
                  return { ...stat, value: data.metrics.fed_this_week };
                }
                if (stat.id === 'donations') {
                  return { ...stat, value: data.metrics.donations_today };
                }
                if (stat.id === 'wait') {
                  return { ...stat, value: data.metrics.avg_wait_seconds };
                }
                return stat;
              })
            );
          }
          if (Array.isArray(data?.halls) && data.halls.length) {
            const mapped = data.halls.map((hall) => ({
              id: hall.id,
              name: hall.name,
              lat: hall.lat,
              lng: hall.lng,
              status: hall.status,
              isOpen: typeof hall.status === 'string' && hall.status.toLowerCase().startsWith('open'),
              openHours: hall.open_hours,
              pickupSpot: hall.pickup_spot ?? 'Main entrance',
              pickupWindows: hall.pickup_windows ?? [
                '10:00a - 10:15a',
                '12:00p - 12:15p',
                '6:00p - 6:15p'
              ]
            }));
            setHalls(mapped);
            setActiveHallId(mapped.find((hall) => hall.isOpen)?.id ?? mapped[0].id);
          }
        })
        .catch(() => {
          // offline fallback uses seeded data
        });
    }, []);

    useEffect(() => {
      function onKeydown(event) {
        const targetTag = event.target?.tagName;
        if (targetTag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag.toUpperCase())) {
          return;
        }
        if (event.key === 'b' || event.key === 'B') {
          focusPeelSticker();
        }
        if (event.key === 'n' || event.key === 'N') {
          focusNearestHall();
        }
        handleEasterEgg(event.key);
      }
      let buffer = '';
      function handleEasterEgg(key) {
        if (!key || key.length !== 1) {
          if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(key)) {
            buffer = '';
          }
          return;
        }
        buffer = (buffer + key.toUpperCase()).slice(-8);
        if (buffer === 'GOBIGRED') {
          fireConfetti({
            particleCount: 140,
            spread: 160,
            startVelocity: 55,
            scalar: 1.15,
            origin: { y: 0.4 },
            colors: ['#FFD84D', '#D00000', '#ffffff', '#FFD84D']
          });
          buffer = '';
        }
      }
      function focusPeelSticker() {
        const peel = document.querySelector<HTMLElement>('[data-peel-root]');
        if (peel) {
          peel.focus();
          peel.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'center'
          });
        }
      }
      function focusNearestHall() {
        const hall = halls.find((item) => item.isOpen) ?? halls[0];
        if (!hall) return;
        const chips = Array.from(document.querySelectorAll<HTMLElement>('.hall-chip'));
        const target = chips.find((chip) => chip.dataset.id === hall.id) ?? chips[0];
        if (target) {
          target.focus();
          target.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            inline: 'center',
            block: 'nearest'
          });
        }
      }
      document.addEventListener('keydown', onKeydown);
      return () => document.removeEventListener('keydown', onKeydown);
    }, [halls, reducedMotion]);

    const formattedStats = useMemo(
      () =>
        stats.map((stat) =>
          stat.id === 'wait'
            ? { ...stat, formatted: formatWait(stat.value) }
            : { ...stat, formatted: Intl.NumberFormat().format(stat.value) }
        ),
      [stats]
    );

    const openHallCount = useMemo(
      () => halls.filter((hall) => hall.isOpen).length,
      [halls]
    );

    const fireConfetti = useCallback(
      (options = {}) => {
        if (reducedMotion || !window.confetti) return;
        window.confetti(
          Object.assign(
            {
              particleCount: 80,
              spread: 70,
              startVelocity: 45,
              decay: 0.9,
              origin: { y: 0.9 },
              colors: ['#FFD84D', '#D00000', '#ffffff']
            },
            options
          )
        );
      },
      [reducedMotion]
    );

    useEffect(() => {
      const handler = () =>
        fireConfetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.8 },
          colors: ['#FFD84D', '#D00000', '#ffffff']
        });
      document.addEventListener('peel-success', handler);
      return () => document.removeEventListener('peel-success', handler);
    }, [fireConfetti]);

    const addTickerEntry = useCallback((entry) => {
      setTicker((prev) => {
        const next = [entry, ...prev];
        return next.slice(0, 12);
      });
    }, []);

    const flashImpact = useCallback(() => {
      setHighlightImpact(true);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightImpact(false);
      }, 1200);
    }, []);

    const updateStat = useCallback((id, amount) => {
      setStats((prev) =>
        prev.map((stat) =>
          stat.id === id ? { ...stat, value: Math.max(0, stat.value + amount) } : stat
        )
      );
    }, []);

    const setWait = useCallback((seconds) => {
      setStats((prev) =>
        prev.map((stat) =>
          stat.id === 'wait'
            ? { ...stat, value: clamp(seconds, 90, 1200) }
            : stat
        )
      );
    }, []);

    const handleDonation = useCallback(
      ({ hall, initial }) => {
        updateStat('donations', 1);
        updateStat('fed', 1);
        flashImpact();
        addTickerEntry(`${initial ?? 'A.'} donated 1 swipe to ${hall ?? 'a hall'} 🫶`);
        fireConfetti();
      },
      [updateStat, flashImpact, addTickerEntry, fireConfetti]
    );

    const handleRequest = useCallback(
      ({ match, window: pickupWindow, hideName }) => {
        const hall = match;
        setRequestResult({
          hall: hall.name,
          window: pickupWindow,
          badge: hall.status,
          instructions: `Meet a Peer Navigator at ${hall.pickupSpot} during ${pickupWindow}. Watch for the red banana badge.`,
          hideName
        });
        addTickerEntry(`Match ready at ${hall.name} 🍽`);
        fireConfetti({ particleCount: 50, spread: 90, origin: { y: 0.6 } });
      },
      [addTickerEntry, fireConfetti]
    );

    const seedDonation = useCallback(() => {
      if (!halls.length) return;
      const hall = randomChoice(halls);
      handleDonation({ hall: hall.name, initial: randomInitial() });
      const waitStat = stats.find((stat) => stat.id === 'wait');
      if (waitStat) {
        const delta = Math.random() > 0.5 ? -30 : 30;
        setWait(waitStat.value + delta);
      }
    }, [halls, handleDonation, stats, setWait]);

    const adjustFontScale = useCallback((direction) => {
      setFontScale((prev) => {
        if (direction === 'reset') {
          return 1;
        }
        if (direction === 'up') {
          return clamp(prev + 0.08, 1, 1.24);
        }
        return prev;
      });
    }, []);

    const promptInstall = useCallback(async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    }, [installPrompt]);

    const value = useMemo(
      () => ({
        stats: formattedStats,
        rawStats: stats,
        statIndex,
        ticker,
        highlightImpact,
        halls,
        activeHallId,
        setActiveHallId,
        requestResult,
        setRequestResult,
        handleDonation,
        handleRequest,
        demoMode,
        setDemoMode,
        installPrompt,
        promptInstall,
        openHallCount,
        fireConfetti,
        fontScale,
        adjustFontScale,
        reducedMotion,
        offline,
        pickupModalHall,
        setPickupModalHall
      }),
      [
        formattedStats,
        stats,
        statIndex,
        ticker,
        highlightImpact,
        halls,
        activeHallId,
        requestResult,
        handleDonation,
        handleRequest,
        demoMode,
        installPrompt,
        promptInstall,
        openHallCount,
        fireConfetti,
        fontScale,
        adjustFontScale,
        reducedMotion,
        offline,
        pickupModalHall,
        setPickupModalHall
      ]
    );

    return html`<${AppContext.Provider} value=${value}>${children}<//>`;
  }

  function useApp() {
    return useContext(AppContext);
  }

  function App() {
    const { offline } = useApp();
    return html`
      <${Fragment}>
        <${SkipLink} />
        <${Header} />
        <main id="main" className="max-w-6xl mx-auto px-6 pb-24 space-y-16">
          <${HeroSection} />
          <${DignityRibbon} />
          <${SplitCards} />
          <${ImpactMeterSection} />
          <${MapSection} />
          <${HowItWorks} />
          <${TickerSection} />
          <${FaqSection} />
        </main>
        <${Footer} />
        <div className="sr-only" aria-live="polite">
          ${offline ? 'Offline mode on. Using cached data.' : 'Online.'}
        </div>
        <${PickupModal} />
      <//>
    `;
  }

  function SkipLink() {
    return html`
      <a href="#main" className="skip-link">
        Skip to content
      </a>
    `;
  }

  function Header() {
    const {
      demoMode,
      setDemoMode,
      installPrompt,
      promptInstall,
      adjustFontScale
    } = useApp();
    return html`
      <header className="sticky top-0 z-40 backdrop-blur bg-white/85 dark:bg-huskerDark/80 border-b border-white/50 dark:border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-4">
            <img src="assets/banana.svg" alt="Peel &amp; Feed banana mascot" className="h-12 w-12 banana-logo drop-shadow-md" />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-600 dark:text-slate-200">Peel &amp; Feed</p>
              <p className="text-xl font-semibold text-husker dark:text-banana">Huskers vs. Hunger</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 rounded-full bg-white/70 dark:bg-white/10 border border-white/40 px-2 py-1 text-[0.8rem]">
              <span className="font-medium text-slate-600 dark:text-slate-200">Text Size</span>
              <button type="button" className="px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana" onClick=${() => adjustFontScale('reset')} aria-label="Reset text size">A</button>
              <button type="button" className="px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana" onClick=${() => adjustFontScale('up')} aria-label="Increase text size">A+</button>
            </div>
            ${installPrompt
              ? html`
                  <button
                    type="button"
                    className="hidden md:inline-flex items-center gap-2 rounded-full bg-banana text-husker font-semibold px-3 py-1.5 shadow-sticker focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-husker"
                    onClick=${promptInstall}
                    data-install-chip="true"
                  >
                    <span className="text-sm">Add to Home Screen</span>
                    <span aria-hidden="true">🍌</span>
                  </button>
                `
              : null}
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-200">Demo Mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked=${demoMode}
                  onChange=${(event) => setDemoMode(event.target.checked)}
                  aria-label="Toggle demo mode"
                />
                <span className="w-12 h-6 bg-slate-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-banana rounded-full peer peer-checked:bg-banana transition-colors"></span>
                <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-6"></span>
              </label>
              ${demoMode
                ? html`
                    <span className="px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide rounded-full bg-husker text-white">
                      Live
                    </span>
                  `
                : null}
            </div>
          </div>
        </div>
      </header>
    `;
  }

  function HeroSection() {
    const { halls, openHallCount } = useApp();
    return html`
      <section className="relative pt-12 grid gap-12 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)] items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-white/10 px-4 py-1 text-sm font-medium text-husker dark:text-banana">
            <span aria-hidden="true">🌽</span> Night Game ready · Offline friendly
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight text-husker dark:text-banana">
            Huskers vs. Hunger
          </h1>
          <p className="text-lg sm:text-xl text-slate-700 dark:text-slate-200 max-w-xl">
            Peel &amp; Feed helps UNL students donate unused meal swipes or request a warm meal—quietly, securely, and in under a minute.
          </p>
          <${PeelCta} />
        </div>
        <aside className="relative">
          <div className="relative rounded-3xl bg-white/90 dark:bg-huskerDark/60 border border-white/70 dark:border-white/10 shadow-xl px-6 py-8 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-200">Open halls right now</p>
              <span className="inline-flex items-center gap-2 rounded-full bg-husker text-white text-sm font-semibold px-3 py-1" aria-live="polite">
                <span aria-hidden="true">🕑</span>
                <span>${openHallCount} open</span>
              </span>
            </div>
            <ul className="space-y-4">
              ${halls.slice(0, 3).map(
                (hall) => html`
                  <li className="flex items-start gap-3" key=${hall.id}>
                    <span className="mt-1" aria-hidden="true">🍽️</span>
                    <div>
                      <p className="font-semibold text-lg text-slate-900 dark:text-white">${hall.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-200">${hall.openHours}</p>
                      <span
                        className=${`inline-flex items-center gap-2 text-xs uppercase tracking-wide mt-2 px-2 py-1 rounded-full ${
                          hall.isOpen
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-200'
                        }`}
                      >
                        <span className=${`inline-block h-2 w-2 rounded-full ${hall.isOpen ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        <span>${hall.status}</span>
                      </span>
                    </div>
                  </li>
                `
              )}
            </ul>
            <div className="rounded-2xl bg-banana/20 text-slate-800 dark:text-slate-200 px-4 py-3 text-sm flex items-center gap-3">
              <span aria-hidden="true">💡</span>
              <p className="leading-snug">Night Game Mode kicks in automatically after sunset or when your device prefers dark mode.</p>
            </div>
          </div>
        </aside>
      </section>
    `;
  }

  function PeelCta() {
    const { reducedMotion } = useApp();
    const [progress, setProgress] = useState(0);
    const [complete, setComplete] = useState(false);
    const [ariaMessage, setAriaMessage] = useState('Peel ready. Drag, tap, or press Enter to begin.');
    const [showModal, setShowModal] = useState(false);
    const surfaceRef = useRef(null);
    const pointerIdRef = useRef(null);
    const startXRef = useRef(0);

    useEffect(() => {
      const surface = surfaceRef.current;
      if (!surface) return;
      surface.style.setProperty('--peel-progress', progress / 100);
    }, [progress]);

    useEffect(() => {
      const surface = surfaceRef.current;
      if (!surface) return;

      const onPointerDown = (event) => {
        if (reducedMotion) {
          setShowModal(true);
          return;
        }
        pointerIdRef.current = event.pointerId ?? null;
        startXRef.current = event.clientX ?? 0;
        surface.setPointerCapture(pointerIdRef.current);
        surface.style.cursor = 'grabbing';
      };
      const onPointerMove = (event) => {
        if (pointerIdRef.current === null) return;
        const pointX = event.clientX ?? 0;
        const width = surface.offsetWidth;
        const delta = clamp(pointX - startXRef.current, 0, width);
        const pct = Math.round((delta / width) * 100);
        setProgress(pct);
        setAriaMessage(`Peeled ${pct} percent`);
        if (pct >= 92) {
          completePeel();
        }
      };
      const end = () => {
        if (pointerIdRef.current === null) return;
        try {
          surface.releasePointerCapture(pointerIdRef.current);
        } catch (error) {
          // ignore release errors
        }
        pointerIdRef.current = null;
        surface.style.cursor = 'grab';
        if (!complete && progress < 92) {
          reset();
        }
      };
      const completePeel = () => {
        if (complete) return;
        setComplete(true);
        setProgress(100);
        setAriaMessage('Peel complete. Choose your next step.');
        requestAnimationFrame(() => {
          const donateBtn = document.querySelector<HTMLElement>('#donate-ref');
          if (donateBtn) {
            donateBtn.focus();
          }
        });
        document.dispatchEvent(new CustomEvent('peel-success'));
      };
      const reset = () => {
        setProgress(0);
        setComplete(false);
        setAriaMessage('Sticker reset. Try again or press Enter.');
      };
      const onKey = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (reducedMotion) {
            setShowModal(true);
          } else {
            completePeel();
          }
        }
      };
      surface.addEventListener('pointerdown', onPointerDown);
      surface.addEventListener('pointermove', onPointerMove);
      surface.addEventListener('pointerup', end);
      surface.addEventListener('pointercancel', end);
      surface.addEventListener('pointerleave', end);
      surface.addEventListener('keydown', onKey);
      return () => {
        surface.removeEventListener('pointerdown', onPointerDown);
        surface.removeEventListener('pointermove', onPointerMove);
        surface.removeEventListener('pointerup', end);
        surface.removeEventListener('pointercancel', end);
        surface.removeEventListener('pointerleave', end);
        surface.removeEventListener('keydown', onKey);
      };
    }, [reducedMotion, progress, complete]);

    const focusFlow = (action) => {
      const targetId = action === 'donate' ? 'donation-card' : 'request-card';
      const section = document.getElementById(targetId);
      if (!section) return;
      section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      const focusable = section.querySelector<HTMLElement>('[data-focus]');
      if (focusable) {
        setTimeout(() => focusable.focus(), reducedMotion ? 0 : 250);
      }
    };

    const handleAction = (action) => {
      focusFlow(action);
      document.dispatchEvent(new CustomEvent('peel-action', { detail: action }));
    };

    const closeModal = () => setShowModal(false);

    const confirmAction = (action) => {
      setShowModal(false);
      setProgress(100);
      setComplete(true);
      focusFlow(action);
    };

    return html`
      <div className="relative" data-peel-root>
        <div
          className="peel-base"
          ref=${surfaceRef}
          role="button"
          tabIndex="0"
          aria-describedby="peel-progress"
        >
          <div className="peel-under">
            <span className="text-xs uppercase tracking-wide text-husker dark:text-banana">Reveal the right path</span>
            <span className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">Donate a swipe or request support in seconds</span>
          </div>
          <div className="peel-overlay">
            <span className="font-semibold text-white text-lg">Peel to Donate</span>
            <span className="text-white/80 text-sm">Peel to Request</span>
          </div>
        </div>
        <div id="peel-progress" className="sr-only" aria-live="polite">${ariaMessage}</div>
        ${complete
          ? html`
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  id="donate-ref"
                  className="rounded-2xl bg-husker text-white py-3 px-4 font-semibold flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana"
                  onClick=${() => handleAction('donate')}
                >
                  <span>Peel to Donate</span>
                  <span aria-hidden="true">🎟️</span>
                </button>
                <button
                  type="button"
                  className="rounded-2xl bg-banana text-husker font-semibold py-3 px-4 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-husker"
                  onClick=${() => handleAction('request')}
                >
                  <span>Peel to Request</span>
                  <span aria-hidden="true">🤝</span>
                </button>
              </div>
            `
          : null}
        ${showModal
          ? html`
              <div className="modal-backdrop" role="dialog" aria-modal="true">
                <div className="modal-card" tabIndex="-1">
                  <h2 className="text-xl font-semibold text-husker dark:text-banana mb-3">Ready to go?</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-200 mb-5">
                    Reduced motion is on, so we’ll skip the peel animation. Choose what you’d like to do next.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button className="rounded-xl bg-husker text-white py-2.5 px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana" onClick=${() => confirmAction('donate')}>Donate a swipe</button>
                    <button className="rounded-xl bg-banana text-husker py-2.5 px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-husker" onClick=${() => confirmAction('request')}>Request a meal</button>
                    <button className="text-sm text-slate-600 dark:text-slate-200 underline underline-offset-4" onClick=${closeModal}>Back</button>
                  </div>
                </div>
              </div>
            `
          : null}
      </div>
    `;
  }

  function DignityRibbon() {
    const [open, setOpen] = useState(false);
    return html`
      <section className="rounded-3xl bg-white/75 dark:bg-huskerDark/60 border border-white/70 dark:border-white/10 shadow-xl px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-center md:text-left text-slate-900 dark:text-white">Anonymous by default. Your dignity is our priority.</h2>
            <p className="text-sm text-center md:text-left text-slate-600 dark:text-slate-200 mt-2">Verified with N-Card • Staff-approved pickups • You are not alone.</p>
          </div>
          <div className="text-center md:text-right">
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-husker dark:text-banana underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana" onClick=${() => setOpen(true)}>
              Learn how we protect privacy
            </button>
          </div>
        </div>
        ${open
          ? html`
              <div className="modal-backdrop" role="dialog" aria-modal="true">
                <div className="modal-card max-w-lg text-left space-y-4" tabIndex="-1">
                  <h3 className="text-2xl font-semibold text-husker dark:text-banana">Dignity by design</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-200">
                    <li>No names shown by default; staff only see initials unless you opt in.</li>
                    <li>N-Card verification confirms eligibility without sharing balances.</li>
                    <li>Pickups happen at neutral locations with plain packaging.</li>
                    <li>Data stays on-campus. Nothing is shared with advertisers or third parties.</li>
                  </ul>
                  <button className="inline-flex items-center gap-2 rounded-full bg-husker text-white px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana" onClick=${() => setOpen(false)}>
                    Got it
                  </button>
                </div>
              </div>
            `
          : null}
      </section>
    `;
  }

  function SplitCards() {
    return html`
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <${DonationCard} />
        <${RequestCard} />
      </section>
    `;
  }

  function DonationCard() {
    const { halls, handleDonation, reducedMotion } = useApp();
    const [hall, setHall] = useState(halls[0]?.name ?? 'Nebraska Union');
    const [windowChoice, setWindowChoice] = useState('Tonight (5p-8p)');
    const [note, setNote] = useState('');
    const [hideName, setHideName] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [confirmProgress, setConfirmProgress] = useState(0);
    const [dragging, setDragging] = useState(false);
    const pointerIdRef = useRef(null);
    const startXRef = useRef(0);
    const peelRef = useRef(null);
    const hallRef = useRef(null);
    const sendAnotherRef = useRef(null);

    useEffect(() => {
      setHideName(true);
    }, []);

    const resetConfirm = () => {
      setConfirmProgress(0);
      setDragging(false);
      pointerIdRef.current = null;
    };

    const submit = () => {
      handleDonation({
        hall,
        note,
        initial: hideName ? randomInitial() : 'You'
      });
      setSubmitted(true);
      resetConfirm();
      requestAnimationFrame(() => {
        sendAnotherRef.current?.focus();
      });
    };

    const begin = (event) => {
      if (reducedMotion) {
        submit();
        return;
      }
      setDragging(true);
      pointerIdRef.current = event.pointerId ?? null;
      startXRef.current = event.clientX ?? 0;
      peelRef.current?.setPointerCapture(pointerIdRef.current);
    };

    const move = (event) => {
      if (!dragging || !peelRef.current) return;
      const width = peelRef.current.offsetWidth;
      const delta = clamp((event.clientX ?? 0) - startXRef.current, 0, width);
      const pct = Math.round((delta / width) * 100);
      setConfirmProgress(pct);
      if (pct >= 90) {
        submit();
      }
    };

    const end = () => {
      if (!dragging) return;
      setDragging(false);
      if (pointerIdRef.current !== null) {
        try {
          peelRef.current?.releasePointerCapture(pointerIdRef.current);
        } catch (error) {
          // ignore release errors
        }
      }
      if (!submitted && confirmProgress < 90) {
        resetConfirm();
      }
    };

    const resetForm = () => {
      setSubmitted(false);
      setNote('');
      resetConfirm();
      requestAnimationFrame(() => hallRef.current?.focus());
    };

    return html`
      <div className="rounded-3xl bg-white/90 dark:bg-huskerDark/60 border border-white/70 dark:border-white/10 shadow-xl p-6 space-y-6" id="donation-card">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-200">Give a swipe · 15 seconds</p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Boost a fellow Husker</h2>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide rounded-full bg-banana text-husker px-3 py-1">🎁 Give</span>
        </header>
        <form className="space-y-4" onSubmit=${(event) => event.preventDefault()} noValidate>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Dining hall
            <select
              ref=${hallRef}
              data-focus
              value=${hall}
              onChange=${(event) => setHall(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-white/30 bg-white/90 dark:bg-white/10 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-husker"
            >
              ${halls.map(
                (option) =>
                  html`<option key=${option.id} value=${option.name}>${option.name}</option>`
              )}
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">Preferred pickup window</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              ${['Breakfast (7a-10a)', 'Lunch (11a-1p)', 'Tonight (5p-8p)'].map((label) => {
                const readable = label.split(' ')[0] === 'Tonight' ? 'Dinner' : label.split(' ')[0];
                return html`
                  <label className="radio-card" key=${label}>
                    <input
                      type="radio"
                      name="window"
                      value=${label}
                      checked=${windowChoice === label}
                      onChange=${() => setWindowChoice(label)}
                    />
                    <span>${readable}</span>
                  </label>
                `;
              })}
            </div>
          </fieldset>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Optional note for staff
            <textarea
              value=${note}
              onChange=${(event) => setNote(event.target.value)}
              rows="3"
              className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-white/30 bg-white/90 dark:bg-white/10 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-husker"
              placeholder="Allergic to peanuts, please note on bag."
            ></textarea>
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-husker focus:ring-husker"
              checked=${hideName}
              onChange=${(event) => setHideName(event.target.checked)}
            />
            Hide my name (default)
          </label>
          <div className="space-y-3">
            <div
              className="mini-peel"
              role="button"
              tabIndex="0"
              aria-label="Slide to confirm donation"
              style=${{ '--mini-progress': confirmProgress / 100 }}
              ref=${peelRef}
              onPointerDown=${begin}
              onPointerMove=${move}
              onPointerUp=${end}
              onPointerLeave=${end}
              onPointerCancel=${end}
              onKeyDown=${(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  submit();
                }
              }}
            >
              <div className="mini-peel-track"></div>
              <div className="mini-peel-thumb">
                <span aria-hidden="true">👉</span>
              </div>
              <span className="mini-peel-text">${confirmProgress >= 90 ? 'Release to send swipe' : 'Slide to send this swipe'}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Prefer clicks?
              <button type="button" className="underline font-semibold" onClick=${submit}>Use confirm button instead.</button>
            </p>
          </div>
        </form>
        ${submitted
          ? html`
              <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200" tabIndex="-1" ref=${sendAnotherRef}>
                Swipe sent! Our staff will verify and notify the next Husker in line.
                <button type="button" className="ml-3 underline text-sm font-semibold" onClick=${resetForm}>Send another</button>
              </div>
            `
          : null}
      </div>
    `;
  }

  function RequestCard() {
    const { halls, handleRequest, setRequestResult, requestResult } = useApp();
    const [hall, setHall] = useState('Any');
    const [windowChoice, setWindowChoice] = useState('Next meal');
    const [hideName, setHideName] = useState(true);
    const [hasResult, setHasResult] = useState(false);
    const resultRef = useRef(null);

    useEffect(() => {
      setHideName(true);
    }, []);

    const submit = () => {
      if (!halls.length) return;
      const match =
        hall === 'Any'
          ? halls.find((item) => item.isOpen) ?? halls[0]
          : halls.find((item) => item.id === hall) ?? halls[0];
      handleRequest({
        match,
        window: windowChoice,
        hideName
      });
      setHasResult(true);
      requestAnimationFrame(() => resultRef.current?.focus());
    };

    const reset = () => {
      setHasResult(false);
      setWindowChoice('Next meal');
      setHideName(true);
      setRequestResult(null);
    };

    return html`
      <div className="rounded-3xl bg-white/90 dark:bg-huskerDark/60 border border-white/70 dark:border-white/10 shadow-xl p-6 space-y-6" id="request-card">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-200">Need a meal · one tap</p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">You are not alone</h2>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide rounded-full bg-husker text-white px-3 py-1">🤝 Receive</span>
        </header>
        <form className="space-y-4" onSubmit=${(event) => event.preventDefault()} noValidate>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Preferred hall
            <select
              value=${hall}
              onChange=${(event) => setHall(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-white/30 bg-white/90 dark:bg-white/10 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana"
            >
              <option value="Any">Closest open hall</option>
              ${halls.map(
                (option) =>
                  html`<option key=${option.id} value=${option.id}>${option.name}</option>`
              )}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Pickup window
            <select
              value=${windowChoice}
              onChange=${(event) => setWindowChoice(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-white/30 bg-white/90 dark:bg-white/10 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana"
            >
              ${['Next meal', '15 minutes', 'Tonight', 'Tomorrow morning'].map(
                (option) => html`<option key=${option}>${option}</option>`
              )}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-husker focus:ring-husker"
              checked=${hideName}
              onChange=${(event) => setHideName(event.target.checked)}
            />
            Hide my name (default)
          </label>
          <button type="button" className="w-full rounded-2xl bg-husker text-white font-semibold px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana" onClick=${submit}>
            Request a meal quietly
          </button>
        </form>
        ${hasResult && requestResult
          ? html`
              <div className="rounded-2xl bg-banana/20 border border-banana/40 px-4 py-3 space-y-2 text-sm text-slate-800 dark:text-slate-100" tabIndex="-1" ref=${resultRef}>
                <p className="font-semibold">Match secured!</p>
                <p>Pickup at ${requestResult.hall} during ${requestResult.window}.</p>
                <p>${requestResult.instructions}</p>
                <button className="underline text-sm font-semibold" onClick=${reset}>Request again</button>
              </div>
            `
          : null}
      </div>
    `;
  }

  function ImpactMeterSection() {
    const { stats, statIndex, highlightImpact } = useApp();
    return html`
      <section className="rounded-3xl bg-white/90 dark:bg-huskerDark/60 border border-white/70 dark:border-white/10 shadow-xl px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Impact-O-Meter</h2>
          <p className="text-sm text-slate-600 dark:text-slate-200">Updates every three seconds with live demo data.</p>
        </div>
        <div className="overflow-hidden">
          <div
            className=${`relative rounded-3xl bg-gradient-to-r from-banana to-orange-200 dark:from-huskerDark dark:to-amber-700 px-6 py-6 text-slate-900 dark:text-white transition-all duration-500 ${
              highlightImpact ? 'ring-4 ring-white/80 dark:ring-banana shadow-lg scale-[1.02]' : 'ring-0 shadow-md'
            }`}
          >
            <div className="relative min-h-[4.5rem]">
              ${stats.map((stat, index) =>
                html`
                  <div
                    key=${stat.id}
                    className=${`absolute inset-0 flex flex-col justify-center space-y-1 transition-all duration-500 ${
                      statIndex === index
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-3 pointer-events-none'
                    }`}
                    aria-hidden=${statIndex === index ? 'false' : 'true'}
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-800/70 dark:text-white/70">${stat.label}</p>
                    <p className="text-4xl font-display font-semibold">${stat.formatted}</p>
                  </div>
                `
              )}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function MapSection() {
    const { halls, activeHallId, setActiveHallId } = useApp();
    return html`
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Find a hall that fits</h2>
            <p className="text-sm text-slate-600 dark:text-slate-200">Tap a chip to see the map, status, and pickup windows.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/90 dark:bg-white/10 border border-white/60 dark:border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <span aria-hidden="true">📍</span> MapLibre + OSM
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" role="listbox" aria-label="Dining halls" tabIndex="-1">
          ${halls.map((hall) => {
            const isActive = hall.id === activeHallId;
            return html`
              <button
                key=${hall.id}
                type="button"
                data-id=${hall.id}
                className=${`hall-chip ${isActive ? 'hall-chip-active' : ''}`}
                data-open=${hall.isOpen}
                aria-pressed=${isActive}
                onClick=${() => setActiveHallId(hall.id)}
              >
                <span className="font-semibold">${hall.name}</span>
                <span className="text-xs uppercase tracking-wide">${hall.status}</span>
                <span className="text-[0.65rem] text-slate-600 dark:text-slate-200">${hall.openHours}</span>
              </button>
            `;
          })}
        </div>
        <${MapPanel} />
      </section>
    `;
  }

  function MapPanel() {
    const { halls, activeHallId, setPickupModalHall } = useApp();
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<MapLibreMap | null>(null);
    const markerRef = useRef<MapLibreMarker | null>(null);
    const activeHall = halls.find((hall) => hall.id === activeHallId) ?? halls[0];

    useEffect(() => {
      if (!mapRef.current || mapInstanceRef.current) {
        return;
      }
      let cancelled = false;
      const init = () => {
        if (!mapRef.current || mapInstanceRef.current || cancelled) {
          return;
        }
        const MapLibre = window.maplibregl;
        if (!MapLibre) {
          return;
        }
        const center: [number, number] = [Number(activeHall.lng), Number(activeHall.lat)];
        mapInstanceRef.current = new MapLibre.Map({
          container: mapRef.current,
          style: 'https://demotiles.maplibre.org/style.json',
          center,
          zoom: 15
        });
        mapInstanceRef.current.addControl(
          new MapLibre.NavigationControl({ showCompass: false }),
          'bottom-right'
        );
        markerRef.current = new MapLibre.Marker({ color: '#D00000' })
          .setLngLat(center)
          .addTo(mapInstanceRef.current);
      };
      if (window.maplibregl) {
        init();
      } else {
        const interval = setInterval(() => {
          if (window.maplibregl) {
            clearInterval(interval);
            init();
          }
        }, 200);
        return () => {
          clearInterval(interval);
          cancelled = true;
        };
      }
      return () => {
        cancelled = true;
      };
    }, [activeHall?.lat, activeHall?.lng]);

    useEffect(() => {
      if (!mapInstanceRef.current || !markerRef.current || !activeHall) return;
      const center: [number, number] = [Number(activeHall.lng), Number(activeHall.lat)];
      mapInstanceRef.current.setCenter(center);
      markerRef.current.setLngLat(center);
    }, [activeHall]);

    if (!activeHall) return null;

    return html`
      <div className="rounded-3xl bg-white/85 dark:bg-huskerDark/60 border border-white/70 dark:border-white/10 shadow-xl p-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
        <div className="rounded-2xl overflow-hidden h-64 sm:h-72 relative">
          <div ref=${mapRef} className="absolute inset-0" role="img" aria-label="Campus map showing selected dining hall"></div>
          <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/70 text-white text-xs font-semibold px-3 py-1">
            <span aria-hidden="true">🗺️</span> Live campus map
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-banana text-husker text-xl font-semibold">N</span>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">${activeHall.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-200">${activeHall.openHours}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className=${`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
              activeHall.isOpen ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-900'
            }`}>
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-white"></span>
              <span>${activeHall.status}</span>
            </span>
            <span className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-200">
              <span aria-hidden="true">🚶</span> 3-minute walk from Union
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex items-center gap-2 rounded-full bg-husker text-white px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana"
              href=${`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                activeHall.name
              )}+University+of+Nebraska`}
              target="_blank"
              rel="noopener"
            >
              Navigate
            </a>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-white/10 border border-white/70 dark:border-white/20 px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana"
              onClick=${() => setPickupModalHall(activeHall)}
            >
              Pickup windows
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-200 leading-snug">
            Need directions without tapping? Press <kbd className="kbd">N</kbd> to focus the nearest open hall.
          </p>
        </div>
      </div>
    `;
  }

  function HowItWorks() {
    const items = [
      { icon: '🍌', title: 'Give', text: 'Donate a swipe in seconds, anonymously.' },
      { icon: '🎟️', title: 'Credit', text: 'Staff verifies and queues it privately.' },
      { icon: '🍽️', title: 'Eat', text: 'A Husker picks up a warm meal—no spotlight.' }
    ];
    return html`
      <section className="rounded-3xl bg-white/90 dark:bg-huskerDark/70 border border-white/70 dark:border-white/10 shadow-xl px-6 py-8">
        <h2 className="text-2xl font-semibold text-center text-slate-900 dark:text-white mb-6">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3 text-center">
          ${items.map(
            (item) => html`
              <div className="pictogram" key=${item.title}>
                <span aria-hidden="true" className="text-4xl">${item.icon}</span>
                <p className="font-semibold text-lg text-slate-900 dark:text-white mt-3">${item.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-200">${item.text}</p>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  function TickerSection() {
    const { ticker } = useApp();
    return html`
      <section className="rounded-3xl bg-white/80 dark:bg-huskerDark/60 border border-white/60 dark:border-white/10 shadow-xl px-6 py-4">
        <div className="ticker" role="region" aria-live="polite" aria-label="Anonymous shout-outs">
          <div className="ticker-track">
            ${ticker.concat(ticker).map(
              (entry, index) =>
                html`
                  <span className="ticker-item" key=${`ticker-${index}`}>${entry}</span>
                `
            )}
          </div>
        </div>
      </section>
    `;
  }

  function FaqSection() {
    const bullets = [
      {
        title: 'Instant matching',
        text: 'Requests reach donors in seconds—no endless threads.'
      },
      {
        title: 'N-Card verification',
        text: 'Know every swipe is legit without posting IDs.'
      },
      {
        title: 'Anonymous dignity',
        text: 'Keep your name hidden unless you opt in.'
      },
      {
        title: 'Real-time hall hours',
        text: 'Auto-updated hours, offline cached for contingency.'
      }
    ];
    return html`
      <section className="rounded-3xl bg-white/90 dark:bg-huskerDark/60 border border-white/70 dark:border-white/10 shadow-xl px-6 py-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">Why not GroupMe?</h2>
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-sm">
          ${bullets.map(
            (item) => html`
              <li className="faq-card" key=${item.title}>
                <span className="font-semibold text-slate-900 dark:text-white">${item.title}</span>
                <p className="text-slate-600 dark:text-slate-200">${item.text}</p>
              </li>
            `
          )}
        </ul>
      </section>
    `;
  }

  function Footer() {
    return html`
      <footer className="bg-white/90 dark:bg-huskerDark/80 border-t border-white/60 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-200">Built for Huskers Helping Huskers Pantry · Powered by UNL students</p>
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-200">
            <span aria-hidden="true">🛠️</span> PWA ready · Works offline after first load
          </div>
        </div>
      </footer>
    `;
  }

  function PickupModal() {
    const { pickupModalHall, setPickupModalHall } = useApp();
    if (!pickupModalHall) return null;
    return html`
      <div className="modal-backdrop" role="dialog" aria-modal="true">
        <div className="modal-card max-w-lg text-left space-y-4" tabIndex="-1">
          <h3 className="text-2xl font-semibold text-husker dark:text-banana">${pickupModalHall.name} pickup windows</h3>
          <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-200 space-y-1">
            ${pickupModalHall.pickupWindows.map(
              (window, index) => html`<li key=${index}>${window}</li>`
            )}
          </ul>
          <button className="inline-flex items-center gap-2 rounded-full bg-husker text-white px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banana" onClick=${() => setPickupModalHall(null)}>
            Close
          </button>
        </div>
      </div>
    `;
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    html`<${AppProvider}><${App} /><//>`
  );

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function prefersDarkMode() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function randomInitial() {
    return String.fromCharCode(65 + Math.floor(Math.random() * 26)) + '.';
  }

  function randomChoice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function formatWait(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
})();

