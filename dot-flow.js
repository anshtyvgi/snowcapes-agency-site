/**
 * DotFlow — Vanilla JS port of the PaceUI DotFlow component
 * A 7×7 animated dot grid button that cycles through states
 */
import gsap from 'gsap';

// ── Frame sets (same as the React demo) ───────────────────────────────────────

const importing = [
    [0, 2, 4, 6, 20, 34, 48, 46, 44, 42, 28, 14, 8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
    [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47],
    [8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
    [9, 11, 15, 17, 19, 23, 25, 29, 31, 33, 37, 39],
    [16, 30, 24, 18, 32], [17, 23, 31, 25], [24], [17, 23, 31, 25],
    [16, 30, 24, 18, 32], [9, 11, 15, 17, 19, 23, 25, 29, 31, 33, 37, 39],
    [8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
    [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47],
    [0, 2, 4, 6, 20, 34, 48, 46, 44, 42, 28, 14, 8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
];

const syncing = [
    [45, 38, 31, 24, 17, 23, 25], [38, 31, 24, 17, 10, 16, 18], [31, 24, 17, 10, 3, 9, 11],
    [24, 17, 10, 3, 2, 4], [17, 10, 3], [10, 3], [3], [],
    [45], [45, 38, 44, 46], [45, 38, 31, 37, 39], [45, 38, 31, 24, 30, 32],
];

const heartbit = [
    [], [3], [10, 2, 4, 3], [17, 9, 1, 11, 5, 10, 4, 3, 2],
    [24, 16, 8, 1, 3, 5, 18, 12, 17, 11, 4, 10, 9, 2],
    [31, 23, 15, 8, 10, 2, 4, 12, 25, 19, 24, 18, 11, 17, 16, 9],
    [38, 30, 22, 15, 17, 9, 11, 19, 32, 26, 31, 25, 18, 24, 23, 16],
    [38, 30, 22, 15, 17, 9, 11, 19, 32, 26, 31, 25, 18, 24, 23, 16],
    [38, 30, 22, 17, 9, 11, 19, 32, 26, 31, 25, 18, 24, 23, 16, 45, 37, 29, 21, 14, 8, 15, 12, 20, 27, 33, 39],
    [38, 30, 22, 15, 17, 9, 11, 19, 32, 26, 31, 25, 18, 24, 23, 16],
    [39, 33, 37, 29, 17, 38, 30, 22, 15, 16, 23, 24, 31, 32, 25, 18, 26, 19],
    [17, 30, 16, 23, 24, 31, 32, 25, 18], [24],
];

const searching = [
    [9, 16, 17, 15, 23], [10, 17, 18, 16, 24], [11, 18, 19, 17, 25], [18, 25, 26, 24, 32],
    [25, 32, 33, 31, 39], [32, 39, 40, 38, 46], [31, 38, 39, 37, 45],
    [30, 37, 38, 36, 44], [23, 30, 31, 29, 37], [31, 29, 37, 22, 24, 23, 38, 36], [16, 23, 24, 22, 30],
];

// ── Snowcapes-specific items ──────────────────────────────────────────────────
const SNOWCAPES_ITEMS = [
    { title: 'Ship Version One', frames: importing, duration: 180 },
    { title: 'Validate Fast', frames: syncing, duration: 100, repeatCount: 2 },
    { title: 'Build What Works', frames: searching, duration: 140, repeatCount: 2 },
    { title: 'Get Real Data', frames: heartbit, duration: 120, repeatCount: 2 },
];

// ── Render HTML ───────────────────────────────────────────────────────────────
function buildHTML(id) {
    const dots = Array.from({ length: 49 }, (_, i) =>
        `<span class="df-dot" data-dot="${i}"></span>`
    ).join('');
    return `
        <span class="df-grid">${dots}</span>
        <span class="df-text-wrap" id="${id}-text-wrap">
            <span class="df-text" id="${id}-text">${SNOWCAPES_ITEMS[0].title}</span>
        </span>
    `;
}

// ── DotFlow controller ────────────────────────────────────────────────────────
function createDotFlow(el) {
    const items = SNOWCAPES_ITEMS;
    let itemIndex = 0;
    let textIndex = 0;
    let frameIndex = 0;
    let repeats = 0;
    let intervalId = null;

    const grid = el.querySelector('.df-grid');
    const dots = Array.from(grid.querySelectorAll('.df-dot'));
    const textWrap = el.querySelector('.df-text-wrap');
    const textEl = el.querySelector('.df-text');

    function applyFrame(fIdx) {
        const frame = items[itemIndex].frames[fIdx] || [];
        dots.forEach((dot, i) => dot.classList.toggle('df-active', frame.includes(i)));
    }

    function startFrame() {
        if (intervalId) clearInterval(intervalId);
        const item = items[itemIndex];
        frameIndex = 0;
        repeats = 0;

        intervalId = setInterval(() => {
            applyFrame(frameIndex);
            frameIndex++;
            if (frameIndex >= item.frames.length) {
                frameIndex = 0;
                repeats++;
                const maxRepeats = item.repeatCount ?? 1;
                if (maxRepeats !== -1 && repeats >= maxRepeats) {
                    clearInterval(intervalId);
                    advanceItem();
                }
            }
        }, item.duration ?? 150);
    }

    function advanceItem() {
        // Animate text out
        gsap.to(textWrap, {
            y: 18, opacity: 0, filter: 'blur(6px)',
            duration: 0.45, ease: 'power2.in',
            onComplete: () => {
                textIndex = (textIndex + 1) % items.length;
                textEl.textContent = items[textIndex].title;
                // Animate width
                gsap.to(textWrap, { width: textEl.scrollWidth + 2, duration: 0.3, ease: 'power2.out' });
                // Animate text in
                gsap.fromTo(textWrap,
                    { y: -18, opacity: 0, filter: 'blur(4px)' },
                    { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.55, ease: 'power2.out' }
                );
            },
        });
        itemIndex = (itemIndex + 1) % items.length;
        setTimeout(startFrame, 500);
    }

    // Init width
    requestAnimationFrame(() => {
        textWrap.style.width = textEl.scrollWidth + 2 + 'px';
    });

    startFrame();
}

// ── Public init ───────────────────────────────────────────────────────────────
export function initDotFlowButtons() {
    document.querySelectorAll('.dot-flow-btn').forEach(el => {
        el.innerHTML = buildHTML(el.id || ('df-' + Math.random().toString(36).slice(2)));
        createDotFlow(el);
    });
}
