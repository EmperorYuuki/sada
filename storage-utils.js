/**
 * Storage Utilities for QuillSync AI
 * This module provides functions for working with IndexedDB
 */

var StorageUtils = (function() {
    // Database configuration
    var DB_NAME = 'QuillSyncDB';
    var DB_VERSION = 1;
    
    /**
     * Open the IndexedDB database
     * @returns {Promise<IDBDatabase>} Database connection
     */
    var openDB = function() {
      return new Promise(function(resolve, reject) {
        var request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = function(event) {
          console.error('IndexedDB error:', event.target.error);
          reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
          resolve(event.target.result);
        };
        
        request.onupgradeneeded = function(event) {
          var db = event.target.result;
          
          // Create object stores if they don't exist
          createObjectStores(db, event.target.transaction);
        };
      });
    };
    
    /**
     * Create the necessary object stores in the database
     * @param {IDBDatabase} db - IndexedDB database instance
     * @param {IDBTransaction} transaction - Current upgrade transaction
     */
    var createObjectStores = function(db, transaction) {
      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        var projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('name', 'name', { unique: true });
        projectStore.createIndex('modified', 'modified', { unique: false });
        console.log('Created projects store');
      }
      
      // Glossary store
      if (!db.objectStoreNames.contains('glossary')) {
        var glossaryStore = db.createObjectStore('glossary', { keyPath: 'id' });
        glossaryStore.createIndex('projectId', 'projectId', { unique: false });
        glossaryStore.createIndex('chineseTerm', 'chineseTerm', { unique: false });
        console.log('Created glossary store');
      }
      
      // Chapters store
      if (!db.objectStoreNames.contains('chapters')) {
        var chapterStore = db.createObjectStore('chapters', { keyPath: 'id' });
        chapterStore.createIndex('projectId', 'projectId', { unique: false });
        chapterStore.createIndex('url', 'url', { unique: false });
        console.log('Created chapters store');
      }
      
      // Website configs store
      if (!db.objectStoreNames.contains('websiteConfigs')) {
        var configStore = db.createObjectStore('websiteConfigs', { keyPath: 'id' });
        configStore.createIndex('name', 'name', { unique: true });
        console.log('Created websiteConfigs store');
      }
      
      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
        console.log('Created settings store');
      }
    };
    
    /**
     * Create a transaction for the specified object store
     * @param {string} storeName - Name of the object store
     * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
     * @returns {Promise<IDBObjectStore>} Object store
     */
    var getObjectStore = async function(storeName, mode) {
      if (mode === undefined) mode = 'readonly';
      var db = await openDB();
      var transaction = db.transaction(storeName, mode);
      return transaction.objectStore(storeName);
    };
    
    /**
     * Save an item to the specified object store
     * @param {string} storeName - Name of the object store
     * @param {Object} item - Item to save
     * @returns {Promise<any>} Result of the operation
     */
    var saveItem = async function(storeName, item) {
      return new Promise(async function(resolve, reject) {
        try {
          var store = await getObjectStore(storeName, 'readwrite');
          var request = store.put(item);
          
          request.onsuccess = function(event) {
            resolve(event.target.result);
          };
          
          request.onerror = function(event) {
            console.error('Error saving to ' + storeName + ':', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          console.error('Error in saveItem for ' + storeName + ':', error);
          reject(error);
        }
      });
    };
    
    /**
     * Get an item from the specified object store by key
     * @param {string} storeName - Name of the object store
     * @param {string|number} key - Key of the item to retrieve
     * @returns {Promise<any>} Retrieved item
     */
    var getItem = async function(storeName, key) {
      return new Promise(async function(resolve, reject) {
        try {
          var store = await getObjectStore(storeName);
          var request = store.get(key);
          
          request.onsuccess = function(event) {
            resolve(event.target.result);
          };
          
          request.onerror = function(event) {
            console.error('Error getting from ' + storeName + ':', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          console.error('Error in getItem for ' + storeName + ':', error);
          reject(error);
        }
      });
    };
    
    /**
     * Get all items from the specified object store
     * @param {string} storeName - Name of the object store
     * @returns {Promise<Array>} All items in the store
     */
    var getAllItems = async function(storeName) {
      return new Promise(async function(resolve, reject) {
        try {
          var store = await getObjectStore(storeName);
          var request = store.getAll();
          
          request.onsuccess = function(event) {
            resolve(event.target.result);
          };
          
          request.onerror = function(event) {
            console.error('Error getting all from ' + storeName + ':', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          console.error('Error in getAllItems for ' + storeName + ':', error);
          reject(error);
        }
      });
    };
    
    /**
     * Delete an item from the specified object store by key
     * @param {string} storeName - Name of the object store
     * @param {string|number} key - Key of the item to delete
     * @returns {Promise<void>} Result of the operation
     */
    var deleteItem = async function(storeName, key) {
      return new Promise(async function(resolve, reject) {
        try {
          var store = await getObjectStore(storeName, 'readwrite');
          var request = store.delete(key);
          
          request.onsuccess = function(event) {
            resolve();
          };
          
          request.onerror = function(event) {
            console.error('Error deleting from ' + storeName + ':', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          console.error('Error in deleteItem for ' + storeName + ':', error);
          reject(error);
        }
      });
    };
    
    /**
     * Get items by an index value
     * @param {string} storeName - Name of the object store
     * @param {string} indexName - Name of the index
     * @param {any} value - Value to search for
     * @returns {Promise<Array>} Matching items
     */
    var getByIndex = async function(storeName, indexName, value) {
      return new Promise(async function(resolve, reject) {
        try {
          var store = await getObjectStore(storeName);
          var index = store.index(indexName);
          var request = index.getAll(value);
          
          request.onsuccess = function(event) {
            resolve(event.target.result);
          };
          
          request.onerror = function(event) {
            console.error('Error getting by index from ' + storeName + ':', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          console.error('Error in getByIndex for ' + storeName + ':', error);
          reject(error);
        }
      });
    };
    
    /**
     * Clear all data from the specified object store
     * @param {string} storeName - Name of the object store
     * @returns {Promise<void>} Result of the operation
     */
    var clearStore = async function(storeName) {
      return new Promise(async function(resolve, reject) {
        try {
          var store = await getObjectStore(storeName, 'readwrite');
          var request = store.clear();
          
          request.onsuccess = function(event) {
            resolve();
          };
          
          request.onerror = function(event) {
            console.error('Error clearing ' + storeName + ':', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          console.error('Error in clearStore for ' + storeName + ':', error);
          reject(error);
        }
      });
    };
    
    /**
     * Migrate data from localStorage to IndexedDB
     * Used for backward compatibility with the original app
     * @returns {Promise<void>} Result of the operation
     */
    var migrateFromLocalStorage = async function() {
      // Check if migration has already been done
      var migrated = localStorage.getItem('indexedDBMigrationComplete');
      if (migrated === 'true') {
        return;
      }
      
      try {
        // Get projects from localStorage
        var projectsJSON = localStorage.getItem('projects');
        if (projectsJSON) {
          var projects = JSON.parse(projectsJSON);
          
          // Add each project to IndexedDB
          for (var i = 0; i < projects.length; i++) {
            var project = projects[i];
            // Generate a proper UUID if the project doesn't have an ID
            if (!project.id) {
              project.id = crypto.randomUUID();
            }
            
            // Set timestamps if missing
            if (!project.created) {
              project.created = new Date().toISOString();
            }
            if (!project.modified) {
              project.modified = new Date().toISOString();
            }
            
            // Get project-specific data
            var input = localStorage.getItem(project.name + '-input') || '';
            var outputJSON = localStorage.getItem(project.name + '-output') || '[]';
            var chapter = localStorage.getItem(project.name + '-chapter') || '';
            var chapterUrl = localStorage.getItem(project.name + '-chapter-url') || '';
            var chatGPTUrl = localStorage.getItem(project.name + '-chatgpt-url') || '';
            
            // Add these to the project object
            project.input = input;
            project.output = outputJSON;
            project.chatGPTUrl = chatGPTUrl;
            
            // Add the project to IndexedDB
            await saveItem('projects', project);
            
            // If there's chapter data, save it as a chapter
            if (chapter && chapterUrl) {
              var chapterObj = {
                id: crypto.randomUUID(),
                projectId: project.id,
                title: project.currentChapterName || 'Imported Chapter',
                content: chapter,
                url: chapterUrl,
                prevLink: project.currentChapter ? project.currentChapter.prevLink || '' : '',
                nextLink: project.currentChapter ? project.currentChapter.nextLink || '' : '',
                dateAdded: new Date().toISOString()
              };
              
              await saveItem('chapters', chapterObj);
            }
          }
        }
        
        // Mark migration as complete
        localStorage.setItem('indexedDBMigrationComplete', 'true');
        
      } catch (error) {
        console.error('Error during localStorage migration:', error);
        throw error;
      }
    };
    
    /**
     * Generate a UUID (Universal Unique Identifier)
     * @returns {string} A UUID
     */
    var generateUUID = function() {
      return crypto.randomUUID();
    };
    
    /**
     * Local storage fallback for simple settings
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     */
    var saveSetting = function(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    };
    
    /**
     * Get a setting from local storage
     * @param {string} key - Setting key
     * @param {any} defaultValue - Default value if setting doesn't exist
     * @returns {any} Retrieved setting
     */
    var getSetting = function(key, defaultValue) {
      if (defaultValue === undefined) defaultValue = null;
      var value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    };
    
    // Export public methods
    return {
      openDB: openDB,
      saveItem: saveItem,
      getItem: getItem,
      getAllItems: getAllItems,
      deleteItem: deleteItem,
      getByIndex: getByIndex,
      clearStore: clearStore,
      migrateFromLocalStorage: migrateFromLocalStorage,
      generateUUID: generateUUID,
      saveSetting: saveSetting,
      getSetting: getSetting
    };
})();

// Make it globally available
window.StorageUtils = StorageUtils;