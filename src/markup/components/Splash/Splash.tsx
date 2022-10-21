import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Engine } from 'src/core/Engine';
import Dog from 'src/images/dog.gif';
import { Controls } from 'src/core/Controls';
import styles from './Splash.module.scss';

export function Splash() {
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    Engine.onLoad = () => setLoaded(true);
  }, []);

  const handleStart = () => {
    setHidden(true);
    Controls.lock();
  };

  return (
    <div className={clsx(styles.splash, hidden && styles.hidden)}>
      <div className={clsx(styles.splash__frame, loaded && styles.left)}>
        <div className={styles.splash__loader}>
          <img src={Dog} alt="" /> Loading...
        </div>
      </div>
      <div className={clsx(styles.splash__frame, !loaded && styles.right)}>
        <button tabIndex={0} type="button" onClick={handleStart}>
          Play!
        </button>
      </div>
      <div className={styles.splash__headphones}>Use headphones for better experience</div>
    </div>
  );
}
