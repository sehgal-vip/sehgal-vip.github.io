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
  const progressFill = document.getElementById('video-progress-fill');

  if (!video || !heroSection) return;

  // Respect reduced-motion and bail on small / slow devices.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNarrow = window.innerWidth < 720;

  if (prefersReducedMotion || isNarrow) {
    // Static hero: let the page flow normally, skip the scroll scrub entirely.
    heroSection.style.minHeight = 'calc(100vh - 64px)';
    if (scrollIndicator) scrollIndicator.style.display = 'none';
    return;
  }

  // Scroll distance for full animation. Original was 200vh (2,186 px spacer
  // on a 900px viewport). Reduced to ~50vh so content appears ~1.3 viewports
  // after load — enough runway for the scrub to feel smooth, not enough to
  // feel like dead space.
  const scrollDistance = window.innerHeight * 0.5;
  const videoEndPoint = scrollDistance * 0.7;
  const heroHeight = window.innerHeight;

  // Spacer for scroll space. Original scrub runway: scrub 0→videoEndPoint,
  // then the hero fades + translates up over heroHeight worth of scroll.
  const spacer = document.createElement('div');
  spacer.style.cssText = 'height:' + (videoEndPoint + heroHeight) + 'px;';
  heroSection.after(spacer);

  // Safety: if the video hasn't reached playable state within 1.5s, tear down
  // the scrub and render the hero statically so visitors don't stare at a
  // dead scroll runway.
  const videoReadyTimer = setTimeout(function() {
    if (video.readyState < 2) {
      spacer.remove();
      heroSection.style.cssText = 'min-height:calc(100vh - 64px);';
      if (scrollIndicator) scrollIndicator.style.display = 'none';
      window.removeEventListener('scroll', onScroll);
    }
  }, 1500);

  video.addEventListener('loadeddata', function() {
    clearTimeout(videoReadyTimer);
  }, { once: true });

  // Hero fixed positioning. Title + subtitle anchor to the bottom of the
  // viewport as the starting position; they translate up + fade out during
  // scroll via updateScroll().
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
    'padding:2rem 2rem 9rem',
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

    // VIDEO PROGRESS INDICATOR
    if (progressFill) {
      var videoProgress = Math.min(progress / 0.7, 1);
      progressFill.style.width = (videoProgress * 100) + '%';
    }

    // Post-scrub phase: after the video finishes scrubbing at videoEndPoint,
    // the hero stays visible and fades out linearly across the next heroHeight
    // of scroll — so opacity hits 0 exactly when the about-section reaches
    // the top of the viewport. No dead scroll runway.
    const scrollBeyond = scrollY - videoEndPoint;
    const fadeT = scrollBeyond <= 0
      ? 0
      : Math.min(scrollBeyond / heroHeight, 1);

    // HERO TRANSFORM
    if (scrollBeyond <= 0) {
      heroSection.style.transform = 'translateY(0)';
      heroSection.style.visibility = 'visible';
    } else if (fadeT < 1) {
      heroSection.style.transform = 'translateY(' + (-scrollBeyond) + 'px)';
      heroSection.style.visibility = 'visible';
    } else {
      heroSection.style.transform = 'translateY(' + (-heroHeight) + 'px)';
      heroSection.style.visibility = 'hidden';
    }

    // HERO BACKGROUND FADE (full post-scrub range)
    if (heroBg) {
      if (fadeT < 1) {
        heroBg.style.opacity = (1 - fadeT).toString();
        heroBg.style.visibility = 'visible';
      } else {
        heroBg.style.opacity = '0';
        heroBg.style.visibility = 'hidden';
      }
    }

    // HERO CONTENT FADE (full post-scrub range)
    if (heroContent) {
      if (fadeT < 1) {
        heroContent.style.opacity = (1 - fadeT).toString();
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
    upgradePreload();
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

  // Upgrade preload to 'auto' on first scroll for smooth scrubbing
  let preloadUpgraded = false;
  function upgradePreload() {
    if (!preloadUpgraded) {
      video.preload = 'auto';
      preloadUpgraded = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateScroll();
})();
