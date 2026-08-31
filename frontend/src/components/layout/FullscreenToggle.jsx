import { useEffect, useState } from 'react';
import { FiMaximize, FiMinimize } from 'react-icons/fi';
import { showError } from '../../utils/alerts.js';

function getFullscreenElement() {
  return (
    document.fullscreenElement
    || document.webkitFullscreenElement
    || document.mozFullScreenElement
    || document.msFullscreenElement
    || null
  );
}

function isFullscreenSupported() {
  const el = document.documentElement;
  return Boolean(
    el.requestFullscreen
    || el.webkitRequestFullscreen
    || el.mozRequestFullScreen
    || el.msRequestFullscreen
    || document.exitFullscreen
    || document.webkitExitFullscreen,
  );
}

async function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
  if (el.msRequestFullscreen) return el.msRequestFullscreen();
  throw new Error('Fullscreen is not supported in this browser.');
}

async function exitFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
  throw new Error('Fullscreen is not supported in this browser.');
}

export default function FullscreenToggle() {
  const [active, setActive] = useState(() => Boolean(getFullscreenElement()));
  const supported = typeof document !== 'undefined' && isFullscreenSupported();

  useEffect(() => {
    function sync() {
      setActive(Boolean(getFullscreenElement()));
    }
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    document.addEventListener('mozfullscreenchange', sync);
    document.addEventListener('MSFullscreenChange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
      document.removeEventListener('mozfullscreenchange', sync);
      document.removeEventListener('MSFullscreenChange', sync);
    };
  }, []);

  async function toggle() {
    if (!supported) {
      await showError('Fullscreen unavailable', 'Your browser does not support fullscreen mode.');
      return;
    }
    try {
      if (getFullscreenElement()) {
        await exitFullscreen();
      } else {
        await enterFullscreen();
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      await showError(
        'Unable to toggle fullscreen',
        error?.message || 'Please try again or use your browser fullscreen shortcut.',
      );
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!supported}
      aria-label={active ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={active ? 'Exit fullscreen' : 'Enter fullscreen'}
      className="grid h-10 w-10 place-items-center rounded-full border border-app-border text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {active ? <FiMinimize className="text-lg" /> : <FiMaximize className="text-lg" />}
    </button>
  );
}
