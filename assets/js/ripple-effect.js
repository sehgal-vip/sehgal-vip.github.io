/**
 * Particle-Based Ripple Effect Utility
 * 
 * Generates textured ripples with alternating teal/orange particles
 * that radiate outward from cursor/touch position.
 * 
 * Performance optimizations:
 * - Canvas API for efficient particle rendering
 * - Throttled event handlers
 * - requestAnimationFrame for 60fps animations
 * - Efficient particle cleanup
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    particleCount: 30,           // Number of particles per ripple
    fadeDuration: 300,            // Fade out duration in ms
    maxRadius: 80,                // Maximum ripple radius in pixels
    particleSize: 2,              // Individual particle size
    colors: ['#00CED1', '#FF6B35'], // Alternating colors
    opacity: 0.4,                 // Base opacity (0.3-0.5 range)
    throttleDelay: 16,            // ~60fps throttling
    minMovementDistance: 2        // Minimum movement to trigger new ripple
  };

  class RippleEffect {
    constructor() {
      // Skip on mobile if touch is not supported (fallback to mouse)
      if (window.innerWidth <= 768 && !('ontouchstart' in window)) {
        return;
      }

      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.lastX = 0;
      this.lastY = 0;
      this.lastRippleTime = 0;
      this.isActive = false;
      this.animationFrame = null;
      this.throttleTimer = null;
      this.cursorHidden = false;

      this.init();
    }

    /**
     * Initialize canvas and event listeners
     */
    init() {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'ripple-canvas';
      this.canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      `;
      document.body.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d');
      this.resize();
      
      // Event listeners
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('mousemove', (e) => this.handleMove(e.clientX, e.clientY));
      document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          this.handleMove(touch.clientX, touch.clientY);
        }
      }, { passive: true });
      // Restore cursor when mouse leaves viewport
      document.addEventListener('mouseleave', () => {
        if (this.cursorHidden) {
          document.body.style.cursor = '';
          this.cursorHidden = false;
        }
      });

      // Start animation loop
      this.animate();
    }

    /**
     * Resize canvas to match viewport
     */
    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    /**
     * Handle mouse/touch movement with throttling
     */
    handleMove(x, y) {
      // Throttle to ~60fps
      if (this.throttleTimer) {
        return;
      }

      this.throttleTimer = setTimeout(() => {
        this.throttleTimer = null;
      }, CONFIG.throttleDelay);

      // Check minimum movement distance
      const dx = x - this.lastX;
      const dy = y - this.lastY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < CONFIG.minMovementDistance) {
        return;
      }

      this.lastX = x;
      this.lastY = y;
      this.createRipple(x, y);
    }

    /**
     * Create a new ripple at the specified position
     * Replaces existing particles (no accumulation)
     */
    createRipple(x, y) {
      // Clear existing particles (no overlap)
      this.particles = [];

      // Generate particles in organic dispersion pattern
      for (let i = 0; i < CONFIG.particleCount; i++) {
        // Random angle for organic spread
        const angle = (Math.PI * 2 * i) / CONFIG.particleCount + (Math.random() - 0.5) * 0.3;
        // Varying distances for texture
        const distance = CONFIG.maxRadius * (0.3 + Math.random() * 0.7);
        // Random speed variation
        const speed = 0.5 + Math.random() * 0.5;
        // Alternating colors
        const color = CONFIG.colors[i % CONFIG.colors.length];

        this.particles.push({
          x: x,
          y: y,
          startX: x,
          startY: y,
          angle: angle,
          distance: distance,
          currentDistance: 0,
          speed: speed,
          color: color,
          opacity: CONFIG.opacity,
          size: CONFIG.particleSize + Math.random() * 1,
          createdAt: Date.now()
        });
      }

      this.isActive = true;
      this.lastRippleTime = Date.now();
      
      // Hide cursor when ripple is active
      if (!this.cursorHidden) {
        document.body.style.cursor = 'none';
        this.cursorHidden = true;
      }
    }

    /**
     * Update and render particles
     */
    animate() {
      this.animationFrame = requestAnimationFrame(() => this.animate());

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (!this.isActive || this.particles.length === 0) {
        return;
      }

      const now = Date.now();
      const elapsed = now - this.lastRippleTime;

      // Check if all particles should be removed (300ms fade)
      if (elapsed >= CONFIG.fadeDuration) {
        this.particles = [];
        this.isActive = false;
        
        // Restore cursor when ripple fades out
        if (this.cursorHidden) {
          document.body.style.cursor = '';
          this.cursorHidden = false;
        }
        return;
      }

      // Calculate fade opacity
      const fadeProgress = elapsed / CONFIG.fadeDuration;
      const fadeOpacity = CONFIG.opacity * (1 - fadeProgress);

      // Update and draw particles
      this.particles.forEach(particle => {
        // Update position (radiate outward)
        particle.currentDistance += particle.speed;
        const progress = Math.min(particle.currentDistance / particle.distance, 1);
        
        particle.x = particle.startX + Math.cos(particle.angle) * particle.currentDistance;
        particle.y = particle.startY + Math.sin(particle.angle) * particle.currentDistance;

        // Draw particle with fading opacity
        this.ctx.save();
        this.ctx.globalAlpha = fadeOpacity;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      });
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      if (this.throttleTimer) {
        clearTimeout(this.throttleTimer);
      }
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      // Restore cursor if hidden
      if (this.cursorHidden) {
        document.body.style.cursor = '';
        this.cursorHidden = false;
      }
      this.particles = [];
    }
  }

  // Initialize on DOM ready
  function initRippleEffect() {
    // Check if ripple effect is disabled via data attribute
    const body = document.body;
    if (body && body.hasAttribute('data-disable-ripple')) {
      return;
    }

    // Check if already initialized
    if (window.rippleEffectInstance) {
      return;
    }

    window.rippleEffectInstance = new RippleEffect();
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRippleEffect);
  } else {
    initRippleEffect();
  }

  // Export for manual control if needed
  window.RippleEffect = RippleEffect;
})();
