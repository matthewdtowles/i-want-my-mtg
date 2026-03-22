/**
 * Shared Tooltip Manager
 * Reusable tooltip utility supporting click toggle, hover show/hide with
 * delayed hide for mouse travel, global dismiss, and active tooltip tracking.
 *
 * @param {Object} config
 * @param {string} config.triggerSelector - CSS selector for tooltip trigger elements
 * @param {string} config.tooltipSelector - CSS selector for tooltip elements
 */
function TooltipManager(config) {
    this.triggerSelector = config.triggerSelector;
    this.tooltipSelector = config.tooltipSelector;
    this.activeTooltips = new Set();
    this.attachEventListeners();
    this.setupGlobalClickHandler();
}

TooltipManager.prototype.findTooltip = function (trigger) {
    // Try parent container first (e.g. import-export wraps both in a <span>)
    var tooltip = trigger.parentElement.querySelector(this.tooltipSelector);
    if (tooltip && tooltip !== trigger) return tooltip;
    // Fall back to next sibling (e.g. price-info tooltip is a sibling)
    if (trigger.nextElementSibling && trigger.nextElementSibling.matches(this.tooltipSelector)) {
        return trigger.nextElementSibling;
    }
    return null;
};

TooltipManager.prototype.attachEventListeners = function () {
    var self = this;
    document.querySelectorAll(this.triggerSelector).forEach(function (trigger) {
        var tooltip = self.findTooltip(trigger);
        if (!tooltip) return;

        trigger.addEventListener('mouseenter', function () {
            self.showTooltip(tooltip);
        });
        trigger.addEventListener('mouseleave', function () {
            self.scheduleHide(tooltip);
        });

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            self.toggleTooltip(tooltip);
        });

        tooltip.addEventListener('mouseenter', function () {
            self.cancelHide(tooltip);
            self.showTooltip(tooltip);
        });
        tooltip.addEventListener('mouseleave', function () {
            self.scheduleHide(tooltip);
        });

        tooltip.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    });
};

TooltipManager.prototype.setupGlobalClickHandler = function () {
    var self = this;
    document.addEventListener('click', function (e) {
        var isTooltipClick = e.target.closest(self.tooltipSelector);
        var isTriggerClick = e.target.closest(self.triggerSelector);
        if (!isTooltipClick && !isTriggerClick) {
            self.hideAllTooltips();
        }
    });
};

TooltipManager.prototype.showTooltip = function (tooltip) {
    this.cancelHide(tooltip);
    tooltip.classList.remove('hidden');
    this.activeTooltips.add(tooltip);
};

TooltipManager.prototype.hideTooltip = function (tooltip) {
    tooltip.classList.add('hidden');
    this.activeTooltips.delete(tooltip);
    delete tooltip.dataset.hideTimeout;
};

TooltipManager.prototype.toggleTooltip = function (tooltip) {
    if (tooltip.classList.contains('hidden')) {
        this.showTooltip(tooltip);
    } else {
        this.hideTooltip(tooltip);
    }
};

TooltipManager.prototype.scheduleHide = function (tooltip) {
    this.cancelHide(tooltip);
    var self = this;
    tooltip.dataset.hideTimeout = setTimeout(function () {
        self.hideTooltip(tooltip);
    }, 100);
};

TooltipManager.prototype.cancelHide = function (tooltip) {
    if (tooltip.dataset.hideTimeout) {
        clearTimeout(tooltip.dataset.hideTimeout);
        delete tooltip.dataset.hideTimeout;
    }
};

TooltipManager.prototype.hideAllTooltips = function () {
    var self = this;
    this.activeTooltips.forEach(function (tooltip) {
        self.hideTooltip(tooltip);
    });
};
