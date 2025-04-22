
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
  confidenceThreshold: number = 0.5; // Lower threshold to improve recognition
  minWordCount: number = 2; // Lower word count to improve recognition
  inactivityTimeout: number | null = null;
  lastResultTime: number = 0;
  inactivityTimeoutMs: number = 10000; // Longer timeout for better recognition

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
        
        // Apply filters to reduce false positives but with lower threshold
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
            if (transcript.includes(phrase)) {
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
      } else if (event.error === 'no-speech') {
        // Just log and continue for no-speech errors
        console.log('No speech detected');
        this.resetInactivityTimeout();
      } else {
        // For other errors, try to restart after a delay
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
        this.recognition.start();
      }
    };

    try {
      this.recognition.start();
      this.isListening = true;
      this.lastResultTime = Date.now();
      this.resetInactivityTimeout();
      console.log('Voice recognition started');
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
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
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
    
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
  async speak(text: string, voice?: string) {
    try {
      if (!text) return;
      
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
        throw new Error('Failed to generate speech');
      }
      
      const data = await response.json();
      
      if (!data.audioContent) {
        throw new Error('No audio content returned');
      }
      
      // Convert base64 to audio
      const audioSrc = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioSrc);
      await audio.play();
      
      return audio;
    } catch (error) {
      console.error('Error using ElevenLabs TTS:', error);
      // Fallback to browser TTS
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
