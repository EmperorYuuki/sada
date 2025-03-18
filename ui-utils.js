/**
 * UI Utilities for QuillSync AI
 * This module provides functions for UI interactions and animations
 */

// IMPORTANT: Define UIUtils directly on window object
window.UIUtils = {
  /**
   * Show a notification message
   * @param {string} message - The message to display
   * @param {string} type - Notification type ('success', 'warning', 'error', 'info')
   * @param {number} duration - How long to show the notification in milliseconds
   */
  showNotification: function(message, type, duration) {
    if (type === undefined) type = 'info';
    if (duration === undefined) duration = 3000;
    
    var notification = document.getElementById('notification');
    if (!notification) {
      console.warn('Notification element not found');
      return;
    }
    
    var messageElement = document.getElementById('notification-message');
    if (!messageElement) {
      console.warn('Notification message element not found');
      return;
    }
    
    var icon = notification.querySelector('.notification-icon');
    if (!icon) {
      console.warn('Notification icon element not found');
      return;
    }
    
    // Set message content
    messageElement.textContent = message;
    
    // Clear previous classes and add the new type
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('show');
    
    // Set the appropriate icon
    icon.className = 'notification-icon';
    switch (type) {
      case 'success':
        icon.className += ' fas fa-check-circle';
        break;
      case 'warning':
        icon.className += ' fas fa-exclamation-triangle';
        break;
      case 'error':
        icon.className += ' fas fa-times-circle';
        break;
      default:
        icon.className += ' fas fa-info-circle';
    }
    
    // Hide the notification after the specified duration
    setTimeout(function() {
      notification.classList.remove('show');
    }, duration);
  },
  
  /**
   * Show/hide the loading overlay
   * @param {boolean} show - Whether to show or hide the overlay
   * @param {string} message - Optional message to display
   */
  toggleLoading: function(show, message) {
    if (message === undefined) message = 'Processing...';
    
    var overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      console.warn('Loading overlay element not found');
      return;
    }
    
    var messageElement = document.getElementById('loading-message');
    if (!messageElement) {
      console.warn('Loading message element not found');
      return;
    }
    
    if (show) {
      messageElement.textContent = message;
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  },
  
  /**
   * Update the progress bar
   * @param {number} percent - Progress percentage (0-100)
   * @param {string} status - Status message
   */
  updateProgress: function(percent, status) {
    var progressBar = document.getElementById('progress');
    if (!progressBar) {
      console.warn('Progress bar element not found');
      return;
    }
    
    var progressStatus = document.getElementById('progress-status');
    if (!progressStatus) {
      console.warn('Progress status element not found');
      return;
    }
    
    progressBar.style.width = percent + '%';
    
    if (status) {
      progressStatus.textContent = status;
    } else {
      progressStatus.textContent = Math.round(percent) + '%';
    }
  },
  
  /**
   * Show/hide the progress bar
   * @param {boolean} show - Whether to show or hide the progress bar
   */
  toggleProgressBar: function(show) {
    var container = document.querySelector('.progress-container');
    if (!container) {
      console.warn('Progress container element not found');
      return;
    }
    
    if (show) {
      container.style.visibility = 'visible';
      container.style.opacity = '1';
    } else {
      container.style.opacity = '0';
      setTimeout(function() {
        container.style.visibility = 'hidden';
      }, 300);
    }
  },
  
  /**
   * Activate a tab
   * @param {string} tabId - ID of the tab to activate
   */
  activateTab: function(tabId) {
    // Deactivate all tabs
    var tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons) {
      tabButtons.forEach(function(tab) {
        tab.classList.remove('active');
      });
    }
    
    var tabContents = document.querySelectorAll('.tab-content');
    if (tabContents) {
      tabContents.forEach(function(content) {
        content.classList.remove('active');
      });
    }
    
    // Activate the selected tab
    var tabButton = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
    if (tabButton) tabButton.classList.add('active');
    
    var tabContent = document.getElementById(tabId + '-tab');
    if (tabContent) tabContent.classList.add('active');
    
    // Save the active tab in local storage
    localStorage.setItem('activeTab', tabId);
  },
  
  /**
   * Activate a secondary tab
   * @param {string} tabId - ID of the secondary tab to activate
   */
  activateSecondaryTab: function(tabId) {
    var tabElement = document.querySelector('.secondary-tab-btn[data-tab="' + tabId + '"]');
    if (!tabElement) return;
    
    // Get the parent tab content
    var parentTab = tabElement.closest('.tab-content');
    if (!parentTab) return;
    
    // Deactivate all secondary tabs within this parent
    var secondaryButtons = parentTab.querySelectorAll('.secondary-tab-btn');
    if (secondaryButtons) {
      secondaryButtons.forEach(function(tab) {
        tab.classList.remove('active');
      });
    }
    
    var secondaryContents = parentTab.querySelectorAll('.secondary-tab-content');
    if (secondaryContents) {
      secondaryContents.forEach(function(content) {
        content.classList.remove('active');
      });
    }
    
    // Activate the selected secondary tab
    tabElement.classList.add('active');
    
    var secondaryContent = document.getElementById(tabId + '-tab');
    if (secondaryContent) secondaryContent.classList.add('active');
    
    // Save the active secondary tab in local storage
    localStorage.setItem('activeSecondaryTab-' + parentTab.id, tabId);
  },
  
  /**
   * Initialize the tab system
   */
  initializeTabs: function() {
    var self = this;
    
    // Set up click handlers for main tabs
    var tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons) {
      tabButtons.forEach(function(tabButton) {
        tabButton.addEventListener('click', function() {
          var tabId = tabButton.dataset.tab;
          self.activateTab(tabId);
        });
      });
    }
    
    // Set up click handlers for secondary tabs
    var secondaryButtons = document.querySelectorAll('.secondary-tab-btn');
    if (secondaryButtons) {
      secondaryButtons.forEach(function(tabButton) {
        tabButton.addEventListener('click', function() {
          var tabId = tabButton.dataset.tab;
          self.activateSecondaryTab(tabId);
        });
      });
    }
    
    // Restore active tabs from localStorage
    var activeMainTab = localStorage.getItem('activeTab');
    if (activeMainTab) {
      self.activateTab(activeMainTab);
    }
    
    // Restore active secondary tabs
    var tabContents = document.querySelectorAll('.tab-content');
    if (tabContents) {
      tabContents.forEach(function(tabContent) {
        var activeSecondaryTab = localStorage.getItem('activeSecondaryTab-' + tabContent.id);
        if (activeSecondaryTab) {
          self.activateSecondaryTab(activeSecondaryTab);
        }
      });
    }
  },
  
  /**
   * Initialize modal functionality
   */
  initializeModals: function() {
    // Close modal when clicking the X or the Cancel button
    var closeButtons = document.querySelectorAll('.modal-close-btn, [id$="-modal-btn"]');
    if (closeButtons) {
      closeButtons.forEach(function(button) {
        button.addEventListener('click', function() {
          var modal = button.closest('.modal');
          if (modal) {
            modal.style.display = 'none';
          }
        });
      });
    }
    
    // Close modal when clicking outside the content
    var modals = document.querySelectorAll('.modal');
    if (modals) {
      modals.forEach(function(modal) {
        modal.addEventListener('click', function(event) {
          if (event.target === modal) {
            modal.style.display = 'none';
          }
        });
      });
    }
    
    // Close notification when clicking X
    var notificationClose = document.querySelector('.notification-close');
    if (notificationClose) {
      notificationClose.addEventListener('click', function() {
        var notification = document.getElementById('notification');
        if (notification) notification.classList.remove('show');
      });
    }
  },
  
  /**
   * Copy text to clipboard
   * @param {string} text - The text to copy
   * @returns {Promise<boolean>} Whether the copy was successful
   */
  copyToClipboard: function(text) {
    return new Promise(function(resolve, reject) {
      try {
        navigator.clipboard.writeText(text).then(function() {
          resolve(true);
        }).catch(function(err) {
          console.error('Failed to copy text: ', err);
          reject(err);
        });
      } catch (err) {
        console.error('Failed to copy text: ', err);
        reject(err);
      }
    });
  },
  
  /**
   * Set the theme (light/dark)
   * @param {string} theme - The theme to set ('light' or 'dark')
   */
  setTheme: function(theme) {
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(theme + '-mode');
    
    // Update the theme toggle button icon
    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark' 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
    }
    
    // Save the setting
    localStorage.setItem('theme', theme);
    
    // Update any theme-dependent elements
    var themeRadios = document.querySelectorAll('[name="theme"]');
    if (themeRadios) {
      themeRadios.forEach(function(radio) {
        radio.checked = radio.value === theme;
      });
    }
  },
  
  /**
   * Set the accent color
   * @param {string} color - The color to set (hex format)
   */
  setAccentColor: function(color) {
    // Convert hex to RGB for CSS variables
    var r = parseInt(color.slice(1, 3), 16);
    var g = parseInt(color.slice(3, 5), 16);
    var b = parseInt(color.slice(5, 7), 16);
    
    // Set CSS variables
    document.documentElement.style.setProperty('--accent-color', color);
    document.documentElement.style.setProperty('--accent-r', r);
    document.documentElement.style.setProperty('--accent-g', g);
    document.documentElement.style.setProperty('--accent-b', b);
    
    // Calculate a darker shade for hover states
    var darkenFactor = 0.8;
    var darkerR = Math.floor(r * darkenFactor);
    var darkerG = Math.floor(g * darkenFactor);
    var darkerB = Math.floor(b * darkenFactor);
    var darkerHex = '#' + 
      darkerR.toString(16).padStart(2, '0') + 
      darkerG.toString(16).padStart(2, '0') + 
      darkerB.toString(16).padStart(2, '0');
    
    document.documentElement.style.setProperty('--accent-hover', darkerHex);
    
    // Update color inputs
    var colorInputs = document.querySelectorAll('[type="color"]');
    if (colorInputs) {
      colorInputs.forEach(function(input) {
        if (input.id === 'theme-color' || input.id === 'accent-color') {
          input.value = color;
        }
      });
    }
    
    // Save the setting
    localStorage.setItem('accentColor', color);
  },
  
  /**
   * Update the last action display
   * @param {string} action - The action to display
   */
  updateLastAction: function(action) {
    var lastAction = document.getElementById('last-action');
    if (lastAction) lastAction.textContent = action;
    
    // Also update the last saved timestamp if appropriate
    if (action.includes('saved') || action.includes('updated')) {
      var lastSaved = document.getElementById('last-saved');
      if (lastSaved) lastSaved.textContent = 'Last saved: ' + new Date().toLocaleTimeString();
    }
  },
  
  /**
   * Update word count displays
   */
  updateWordCounts: function() {
    var self = this;
    
    if (!window.TextUtils) {
      console.error('TextUtils not available for word counting');
      return;
    }
    
    var inputText = document.getElementById('input-text');
    var inputWordCount = document.getElementById('input-word-count');
    var chapterText = document.getElementById('chapter-text');
    var chapterWordCount = document.getElementById('chapter-word-count');
    var outputWordCount = document.getElementById('output-word-count');
    var wordCountStat = document.getElementById('word-count');
    var readingTime = document.getElementById('reading-time');
    
    // Update input word count
    if (inputText && inputWordCount) {
      var count = window.TextUtils.countWords(inputText.value);
      inputWordCount.textContent = count + ' words';
    }
    
    // Update chapter word count
    if (chapterText && chapterWordCount) {
      var count = window.TextUtils.countWords(chapterText.value);
      chapterWordCount.textContent = count + ' words';
    }
    
    // Update output word count if Quill is initialized
    if (window.quill && outputWordCount) {
      var count = window.TextUtils.countWords(window.quill.getText());
      outputWordCount.textContent = count + ' words';
      
      // Update global word count and reading time
      if (wordCountStat) {
        wordCountStat.textContent = count + ' words';
      }
      
      if (readingTime) {
        var minutes = window.TextUtils.estimateReadingTime(window.quill.getText());
        readingTime.textContent = minutes + ' min read';
      }
    }
  },
  
  /**
   * Initialize Quill rich text editor
   */
  initializeQuill: function() {
    var self = this;
    
    if (!window.Quill) {
      console.error('Quill library not loaded');
      return null;
    }
    
    if (!window.quill) {
      var quillContainer = document.getElementById('translation-output');
      if (!quillContainer) {
        console.error('Quill container not found');
        return null;
      }
      
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
      
      // Add change listener to update word count
      window.quill.on('text-change', function() {
        self.updateWordCounts();
      });
      
      // Set up undo/redo buttons
      var undoBtn = document.getElementById('undo-btn');
      if (undoBtn) {
        undoBtn.addEventListener('click', function() {
          window.quill.history.undo();
        });
      }
      
      var redoBtn = document.getElementById('redo-btn');
      if (redoBtn) {
        redoBtn.addEventListener('click', function() {
          window.quill.history.redo();
        });
      }
    }
    
    return window.quill;
  },
  
  /**
   * Toggle sidebar visibility
   */
  toggleSidebar: function() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
      
      // Save state
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    }
  },
  
  /**
   * Toggle status bar visibility
   */
  toggleStatusBar: function() {
    var statusBar = document.querySelector('.status-bar');
    if (statusBar) {
      statusBar.classList.toggle('hidden');
      
      // Save state
      localStorage.setItem('statusBarHidden', statusBar.classList.contains('hidden'));
    }
  },
  
  /**
   * Create a particle background effect
   */
  initializeParticles: function() {
    var particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    var particleCount = 50;
    
    for (var i = 0; i < particleCount; i++) {
      var particle = document.createElement('div');
      particle.className = 'particle';
      
      // Random properties
      var size = Math.random() * 4 + 1;
      var posX = Math.random() * 100;
      var posY = Math.random() * 100;
      var duration = Math.random() * 20 + 10;
      var delay = Math.random() * 5;
      
      // Set styles
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.left = posX + '%';
      particle.style.top = posY + '%';
      particle.style.opacity = Math.random() * 0.3 + 0.1;
      particle.style.animation = 'float ' + duration + 's linear infinite';
      particle.style.animationDelay = '-' + delay + 's';
      
      particlesContainer.appendChild(particle);
    }
  },
  
  /**
   * Initialize UI elements from saved settings
   */
  initializeUI: function() {
    var self = this;
    console.log('Initializing UI elements');
    
    try {
      // Set up theme
      var savedTheme = localStorage.getItem('theme') || 'dark';
      self.setTheme(savedTheme);
      
      // Set up accent color
      var savedColor = localStorage.getItem('accentColor') || '#00aaff';
      self.setAccentColor(savedColor);
      
      // Initialize tabs
      self.initializeTabs();
      
      // Initialize modals
      self.initializeModals();
      
      // Set up theme toggle button
      var themeToggleBtn = document.getElementById('theme-toggle');
      if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
          var currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
          var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
          self.setTheme(newTheme);
        });
      }
      
      // Set up theme color picker
      var themeColorPicker = document.getElementById('theme-color');
      if (themeColorPicker) {
        themeColorPicker.addEventListener('change', function(e) {
          self.setAccentColor(e.target.value);
        });
      }
      
      var accentColorPicker = document.getElementById('accent-color');
      if (accentColorPicker) {
        accentColorPicker.addEventListener('change', function(e) {
          self.setAccentColor(e.target.value);
        });
      }
      
      // Set up sidebar toggle
      var sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
      if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', function() {
          self.toggleSidebar();
        });
      }
      
      // Restore sidebar state
      if (localStorage.getItem('sidebarCollapsed') === 'true') {
        self.toggleSidebar();
      }
      
      // Set up status bar toggle
      var statusBarToggleBtn = document.getElementById('toggle-status-bar-btn');
      if (statusBarToggleBtn) {
        statusBarToggleBtn.addEventListener('click', function() {
          self.toggleStatusBar();
        });
      }
      
      // Restore status bar state
      if (localStorage.getItem('statusBarHidden') === 'true') {
        self.toggleStatusBar();
      }
      
      // Create particle background
      self.initializeParticles();
      
      // Set up help button
      var helpBtn = document.getElementById('help-btn');
      if (helpBtn) {
        helpBtn.addEventListener('click', function() {
          var helpModal = document.getElementById('help-modal');
          if (helpModal) {
            helpModal.style.display = 'flex';
          }
        });
      }
      
      // Initialize textarea event listeners
      var inputTextArea = document.getElementById('input-text');
      if (inputTextArea) {
        inputTextArea.addEventListener('input', function() {
          self.updateWordCounts();
        });
      }
      
      var chapterTextArea = document.getElementById('chapter-text');
      if (chapterTextArea) {
        chapterTextArea.addEventListener('input', function() {
          self.updateWordCounts();
        });
      }
      
      // Initialize Quill if Quill library is available
      if (window.Quill) {
        self.initializeQuill();
      } else {
        // Set up a listener to initialize Quill when it becomes available
        document.addEventListener('quill-loaded', function() {
          self.initializeQuill();
        });
      }
      
      // Initial word count update
      self.updateWordCounts();
      
      console.log('UI initialization completed successfully');
    } catch (error) {
      console.error('Error initializing UI:', error);
    }
  }
};

// Log that UIUtils has been properly initialized
console.log('UIUtils initialized and attached to window object');