/**
 * Hero Video Scroll Scrub - Simple implementation
 */
(function() {
  'use strict';

  const video = document.getElementById('hero-video');
  const heroSection = document.querySelector('.hero-fullscreen');
  const heroBg = document.querySelector('.hero-bg-fixed');
  const heroTitle = document.querySelector('.hero-title');
  const scrollIndicator = document.querySelector('.scroll-indicator');

  if (!video || !heroSection) return;

  // Scroll distance for video scrub (200vh)
  const scrollDistance = window.innerHeight * 2;

  // Create spacer for scroll room (70% of scroll distance since hero hides at 70%)
  const spacer = document.createElement('div');
  spacer.style.height = (scrollDistance * 0.7) + 'px';
  heroSection.after(spacer);

  // Fix hero position
  heroSection.style.cssText = 'position:fixed;top:64px;left:0;right:0;width:100%;height:calc(100vh - 64px);z-index:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding:2rem;padding-bottom:4rem;box-sizing:border-box;pointer-events:none;';

  // Fix scroll indicator
  if (scrollIndicator) {
    scrollIndicator.style.cssText = 'position:fixed !important;bottom:2rem !important;left:0 !important;right:0 !important;margin:0 auto !important;width:fit-content !important;z-index:1 !important;display:flex;flex-direction:column;align-items:center;';
  }

  // Scroll handler
  function onScroll() {
    const scrollY = window.scrollY;
    const progress = Math.min(scrollY / scrollDistance, 1);

    // Video scrub (0-70% of scroll = full video)
    if (video.duration) {
      const videoProgress = Math.min(progress / 0.7, 1);
      video.currentTime = videoProgress * video.duration;
    }

    // Hero text fades out from 50% to 70%
    if (progress < 0.5) {
      heroSection.style.opacity = '1';
      heroSection.style.visibility = 'visible';
    } else if (progress < 0.7) {
      const fadeProgress = (progress - 0.5) / 0.2;
      heroSection.style.opacity = 1 - fadeProgress;
      heroSection.style.visibility = 'visible';
    } else {
      heroSection.style.opacity = '0';
      heroSection.style.visibility = 'hidden';
    }

    // Background fades from 50% to 70%
    if (heroBg) {
      if (progress < 0.5) {
        heroBg.style.opacity = '1';
        heroBg.style.visibility = 'visible';
      } else if (progress < 0.7) {
        const fadeProgress = (progress - 0.5) / 0.2;
        heroBg.style.opacity = 1 - fadeProgress;
        heroBg.style.visibility = 'visible';
      } else {
        heroBg.style.opacity = '0';
        heroBg.style.visibility = 'hidden';
      }
    }

    // Scroll indicator fades earlier (30% to 50%)
    if (scrollIndicator) {
      if (progress < 0.3) {
        scrollIndicator.style.opacity = '1';
        scrollIndicator.style.visibility = 'visible';
      } else if (progress < 0.5) {
        const fadeProgress = (progress - 0.3) / 0.2;
        scrollIndicator.style.opacity = 1 - fadeProgress;
        scrollIndicator.style.visibility = 'visible';
      } else {
        scrollIndicator.style.opacity = '0';
        scrollIndicator.style.visibility = 'hidden';
      }
    }

    // Title scaling from 50% to 70%
    if (heroTitle) {
      if (progress > 0.5 && progress < 0.7) {
        const fx = (progress - 0.5) / 0.2;
        heroTitle.style.transform = 'scale(' + (1 + fx * 0.15) + ')';
      } else if (progress >= 0.7) {
        heroTitle.style.transform = 'scale(1.15)';
      } else {
        heroTitle.style.transform = '';
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
