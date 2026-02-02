/**
 * Hero Video Scroll Scrub
 *
 * Sequence:
 * - 0-70%: Video scrubs, hero text fixed at bottom
 * - 70%+: Hero text scrolls up via translateY, about follows immediately
 *
 * Performance optimizations:
 * - GPU acceleration with translate3d and will-change
 * - Aggressive seek threshold on mobile
 * - Minimal DOM updates
 */
(function() {
  'use strict';

  const video = document.getElementById('hero-video');
  const heroSection = document.querySelector('.hero-fullscreen');
  const heroBg = document.querySelector('.hero-bg-fixed');
  const heroContent = document.querySelector('.hero-content');
  const scrollIndicator = document.querySelector('.scroll-indicator');

  if (!video || !heroSection) return;

  // Detect mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const seekThreshold = isMobile ? 0.15 : 0.05; // More aggressive on mobile

  // Scroll distance for full animation (200vh)
  const scrollDistance = window.innerHeight * 2;
  const videoEndPoint = scrollDistance * 0.7;
  const heroHeight = window.innerHeight;

  // Spacer for scroll space
  const spacer = document.createElement('div');
  spacer.style.cssText = 'height:' + (videoEndPoint + heroHeight) + 'px;pointer-events:none;';
  heroSection.after(spacer);

  // GPU-accelerated hero styles
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
    'transform:translate3d(0,0,0)',
    'will-change:transform',
    'backface-visibility:hidden'
  ].join(';');

  // GPU-accelerated background styles
  if (heroBg) {
    heroBg.style.willChange = 'opacity';
    heroBg.style.backfaceVisibility = 'hidden';
    heroBg.style.transition = 'none';
  }

  // GPU-accelerated hero content styles
  if (heroContent) {
    heroContent.style.willChange = 'opacity';
    heroContent.style.backfaceVisibility = 'hidden';
  }

  // Throttling state
  let ticking = false;
  let lastVideoTime = 0;
  let videoReady = false;
  let lastProgress = -1;

  function checkVideoReady() {
    if (video.readyState >= 2) {
      videoReady = true;
      return true;
    }
    return false;
  }

  function primeVideoForMobile() {
    if (videoReady) return;
    var playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(function() {
        video.pause();
        video.currentTime = 0;
        videoReady = true;
      }).catch(function() {});
    }
  }

  function updateOnScroll() {
    const scrollY = window.scrollY;
    const progress = Math.min(scrollY / scrollDistance, 1);

    // Skip if progress hasn't changed significantly
    if (Math.abs(progress - lastProgress) < 0.001) return;
    lastProgress = progress;

    // VIDEO SCRUB: 0-70%
    if (video.duration && (videoReady || checkVideoReady())) {
      const videoProgress = Math.min(progress / 0.7, 1);
      const targetTime = videoProgress * video.duration;

      if (Math.abs(targetTime - lastVideoTime) > seekThreshold) {
        try {
          video.currentTime = targetTime;
          lastVideoTime = targetTime;
        } catch (e) {}
      }
    }

    // HERO TRANSFORM - use translate3d for GPU
    if (scrollY <= videoEndPoint) {
      heroSection.style.transform = 'translate3d(0,0,0)';
      heroSection.style.visibility = 'visible';
    } else {
      const scrollBeyond = scrollY - videoEndPoint;
      heroSection.style.transform = 'translate3d(0,' + (-scrollBeyond) + 'px,0)';
      heroSection.style.visibility = scrollBeyond > heroHeight ? 'hidden' : 'visible';
    }

    // HERO BACKGROUND OPACITY - fade 70-100%
    if (heroBg) {
      if (progress <= 0.7) {
        heroBg.style.opacity = '1';
        heroBg.style.visibility = 'visible';
      } else if (progress < 1) {
        heroBg.style.opacity = (1 - (progress - 0.7) / 0.3).toFixed(2);
        heroBg.style.visibility = 'visible';
      } else {
        heroBg.style.opacity = '0';
        heroBg.style.visibility = 'hidden';
      }
    }

    // HERO CONTENT OPACITY - fade with background 70-100%
    if (heroContent) {
      if (progress <= 0.7) {
        heroContent.style.opacity = '1';
        heroContent.style.visibility = 'visible';
      } else if (progress < 1) {
        heroContent.style.opacity = (1 - (progress - 0.7) / 0.3).toFixed(2);
        heroContent.style.visibility = 'visible';
      } else {
        heroContent.style.opacity = '0';
        heroContent.style.visibility = 'hidden';
      }
    }

    // SCROLL INDICATOR
    if (scrollIndicator) {
      if (progress <= 0.4) {
        scrollIndicator.style.opacity = '1';
      } else if (progress < 0.6) {
        scrollIndicator.style.opacity = (1 - (progress - 0.4) / 0.2).toFixed(2);
      } else {
        scrollIndicator.style.opacity = '0';
      }
    }
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(function() {
        updateOnScroll();
        ticking = false;
      });
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
      'z-index:1',
      'will-change:opacity',
      'backface-visibility:hidden'
    ].join(';');
  }

  // Event listeners
  video.addEventListener('canplay', function() {
    videoReady = true;
  });

  video.addEventListener('loadeddata', function() {
    checkVideoReady();
    if (isMobile) primeVideoForMobile();
  });

  if (isMobile) {
    document.addEventListener('touchstart', primeVideoForMobile, { once: true, passive: true });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial
  checkVideoReady();
  updateOnScroll();
})();
