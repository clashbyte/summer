import { MouseEvent, useEffect, useRef } from 'react';
import { init, resize, run, stop } from 'src/core/Core';
import styles from './GameCanvas.module.scss';

export function GameCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current) {
      init(ref.current);

      window.addEventListener('resize', resize);
      resize();
      run();

      return () => {
        window.removeEventListener('resize', resize);
        stop();
      };
    }
  }, [ref]);

  const handleContext = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  return <canvas ref={ref} className={styles.canvas} onContextMenu={handleContext} />;
}
