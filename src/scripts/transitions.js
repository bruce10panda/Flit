function navigate(url) {
    document.body.style.transition = 'opacity 0.1s ease';
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = url; }, 100);
}
