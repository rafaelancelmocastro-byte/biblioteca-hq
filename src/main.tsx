import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppUpdateManager } from './components/layout/AppUpdateManager';
import './index.css';

const isReaderTarget = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest(".reader-shell");

const installAppZoomGuard = () => {
  const preventPinch = (event: TouchEvent) => {
    if (event.touches.length > 1 && !isReaderTarget(event.target) && event.cancelable) {
      event.preventDefault();
    }
  };

  const preventGesture = (event: Event) => {
    if (!isReaderTarget(event.target) && event.cancelable) event.preventDefault();
  };

  const preventBrowserZoomKeys = (event: KeyboardEvent) => {
    if (
      !isReaderTarget(event.target) &&
      (event.ctrlKey || event.metaKey) &&
      ["+", "=", "-", "0"].includes(event.key)
    ) {
      event.preventDefault();
    }
  };

  const preventBrowserWheelZoom = (event: WheelEvent) => {
    if (!isReaderTarget(event.target) && event.ctrlKey && event.cancelable) {
      event.preventDefault();
    }
  };

  document.addEventListener("touchmove", preventPinch, { passive: false });
  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });
  document.addEventListener("keydown", preventBrowserZoomKeys);
  document.addEventListener("wheel", preventBrowserWheelZoom, { passive: false });
};

installAppZoomGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppUpdateManager />
    <App />
  </StrictMode>,
);
