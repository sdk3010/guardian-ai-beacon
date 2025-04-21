
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
  confidenceThreshold: number = 0.6; // Only accept results with this confidence or higher
  minWordCount: number = 3; // Only respond to phrases with at least this many words
  inactivityTimeout: number | null = null;
  lastResultTime: number = 0;
  inactivityTimeoutMs: number = 5000; // Stop listening after 5 seconds of inactivity

  constructor() {
    const windowWithSpeech = window as IWindow;
    if (windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition) {
      const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      // Initialize with reasonable defaults for noise reduction
      this.recognition.lang = 'en-US'; // Set language explicitly
    }
  }

  start(onResult: VoiceCallback, onTriggerPhrase?: TriggerCallback) {
    if (!this.recognition) {
      console.error('Speech recognition not supported');
      return;
    }

    if (this.isListening) return;

    this.recognition.onresult = (event: any) => {
      this.lastResultTime = Date.now();
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        const confidence = event.results[i][0].confidence;
        
        // Apply filters to reduce false positives
        if (confidence < this.confidenceThreshold) {
          console.log(`Ignored low confidence result (${confidence.toFixed(2)}): ${transcript}`);
          continue;
        }
        
        const wordCount = transcript.split(/\s+/).length;
        if (wordCount < this.minWordCount) {
          console.log(`Ignored short phrase (${wordCount} words): ${transcript}`);
          continue;
        }
        
        console.log(`Voice recognized: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
        onResult(transcript);

        // Check for trigger phrases with additional validation
        if (onTriggerPhrase) {
          for (const phrase of TRIGGER_PHRASES) {
            // More strict matching to reduce false positives
            if (transcript.includes(phrase) && confidence > 0.75) {
              console.log(`Trigger phrase detected: "${phrase}"`);
              onTriggerPhrase(phrase);
              break;
            }
          }
        }
      }
      
      // Reset inactivity timeout
      this.resetInactivityTimeout();
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        console.error('Microphone access denied');
      }
    };

    this.recognition.start();
    this.isListening = true;
    this.lastResultTime = Date.now();
    this.resetInactivityTimeout();
    
    console.log('Voice recognition started');
  }

  stop() {
    if (!this.recognition || !this.isListening) return;

    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
    
    this.recognition.stop();
    this.isListening = false;
    console.log('Voice recognition stopped');
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
      const femaleVoice = voices.find(voice => 
        voice.name.includes('female') || voice.name.includes('Samantha')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      utterance.rate = 1.0;  // Normal speed
      utterance.pitch = 1.0; // Normal pitch
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Speech synthesis not supported');
    }
  }
}

// Text-to-Speech using ElevenLabs API
class ElevenLabsSynthesis {
  async speak(text: string, voiceId?: string) {
    try {
      if (!text) return;
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text,
          voiceId: voiceId || 'EXAVITQu4vr4xnSDxMaL' // Default to Sarah voice
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      const data = await response.json();
      
      // Play the audio
      const audio = new Audio(data.audioUrl);
      audio.play();
      
      return audio;
    } catch (error) {
      console.error('Error using ElevenLabs TTS:', error);
      // Fallback to browser TTS
      webSpeechSynthesis.speak(text);
    }
  }
}

export const voiceRecognition = new VoiceRecognition();
export const webSpeechSynthesis = new WebSpeechSynthesis();
export const elevenLabsSynthesis = new ElevenLabsSynthesis();

// Combined voice synthesis with fallback
export const voiceSynthesis = {
  async speak(text: string, useElevenLabs: boolean = true, voiceId?: string) {
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
