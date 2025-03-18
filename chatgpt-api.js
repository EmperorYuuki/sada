/**
 * ChatGPT API Service for QuillSync AI
 * This module handles interactions with the ChatGPT backend server
 */

// IMPORTANT: Define ChatGPTService directly on window object
window.ChatGPTService = {
  // State tracking
  isTranslating: false,
  abortController: null,

  /**
   * Initialize the ChatGPT service
   * @returns {Promise<void>}
   */
  initialize: function() {
    try {
      console.log('Initializing ChatGPTService');
      
      // Set up login button handler
      var chatgptLoginBtn = document.getElementById('chatgpt-login-btn');
      if (chatgptLoginBtn) {
        chatgptLoginBtn.addEventListener('click', this.initiateChatGPTLogin.bind(this));
      }
      
      var verifyChatgptBtn = document.getElementById('verify-chatgpt-btn');
      if (verifyChatgptBtn) {
        verifyChatgptBtn.addEventListener('click', this.verifyChatGPTLogin.bind(this));
      }
      
      // Add event handlers for translation buttons
      var translateBtn = document.getElementById('translate-btn');
      if (translateBtn) {
        translateBtn.addEventListener('click', this.handleTranslateButtonClick.bind(this));
      }
      
      var previewBtn = document.getElementById('preview-btn');
      if (previewBtn) {
        previewBtn.addEventListener('click', this.handlePreviewButtonClick.bind(this));
      }
      
      var translateAllBtn = document.getElementById('translate-all-btn');
      if (translateAllBtn) {
        translateAllBtn.addEventListener('click', this.handleTranslateAllButtonClick.bind(this));
      }
      
      var refineBtn = document.getElementById('refine-btn');
      if (refineBtn) {
        refineBtn.addEventListener('click', this.handleRefineButtonClick.bind(this));
      }
      
      console.log('ChatGPTService initialized successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing ChatGPT service:', error);
      return Promise.reject(error);
    }
  },
  
  /**
   * Handle click on the translate button
   */
  handleTranslateButtonClick: function() {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    // Check if using ChatGPT or OpenRouter
    if (currentProject.settings?.translationMethod === 'openrouter') {
      // Use OpenRouter instead
      if (window.OpenRouterService) {
        window.OpenRouterService.translateText();
      } else {
        window.UIUtils.showNotification('OpenRouter service not available', 'error');
      }
      return;
    }
    
    // Use ChatGPT
    var inputText = document.getElementById('input-text').value.trim();
    if (!inputText) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please enter text to translate', 'warning');
      }
      return;
    }
    
    this.translateText(inputText);
  },
  
  /**
   * Handle click on the preview button
   */
  handlePreviewButtonClick: function() {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    var inputText = document.getElementById('input-text').value.trim();
    if (!inputText) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please enter text to preview', 'warning');
      }
      return;
    }
    
    // Use the current chunking strategy to get the first chunk
    var strategy = document.getElementById('chunking-strategy').value;
    var chunkSize = parseInt(document.getElementById('chunk-size').value) || 1000;
    var chunks = window.TextChunkerService.chunkText(inputText, strategy, chunkSize);
    
    if (chunks.length === 0) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('No valid text chunks to preview', 'warning');
      }
      return;
    }
    
    // Only preview the first chunk
    this.previewTranslation(chunks[0]);
  },
  
  /**
   * Handle click on the translate all button
   */
  handleTranslateAllButtonClick: function() {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    var chapterText = document.getElementById('chapter-text').value.trim();
    if (!chapterText) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('No chapter text to translate', 'warning');
      }
      return;
    }
    
    this.translateText(chapterText);
  },
  
  /**
   * Handle click on the refine button
   */
  handleRefineButtonClick: function() {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    if (!window.quill) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('No translation to refine', 'warning');
      }
      return;
    }
    
    var currentText = window.quill.getText().trim();
    if (!currentText) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('No translation to refine', 'warning');
      }
      return;
    }
    
    var refinementPrompt = prompt('Enter refinement instructions (optional):');
    if (refinementPrompt === null) return; // User cancelled
    
    var refinementText = `${currentText}\n\nRefinement: ${refinementPrompt || 'Improve this translation while keeping the same meaning and style.'}`;
    
    this.translateText(refinementText, true);
  },
  
  /**
   * Initiate ChatGPT login
   */
  initiateChatGPTLogin: function() {
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Initiating ChatGPT login...');
      window.UIUtils.toggleProgressBar(true);
      window.UIUtils.updateProgress(0, 'Connecting to server...');
    }
    
    fetch('http://localhost:3003/initiate-login')
      .then(response => response.json())
      .then(data => {
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.toggleProgressBar(false);
          window.UIUtils.updateProgress(100, 'Complete');
        }
        
        if (data.success) {
          // If projects were returned, update the project list
          if (data.projects && Array.isArray(data.projects)) {
            // Sync projects with ChatGPT
            this.syncProjects(data.projects);
          }
          
          if (window.UIUtils) {
            window.UIUtils.showNotification(data.message, 'success');
            window.UIUtils.updateLastAction('ChatGPT login completed');
          }
        } else {
          if (window.UIUtils) {
            window.UIUtils.showNotification(data.message || 'Login failed', 'error');
            window.UIUtils.updateLastAction('ChatGPT login failed');
          }
        }
      })
      .catch(error => {
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.toggleProgressBar(false);
          window.UIUtils.showNotification(`Login failed: ${error.message}`, 'error');
          window.UIUtils.updateLastAction('ChatGPT login error');
        }
        console.error('Error initiating ChatGPT login:', error);
      });
  },
  
  /**
   * Verify ChatGPT login status
   */
  verifyChatGPTLogin: function() {
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Verifying ChatGPT login...');
      window.UIUtils.toggleProgressBar(true);
      window.UIUtils.updateProgress(0, 'Connecting to server...');
    }
    
    fetch('http://localhost:3003/verify-login')
      .then(response => response.json())
      .then(data => {
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.toggleProgressBar(false);
          window.UIUtils.updateProgress(100, 'Complete');
          window.UIUtils.showNotification(data.message, data.success ? 'success' : 'warning');
          window.UIUtils.updateLastAction('ChatGPT login verified');
        }
      })
      .catch(error => {
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.toggleProgressBar(false);
          window.UIUtils.showNotification(`Verification failed: ${error.message}`, 'error');
          window.UIUtils.updateLastAction('ChatGPT verification error');
        }
        console.error('Error verifying ChatGPT login:', error);
      });
  },
  
  /**
   * Sync projects with ChatGPT
   * @param {Array} chatGptProjects - Array of projects from ChatGPT
   */
  syncProjects: function(chatGptProjects) {
    if (!Array.isArray(chatGptProjects) || chatGptProjects.length === 0) return;
    
    // Get local projects
    window.ProjectService.getAllProjects()
      .then(localProjects => {
        var projectUpdates = [];
        
        // Sync each ChatGPT project
        chatGptProjects.forEach(chatGptProject => {
          var existingProject = localProjects.find(p => p.name === chatGptProject.name);
          
          if (existingProject) {
            // Update existing project
            existingProject.href = chatGptProject.href;
            existingProject.instructions = chatGptProject.instructions;
            projectUpdates.push(window.ProjectService.updateProject(existingProject));
          } else {
            // Create new project
            var newProject = {
              name: chatGptProject.name,
              href: chatGptProject.href,
              instructions: chatGptProject.instructions,
              input: '',
              output: JSON.stringify([]),
              chatGPTUrl: `https://chatgpt.com${chatGptProject.href}`,
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
              settings: {
                translationMethod: 'chatgpt',
                openRouterApiKey: '',
                openRouterModel: '',
                autoVerify: false,
                customChunkSize: 1000,
                chunkingStrategy: 'auto'
              }
            };
            
            projectUpdates.push(window.ProjectService.createProject(newProject.name).then(project => {
              // Update the new project with properties from ChatGPT
              project.href = chatGptProject.href;
              project.instructions = chatGptProject.instructions;
              project.chatGPTUrl = `https://chatgpt.com${chatGptProject.href}`;
              
              // Save the updated project
              return window.ProjectService.updateProject(project);
            }));          }
        });
        
        // Wait for all project updates
        return Promise.all(projectUpdates);
      })
      .then(() => {
        // Refresh project list
        return window.ProjectService.renderProjectList();
      })
      .then(() => {
        if (window.UIUtils) {
          window.UIUtils.showNotification('Projects synchronized with ChatGPT', 'success');
          window.UIUtils.updateLastAction('Projects synchronized');
        }
      })
      .catch(error => {
        console.error('Error syncing projects:', error);
        if (window.UIUtils) {
          window.UIUtils.showNotification(`Project synchronization error: ${error.message}`, 'error');
        }
      });
  },
  
  /**
   * Translate text using ChatGPT
   * @param {string} text - Text to translate
   * @param {boolean} isRefinement - Whether this is a refinement request
   */
 translateText: function(text, isRefinement = false) {
    if (this.isTranslating) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Translation already in progress', 'warning');
      }
      return;
    }

    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }

    if (!text || !text.trim()) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please enter text to translate', 'warning');
      }
      return;
    }

    // Check if we have a ChatGPT URL
    if (!currentProject.chatGPTUrl) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please set a ChatGPT conversation URL in project settings', 'warning');
      }
      return;
    }

    this.isTranslating = true;

    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Preparing translation...');
      window.UIUtils.toggleProgressBar(true);
      window.UIUtils.updateProgress(0, 'Analyzing text...');
    }

    // Get chunking settings
    var strategy = document.getElementById('chunking-strategy').value;
    var chunkSize = parseInt(document.getElementById('chunk-size').value) || 1000;

    // *** CENTRALIZED GLOSSARY TOGGLE CHECK ***
    const applyGlossaryToggle = document.getElementById('apply-glossary-toggle');
    const shouldApplyGlossary = applyGlossaryToggle ? applyGlossaryToggle.checked : true; // Default to true

    // Use a Promise to manage the asynchronous glossary loading (if needed)
    new Promise((resolve, reject) => {
      if (shouldApplyGlossary && !isRefinement) {
        // Apply glossary if available and toggle is on
        window.GlossaryService.getGlossaryEntries(currentProject.id)
        .then(glossaryEntries => {
          if (glossaryEntries.length > 0) {
            const processedText = window.GlossaryService.applyGlossary(text, glossaryEntries);
            console.log(`Applied ${glossaryEntries.length} glossary terms`);
            if (window.UIUtils) {
              window.UIUtils.showNotification(`Applied ${glossaryEntries.length} glossary terms before translation`, 'info', 3000);
            }
            resolve(processedText); // Resolve with the processed text
          } else {
            console.log('No glossary terms to apply');
            resolve(text); // Resolve with the original text
          }
        })
        .catch(error => {
          console.error('Error applying glossary:', error);
          // Continue with original text even if glossary loading fails
          resolve(text);
        });
      } else {
        // Skip glossary application if toggle is off or if it is refinement
        if (!isRefinement && !shouldApplyGlossary && window.UIUtils) {
          window.UIUtils.showNotification('Glossary application skipped (toggle is off)', 'info', 3000);
        }
        resolve(text); // Resolve with the original text
      }
    })
    .then(textToTranslate => {
      // Continue with translation process using the resolved text (either processed or original)
      this.performTranslation(textToTranslate, currentProject, isRefinement);
    })
     .catch(error => {
      //This should never happen
      console.error('Error in translate:', error)
  });
  },

  /**
 * Perform the actual translation request
 * @param {string} text - Text to translate
 * @param {Object} project - The current project
 * @param {boolean} isRefinement - Whether this is a refinement
 */
performTranslation: function(text, project, isRefinement) {
  // Set up abort controller for cancellation
  this.abortController = new AbortController();
  var signal = this.abortController.signal;

  // Create request data
  var requestData = {
    text: text,
    chatGPTUrl: project.chatGPTUrl,
    promptPrefix: project.instructions || 'Follow the instructions carefully and first check the memory for the glossary. Ensure that all terms are correctly used and consistent. Maintain full sentences and paragraphs—do not cut them off mid-sentence or with dashes:'
  };
  
  // Send request
  fetch('http://localhost:3003/chunk-and-translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData),
    signal: signal
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    // Process the streaming response
    var reader = response.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';
    var fullTranslation = '';
    
    var processStream = ({ done, value }) => {
      if (done) {
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.toggleProgressBar(false);
        }
        this.isTranslating = false;
        this.abortController = null;
        return;
      }
      
      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });
      
      // Split by double newlines (SSE format)
      var parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      
      // Process each event
      parts.forEach(part => {
        if (!part.trim()) return;
        
        var lines = part.split('\n');
        var eventType = '';
        var dataStr = '';
        
        lines.forEach(line => {
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.substring(5).trim();
          }
        });
        
        if (!dataStr) return;
        
        try {
          var parsedData = JSON.parse(dataStr);
          
          if (eventType === 'start') {
            console.log('Translation started');
          } else if (eventType === 'end') {
            fullTranslation = parsedData.translation;
            
            // Set the translation in the editor
            if (window.quill) {
              window.quill.setText(fullTranslation);
              
              // Save to the project
              window.ProjectService.updateProjectOutput(project.id,
                window.quill.getContents().ops
              );
            }
            
            if (window.UIUtils) {
              window.UIUtils.updateProgress(100, 'Translation complete');
              window.UIUtils.showNotification('Translation completed successfully', 'success');
              window.UIUtils.updateLastAction('Translation completed');
              window.UIUtils.updateWordCounts();
            }
            
            // Verify translation if enabled
            if (project.settings?.autoVerify && project.settings?.openRouterApiKey) {
              this.verifyTranslation(text, fullTranslation);
            }
          } else if (eventType === 'error') {
            throw new Error(parsedData.error);
          } else {
            // Update progress
            if (parsedData.total > 0) {
              var progress = Math.round((parsedData.chunk / parsedData.total) * 100);
              
              if (window.UIUtils) {
                window.UIUtils.updateProgress(progress, `Translating chunk ${parsedData.chunk}/${parsedData.total}`);
              }
              
              // Update translation in editor
              if (window.quill && parsedData.partial) {
                window.quill.setText(parsedData.partial);
              }
            }
          }
        } catch (error) {
          console.error('Error processing translation update:', error);
        }
      });
      
      // Continue reading
      return reader.read().then(processStream);
    };
    
    // Start reading the stream
    return reader.read().then(processStream);
  })
  .catch(error => {
    if (error.name === 'AbortError') {
      console.log('Translation was cancelled');
      if (window.UIUtils) {
        window.UIUtils.showNotification('Translation cancelled', 'info');
      }
    } else {
      console.error('Translation error:', error);
      if (window.UIUtils) {
        window.UIUtils.showNotification(`Translation failed: ${error.message}`, 'error');
      }
    }
    
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(false);
      window.UIUtils.toggleProgressBar(false);
      window.UIUtils.updateLastAction('Translation failed');
    }
    
    this.isTranslating = false;
    this.abortController = null;
  });
},
  
  /**
   * Preview translation of a chunk
   * @param {string} text - Text to preview
   */
  previewTranslation: function(text) {
    if (this.isTranslating) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Translation already in progress', 'warning');
      }
      return;
    }
    
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please select a project first', 'warning');
      }
      return;
    }
    
    if (!text || !text.trim()) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please enter text to preview', 'warning');
      }
      return;
    }
    
    // Check if we have a ChatGPT URL
    if (!currentProject.chatGPTUrl) {
      if (window.UIUtils) {
        window.UIUtils.showNotification('Please set a ChatGPT conversation URL in project settings', 'warning');
      }
      return;
    }
    
    this.isTranslating = true;
    
    if (window.UIUtils) {
      window.UIUtils.toggleLoading(true, 'Preparing preview...');
      window.UIUtils.toggleProgressBar(true);
      window.UIUtils.updateProgress(0, 'Analyzing text...');
    }
    
    // Apply glossary if available
    window.GlossaryService.getGlossaryEntries(currentProject.id)
      .then(glossaryEntries => {
        var textToTranslate = text;
        if (glossaryEntries.length > 0) {
          textToTranslate = window.GlossaryService.applyGlossary(text, glossaryEntries);
        }
        
        // Set up abort controller for cancellation
        this.abortController = new AbortController();
        var signal = this.abortController.signal;
        
        // Create request data
        var requestData = {
          text: textToTranslate,
          chatGPTUrl: currentProject.chatGPTUrl,
          promptPrefix: currentProject.instructions || 'Follow the instructions carefully and first check the memory for the glossary. Ensure that all terms are correctly used and consistent. Maintain full sentences and paragraphs—do not cut them off mid-sentence or with dashes:'
        };
        
        return fetch('http://localhost:3003/chunk-and-translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: signal
        });
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        // Process the streaming response
        var reader = response.body.getReader();
        var decoder = new TextDecoder('utf-8');
        var buffer = '';
        var previewTranslation = '';
        
        var processStream = ({ done, value }) => {
          if (done) {
            if (window.UIUtils) {
              window.UIUtils.toggleLoading(false);
              window.UIUtils.toggleProgressBar(false);
            }
            this.isTranslating = false;
            this.abortController = null;
            return;
          }
          
          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Split by double newlines (SSE format)
          var parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          
          // Process each event
          parts.forEach(part => {
            if (!part.trim()) return;
            
            var lines = part.split('\n');
            var eventType = '';
            var dataStr = '';
            
            lines.forEach(line => {
              if (line.startsWith('event:')) {
                eventType = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                dataStr = line.substring(5).trim();
              }
            });
            
            if (!dataStr) return;
            
            try {
              var parsedData = JSON.parse(dataStr);
              
              if (eventType === 'end') {
                previewTranslation = parsedData.translation;
                
                // Set the translation in the editor with a preview marker
                if (window.quill) {
                  window.quill.setText(`${previewTranslation}\n\n--- Preview of first chunk only ---`);
                }
                
                if (window.UIUtils) {
                  window.UIUtils.updateProgress(100, 'Preview complete');
                  window.UIUtils.showNotification('Preview generated successfully', 'success');
                  window.UIUtils.updateLastAction('Preview generated');
                  window.UIUtils.updateWordCounts();
                }
              } else if (eventType === 'error') {
                throw new Error(parsedData.error);
              } else {
                // Update progress
                if (window.UIUtils) {
                  window.UIUtils.updateProgress(parsedData.progress || 50, 'Generating preview...');
                }
                
                // Update translation in editor
                if (window.quill && parsedData.partial) {
                  window.quill.setText(`${parsedData.partial}\n\n--- Preview in progress... ---`);
                }
              }
            } catch (error) {
              console.error('Error processing preview update:', error);
            }
          });
          
          // Continue reading
          return reader.read().then(processStream);
        };
        
        // Start reading the stream
        return reader.read().then(processStream);
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          console.log('Preview was cancelled');
          if (window.UIUtils) {
            window.UIUtils.showNotification('Preview cancelled', 'info');
          }
        } else {
          console.error('Preview error:', error);
          if (window.UIUtils) {
            window.UIUtils.showNotification(`Preview failed: ${error.message}`, 'error');
          }
        }
        
        if (window.UIUtils) {
          window.UIUtils.toggleLoading(false);
          window.UIUtils.toggleProgressBar(false);
          window.UIUtils.updateLastAction('Preview failed');
        }
        
        this.isTranslating = false;
        this.abortController = null;
      });
  },
  
  /**
   * Verify translation quality
   * @param {string} sourceText - Original text
   * @param {string} translatedText - Translated text
   */
  verifyTranslation: function(sourceText, translatedText) {
    var currentProject = window.ProjectService.getCurrentProject();
    if (!currentProject) return;
    
    if (!window.OpenRouterService) {
      console.log('OpenRouter service not available for verification');
      return;
    }
    
    // Check if OpenRouter is configured for verification
    if (!currentProject.settings?.openRouterApiKey || !currentProject.settings?.openRouterModel) {
      console.log('OpenRouter not configured for verification');
      return;
    }
    
    if (window.UIUtils) {
      window.UIUtils.showNotification('Verifying translation quality...', 'info');
    }
    
    // Get glossary entries for verification
    window.GlossaryService.getGlossaryEntries(currentProject.id)
      .then(glossaryEntries => {
        // Run verification
        return window.OpenRouterService.verifyTranslation(
          sourceText,
          translatedText,
          currentProject.settings.openRouterModel
        );
      })
      .then(results => {
        console.log('Verification results:', results);
        
        // Display verification results
        var accuracy = results.accuracy || 0;
        var completeness = results.completeness || 0;
        
        var qualityLevel;
        if (accuracy >= 90 && completeness >= 90) {
          qualityLevel = 'excellent';
        } else if (accuracy >= 75 && completeness >= 75) {
          qualityLevel = 'good';
        } else if (accuracy >= 60 && completeness >= 60) {
          qualityLevel = 'fair';
        } else {
          qualityLevel = 'poor';
        }
        
        // Create verification notification
        var message = `Translation quality: ${qualityLevel.toUpperCase()}\n`;
        message += `Accuracy: ${accuracy}%, Completeness: ${completeness}%`;
        
        if (results.issues && results.issues.length > 0) {
          message += `\nFound ${results.issues.length} issues that may need review.`;
        }
        
        if (window.UIUtils) {
          window.UIUtils.showNotification(message, qualityLevel === 'poor' ? 'warning' : 'info', 10000);
        }
      })
      .catch(error => {
        console.error('Translation verification error:', error);
      });
  }
};

// Log that ChatGPTService has been properly initialized
console.log('ChatGPTService initialized and attached to window object');