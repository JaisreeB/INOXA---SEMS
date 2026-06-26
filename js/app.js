/**
 * ==========================================================
 * Inoxa SEMS - app.js
 * Main landing page logic: navigation, scroll effects,
 * animations, and simulated live counters.
 * ==========================================================
 */

'use strict';

/* ─── Namespace ─── */
const InoxaApp = (() => {

  /* ── Navigation ── */
  const initNavbar = () => {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('navHamburger');
    const mobileMenu = document.getElementById('mobileMenu');

    // Scroll-based styling
    const onScroll = () => {
      if (window.scrollY > 30) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Hamburger toggle
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
        const spans = hamburger.querySelectorAll('span');
        if (mobileMenu.classList.contains('open')) {
          spans[0].style.transform = 'translateY(7px) rotate(45deg)';
          spans[1].style.opacity   = '0';
          spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
        } else {
          spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
        }
      });

      // Close on link click
      mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobileMenu.classList.remove('open');
          hamburger.querySelectorAll('span').forEach(s => {
            s.style.transform = ''; s.style.opacity = '';
          });
        });
      });
    }

    // Active link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks  = document.querySelectorAll('.nav-links a');

    const setActiveLink = () => {
      let current = '';
      sections.forEach(section => {
        const top = section.offsetTop - var_navHeight() - 20;
        if (window.scrollY >= top) current = section.id;
      });
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
          link.classList.add('active');
        }
      });
    };

    window.addEventListener('scroll', setActiveLink, { passive: true });
  };

  const var_navHeight = () => parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--nav-height') || '70'
  );

  /* ── Scroll Reveal ── */
  const initScrollReveal = () => {
    const revealClasses = ['.reveal', '.reveal-left', '.reveal-right'];
    const all = document.querySelectorAll(revealClasses.join(','));

    if (!all.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    all.forEach(el => io.observe(el));
  };

  /* ── Animated Counters ── */
  const animateCounter = (el, target, suffix = '', duration = 1800) => {
    const start = performance.now();
    const isDecimal = target % 1 !== 0;
    const update = (ts) => {
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = (isDecimal ? current.toFixed(1) : Math.round(current)) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  };

  const initCounters = () => {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const target  = parseFloat(e.target.dataset.count);
          const suffix  = e.target.dataset.suffix || '';
          const dur     = parseInt(e.target.dataset.duration || 1800);
          animateCounter(e.target, target, suffix, dur);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => io.observe(c));
  };

  /* ── Smooth Scroll for anchor links ── */
  const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - var_navHeight();
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  };

  /* ── Architecture Node Highlight Animation ── */
  const initArchAnimation = () => {
    const nodes = document.querySelectorAll('.arch-node');
    if (!nodes.length) return;

    let idx = 0;
    const step = () => {
      nodes.forEach(n => n.classList.remove('highlight-node'));
      nodes[idx].classList.add('highlight-node');
      idx = (idx + 1) % nodes.length;
    };

    step();
    setInterval(step, 1200);
  };

  /* ── Feature Card Stagger Animation ── */
  const initFeatureStagger = () => {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, i) => {
      card.style.transitionDelay = `${i * 0.08}s`;
    });
  };

  /* ── Particle Background (lightweight) ── */
  const initParticles = () => {
    const canvas = document.getElementById('heroParticles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x  = Math.random() * canvas.width;
        this.y  = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.r  = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 0.4 + 0.1;
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width ||
            this.y < 0 || this.y > canvas.height) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(33,150,243,${this.alpha})`;
        ctx.fill();
      }
    }

    const init = () => {
      resize();
      particles = Array.from({ length: 80 }, () => new Particle());
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw connection lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(33,150,243,${0.06 * (1 - dist/100)})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(draw);
    };

    window.addEventListener('resize', () => {
      resize();
      particles.forEach(p => p.reset());
    });

    init();
    draw();
  };

  /* ── Public Init ── */
  const init = () => {
    initNavbar();
    initScrollReveal();
    initCounters();
    initSmoothScroll();
    initArchAnimation();
    initFeatureStagger();
    initParticles();
    console.log('[Inoxa SEMS] App initialized ✓');
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', InoxaApp.init);
