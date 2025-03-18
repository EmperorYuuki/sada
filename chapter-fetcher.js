/**
 * Chapter Fetcher Service for QuillSync AI
 * This module handles fetching chapters from supported websites
 */

// IMPORTANT: Define ChapterFetcherService directly on window object
window.ChapterFetcherService = {
  // Cache for website configurations
  websiteConfigsCache: null,
  
  /**
   * Initialize the chapter fetcher service
   * @returns {Promise<void>}
   */
  initialize: function() {
    try {
      console.log('Initializing ChapterFetcherService');
      
      // Set up event handlers
      var fetchChapterBtn = document.getElementById('fetch-chapter-btn');
      if (fetchChapterBtn) {
        fetchChapterBtn.addEventListener('click', this.handleFetchButtonClick.bind(this));
      }
      
      var prevChapterBtn = document.getElementById('prev-chapter-btn');
      if (prevChapterBtn) {
        prevChapterBtn.addEventListener('click', this.handlePrevChapterClick.bind(this));
      }
      
      var nextChapterBtn = document.getElementById('next-chapter-btn');
      if (nextChapterBtn) {
        nextChapterBtn.addEventListener('click', this.handleNextChapterClick.bind(this));
      }
      
      var copyChapterBtn = document.getElementById('copy-chapter-btn');
      if (copyChapterBtn) {
        copyChapterBtn.addEventListener('click', this.handleCopyButtonClick.bind(this));
      }
      
      var clearChapterBtn = document.getElementById('clear-chapter-btn');
      if (clearChapterBtn) {
        clearChapterBtn.addEventListener('click', this.handleClearButtonClick.bind(this));
      }
      
      var importToInputBtn = document.getElementById('import-to-input-btn');
      if (importToInputBtn) {
        importToInputBtn.addEventListener('click', this.handleImportToInputClick.bind(this));
      }
      
      var translateAllBtn = document.getElementById('translate-all-btn');
      if (translateAllBtn) {
        translateAllBtn.addEventListener('click', this.handleTranslateAllClick.bind(this));
      }
      
      // Set up website configuration UI
      this.initializeWebsiteConfigUI();
      
      // Initialize chapter library UI
      this.initializeChapterLibraryUI();
      
      console.log('ChapterFetcherService initialized successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing chapter fetcher service:', error);
      return Promise.reject(error);
    }
  },
  
  /**
   * Initialize website configuration UI
   */
  initializeWebsiteConfigUI: function() {
    try {
      // Set up add website button
      var addWebsiteBtn = document.getElementById('add-website-btn');
      if (addWebsiteBtn) {
        addWebsiteBtn.addEventListener('click', () => {
          // Clear form
          document.getElementById('website-name').value = '';
          document.getElementById('website-base-url').value = '';
          document.getElementById('website-url-pattern').value = '';
          document.getElementById('website-chapter-content').value = '';
          document.getElementById('website-chapter-title').value = '';
          document.getElementById('website-prev-chapter').value = '';
          document.getElementById('website-next-chapter').value = '';
          
          // Show modal
          document.getElementById('add-website-modal').style.display = 'flex';
        });
      }
      
      // Set up save website button
      var saveWebsiteBtn = document.getElementById('save-website-btn');
      if (saveWebsiteBtn) {
        saveWebsiteBtn.addEventListener('click', this.handleSaveWebsiteClick.bind(this));
      }
      
      // Set up test website configuration button
      var testWebsiteConfigBtn = document.getElementById('test-website-config-btn');
      if (testWebsiteConfigBtn) {
        testWebsiteConfigBtn.addEventListener('click', this.handleTestWebsiteConfigClick.bind(this));
      }
      
      // Initialize website list
      this.renderWebsiteList();
    } catch (error) {
      console.error('Error initializing website config UI:', error);
    }
  },
  
  /**
   * Initialize chapter library UI
   */
  initializeChapterLibraryUI: function() {
    try {
      // Set up tab change handler to refresh chapter library
      var chapterLibraryTab = document.querySelector('.secondary-tab-btn[data-tab="chapter-library"]');
      if (chapterLibraryTab) {
        chapterLibraryTab.addEventListener('click', () => {
          var currentProject = window.ProjectService.getCurrentProject();
          if (currentProject) {
            this.renderChapterLibrary(currentProject.id);
          }
        });
      }
      
      // Set up search
      var chapterSearch = document.getElementById('chapter-search');
      if (chapterSearch) {
        chapterSearch.addEventListener('input', this.handleChapterSearchInput.bind(this));
      }
      
      // Set up select all checkbox
      var selectAllChapters = document.getElementById('select-all-chapters');
      if (selectAllChapters) {
        selectAllChapters.addEventListener('change', this.handleSelectAllChaptersChange.bind(this));
      }
      
      // Set up delete selected button
      var deleteSelectedChapters = document.getElementById('delete-selected-chapters');
      if (deleteSelectedChapters) {
        deleteSelectedChapters.addEventListener('click', this.handleDeleteSelectedChaptersClick.bind(this));
      }
    } catch (error) {
      console.error('Error initializing chapter library UI:', error);
    }
  },
  
  /**
   * Handle fetch chapter button click
   */
  handleFetchButtonClick: function() {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    var url = document.getElementById('chapter-url').value.trim();
    if (!url) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please enter a chapter URL', 'warning');
      }
      return;
    }
    
    var count = parseInt(document.getElementById('chapter-count').value) || 1;
    
    this.fetchChapter(url, count);
  },
  
  /**
   * Handle previous chapter button click
   */
  handlePrevChapterClick: function() {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject || !currentProject.currentChapter?.prevLink) return;
    
    var url = currentProject.currentChapter.prevLink;
    document.getElementById('chapter-url').value = url;
    this.fetchChapter(url);
  },
  
  /**
   * Handle next chapter button click
   */
  handleNextChapterClick: function() {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject || !currentProject.currentChapter?.nextLink) return;
    
    var url = currentProject.currentChapter.nextLink;
    document.getElementById('chapter-url').value = url;
    this.fetchChapter(url);
  },
  
  /**
   * Handle copy chapter button click
   */
  handleCopyButtonClick: function() {
    var text = document.getElementById('chapter-text').value;
    if (!text) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('No chapter text to copy', 'warning');
      }
      return;
    }
    
    navigator.clipboard.writeText(text)
      .then(() => {
        if (window.UIUtils) {
          window.UIUtils.showNotification('Chapter text copied to clipboard', 'success');
          window.UIUtils.updateLastAction('Chapter text copied');
        }
      })
      .catch(error => {
        if (window.UIUtils) {
          window.UIUtils.showNotification(`Failed to copy: ${error.message}`, 'error');
        }
      });
  },
  
  /**
   * Handle clear chapter button click
   */
  handleClearButtonClick: function() {
    if (!confirm('Are you sure you want to clear the chapter text?')) return;
    
    document.getElementById('chapter-text').value = '';
    document.getElementById('chapter-name').textContent = 'No chapter selected';
    
    var currentProject = window.ProjectService.getCurrentProject();
    if (currentProject) {
      currentProject.currentChapter = { url: '', prevLink: '', nextLink: '' };
      currentProject.currentChapterName = '';
      window.ProjectService.updateProject(currentProject);
    }
    
    document.getElementById('prev-chapter-btn').disabled = true;
    document.getElementById('next-chapter-btn').disabled = true;
    
    if (window.UIUtils) {
      window.UIUtils.updateWordCounts();
      window.UIUtils.updateLastAction('Chapter cleared');
    }
  },
  
  /**
   * Handle import to input button click
   */
  handleImportToInputClick: function() {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    var text = document.getElementById('chapter-text').value;
    if (!text) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('No chapter text to import', 'warning');
      }
      return;
    }
    
    document.getElementById('input-text').value = text;
    window.ProjectService.updateProjectInput(currentProject.id, text);
    
    if (window.UIUtils) {
      window.UIUtils.updateWordCounts();
      window.UIUtils.showNotification('Chapter text imported to input area', 'success');
      window.UIUtils.updateLastAction('Chapter imported to input');
    }
    
    // Switch to translator tab
    window.UIUtils.activateTab('translator');
  },
  
  /**
   * Handle translate all button click
   */
  handleTranslateAllClick: function() {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    var text = document.getElementById('chapter-text').value.trim();
    if (!text) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('No chapter text to translate', 'warning');
      }
      return;
    }
    
    // Check which translation method to use
    if (currentProject.settings?.translationMethod === 'openrouter') {
      // Use OpenRouter
      if (window.OpenRouterService) {
        window.OpenRouterService.translateChineseText(text, currentProject);
      } else {
        if (window.UIUtils) {
          window.UIUtils.showNotification('OpenRouter service not available', 'error');
        }
      }
    } else {
      // Use ChatGPT
      if (window.ChatGPTService) {
        window.ChatGPTService.translateText(text);
      } else {
        if (window.UIUtils) {
          window.UIUtils.showNotification('ChatGPT service not available', 'error');
        }
      }
    }
    
    if (window.UIUtils) {
      window.UIUtils.updateLastAction('Chapter translation started');
    }
  },
  
  /**
   * Handle save website click
   */
  handleSaveWebsiteClick: function() {
    var name = document.getElementById('website-name').value.trim();
    var baseUrl = document.getElementById('website-base-url').value.trim();
    var urlPattern = document.getElementById('website-url-pattern').value.trim();
    var chapterContent = document.getElementById('website-chapter-content').value.trim();
    var chapterTitle = document.getElementById('website-chapter-title').value.trim();
    var prevChapter = document.getElementById('website-prev-chapter').value.trim();
    var nextChapter = document.getElementById('website-next-chapter').value.trim();
    
    if (!name || !baseUrl || !urlPattern || !chapterContent || !chapterTitle) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Name, base URL, URL pattern, content selector, and title selector are required', 'warning');
      }
      return;
    }
    
    var configId = document.getElementById('add-website-modal').dataset.configId;
    
    try {
      var config = {
        id: configId || window.StorageUtils.generateUUID(),
        name: name,
        baseUrl: baseUrl,
        urlPattern: urlPattern,
        selectors: {
          chapterContent: chapterContent,
          chapterTitle: chapterTitle,
          prevChapter: prevChapter,
          nextChapter: nextChapter
        },
        isActive: true
      };
      
      if (configId) {
        this.updateWebsiteConfiguration(config)
          .then(() => {
            if (window.UIUtils) {
              window.UIUtils.showNotification('Website configuration updated', 'success');
            }
          })
          .catch(error => {
            console.error('Error updating website configuration:', error);
            if (window.UIUtils) {
              window.UIUtils.showNotification(`Failed to update: ${error.message}`, 'error');
            }
          });
      } else {
        this.addWebsiteConfiguration(config)
          .then(() => {
            if (window.UIUtils) {
              window.UIUtils.showNotification('Website configuration added', 'success');
            }
          })
          .catch(error => {
            console.error('Error adding website configuration:', error);
            if (window.UIUtils) {
              window.UIUtils.showNotification(`Failed to add: ${error.message}`, 'error');
            }
          });
      }
      
      document.getElementById('add-website-modal').style.display = 'none';
      this.renderWebsiteList();
      
      if (window.UIUtils) {
        window.UIUtils.updateLastAction(configId ? 'Website config updated' : 'Website config added');
      }
    } catch (error) {
      console.error('Error saving website configuration:', error);
      if (window.UIUtils) {
        window.UIUtils.showNotification(`Failed to save: ${error.message}`, 'error');
      }
    }
  },
  
  /**
   * Handle test website configuration click
   */
  handleTestWebsiteConfigClick: function() {
    var name = document.getElementById('website-name').value.trim();
    var baseUrl = document.getElementById('website-base-url').value.trim();
    var urlPattern = document.getElementById('website-url-pattern').value.trim();
    var chapterContent = document.getElementById('website-chapter-content').value.trim();
    var chapterTitle = document.getElementById('website-chapter-title').value.trim();
    var prevChapter = document.getElementById('website-prev-chapter').value.trim();
    var nextChapter = document.getElementById('website-next-chapter').value.trim();
    
    if (!name || !baseUrl || !urlPattern || !chapterContent || !chapterTitle) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Name, base URL, URL pattern, content selector, and title selector are required', 'warning');
      }
      return;
    }
    
    // Ask for a test URL
    var testUrl = prompt('Enter a test URL (must match the URL pattern):');
    if (!testUrl) return;
    
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Testing website configuration...');
    }
    
    try {
      var config = {
        name: name,
        baseUrl: baseUrl,
        urlPattern: urlPattern,
        selectors: {
          chapterContent: chapterContent,
          chapterTitle: chapterTitle,
          prevChapter: prevChapter,
          nextChapter: nextChapter
        },
        isActive: true
      };
      
      this.testWebsiteConfiguration(config, testUrl)
        .then(result => {
          if (window.UIUtils) {
            window.UIUtils.toggleLoading(false);
          }
          
          if (result.success) {
            if (window.UIUtils) {
              window.UIUtils.showNotification(`Test successful! Found: ${result.data.chapterName}`, 'success');
            }
            
            // Display preview information
            alert(`Test Results:
- Chapter Name: ${result.data.chapterName}
- Text Preview: ${result.data.textPreview}
- Has Next Link: ${result.data.hasNextLink ? 'Yes' : 'No'}
- Has Previous Link: ${result.data.hasPrevLink ? 'Yes' : 'No'}`);
          } else {
            if (window.UIUtils) {
              window.UIUtils.showNotification(`Test failed: ${result.message}`, 'error');
            }
          }
        })
        .catch(error => {
          if (window.UIUtils) {
            window.UIUtils.toggleLoading(false);
            window.UIUtils.showNotification(`Test failed: ${error.message}`, 'error');
          }
          console.error('Error testing website configuration:', error);
        });
    } catch (error) {
      if (window.UIUtils) {
        window.UIUtils.toggleLoading(false);
        window.UIUtils.showNotification(`Test failed: ${error.message}`, 'error');
      }
      console.error('Error testing website configuration:', error);
    }
  },
  
  /**
   * Handle chapter search input
   * @param {Event} e - Input event
   */
  handleChapterSearchInput: function(e) {
    var query = e.target.value.toLowerCase();
    var rows = document.querySelectorAll('#chapter-list-body tr');
    
    rows.forEach(row => {
      var title = row.cells[1]?.textContent.toLowerCase() || '';
      var source = row.cells[2]?.textContent.toLowerCase() || '';
      
      if (title.includes(query) || source.includes(query)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  },
  
  /**
   * Handle select all chapters change
   * @param {Event} e - Change event
   */
  handleSelectAllChaptersChange: function(e) {
    var checkboxes = document.querySelectorAll('#chapter-list-body input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
  },
  
  /**
   * Handle delete selected chapters click
   */
  handleDeleteSelectedChaptersClick: function() {
    var selectedCheckboxes = document.querySelectorAll('#chapter-list-body input[type="checkbox"]:checked');
    if (selectedCheckboxes.length === 0) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('No chapters selected', 'warning');
      }
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedCheckboxes.length} selected chapter(s)?`)) return;
    
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Deleting chapters...');
    }
    
    var deletePromises = [];
    selectedCheckboxes.forEach(checkbox => {
      var chapterId = checkbox.value;
      deletePromises.push(this.deleteChapter(chapterId));
    });
    
    Promise.all(deletePromises)
      .then(() => {
        // Refresh the library
        var currentProject = window.ProjectService.getCurrentProject();
        if (currentProject) {
          this.renderChapterLibrary(currentProject.id);
        }
        
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.showNotification(`${selectedCheckboxes.length} chapter(s) deleted`, 'success');
          window.UIUtils.updateLastAction('Chapters deleted');
        }
      })
      .catch(error => {
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.showNotification(`Failed to delete chapters: ${error.message}`, 'error');
        }
        console.error('Error deleting chapters:', error);
      });
  },
  
  /**
   * Fetch a chapter from a URL
   * @param {string} url - Chapter URL
   * @param {number} count - Number of chapters to fetch
   */
  fetchChapter: function(url, count = 1) {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Fetching chapter...');
      window.UIUtils.toggleProgressBar(true);
      window.UIUtils.updateProgress(0, 'Connecting to server...');
    }
    
    fetch('http://localhost:3003/fetch-chapter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, count })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        var chapterName = document.getElementById('chapter-name');
        var chapterText = document.getElementById('chapter-text');
        
        if (chapterName) chapterName.textContent = data.chapterName || 'Unnamed Chapter';
        if (chapterText) chapterText.value = data.rawText || '';
        
        // Update navigation buttons
        var prevChapterBtn = document.getElementById('prev-chapter-btn');
        var nextChapterBtn = document.getElementById('next-chapter-btn');
        
        if (prevChapterBtn) prevChapterBtn.disabled = !data.prevLink;
        if (nextChapterBtn) nextChapterBtn.disabled = !data.nextLink;
        
        // Update project state
        currentProject.currentChapter = {
          url: data.nextLink || url,
          prevLink: data.prevLink,
          nextLink: data.nextLink
        };
        currentProject.currentChapterName = data.chapterName;
        
        // Save to project
        window.ProjectService.updateProject(currentProject);
        
        // Save chapter to database
        this.saveChapter({
          projectId: currentProject.id,
          title: data.chapterName || 'Unnamed Chapter',
          url: url,
          content: data.rawText,
          prevLink: data.prevLink,
          nextLink: data.nextLink,
          dateAdded: new Date().toISOString()
        });
        
        if (window.UIUtils) {
          window.UIUtils.updateWordCounts();
          window.UIUtils.showNotification(`Fetched ${count} chapter(s) successfully.`, 'success');
          window.UIUtils.updateLastAction('Chapters fetched');
        }
      } else {
        if (window.UIUtils) {
          window.UIUtils.showNotification(data.message, 'error');
        }
      }
      
      if (window.UIUtils) {
        window.UIUtils.toggleLoading(false);
        window.UIUtils.toggleProgressBar(false);
        window.UIUtils.updateProgress(100, 'Complete');
      }
    })
    .catch(error => {
      if (window.UIUtils) {
        window.UIUtils.toggleLoading(false);
        window.UIUtils.toggleProgressBar(false);
        window.UIUtils.showNotification(`Fetch failed: ${error.message}. Check the URL or network connection.`, 'error');
      }
      console.error('Error fetching chapter:', error);
    });
  },
  
  /**
   * Save a chapter to the database
   * @param {Object} chapter - Chapter to save
   * @returns {Promise<Object>} Saved chapter
   */
  saveChapter: function(chapter) {
    if (!chapter.projectId) {
      return Promise.reject(new Error('Project ID is required'));
    }
    
    if (!chapter.url) {
      return Promise.reject(new Error('Chapter URL is required'));
    }
    
    // Generate ID if not provided
    if (!chapter.id) {
      chapter.id = window.StorageUtils.generateUUID();
    }
    
    // Add timestamp if not provided
    if (!chapter.dateAdded) {
      chapter.dateAdded = new Date().toISOString();
    }
    
    return window.StorageUtils.saveItem('chapters', chapter);
  },
  
  /**
   * Get chapters for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Project chapters
   */
  getProjectChapters: function(projectId) {
    if (!projectId) {
      return Promise.reject(new Error('Project ID is required'));
    }
    
    return window.StorageUtils.getByIndex('chapters', 'projectId', projectId);
  },
  
  /**
   * Delete a chapter
   * @param {string} chapterId - Chapter ID to delete
   * @returns {Promise<void>}
   */
  deleteChapter: function(chapterId) {
    if (!chapterId) {
      return Promise.reject(new Error('Chapter ID is required'));
    }
    
    return window.StorageUtils.deleteItem('chapters', chapterId);
  },
  
  /**
   * Add a new website configuration
   * @param {Object} config - Website configuration
   * @returns {Promise<Object>} Added configuration
   */
  addWebsiteConfiguration: function(config) {
    if (!config.name || !config.baseUrl || !config.urlPattern) {
      return Promise.reject(new Error('Name, base URL, and URL pattern are required'));
    }
    
    // Validate selectors
    if (!config.selectors || 
        !config.selectors.chapterContent || 
        !config.selectors.chapterTitle) {
      return Promise.reject(new Error('Chapter content and title selectors are required'));
    }
    
    // Generate ID if not provided
    if (!config.id) {
      config.id = window.StorageUtils.generateUUID();
    }
    
    // Set active by default
    if (config.isActive === undefined) {
      config.isActive = true;
    }
    
    return window.StorageUtils.saveItem('websiteConfigs', config)
      .then(() => {
        // Invalidate cache
        this.websiteConfigsCache = null;
        return config;
      });
  },
  
  /**
   * Update a website configuration
   * @param {Object} config - Updated configuration
   * @returns {Promise<Object>} Updated configuration
   */
  updateWebsiteConfiguration: function(config) {
    if (!config.id) {
      return Promise.reject(new Error('Configuration ID is required'));
    }
    
    return window.StorageUtils.saveItem('websiteConfigs', config)
      .then(() => {
        // Invalidate cache
        this.websiteConfigsCache = null;
        return config;
      });
  },
  
  /**
   * Delete a website configuration
   * @param {string} id - Configuration ID
   * @returns {Promise<void>}
   */
  deleteWebsiteConfiguration: function(id) {
    if (!id) {
      return Promise.reject(new Error('Configuration ID is required'));
    }
    
    return window.StorageUtils.deleteItem('websiteConfigs', id)
      .then(() => {
        // Invalidate cache
        this.websiteConfigsCache = null;
      });
  },
  
  /**
   * Get all website configurations
   * @returns {Promise<Array>} Array of website configurations
   */
  getWebsiteConfigurations: function() {
    // Check cache
    if (this.websiteConfigsCache) {
      return Promise.resolve(this.websiteConfigsCache);
    }
    
    return window.StorageUtils.getAllItems('websiteConfigs')
      .then(configs => {
        this.websiteConfigsCache = configs;
        return configs;
      });
  },
  
  /**
   * Get a website configuration by ID
   * @param {string} id - Website configuration ID
   * @returns {Promise<Object|null>} Website configuration
   */
  getWebsiteConfigurationById: function(id) {
    if (!id) return Promise.resolve(null);
    
    return window.StorageUtils.getItem('websiteConfigs', id);
  },
  
  /**
   * Check if a URL is supported by the configured website patterns
   * @param {string} url - URL to check
   * @returns {Promise<boolean>} Whether the URL is supported
   */
  isSupportedUrl: function(url) {
    if (!url) return Promise.resolve(false);
    
    // Get website configurations
    return this.getWebsiteConfigurations()
      .then(configs => {
        // Check each configuration
        for (const config of configs) {
          if (!config.isActive) continue;
          
          try {
            const regex = new RegExp(config.urlPattern);
            if (regex.test(url)) {
              return true;
            }
          } catch (error) {
            console.warn(`Invalid URL pattern for ${config.name}:`, error);
          }
        }
        
        return false;
      });
  },
  
  /**
   * Test a website configuration with a sample URL
   * @param {Object} config - Website configuration to test
   * @param {string} testUrl - URL to test with
   * @returns {Promise<Object>} Test results
   */
  testWebsiteConfiguration: function(config, testUrl) {
    if (!config || !testUrl) {
      return Promise.reject(new Error('Configuration and test URL are required'));
    }
    
    try {
      // First check if URL matches the pattern
      const patternRegex = new RegExp(config.urlPattern);
      const patternMatch = patternRegex.test(testUrl);
      
      if (!patternMatch) {
        return Promise.resolve({
          success: false,
          message: 'The test URL does not match the URL pattern',
          details: {
            patternMatch: false
          }
        });
      }
      
      // Temporarily add the configuration
      const tempId = `temp-${Date.now()}`;
      const tempConfig = {
        ...config,
        id: tempId,
        isActive: true
      };
      
      return window.StorageUtils.saveItem('websiteConfigs', tempConfig)
        .then(() => {
          this.websiteConfigsCache = null;
          
          // Try to fetch the chapter
          return fetch('http://localhost:3003/fetch-chapter', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: testUrl, count: 1 })
          });
        })
        .then(response => response.json())
        .then(data => {
          // Clean up temporary configuration
          return window.StorageUtils.deleteItem('websiteConfigs', tempId)
            .then(() => {
              this.websiteConfigsCache = null;
              
              if (!data.success) {
                return {
                  success: false,
                  message: data.message || 'Failed to fetch chapter with this configuration',
                  details: {
                    patternMatch: true,
                    fetchSuccess: false
                  }
                };
              }
              
              return {
                success: true,
                message: 'Configuration test successful!',
                data: {
                  chapterName: data.chapterName,
                  textPreview: data.rawText.substring(0, 200) + '...',
                  hasNextLink: !!data.nextLink,
                  hasPrevLink: !!data.prevLink
                },
                details: {
                  patternMatch: true,
                  fetchSuccess: true
                }
              };
            });
        })
        .catch(error => {
          // Clean up temporary configuration
          return window.StorageUtils.deleteItem('websiteConfigs', tempId)
            .then(() => {
              this.websiteConfigsCache = null;
              
              return {
                success: false,
                message: `Fetch failed: ${error.message}`,
                details: {
                  patternMatch: true,
                  fetchSuccess: false,
                  error: error.message
                }
              };
            });
        });
    } catch (error) {
      return Promise.resolve({
        success: false,
        message: `Test failed: ${error.message}`,
        details: {
          error: error.message
        }
      });
    }
  },
  
  /**
   * Render the website list
   * @returns {Promise<void>}
   */
  renderWebsiteList: function() {
    var websiteList = document.querySelector('.website-list');
    if (!websiteList) return Promise.resolve();
    
    // Clear the list
    websiteList.innerHTML = '';
    
    return this.getWebsiteConfigurations()
      .then(configs => {
        if (configs.length === 0) {
          websiteList.innerHTML = '<div class="empty-state">No website configurations yet.</div>';
          return;
        }
        
        // Sort by name
        configs.sort((a, b) => a.name.localeCompare(b.name));
        
        // Create elements for each config
        for (const config of configs) {
          var item = document.createElement('div');
          item.className = 'website-item';
          
          item.innerHTML = `
            <div class="website-info">
              <h4>${config.name}</h4>
              <span class="status ${config.isActive ? 'active' : 'inactive'}">${config.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div class="website-actions">
              <button class="edit-website-btn small-btn"><i class="fas fa-edit"></i></button>
              <button class="delete-website-btn small-btn" ${config.name === 'trxs.cc' || config.name === '69yuedu.net' ? 'disabled' : ''}><i class="fas fa-trash"></i></button>
              <button class="toggle-website-btn small-btn"><i class="fas fa-${config.isActive ? 'eye-slash' : 'eye'}"></i></button>
            </div>
          `;
          
          // Set up edit button
          var editBtn = item.querySelector('.edit-website-btn');
          if (editBtn) {
            editBtn.addEventListener('click', () => {
              document.getElementById('website-name').value = config.name;
              document.getElementById('website-base-url').value = config.baseUrl;
              document.getElementById('website-url-pattern').value = config.urlPattern;
              document.getElementById('website-chapter-content').value = config.selectors.chapterContent;
              document.getElementById('website-chapter-title').value = config.selectors.chapterTitle;
              document.getElementById('website-prev-chapter').value = config.selectors.prevChapter || '';
              document.getElementById('website-next-chapter').value = config.selectors.nextChapter || '';
              
              // Store the config ID for update
              document.getElementById('add-website-modal').dataset.configId = config.id;
              
              // Show modal
              document.getElementById('add-website-modal').style.display = 'flex';
            });
          }
          
          // Set up delete button
          if (!(config.name === 'trxs.cc' || config.name === '69yuedu.net')) {
            var deleteBtn = item.querySelector('.delete-website-btn');
            if (deleteBtn) {
              deleteBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete the configuration for ${config.name}?`)) {
                  this.deleteWebsiteConfiguration(config.id)
                    .then(() => {
                      item.remove();
                      if (window.UIUtils) {
                        window.UIUtils.showNotification('Website configuration deleted', 'success');
                        window.UIUtils.updateLastAction('Website config deleted');
                      }
                    })
                    .catch(error => {
                      console.error('Error deleting website configuration:', error);
                      if (window.UIUtils) {
                        window.UIUtils.showNotification(`Failed to delete: ${error.message}`, 'error');
                      }
                    });
                }
              });
            }
          }
          
          // Set up toggle button
          var toggleBtn = item.querySelector('.toggle-website-btn');
          if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
              config.isActive = !config.isActive;
              this.updateWebsiteConfiguration(config)
                .then(() => {
                  // Update UI
                  var statusEl = item.querySelector('.status');
                  if (statusEl) {
                    statusEl.className = `status ${config.isActive ? 'active' : 'inactive'}`;
                    statusEl.textContent = config.isActive ? 'Active' : 'Inactive';
                  }
                  
                  toggleBtn.innerHTML = `<i class="fas fa-${config.isActive ? 'eye-slash' : 'eye'}"></i>`;
                  
                  if (window.UIUtils) {
                    window.UIUtils.showNotification(`${config.name} ${config.isActive ? 'activated' : 'deactivated'}`, 'success');
                    window.UIUtils.updateLastAction(`Website ${config.isActive ? 'activated' : 'deactivated'}`);
                  }
                })
                .catch(error => {
                  console.error('Error toggling website configuration:', error);
                  if (window.UIUtils) {
                    window.UIUtils.showNotification(`Failed to toggle: ${error.message}`, 'error');
                  }
                });
            });
          }
          
          websiteList.appendChild(item);
        }
      })
      .catch(error => {
        console.error('Error rendering website list:', error);
        websiteList.innerHTML = '<div class="empty-state">Error loading website configurations.</div>';
      });
  },
  
  /**
   * Render the chapter library
   * @param {string} projectId - Project ID
   * @returns {Promise<void>}
   */
  renderChapterLibrary: function(projectId) {
    var tableBody = document.getElementById('chapter-list-body');
    if (!tableBody || !projectId) return Promise.resolve();
    
    // Clear table
    tableBody.innerHTML = '';
    
    return this.getProjectChapters(projectId)
      .then(chapters => {
        if (chapters.length === 0) {
          var emptyRow = document.createElement('tr');
          var emptyCell = document.createElement('td');
          emptyCell.colSpan = 5;
          emptyCell.className = 'empty-state';
          emptyCell.textContent = 'No chapters saved for this project. Use the Chapter Fetcher to download chapters.';
          emptyRow.appendChild(emptyCell);
          tableBody.appendChild(emptyRow);
          return;
        }
        
        // Sort by date added (newest first)
        chapters.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        
        // Add each chapter
        chapters.forEach(chapter => {
          var row = document.createElement('tr');
          
          // Checkbox
          var checkboxCell = document.createElement('td');
          var checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = chapter.id;
          checkboxCell.appendChild(checkbox);
          row.appendChild(checkboxCell);
          
          // Title
          var titleCell = document.createElement('td');
          titleCell.textContent = chapter.title || 'Unnamed Chapter';
          row.appendChild(titleCell);
          
          // Source
          var sourceCell = document.createElement('td');
          sourceCell.textContent = this.getDomainFromUrl(chapter.url);
          row.appendChild(sourceCell);
          
          // Date Added
          var dateCell = document.createElement('td');
          dateCell.textContent = new Date(chapter.dateAdded).toLocaleString();
          row.appendChild(dateCell);
          
          // Actions
          var actionsCell = document.createElement('td');
          actionsCell.className = 'chapter-actions';
          
          // Load button
          var loadBtn = document.createElement('button');
          loadBtn.innerHTML = '<i class="fas fa-file-import"></i>';
          loadBtn.title = 'Load chapter';
          loadBtn.className = 'small-btn';
          loadBtn.addEventListener('click', () => {
            document.getElementById('chapter-name').textContent = chapter.title || 'Unnamed Chapter';
            document.getElementById('chapter-text').value = chapter.content || '';
            document.getElementById('chapter-url').value = chapter.url || '';
            
            // Set navigation buttons
            document.getElementById('prev-chapter-btn').disabled = !chapter.prevLink;
            document.getElementById('next-chapter-btn').disabled = !chapter.nextLink;
            
            // Update project
            var currentProject = window.ProjectService.getCurrentProject();
            if (currentProject) {
              currentProject.currentChapter = {
                url: chapter.url,
                prevLink: chapter.prevLink,
                nextLink: chapter.nextLink
              };
              currentProject.currentChapterName = chapter.title;
              window.ProjectService.updateProject(currentProject);
            }
            
            // Update word count
            if (window.UIUtils) {
              window.UIUtils.updateWordCounts();
              window.UIUtils.showNotification('Chapter loaded', 'success');
              window.UIUtils.updateLastAction('Chapter loaded from library');
            }
            
            // Switch to main tab
            window.UIUtils.activateSecondaryTab('fetch-chapters');
          });
          actionsCell.appendChild(loadBtn);
          
          // Delete button
          var deleteBtn = document.createElement('button');
          deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
          deleteBtn.title = 'Delete chapter';
          deleteBtn.className = 'small-btn';
          deleteBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete "${chapter.title || 'Unnamed Chapter'}"?`)) {
              this.deleteChapter(chapter.id)
                .then(() => {
                  row.remove();
                  if (window.UIUtils) {
                    window.UIUtils.showNotification('Chapter deleted', 'success');
                    window.UIUtils.updateLastAction('Chapter deleted');
                  }
                })
                .catch(error => {
                  console.error('Error deleting chapter:', error);
                  if (window.UIUtils) {
                    window.UIUtils.showNotification(`Failed to delete: ${error.message}`, 'error');
                  }
                });
            }
          });
          actionsCell.appendChild(deleteBtn);
          
          row.appendChild(actionsCell);
          tableBody.appendChild(row);
        });
      })
      .catch(error => {
        console.error('Error rendering chapter library:', error);
        var errorRow = document.createElement('tr');
        var errorCell = document.createElement('td');
        errorCell.colSpan = 5;
        errorCell.className = 'empty-state error';
        errorCell.textContent = `Error loading chapters: ${error.message}`;
        errorRow.appendChild(errorCell);
        tableBody.appendChild(errorRow);
      });
  },
  
  /**
   * Get domain name from URL
   * @param {string} url - URL to extract domain from
   * @returns {string} Domain name
   */
  getDomainFromUrl: function(url) {
    try {
      var urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return url;
    }
  }
};

// Log that ChapterFetcherService has been properly initialized
console.log('ChapterFetcherService initialized and attached to window object');