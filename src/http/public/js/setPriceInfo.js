/**
 * Set Price Info Module
 * Handles price popover dialog and tooltip functionality for set price information
 */
(function () {
    'use strict';

    const CONFIG = {
        selectors: {
            // Popover selectors
            popover: {
                toggle: '#price-info-toggle',
                popover: '#price-info-popover',
                close: '#close-popover',
                content: '#popover-content',
            },
            // Tooltip selectors
            tooltip: {
                trigger: '.price-info-tooltip-trigger',
                tooltip: '.price-info-tooltip',
                description: '.tooltip-description',
            },
        },
        classes: {
            hidden: 'hidden',
        },
        events: {
            click: 'click',
            keydown: 'keydown',
            mouseenter: 'mouseenter',
            mouseleave: 'mouseleave',
        },
        keys: {
            escape: 'Escape',
            tab: 'Tab',
        },
        tooltipTypes: {
            'base-normal': (baseSize) =>
                `Main set cards: the first ${baseSize} cards in the set. Non-foil only.`,
            'base-foil': (baseSize) =>
                `Main set cards: the first ${baseSize} cards in the set and their foil versions.`,
            'total-normal': (baseSize, totalSize) =>
                `All ${totalSize} cards in main and bonus section of set. Non-foil only.`,
            'total-foil': (baseSize, totalSize) =>
                `All ${totalSize} cards in main and bonus section of the set and their foil versions.`,
        },
    };

    /**
     * Manages the price info popover dialog
     */
    class PopoverManager {
        constructor() {
            this.toggleBtn = document.querySelector(CONFIG.selectors.popover.toggle);
            this.popover = document.querySelector(CONFIG.selectors.popover.popover);
            this.closeBtn = document.querySelector(CONFIG.selectors.popover.close);
            this.content = document.querySelector(CONFIG.selectors.popover.content);

            if (this.toggleBtn && this.popover) {
                this.init();
            }
        }

        init() {
            this.attachEventListeners();
        }

        attachEventListeners() {
            // Open popover
            this.toggleBtn.addEventListener(CONFIG.events.click, (e) => this.open(e));

            // Close popover
            this.closeBtn?.addEventListener(CONFIG.events.click, (e) => this.close(e));

            // Close when clicking outside
            document.addEventListener(CONFIG.events.click, (e) => {
                if (
                    !this.popover.classList.contains(CONFIG.classes.hidden) &&
                    !this.content.contains(e.target) &&
                    !this.toggleBtn.contains(e.target)
                ) {
                    this.close();
                }
            });

            // Prevent clicks inside popover from closing it
            this.content?.addEventListener(CONFIG.events.click, (e) => {
                e.stopPropagation();
            });

            // Close on Escape key
            document.addEventListener(CONFIG.events.keydown, (e) => {
                if (
                    e.key === CONFIG.keys.escape &&
                    !this.popover.classList.contains(CONFIG.classes.hidden)
                ) {
                    this.close();
                }
            });

            // Trap focus inside popover when open
            this.popover.addEventListener(CONFIG.events.keydown, (e) => {
                if (
                    e.key === CONFIG.keys.tab &&
                    !this.popover.classList.contains(CONFIG.classes.hidden)
                ) {
                    this.trapFocus(e);
                }
            });
        }

        open(e) {
            e?.preventDefault();
            e?.stopPropagation();
            this.popover.classList.remove(CONFIG.classes.hidden);
            this.popover.setAttribute('aria-modal', 'true');
            // Move focus to close button for accessibility
            this.closeBtn?.focus();
        }

        close(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.popover.classList.add(CONFIG.classes.hidden);
            this.popover.setAttribute('aria-modal', 'false');
            // Return focus to toggle button for accessibility
            this.toggleBtn.focus();
        }

        trapFocus(e) {
            const focusableElements = this.popover.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    }

    /**
     * Populates dynamic tooltip descriptions based on data attributes
     */
    function initializeTooltipDescriptions() {
        document.querySelectorAll(CONFIG.selectors.tooltip.trigger).forEach((trigger) => {
            const tooltip = trigger.nextElementSibling;
            if (!tooltip?.classList.contains('price-info-tooltip')) return;

            const type = trigger.dataset.tooltipType;
            const baseSize = parseInt(trigger.dataset.baseSize);
            const totalSize = parseInt(trigger.dataset.totalSize);

            const descriptionElement = tooltip.querySelector(CONFIG.selectors.tooltip.description);
            if (descriptionElement && CONFIG.tooltipTypes[type]) {
                descriptionElement.textContent = CONFIG.tooltipTypes[type](baseSize, totalSize);
            }
        });
    }

    // Initialize popover, tooltip descriptions, and shared tooltip manager
    function initialize() {
        new PopoverManager();
        initializeTooltipDescriptions();
        new TooltipManager({
            triggerSelector: CONFIG.selectors.tooltip.trigger,
            tooltipSelector: CONFIG.selectors.tooltip.tooltip,
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
