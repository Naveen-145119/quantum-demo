// Main Application Entry Point

// Global Variables
window.client = null;
window.account = null;
window.databases = null;
window.storage = null;
window.currentUser = null;
window.selectedFile = null;
window.isFolderUpload = false;

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    initAppwrite();
});
