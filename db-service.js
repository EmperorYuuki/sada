/**
 * Database Service for QuillSync AI
 * This module handles IndexedDB initialization and migration
 */

// IMPORTANT: Define DBService directly on window object
window.DBService = {
  // Constants
  DB_NAME: 'QuillSyncDB',
  DB_VERSION: 1,
  
  // Database connection
  db: null,

  /**
   * Initialize the database
   * @returns {Promise<IDBDatabase>} IndexedDB database instance
   */
  initDatabase: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      if (self.db) {
        resolve(self.db);
        return;
      }
      
      var request = indexedDB.open(self.DB_NAME, self.DB_VERSION);
      
      request.onerror = function(event) {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = function(event) {
        self.db = event.target.result;
        console.log('Database opened successfully');
        resolve(self.db);
      };
      
      request.onupgradeneeded = function(event) {
        self.db = event.target.result;
        console.log('Database upgrade needed');
        
        // Create object stores if they don't exist
        self.createObjectStores(self.db, event.target.transaction);
      };
    });
  },
  
  /**
   * Create the necessary object stores in the database
   * @param {IDBDatabase} db - IndexedDB database instance
   * @param {IDBTransaction} transaction - Current upgrade transaction
   */
  createObjectStores: function(db, transaction) {
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
      
      // Add default website configurations using transaction
      var store = transaction.objectStore('websiteConfigs');
      
      // TRXS config
      store.add({
        id: crypto.randomUUID(),
        name: 'trxs.cc',
        baseUrl: 'https://www.trxs.cc',
        urlPattern: '^https://www\\.trxs\\.cc/tongren/\\d+/\\d+\\.html$',
        selectors: {
          chapterContent: '.read_chapterDetail',
          chapterTitle: '.read_chapterName h1',
          prevChapter: '.pageNav a[href*="tongren"][href*="html"]:nth-child(2)',
          nextChapter: '.pageNav a:contains("下一章")'
        },
        isActive: true
      });
      
      // 69yuedu config
      store.add({
        id: crypto.randomUUID(),
        name: '69yuedu.net',
        baseUrl: 'https://www.69yuedu.net',
        urlPattern: '^https://www\\.69yuedu\\.net/\\w+/\\d+/\\d+\\.html$',
        selectors: {
          chapterContent: '.content',
          chapterTitle: 'h1.hide720',
          prevChapter: '.page1 a:contains("上一章")',
          nextChapter: '.page1 a:contains("下一章")'
        },
        isActive: true
      });
    }
    
    // Settings store
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' });
      console.log('Created settings store');
    }
  },
  
  /**
   * Migrate data from localStorage to IndexedDB
   * @returns {Promise<void>}
   */
  migrateFromLocalStorage: function() {
    var self = this;
    // Check if migration has already been completed
    var migrationCompleted = localStorage.getItem('indexedDBMigrationComplete') === 'true';
    if (migrationCompleted) {
      console.log('Migration already completed, skipping');
      return Promise.resolve();
    }
    
    console.log('Starting migration from localStorage to IndexedDB');
    
    return new Promise(function(resolve, reject) {
      try {
        // Get projects from localStorage
        var projectsJSON = localStorage.getItem('projects');
        if (!projectsJSON) {
          console.log('No projects found in localStorage, nothing to migrate');
          localStorage.setItem('indexedDBMigrationComplete', 'true');
          resolve();
          return;
        }
        
        // Parse projects
        var projects = JSON.parse(projectsJSON);
        console.log('Found ' + projects.length + ' projects to migrate');
        
        // Initialize database
        self.initDatabase().then(function(db) {
          // Start transaction
          var transaction = db.transaction(['projects', 'chapters'], 'readwrite');
          var projectStore = transaction.objectStore('projects');
          var chapterStore = transaction.objectStore('chapters');
          
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
            
            // Initialize settings if missing
            if (!project.settings) {
              project.settings = {
                translationMethod: 'chatgpt',
                openRouterApiKey: '',
                openRouterModel: '',
                autoVerify: false,
                customChunkSize: 1000,
                chunkingStrategy: 'auto'
              };
            }
            
            // Add the project to IndexedDB
            projectStore.add(project);
            console.log('Migrated project: ' + project.name);
            
            // If there's chapter data, save it as a chapter
            if (chapter && chapterUrl) {
              var chapterObj = {
                id: crypto.randomUUID(),
                projectId: project.id,
                title: project.currentChapterName || 'Imported Chapter',
                content: chapter,
                url: chapterUrl,
                prevLink: project.currentChapter && project.currentChapter.prevLink ? project.currentChapter.prevLink : '',
                nextLink: project.currentChapter && project.currentChapter.nextLink ? project.currentChapter.nextLink : '',
                dateAdded: new Date().toISOString()
              };
              
              chapterStore.add(chapterObj);
              console.log('Migrated chapter for project: ' + project.name);
            }
          }
          
          transaction.oncomplete = function() {
            console.log('Migration from localStorage completed successfully');
            localStorage.setItem('indexedDBMigrationComplete', 'true');
            resolve();
          };
          
          transaction.onerror = function(event) {
            console.error('Migration error:', event.target.error);
            reject(event.target.error);
          };
        }).catch(function(error) {
          reject(error);
        });
      } catch (error) {
        console.error('Error during migration:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Initialize database and run migrations
   * @returns {Promise<void>}
   */
  initialize: function() {
    var self = this;
    console.log('Initializing database service');
    
    return new Promise(function(resolve, reject) {
      self.initDatabase()
        .then(function() {
          return self.migrateFromLocalStorage();
        })
        .then(function() {
          console.log('Database service initialized successfully');
          resolve();
        })
        .catch(function(error) {
          console.error('Error initializing database service:', error);
          reject(error);
        });
    });
  }
};

// Log that DBService has been properly initialized
console.log('DBService initialized and attached to window object');