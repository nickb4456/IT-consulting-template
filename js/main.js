(function () {
    "use strict";

    // DOM Ready
    document.addEventListener('DOMContentLoaded', function() {

        // Navbar scroll effect
        const navbar = document.querySelector('.navbar');

        function handleNavbarScroll() {
            if (window.scrollY > 50) {
                navbar?.classList.add('scrolled');
            } else {
                navbar?.classList.remove('scrolled');
            }
        }

        window.addEventListener('scroll', handleNavbarScroll);
        handleNavbarScroll(); // Initial check

        // Back to top button
        const backToTop = document.querySelector('.back-to-top');

        function handleBackToTopVisibility() {
            if (window.scrollY > 300) {
                backToTop?.classList.add('visible');
            } else {
                backToTop?.classList.remove('visible');
            }
        }

        window.addEventListener('scroll', handleBackToTopVisibility);
        handleBackToTopVisibility(); // Initial check

        backToTop?.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const navbarHeight = navbar?.offsetHeight || 0;
                    const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Close mobile menu if open
                    const navbarCollapse = document.querySelector('.navbar-collapse');
                    if (navbarCollapse?.classList.contains('show')) {
                        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                        if (bsCollapse) {
                            bsCollapse.hide();
                        }
                    }
                }
            });
        });

        // Dropdown hover on desktop
        if (window.innerWidth > 992) {
            const dropdowns = document.querySelectorAll('.navbar .dropdown');

            dropdowns.forEach(dropdown => {
                dropdown.addEventListener('mouseenter', function() {
                    const dropdownMenu = this.querySelector('.dropdown-menu');
                    dropdownMenu?.classList.add('show');
                });

                dropdown.addEventListener('mouseleave', function() {
                    const dropdownMenu = this.querySelector('.dropdown-menu');
                    dropdownMenu?.classList.remove('show');
                });
            });
        }

        // Form validation and submission
        const contactForm = document.getElementById('contactForm');

        contactForm?.addEventListener('submit', function(e) {
            e.preventDefault();

            // Basic validation
            const name = this.querySelector('#name');
            const email = this.querySelector('#email');
            let isValid = true;

            if (!name?.value.trim()) {
                name?.classList.add('is-invalid');
                isValid = false;
            } else {
                name?.classList.remove('is-invalid');
            }

            if (!email?.value.trim() || !isValidEmail(email.value)) {
                email?.classList.add('is-invalid');
                isValid = false;
            } else {
                email?.classList.remove('is-invalid');
            }

            if (isValid) {
                // Show success message (in production, this would send to a server)
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn?.innerHTML;

                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Message Sent!';
                    submitBtn.disabled = true;

                    setTimeout(() => {
                        submitBtn.innerHTML = originalText || 'Submit';
                        submitBtn.disabled = false;
                        contactForm.reset();
                    }, 3000);
                }
            }
        });

        function isValidEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        // Remove invalid class on input
        document.querySelectorAll('.form-control').forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('is-invalid');
            });
        });

        // Animate elements on scroll (Intersection Observer)
        const animateOnScroll = document.querySelectorAll('.service-card, .industry-card, .testimonial-card, .use-case-card');

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            animateOnScroll.forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                observer.observe(el);
            });
        }

        // Active nav link based on scroll position
        const sections = document.querySelectorAll('section[id]');

        function highlightNavLink() {
            const scrollY = window.scrollY;

            sections.forEach(section => {
                const sectionHeight = section.offsetHeight;
                const sectionTop = section.offsetTop - 100;
                const sectionId = section.getAttribute('id');
                const navLink = document.querySelector(`.navbar-nav a[href="#${sectionId}"]`);

                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navLink?.classList.add('active');
                } else {
                    navLink?.classList.remove('active');
                }
            });
        }

        window.addEventListener('scroll', highlightNavLink);

    });

})();
