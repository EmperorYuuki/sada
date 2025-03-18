/**
 * Main Application Script for QuillSync AI
 * This file initializes all modules and handles application startup
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async function() {
  try {
    console.log('QuillSync AI initializing...');
    
    // Define a helper function to check if a service exists
    function serviceExists(serviceName) {
      return typeof window[serviceName] !== 'undefined';
    }
    
    // Show loading overlay during initialization
    if (serviceExists('UIUtils')) {
      window.UIUtils.toggleLoading(true, 'Initializing QuillSync AI...');
    } else {
      console.warn('UIUtils not found, skipping UI initialization');
    }
    
    // Step 1: Initialize the database
    console.log('Initializing database...');
    if (serviceExists('DBService')) {
      await window.DBService.initialize();
    } else {
      console.warn('DBService not found, skipping database initialization');
    }
    
    // Step 2: Initialize UI components
    console.log('Initializing UI...');
    if (serviceExists('UIUtils')) {
      window.UIUtils.initializeUI();
    } else {
      console.warn('UIUtils not found, skipping UI initialization');
    }
    
    // Step 3: Initialize services
    console.log('Initializing project service...');
    if (serviceExists('ProjectService')) {
      await window.ProjectService.initialize();
    } else {
      console.warn('ProjectService not found, skipping project service initialization');
    }
    
    console.log('Initializing glossary service...');
    if (serviceExists('GlossaryService')) {
      window.GlossaryService.initialize();
    } else {
      console.warn('GlossaryService not found, skipping glossary service initialization');
    }
    
    console.log('Initializing ChatGPT service...');
    if (serviceExists('ChatGPTService')) {
      await window.ChatGPTService.initialize();
    } else {
      console.warn('ChatGPTService not found, skipping ChatGPT service initialization');
    }
    
    console.log('Initializing OpenRouter service...');
    if (serviceExists('OpenRouterService')) {
      await window.OpenRouterService.initialize();
    } else {
      console.warn('OpenRouterService not found, skipping OpenRouter service initialization');
    }
    
    console.log('Initializing chapter fetcher service...');
    if (serviceExists('ChapterFetcherService')) {
      await window.ChapterFetcherService.initialize();
    } else {
      console.warn('ChapterFetcherService not found, skipping chapter fetcher service initialization');
    }
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Hide loading overlay
    if (serviceExists('UIUtils')) {
      window.UIUtils.toggleLoading(false);
    }
    
    // Update status
    if (serviceExists('UIUtils')) {
      window.UIUtils.updateLastAction('Application initialized');
    }
    
    console.log('QuillSync AI initialized successfully');
  } catch (error) {
    console.error('Error initializing QuillSync AI:', error);
    
    // Show error notification
    if (serviceExists('UIUtils')) {
      window.UIUtils.toggleLoading(false);
      window.UIUtils.showNotification(
        'Error initializing application. Some features may not work properly. ' +
        'Please refresh the page or check the console for details.',
        'error',
        10000
      );
    }
  }
});

/**
 * Set up keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Only process if not in an input, textarea or contenteditable
    var target = e.target;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }
    
    // Ctrl+T: Translate
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      var translateBtn = document.getElementById('translate-btn');
      if (translateBtn) translateBtn.click();
    }
    
    // Ctrl+F: Fetch Chapter
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      var fetchChapterBtn = document.getElementById('fetch-chapter-btn');
      if (fetchChapterBtn) fetchChapterBtn.click();
    }
    
    // Ctrl+S: Export
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      var exportBtn = document.getElementById('export-btn');
      if (exportBtn) exportBtn.click();
    }
    
    // Ctrl+1-4: Switch tabs
    if (e.ctrlKey && e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      var tabIndex = parseInt(e.key) - 1;
      var tabs = document.querySelectorAll('.tab-btn');
      if (tabs[tabIndex]) {
        tabs[tabIndex].click();
      }
    }
    
    // Escape: Close any open modal
    if (e.key === 'Escape') {
      var openModal = document.querySelector('.modal[style*="display: flex"]');
      if (openModal) {
        openModal.style.display = 'none';
      }
    }
  });
}

/**
 * Lazy load Quill if not already loaded
 */
function initializeQuill() {
  if (window.Quill && !window.quill) {
    window.quill = new Quill('#translation-output', {
      theme: 'snow',
      modules: {
        toolbar: false,
        history: {
          delay: 1000,
          maxStack: 100,
          userOnly: true
        }
      },
      placeholder: 'Translation will appear here...'
    });
    
    // Dispatch event to notify that Quill is loaded
    var event = new CustomEvent('quill-loaded');
    document.dispatchEvent(event);
    
    // Update word counts
    if (typeof window.UIUtils !== 'undefined') {
      window.UIUtils.updateWordCounts();
    }
  }
}

// Set up Quill initializer when the library loads
if (window.Quill) {
  initializeQuill();
} else {
  window.addEventListener('load', function() {
    if (window.Quill) {
      initializeQuill();
    }
  });
}