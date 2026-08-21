/**
 * StaggeredMenu — adapted from React Bits (reactbits.dev)
 * Variant: TypeScript + React Router v6 + GSAP + Tailwind CSS
 * Fixed overlay with solid background, z-index layering, and mobile viewport containment.
 */
import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
} from 'react';
import { NavLink } from 'react-router-dom';
import { gsap } from 'gsap';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaggeredMenuItem {
  label: string;
  ariaLabel?: string;
  link: string;
}

export interface StaggeredMenuSocialItem {
  label: string;
  link: string;
}

interface StaggeredMenuProps {
  position?: 'left' | 'right';
  colors?: string[];
  items?: StaggeredMenuItem[];
  socialItems?: StaggeredMenuSocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  className?: string;
  logoUrl?: string;
  panelHeader?: React.ReactNode;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  accentColor?: string;
  changeMenuColorOnOpen?: boolean;
  closeOnClickAway?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  /** Extra content rendered at the bottom of the panel (e.g. user info, logout) */
  panelFooter?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const StaggeredMenu: React.FC<StaggeredMenuProps> = ({
  position = 'right',
  colors = ['#c7d2fe', '#6366f1', '#4338ca'],
  items = [],
  socialItems = [],
  displaySocials = false,
  displayItemNumbering = true,
  className,
  logoUrl,
  panelHeader,
  menuButtonColor = '#1e293b',
  openMenuButtonColor = '#1e293b',
  changeMenuColorOnOpen = false,
  accentColor = '#4f46e5',
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
  panelFooter,
}) => {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

  const panelRef = useRef<HTMLElement>(null);
  const preLayersRef = useRef<HTMLDivElement>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);

  const plusHRef = useRef<HTMLSpanElement>(null);
  const plusVRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  const textInnerRef = useRef<HTMLSpanElement>(null);
  const [textLines, setTextLines] = useState<string[]>(['Menu', 'Close']);

  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const spinTweenRef = useRef<gsap.core.Timeline | null>(null);
  const textCycleAnimRef = useRef<gsap.core.Tween | null>(null);
  const colorTweenRef = useRef<gsap.core.Tween | null>(null);

  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);

  // ── Initial GSAP setup ──────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;

      if (!panel || !plusH || !plusV || !icon || !textInner) return;

      let preLayers: HTMLElement[] = [];
      if (preContainer) {
        preLayers = Array.from(
          preContainer.querySelectorAll<HTMLElement>('.sm-prelayer')
        );
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) gsap.set(preContainer, { xPercent: 0, opacity: 1 });

      gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
      gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      gsap.set(textInner, { yPercent: 0 });

      if (toggleBtnRef.current)
        gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });
    return () => ctx.revert();
  }, [menuButtonColor, position]);

  // ── Open timeline ───────────────────────────────────────────────────────────
  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    closeTweenRef.current?.kill();
    closeTweenRef.current = null;

    const itemEls = Array.from(
      panel.querySelectorAll<HTMLElement>('.sm-panel-itemLabel')
    );
    const numberEls = Array.from(
      panel.querySelectorAll<HTMLElement>(
        '.sm-panel-list[data-numbering] .sm-panel-item'
      )
    );
    const socialTitle = panel.querySelector<HTMLElement>('.sm-socials-title');
    const socialLinks = Array.from(
      panel.querySelectorAll<HTMLElement>('.sm-socials-link')
    );
    const footerEl = panel.querySelector<HTMLElement>('.sm-panel-footer');

    const offscreen = position === 'left' ? -100 : 100;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 8 });
    if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 } as gsap.TweenVars);
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 20, opacity: 0 });
    if (footerEl) gsap.set(footerEl, { opacity: 0, y: 15 });

    const tl = gsap.timeline({ paused: true });

    layers.forEach((el, i) => {
      tl.fromTo(
        el,
        { xPercent: offscreen },
        { xPercent: 0, duration: 0.45, ease: 'power4.out' },
        i * 0.06
      );
    });

    const lastTime = layers.length ? (layers.length - 1) * 0.06 : 0;
    const panelInsertTime = lastTime + (layers.length ? 0.06 : 0);
    const panelDuration = 0.55;

    tl.fromTo(
      panel,
      { xPercent: offscreen },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.15;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 0.8,
          ease: 'power4.out',
          stagger: { each: 0.08, from: 'start' },
        },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.5,
            ease: 'power2.out',
            '--sm-num-opacity': 1,
            stagger: { each: 0.07, from: 'start' },
          } as gsap.TweenVars,
          itemsStart + 0.08
        );
      }
    }

    if (footerEl) {
      tl.to(
        footerEl,
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        panelInsertTime + panelDuration * 0.4
      );
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle)
        tl.to(socialTitle, { opacity: 1, duration: 0.4, ease: 'power2.out' }, socialsStart);
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            ease: 'power3.out',
            stagger: { each: 0.06, from: 'start' },
          },
          socialsStart + 0.04
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  // ── Close animation ─────────────────────────────────────────────────────────
  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;

    closeTweenRef.current = gsap.to([...layers, panel], {
      xPercent: offscreen,
      duration: 0.28,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(
          panel.querySelectorAll<HTMLElement>('.sm-panel-itemLabel')
        );
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 8 });
        busyRef.current = false;
      },
    });
  }, [position]);

  // ── Icon animation ──────────────────────────────────────────────────────────
  const animateIcon = useCallback((opening: boolean) => {
    const icon = iconRef.current;
    const h = plusHRef.current;
    const v = plusVRef.current;
    if (!icon || !h || !v) return;

    spinTweenRef.current?.kill();
    if (opening) {
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      spinTweenRef.current = gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .to(h, { rotate: 45, duration: 0.45 }, 0)
        .to(v, { rotate: -45, duration: 0.45 }, 0);
    } else {
      spinTweenRef.current = gsap
        .timeline({ defaults: { ease: 'power3.inOut' } })
        .to(h, { rotate: 0, duration: 0.3 }, 0)
        .to(v, { rotate: 90, duration: 0.3 }, 0);
    }
  }, []);

  // ── Color animation ─────────────────────────────────────────────────────────
  const animateColor = useCallback(
    (opening: boolean) => {
      const btn = toggleBtnRef.current;
      if (!btn) return;
      colorTweenRef.current?.kill();
      const targetColor = changeMenuColorOnOpen
        ? opening ? openMenuButtonColor : menuButtonColor
        : menuButtonColor;
      colorTweenRef.current = gsap.to(btn, {
        color: targetColor,
        delay: 0.15,
        duration: 0.25,
        ease: 'power2.out',
      });
    },
    [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]
  );

  // ── Text cycle animation ────────────────────────────────────────────────────
  const animateText = useCallback((opening: boolean) => {
    const inner = textInnerRef.current;
    if (!inner) return;
    textCycleAnimRef.current?.kill();

    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 2;
    const seq: string[] = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);

    setTextLines(seq);
    gsap.set(inner, { yPercent: 0 });

    const finalShift = ((seq.length - 1) / seq.length) * 100;
    textCycleAnimRef.current = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.4 + seq.length * 0.06,
      ease: 'power4.out',
    });
  }, []);

  // ── Toggle ──────────────────────────────────────────────────────────────────
  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);

    if (target) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
    animateIcon(target);
    animateColor(target);
    animateText(target);
  }, [playOpen, playClose, animateIcon, animateColor, animateText, onMenuOpen, onMenuClose]);

  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    onMenuClose?.();
    playClose();
    animateIcon(false);
    animateColor(false);
    animateText(false);
  }, [playClose, animateIcon, animateColor, animateText, onMenuClose]);

  // ── Click-away ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!closeOnClickAway || !open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeOnClickAway, open, closeMenu]);

  // ── Prelayers colour list ───────────────────────────────────────────────────
  const prelayerColors = (() => {
    const raw = colors.length ? colors.slice(0, 4) : ['#c7d2fe', '#6366f1', '#4338ca'];
    const arr = [...raw];
    if (arr.length >= 3) arr.splice(Math.floor(arr.length / 2), 1);
    return arr;
  })();

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="sm-scope fixed inset-0 pointer-events-none z-50">
      <div
        className={
          (className ? className + ' ' : '') +
          'staggered-menu-wrapper relative w-full h-full'
        }
        style={accentColor ? ({ '--sm-accent': accentColor } as React.CSSProperties) : undefined}
        data-position={position}
        data-open={open || undefined}
      >
        {/* ── Dark Backdrop Overlay (when open) ── */}
        {open && (
          <div
            className="sm-backdrop fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 pointer-events-auto"
            style={{ zIndex: 40 }}
            onClick={closeMenu}
            aria-hidden="true"
          />
        )}

        {/* ── Pre-layers (staggered colorful animated slides) ── */}
        <div
          ref={preLayersRef}
          className="sm-prelayers fixed top-0 right-0 bottom-0 pointer-events-none"
          style={{ zIndex: 44 }}
          aria-hidden="true"
        >
          {prelayerColors.map((c, i) => (
            <div
              key={i}
              className="sm-prelayer absolute top-0 right-0 h-full w-full"
              style={{ background: c }}
            />
          ))}
        </div>

        {/* ── Menu Toggle Button (Fixed in Header Top-Right) ── */}
        <button
          ref={toggleBtnRef}
          className="sm-toggle fixed top-0 right-2 sm:right-4 h-16 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200/80 rounded-xl cursor-pointer font-bold leading-none pointer-events-auto text-xs tracking-tight shadow-2xs transition-all active:scale-95"
          style={{ color: menuButtonColor, zIndex: 50 }}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="staggered-menu-panel"
          onClick={toggleMenu}
          type="button"
        >
          <span
            className="relative inline-block h-[1em] overflow-hidden whitespace-nowrap"
            aria-hidden="true"
          >
            <span ref={textInnerRef} className="flex flex-col leading-none">
              {textLines.map((l, i) => (
                <span className="block h-[1em] leading-none" key={i}>
                  {l}
                </span>
              ))}
            </span>
          </span>

          <span
            ref={iconRef}
            className="relative w-3.5 h-3.5 shrink-0 inline-flex items-center justify-center"
            aria-hidden="true"
          >
            <span
              ref={plusHRef}
              className="absolute left-1/2 top-1/2 w-full h-[2px] bg-current rounded-full -translate-x-1/2 -translate-y-1/2"
            />
            <span
              ref={plusVRef}
              className="absolute left-1/2 top-1/2 w-full h-[2px] bg-current rounded-full -translate-x-1/2 -translate-y-1/2"
            />
          </span>
        </button>

        {/* ── Solid Menu Panel (Sliding in from Right) ── */}
        <aside
          id="staggered-menu-panel"
          ref={panelRef}
          className="staggered-menu-panel fixed top-0 right-0 h-full flex flex-col pointer-events-auto overflow-y-auto"
          style={{
            zIndex: 46,
            backgroundColor: '#ffffff',
            background: '#ffffff',
          }}
          aria-hidden={!open}
        >
          {/* Top Panel Header */}
          {panelHeader ? (
            <div className="shrink-0 mb-4">{panelHeader}</div>
          ) : logoUrl ? (
            <div className="shrink-0 mb-6">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-8 w-auto object-contain"
                draggable={false}
              />
            </div>
          ) : null}

          {/* Navigation Items List */}
          <div className="sm-panel-inner flex-1 flex flex-col gap-4">
            <ul
              className="sm-panel-list list-none m-0 p-0 flex flex-col gap-1.5"
              role="list"
              data-numbering={displayItemNumbering || undefined}
            >
              {items.length ? (
                items.map((it, idx) => (
                  <li
                    className="sm-panel-itemWrap relative overflow-hidden leading-none"
                    key={it.label + idx}
                  >
                    <NavLink
                      to={it.link}
                      aria-label={it.ariaLabel}
                      data-index={idx + 1}
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        `sm-panel-item relative font-black cursor-pointer leading-none tracking-tight uppercase inline-block no-underline pr-8 transition-colors duration-150 ${
                          isActive
                            ? 'text-blue-600'
                            : 'text-slate-900 hover:text-blue-600'
                        }`
                      }
                      style={{ fontSize: 'clamp(1.75rem, 6.5vw, 2.5rem)' }}
                    >
                      <span
                        className="sm-panel-itemLabel inline-block will-change-transform"
                        style={{ transformOrigin: '50% 100%' }}
                      >
                        {it.label}
                      </span>
                    </NavLink>
                  </li>
                ))
              ) : (
                <li className="sm-panel-itemWrap relative overflow-hidden leading-none" aria-hidden>
                  <span className="sm-panel-item text-slate-400 font-bold text-2xl leading-none uppercase inline-block">
                    <span className="sm-panel-itemLabel inline-block">No items</span>
                  </span>
                </li>
              )}
            </ul>

            {displaySocials && socialItems.length > 0 && (
              <div className="sm-socials mt-auto pt-6 flex flex-col gap-2" aria-label="Social links">
                <h3
                  className="sm-socials-title m-0 text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  Links
                </h3>
                <ul
                  className="sm-socials-list list-none m-0 p-0 flex flex-row items-center gap-3 flex-wrap"
                  role="list"
                >
                  {socialItems.map((s, i) => (
                    <li key={s.label + i}>
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sm-socials-link text-sm font-semibold text-slate-700 hover:text-blue-600 no-underline inline-block py-1 transition-colors duration-200"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Panel Footer Slot (User Card, Password, Logout) */}
          {panelFooter && (
            <div className="sm-panel-footer shrink-0 mt-6 pt-5 border-t border-slate-200/80">
              {panelFooter}
            </div>
          )}
        </aside>
      </div>

      {/* ── Scoped styles ensuring solid background and proper containment ── */}
      <style>{`
        .sm-scope .staggered-menu-panel {
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          max-width: 420px !important;
          height: 100% !important;
          height: 100vh !important;
          height: 100dvh !important;
          background-color: #ffffff !important;
          background: #ffffff !important;
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.16) !important;
          padding: 4.5rem 1.5rem 2rem 1.5rem !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        .sm-scope [data-position='left'] .staggered-menu-panel {
          right: auto !important;
          left: 0 !important;
          box-shadow: 8px 0 32px rgba(0, 0, 0, 0.16) !important;
        }
        .sm-scope .sm-prelayers {
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          max-width: 420px !important;
          height: 100% !important;
          height: 100vh !important;
          height: 100dvh !important;
          pointer-events: none !important;
        }
        .sm-scope [data-position='left'] .sm-prelayers {
          right: auto !important;
          left: 0 !important;
        }
        .sm-scope .sm-prelayer {
          position: absolute !important;
          top: 0 !important;
          right: 0 !important;
          height: 100% !important;
          width: 100% !important;
        }
        .sm-scope .sm-panel-list {
          counter-reset: smItem;
        }
        .sm-scope .sm-panel-list[data-numbering] .sm-panel-item::after {
          counter-increment: smItem;
          content: counter(smItem, decimal-leading-zero);
          position: absolute;
          top: 0.1em;
          right: 0;
          font-size: 0.8rem;
          font-weight: 700;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          color: var(--sm-accent, #4f46e5);
          letter-spacing: 0;
          pointer-events: none;
          user-select: none;
          opacity: var(--sm-num-opacity, 0);
        }
        .sm-scope .sm-toggle {
          top: 0.75rem !important;
          height: 2.5rem !important;
        }
        @media (max-width: 640px) {
          .sm-scope .staggered-menu-panel,
          .sm-scope .sm-prelayers {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StaggeredMenu;
