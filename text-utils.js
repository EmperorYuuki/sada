/**
 * Text Processing Utilities for QuillSync AI
 * This module provides functions for text manipulation, analysis, and prompt generation
 */

// IMPORTANT: Define TextUtils directly on window object
window.TextUtils = {
  /**
   * Count words in a text
   * @param {string} text - The text to count words in
   * @returns {number} Number of words
   */
  countWords: function(text) {
    if (!text || typeof text !== 'string') return 0;
    
    // Optimize for Chinese text by handling Chinese characters and English words
    // Chinese doesn't use spaces between words, so we need special handling
    const chineseCharacters = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    
    // Count English words (space-separated)
    const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '') // Remove Chinese characters
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
    
    // For Chinese, we consider each character as a word
    return chineseCharacters + englishWords;
  },
  
  /**
   * Estimate reading time in minutes
   * @param {string} text - The text to estimate reading time for
   * @param {number} wordsPerMinute - Reading speed in words per minute
   * @returns {number} Estimated reading time in minutes
   */
  estimateReadingTime: function(text, wordsPerMinute) {
    if (!text || typeof text !== 'string') return 0;
    if (wordsPerMinute === undefined || wordsPerMinute <= 0) wordsPerMinute = 200;
    
    const words = this.countWords(text);
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  },
  
  /**
   * Split text into chunks based on chapter titles
   * Uses TextChunkerService to avoid duplication
   * @param {string} text - The text to split
   * @returns {string[]} Array of chunks
   */
  splitByChapters: function(text) {
    try {
      // Check if TextChunkerService exists and has the appropriate method
      if (window.TextChunkerService && typeof window.TextChunkerService.chunkByChapters === 'function') {
        return window.TextChunkerService.chunkByChapters(text);
      }
      
      // Fallback implementation if TextChunkerService is not available
      if (!text || typeof text !== 'string') return [];
      
      var chapterTitleRegex = /第\d+章\s.+/g;
      var matches = Array.from(text.matchAll(chapterTitleRegex));
      var chunks = [];
      
      if (matches.length === 0) {
        chunks.push(text.trim());
      } else {
        var lastIndex = 0;
        
        // Check if there's content before the first chapter
        if (matches[0].index > 0) {
          var firstChunk = text.substring(0, matches[0].index).trim();
          if (firstChunk) chunks.push(firstChunk);
        }
        
        // Process each chapter
        for (var i = 0; i < matches.length; i++) {
          var start = matches[i].index;
          var end = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
          var chunk = text.substring(start, end).trim();
          
          if (chunk) {
            chunks.push(chunk);
          }
          
          lastIndex = end;
        }
        
        // Check if there's content after the last chapter
        if (lastIndex < text.length) {
          var lastChunk = text.substring(lastIndex).trim();
          if (lastChunk) {
            chunks.push(lastChunk);
          }
        }
      }
      
      return chunks;
    } catch (error) {
      console.error('Error in splitByChapters:', error);
      // Return original text as a single chunk on error
      return text ? [text] : [];
    }
  },
  
  /**
   * Split text by word count
   * Uses TextChunkerService to avoid duplication
   * @param {string} text - The text to split
   * @param {number} wordLimit - Maximum words per chunk
   * @returns {string[]} Array of chunks
   */
  splitByWordCount: function(text, wordLimit) {
    try {
      // Use TextChunkerService if available
      if (window.TextChunkerService && typeof window.TextChunkerService.chunkByWordCount === 'function') {
        return window.TextChunkerService.chunkByWordCount(text, wordLimit);
      }
      
      // Fallback implementation
      if (wordLimit === undefined) wordLimit = 1000;
      if (!text || typeof text !== 'string') return [];
      
      var paragraphs = text.split(/\n\s*\n/);
      var chunks = [];
      var currentChunk = [];
      var currentWordCount = 0;
      
      // Helper function to count words
      const countWords = (t) => this.countWords(t);
      
      for (var i = 0; i < paragraphs.length; i++) {
        var paragraph = paragraphs[i];
        var paragraphWordCount = countWords(paragraph);
        
        // If a single paragraph exceeds the word limit, split it by sentences
        if (paragraphWordCount > wordLimit) {
          // Flush current chunk if there's anything in it
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n\n'));
            currentChunk = [];
            currentWordCount = 0;
          }
          
          // Split long paragraph by sentences
          var sentences = paragraph.split(/(?<=[.!?。？！])\s+/);
          var sentenceChunk = [];
          var sentenceWordCount = 0;
          
          for (var j = 0; j < sentences.length; j++) {
            var sentence = sentences[j];
            var sentenceWords = countWords(sentence);
            
            if (sentenceWordCount + sentenceWords <= wordLimit) {
              sentenceChunk.push(sentence);
              sentenceWordCount += sentenceWords;
            } else {
              if (sentenceChunk.length > 0) {
                chunks.push(sentenceChunk.join(' '));
                sentenceChunk = [sentence];
                sentenceWordCount = sentenceWords;
              } else {
                // The sentence itself is too long, split at a character level as a last resort
                if (sentenceWords > wordLimit) {
                  var chars = sentence.split('');
                  var charChunks = [];
                  var currentCharChunk = [];
                  var charCount = 0;
                  var charLimit = wordLimit * 2; // Approximate chars to words ratio
                  
                  chars.forEach(char => {
                    if (charCount < charLimit) {
                      currentCharChunk.push(char);
                      charCount++;
                    } else {
                      charChunks.push(currentCharChunk.join(''));
                      currentCharChunk = [char];
                      charCount = 1;
                    }
                  });
                  
                  if (currentCharChunk.length > 0) {
                    charChunks.push(currentCharChunk.join(''));
                  }
                  
                  // Add all char chunks to the result
                  chunks = chunks.concat(charChunks);
                } else {
                  chunks.push(sentence);
                }
                sentenceChunk = [];
                sentenceWordCount = 0;
              }
            }
          }
          
          if (sentenceChunk.length > 0) {
            chunks.push(sentenceChunk.join(' '));
          }
        } 
        // For normal paragraphs, add to current chunk if within word limit
        else if (currentWordCount + paragraphWordCount <= wordLimit) {
          currentChunk.push(paragraph);
          currentWordCount += paragraphWordCount;
        } 
        // Otherwise, start a new chunk
        else {
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n\n'));
          }
          currentChunk = [paragraph];
          currentWordCount = paragraphWordCount;
        }
      }
      
      // Add any remaining content
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n\n'));
      }
      
      return chunks;
    } catch (error) {
      console.error('Error in splitByWordCount:', error);
      // Return original text as a single chunk on error
      return text ? [text] : [];
    }
  },
  
  /**
   * Auto-detect the best chunking strategy
   * Uses TextChunkerService to avoid duplication
   * @param {string} text - The text to analyze
   * @param {number} chunkSize - Optional chunk size for word-count strategy
   * @returns {string[]} Array of chunks
   */
  autoChunk: function(text, chunkSize) {
    try {
      // Use TextChunkerService if available
      if (window.TextChunkerService && typeof window.TextChunkerService.autoChunk === 'function') {
        return window.TextChunkerService.autoChunk(text, chunkSize);
      }
      
      // Fallback implementation
      if (!text || typeof text !== 'string') return [];
      if (chunkSize === undefined) chunkSize = 1000;
      
      // Check if the text contains chapter titles
      var chapterTitleRegex = /第\d+章\s.+/g;
      var hasChapterTitles = chapterTitleRegex.test(text);
      
      // If there are chapter titles, use chapter-based chunking
      if (hasChapterTitles) {
        return this.splitByChapters(text);
      }
      
      // If the text is longer than 2000 words, use word count chunking
      var totalWords = this.countWords(text);
      if (totalWords > 2000) {
        return this.splitByWordCount(text, chunkSize);
      }
      
      // Otherwise, keep it as a single chunk
      return [text];
    } catch (error) {
      console.error('Error in autoChunk:', error);
      // Return original text as a single chunk on error
      return text ? [text] : [];
    }
  },
  
  /**
   * Apply glossary replacements to text
   * @param {string} text - The text to process
   * @param {Array} glossaryEntries - Array of glossary entries
   * @returns {string} Processed text
   */
  applyGlossary: function(text, glossaryEntries) {
    try {
      // Use GlossaryService if available
      if (window.GlossaryService && typeof window.GlossaryService.applyGlossary === 'function') {
        return window.GlossaryService.applyGlossary(text, glossaryEntries);
      }
      
      // Fallback implementation
      if (!text || typeof text !== 'string' || !Array.isArray(glossaryEntries)) return text;
      
      var processedText = text;
      
      // Sort entries by Chinese term length (longest first) to prevent partial replacements
      var sortedEntries = glossaryEntries.slice().sort(function(a, b) {
        return b.chineseTerm.length - a.chineseTerm.length;
      });
      
      // Create a map for faster lookup
      var glossaryMap = new Map();
      sortedEntries.forEach(entry => {
        if (entry.chineseTerm && entry.translation) {
          glossaryMap.set(entry.chineseTerm, entry.translation);
        }
      });
      
      // Only proceed if we have valid entries
      if (glossaryMap.size === 0) return text;
      
      // For very large texts, process in chunks to avoid regex timeout
      if (text.length > 100000) {
        const chunkSize = 50000;
        const chunks = [];
        
        for (let i = 0; i < text.length; i += chunkSize) {
          const chunkText = text.substring(i, i + chunkSize);
          let processedChunk = chunkText;
          
          // Process each glossary term
          glossaryMap.forEach((translation, term) => {
            const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            processedChunk = processedChunk.replace(regex, translation);
          });
          
          chunks.push(processedChunk);
        }
        
        return chunks.join('');
      } else {
        // For smaller texts, process all at once
        glossaryMap.forEach((translation, term) => {
          const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          processedText = processedText.replace(regex, translation);
        });
        
        return processedText;
      }
    } catch (error) {
      console.error('Error applying glossary:', error);
      // Return original text on error
      return text;
    }
  },
  
  /**
   * Generate a prompt for OpenRouter API
   * @param {string} text - The text to translate
   * @param {string} customInstructions - Custom instructions to include
   * @returns {string} Formatted prompt
   */
  generateTranslationPrompt: function(text, customInstructions) {
    if (!text) return '';
    
    try {
      // Sanitize and trim the input text
      const sanitizedText = String(text).trim();
      
      let prompt = 'Translate this Chinese text to English:';
      
      if (customInstructions) {
        prompt = String(customInstructions).trim() + '\n\n' + prompt;
      }
      
      // Add text analysis guidance for better translation
      if (sanitizedText.length > 1000) {
        prompt += '\n\nThis is a longer text. Please maintain consistency in terminology and style throughout the translation.';
      }
      
      // Check if text contains dialog
      if (sanitizedText.includes('"') || sanitizedText.includes('"') || 
          sanitizedText.includes('「') || sanitizedText.includes('」')) {
        prompt += '\n\nPlease preserve dialog formatting and character speech patterns in the translation.';
      }
      
      return prompt + '\n\n' + sanitizedText;
    } catch (error) {
      console.error('Error generating translation prompt:', error);
      return `Translate this Chinese text to English:\n\n${text}`;
    }
  },
  
  /**
   * Generate a verification prompt for OpenRouter API
   * @param {string} sourceText - Original Chinese text
   * @param {string} translatedText - English translation
   * @param {Array} glossaryEntries - Array of glossary entries
   * @returns {string} Formatted verification prompt
   */
  generateVerificationPrompt: function(sourceText, translatedText, glossaryEntries) {
    try {
      if (!sourceText || !translatedText) {
        throw new Error('Source text and translated text are required');
      }
      
      if (glossaryEntries === undefined) glossaryEntries = [];
      
      // Process glossary entries if available
      let glossarySection = '';
      if (Array.isArray(glossaryEntries) && glossaryEntries.length > 0) {
        const validEntries = glossaryEntries.filter(entry => 
          entry && entry.chineseTerm && entry.translation);
        
        if (validEntries.length > 0) {
          glossarySection = 'Glossary Terms to Check:\n' +
            validEntries
              .map(entry => `${entry.chineseTerm}: ${entry.translation}`)
              .join('\n');
        }
      }
      
      // Truncate texts if they're too long to avoid token limits
      const MAX_LENGTH = 2000;
      let truncatedSourceText = sourceText;
      let truncatedTranslatedText = translatedText;
      
      if (sourceText.length > MAX_LENGTH) {
        truncatedSourceText = sourceText.substring(0, MAX_LENGTH) + 
          `... [truncated, ${sourceText.length - MAX_LENGTH} more characters]`;
      }
      
      if (translatedText.length > MAX_LENGTH) {
        truncatedTranslatedText = translatedText.substring(0, MAX_LENGTH) + 
          `... [truncated, ${translatedText.length - MAX_LENGTH} more characters]`;
      }
      
      return 'I\'ll provide you with a Chinese text and its English translation.\n' +
        '\n' +
        'Please verify the translation and check for:\n' +
        '\n' +
        '1. Completeness: Ensure all content from the source is present in the translation.\n' +
        '2. Accuracy: Check if the meaning is conveyed correctly.\n' +
        '3. Glossary compliance: Verify if specific terms are translated consistently, based on this glossary.\n' +
        '\n' +
        'Respond in JSON format with the following structure:\n' +
        '{\n' +
        '  "completeness": 0-100 (percentage of content translated),\n' +
        '  "accuracy": 0-100 (estimated accuracy),\n' +
        '  "missingContent": ["List of sections/sentences missing"],\n' +
        '  "issues": [{\n' +
        '    "sourceText": "Original text",\n' +
        '    "translatedText": "Problematic translation",\n' +
        '    "issue": "Description of the issue",\n' +
        '    "suggestion": "Suggested correction"\n' +
        '  }]\n' +
        '}\n' +
        '\n' +
        'Chinese Text:\n' +
        truncatedSourceText + '\n' +
        '\n' +
        'English Translation:\n' +
        truncatedTranslatedText + '\n' +
        '\n' +
        glossarySection;
    } catch (error) {
      console.error('Error generating verification prompt:', error);
      // Return a basic prompt as fallback
      return `Please verify this translation from Chinese to English:\n\nChinese: ${sourceText}\n\nEnglish: ${translatedText}`;
    }
  },
  
  /**
   * Generate a glossary generation prompt for OpenRouter API
   * @param {string} text - The text to analyze
   * @param {string} fandomContext - Optional fandom context (e.g., "Naruto", "Xianxia")
   * @returns {string} Formatted prompt
   */
  generateGlossaryPrompt: function(text, fandomContext = '') {
    try {
      if (!text) return '';
      
      // Sanitize inputs
      const sanitizedText = String(text).trim();
      const sanitizedContext = String(fandomContext || '').trim();
      
      // Truncate text if it's too long
      const MAX_LENGTH = 5000;
      let truncatedText = sanitizedText;
      
      if (sanitizedText.length > MAX_LENGTH) {
        truncatedText = sanitizedText.substring(0, MAX_LENGTH) + 
          `... [truncated, ${sanitizedText.length - MAX_LENGTH} more characters]`;
      }
      
      const fandomInfo = sanitizedContext ? 
        `\n\nIMPORTANT CONTEXT: This text is from the "${sanitizedContext}" fandom/universe. Use this context to identify special terms, names, locations, and concepts specific to this setting.` : '';
      
      return `You are a highly specialized glossary extraction expert for Chinese to English translation. Your ONLY output MUST be a valid JSON array. No explanations, markdown, or any other text.

TASK:
Extract proper nouns, terminology, and recurring phrases from this Chinese text that would need consistent translation. Chinese names, locations, titles, and setting-specific terms are particularly important.${fandomInfo}

RULES:
1. Focus on proper nouns, special terminology, and phrases that would be confusing if translated inconsistently.
2. For characters, extract full names and individual name components (given name, family name, titles, etc.).
3. If the same concept appears in different forms, include each variant.
4. Special care for: character names, locations, cultivation techniques, mythological concepts, ranks/titles.
5. Include terms even if you're unsure of the perfect translation - these are more critical for consistency.
6. Do NOT include common words or phrases unless they have special meaning in context.

REQUIRED OUTPUT FORMAT:
A valid, properly formatted JSON array where each item is an object with these fields:
- "chineseTerm": The original Chinese term (REQUIRED)
- "translation": Your suggested English translation (REQUIRED)
- "category": One of: "character", "location", "technique", "item", "concept", "title", "organization", or "other" (REQUIRED)
- "notes": Brief context or explanation (OPTIONAL)

EXAMPLE (do NOT include this in your output):
[
  {"chineseTerm": "林动", "translation": "Lin Dong", "category": "character", "notes": "Main protagonist"},
  {"chineseTerm": "元婴期", "translation": "Yuan Ying Stage", "category": "concept", "notes": "Cultivation stage"}
]

CRITICAL: 
- Verify your output is valid JSON with balanced brackets and proper comma use
- Do NOT include code blocks like \`\`\`json\`\`\` around the output
- Provide ONLY the JSON array as your complete answer

Now analyze this text:
${truncatedText}`;
    } catch (error) {
      console.error('Error generating glossary prompt:', error);
      // Return a basic prompt as fallback
      return `Extract important terminology from this Chinese text and provide translations:\n\n${text}`;
    }
  },

  /**
   * Generate a prompt for verifying and correcting glossary JSON
   * @param {string} glossaryJson - Raw JSON string from initial generation
   * @returns {string} Formatted verification prompt
   */
  generateGlossaryVerificationPrompt: function(glossaryJson) {
    try {
      if (!glossaryJson) {
        throw new Error('Glossary JSON is required');
      }
      
      // Sanitize the input
      const sanitizedJson = String(glossaryJson).trim();
      
      return `You are a specialized JSON validator for glossary entries. You must fix this JSON array of glossary entries to ensure it is valid and properly formatted.

CRITICAL REQUIREMENTS:
1. Your ONLY output MUST be the corrected, valid JSON array - no explanations, no markdown, just the fixed JSON
2. Ensure all JSON syntax is valid: balanced brackets, correct commas, properly quoted strings
3. Each entry MUST have these fields:
   - "chineseTerm": string (REQUIRED)
   - "translation": string (REQUIRED)
   - "category": string (one of: "character", "location", "technique", "item", "concept", "title", "organization", "other") (REQUIRED)
   - "notes": string (can be empty) (REQUIRED)
4. If an entry is missing required fields, add them with suitable default values
5. If the input is severely malformed beyond repair, return a minimal valid array: [{"chineseTerm": "错误", "translation": "Error", "category": "other", "notes": "Glossary generation failed"}]

PROCESS:
1. Extract any JSON-like structure in the input
2. Fix syntax errors (brackets, commas, quotes)
3. Check and correct each entry for required fields
4. Return only the corrected JSON array

Here is the JSON to fix:
${sanitizedJson}`;
    } catch (error) {
      console.error('Error generating glossary verification prompt:', error);
      return `Please fix this JSON array to ensure it is valid: ${glossaryJson}`;
    }
  },
  
  /**
   * Detect the language of a text (simplified implementation)
   * @param {string} text - Text to analyze
   * @returns {string} Language code ('zh' for Chinese, 'en' for English, 'mixed' or 'unknown')
   */
  detectLanguage: function(text) {
    if (!text || typeof text !== 'string') return 'unknown';
    
    try {
      const sample = text.trim().substring(0, 1000); // Take a sample for performance
      
      // Chinese character detection (simplified and traditional)
      const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/;
      const chineseCount = (sample.match(chineseRegex) || []).length;
      
      // English character detection
      const englishRegex = /[a-zA-Z]/;
      const englishCount = (sample.match(englishRegex) || []).length;
      
      const totalLength = sample.length;
      
      // Calculate percentages
      const chinesePercentage = (chineseCount / totalLength) * 100;
      const englishPercentage = (englishCount / totalLength) * 100;
      
      // Determine language based on percentages
      if (chinesePercentage > 50) {
        return 'zh';
      } else if (englishPercentage > 50) {
        return 'en';
      } else if (chineseCount > 0 && englishCount > 0) {
        return 'mixed';
      } else {
        return 'unknown';
      }
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'unknown';
    }
  },
  
  /**
   * Get a simple text statistics report
   * @param {string} text - Text to analyze
   * @returns {Object} Statistics object
   */
  getTextStats: function(text) {
    if (!text || typeof text !== 'string') {
      return {
        characters: 0,
        words: 0,
        lines: 0,
        paragraphs: 0,
        readingTime: 0,
        language: 'unknown'
      };
    }
    
    try {
      const characters = text.length;
      const words = this.countWords(text);
      const lines = text.split(/\n/).filter(line => line.trim().length > 0).length;
      const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
      const readingTime = this.estimateReadingTime(text);
      const language = this.detectLanguage(text);
      
      return {
        characters,
        words,
        lines,
        paragraphs,
        readingTime,
        language
      };
    } catch (error) {
      console.error('Error calculating text stats:', error);
      return {
        characters: text.length,
        words: 0,
        lines: 0,
        paragraphs: 0,
        readingTime: 0,
        language: 'unknown',
        error: error.message
      };
    }
  }
};

// Log that TextUtils has been properly initialized
console.log('TextUtils initialized and attached to window object');