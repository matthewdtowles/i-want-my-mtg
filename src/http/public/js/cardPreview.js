(function () {
    let currentImgLink = null;
    let initialized = false;

    function handleMouseOver(event) {
        const cardNameLink = event.target.closest('.card-name-link');
        if (!cardNameLink) return;
        const parentCell = cardNameLink.parentElement;
        const imgLink = parentCell.querySelector('.card-img-link');
        const imgPreview = imgLink?.querySelector('.card-img-preview');
        if (!imgLink || !imgPreview) return;
        if (currentImgLink && currentImgLink !== imgLink) {
            currentImgLink.style.display = 'none';
        }
        currentImgLink = imgLink;
        imgLink.style.display = 'block';
        imgPreview.style.display = 'block';
        const rect = cardNameLink.getBoundingClientRect();
        const imgWidth = imgLink.offsetWidth;
        const imgHeight = imgLink.offsetHeight;
        if (rect.top >= imgHeight) {
            imgLink.style.top = `${rect.top - imgHeight}px`;
        } else {
            imgLink.style.top = `${rect.bottom}px`;
        }
        imgLink.style.left = `${rect.left + imgWidth / 4}px`;
    }

    function handleMouseOut(event) {
        const cardNameLink = event.target.closest('.card-name-link');
        if (!cardNameLink) return;
        const parentCell = cardNameLink.parentElement;
        const imgLink = parentCell.querySelector('.card-img-link');
        const imgPreview = imgLink?.querySelector('.card-img-preview');
        if (!imgLink || !imgPreview) return;
        imgLink.style.display = 'none';
        imgPreview.style.display = 'none';
    }

    function initCardHover() {
        if (initialized) {
            console.debug('Card hover already initialized');
            return;
        }
        document.body.addEventListener('mouseover', handleMouseOver);
        document.body.addEventListener('mouseout', handleMouseOut);
        initialized = true;
        console.debug('Card hover initialized');
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCardHover);
    } else {
        initCardHover();
    }
})();
