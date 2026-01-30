/**
 * Hero Video Scroll Scrub - Simple implementation
 */
(function() {
  'use strict';

  const video = document.getElementById('hero-video');
  const heroSection = document.querySelector('.hero-fullscreen');
  const heroBg = document.querySelector('.hero-bg-fixed');
  const heroContent = document.querySelector('.hero-content');
  const heroTitle = document.querySelector('.hero-title');

  if (!video || !heroSection) return;

  // Scroll distance for video scrub (200vh)
  const scrollDistance = window.innerHeight * 2;
  const heroHeight = window.innerHeight - 64; // viewport minus header

  // Create spacer for scroll room
  const spacer = document.createElement('div');
  spacer.style.height = scrollDistance + 'px';
  heroSection.after(spacer);

  // Fix hero position with proper centering
  heroSection.style.cssText = 'position:fixed;top:64px;left:0;right:0;width:100%;height:calc(100vh - 64px);z-index:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding:2rem;padding-bottom:4rem;box-sizing:border-box;';

  // Fix scroll indicator centering
  const scrollIndicator = heroSection.querySelector('.scroll-indicator');
  if (scrollIndicator) {
    scrollIndicator.style.cssText = 'position:fixed !important;bottom:2rem !important;left:0 !important;right:0 !important;margin:0 auto !important;transform:none !important;width:fit-content !important;z-index:2 !important;display:flex;flex-direction:column;align-items:center;';
  }

  // Scroll handler
  function onScroll() {
    const scrollY = window.scrollY;
    const progress = Math.min(scrollY / scrollDistance, 1);

    // Video scrub (full 0-100%)
    if (video.duration) {
      video.currentTime = progress * video.duration;
    }

    // Background fade (full 0-100%)
    if (heroBg) {
      heroBg.style.opacity = 1 - progress;
    }

    // Title scaling after 70%
    if (progress > 0.7) {
      const fx = (progress - 0.7) / 0.3;
      if (heroTitle) heroTitle.style.transform = 'scale(' + (1 + fx * 0.15) + ')';
    } else {
      if (heroTitle) heroTitle.style.transform = '';
    }

    // Hero content fade out during last 30%
    if (progress > 0.7) {
      const fadeProgress = (progress - 0.7) / 0.3;
      heroSection.style.opacity = 1 - fadeProgress;
    } else {
      heroSection.style.opacity = '1';
    }

    // Hide hero completely when scroll reaches end
    if (progress >= 1) {
      heroSection.style.visibility = 'hidden';
      heroSection.style.pointerEvents = 'none';
      if (heroBg) {
        heroBg.style.visibility = 'hidden';
        heroBg.style.pointerEvents = 'none';
      }
      if (scrollIndicator) {
        scrollIndicator.style.visibility = 'hidden';
      }
    } else {
      heroSection.style.visibility = 'visible';
      heroSection.style.pointerEvents = '';
      if (heroBg) {
        heroBg.style.visibility = 'visible';
        heroBg.style.pointerEvents = '';
      }
      if (scrollIndicator) {
        scrollIndicator.style.visibility = 'visible';
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
