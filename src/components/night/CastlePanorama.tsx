import { forwardRef } from 'react';

const PANORAMA_SRC = '/images/hradcany-panorama.webp';

/** Sdílená dekorativní silueta Pražského hradu pro obě noční scény. */
export const CastlePanorama = forwardRef<HTMLImageElement>(function CastlePanorama(_, ref) {
  return (
    <img
      ref={ref}
      className="night-scene__hradcany"
      src={PANORAMA_SRC}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
    />
  );
});
