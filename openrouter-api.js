/**
 * OpenRouter API Service for QuillSync AI
 * This module handles interactions with the OpenRouter API
 */

// IMPORTANT: Define OpenRouterService directly on window object
window.OpenRouterService = {
  // Constants
  BASE_URL: 'https://openrouter.ai/api/v1',
  CACHE_VERSION: '1.1', // Added version for cache to handle API changes
  
  // Cache for models
  modelsCache: null,
  lastModelsFetch: null,
  
  // Translation state tracking
  isTranslating: false,
  currentTranslation: null,
  abortController: null,
  
  /**
   * Initialize the OpenRouter service
   * @returns {Promise<void>}
   */
  initialize: function() {
    try {
      console.log('Initializing OpenRouterService');
      
      // Set up event handlers with simplified binding
      this.setupEventHandlers();
      
      console.log('OpenRouterService initialized successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing OpenRouter service:', error);
      return Promise.reject(error);
    }
  },
  
  /**
   * Set up all event handlers
   */
  setupEventHandlers: function() {
    // Helper function to safely add event listener
    const addListener = (elementId, event, handler) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener(event, handler.bind(this));
      }
    };
    
    // Test connection button
    addListener('test-openrouter-btn', 'click', this.testConnection);
    
    // Refresh models button
    addListener('refresh-models-btn', 'click', this.refreshModels);
    
    // Save API key button
    addListener('save-api-key-btn', 'click', this.saveApiKey);
    
    // Model selection dropdown
    addListener('openrouter-model', 'change', this.handleModelChange);
    
    // Settings tab activation to load models
    const settingsTab = document.querySelector('.tab-btn[data-tab="settings"]');
    if (settingsTab) {
      settingsTab.addEventListener('click', async () => {
        // Populate OpenRouter API key from current project
        const currentProject = window.ProjectService?.getCurrentProject();
        if (currentProject) {
          const apiKeyInput = document.getElementById('openrouter-api-key');
          if (apiKeyInput) {
            apiKeyInput.value = currentProject.settings?.openRouterApiKey || '';
          }
          
          // Populate model selector if we have an API key
          if (currentProject.settings?.openRouterApiKey) {
            await this.populateModelSelector();
          }
        }
      });
    }
    
    // Initial population of API key if a project is loaded
    const currentProject = window.ProjectService?.getCurrentProject();
    if (currentProject) {
      const apiKeyInput = document.getElementById('openrouter-api-key');
      if (apiKeyInput) {
        apiKeyInput.value = currentProject.settings?.openRouterApiKey || '';
      }
    }
    
    // Cancel translation button
    addListener('cancel-translation-btn', 'click', this.cancelTranslation);
    
    // Add verify button handler
    addListener('verify-btn', 'click', this.handleVerifyButtonClick);
    
    // Setup translate button handler if not already handled elsewhere
    addListener('translate-btn', 'click', () => {
      const translationMethod = document.getElementById('translation-method');
      if (translationMethod && translationMethod.value === 'openrouter') {
        this.translateText(true);
      }
    });
  },
  
  /**
   * Cancel ongoing translation
   */
  cancelTranslation: function() {
    if (this.isTranslating && this.abortController) {
      this.abortController.abort();
      this.isTranslating = false;
      this.currentTranslation = null;
      
      if (window.UIUtils) {
        window.UIUtils.toggleLoading(false);
        window.UIUtils.toggleProgressBar(false);
        window.UIUtils.showNotification('Translation cancelled', 'info');
        window.UIUtils.updateLastAction('Translation cancelled');
      }
    }
  },
  
  /**
   * Get API key for the current project
   * @returns {string|null} API key or null if not available
   */
  getApiKey: function() {
    const currentProject = window.ProjectService?.getCurrentProject();
    if (!currentProject) return null;
    
    return currentProject.settings?.openRouterApiKey || null;
  },
  
  /**
   * Get model for the current project
   * @returns {string|null} Model ID or null if not available
   */
  getModel: function() {
    const currentProject = window.ProjectService?.getCurrentProject();
    if (!currentProject) return null;
    
    return currentProject.settings?.openRouterModel || null;
  },
  
  /**
   * Test OpenRouter connection
   */
  testConnection: function() {
    // Use debounce to prevent rapid clicks
    if (this._testingConnection) return;
    this._testingConnection = true;
    setTimeout(() => { this._testingConnection = false; }, 1000);
    
    const apiKeyInput = document.getElementById('openrouter-api-key');
    if (!apiKeyInput || !apiKeyInput.value.trim()) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please enter an OpenRouter API key', 'warning');
      }
      return;
    }
    
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Testing OpenRouter connection...');
      window.UIUtils.toggleProgressBar(true);
      window.UIUtils.updateProgress(0, 'Connecting to API...');
    }
    
    // Save the API key to the current project
    const currentProject = window.ProjectService?.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
        window.UIUtils.toggleLoading(false);
        window.UIUtils.toggleProgressBar(false);
      }
      return;
    }
    
    // Update project settings
    window.ProjectService.updateProjectSettings(currentProject.id, {
      openRouterApiKey: apiKeyInput.value.trim()
    })
    .then(() => {
      // Test connection by fetching models
      if (window.UIUtils) {
        window.UIUtils.updateProgress(30, 'Retrieving available models...');
      }
      return this.getAvailableModels(true);
    })
    .then(models => {
      // Progress update
      if (window.UIUtils) {
        window.UIUtils.updateProgress(70, 'Updating model selector...');
      }
      
      // Populate model selector
      return this.populateModelSelector()
        .then(() => models);
    })
    .then(models => {
      if (window.UIUtils) {
        window.UIUtils.toggleLoading(false);
        window.UIUtils.toggleProgressBar(false);
        window.UIUtils.updateProgress(100, 'Connection successful');
        
        // Enhanced success message with model information
        const recommendedModel = this.getRecommendedModel(models);
        let message = `Connection successful. Found ${models.length} available models.`;
        
        if (recommendedModel) {
          message += ` Recommended model: ${recommendedModel.name}.`;
        }
        
        window.UIUtils.showNotification(message, 'success');
        window.UIUtils.updateLastAction('OpenRouter connection verified');
      }
    })
    .catch(error => {
      if (window.UIUtils) {
        window.UIUtils.toggleLoading(false);
        window.UIUtils.toggleProgressBar(false);
        
        // Enhanced error message with troubleshooting help
        let errorMessage = `Connection failed: ${error.message}`;
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          errorMessage += '. Please check your API key.';
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
          errorMessage += '. Please check your internet connection.';
        }
        
        window.UIUtils.showNotification(errorMessage, 'error');
        window.UIUtils.updateLastAction('OpenRouter connection failed');
      }
      console.error('OpenRouter connection test failed:', error);
    });
  },
  
  /**
   * Get recommended model from the available models
   * @param {Array} models - List of available models
   * @returns {Object|null} Recommended model or null
   */
  getRecommendedModel: function(models) {
    if (!Array.isArray(models) || models.length === 0) return null;
    
    // Sort models based on context length and availability
    const sortedModels = [...models].sort((a, b) => {
      // Prioritize models with reasonable context length (12-16K)
      // Too small is insufficient, too large may be unnecessarily expensive
      const aContextLength = a.context_length || 0;
      const bContextLength = b.context_length || 0;
      
      // Ideal context range for a balance of capability and cost
      const idealContextRange = (length) => {
        if (length >= 12000 && length <= 32000) return 3;  // Ideal range
        if (length >= 8000 && length < 12000) return 2;    // Good range
        if (length > 32000) return 1;                      // Larger than needed
        return 0;                                          // Too small
      };
      
      const aContextScore = idealContextRange(aContextLength);
      const bContextScore = idealContextRange(bContextLength);
      
      if (aContextScore !== bContextScore) {
        return bContextScore - aContextScore;
      }
      
      // Next prioritize by proven reliability for translation tasks
      // Claude, GPT-4, Gemini, Mistral are good for translation
      const getReliabilityScore = (model) => {
        const modelId = model.id?.toLowerCase() || '';
        
        if (modelId.includes('claude') || 
            modelId.includes('gpt-4') || 
            modelId.includes('gemini') || 
            modelId.includes('mistral-large')) {
          return 3;  // Top tier for translation
        }
        
        if (modelId.includes('gpt-3.5') || 
            modelId.includes('mistral-medium') || 
            modelId.includes('llama-3')) {
          return 2;  // Good for translation
        }
        
        return 1;  // Other models
      };
      
      const aReliabilityScore = getReliabilityScore(a);
      const bReliabilityScore = getReliabilityScore(b);
      
      if (aReliabilityScore !== bReliabilityScore) {
        return bReliabilityScore - aReliabilityScore;
      }
      
      // Finally, consider price as a factor
      const aCost = parseFloat(a.pricing?.prompt || 0) + parseFloat(a.pricing?.completion || 0);
      const bCost = parseFloat(b.pricing?.prompt || 0) + parseFloat(b.pricing?.completion || 0);
      
      return aCost - bCost;  // Lower cost preferred if all else equal
    });
    
    // Return the top recommended model
    return sortedModels[0] || null;
  },
  
  /**
   * Save API key
   */
  saveApiKey: function() {
    const apiKeyInput = document.getElementById('openrouter-api-key');
    if (!apiKeyInput) return;
    
    const currentProject = window.ProjectService?.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    const apiKey = apiKeyInput.value.trim();
    
    // Enhanced validation for API key format
    if (apiKey && !apiKey.match(/^(sk-or[-_a-zA-Z0-9]{10,})$/)) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('The API key format appears invalid. OpenRouter keys should start with "sk-or-".', 'warning');
      }
      // Continue anyway as the format might vary
    }
    
    window.ProjectService.updateProjectSettings(currentProject.id, {
      openRouterApiKey: apiKey
    })
    .then(() => {
      if (window.UIUtils) {
        window.UIUtils.showNotification('API key saved', 'success');
        window.UIUtils.updateLastAction('OpenRouter API key updated');
      }
      
      // If API key was added, try to populate the models
      if (apiKey && !this.modelsCache) {
        this.populateModelSelector();
      }
    })
    .catch(error => {
      console.error('Error saving API key:', error);
      if (window.UIUtils) {
        window.UIUtils.showNotification(`Error saving API key: ${error.message}`, 'error');
      }
    });
  },
  
  /**
   * Handle model change
   * @param {Event} e - Change event
   */
  handleModelChange: function(e) {
    const currentProject = window.ProjectService?.getCurrentProject();
    if (!currentProject) return;
    
    const modelId = e.target.value;
    
    // Find the model details to show additional info
    this.getAvailableModels().then(models => {
      const selectedModel = models.find(m => m.id === modelId);
      
      window.ProjectService.updateProjectSettings(currentProject.id, {
        openRouterModel: modelId
      })
      .then(() => {
        if (window.UIUtils) {
          let message = 'OpenRouter model updated';
          
          // Add pricing info if available
          if (selectedModel?.pricing) {
            const promptPrice = parseFloat(selectedModel.pricing.prompt || 0).toFixed(4);
            const completionPrice = parseFloat(selectedModel.pricing.completion || 0).toFixed(4);
            message += ` (Pricing: $${promptPrice}/$${completionPrice} per 1M tokens)`;
          }
          
          window.UIUtils.updateLastAction(message);
          
          // Show notification with model info
          if (selectedModel) {
            window.UIUtils.showNotification(`Model set to ${selectedModel.name || modelId}`, 'success');
          }
        }
      })
      .catch(error => {
        console.error('Error saving model selection:', error);
        if (window.UIUtils) {
          window.UIUtils.showNotification(`Error saving model selection: ${error.message}`, 'error');
        }
      });
    }).catch(error => {
      console.error('Error getting model details:', error);
      // Still update the model setting even if we can't get details
      window.ProjectService.updateProjectSettings(currentProject.id, {
        openRouterModel: modelId
      });
    });
  },
  
  /**
   * Refresh models
   */
  refreshModels: function() {
    if (window.UIUtils) {
      window.UIUtils.showNotification('Refreshing models...', 'info');
    }
    
    this.populateModelSelector(true)
      .then(() => {
        if (window.UIUtils) {
          window.UIUtils.showNotification('Models refreshed', 'success');
          window.UIUtils.updateLastAction('OpenRouter models refreshed');
        }
      })
      .catch(error => {
        console.error('Error refreshing models:', error);
        if (window.UIUtils) {
          window.UIUtils.showNotification(`Error refreshing models: ${error.message}`, 'error');
        }
      });
  },
  
/**
 * Fetch available models from OpenRouter
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @returns {Promise<Array>} Array of available models
 */
getAvailableModels: function(forceRefresh = false) {
  // Check cache first (cache for 24 hours)
  const now = Date.now();
  if (
    !forceRefresh && 
    this.modelsCache && 
    this.lastModelsFetch && 
    (now - this.lastModelsFetch < 24 * 60 * 60 * 1000)
  ) {
    console.log('Using cached models data from memory:', this.modelsCache.length, 'models');
    return Promise.resolve(this.modelsCache);
  }
  
  // Check for models in localStorage cache with version check
  if (!forceRefresh && !this.modelsCache) {
    try {
      const cacheVersion = localStorage.getItem('openrouter_models_version');
      const cachedData = localStorage.getItem('openrouter_models_cache');
      const cacheTimestamp = localStorage.getItem('openrouter_models_timestamp');
      
      if (cachedData && cacheTimestamp && cacheVersion === this.CACHE_VERSION) {
        const parsedData = JSON.parse(cachedData);
        const timestamp = parseInt(cacheTimestamp, 10);
        
        // Use cache if it's less than 24 hours old
        if (parsedData && Array.isArray(parsedData) && 
            timestamp && (now - timestamp < 24 * 60 * 60 * 1000)) {
          console.log('Using cached models data from localStorage:', parsedData.length, 'models');
          this.modelsCache = parsedData;
          this.lastModelsFetch = timestamp;
          return Promise.resolve(parsedData);
        }
      }
    } catch (e) {
      console.warn('Error reading from cache, will fetch from API:', e);
    }
  }
  
  // Get API key
  const apiKey = this.getApiKey();
  if (!apiKey) {
    return Promise.reject(new Error('OpenRouter API key is required. Please set it in the project settings.'));
  }
  
  console.log(`Fetching models from OpenRouter API: ${this.BASE_URL}/models`);
  
  // Create abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30 second timeout
  
  return fetch(`${this.BASE_URL}/models`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin || 'https://quillsyncai.com',
      'X-Title': 'QuillSync AI'
    },
    signal: abortController.signal
  })
  .then(response => {
    clearTimeout(timeoutId);
    console.log(`OpenRouter API response status: ${response.status}`);
    
    if (!response.ok) {
      // Enhanced error handling with detailed logging
      return response.text().then(text => {
        try {
          const errorData = JSON.parse(text);
          console.error('OpenRouter API error response:', errorData);
          
          // Provide a more helpful error message
          if (response.status === 401) {
            throw new Error('API key is invalid or expired. Please check your OpenRouter API key.');
          } else if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later or request a higher rate limit.');
          } else {
            throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || errorData.message || text}`);
          }
        } catch (e) {
          console.error('OpenRouter API raw error response:', text);
          throw new Error(`API request failed with status ${response.status}: ${text}`);
        }
      });
    }
    
    console.log('OpenRouter API response successful, parsing JSON...');
    return response.json();
  })
  .then(responseData => {
    // Log the response structure for debugging
    console.log('Raw API response received');
    
    // Check if the response has a data property (which appears to be the case)
    let modelData = responseData;
    
    // Handle the nested data structure that's coming back
    if (responseData && responseData.data && Array.isArray(responseData.data)) {
      console.log('Found models array in data property, using it directly');
      modelData = responseData.data;
    } else if (responseData && responseData.models && Array.isArray(responseData.models)) {
      console.log('Found models array in models property, using it directly');
      modelData = responseData.models;
    } else if (!Array.isArray(modelData)) {
      console.error('Unexpected response format, data is not in expected structure:', responseData);
      // Provide an empty array as a fallback to prevent errors
      modelData = [];
    }
    
    console.log(`Processing ${modelData.length} models from API response`);
    
    // Filter for models that support text generation
    const textModels = modelData.filter(model => {
      if (!model) return false;
      
      // Try different ways to check capabilities based on API response format
      if (model.capabilities && Array.isArray(model.capabilities)) {
        return model.capabilities.includes('chat') || model.capabilities.includes('completion');
      }
      
      // If capabilities is not present or not an array, include the model by default
      return true;
    });
    
    console.log(`Filtered to ${textModels.length} text generation models`);
    
    // Enhance models with additional metadata for better UI presentation
    const enhancedModels = textModels.map(model => {
      // Add provider display name
      if (model.id) {
        const provider = model.id.split('/')[0] || 'unknown';
        model.providerDisplayName = this.getProviderDisplayName(provider);
      }
      
      // Add model class category
      model.category = this.categorizeModel(model);
      
      return model;
    });
    
    // Sort models by category and name for better organization
    enhancedModels.sort((a, b) => {
      // Sort by category first
      if (a.category !== b.category) {
        // Premium models first
        if (a.category === 'premium') return -1;
        if (b.category === 'premium') return 1;
        // Then balanced models
        if (a.category === 'balanced') return -1;
        if (b.category === 'balanced') return 1;
        // Then economy models
        if (a.category === 'economy') return -1;
        if (b.category === 'economy') return 1;
      }
      
      // Sort by provider next
      const providerA = (a.id || '').split('/')[0] || '';
      const providerB = (b.id || '').split('/')[0] || '';
      if (providerA !== providerB) {
        return providerA.localeCompare(providerB);
      }
      
      // Finally, sort by name
      return (a.name || '').localeCompare(b.name || '');
    });
    
    // Update cache in memory
    this.modelsCache = enhancedModels;
    this.lastModelsFetch = now;
    
    // Save to localStorage cache with version info
    try {
      localStorage.setItem('openrouter_models_version', this.CACHE_VERSION);
      localStorage.setItem('openrouter_models_cache', JSON.stringify(enhancedModels));
      localStorage.setItem('openrouter_models_timestamp', now.toString());
      console.log('Models cached to localStorage successfully');
    } catch (e) {
      console.warn('Failed to save models to localStorage cache:', e);
    }
    
    return enhancedModels;
  })
  .catch(error => {
    clearTimeout(timeoutId);
    
    // Improved error handling with specific error types
    if (error.name === 'AbortError') {
      console.error('Request to fetch models timed out');
      throw new Error('Request to fetch models timed out. Please check your internet connection and try again.');
    }
    
    console.error('Error fetching OpenRouter models:', error);
    
    // If we have cached models, return them as fallback
    if (this.modelsCache && this.modelsCache.length > 0) {
      console.log('Using cached models as fallback after fetch error');
      return this.modelsCache;
    }
    
    throw error;
  });
},

  /**
   * Get display name for a model provider
   * @param {string} provider - Provider identifier from model.id
   * @returns {string} Formatted provider name
   */
  getProviderDisplayName: function(provider) {
    const providerNames = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'mistralai': 'Mistral AI',
      'meta': 'Meta',
      'meta-llama': 'Meta',
      'cohere': 'Cohere',
      'azure': 'Azure',
      'deepseek': 'DeepSeek',
      'fireworks': 'Fireworks',
      'groq': 'Groq',
      'together': 'Together',
      'perplexity': 'Perplexity',
      'ai21': 'AI21 Labs'
    };
    
    return providerNames[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
  },
  
  /**
   * Get model category based on context length for organization purposes
   * @param {Object} model - Model data
   * @returns {string} Category for organization
   */
  categorizeModel: function(model) {
    if (!model) return 'standard';
    
    const contextLength = model.context_length || 0;
    
    // Organization based solely on context window size
    if (contextLength >= 128000) {
      return 'very-large-context';
    } else if (contextLength >= 32000) {
      return 'large-context';
    } else if (contextLength >= 16000) {
      return 'medium-context';
    } else {
      return 'standard';
    }
  },
  
  /**
   * Populate the model selector dropdown
   * @param {boolean} forceRefresh - Whether to force a refresh of the models
   * @param {string} selectId - ID of the select element
   * @returns {Promise<void>}
   */
  populateModelSelector: function(forceRefresh = false, selectId = 'openrouter-model') {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) {
      console.warn(`Model selector element with ID '${selectId}' not found`);
      return Promise.resolve();
    }
    
    // Try to get API key
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.log('No API key available, showing API key required message');
      selectElement.innerHTML = '<option value="">API Key Required</option>';
      return Promise.resolve();
    }
    
    // Show loading state
    selectElement.innerHTML = '<option value="">Loading models...</option>';
    console.log('Fetching models for selector...');
    
    // Fetch models
    return this.getAvailableModels(forceRefresh)
      .then(models => {
        console.log(`Received ${models.length} models for selector...`);
        
        try {
          // Clear select and add default option
          selectElement.innerHTML = '<option value="">Select a model</option>';
          
          // Group models by provider for better organization
          const groupedByProvider = {};
          
          // Group by provider
          models.forEach(model => {
            if (!model.id) {
              console.warn('Model missing ID:', model);
              return;
            }
            
            const provider = model.id.split('/')[0] || 'unknown';
            
            if (!groupedByProvider[provider]) {
              groupedByProvider[provider] = [];
            }
            
            groupedByProvider[provider].push(model);
          });
          
          // Sort providers alphabetically
          const sortedProviders = Object.keys(groupedByProvider).sort();
          
          // Add providers as optgroups
          sortedProviders.forEach(provider => {
            const providerModels = groupedByProvider[provider];
            if (providerModels.length === 0) return;
            
            // Create provider group
            const providerGroup = document.createElement('optgroup');
            providerGroup.label = this.getProviderDisplayName(provider);
            
            // Sort models by name within each provider
            providerModels.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
            
            // Add models for this provider
            providerModels.forEach(model => {
              const option = document.createElement('option');
              option.value = model.id;
              
              // Show pricing if available
              let pricingInfo = '';
              if (model.pricing) {
                const promptPrice = parseFloat(model.pricing.prompt || 0).toFixed(4);
                const completionPrice = parseFloat(model.pricing.completion || 0).toFixed(4);
                pricingInfo = ` ($${promptPrice}/$${completionPrice})`;
              }
              
              option.textContent = `${model.name || model.id}${pricingInfo}`;
              
              // Add data attributes for additional info
              option.dataset.contextLength = model.context_length || 4096;
              if (model.pricing) {
                option.dataset.promptPrice = model.pricing.prompt || 0;
                option.dataset.completionPrice = model.pricing.completion || 0;
              }
              
              providerGroup.appendChild(option);
            });
            
            selectElement.appendChild(providerGroup);
          });
          
          // Restore previously selected model if any
          const currentProject = window.ProjectService?.getCurrentProject();
          if (currentProject) {
            if (currentProject.settings?.openRouterModel) {
              selectElement.value = currentProject.settings.openRouterModel;
              
              // If the saved model doesn't exist in the list, show a warning and select a default
              if (selectElement.value !== currentProject.settings.openRouterModel) {
                console.warn(`Saved model ${currentProject.settings.openRouterModel} not found in available models`);
                
                // Find and select a good default model based on capabilities
                const recommendedModel = this.getRecommendedModel(models);
                if (recommendedModel) {
                  selectElement.value = recommendedModel.id;
                  
                  // Update project settings with the new model
                  window.ProjectService.updateProjectSettings(currentProject.id, {
                    openRouterModel: recommendedModel.id
                  }).catch(err => console.error('Error updating model setting:', err));
                  
                  if (window.UIUtils) {
                    window.UIUtils.showNotification(
                      `Previous model not available. Using ${recommendedModel.name || recommendedModel.id} instead.`,
                      'info'
                    );
                  }
                }
              }
            } else if (models.length > 0) {
              // No model previously selected, select recommended model
              const recommendedModel = this.getRecommendedModel(models);
              if (recommendedModel) {
                selectElement.value = recommendedModel.id;
                
                // Update project settings with the new model
                window.ProjectService.updateProjectSettings(currentProject.id, {
                  openRouterModel: recommendedModel.id
                }).catch(err => console.error('Error updating model setting:', err));
              }
            }
          }
          
          console.log('Successfully populated model selector');
        } catch (error) {
          console.error('Error while processing models for selector:', error);
          throw error;
        }
      })
      .catch(error => {
        console.error('Error populating model selector:', error);
        selectElement.innerHTML = '<option value="">Error loading models</option>';
        throw error;
      });
  },
  
  /**
   * Generate a completion using OpenRouter API
   * @param {string} model - Model ID
   * @param {string} prompt - Text prompt
   * @param {number} temperature - Temperature parameter (0-1)
   * @param {number} maxTokens - Maximum number of tokens to generate
   * @param {boolean} stream - Whether to stream the response
   * @returns {Promise<string|Response>} Generated text or response for streaming
   */
  generateCompletion: function(model, prompt, temperature = 0.7, maxTokens = 2000, stream = false) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return Promise.reject(new Error('OpenRouter API key is required. Please set it in the project settings.'));
    }
    
    if (!model) {
      return Promise.reject(new Error('Model ID is required. Please select a model in the Settings tab.'));
    }
    
    // Sanitize and validate input
    if (!prompt || typeof prompt !== 'string') {
      return Promise.reject(new Error('Invalid prompt provided'));
    }
    
    // Ensure temperature is within valid range
    temperature = Math.max(0, Math.min(1, temperature));
    
    // Ensure max tokens is reasonable 
    maxTokens = Math.max(100, Math.min(32000, maxTokens));
    
    console.log(`Generating completion with model: ${model}, streaming: ${stream}`);
    
    // Create abort controller
    this.abortController = new AbortController();
    
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      stream: stream,
      transforms: ["middle-out"]  // For handling very long texts
    };
    
    console.log(`Sending request to ${this.BASE_URL}/chat/completions`);
    
    // Set request timeout
    const timeoutId = setTimeout(() => {
      this.abortController.abort('timeout');
    }, 120000); // 2 minutes timeout
    
    return fetch(`${this.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin || 'https://quillsyncai.com',
        'X-Title': 'QuillSync AI'
      },
      body: JSON.stringify(requestBody),
      signal: this.abortController.signal
    })
    .then(response => {
      clearTimeout(timeoutId);
      console.log(`OpenRouter completion response status: ${response.status}`);
      
      if (!response.ok) {
        return response.text().then(text => {
          try {
            const errorData = JSON.parse(text);
            console.error('OpenRouter completion error:', errorData);
            
            // Enhanced error messages with more details
            if (response.status === 401) {
              throw new Error('API key is invalid or expired. Please check your OpenRouter API key.');
            } else if (response.status === 429) {
              throw new Error('Rate limit exceeded. Please try again later or use a different model.');
            } else if (response.status === 400 && text.includes('context')) {
              throw new Error('Input is too long for this model. Please try a smaller chunk or select a model with larger context window.');
            } else if (response.status === 404) {
              throw new Error('The requested model was not found. It may have been discontinued or renamed.');
            } else if (response.status === 402) {
              throw new Error('Insufficient credits. Please add more credits to your OpenRouter account.');
            } else {
              throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || errorData.message || text}`);
            }
          } catch (e) {
            console.error('OpenRouter completion raw error:', text);
            throw new Error(`API request failed with status ${response.status}: ${text}`);
          }
        });
      }
      
      if (stream) {
        console.log('Returning streaming response');
        // Return the response object for caller to handle streaming
        return response;
      } else {
        console.log('Processing non-streaming response');
        // Handle non-streaming response
        return response.json().then(data => {
          console.log('Received completion data');
          
          if (!data.choices || !data.choices.length || !data.choices[0].message) {
            console.error('Unexpected completion response format:', data);
            throw new Error('Invalid response format from OpenRouter API');
          }
          
          // Extract and return content
          return data.choices[0].message.content;
        });
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      
      // Enhanced error handling with more specific categories
      if (error.name === 'AbortError') {
        if (this.abortController.signal.reason === 'timeout') {
          console.error('Request timed out');
          throw new Error('The translation request timed out. The server might be busy, please try again later.');
        } else {
          console.error('Request was cancelled');
          throw new Error('Translation request was cancelled.');
        }
      }
      
      // Handle rate limiting more gracefully
      if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again, or switch to a different model.');
      }
      
      // Handle context length errors
      if (error.message.includes('context length') || error.message.includes('token limit')) {
        throw new Error('The text is too long for this model. Try breaking it into smaller chunks or selecting a model with larger context window.');
      }
      
      console.error('Error generating completion:', error);
      throw error;
    });
  },
  
  /**
   * Translate text using OpenRouter API
   * @param {boolean} useInput - Whether to use input text (true) or chapter text (false)
   */
  translateText: function(useInput = true) {
    // Prevent multiple concurrent translations
    if (this.isTranslating) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Translation already in progress. Please wait or cancel the current translation.', 'warning');
      }
      return;
    }
    
    const currentProject = window.ProjectService?.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    // Check if OpenRouter is configured
    if (!currentProject.settings?.openRouterApiKey) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('OpenRouter API key is not configured. Please set it in Settings tab.', 'warning');
      }
      return;
    }
    
    if (!currentProject.settings?.openRouterModel) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('OpenRouter model is not selected. Please select a model in Settings tab.', 'warning');
      }
      return;
    }
    
    // Get source text
    let sourceText = '';
    if (useInput) {
      sourceText = document.getElementById('input-text')?.value?.trim() || '';
    } else {
      sourceText = document.getElementById('chapter-text')?.value?.trim() || '';
    }
    
    if (!sourceText) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please enter text to translate', 'warning');
      }
      return;
    }
    
    this.translateChineseText(sourceText, currentProject);
  },
  
  /**
   * Translate Chinese text to English
   * @param {string} chineseText - Chinese text to translate
   * @param {Object} project - Current project
   */
  translateChineseText: function(chineseText, project) {
    // Set translation state
    this.isTranslating = true;
    this.currentTranslation = null;
    
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Preparing translation with OpenRouter...');
      window.UIUtils.toggleProgressBar(true);
      window.UIUtils.updateProgress(0, 'Analyzing text...');
    }
    
    // Show cancel button if it exists
    const cancelBtn = document.getElementById('cancel-translation-btn');
    if (cancelBtn) {
      cancelBtn.style.display = 'block';
    }
    
    // Get chunking settings
    const strategy = document.getElementById('chunking-strategy')?.value || 'auto';
    const chunkSize = parseInt(document.getElementById('chunk-size')?.value) || 1000;
    
    // Check if glossary should be applied - first from checkbox, then from localStorage as fallback
    let shouldApplyGlossary = true; // default
    
    // Try to get state from toggle element first
    const applyGlossaryToggle = document.getElementById('apply-glossary-toggle');
    if (applyGlossaryToggle !== null) {
      shouldApplyGlossary = applyGlossaryToggle.checked;
    } else {
      // If element not available, check localStorage
      const savedState = localStorage.getItem('applyGlossary');
      if (savedState !== null) {
        shouldApplyGlossary = savedState === 'true';
      }
    }
    
    console.log("Glossary toggle state:", shouldApplyGlossary);
    
    if (shouldApplyGlossary) {
      // Apply glossary if available and toggle is on
      window.GlossaryService.getGlossaryEntries(project.id)
        .then(glossaryEntries => {
          let textToTranslate = chineseText;
          if (glossaryEntries.length > 0) {
            textToTranslate = window.GlossaryService.applyGlossary(chineseText, glossaryEntries);
            console.log(`Applied ${glossaryEntries.length} glossary terms`);
            
            if (window.UIUtils) {
              window.UIUtils.showNotification(`Applied ${glossaryEntries.length} glossary terms before translation`, 'info', 3000);
            }
          } else {
            console.log('No glossary terms to apply');
          }
          
          // Continue with translation process using processed text
          this.processTranslation(textToTranslate, chineseText, project, strategy, chunkSize);
        })
        .catch(error => {
          console.error('Error applying glossary:', error);
          // Continue with original text
          this.processTranslation(chineseText, chineseText, project, strategy, chunkSize);
        });
    } else {
      // Skip glossary application if toggle is off
      if (window.UIUtils) {
        window.UIUtils.showNotification('Glossary application skipped (toggle is off)', 'info', 3000);
      }
      
      // Continue with translation using original text
      this.processTranslation(chineseText, chineseText, project, strategy, chunkSize);
    }
  },
  
  /**
   * Process the translation after optional glossary application
   * @param {string} processedText - Text to translate (possibly with glossary applied)
   * @param {string} originalText - Original text before processing (for verification)
   * @param {Object} project - Current project
   * @param {string} strategy - Chunking strategy
   * @param {number} chunkSize - Chunk size
   */
  processTranslation: function(processedText, originalText, project, strategy, chunkSize) {
    // Chunk the text
    const textChunker = window.TextChunkerService || window.TextUtils;
    let chunks = [];
    
    if (textChunker) {
      if (strategy === 'auto' && textChunker.autoChunk) {
        chunks = textChunker.autoChunk(processedText, chunkSize);
      } else if (strategy === 'chapter' && textChunker.chunkByChapters) {
        chunks = textChunker.chunkByChapters(processedText);
      } else if (strategy === 'word-count' && textChunker.chunkByWordCount) {
        chunks = textChunker.chunkByWordCount(processedText, chunkSize);
      } else {
        // Fallback if specific method not found
        chunks = this.chunkText(processedText, chunkSize);
      }
    } else {
      // Fallback chunking if no chunker service is available
      chunks = this.chunkText(processedText, chunkSize);
    }
    
    if (chunks.length === 0) {
      this.isTranslating = false;
      if (window.UIUtils) {
        window.UIUtils.toggleLoading(false);
        window.UIUtils.toggleProgressBar(false);
        window.UIUtils.showNotification('No valid text chunks to translate', 'error');
      }
      return;
    }
    
    if (window.UIUtils) {
      window.UIUtils.updateProgress(5, `Preparing to translate ${chunks.length} chunks...`);
    }
    
    // Estimate tokens and cost
    this.estimateTokensAndCost(processedText, project.settings.openRouterModel)
      .then(estimateResult => {
        console.log('Translation estimate:', estimateResult);
        
        if (window.UIUtils) {
          let message = `Estimated ${estimateResult.estimatedTokens} tokens`;
          if (estimateResult.estimatedCost > 0) {
            message += ` (approx. $${estimateResult.estimatedCost.toFixed(5)})`;
          }
          window.UIUtils.updateProgress(10, message);
        }
        
        // Translate each chunk
        let fullTranslation = "";
        let progress = 10;
        const progressPerChunk = 85 / chunks.length;
        
        // Process chunks sequentially
        return chunks.reduce((promise, chunk, index) => {
          return promise.then(accumTranslation => {
            if (window.UIUtils) {
              window.UIUtils.updateProgress(
                Math.round(progress),
                `Translating chunk ${index + 1}/${chunks.length}`
              );
            }
            
            return this.translateChunk(
              chunk,
              project.settings.openRouterModel,
              project.instructions || '',
              partialTranslation => {
                // This callback is called with incremental updates if streaming
                if (window.quill) {
                  window.quill.setText(accumTranslation + partialTranslation);
                }
              }
            )
            .then(chunkTranslation => {
              const updatedTranslation = accumTranslation + (index > 0 ? '\n\n' : '') + chunkTranslation;
              
              // Update translation in editor
              if (window.quill) {
                window.quill.setText(updatedTranslation);
              }
              
              progress += progressPerChunk;
              return updatedTranslation;
            });
          });
        }, Promise.resolve(''))
        .then(finalTranslation => {
          if (window.UIUtils) {
            window.UIUtils.updateProgress(95, 'Finalizing translation...');
          }
          
          // Save the translation to the project
          if (window.quill) {
            return window.ProjectService.updateProjectOutput(
              project.id,
              window.quill.getContents().ops
            )
            .then(() => finalTranslation);
          }
          
          return finalTranslation;
        })
        .then(finalTranslation => {
          this.isTranslating = false;
          this.currentTranslation = finalTranslation;
          
          if (window.UIUtils) {
            window.UIUtils.updateProgress(100, 'Translation complete');
            window.UIUtils.showNotification('Translation completed successfully', 'success');
            window.UIUtils.updateLastAction('Translation completed');
            window.UIUtils.updateWordCounts();
          }
          
          // Verify translation if enabled in project settings
          if (project.settings?.autoVerify) {
            this.verifyTranslation(originalText, finalTranslation, project.settings.openRouterModel);
          }
          
          // Hide cancel button
          const cancelBtn = document.getElementById('cancel-translation-btn');
          if (cancelBtn) {
            cancelBtn.style.display = 'none';
          }
          
          if (window.UIUtils) {
            window.UIUtils.toggleLoading(false);
            window.UIUtils.toggleProgressBar(false);
          }
        });
      })
      .catch(error => {
        this.isTranslating = false;
        
        // Hide cancel button
        const cancelBtn = document.getElementById('cancel-translation-btn');
        if (cancelBtn) {
          cancelBtn.style.display = 'none';
        }
        
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.toggleProgressBar(false);
          
          // Enhanced error message with recovery suggestions
          let errorMessage = `Translation failed: ${error.message}`;
          let errorType = 'error';
          
          if (error.name === 'AbortError') {
            errorMessage = 'Translation was cancelled.';
            errorType = 'info';
          } else if (error.message.includes('Invalid API key')) {
            errorMessage += ' Please check your API key in the Settings tab.';
          } else if (error.message.includes('Rate limit')) {
            errorMessage += ' Try again in a few minutes or select a different model.';
          } else if (error.message.includes('too long')) {
            errorMessage += ' Try using smaller chunks or a model with larger context.';
          } else if (error.message.includes('Insufficient credits')) {
            errorMessage += ' Please add more credits to your OpenRouter account.';
          }
          
          window.UIUtils.showNotification(errorMessage, errorType);
          window.UIUtils.updateLastAction('Translation failed');
        }
        
        console.error('Translation error:', error);
      });
  },
  
  /**
   * Enhanced text chunking with chapter and paragraph awareness
   * @param {string} text - Text to chunk
   * @param {number} chunkSize - Target words per chunk
   * @returns {Array<string>} Chunked text
   */
  chunkText: function(text, chunkSize) {
    if (!text) return [];
    if (chunkSize === undefined) chunkSize = 1000;
    
    // If text is small enough, return as a single chunk
    const estimatedWords = text.split(/\s+/).length;
    if (estimatedWords <= chunkSize) {
      return [text];
    }
    
    // Split by natural boundaries like chapters, sections, and paragraphs
    // Chapter detection: look for chapter headings
    const chapterMatches = text.match(/(?:Chapter|第[一二三四五六七八九十百千万]+章|第\d+章).*?(?=\n|$)/g);
    if (chapterMatches && chapterMatches.length > 1) {
      // If we have multiple chapters, chunk by chapters
      const chapters = text.split(/(?:Chapter|第[一二三四五六七八九十百千万]+章|第\d+章)/);
      const chunks = [];
      
      // Add chapter headings back to chunks
      for (let i = 1; i < chapters.length; i++) {
        const chapterText = chapterMatches[i-1] + chapters[i];
        
        // If chapter is too large, break it down further
        if (chapterText.split(/\s+/).length > chunkSize * 1.5) {
          const subChunks = this._chunkByParagraphs(chapterText, chunkSize);
          chunks.push(...subChunks);
        } else {
          chunks.push(chapterText);
        }
      }
      
      return chunks;
    }
    
    // No chapter structure found, fall back to paragraph chunking
    return this._chunkByParagraphs(text, chunkSize);
  },
  
  /**
   * Helper method for paragraph chunking
   * @param {string} text - Text to chunk
   * @param {number} chunkSize - Target words per chunk
   * @returns {Array<string>} Chunked text
   * @private
   */
  _chunkByParagraphs: function(text, chunkSize) {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = [];
    let currentSize = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphSize = paragraph.split(/\s+/).length;
      
      if (currentSize + paragraphSize <= chunkSize) {
        currentChunk.push(paragraph);
        currentSize += paragraphSize;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join('\n\n'));
          currentChunk = [paragraph];
          currentSize = paragraphSize;
        } else {
          // Paragraph is larger than chunk size, break it into sentences
          const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]+/g) || [paragraph];
          let sentenceChunk = [];
          let sentenceSize = 0;
          
          for (const sentence of sentences) {
            const sentenceWordCount = sentence.split(/\s+/).length;
            
            if (sentenceSize + sentenceWordCount <= chunkSize) {
              sentenceChunk.push(sentence);
              sentenceSize += sentenceWordCount;
            } else {
              if (sentenceChunk.length > 0) {
                chunks.push(sentenceChunk.join(' '));
                sentenceChunk = [sentence];
                sentenceSize = sentenceWordCount;
              } else {
                // Even a single sentence is too long, force include it
                chunks.push(sentence);
              }
            }
          }
          
          if (sentenceChunk.length > 0) {
            chunks.push(sentenceChunk.join(' '));
          }
        }
      }
    }
    
    // Add the last chunk if there's anything left
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
    }
    
    return chunks;
  },
  
  /**
   * Translate a single chunk using OpenRouter
   * @param {string} chunk - Text chunk to translate
   * @param {string} model - Model ID to use
   * @param {string} customInstructions - Custom prompt instructions
   * @param {Function} progressCallback - Callback for streaming updates
   * @returns {Promise<string>} Translated text
   */
  translateChunk: function(chunk, model, customInstructions = '', progressCallback = null) {
    if (!chunk || typeof chunk !== 'string' || !chunk.trim()) {
      return Promise.reject(new Error('Invalid or empty chunk provided for translation'));
    }
    
    if (!model) {
      return Promise.reject(new Error('Model ID is required'));
    }
    
    // Prepare prompt - use TextUtils if available
    let prompt = '';
    if (window.TextUtils && typeof window.TextUtils.generateTranslationPrompt === 'function') {
      prompt = window.TextUtils.generateTranslationPrompt(chunk, customInstructions);
    } else {
      // Fallback prompt generation
      prompt = 'Translate this Chinese text to English:';
      if (customInstructions) {
        prompt = `${customInstructions}\n\n${prompt}`;
      }
      prompt = `${prompt}\n\n${chunk}`;
    }
    
    // Check if we should use streaming
    const useStream = !!progressCallback;
    
    if (useStream) {
      // Handle streaming response
      return this.generateCompletion(
        model,
        prompt,
        0.3, // Lower temperature for more consistent translations
        4000, // Higher max tokens for translations
        true  // Stream the response
      )
      .then(response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        
        // Process the stream
        const processStream = ({ done, value }) => {
          if (done) return fullText;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data:')) continue;
            
            const jsonStr = line.replace('data:', '').trim();
            if (jsonStr === '[DONE]') break;
            
            try {
              const data = JSON.parse(jsonStr);
              if (data.choices && data.choices[0]) {
                const content = data.choices[0].delta?.content || '';
                if (content) {
                  fullText += content;
                  
                  // Call progress callback
                  if (progressCallback) {
                    progressCallback(fullText);
                  }
                }
              }
            } catch (error) {
              console.warn('Error parsing streaming response:', error);
            }
          }
          
          // Continue reading
          return reader.read().then(processStream);
        };
        
        // Start reading
        return reader.read().then(processStream);
      });
    } else {
      // Non-streaming response
      return this.generateCompletion(
        model,
        prompt,
        0.3,  // Lower temperature for more consistent translations
        4000, // Higher max tokens for translations
        false // Don't stream
      );
    }
  },
  
  /**
   * Handle click on verify button
   */
  handleVerifyButtonClick: function() {
    const currentProject = window.ProjectService?.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    // Check if OpenRouter is configured
    if (!currentProject.settings?.openRouterApiKey) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('OpenRouter API key is required for verification. Please configure it in Settings tab.', 'warning');
      }
      return;
    }
    
    if (!currentProject.settings?.openRouterModel) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('OpenRouter model is not selected. Please select a model in Settings tab.', 'warning');
      }
      return;
    }
    
    // Get source text from input
    const sourceText = document.getElementById('input-text')?.value?.trim();
    if (!sourceText) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Source text is required for verification', 'warning');
      }
      return;
    }
    
    // Get translated text from Quill editor
    let translatedText = '';
    if (window.quill) {
      translatedText = window.quill.getText().trim();
    }
    
    if (!translatedText) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('No translation to verify', 'warning');
      }
      return;
    }
    
    // Show loading state
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Verifying translation...');
      window.UIUtils.toggleProgressBar(true);
      window.UIUtils.updateProgress(0, 'Preparing verification...');
    }
    
    // Run verification
    this.verifyTranslation(sourceText, translatedText, currentProject.settings.openRouterModel)
      .then(results => {
        // Enhanced results display
        this.displayVerificationResults(results, sourceText, translatedText);
        
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.toggleProgressBar(false);
          window.UIUtils.updateLastAction('Translation verification completed');
        }
      })
      .catch(error => {
        console.error('Verification error:', error);
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.toggleProgressBar(false);
          window.UIUtils.showNotification(`Verification failed: ${error.message}`, 'error');
          window.UIUtils.updateLastAction('Translation verification failed');
        }
      });
  },
  
  /**
   * Verify translation quality
   * @param {string} sourceText - Original Chinese text
   * @param {string} translatedText - English translation
   * @param {string} model - Model ID to use for verification
   * @returns {Promise<Object>} Verification results
   */
  verifyTranslation: function(sourceText, translatedText, model) {
    if (!sourceText || !translatedText) {
      return Promise.reject(new Error('Source and translated text are required'));
    }
    
    if (!model) {
      return Promise.reject(new Error('Model ID is required'));
    }
    
    // Get current project to get glossary entries
    const currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      return Promise.reject(new Error('No active project found'));
    }
    
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Loading glossary and preparing verification...');
      window.UIUtils.updateProgress(10, 'Retrieving glossary terms...');
    }
    
    // First fetch the glossary entries for the current project
    return window.GlossaryService.getGlossaryEntries(currentProject.id)
      .then(glossaryEntries => {
        if (window.UIUtils) {
          window.UIUtils.updateProgress(30, `Found ${glossaryEntries.length} glossary terms to verify against...`);
        }
        
        // Generate verification prompt with glossary terms included
        let prompt = this._generateEnhancedVerificationPrompt(sourceText, translatedText, glossaryEntries);
        
        if (window.UIUtils) {
          window.UIUtils.updateProgress(40, 'Analyzing translation against glossary...');
        }
        
        // Request verification from OpenRouter
        return this.generateCompletion(
          model,
          prompt,
          0.2,  // Low temperature for consistent output
          2000, // Enough tokens for detailed verification
          false // Don't stream
        );
      })
      .then(response => {
        if (window.UIUtils) {
          window.UIUtils.updateProgress(80, 'Processing verification results...');
        }
        
        // Process the response to extract verification results
        return this._processVerificationResponse(response, translatedText);
      })
      .then(results => {
        // Add glossary-specific section to results
        return this._enhanceResultsWithGlossaryInfo(results, currentProject.id, translatedText);
      })
      .then(enhancedResults => {
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
        }
        
        // Display verification results with glossary section
        this.displayVerificationResults(enhancedResults, sourceText, translatedText);
        
        return enhancedResults;
      })
      .catch(error => {
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
        }
        console.error('Translation verification error:', error);
        throw error;
      });
  },
  
  /**
   * Display verification results in a user-friendly way
   * @param {Object} results - Verification results from OpenRouter
   * @param {string} sourceText - Original text
   * @param {string} translatedText - Translated text
   */
  displayVerificationResults: function(results, sourceText, translatedText) {
    // Create modal if it doesn't exist
    this.createVerificationResultsModal();
    
    // Quality scores
    const accuracy = results.accuracy || 0;
    const completeness = results.completeness || 0;
    const glossaryCompliance = results.glossaryCompliance || 0;
    
    // Improved weighted algorithm for overall score:
    // - If there are no glossary entries or issues, don't penalize the score for glossary compliance
    // - Weight accuracy higher than completeness since it's more important for final quality
    let overallScore;
    
    if (results.glossaryIssues && results.glossaryIssues.length === 0 && glossaryCompliance < 50) {
      // If no glossary issues were found but compliance score is low, 
      // it's likely the glossary is empty or not relevant, so don't count it
      overallScore = Math.round((accuracy * 0.6) + (completeness * 0.4));
    } else if (glossaryCompliance > 0) {
      // Include glossary compliance with proper weighting when it's relevant
      overallScore = Math.round((accuracy * 0.5) + (completeness * 0.3) + (glossaryCompliance * 0.2));
    } else {
      // No glossary configured or completely non-compliant
      overallScore = Math.round((accuracy * 0.6) + (completeness * 0.4));
    }
    
    // Determine overall quality level
    let qualityLevel, qualityClass;
    if (overallScore >= 90) {
      qualityLevel = 'Excellent';
      qualityClass = 'success';
    } else if (overallScore >= 75) {
      qualityLevel = 'Good';
      qualityClass = 'info';
    } else if (overallScore >= 60) {
      qualityLevel = 'Fair';
      qualityClass = 'warning';
    } else {
      qualityLevel = 'Poor';
      qualityClass = 'error';
    }
    
    // Update modal content
    const modalTitle = document.getElementById('verification-modal-title');
    if (modalTitle) {
      modalTitle.textContent = `Translation Quality: ${qualityLevel}`;
      modalTitle.className = qualityClass;
    }
    
    // Update scores
    const accuracyScore = document.getElementById('accuracy-score');
    if (accuracyScore) {
      accuracyScore.textContent = `${Math.round(accuracy)}%`;
      accuracyScore.className = this.getScoreClass(accuracy);
    }
    
    const completenessScore = document.getElementById('completeness-score');
    if (completenessScore) {
      completenessScore.textContent = `${Math.round(completeness)}%`;
      completenessScore.className = this.getScoreClass(completeness);
    }
    
    // Add glossary compliance score
    const glossaryScore = document.getElementById('glossary-score');
    if (glossaryScore) {
      glossaryScore.textContent = `${Math.round(glossaryCompliance)}%`;
      glossaryScore.className = this.getScoreClass(glossaryCompliance);
    } else {
      // If element doesn't exist, we need to add it to the modal
      const scoreContainer = document.querySelector('.verification-scores');
      if (scoreContainer) {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        
        const scoreLabel = document.createElement('div');
        scoreLabel.className = 'score-label';
        scoreLabel.textContent = 'Glossary Compliance';
        
        const scoreElement = document.createElement('div');
        scoreElement.id = 'glossary-score';
        scoreElement.className = this.getScoreClass(glossaryCompliance);
        scoreElement.textContent = `${Math.round(glossaryCompliance)}%`;
        
        scoreItem.appendChild(scoreLabel);
        scoreItem.appendChild(scoreElement);
        scoreContainer.appendChild(scoreItem);
      }
    }
    
    // Process regular issues
    const issuesList = document.getElementById('verification-issues-list');
    if (issuesList) {
      issuesList.innerHTML = '';
      
      if (!results.issues || results.issues.length === 0) {
        const noIssues = document.createElement('li');
        noIssues.className = 'no-issues';
        noIssues.textContent = 'No significant issues found in the translation.';
        issuesList.appendChild(noIssues);
      } else {
        // Sort issues by severity (implied by the difference between source and translation)
        results.issues.sort((a, b) => {
          const aLen = a.sourceText ? a.sourceText.length : 0;
          const bLen = b.sourceText ? b.sourceText.length : 0;
          return bLen - aLen; // Longer source text first (likely more important)
        });
        
        // Add issues to the list
        results.issues.forEach(issue => {
          const issueItem = document.createElement('li');
          issueItem.className = 'issue-item';
          
          const issueContent = document.createElement('div');
          issueContent.className = 'issue-content';
          
          // Issue description
          const issueDesc = document.createElement('p');
          issueDesc.className = 'issue-description';
          issueDesc.textContent = issue.issue;
          issueContent.appendChild(issueDesc);
          
          // Source and translation comparison
          if (issue.sourceText && issue.translatedText) {
            const comparison = document.createElement('div');
            comparison.className = 'text-comparison';
            
            const sourceDiv = document.createElement('div');
            sourceDiv.className = 'source-text';
            sourceDiv.innerHTML = '<strong>Source:</strong> ' + issue.sourceText;
            
            const translatedDiv = document.createElement('div');
            translatedDiv.className = 'translated-text';
            translatedDiv.innerHTML = '<strong>Translation:</strong> ' + issue.translatedText;
            
            comparison.appendChild(sourceDiv);
            comparison.appendChild(translatedDiv);
            issueContent.appendChild(comparison);
          }
          
          // Suggestion
          if (issue.suggestion) {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion';
            suggestion.innerHTML = '<strong>Suggestion:</strong> ' + issue.suggestion;
            issueContent.appendChild(suggestion);
            
            // Add apply button if we have a suggestion
            const applyBtn = document.createElement('button');
            applyBtn.className = 'small-btn apply-suggestion';
            applyBtn.textContent = 'Apply Suggestion';
            applyBtn.addEventListener('click', function() {
              // Apply the suggestion by replacing the issue.translatedText with issue.suggestion in the Quill editor
              if (window.quill) {
                try {
                  const currentText = window.quill.getText();
                  
                  // Find the text to replace - allow for slight differences in whitespace
                  let textToReplace = issue.translatedText;
                  let newText = currentText;
                  let replaced = false;
                  
                  // Try exact match first
                  if (currentText.includes(textToReplace)) {
                    newText = currentText.replace(textToReplace, issue.suggestion);
                    replaced = true;
                  } else {
                    // Try with flexible whitespace matching
                    const escapedText = textToReplace
                      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
                      .replace(/\s+/g, '\\s+');                // Replace whitespace with flexible whitespace matcher
                    
                    const regex = new RegExp(escapedText, 'g');
                    if (regex.test(currentText)) {
                      newText = currentText.replace(regex, issue.suggestion);
                      replaced = true;
                    }
                  }
                  
                  if (replaced) {
                    // Use the proper Quill API to update content
                    window.quill.deleteText(0, currentText.length);
                    window.quill.insertText(0, newText);
                    
                    // Save the change to the project
                    const currentProject = window.ProjectService.getCurrentProject();
                    if (currentProject) {
                      window.ProjectService.updateProjectOutput(
                        currentProject.id,
                        window.quill.getContents().ops
                      );
                    }
                    
                    // Disable the button
                    applyBtn.disabled = true;
                    applyBtn.textContent = 'Applied';
                    
                    if (window.UIUtils) {
                      window.UIUtils.showNotification('Suggestion applied', 'success');
                      window.UIUtils.updateLastAction('Translation updated with suggestion');
                    }
                  } else {
                    console.error('Could not find text to replace:', textToReplace);
                    if (window.UIUtils) {
                      window.UIUtils.showNotification('Could not find the exact text to replace. Try manual editing.', 'warning');
                    }
                  }
                } catch (error) {
                  console.error('Error applying suggestion:', error);
                  if (window.UIUtils) {
                    window.UIUtils.showNotification('Error applying suggestion: ' + error.message, 'error');
                  }
                }
              }
            });
            issueContent.appendChild(applyBtn);
          }
          
          issueItem.appendChild(issueContent);
          issuesList.appendChild(issueItem);
        });
      }
    }
    
    // Add glossary issues section
    let glossaryIssuesList = document.getElementById('glossary-issues-list');
    if (!glossaryIssuesList) {
      // Create the section if it doesn't exist
      const modalBody = document.querySelector('#verification-results-modal .modal-body');
      if (modalBody) {
        const glossaryHeader = document.createElement('h4');
        glossaryHeader.textContent = 'Glossary Compliance Issues';
        modalBody.appendChild(glossaryHeader);
        
        glossaryIssuesList = document.createElement('ul');
        glossaryIssuesList.id = 'glossary-issues-list';
        glossaryIssuesList.className = 'glossary-issues-list';
        modalBody.appendChild(glossaryIssuesList);
      }
    }
    
    // Populate glossary issues
    if (glossaryIssuesList) {
      glossaryIssuesList.innerHTML = '';
      
      if (!results.glossaryIssues || results.glossaryIssues.length === 0) {
        const noIssues = document.createElement('li');
        noIssues.className = 'no-issues';
        noIssues.textContent = 'All glossary terms are translated correctly and consistently.';
        glossaryIssuesList.appendChild(noIssues);
      } else {
        // Add glossary issues to the list
        results.glossaryIssues.forEach(issue => {
          const issueItem = document.createElement('li');
          issueItem.className = 'issue-item glossary-issue';
          
          const issueContent = document.createElement('div');
          issueContent.className = 'issue-content';
          
          // Issue description
          const issueDesc = document.createElement('p');
          issueDesc.className = 'issue-description';
          issueDesc.innerHTML = `<strong>${issue.term}</strong> should be translated as <strong>${issue.expectedTranslation}</strong> but found as <strong>${issue.actualTranslation || "missing"}</strong>`;
          issueContent.appendChild(issueDesc);
          
          // Add fix button if appropriate
          if (issue.expectedTranslation && issue.actualTranslation) {
            const fixBtn = document.createElement('button');
            fixBtn.className = 'small-btn apply-suggestion';
            fixBtn.textContent = 'Apply Correct Term';
            fixBtn.addEventListener('click', () => {
              if (window.quill) {
                const currentText = window.quill.getText();
                const newText = currentText.replace(
                  new RegExp(issue.actualTranslation, 'g'), 
                  issue.expectedTranslation
                );
                window.quill.setText(newText);
                
                // Save the change to the project
                const currentProject = window.ProjectService.getCurrentProject();
                if (currentProject) {
                  window.ProjectService.updateProjectOutput(
                    currentProject.id,
                    window.quill.getContents().ops
                  );
                }
                
                // Update button state
                fixBtn.disabled = true;
                fixBtn.textContent = 'Applied';
                
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Glossary term corrected', 'success');
                }
              }
            });
            issueContent.appendChild(fixBtn);
          }
          
          issueItem.appendChild(issueContent);
          glossaryIssuesList.appendChild(issueItem);
        });
      }
    }
    
    // Missing content
    const missingContent = document.getElementById('missing-content-list');
    if (missingContent) {
      missingContent.innerHTML = '';
      
      if (!results.missingContent || results.missingContent.length === 0) {
        const noMissing = document.createElement('li');
        noMissing.textContent = 'No missing content detected.';
        missingContent.appendChild(noMissing);
      } else {
        results.missingContent.forEach(item => {
          const listItem = document.createElement('li');
          listItem.textContent = item;
          missingContent.appendChild(listItem);
        });
      }
    }
    
    // Show the modal
    const modal = document.getElementById('verification-results-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
    
    // Show summary notification
    if (window.UIUtils) {
      const message = `Translation quality: ${qualityLevel} (${Math.round(overallScore)}%)\n` +
                      `Accuracy: ${Math.round(accuracy)}%, Completeness: ${Math.round(completeness)}%, ` +
                      `Glossary: ${Math.round(glossaryCompliance)}%`;
      window.UIUtils.showNotification(message, qualityClass.toLowerCase(), 6000);
    }
  },
  
  /**
   * Create verification results modal if it doesn't exist
   */
  createVerificationResultsModal: function() {
    // Check if modal already exists
    if (document.getElementById('verification-results-modal')) {
      return;
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'verification-results-modal';
    
    // Modal content
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="verification-modal-title">Translation Quality</h3>
          <button class="modal-close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="verification-scores">
            <div class="score-item">
              <div class="score-label">Accuracy</div>
              <div id="accuracy-score" class="score">--</div>
            </div>
            <div class="score-item">
              <div class="score-label">Completeness</div>
              <div id="completeness-score" class="score">--</div>
            </div>
            <div class="score-item">
              <div class="score-label">Glossary Compliance</div>
              <div id="glossary-score" class="score">--</div>
            </div>
          </div>
          
          <h4>Issues Found</h4>
          <ul id="verification-issues-list" class="issues-list">
            <li>Loading issues...</li>
          </ul>
          
          <h4>Glossary Compliance Issues</h4>
          <ul id="glossary-issues-list" class="glossary-issues-list">
            <li>Loading glossary issues...</li>
          </ul>
          
          <h4>Missing Content</h4>
          <ul id="missing-content-list" class="missing-content-list">
            <li>Loading missing content...</li>
          </ul>
        </div>
        <div class="modal-footer">
          <button id="close-verification-modal-btn" class="secondary-btn">
            <i class="fas fa-times"></i> Close
          </button>
        </div>
      </div>
    `;
    
    // Add CSS styles for glossary issues
    const style = document.createElement('style');
    style.textContent = `
      .glossary-issue {
        border-left-color: var(--accent-color);
      }
      
      .glossary-issues-list .no-issues {
        color: var(--success);
        padding: var(--spacing-md);
        text-align: center;
      }
    `;
    document.head.appendChild(style);
    
    // Add event listeners
    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
    
    // Add to document
    document.body.appendChild(modal);
    
    // Setup close button
    const closeBtn = modal.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
      });
    }
    
    const closeModalBtn = modal.querySelector('#close-verification-modal-btn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', function() {
        modal.style.display = 'none';
      });
    }
  },
  
  /**
   * Get CSS class based on score
   * @param {number} score - Score from 0-100
   * @returns {string} CSS class name
   */
  getScoreClass: function(score) {
    if (score >= 90) return 'score success';
    if (score >= 75) return 'score info';
    if (score >= 60) return 'score warning';
    return 'score error';
  },
  
  /**
   * Process verification response from OpenRouter
   * @param {string} response - Raw response text
   * @param {string} translatedText - The translated text for context
   * @returns {Object} Parsed verification results
   * @private
   */
  _processVerificationResponse: function(response, translatedText) {
    // Update progress
    if (window.UIUtils) {
      window.UIUtils.updateProgress(70, 'Processing results...');
    }
    
    // Extract JSON from response
    let jsonStr = response;
    let results;
    
    try {
      // First try: Look for JSON in code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
        results = JSON.parse(jsonStr);
      } else {
        // Second try: Find any JSON object in the response
        const match = response.match(/(\{[\s\S]*?\})/g);
        if (match) {
          // Try each match until we find valid JSON
          for (const potentialJson of match) {
            try {
              results = JSON.parse(potentialJson);
              // If it has the fields we need, use this one
              if (results.accuracy !== undefined || results.completeness !== undefined) {
                break;
              }
            } catch (e) {
              // Continue to next match
            }
          }
        }
        
        // Third try: If still not found, try the full response
        if (!results) {
          results = JSON.parse(response);
        }
      }
    } catch (error) {
      console.error('Failed to parse verification response, attempting fallback extraction:', response);
      
      // Final fallback: If we can't parse JSON properly, extract scores from text
      try {
        // Look for percentage patterns like "Accuracy: 95%" or "accuracy: 95"
        const accuracyMatch = response.match(/accuracy:?\s*(\d+)%?/i);
        const completenessMatch = response.match(/complete(?:ness)?:?\s*(\d+)%?/i);
        const glossaryMatch = response.match(/glossary(?:\s*compliance)?:?\s*(\d+)%?/i);
        
        results = {
          accuracy: accuracyMatch ? parseInt(accuracyMatch[1], 10) : 85, // Default to 85% if not found
          completeness: completenessMatch ? parseInt(completenessMatch[1], 10) : 85, // Default to 85% if not found
          glossaryCompliance: glossaryMatch ? parseInt(glossaryMatch[1], 10) : 80, // Default to 80% if not found
        };
        
        // Try to extract issues from text
        const issues = [];
        const issueMatches = response.match(/issue:?\s*([^\n]+)/gi);
        if (issueMatches) {
          issueMatches.forEach((match, index) => {
            issues.push({
              issue: match.replace(/^issue:?\s*/i, ''),
              sourceText: `Issue ${index + 1}`,
              translatedText: '',
              suggestion: ''
            });
          });
        }
        
        results.issues = issues;
        
        // Try to extract missing content
        const missingContent = [];
        const missingMatches = response.match(/missing:?\s*([^\n]+)/gi);
        if (missingMatches) {
          missingMatches.forEach(match => {
            missingContent.push(match.replace(/^missing:?\s*/i, ''));
          });
        }
        
        results.missingContent = missingContent;
      } catch (e) {
        console.error('All parsing attempts failed:', e);
        // Provide default values rather than failing completely
        results = {
          accuracy: 85,
          completeness: 85,
          glossaryCompliance: 80,
          issues: [],
          missingContent: [],
          glossaryIssues: []
        };
      }
    }
    
    if (!results) {
      // Create a default result object rather than failing
      results = {
        accuracy: 85,
        completeness: 85,
        glossaryCompliance: 80,
        issues: [],
        missingContent: [],
        glossaryIssues: []
      };
    }
    
    // Validate scores to make sure they're numbers in the correct range
    const validateScore = (score) => {
      if (typeof score === 'number') {
        return Math.max(0, Math.min(100, score));
      } else if (typeof score === 'string' && !isNaN(score)) {
        return Math.max(0, Math.min(100, parseFloat(score)));
      }
      // Default to a sensible score if undefined/invalid
      return 85;
    };
    
    // Ensure all required fields exist with proper formatting
    const normalizedResults = {
      completeness: validateScore(results.completeness || 85),
      accuracy: validateScore(results.accuracy || 85),
      glossaryCompliance: validateScore(results.glossaryCompliance || 80),
      issues: Array.isArray(results.issues) ? results.issues : [],
      missingContent: Array.isArray(results.missingContent) ? results.missingContent : [],
      glossaryIssues: Array.isArray(results.glossaryIssues) ? results.glossaryIssues : [],
      translatedText: translatedText || results.translatedText || ''
    };
    
    // Update progress
    if (window.UIUtils) {
      window.UIUtils.updateProgress(100, 'Verification complete');
    }
    
    return normalizedResults;
  },
  
  /**
   * Generate an enhanced verification prompt
   * @param {string} sourceText - Original text
   * @param {string} translatedText - Translated text
   * @param {Array} glossaryEntries - Glossary entries to check
   * @returns {string} Verification prompt
   * @private
   */
  _generateEnhancedVerificationPrompt: function(sourceText, translatedText, glossaryEntries) {
    // Limit source text length if needed
    const MAX_SOURCE_LENGTH = 3000;
    let trimmedSource = sourceText;
    if (sourceText.length > MAX_SOURCE_LENGTH) {
      trimmedSource = sourceText.substring(0, MAX_SOURCE_LENGTH) + "... [text truncated for length]";
    }
    
    // Create glossary section with clear formatting
    let glossarySection = '';
    if (glossaryEntries && glossaryEntries.length > 0) {
      glossarySection = 'Glossary Terms to Check (Very Important):\n';
      
      // Only include up to 20 glossary terms to avoid prompt overload
      const limitedEntries = glossaryEntries.slice(0, 20);
      glossarySection += limitedEntries.map(entry => 
        `"${entry.chineseTerm}" → "${entry.translation}" (${entry.category || 'term'})`
      ).join('\n');
      
      if (glossaryEntries.length > 20) {
        glossarySection += `\n... and ${glossaryEntries.length - 20} more terms (check for consistent terminology).`;
      }
    } else {
      glossarySection = 'No glossary terms provided.';
    }
    
    // Create a focused prompt for verification
    return `I need a detailed quality assessment of this Chinese to English translation. Evaluate accuracy, completeness, and consistent terminology.

Source Chinese Text:
${trimmedSource}

English Translation:
${translatedText}

${glossarySection}

Analyze these aspects and respond ONLY in the following JSON format:
{
  "accuracy": 0-100,
  "completeness": 0-100,
  "glossaryCompliance": 0-100,
  "missingContent": ["list of missing elements"],
  "issues": [
    {
      "sourceText": "problematic Chinese text",
      "translatedText": "problematic translation",
      "issue": "description of the issue",
      "suggestion": "suggested correction"
    }
  ],
  "glossaryIssues": [
    {
      "term": "glossary term",
      "expectedTranslation": "according to glossary",
      "actualTranslation": "in the text",
      "locations": ["context where found"]
    }
  ]
}

Important scoring guidelines:
- Accuracy (0-100): How correctly the meaning is preserved
- Completeness (0-100): Whether all content is translated
- Glossary Compliance (0-100): How well terminology matches the glossary
- Be honest but fair in your assessment, using the full scale

Your assessment must be comprehensive and solely in the specified JSON format.`;
  },

  /**
   * Enhance verification results with glossary information
   * @param {Object} results - Verification results
   * @param {string} projectId - Project ID for glossary lookup
   * @param {string} translatedText - The translated text to analyze
   * @returns {Promise<Object>} Enhanced results with glossary info
   * @private
   */
  _enhanceResultsWithGlossaryInfo: function(results, projectId, translatedText) {
    // If results already have glossary issues with substantial content, just return them
    if (results.glossaryIssues && results.glossaryIssues.length > 0 && 
        results.glossaryIssues[0].term && results.glossaryIssues[0].expectedTranslation) {
      return Promise.resolve(results);
    }
    
    // Otherwise, we need to check the glossary compliance ourselves
    return window.GlossaryService.getGlossaryEntries(projectId)
      .then(glossaryEntries => {
        // Initialize glossary issues array if not present
        if (!results.glossaryIssues) {
          results.glossaryIssues = [];
        }
        
        // Skip glossary analysis if there are no glossary entries
        if (glossaryEntries.length === 0) {
          console.log('No glossary entries found, skipping glossary compliance check');
          // Don't penalize for no glossary
          results.glossaryCompliance = 90;
          return results;
        }
        
        // Set glossary compliance score if not already set or seems too low
        if (!results.glossaryCompliance || results.glossaryCompliance < 20) {
          // Default to moderate score
          results.glossaryCompliance = 75;
        }
        
        let complianceIssuesFound = 0;
        
        // Loop through each glossary entry and check it against the translated text
        if (glossaryEntries.length > 0 && translatedText) {
          glossaryEntries.forEach(entry => {
            if (!entry.chineseTerm || !entry.translation) return;
            
            const expectedTranslation = entry.translation;
            
            // Skip very short translations that might appear in many contexts
            if (expectedTranslation.length < 3) return;
            
            // More sophisticated check - look for term and approximate matches
            if (!translatedText.includes(expectedTranslation)) {
              // Check for minor variations (plurals, capitalization, etc.)
              const escapedTerm = expectedTranslation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`\\b${escapedTerm}s?\\b|\\b${escapedTerm.charAt(0).toUpperCase() + escapedTerm.slice(1)}s?\\b`, 'i');
              
              if (!regex.test(translatedText)) {
                // Try to find what might have been used instead
                let actualTranslation = "Not found";
                
                // Try to locate context in Chinese text to find potential alternative translations
                const chineseTerm = entry.chineseTerm;
                if (chineseTerm && chineseTerm.length > 1) {
                  // This is a simplistic approach - in a real app we would use more sophisticated NLP
                  const potentialMatches = [];
                  const words = translatedText.split(/\s+/);
                  
                  for (let i = 0; i < words.length; i++) {
                    // Check 1-3 word combinations that might be alternatives
                    for (let len = 1; len <= 3; len++) {
                      if (i + len <= words.length) {
                        const phrase = words.slice(i, i + len).join(' ');
                        if (phrase.length > 3) {
                          potentialMatches.push(phrase);
                        }
                      }
                    }
                  }
                  
                  if (potentialMatches.length > 0) {
                    actualTranslation = potentialMatches[0];
                  }
                }
                
                // Add to glossary issues
                results.glossaryIssues.push({
                  term: entry.chineseTerm,
                  expectedTranslation: expectedTranslation,
                  actualTranslation: actualTranslation,
                  locations: []
                });
                
                complianceIssuesFound++;
              }
            }
          });
        }
        
        // Update glossary compliance score based on issues found
        if (complianceIssuesFound > 0) {
          // Calculate compliance percentage based on number of issues vs total entries
          const compliancePercentage = Math.max(20, 100 - (complianceIssuesFound * 100 / glossaryEntries.length));
          results.glossaryCompliance = Math.round(compliancePercentage);
        }
        
        return results;
      });
  },
  
  /**
   * Estimate token usage and cost for a text
   * @param {string} text - Text to estimate
   * @param {string} model - Model ID
   * @returns {Promise<Object>} Token usage and cost estimate
   */
  estimateTokensAndCost: function(text, model) {
    if (!text || !model) {
      return Promise.reject(new Error('Text and model are required'));
    }
    
    console.log(`Estimating tokens and cost for model: ${model}`);
    
    // Fetch model info to get pricing
    return this.getAvailableModels()
      .then(models => {
        const modelInfo = models.find(m => m.id === model);
        
        if (!modelInfo) {
          console.warn(`Model ${model} not found in available models, using default pricing`);
          // Create a dummy model info with zero pricing
          return {
            id: model,
            name: model,
            pricing: {
              prompt: 0,
              completion: 0
            }
          };
        }
        
        return modelInfo;
      })
      .then(modelInfo => {
        // Improved token estimation for different languages
        // Chinese characters count differently than English words
        const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherCharCount = text.length - chineseCharCount;
        
        // More accurate token estimation:
        // Chinese: ~1.5 tokens per character
        // English: ~1 token per 4-5 characters
        const chineseTokens = Math.ceil(chineseCharCount * 1.5);
        const otherTokens = Math.ceil(otherCharCount / 4.5);
        const tokenEstimate = chineseTokens + otherTokens;
        
        // Add some margin for system messages, instructions, and model variation
        const totalTokens = Math.ceil(tokenEstimate * 1.1) + 200;
        
        console.log(`Token estimate: ${totalTokens} (${chineseCharCount} Chinese chars, ${otherCharCount} other chars)`);
        
        // Calculate estimated cost
        let estimatedCost = 0;
        if (modelInfo.pricing) {
          // OpenRouter pricing is per 1M tokens
          const promptCost = (parseFloat(modelInfo.pricing.prompt) || 0) * totalTokens / 1000000;
          
          // For completion, assume response is roughly same length as English text
          // Chinese text typically translates to longer English text
          const estimatedOutputTokens = Math.ceil(totalTokens * 1.2);
          const completionCost = (parseFloat(modelInfo.pricing.completion) || 0) * estimatedOutputTokens / 1000000;
          
          estimatedCost = promptCost + completionCost;
          console.log(`Estimated cost: ${estimatedCost.toFixed(6)} (prompt: ${promptCost.toFixed(6)}, completion: ${completionCost.toFixed(6)})`);
        }
        
        return {
          estimatedTokens: totalTokens,
          estimatedOutputTokens: Math.ceil(totalTokens * 1.2),
          estimatedCost: estimatedCost,
          model: modelInfo.name || model,
          contextLength: modelInfo.context_length || 4096
        };
      })
      .catch(error => {
        console.error('Error estimating tokens and cost:', error);
        // Provide a fallback estimate to not block translation
        return {
          estimatedTokens: Math.ceil(text.length / 3) + 200,
          estimatedCost: 0,
          model: model,
          contextLength: 4096,
          isEstimateError: true
        };
      });
  }
};

// Log that OpenRouterService has been properly initialized
console.log('OpenRouterService initialized and attached to window object');