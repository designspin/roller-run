import { Application, Container } from 'pixi.js';
import { initAssets } from './assets';
import { navigation } from './navigation';

import './style.css'
import { designConfig } from './game/designConfig';
import { LoadScreen } from './screens/LoadScreen';
import { TitleScreen } from './screens/TitleScreen';


export const app = new Application();
export const backgroundContainer = new Container();
export const gameContainer = new Container();

function resize() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    app.renderer.resize(screenWidth, screenHeight);

    const scale = Math.min(
        screenWidth / designConfig.content.width,
        screenHeight / designConfig.content.height,
    );

    gameContainer.scale.set(scale);
    gameContainer.x = (screenWidth - designConfig.content.width * scale) / 2;
    gameContainer.y = (screenHeight - designConfig.content.height * scale) / 2;
}

async function init() {
  navigation.init();
  
  await app.init({
    resolution: Math.min(Math.max(window.devicePixelRatio || 1, 1), 2),
    background: 0x000000,
    resizeTo: window,
  });

  app.stage.addChild(backgroundContainer, gameContainer);

  
  await initAssets();
  navigation.setLoadScreen(LoadScreen);

  document.getElementById("app")!.appendChild(app.canvas);

  

  resize();
  window.addEventListener('resize', resize);

  await navigation.gotoScreen(TitleScreen);
}

init();
