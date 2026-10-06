import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Footer } from './Footer';
import { AdminEditProvider } from '@/components/admin-inline/AdminEditProvider';
import { EditDrawer } from '@/components/admin-inline/EditDrawer';
import { NightBackdrop } from '@/components/night/NightBackdrop';

const NOISE_PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E\")";

export function PublicLayout() {
  const location = useLocation();
  const [params] = useSearchParams();

  // Časová osa (HomePage, ?view=timeline) má vlastní pevné noční pozadí
  // (TimelineNight přes celý viewport). Na všech ostatních veřejných stránkách
  // i na tabulce Událostí zobrazíme odscrollovatelný noční „header band".
  const isTimelineView = location.pathname === '/' && params.get('view') === 'timeline';

  return (
    <AdminEditProvider>
      <div className="relative min-h-screen overflow-x-clip bg-background">
        {/* Decorative noise overlay for parchment texture */}
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.05]"
          style={{ backgroundImage: NOISE_PATTERN }}
          aria-hidden="true"
        />
        <div className="relative z-10 flex min-h-screen flex-col">
          {/* Noční „hlavičková zóna" pro všechny stránky mimo časovou osu.
              Klíč vynutí remount při přechodu mezi stránkami → přeměří výšku
              hlavičkové zóny podle nové stránky. */}
          {!isTimelineView && <NightBackdrop key={location.pathname} />}
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
        {/* Editační drawer pro přihlášeného admina (jinak zavřený a prázdný) */}
        <EditDrawer />
      </div>
    </AdminEditProvider>
  );
}
