
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

type VoiceCallback = (text: string) => void;

class VoiceRecognition {
  recognition: any = null;
  isListening: boolean = false;
  triggerPhrase: string = "help me";

  constructor() {
    const windowWithSpeech = window as IWindow;
    if (windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition) {
      const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
    }
  }

  start(onResult: VoiceCallback, onTriggerPhrase?: () => void) {
    if (!this.recognition) {
      console.error('Speech recognition not supported');
      return;
    }

    if (this.isListening) return;

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        onResult(transcript);

        // Check for trigger phrase
        if (onTriggerPhrase && transcript.includes(this.triggerPhrase)) {
          onTriggerPhrase();
        }
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
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Speech synthesis not supported');
    }
  }
}

export const voiceRecognition = new VoiceRecognition();
export const voiceSynthesis = new VoiceSynthesis();
