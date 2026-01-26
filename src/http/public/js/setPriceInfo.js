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
     * Manages price info tooltips
     */
    class TooltipManager {
        constructor() {
            this.activeTooltips = new Set();
            this.init();
        }

        init() {
            this.initializeTooltipDescriptions();
            this.attachEventListeners();
            this.setupGlobalClickHandler();
        }

        initializeTooltipDescriptions() {
            document.querySelectorAll(CONFIG.selectors.tooltip.trigger).forEach((trigger) => {
                const tooltip = trigger.nextElementSibling;
                if (!tooltip?.classList.contains('price-info-tooltip')) return;

                const type = trigger.dataset.tooltipType;
                const baseSize = parseInt(trigger.dataset.baseSize);
                const totalSize = parseInt(trigger.dataset.totalSize);

                const descriptionElement = tooltip.querySelector(
                    CONFIG.selectors.tooltip.description
                );
                if (descriptionElement && CONFIG.tooltipTypes[type]) {
                    descriptionElement.textContent = CONFIG.tooltipTypes[type](baseSize, totalSize);
                }
            });
        }

        attachEventListeners() {
            document.querySelectorAll(CONFIG.selectors.tooltip.trigger).forEach((trigger) => {
                const tooltip = trigger.nextElementSibling;
                if (!tooltip?.classList.contains('price-info-tooltip')) return;

                // Mouse events for hover behavior
                trigger.addEventListener(CONFIG.events.mouseenter, () => this.showTooltip(tooltip));
                trigger.addEventListener(CONFIG.events.mouseleave, () =>
                    this.scheduleHide(tooltip)
                );

                // Click event for toggle behavior
                trigger.addEventListener(CONFIG.events.click, (e) => {
                    e.stopPropagation();
                    this.toggleTooltip(tooltip);
                });

                // Keep tooltip visible when hovering over it
                tooltip.addEventListener(CONFIG.events.mouseenter, () => {
                    this.cancelHide(tooltip);
                    this.showTooltip(tooltip);
                });
                tooltip.addEventListener(CONFIG.events.mouseleave, () =>
                    this.scheduleHide(tooltip)
                );

                // Prevent tooltip clicks from bubbling
                tooltip.addEventListener(CONFIG.events.click, (e) => e.stopPropagation());
            });
        }

        setupGlobalClickHandler() {
            document.addEventListener(CONFIG.events.click, (e) => {
                const isTooltipClick = e.target.closest(CONFIG.selectors.tooltip.tooltip);
                const isTriggerClick = e.target.closest(CONFIG.selectors.tooltip.trigger);

                if (!isTooltipClick && !isTriggerClick) {
                    this.hideAllTooltips();
                }
            });
        }

        showTooltip(tooltip) {
            this.cancelHide(tooltip);
            tooltip.classList.remove(CONFIG.classes.hidden);
            this.activeTooltips.add(tooltip);
        }

        hideTooltip(tooltip) {
            tooltip.classList.add(CONFIG.classes.hidden);
            this.activeTooltips.delete(tooltip);
            delete tooltip.dataset.hideTimeout;
        }

        toggleTooltip(tooltip) {
            if (tooltip.classList.contains(CONFIG.classes.hidden)) {
                this.showTooltip(tooltip);
            } else {
                this.hideTooltip(tooltip);
            }
        }

        scheduleHide(tooltip) {
            // Small delay to allow moving mouse from trigger to tooltip
            tooltip.dataset.hideTimeout = setTimeout(() => {
                this.hideTooltip(tooltip);
            }, 100);
        }

        cancelHide(tooltip) {
            if (tooltip.dataset.hideTimeout) {
                clearTimeout(tooltip.dataset.hideTimeout);
                delete tooltip.dataset.hideTimeout;
            }
        }

        hideAllTooltips() {
            this.activeTooltips.forEach((tooltip) => this.hideTooltip(tooltip));
        }
    }

    // Initialize both managers when DOM is ready
    function initialize() {
        new PopoverManager();
        new TooltipManager();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
