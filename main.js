import './style.css'
import { initBuildMode } from './build-mode-3d.js'
import { initDotFlowButtons } from './dot-flow.js'

document.addEventListener('DOMContentLoaded', () => {
    // ── Infinite Portfolio Ticker ──
    const track = document.querySelector('.portfolio-track');
    if (track) {
        // Clone the cards twice to ensure it overflows enough for a seamless CSS marquee
        const cards = Array.from(track.children);
        cards.forEach(card => track.appendChild(card.cloneNode(true)));
        cards.forEach(card => track.appendChild(card.cloneNode(true)));
    }

    initDotFlowButtons();

    // ── Fade-in animations ──
    const fadeElements = document.querySelectorAll('.fade-in');
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    fadeElements.forEach(el => fadeObserver.observe(el));

    // ── FAQ Accordion ──
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            faqItems.forEach(faq => faq.classList.remove('active'));
            if (!isActive) item.classList.add('active');
        });
    });

    // ── Unfolding Timeline (Section 4) ──
    const tlItems = document.querySelectorAll('.tl-item');
    const tlNodes = document.querySelectorAll('.timeline-node');

    if (tlItems.length) {
        // Activate first card immediately (visible on load)
        tlItems[0].classList.add('active');
        tlNodes[0].classList.add('active');

        let activeIdx = 0;
        let rafPending = false;

        // Track which items are currently visible in the trigger zone
        const visibleSet = new Set([0]);

        const applyActive = () => {
            rafPending = false;
            // Pick the index that is currently in the narrow center trigger zone
            let best = activeIdx;
            if (visibleSet.size > 0) {
                // If multiple are visible (rare with narrow margin), pick the one the user scrolled to
                best = Math.max(...visibleSet);
            }
            if (best === activeIdx) return;
            activeIdx = best;

            tlItems.forEach((item, i) => {
                item.classList.toggle('active', i === activeIdx);
            });
            tlNodes.forEach((node, i) => {
                node.classList.toggle('active', i === activeIdx);
            });
        };

        const tlObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const idx = Number(entry.target.dataset.index);
                if (entry.isIntersecting) {
                    visibleSet.add(idx);
                } else {
                    visibleSet.delete(idx);
                }
            });

            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(applyActive);
            }
        }, {
            rootMargin: '-40% 0px -40% 0px',
            threshold: 0
        });

        tlItems.forEach((item, i) => {
            // Allow clicking to expand a specific step and center it
            item.addEventListener('click', () => {
                activeIdx = i;

                // Force UI update immediately before scroll
                tlItems.forEach((el, idx) => el.classList.toggle('active', idx === activeIdx));
                tlNodes.forEach((el, idx) => el.classList.toggle('active', idx === activeIdx));

                // Smooth scroll the clicked card to the center of the viewport
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });

            tlObserver.observe(item);
        });
    }

    // ── Bottom Dock: scroll-spy + click ──
    const dockBtns = document.querySelectorAll('.dock-btn');
    const dockSections = [
        '#home', '#how-it-works', '#situation', '#who-its-for', '#results', '#faq', '#contact'
    ];

    // Click: smooth scroll to target section
    dockBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.querySelector(btn.dataset.target);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Scroll-spy: highlight the dock button whose section is most visible
    const sectionEls = dockSections
        .map(sel => document.querySelector(sel))
        .filter(Boolean);

    // Map from section element → its dock button
    const sectionToBtnMap = new Map();
    sectionEls.forEach((el, i) => {
        if (dockBtns[i]) sectionToBtnMap.set(el, dockBtns[i]);
    });

    const setActiveBtn = (activeEl) => {
        dockBtns.forEach(b => b.classList.remove('active'));
        const activeBtn = sectionToBtnMap.get(activeEl);
        if (activeBtn) activeBtn.classList.add('active');
    };

    // Start with home active
    if (sectionEls[0]) setActiveBtn(sectionEls[0]);

    // Track intersection ratios to pick the most-visible section
    const ratioMap = new Map(sectionEls.map(el => [el, 0]));

    const dockObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            ratioMap.set(entry.target, entry.intersectionRatio);
        });
        // Find which section has the highest intersection ratio
        let bestEl = null;
        let bestRatio = -1;
        ratioMap.forEach((ratio, el) => {
            if (ratio > bestRatio) {
                bestRatio = ratio;
                bestEl = el;
            }
        });
        if (bestEl && bestRatio > 0) setActiveBtn(bestEl);
    }, {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    });

    sectionEls.forEach(el => dockObserver.observe(el));

    // ── Dock Liquid Glass — mouse reactive distortion + specular ──
    const dockEl = document.getElementById('dock-inner');
    const displacement = document.getElementById('dock-displacement');
    const specular = dockEl ? dockEl.querySelector('.dock-glass-specular') : null;

    if (dockEl && displacement && specular) {
        dockEl.addEventListener('mousemove', (e) => {
            const rect = dockEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Scale displacement based on cursor position (subtle warp)
            const scaleX = 4 + (x / rect.width) * 8;
            const scaleY = 4 + (y / rect.height) * 8;
            displacement.setAttribute('scale', Math.min(scaleX, scaleY).toFixed(1));

            // Radial specular highlight that follows the cursor
            specular.style.background = `radial-gradient(
                circle at ${x}px ${y}px,
                rgba(255, 255, 255, 0.22) 0%,
                rgba(255, 255, 255, 0.08) 35%,
                rgba(255, 255, 255, 0.00) 65%
            )`;
        });

        dockEl.addEventListener('mouseleave', () => {
            displacement.setAttribute('scale', '6');
            specular.style.background = 'none';
        });
    }

    // ── Recognition Section — click to expand ──
    document.querySelectorAll('.rec-item').forEach(item => {
        const open = () => {
            const isOpen = item.classList.contains('open');
            // Close all
            document.querySelectorAll('.rec-item').forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        };
        item.addEventListener('click', open);
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
    });

    // ── Deliverables Toggle — Founder / Technical ──
    const wygTabs = document.querySelectorAll('.wyg-tab');
    const wygViews = document.querySelectorAll('.wyg-view');
    wygTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            wygTabs.forEach(t => t.classList.remove('active'));
            wygViews.forEach(v => v.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById('view-' + tab.dataset.view);
            if (target) target.classList.add('active');
        });
    });

    // ── Testimonials — Wall of Love Slider ──
    const testimonials = [
        {
            quote: `"Founder had an idea for an internal workflow SaaS. Built MVP in 3 weeks. Killed 40% of planned features after seeing real usage. Shipped a tighter product. Got their first paying user in week 5."`,
            authorInitials: "AS",
            authorBg: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            authorName: "Amber Stone",
            authorRole: "Head of Enterprise ABM, UserTesting",
            stats: [
                { val: "18", sym: "%", lbl: "Title Accuracy" },
                { val: "4", sym: "x", lbl: "Email Accuracy" },
                { val: "50", sym: "%", lbl: "Bounce Rates" }
            ]
        },
        {
            quote: `"We spent 6 months trying to hire a full-stack engineer. Snowcapes built our entire customer portal in 14 days. It's clean, fast, and our clients love the new interface."`,
            authorInitials: "MR",
            authorBg: "linear-gradient(135deg, #10b981, #059669)",
            authorName: "Marcus Reed",
            authorRole: "CTO, OmniLogistics",
            stats: [
                { val: "14", sym: "d", lbl: "Time to Launch" },
                { val: "3", sym: "x", lbl: "Faster Iterations" },
                { val: "99", sym: "%", lbl: "Client Approval" }
            ]
        },
        {
            quote: `"I had the vision but zero technical skills. The team stripped away all the unnecessary fluff from my initial pitch and delivered a lean product that actually converts."`,
            authorInitials: "EJ",
            authorBg: "linear-gradient(135deg, #f43f5e, #e11d48)",
            authorName: "Evelyn Jones",
            authorRole: "Solo Founder, FitTrack AI",
            stats: [
                { val: "60", sym: "%", lbl: "Cost Saved" },
                { val: "12", sym: "k", lbl: "Users in Month 1" },
                { val: "5", sym: "/5", lbl: "App Rating" }
            ]
        }
    ];

    let currentTestimonial = 0;
    const testCard = document.querySelector('.test-card');
    const testQuote = document.querySelector('.test-quote');
    const testAvatar = document.querySelector('.test-avatar');
    const testName = document.querySelector('.test-name');
    const testRole = document.querySelector('.test-role');
    const testStatsElements = document.querySelectorAll('.test-stat');

    const updateTestimonial = (index) => {
        if (!testCard) return;

        // Fade out
        testCard.style.opacity = '0';
        testCard.style.transform = 'translateY(10px) scale(0.98)';

        setTimeout(() => {
            const data = testimonials[index];
            testQuote.innerHTML = data.quote;
            testAvatar.innerHTML = data.authorInitials;
            testAvatar.style.background = data.authorBg;
            testName.textContent = data.authorName;
            testRole.textContent = data.authorRole;

            data.stats.forEach((stat, i) => {
                if (testStatsElements[i]) {
                    const valEl = testStatsElements[i].querySelector('.ts-val');
                    const lblEl = testStatsElements[i].querySelector('.ts-lbl');
                    valEl.innerHTML = `${stat.val}<span>${stat.sym}</span>`;
                    lblEl.textContent = stat.lbl;
                }
            });

            // Fade in
            testCard.style.opacity = '1';
            testCard.style.transform = 'translateY(0) scale(1)';
        }, 300);
    };

    const nextTestimonial = () => {
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        updateTestimonial(currentTestimonial);
    };

    const prevTestimonial = () => {
        currentTestimonial = (currentTestimonial - 1 + testimonials.length) % testimonials.length;
        updateTestimonial(currentTestimonial);
    };

    const navLeft = document.querySelector('.test-nav-left');
    const navRight = document.querySelector('.test-nav-right');

    if (navLeft && navRight) {
        navLeft.addEventListener('click', prevTestimonial);
        navRight.addEventListener('click', nextTestimonial);
    }
    // ── Build Mode — Three.js 3D scene ─────────────────────────────────────
    initBuildMode();


    // ── Founder Mode — AI Diagnosis Chat ──────────────────────────────────
    (function founderMode() {
        const msgsEl = document.getElementById('fm-messages');
        const choicesEl = document.getElementById('fm-choices');
        const fillEl = document.getElementById('fm-progress-fill');
        const pctEl = document.getElementById('fm-progress-pct');
        const restartEl = document.getElementById('fm-restart');
        if (!msgsEl) return; // section not on page

        // Stored answers for personalization
        const answers = {};

        // ── Helpers ──────────────────────────────────
        function setProgress(pct) {
            fillEl.style.width = pct + '%';
            pctEl.textContent = pct === 100
                ? '✓ Ready for Version One'
                : pct + '%';
        }

        function scrollBottom() {
            msgsEl.scrollTop = msgsEl.scrollHeight;
        }

        function addMsg(role, html) {
            const wrap = document.createElement('div');
            wrap.className = 'fm-msg ' + role;
            const bub = document.createElement('div');
            bub.className = 'fm-msg-bubble';
            bub.innerHTML = html;
            wrap.appendChild(bub);
            msgsEl.appendChild(wrap);
            scrollBottom();
            return wrap;
        }

        function showTyping() {
            const t = document.createElement('div');
            t.className = 'fm-typing';
            t.id = 'fm-typing';
            t.innerHTML = `<div class="fm-typing-bubble">
                <span class="fm-dot-t"></span>
                <span class="fm-dot-t"></span>
                <span class="fm-dot-t"></span>
            </div>`;
            msgsEl.appendChild(t);
            scrollBottom();
        }

        function removeTyping() {
            const t = document.getElementById('fm-typing');
            if (t) t.remove();
        }

        // Show typing indicator, then resolve after delay
        function aiSay(html, delay = 900) {
            return new Promise(resolve => {
                showTyping();
                setTimeout(() => {
                    removeTyping();
                    addMsg('ai', html);
                    setTimeout(resolve, 120);
                }, delay);
            });
        }

        function clearChoices() {
            choicesEl.innerHTML = '';
            choicesEl.classList.remove('locked');
        }

        // Show pill buttons, return Promise<chosen label>
        function ask(options) {
            return new Promise(resolve => {
                clearChoices();
                options.forEach(label => {
                    const btn = document.createElement('button');
                    btn.className = 'fm-choice-btn';
                    btn.textContent = label;
                    btn.addEventListener('click', () => {
                        // Lock all, highlight chosen
                        choicesEl.classList.add('locked');
                        btn.classList.add('chosen');
                        // Show user bubble
                        addMsg('user', label);
                        scrollBottom();
                        setTimeout(() => resolve(label), 300);
                    });
                    choicesEl.appendChild(btn);
                });
            });
        }

        function showCTA() {
            clearChoices();
            const btn = document.createElement('a');
            btn.href = '#contact';
            btn.className = 'fm-cta-btn fm-choice-btn';
            btn.innerHTML = '→ Build Version One';
            btn.addEventListener('click', () => {
                const target = document.getElementById('contact');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
            const sub = document.createElement('div');
            sub.className = 'fm-cta-sub';
            sub.textContent = 'Takes 2–4 weeks. Clear scope. No surprises.';
            choicesEl.style.flexDirection = 'column';
            choicesEl.style.alignItems = 'flex-start';
            choicesEl.appendChild(btn);
            choicesEl.appendChild(sub);
        }

        // ── Conversation Flow ─────────────────────────
        async function runConversation() {
            msgsEl.innerHTML = '';
            clearChoices();
            choicesEl.style.flexDirection = '';
            choicesEl.style.alignItems = '';
            setProgress(0);
            Object.keys(answers).forEach(k => delete answers[k]);

            await new Promise(r => setTimeout(r, 400)); // small intro pause

            // Step 1 — Opening
            await aiSay("Let's run a quick check.<br>Are you building something right now?", 1000);
            const s1 = await ask(['Yes', 'Thinking about it', 'Just exploring']);
            answers.stage = s1;
            setProgress(20);

            // Step 2 — Branch
            if (s1 === 'Yes') {
                await aiSay("Have you shown it to real users yet?");
                const s2 = await ask(['Not yet', 'Only friends', 'A few early users']);
                answers.users = s2;
            } else if (s1 === 'Thinking about it') {
                await aiSay("Is it clear in your head?");
                const s2 = await ask(['Very clear', 'Somewhat', 'Still fuzzy']);
                answers.clarity = s2;
            } else {
                await aiSay("What's holding you back?");
                const s2 = await ask(['No time', 'No dev skills', 'Not sure yet']);
                answers.blocker = s2;
            }
            setProgress(40);

            // Step 3 — Recognition moment (split messages for pacing)
            await aiSay("Most founders at this stage don't need funding.", 800);
            await aiSay("They need feedback.", 600);
            await aiSay("And feedback requires something people can actually use.", 800);
            setProgress(55);

            // Step 4 — The Trap
            await aiSay('Be honest.<br>Is your "simple version" still simple?', 900);
            const s4 = await ask(['Not really', 'It keeps growing', 'I keep adding features']);
            answers.scope = s4;
            setProgress(70);

            await aiSay("That's normal.", 700);
            await aiSay("Without constraints, ideas expand. Always.", 600);

            // Step 5 — Diagnosis
            await aiSay("You don't have a thinking problem.", 900);
            await aiSay("You have a shipping problem.", 500);
            await aiSay("Version one forces clarity.<br>Users force direction.", 900);
            setProgress(85);

            // Step 6 — Personalized summary + CTA
            const scope = answers.stage === 'Yes' ? 'a focused 3–4 feature MVP' : 'a lean version one';
            const timeline = answers.users === 'A few early users' ? '2 weeks' : '3–4 weeks';
            await aiSay(
                `Based on where you are:<br>` +
                `You likely need <strong>${scope}</strong> built around your core loop.<br><br>` +
                `<span style="color:#888;font-size:0.88em">Estimated timeline: ${timeline} &nbsp;·&nbsp; Scope: Lean MVP</span>`,
                1100
            );
            await aiSay("Want help building the smallest version that proves your idea works?", 700);
            setProgress(100);
            showCTA();
        }

        // Start on page load
        runConversation();
        restartEl.addEventListener('click', runConversation);
    })();

});
