
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

type VoiceCallback = (text: string) => void;
type TriggerCallback = (phrase: string) => void;

// List of trigger phrases
export const TRIGGER_PHRASES = [
  'someone is following me',
  'am i safe here',
  'help me',
  'get me out of here',
  'i\'m scared'
];

class VoiceRecognition {
  recognition: any = null;
  isListening: boolean = false;
  confidenceThreshold: number = 0.3; // Lower threshold to improve recognition
  minWordCount: number = 1; // Lower word count to improve recognition
  inactivityTimeout: number | null = null;
  lastResultTime: number = 0;
  inactivityTimeoutMs: number = 15000; // Longer timeout for better recognition
  isInitialized: boolean = false;

  constructor() {
    this.initRecognition();
  }

  initRecognition() {
    if (this.isInitialized) return;
    
    try {
      const windowWithSpeech = window as IWindow;
      if (windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition) {
        const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Initialize with improved settings for better voice recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3; // Increase alternatives for better matching
        
        this.isInitialized = true;
        console.log("Voice recognition initialized successfully");
      } else {
        console.warn("Speech recognition not supported in this browser");
      }
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
    }
  }

  start(onResult: VoiceCallback, onTriggerPhrase?: TriggerCallback) {
    if (!this.recognition) {
      console.error('Speech recognition not supported or not initialized');
      this.initRecognition(); // Try to reinitialize
      if (!this.recognition) return;
    }

    if (this.isListening) {
      console.log('Already listening');
      return;
    }

    this.recognition.onresult = (event: any) => {
      this.lastResultTime = Date.now();
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        const confidence = event.results[i][0].confidence;
        
        // Collect transcripts
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          
          // Apply more lenient filters to reduce false negatives
          if (confidence < this.confidenceThreshold) {
            console.log(`Low confidence result (${confidence.toFixed(2)}): ${transcript}`);
            // Continue processing even with low confidence
          }
          
          const wordCount = transcript.split(/\s+/).length;
          if (wordCount < this.minWordCount) {
            console.log(`Short phrase (${wordCount} words): ${transcript}`);
            // Continue with short phrases too
          }
          
          console.log(`Voice recognized (FINAL): "${transcript}" (confidence: ${confidence.toFixed(2)})`);
          onResult(transcript);

          // Check for trigger phrases with less strict matching
          if (onTriggerPhrase) {
            for (const phrase of TRIGGER_PHRASES) {
              if (transcript.includes(phrase) || this.findSimilarPhrase(transcript, phrase)) {
                console.log(`Trigger phrase detected: "${phrase}"`);
                onTriggerPhrase(phrase);
                break;
              }
            }
          }
        } else {
          interimTranscript += transcript;
          console.log(`Voice recognized (interim): "${transcript}" (confidence: ${confidence.toFixed(2)})`);
          // Send interim results too, marked as interim
          onResult(`${interimTranscript} (listening...)`);
        }
      }
      
      // Reset inactivity timeout
      this.resetInactivityTimeout();
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        console.error('Microphone access denied');
        onResult("Microphone access denied. Please enable microphone permissions.");
      } else if (event.error === 'no-speech') {
        // Just log and continue for no-speech errors
        console.log('No speech detected');
        this.resetInactivityTimeout();
      } else if (event.error === 'audio-capture') {
        console.error('No microphone detected');
        onResult("No microphone detected. Please connect a microphone and try again.");
      } else {
        // For other errors, try to restart after a delay
        console.log(`Recognition error: ${event.error}, attempting restart`);
        setTimeout(() => {
          if (this.isListening) {
            this.stop();
            this.start(onResult, onTriggerPhrase);
          }
        }, 1000);
      }
    };

    // Handle potential recognition end
    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      // If we're still supposed to be listening, restart
      if (this.isListening) {
        console.log('Restarting speech recognition...');
        try {
          setTimeout(() => {
            if (this.isListening) {
              this.recognition.start();
            }
          }, 500);
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
          this.isListening = false;
        }
      }
    };

    try {
      console.log('Starting voice recognition...');
      this.recognition.start();
      this.isListening = true;
      this.lastResultTime = Date.now();
      this.resetInactivityTimeout();
      onResult("I'm listening...");
      console.log('Voice recognition started');
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      onResult("Failed to start voice recognition. Please try again.");
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) return;

    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
    
    try {
      this.recognition.stop();
      console.log('Voice recognition stopped');
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
    
    this.isListening = false;
  }
  
  resetInactivityTimeout() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    
    this.inactivityTimeout = window.setTimeout(() => {
      const timeSinceLastResult = Date.now() - this.lastResultTime;
      if (timeSinceLastResult >= this.inactivityTimeoutMs) {
        console.log('Voice recognition stopped due to inactivity');
        this.stop();
      }
    }, this.inactivityTimeoutMs);
  }
  
  // Compare words to find similar phrases (fuzzy matching)
  findSimilarPhrase(input: string, phrase: string): boolean {
    const inputWords = input.split(/\s+/);
    const phraseWords = phrase.split(/\s+/);
    
    // Count how many words from the phrase appear in the input
    let matchCount = 0;
    for (const phraseWord of phraseWords) {
      if (inputWords.some(word => this.wordsAreSimilar(word, phraseWord))) {
        matchCount++;
      }
    }
    
    // If more than 70% of words match, consider it a match
    return matchCount >= phraseWords.length * 0.7;
  }
  
  // Simple word similarity check
  wordsAreSimilar(word1: string, word2: string): boolean {
    // Exact match
    if (word1 === word2) return true;
    
    // One contains the other
    if (word1.includes(word2) || word2.includes(word1)) return true;
    
    // Levenshtein distance (simple version)
    if (word1.length > 3 && word2.length > 3) {
      // For longer words, allow more differences
      const maxDistance = Math.floor(Math.max(word1.length, word2.length) * 0.3);
      return this.levenshteinDistance(word1, word2) <= maxDistance;
    }
    
    return false;
  }
  
  // Calculate Levenshtein distance between two strings
  levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
  
  // Allow adjustment of sensitivity
  setConfidenceThreshold(threshold: number) {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }
  
  setMinWordCount(count: number) {
    this.minWordCount = Math.max(1, count);
  }
}

// Text-to-Speech using Web Speech API
class WebSpeechSynthesis {
  speak(text: string) {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to use a more natural female voice if available
      const voices = window.speechSynthesis.getVoices();
      console.log("Available voices:", voices.map(v => v.name));
      const femaleVoice = voices.find(voice => 
        voice.name.includes('female') || voice.name.includes('Samantha')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      utterance.rate = 1.0;  // Normal speed
      utterance.pitch = 1.0; // Normal pitch
      
      // Log before speaking to help with debugging
      console.log(`Speaking with Web Speech API: "${text}"`);
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Speech synthesis not supported');
    }
  }
}

// Text-to-Speech using ElevenLabs API
class ElevenLabsSynthesis {
  async speak(text: string, voice?: string) {
    try {
      if (!text) return;
      
      console.log(`Requesting ElevenLabs speech: "${text}"`);
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text,
          voice: voice || 'EXAVITQu4vr4xnSDxMaL' // Default to Sarah voice
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs API error (${response.status}): ${errorText}`);
        throw new Error(`Failed to generate speech: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.audioContent) {
        console.error('No audio content returned from ElevenLabs API');
        throw new Error('No audio content returned');
      }
      
      // Convert base64 to audio
      const audioSrc = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioSrc);
      
      console.log("Playing ElevenLabs audio...");
      await audio.play();
      
      return audio;
    } catch (error) {
      console.error('Error using ElevenLabs TTS:', error);
      // Fallback to browser TTS
      console.log('Falling back to Web Speech API...');
      const webSpeech = new WebSpeechSynthesis();
      webSpeech.speak(text);
    }
  }
}

export const voiceRecognition = new VoiceRecognition();
export const webSpeechSynthesis = new WebSpeechSynthesis();
export const elevenLabsSynthesis = new ElevenLabsSynthesis();

// Combined voice synthesis with fallback
export const voiceSynthesis = {
  async speak(text: string, useElevenLabs: boolean = true, voiceId?: string) {
    console.log(`Speaking: "${text}" (using ElevenLabs: ${useElevenLabs})`);
    
    if (useElevenLabs) {
      try {
        return await elevenLabsSynthesis.speak(text, voiceId);
      } catch (error) {
        console.error('ElevenLabs failed, falling back to Web Speech API', error);
        webSpeechSynthesis.speak(text);
      }
    } else {
      webSpeechSynthesis.speak(text);
    }
  }
};
