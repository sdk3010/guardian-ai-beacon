
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

  constructor() {
    const windowWithSpeech = window as IWindow;
    if (windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition) {
      const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
    }
  }

  start(onResult: VoiceCallback, onTriggerPhrase?: TriggerCallback) {
    if (!this.recognition) {
      console.error('Speech recognition not supported');
      return;
    }

    if (this.isListening) return;

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        onResult(transcript);

        // Check for trigger phrases
        if (onTriggerPhrase) {
          for (const phrase of TRIGGER_PHRASES) {
            if (transcript.includes(phrase)) {
              onTriggerPhrase(phrase);
              break;
            }
          }
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        console.error('Microphone access denied');
      }
    };

    this.recognition.start();
    this.isListening = true;
  }

  stop() {
    if (!this.recognition || !this.isListening) return;

    this.recognition.stop();
    this.isListening = false;
  }
}

// Text-to-Speech
class VoiceSynthesis {
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

export const voiceRecognition = new VoiceRecognition();
export const voiceSynthesis = new VoiceSynthesis();
