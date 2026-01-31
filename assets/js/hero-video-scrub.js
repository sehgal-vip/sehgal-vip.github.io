/**
 * Hero Video Scroll Scrub
 *
 * Sequence:
 * - 0-70%: Video scrubs, hero text fixed at bottom
 * - 70%+: Hero text scrolls up via translateY, about follows immediately
 *
 * Optimizations:
 * - requestAnimationFrame throttling for smooth 60fps
 * - Seek threshold to reduce expensive video.currentTime calls
 */
(function() {
  'use strict';

  const video = document.getElementById('hero-video');
  const heroSection = document.querySelector('.hero-fullscreen');
  const heroBg = document.querySelector('.hero-bg-fixed');
  const scrollIndicator = document.querySelector('.scroll-indicator');

  if (!video || !heroSection) return;

  // Scroll distance for full animation (200vh)
  const scrollDistance = window.innerHeight * 2;
  const videoEndPoint = scrollDistance * 0.7; // 140vh - video completes here
  const heroHeight = window.innerHeight; // Hero scroll-off distance

  // Spacer = video phase + hero scroll-off phase
  // This ensures about section appears as hero scrolls away
  const spacer = document.createElement('div');
  spacer.style.cssText = 'height:' + (videoEndPoint + heroHeight) + 'px;';
  heroSection.after(spacer);

  // Hero stays fixed throughout, we use translateY to scroll it up
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

  // Throttling state
  let ticking = false;
  let lastVideoTime = 0;

  function updateOnScroll() {
    const scrollY = window.scrollY;
    const progress = Math.min(scrollY / scrollDistance, 1);

    // VIDEO: 0-70% scroll = 0-100% video
    if (video.duration) {
      const videoProgress = Math.min(progress / 0.7, 1);
      const targetTime = videoProgress * video.duration;

      // Only seek if difference > 0.05s (reduces jank on fast scroll)
      if (Math.abs(targetTime - lastVideoTime) > 0.05) {
        video.currentTime = targetTime;
        lastVideoTime = targetTime;
      }
    }

    // HERO: Fixed during video (0-70%), then scrolls up via translateY
    if (scrollY <= videoEndPoint) {
      // During video phase - hero stays in place
      heroSection.style.transform = 'translateY(0)';
      heroSection.style.visibility = 'visible';
    } else {
      // After video - hero scrolls up naturally
      const scrollBeyond = scrollY - videoEndPoint;
      heroSection.style.transform = 'translateY(' + (-scrollBeyond) + 'px)';

      // Hide hero once it's fully scrolled off
      if (scrollBeyond > heroHeight) {
        heroSection.style.visibility = 'hidden';
      } else {
        heroSection.style.visibility = 'visible';
      }
    }

    // HERO BACKGROUND: Fade out during 70-100%
    if (heroBg) {
      if (progress <= 0.7) {
        heroBg.style.opacity = '1';
        heroBg.style.visibility = 'visible';
      } else if (progress < 1) {
        const fadeProgress = (progress - 0.7) / 0.3;
        heroBg.style.opacity = 1 - fadeProgress;
        heroBg.style.visibility = 'visible';
      } else {
        heroBg.style.opacity = '0';
        heroBg.style.visibility = 'hidden';
      }
    }

    // SCROLL INDICATOR: Fades 40-60%
    if (scrollIndicator) {
      if (progress <= 0.4) {
        scrollIndicator.style.opacity = '1';
        scrollIndicator.style.visibility = 'visible';
      } else if (progress < 0.6) {
        scrollIndicator.style.opacity = 1 - ((progress - 0.4) / 0.2);
      } else {
        scrollIndicator.style.opacity = '0';
        scrollIndicator.style.visibility = 'hidden';
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

  // Fixed scroll indicator positioning
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

  window.addEventListener('scroll', onScroll, { passive: true });
  updateOnScroll();
})();
