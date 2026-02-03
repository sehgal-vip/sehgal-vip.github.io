/**
 * Hero Video Scroll Scrub
 *
 * High-resolution video scrubbing synced to scroll position.
 * - 0-70%: Video scrubs 0-100%
 * - 70%+: Hero scrolls up, content fades
 */
(function() {
  'use strict';

  const video = document.getElementById('hero-video');
  const heroSection = document.querySelector('.hero-fullscreen');
  const heroBg = document.querySelector('.hero-bg-fixed');
  const heroContent = document.querySelector('.hero-content');
  const scrollIndicator = document.querySelector('.scroll-indicator');

  if (!video || !heroSection) return;

  // Scroll distance for full animation (200vh)
  const scrollDistance = window.innerHeight * 2;
  const videoEndPoint = scrollDistance * 0.7;
  const heroHeight = window.innerHeight;

  // Spacer for scroll space
  const spacer = document.createElement('div');
  spacer.style.cssText = 'height:' + (videoEndPoint + heroHeight) + 'px;';
  heroSection.after(spacer);

  // Hero fixed positioning
  heroSection.style.cssText = [
    'position:fixed',
    'top:64px',
    'left:0',
    'right:0',
    'width:100%',
    'height:calc(100vh - 64px)',
    'z-index:1',
    'display:flex',
    'flex-direction:column',
    'justify-content:flex-end',
    'align-items:center',
    'padding:2rem',
    'padding-bottom:4rem',
    'box-sizing:border-box',
    'transform:translateY(0)'
  ].join(';');

  // State
  let ticking = false;
  let lastTime = -1;

  function updateScroll() {
    const scrollY = window.scrollY;
    const progress = Math.min(scrollY / scrollDistance, 1);

    // VIDEO SCRUB: 0-70% scroll = 0-100% video (high resolution)
    if (video.duration && video.readyState >= 2) {
      const videoProgress = Math.min(progress / 0.7, 1);
      const targetTime = videoProgress * video.duration;

      // Very small threshold for high-res scrubbing (0.016s = 1 frame at 60fps)
      if (Math.abs(targetTime - lastTime) > 0.016) {
        video.currentTime = targetTime;
        lastTime = targetTime;
      }
    }

    // HERO TRANSFORM
    if (scrollY <= videoEndPoint) {
      heroSection.style.transform = 'translateY(0)';
      heroSection.style.visibility = 'visible';
    } else {
      const scrollBeyond = scrollY - videoEndPoint;
      heroSection.style.transform = 'translateY(' + (-scrollBeyond) + 'px)';
      heroSection.style.visibility = scrollBeyond > heroHeight ? 'hidden' : 'visible';
    }

    // HERO BACKGROUND FADE: 70-100%
    if (heroBg) {
      if (progress <= 0.7) {
        heroBg.style.opacity = '1';
        heroBg.style.visibility = 'visible';
      } else if (progress < 1) {
        heroBg.style.opacity = 1 - (progress - 0.7) / 0.3;
        heroBg.style.visibility = 'visible';
      } else {
        heroBg.style.opacity = '0';
        heroBg.style.visibility = 'hidden';
      }
    }

    // HERO CONTENT FADE: 70-100%
    if (heroContent) {
      if (progress <= 0.7) {
        heroContent.style.opacity = '1';
        heroContent.style.visibility = 'visible';
      } else if (progress < 1) {
        heroContent.style.opacity = 1 - (progress - 0.7) / 0.3;
        heroContent.style.visibility = 'visible';
      } else {
        heroContent.style.opacity = '0';
        heroContent.style.visibility = 'hidden';
      }
    }

    // SCROLL INDICATOR: 40-60%
    if (scrollIndicator) {
      if (progress <= 0.4) {
        scrollIndicator.style.opacity = '1';
        scrollIndicator.style.visibility = 'visible';
      } else if (progress < 0.6) {
        scrollIndicator.style.opacity = 1 - (progress - 0.4) / 0.2;
      } else {
        scrollIndicator.style.opacity = '0';
        scrollIndicator.style.visibility = 'hidden';
      }
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateScroll);
      ticking = true;
    }
  }

  // Scroll indicator positioning
  if (scrollIndicator) {
    scrollIndicator.style.cssText = [
      'position:fixed',
      'bottom:2rem',
      'left:0',
      'right:0',
      'margin:0 auto',
      'width:fit-content',
      'z-index:1'
    ].join(';');
  }

  // Preload video for smooth scrubbing
  video.preload = 'auto';

  window.addEventListener('scroll', onScroll, { passive: true });
  updateScroll();
})();
