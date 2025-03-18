/**
 * Text Chunker Service for QuillSync AI
 * This module handles different strategies for breaking down large texts
 */

// IMPORTANT: Define TextChunkerService directly on window object
window.TextChunkerService = {
  /**
   * Process text using the selected chunking strategy
   * @param {string} text - Text to chunk
   * @param {string} strategy - Chunking strategy ('auto', 'chapter', 'word-count')
   * @param {number} chunkSize - Target chunk size for word count strategy
   * @returns {Array<string>} Array of text chunks
   */
  chunkText: function(text, strategy, chunkSize) {
    if (strategy === undefined) strategy = 'auto';
    if (chunkSize === undefined) chunkSize = 1000;
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return [];
    }
    
    switch (strategy) {
      case 'chapter':
        return this.chunkByChapters(text);
      case 'word-count':
        return this.chunkByWordCount(text, chunkSize);
      case 'auto':
      default:
        return this.autoChunk(text, chunkSize);
    }
  },
  
  /**
   * Automatically determine the best chunking strategy
   * @param {string} text - Text to chunk
   * @param {number} chunkSize - Target chunk size for word count strategy
   * @returns {Array<string>} Array of text chunks
   */
  autoChunk: function(text, chunkSize) {
    if (chunkSize === undefined) chunkSize = 1000;
    
    // Check for chapter headings
    var chapterTitleRegex = /第\d+章\s.+/g;
    var hasChapterTitles = chapterTitleRegex.test(text);
    
    if (hasChapterTitles) {
      return this.chunkByChapters(text);
    }
    
    // If no chapter titles, check if text is long enough to need chunking
    var wordCount = 0;
    if (window.TextUtils) {
      wordCount = window.TextUtils.countWords(text);
    } else {
      // Basic word count if TextUtils not available
      wordCount = text.split(/\s+/).length;
    }
    
    if (wordCount > 2000) {
      return this.chunkByWordCount(text, chunkSize);
    }
    
    // Otherwise return as a single chunk
    return [text];
  },
  
  /**
   * Chunk text by chapter headings
   * @param {string} text - Text to chunk
   * @returns {Array<string>} Array of text chunks by chapter
   */
  chunkByChapters: function(text) {
    var chapterTitleRegex = /第\d+章\s.+/g;
    var matches = Array.from(text.matchAll(chapterTitleRegex));
    var chunks = [];
    
    // If no chapter titles found, return the whole text as one chunk
    if (matches.length === 0) {
      chunks.push(text);
      return chunks;
    }
    
    // Check if there's content before the first chapter
    if (matches[0].index > 0) {
      var firstChunk = text.substring(0, matches[0].index).trim();
      if (firstChunk) {
        chunks.push(firstChunk);
      }
    }
    
    // Process each chapter
    for (var i = 0; i < matches.length; i++) {
      var start = matches[i].index;
      var end = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
      var chunk = text.substring(start, end).trim();
      
      if (chunk) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  },
  
  /**
   * Chunk text by word count
   * @param {string} text - Text to chunk
   * @param {number} targetWordCount - Target words per chunk
   * @returns {Array<string>} Array of text chunks by word count
   */
  chunkByWordCount: function(text, targetWordCount) {
    if (targetWordCount === undefined) targetWordCount = 1000;
    
    // Split text into paragraphs
    var paragraphs = text.split(/\n\s*\n/);
    var chunks = [];
    var currentChunk = [];
    var currentWordCount = 0;
    
    // Helper function to count words if TextUtils is not available
    var countWords = function(text) {
      if (window.TextUtils) {
        return window.TextUtils.countWords(text);
      } else {
        return text.trim().split(/\s+/).filter(function(word) { return word !== ''; }).length;
      }
    };
    
    for (var i = 0; i < paragraphs.length; i++) {
      var paragraph = paragraphs[i];
      var paragraphWordCount = countWords(paragraph);
      
      // Handle exceptionally long paragraphs
      if (paragraphWordCount > targetWordCount) {
        // If we have content in the current chunk, add it as a chunk
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join('\n\n'));
          currentChunk = [];
          currentWordCount = 0;
        }
        
        // Split the long paragraph by sentences
        var sentences = paragraph.split(/(?<=[.!?。？！])\s+/);
        var sentenceChunk = [];
        var sentenceWordCount = 0;
        
        for (var j = 0; j < sentences.length; j++) {
          var sentence = sentences[j];
          var sentenceWords = countWords(sentence);
          
          if (sentenceWordCount + sentenceWords <= targetWordCount) {
            sentenceChunk.push(sentence);
            sentenceWordCount += sentenceWords;
          } else {
            if (sentenceChunk.length > 0) {
              chunks.push(sentenceChunk.join(' '));
              sentenceChunk = [sentence];
              sentenceWordCount = sentenceWords;
            } else {
              // The sentence itself is too long, we have to add it as is
              chunks.push(sentence);
              sentenceChunk = [];
              sentenceWordCount = 0;
            }
          }
        }
        
        // Add any remaining sentences
        if (sentenceChunk.length > 0) {
          chunks.push(sentenceChunk.join(' '));
        }
      } 
      // Normal paragraph handling
      else if (currentWordCount + paragraphWordCount <= targetWordCount) {
        currentChunk.push(paragraph);
        currentWordCount += paragraphWordCount;
      } else {
        // This paragraph would exceed the target, so create a new chunk
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join('\n\n'));
        }
        currentChunk = [paragraph];
        currentWordCount = paragraphWordCount;
      }
    }
    
    // Add the last chunk if there's anything left
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
    }
    
    return chunks;
  },
  
  /**
   * Get human-readable chunk information
   * @param {string} text - Text to analyze
   * @param {string} strategy - Chunking strategy
   * @param {number} chunkSize - Target chunk size for word count strategy
   * @returns {Object} Information about chunks
   */
  getChunkInfo: function(text, strategy, chunkSize) {
    if (strategy === undefined) strategy = 'auto';
    if (chunkSize === undefined) chunkSize = 1000;
    
    var chunks = this.chunkText(text, strategy, chunkSize);
    
    var totalWords = 0;
    if (window.TextUtils) {
      totalWords = window.TextUtils.countWords(text);
    } else {
      totalWords = text.trim().split(/\s+/).filter(function(word) { return word !== ''; }).length;
    }
    
    var countWords = function(text) {
      if (window.TextUtils) {
        return window.TextUtils.countWords(text);
      } else {
        return text.trim().split(/\s+/).filter(function(word) { return word !== ''; }).length;
      }
    };
    
    var chunkSizes = chunks.map(function(chunk) {
      return {
        words: countWords(chunk),
        preview: chunk.substring(0, 50) + (chunk.length > 50 ? '...' : '')
      };
    });
    
    var totalChunks = chunks.length;
    var averageChunkSize = totalChunks > 0 ? totalWords / totalChunks : 0;
    
    var detectedStrategy = strategy;
    if (strategy === 'auto' && totalChunks > 1) {
      detectedStrategy = text.match(/第\d+章\s.+/g) ? 'chapter' : 'word-count';
    } else if (strategy === 'auto' && totalChunks <= 1) {
      detectedStrategy = 'single';
    }
    
    return {
      totalChunks: totalChunks,
      totalWords: totalWords,
      strategy: detectedStrategy,
      chunkSizes: chunkSizes,
      averageChunkSize: averageChunkSize
    };
  },
  
  /**
   * Generate a user-friendly description of chunking
   * @param {string} text - Text to analyze
   * @param {string} strategy - Chunking strategy
   * @param {number} chunkSize - Target chunk size for word count strategy
   * @returns {string} Human-readable description
   */
  getChunkDescription: function(text, strategy, chunkSize) {
    if (strategy === undefined) strategy = 'auto';
    if (chunkSize === undefined) chunkSize = 1000;
    
    var info = this.getChunkInfo(text, strategy, chunkSize);
    
    if (info.totalChunks <= 1) {
      return 'Text will be processed as a single chunk (' + info.totalWords + ' words)';
    }
    
    var description = '';
    
    switch (info.strategy) {
      case 'chapter':
        description = 'Text will be split into ' + info.totalChunks + ' chapters';
        break;
      case 'word-count':
        description = 'Text will be split into ' + info.totalChunks + ' chunks of ~' + 
                     Math.round(info.averageChunkSize) + ' words each';
        break;
      default:
        description = 'Text will be split into ' + info.totalChunks + ' chunks';
    }
    
    return description + ' (' + info.totalWords + ' words total)';
  }
};

// Log that TextChunkerService has been properly initialized
console.log('TextChunkerService initialized and attached to window object');