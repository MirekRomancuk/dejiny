import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

/** Plovoucí tlačítko „Zpět nahoru" — objeví se po odscrollování a plynule vyjede na začátek. */
export function ScrollTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 1.2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`tl-totop${show ? ' show' : ''}`}
      onClick={toTop}
      aria-label="Zpět nahoru"
      title="Zpět nahoru"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
    >
      <ChevronUp className="tl-totop__icon" aria-hidden="true" />
    </button>
  );
}
