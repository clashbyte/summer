import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Zones } from 'src/entities/Zones';
import Logo from 'src/images/logo.png';
import styles from './Credits.module.scss';

enum CreditsSlide {
  None,
  Design,
  Programming,
  Logo
}

export function Credits() {
  const [slide, setSlide] = useState<CreditsSlide>(CreditsSlide.None);

  useEffect(() => {
    Zones.addZone(
      [14, 4, 18],
      [18, 4, 20],
      () => {
        setSlide(CreditsSlide.Design);
      },
      () => {
        setSlide(CreditsSlide.None);
      }
    );
    Zones.addZone(
      [14, 2, 18],
      [18, 2, 20],
      () => {
        setSlide(CreditsSlide.Programming);
      },
      () => {
        setSlide(CreditsSlide.None);
      }
    );
    Zones.addZone(
      [13, 0, 18],
      [18, 0, 23],
      () => {
        setSlide(CreditsSlide.Logo);
      },
      () => {
        setSlide(CreditsSlide.None);
      }
    );
  }, []);

  return (
    <div className={styles.credits}>
      <div className={clsx(styles.credits__slide, slide === CreditsSlide.Design && styles.active)}>
        <span>Design and artwork</span>
        <em>Dmitry Ezepov</em>
      </div>
      <div className={clsx(styles.credits__slide, slide === CreditsSlide.Programming && styles.active)}>
        <span>Programming and toolkit</span>
        <em>Mikhail Popov</em>
      </div>
      <div className={clsx(styles.credits__slide, slide === CreditsSlide.Logo && styles.active)}>
        <img src={Logo} alt="" />
      </div>
    </div>
  );
}
