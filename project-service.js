/**
 * Project Management Service for QuillSync AI
 * This module handles CRUD operations for projects
 */

// IMPORTANT: Define ProjectService directly on window object
window.ProjectService = {
  // Current active project
  currentProject: null,
  
  /**
   * Create a new project
   * @param {string} name - Project name
   * @returns {Promise<Object>} The created project
   */
  createProject: function(name) {
    return new Promise(function(resolve, reject) {
      if (!name || typeof name !== 'string' || name.trim() === '') {
        reject(new Error('Project name cannot be empty'));
        return;
      }
      
      // Check if a project with this name already exists
      window.ProjectService.getAllProjects().then(function(existingProjects) {
        if (existingProjects.some(function(project) { return project.name === name; })) {
          reject(new Error('A project with the name "' + name + '" already exists'));
          return;
        }
        
        var project = {
          id: window.StorageUtils.generateUUID(),
          name: name.trim(),
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          input: '',
          output: JSON.stringify([]),
          chatGPTUrl: '',
          instructions: '',
          settings: {
            translationMethod: 'chatgpt',
            openRouterApiKey: '',
            openRouterModel: '',
            autoVerify: false,
            customChunkSize: 1000,
            chunkingStrategy: 'auto'
          }
        };
        
        window.StorageUtils.saveItem('projects', project).then(function() {
          resolve(project);
        }).catch(function(error) {
          console.error('Error creating project:', error);
          reject(error);
        });
      }).catch(function(error) {
        reject(error);
      });
    });
  },
  
  /**
   * Get a project by ID
   * @param {string} id - Project ID
   * @returns {Promise<Object>} The requested project
   */
  getProject: function(id) {
    return new Promise(function(resolve, reject) {
      window.StorageUtils.getItem('projects', id).then(function(project) {
        if (!project) {
          reject(new Error('Project with ID "' + id + '" not found'));
          return;
        }
        resolve(project);
      }).catch(function(error) {
        console.error('Error getting project:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Get all projects
   * @returns {Promise<Array>} Array of all projects
   */
  getAllProjects: function() {
    return new Promise(function(resolve, reject) {
      window.StorageUtils.getAllItems('projects').then(function(projects) {
        resolve(projects || []);
      }).catch(function(error) {
        console.error('Error getting all projects:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Update a project
   * @param {Object} project - Project to update
   * @returns {Promise<Object>} The updated project
   */
  updateProject: function(project) {
    return new Promise(function(resolve, reject) {
      if (!project || !project.id) {
        reject(new Error('Invalid project'));
        return;
      }
      
      // Update modified timestamp
      project.modified = new Date().toISOString();
      
      window.StorageUtils.saveItem('projects', project).then(function() {
        // If this is the current project, update the current project
        if (window.ProjectService.currentProject && window.ProjectService.currentProject.id === project.id) {
          window.ProjectService.currentProject = project;
        }
        
        resolve(project);
      }).catch(function(error) {
        console.error('Error updating project:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Delete a project
   * @param {string} id - Project ID
   * @returns {Promise<void>}
   */
  deleteProject: function(id) {
    return new Promise(function(resolve, reject) {
      // Delete project
      window.StorageUtils.deleteItem('projects', id).then(function() {
        // Reset current project if it's the one being deleted
        if (window.ProjectService.currentProject && window.ProjectService.currentProject.id === id) {
          window.ProjectService.currentProject = null;
          // Also clear from localStorage to avoid loading errors
          window.StorageUtils.saveSetting('currentProjectId', null);
        }
        
        // Delete related glossary entries
        window.StorageUtils.getByIndex('glossary', 'projectId', id).then(function(glossaryEntries) {
          var deletePromises = glossaryEntries.map(function(entry) {
            return window.StorageUtils.deleteItem('glossary', entry.id);
          });
          
          Promise.all(deletePromises).then(function() {
            // Delete related chapters
            window.StorageUtils.getByIndex('chapters', 'projectId', id).then(function(chapters) {
              var chapterDeletePromises = chapters.map(function(chapter) {
                return window.StorageUtils.deleteItem('chapters', chapter.id);
              });
              
              Promise.all(chapterDeletePromises).then(function() {
                resolve();
              }).catch(function(error) {
                reject(error);
              });
            }).catch(function(error) {
              reject(error);
            });
          }).catch(function(error) {
            reject(error);
          });
        }).catch(function(error) {
          reject(error);
        });
      }).catch(function(error) {
        console.error('Error deleting project:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Set the current project
   * @param {string} id - Project ID
   * @returns {Promise<Object>} The selected project
   */
  setCurrentProject: function(id) {
    return new Promise(function(resolve, reject) {
      window.StorageUtils.getItem('projects', id).then(function(project) {
        if (!project) {
          // Project not found, clear current project ID and resolve with null
          window.StorageUtils.saveSetting('currentProjectId', null);
          window.ProjectService.currentProject = null;
          resolve(null);
        } else {
          window.ProjectService.currentProject = project;
          window.StorageUtils.saveSetting('currentProjectId', id);
          resolve(project);
        }
      }).catch(function(error) {
        console.error('Error setting current project:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Get the current project
   * @returns {Object} The current project or null
   */
  getCurrentProject: function() {
    return window.ProjectService.currentProject;
  },
  
  /**
   * Load the last active project from settings
   * @returns {Promise<Object>} The loaded project or null
   */
  loadLastProject: function() {
    return new Promise(function(resolve, reject) {
      var lastProjectId = window.StorageUtils.getSetting('currentProjectId');
      if (lastProjectId) {
        window.ProjectService.setCurrentProject(lastProjectId).then(function(project) {
          resolve(project);
        }).catch(function(error) {
          console.warn('Could not load last project:', error);
          resolve(null);
        });
      } else {
        resolve(null);
      }
    });
  },
  
  /**
   * Update project input text
   * @param {string} id - Project ID
   * @param {string} text - Input text
   * @returns {Promise<Object>} The updated project
   */
  updateProjectInput: function(id, text) {
    return new Promise(function(resolve, reject) {
      window.ProjectService.getProject(id).then(function(project) {
        project.input = text;
        window.ProjectService.updateProject(project).then(function(updatedProject) {
          resolve(updatedProject);
        }).catch(function(error) {
          reject(error);
        });
      }).catch(function(error) {
        console.error('Error updating project input:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Update project output text
   * @param {string} id - Project ID
   * @param {Array} delta - Quill delta operations
   * @returns {Promise<Object>} The updated project
   */
  updateProjectOutput: function(id, delta) {
    return new Promise(function(resolve, reject) {
      window.ProjectService.getProject(id).then(function(project) {
        project.output = JSON.stringify(delta);
        window.ProjectService.updateProject(project).then(function(updatedProject) {
          resolve(updatedProject);
        }).catch(function(error) {
          reject(error);
        });
      }).catch(function(error) {
        console.error('Error updating project output:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Update project settings
   * @param {string} id - Project ID
   * @param {Object} settings - New settings
   * @returns {Promise<Object>} The updated project
   */
  updateProjectSettings: function(id, settings) {
    return new Promise(function(resolve, reject) {
      window.ProjectService.getProject(id).then(function(project) {
        // Use Object.assign to merge settings
        project.settings = Object.assign({}, project.settings || {}, settings);
        window.ProjectService.updateProject(project).then(function(updatedProject) {
          resolve(updatedProject);
        }).catch(function(error) {
          reject(error);
        });
      }).catch(function(error) {
        console.error('Error updating project settings:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Update project custom instructions
   * @param {string} id - Project ID
   * @param {string} instructions - Custom instructions
   * @returns {Promise<Object>} The updated project
   */
  updateProjectInstructions: function(id, instructions) {
    return new Promise(function(resolve, reject) {
      window.ProjectService.getProject(id).then(function(project) {
        project.instructions = instructions;
        window.ProjectService.updateProject(project).then(function(updatedProject) {
          resolve(updatedProject);
        }).catch(function(error) {
          reject(error);
        });
      }).catch(function(error) {
        console.error('Error updating project instructions:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Update project ChatGPT URL
   * @param {string} id - Project ID
   * @param {string} url - ChatGPT conversation URL
   * @returns {Promise<Object>} The updated project
   */
  updateProjectChatGPTUrl: function(id, url) {
    return new Promise(function(resolve, reject) {
      window.ProjectService.getProject(id).then(function(project) {
        project.chatGPTUrl = url;
        window.ProjectService.updateProject(project).then(function(updatedProject) {
          resolve(updatedProject);
        }).catch(function(error) {
          reject(error);
        });
      }).catch(function(error) {
        console.error('Error updating project ChatGPT URL:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Export projects to JSON
   * @returns {Promise<string>} JSON string of all projects
   */
  exportProjects: function() {
    return new Promise(function(resolve, reject) {
      window.ProjectService.getAllProjects().then(function(projects) {
        // Enhance projects with their related data
        var enhancedProjectsPromises = projects.map(function(project) {
          // Get glossary entries for this project
          return window.StorageUtils.getByIndex('glossary', 'projectId', project.id).then(function(glossaryEntries) {
            // Add glossary entries to project
            project.glossary = glossaryEntries;
            
            // Get chapters for this project
            return window.StorageUtils.getByIndex('chapters', 'projectId', project.id).then(function(chapters) {
              // Add chapters to project
              project.chapters = chapters;
              return project;
            });
          });
        });
        
        Promise.all(enhancedProjectsPromises).then(function(enhancedProjects) {
          resolve(JSON.stringify(enhancedProjects, null, 2));
        }).catch(function(error) {
          reject(error);
        });
      }).catch(function(error) {
        console.error('Error exporting projects:', error);
        reject(error);
      });
    });
  },
  
  /**
   * Import projects from JSON
   * @param {string} json - JSON string of projects
   * @returns {Promise<Array>} Array of imported projects
   */
  importProjects: function(json) {
    return new Promise(function(resolve, reject) {
      try {
        var projects = JSON.parse(json);
        if (!Array.isArray(projects)) {
          reject(new Error('Invalid projects data'));
          return;
        }
        
        var importedProjects = [];
        var importPromises = [];
        
        projects.forEach(function(project) {
          // Extract glossary and chapters
          var glossary = project.glossary || [];
          var chapters = project.chapters || [];
          
          // Remove them from the project object
          delete project.glossary;
          delete project.chapters;
          
          // Skip if project doesn't have required fields
          if (!project.id || !project.name) {
            console.warn('Skipping invalid project:', project);
            return;
          }
          
          // Add the project
          var projectPromise = window.StorageUtils.saveItem('projects', project).then(function() {
            importedProjects.push(project);
            
            // Add glossary entries
            var glossaryPromises = glossary.map(function(entry) {
              if (!entry.id) {
                entry.id = window.StorageUtils.generateUUID();
              }
              entry.projectId = project.id;
              return window.StorageUtils.saveItem('glossary', entry);
            });
            
            // Add chapters
            var chapterPromises = chapters.map(function(chapter) {
              if (!chapter.id) {
                chapter.id = window.StorageUtils.generateUUID();
              }
              chapter.projectId = project.id;
              return window.StorageUtils.saveItem('chapters', chapter);
            });
            
            // Wait for all glossary and chapter imports to complete
            return Promise.all([
              Promise.all(glossaryPromises),
              Promise.all(chapterPromises)
            ]);
          });
          
          importPromises.push(projectPromise);
        });
        
        Promise.all(importPromises).then(function() {
          resolve(importedProjects);
        }).catch(function(error) {
          reject(error);
        });
      } catch (error) {
        console.error('Error importing projects:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Render the project list in the UI
   * @returns {Promise<void>}
   */
  renderProjectList: function() {
    return new Promise(function(resolve, reject) {
      try {
        var projectList = document.getElementById('project-list');
        if (!projectList) {
          console.warn('Project list element not found');
          resolve();
          return;
        }
        
        // Get all projects
        window.ProjectService.getAllProjects().then(function(projects) {
          // Sort by modified date (most recent first)
          projects.sort(function(a, b) {
            return new Date(b.modified) - new Date(a.modified);
          });
          
          // Clear the list
          projectList.innerHTML = '';
          
          // Add each project
          projects.forEach(function(project) {
            var li = document.createElement('li');
            li.textContent = project.name;
            li.dataset.id = project.id;
            
            if (window.ProjectService.currentProject && window.ProjectService.currentProject.id === project.id) {
              li.classList.add('active');
            }
            
            li.addEventListener('click', function() {
              window.ProjectService.setCurrentProject(project.id).then(function() {
                // Update UI to reflect the selected project
                document.querySelectorAll('#project-list li').forEach(function(item) {
                  item.classList.remove('active');
                });
                li.classList.add('active');
                
                // Update current project display
                var projectDisplay = document.getElementById('current-project-display');
                if (projectDisplay) projectDisplay.textContent = project.name;
                
                var currentProject = document.getElementById('current-project');
                if (currentProject) currentProject.textContent = 'Project: ' + project.name;
                
                // Update last saved display
                var lastSaved = document.getElementById('last-saved');
                if (lastSaved) {
                  var lastSavedTime = new Date(project.modified).toLocaleTimeString();
                  lastSaved.textContent = 'Last saved: ' + lastSavedTime;
                }
                
                // Load project content
                var inputText = document.getElementById('input-text');
                if (inputText) inputText.value = project.input || '';
                
                // Load Quill content if available
                if (window.quill && project.output) {
                  try {
                    var delta = JSON.parse(project.output);
                    window.quill.setContents(delta);
                  } catch (e) {
                    console.warn('Could not parse project output:', e);
                    window.quill.setText('');
                  }
                }
                
                // Update word counts
                if (window.UIUtils) {
                  window.UIUtils.updateWordCounts();
                }
                
                // Update UI to reflect project settings
                window.ProjectService.updateSettingsUI(project);
                
                // Update last action
                if (window.UIUtils) {
                  window.UIUtils.updateLastAction('Project loaded');
                  window.UIUtils.showNotification('Project "' + project.name + '" loaded', 'success');
                }
              }).catch(function(error) {
                console.error('Error selecting project:', error);
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Error loading project: ' + error.message, 'error');
                }
              });
            });
            
            // Add delete button
            var deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'Delete project ' + project.name;
            deleteBtn.className = 'delete-project-btn';
            
            deleteBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              
              if (confirm('Are you sure you want to delete project "' + project.name + '"? This action cannot be undone.')) {
                window.ProjectService.deleteProject(project.id).then(function() {
                  // Remove from UI
                  li.remove();
                  
                  // If this was the current project, clear the UI
                  if (window.ProjectService.currentProject && window.ProjectService.currentProject.id === project.id) {
                    var projectDisplay = document.getElementById('current-project-display');
                    if (projectDisplay) projectDisplay.textContent = 'No Project Selected';
                    
                    var currentProject = document.getElementById('current-project');
                    if (currentProject) currentProject.textContent = 'No Project';
                    
                    var lastSaved = document.getElementById('last-saved');
                    if (lastSaved) lastSaved.textContent = 'Last saved: Never';
                    
                    // Clear input and output
                    var inputText = document.getElementById('input-text');
                    if (inputText) inputText.value = '';
                    
                    if (window.quill) {
                      window.quill.setText('');
                    }
                    
                    // Update word counts
                    if (window.UIUtils) {
                      window.UIUtils.updateWordCounts();
                    }
                  }
                  
                  if (window.UIUtils) {
                    window.UIUtils.updateLastAction('Project deleted');
                    window.UIUtils.showNotification('Project "' + project.name + '" deleted', 'success');
                  }
                }).catch(function(error) {
                  console.error('Error deleting project:', error);
                  if (window.UIUtils) {
                    window.UIUtils.showNotification('Error deleting project: ' + error.message, 'error');
                  }
                });
              }
            });
            
            li.appendChild(deleteBtn);
            projectList.appendChild(li);
          });
          
          // Show empty state if no projects
          if (projects.length === 0) {
            var emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = '<p>No projects yet.</p><p>Create a new project to get started.</p>';
            projectList.appendChild(emptyState);
          }
          
          resolve();
        }).catch(function(error) {
          console.error('Error rendering project list:', error);
          if (window.UIUtils) {
            window.UIUtils.showNotification('Error loading projects', 'error');
          }
          reject(error);
        });
      } catch (error) {
        console.error('Error in renderProjectList:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Update UI elements to reflect project settings
   * @param {Object} project - The project
   */
  updateSettingsUI: function(project) {
    // Translation method
    var methodSelect = document.getElementById('translation-method');
    if (methodSelect) {
      methodSelect.value = project.settings?.translationMethod || 'chatgpt';
    }
    
    // Chunking strategy
    var chunkingSelect = document.getElementById('chunking-strategy');
    if (chunkingSelect) {
      chunkingSelect.value = project.settings?.chunkingStrategy || 'auto';
    }
    
    // Chunk size
    var chunkSizeInput = document.getElementById('chunk-size');
    if (chunkSizeInput) {
      chunkSizeInput.value = project.settings?.customChunkSize || 1000;
    }
    
    // Update settings tab values if present
    var defaultMethodSelect = document.getElementById('default-translation-method');
    if (defaultMethodSelect) {
      defaultMethodSelect.value = project.settings?.translationMethod || 'chatgpt';
    }
    
    var defaultChunkingSelect = document.getElementById('default-chunking-strategy');
    if (defaultChunkingSelect) {
      defaultChunkingSelect.value = project.settings?.chunkingStrategy || 'auto';
    }
    
    var defaultChunkSizeInput = document.getElementById('default-chunk-size');
    if (defaultChunkSizeInput) {
      defaultChunkSizeInput.value = project.settings?.customChunkSize || 1000;
    }
    
    var autoVerifyCheckbox = document.getElementById('auto-verify');
    if (autoVerifyCheckbox) {
      autoVerifyCheckbox.checked = project.settings?.autoVerify || false;
    }
    
    // OpenRouter API key
    var apiKeyInput = document.getElementById('openrouter-api-key');
    if (apiKeyInput) {
      apiKeyInput.value = project.settings?.openRouterApiKey || '';
    }
    
    // OpenRouter model
    var modelSelect = document.getElementById('openrouter-model');
    if (modelSelect && project.settings?.openRouterModel) {
      modelSelect.value = project.settings.openRouterModel;
    }
    
    // Custom instructions
    var instructionsInput = document.getElementById('modal-custom-instructions');
    if (instructionsInput) {
      instructionsInput.value = project.instructions || '';
    }
    
    // ChatGPT URL
    var chatGPTLinkInput = document.getElementById('modal-chatgpt-link');
    if (chatGPTLinkInput) {
      chatGPTLinkInput.value = project.chatGPTUrl || '';
    }
  },
  
  /**
   * Initialize the project service
   */
  initialize: function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      try {
        console.log('Initializing ProjectService');
        
        // Try to load the last active project
        self.loadLastProject().then(function() {
          // Render the project list
          return self.renderProjectList();
        }).then(function() {
          // Set up the "Add Project" button
          var addProjectBtn = document.getElementById('add-project-btn');
          if (addProjectBtn) {
            addProjectBtn.addEventListener('click', function() {
              var name = prompt('Enter project name:');
              if (name) {
                if (window.UIUtils) {
                  window.UIUtils.toggleLoading(true, 'Creating project...');
                }
                
                self.createProject(name).then(function(project) {
                  return self.setCurrentProject(project.id).then(function() {
                    return self.renderProjectList();
                  }).then(function() {
                    // Update UI
                    var projectDisplay = document.getElementById('current-project-display');
                    if (projectDisplay) projectDisplay.textContent = project.name;
                    
                    var currentProject = document.getElementById('current-project');
                    if (currentProject) currentProject.textContent = 'Project: ' + project.name;
                    
                    var lastSaved = document.getElementById('last-saved');
                    if (lastSaved) lastSaved.textContent = 'Last saved: ' + new Date().toLocaleTimeString();
                    
                    if (window.UIUtils) {
                      window.UIUtils.updateLastAction('Project created');
                      window.UIUtils.showNotification('Project "' + project.name + '" created', 'success');
                      window.UIUtils.toggleLoading(false);
                    }
                    
                    return project;
                  });
                }).catch(function(error) {
                  console.error('Error creating project:', error);
                  if (window.UIUtils) {
                    window.UIUtils.showNotification('Error creating project: ' + error.message, 'error');
                    window.UIUtils.toggleLoading(false);
                  }
                });
              }
            });
          }
          
          // Set up the Export Projects button
          var exportBtn = document.getElementById('export-projects-btn');
          if (exportBtn) {
            exportBtn.addEventListener('click', function() {
              if (window.UIUtils) {
                window.UIUtils.toggleLoading(true, 'Exporting projects...');
              }
              
              self.exportProjects().then(function(json) {
                // Create and download a file
                var blob = new Blob([json], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'quillsync_projects_' + new Date().toISOString().split('T')[0] + '.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                if (window.UIUtils) {
                  window.UIUtils.updateLastAction('Projects exported');
                  window.UIUtils.showNotification('Projects exported successfully', 'success');
                  window.UIUtils.toggleLoading(false);
                }
              }).catch(function(error) {
                console.error('Error exporting projects:', error);
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Error exporting projects: ' + error.message, 'error');
                  window.UIUtils.toggleLoading(false);
                }
              });
            });
          }
          
          // Set up the Import Projects button
          var importBtn = document.getElementById('import-projects-btn');
          if (importBtn) {
            importBtn.addEventListener('click', function() {
              var input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/json';
              
              input.addEventListener('change', function(e) {
                if (e.target.files.length === 0) return;
                
                var file = e.target.files[0];
                var reader = new FileReader();
                
                reader.onload = function(event) {
                  if (window.UIUtils) {
                    window.UIUtils.toggleLoading(true, 'Importing projects...');
                  }
                  
                  var json = event.target.result;
                  self.importProjects(json).then(function(projects) {
                    return self.renderProjectList().then(function() {
                      if (window.UIUtils) {
                        window.UIUtils.updateLastAction('Projects imported');
                        window.UIUtils.showNotification(projects.length + ' projects imported successfully', 'success');
                        window.UIUtils.toggleLoading(false);
                      }
                    });
                  }).catch(function(error) {
                    console.error('Error importing projects:', error);
                    if (window.UIUtils) {
                      window.UIUtils.showNotification('Error importing projects: ' + error.message, 'error');
                      window.UIUtils.toggleLoading(false);
                    }
                  });
                };
                
                reader.readAsText(file);
              });
              
              input.click();
            });
          }
          
          // Set up project search
          var searchInput = document.getElementById('project-search-input');
          if (searchInput) {
            searchInput.addEventListener('input', function() {
              var query = searchInput.value.toLowerCase();
              
              self.getAllProjects().then(function(projects) {
                // Filter projects by name
                var filtered = query.trim() === '' 
                  ? projects 
                  : projects.filter(function(project) {
                      return project.name.toLowerCase().includes(query);
                    });
                
                // Update UI
                var projectList = document.getElementById('project-list');
                if (!projectList) return;
                
                var items = projectList.querySelectorAll('li');
                
                items.forEach(function(item) {
                  var projectId = item.dataset.id;
                  var project = filtered.find(function(p) { return p.id === projectId; });
                  
                  if (project) {
                    item.style.display = '';
                  } else {
                    item.style.display = 'none';
                  }
                });
              });
            });
          }
          
          // Set up settings change handlers
          var translationMethod = document.getElementById('translation-method');
          if (translationMethod) {
            translationMethod.addEventListener('change', function(e) {
              if (!self.currentProject) return;
              
              self.updateProjectSettings(self.currentProject.id, {
                translationMethod: e.target.value
              }).then(function() {
                if (window.UIUtils) {
                  window.UIUtils.updateLastAction('Translation method updated');
                }
              }).catch(function(error) {
                console.error('Error updating translation method:', error);
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Error updating settings: ' + error.message, 'error');
                }
              });
            });
          }
          
          var chunkingStrategy = document.getElementById('chunking-strategy');
          if (chunkingStrategy) {
            chunkingStrategy.addEventListener('change', function(e) {
              if (!self.currentProject) return;
              
              self.updateProjectSettings(self.currentProject.id, {
                chunkingStrategy: e.target.value
              }).then(function() {
                if (window.UIUtils) {
                  window.UIUtils.updateLastAction('Chunking strategy updated');
                }
              }).catch(function(error) {
                console.error('Error updating chunking strategy:', error);
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Error updating settings: ' + error.message, 'error');
                }
              });
            });
          }
          
          var chunkSize = document.getElementById('chunk-size');
          if (chunkSize) {
            chunkSize.addEventListener('change', function(e) {
              if (!self.currentProject) return;
              
              var size = parseInt(e.target.value);
              if (isNaN(size) || size < 100 || size > 5000) {
                e.target.value = self.currentProject.settings?.customChunkSize || 1000;
                return;
              }
              
              self.updateProjectSettings(self.currentProject.id, {
                customChunkSize: size
              }).then(function() {
                if (window.UIUtils) {
                  window.UIUtils.updateLastAction('Chunk size updated');
                }
              }).catch(function(error) {
                console.error('Error updating chunk size:', error);
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Error updating settings: ' + error.message, 'error');
                }
              });
            });
          }
          
          // Auto-save input text
          var inputText = document.getElementById('input-text');
          if (inputText) {
            inputText.addEventListener('input', self.debounce(function() {
              if (!self.currentProject) return;
              
              self.updateProjectInput(self.currentProject.id, inputText.value).catch(function(error) {
                console.error('Error auto-saving input:', error);
              });
            }, 1000));
          }
          
          // Update form in modal
          var customInstructionsBtn = document.getElementById('custom-instructions-btn');
          if (customInstructionsBtn) {
            customInstructionsBtn.addEventListener('click', function() {
              if (!self.currentProject) {
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Please select a project first', 'warning');
                }
                return;
              }
              
              var customInstructionsTextarea = document.getElementById('modal-custom-instructions');
              if (customInstructionsTextarea) {
                customInstructionsTextarea.value = self.currentProject.instructions || '';
              }
              
              var customInstructionsModal = document.getElementById('custom-instructions-modal');
              if (customInstructionsModal) {
                customInstructionsModal.style.display = 'flex';
              }
            });
          }
          
          var saveInstructionsBtn = document.getElementById('save-instructions-btn');
          if (saveInstructionsBtn) {
            saveInstructionsBtn.addEventListener('click', function() {
              if (!self.currentProject) return;
              
              var customInstructionsTextarea = document.getElementById('modal-custom-instructions');
              if (!customInstructionsTextarea) return;
              
              var instructions = customInstructionsTextarea.value;
              
              self.updateProjectInstructions(self.currentProject.id, instructions).then(function() {
                var customInstructionsModal = document.getElementById('custom-instructions-modal');
                if (customInstructionsModal) {
                  customInstructionsModal.style.display = 'none';
                }
                
                if (window.UIUtils) {
                  window.UIUtils.updateLastAction('Custom instructions updated');
                  window.UIUtils.showNotification('Custom instructions saved', 'success');
                }
              }).catch(function(error) {
                console.error('Error saving instructions:', error);
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Error saving instructions: ' + error.message, 'error');
                }
              });
            });
          }
          
          var chatgptLinkBtn = document.getElementById('chatgpt-link-btn');
          if (chatgptLinkBtn) {
            chatgptLinkBtn.addEventListener('click', function() {
              if (!self.currentProject) {
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Please select a project first', 'warning');
                }
                return;
              }
              
              var chatgptLinkInput = document.getElementById('modal-chatgpt-link');
              if (chatgptLinkInput) {
                chatgptLinkInput.value = self.currentProject.chatGPTUrl || '';
              }
              
              var chatgptLinkModal = document.getElementById('chatgpt-link-modal');
              if (chatgptLinkModal) {
                chatgptLinkModal.style.display = 'flex';
              }
            });
          }
          
          var saveChatgptLinkBtn = document.getElementById('save-chatgpt-link-btn');
          if (saveChatgptLinkBtn) {
            saveChatgptLinkBtn.addEventListener('click', function() {
              if (!self.currentProject) return;
              
              var chatgptLinkInput = document.getElementById('modal-chatgpt-link');
              if (!chatgptLinkInput) return;
              
              var url = chatgptLinkInput.value;
              
              // Simple validation
              if (url && !url.startsWith('https://chatgpt.com/')) {
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Please enter a valid ChatGPT URL (https://chatgpt.com/...)', 'warning');
                }
                return;
              }
              
              self.updateProjectChatGPTUrl(self.currentProject.id, url).then(function() {
                var chatgptLinkModal = document.getElementById('chatgpt-link-modal');
                if (chatgptLinkModal) {
                  chatgptLinkModal.style.display = 'none';
                }
                
                if (window.UIUtils) {
                  window.UIUtils.updateLastAction('ChatGPT link updated');
                  window.UIUtils.showNotification('ChatGPT conversation link saved', 'success');
                }
              }).catch(function(error) {
                console.error('Error saving ChatGPT link:', error);
                if (window.UIUtils) {
                  window.UIUtils.showNotification('Error saving link: ' + error.message, 'error');
                }
              });
            });
          }
          
          console.log('ProjectService initialized successfully');
          resolve();
        }).catch(function(error) {
          console.error('Error initializing project service:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error in ProjectService initialize:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Debounce function for rate limiting
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce: function(func, wait) {
    var timeout;
    return function() {
      var context = this;
      var args = arguments;
      var later = function() {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// Log that ProjectService has been properly initialized
console.log('ProjectService initialized and attached to window object');