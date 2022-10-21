import React from 'react';
import ReactDOM from 'react-dom/client';
import { Credits } from './markup/components/CreditsWrap/Credits';
import { GameCanvas } from './markup/components/GameCanvas/GameCanvas';
import { Splash } from './markup/components/Splash/Splash';
import './markup/styles/index.scss';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <>
    <GameCanvas />
    <Credits />
    <Splash />
  </>
);
