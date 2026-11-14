import { useEffect, useRef, useState } from "react";
import { chatWithAssistant, transcribeAssistantAudio } from "./api";
import "./VoiceAssistant.css";

const languages = [
  { code: "en", locale: "en-IN", label: "English" },
  { code: "te", locale: "te-IN", label: "తెలుగు" },
  { code: "hi", locale: "hi-IN", label: "हिन्दी" },
  { code: "ta", locale: "ta-IN", label: "தமிழ்" },
  { code: "kn", locale: "kn-IN", label: "ಕನ್ನಡ" },
  { code: "ml", locale: "ml-IN", label: "മലയാളം" },
  { code: "bn", locale: "bn-IN", label: "বাংলা" },
  { code: "mr", locale: "mr-IN", label: "मराठी" },
  { code: "gu", locale: "gu-IN", label: "ગુજરાતી" },
  { code: "ur", locale: "ur-PK", label: "اردو" },
  { code: "es", locale: "es-ES", label: "Español" },
  { code: "fr", locale: "fr-FR", label: "Français" },
  { code: "de", locale: "de-DE", label: "Deutsch" },
  { code: "ar", locale: "ar-SA", label: "العربية" },
  { code: "pt", locale: "pt-BR", label: "Português" },
  { code: "ja", locale: "ja-JP", label: "日本語" },
  { code: "zh", locale: "zh-CN", label: "中文" },
];

const uiText = {
  en: {
    title: "ChickenFresh assistant",
    description: "Ask about the shop or get help with your cart.",
    language: "Assistant language",
    placeholder: "Type a message...",
    send: "Send",
    microphone: "Speak",
    stop: "Stop speaking",
    clear: "Clear conversation",
    close: "Close assistant",
    listening: "Listening…",
    recording: "Recording… press the microphone again to transcribe (30 sec max).",
    transcribing: "Transcribing audio…",
    thinking: "Thinking…",
    speaking: "Speaking",
    unavailable: "Speech recognition is not available in this browser. You can still chat by text.",
    browserSpeechFailed: "The browser speech service could not connect. You can record audio for Gemini to transcribe instead.",
    useGeminiAudio: "Use Gemini audio transcription",
    recordAudio: "Record audio with Gemini",
    stopRecording: "Stop recording and transcribe",
    audioUnavailable: "Audio recording is not supported in this browser. You can still chat by text.",
    noSpeech: "No clear speech was detected. Please try again or type your message.",
    voiceUnavailable: "No installed speech voice supports this language. You can still read and type messages.",
    permission: "Microphone access was denied. Allow microphone access or continue by text.",
    safety: "Browser speech may use its own service. If you choose Gemini audio transcription, your recording is sent to Gemini; transcripts and limited store context are also sent. Don't share passwords, OTPs, or payment details.",
    actionFailure: "I couldn't safely make that change. Please try again.",
    sendError: "I couldn't reach the assistant. Please try again.",
  },
  hi: {
    title: "ChickenFresh सहायक",
    description: "दुकान के बारे में पूछें या कार्ट में सहायता लें।",
    language: "सहायक की भाषा",
    placeholder: "संदेश लिखें…",
    send: "भेजें",
    microphone: "बोलें",
    stop: "बोलना रोकें",
    clear: "बातचीत मिटाएँ",
    close: "सहायक बंद करें",
    listening: "सुन रहा है…",
    recording: "रिकॉर्ड हो रहा है… ट्रांसक्राइब करने के लिए माइक फिर दबाएँ (अधिकतम 30 सेकंड)।",
    transcribing: "ऑडियो का टेक्स्ट बनाया जा रहा है…",
    thinking: "सोच रहा है…",
    speaking: "बोल रहा है",
    unavailable: "इस ब्राउज़र में वाक् पहचान उपलब्ध नहीं है। आप टेक्स्ट से बात कर सकते हैं।",
    browserSpeechFailed: "ब्राउज़र की वाक् सेवा कनेक्ट नहीं हो सकी। Gemini से ट्रांसक्राइब करने के लिए ऑडियो रिकॉर्ड कर सकते हैं।",
    useGeminiAudio: "Gemini ऑडियो ट्रांसक्रिप्शन इस्तेमाल करें",
    recordAudio: "Gemini से ऑडियो रिकॉर्ड करें",
    stopRecording: "रिकॉर्डिंग रोककर ट्रांसक्राइब करें",
    audioUnavailable: "इस ब्राउज़र में ऑडियो रिकॉर्डिंग उपलब्ध नहीं है। आप टेक्स्ट से बात कर सकते हैं।",
    noSpeech: "स्पष्ट आवाज़ नहीं मिली। फिर कोशिश करें या संदेश लिखें।",
    voiceUnavailable: "इस भाषा के लिए कोई इंस्टॉल की गई आवाज़ उपलब्ध नहीं है। आप संदेश पढ़ और लिख सकते हैं।",
    permission: "माइक्रोफ़ोन की अनुमति नहीं मिली। अनुमति दें या टेक्स्ट से जारी रखें।",
    safety: "ब्राउज़र की वाक् सेवा आवाज़ संसाधित कर सकती है। Gemini ट्रांसक्रिप्शन चुनने पर रिकॉर्डिंग Gemini को भेजी जाती है; टेक्स्ट और सीमित स्टोर जानकारी भी भेजी जाती है। पासवर्ड, OTP या भुगतान विवरण साझा न करें।",
    actionFailure: "मैं यह बदलाव सुरक्षित रूप से नहीं कर पाया। कृपया फिर कोशिश करें।",
    sendError: "सहायक से संपर्क नहीं हो पाया। कृपया फिर कोशिश करें।",
  },
  te: {
    title: "ChickenFresh సహాయకుడు",
    description: "షాప్ గురించి అడగండి లేదా కార్ట్‌లో సహాయం పొందండి.",
    language: "సహాయకుడి భాష",
    placeholder: "సందేశం టైప్ చేయండి…",
    send: "పంపండి",
    microphone: "మాట్లాడండి",
    stop: "మాట్లాడటం ఆపండి",
    clear: "సంభాషణను తొలగించండి",
    close: "సహాయకుడిని మూసివేయండి",
    listening: "వింటున్నాను…",
    recording: "రికార్డ్ అవుతోంది… ట్రాన్స్‌క్రైబ్ చేయడానికి మైక్‌ను మళ్లీ నొక్కండి (గరిష్ఠం 30 సెకన్లు).",
    transcribing: "ఆడియోను టెక్స్ట్‌గా మారుస్తున్నాను…",
    thinking: "ఆలోచిస్తున్నాను…",
    speaking: "మాట్లాడుతోంది",
    unavailable: "ఈ బ్రౌజర్‌లో వాయిస్ గుర్తింపు అందుబాటులో లేదు. మీరు టెక్స్ట్‌తో కొనసాగవచ్చు.",
    browserSpeechFailed: "బ్రౌజర్ వాయిస్ సేవకు కనెక్ట్ కాలేదు. Geminiతో ట్రాన్స్‌క్రైబ్ చేయడానికి ఆడియో రికార్డ్ చేయవచ్చు.",
    useGeminiAudio: "Gemini ఆడియో ట్రాన్స్‌క్రిప్షన్ ఉపయోగించండి",
    recordAudio: "Geminiతో ఆడియో రికార్డ్ చేయండి",
    stopRecording: "రికార్డింగ్ ఆపి ట్రాన్స్‌క్రైబ్ చేయండి",
    audioUnavailable: "ఈ బ్రౌజర్‌లో ఆడియో రికార్డింగ్ అందుబాటులో లేదు. మీరు టెక్స్ట్‌తో కొనసాగవచ్చు.",
    noSpeech: "స్పష్టమైన మాటలు గుర్తించలేదు. మళ్లీ ప్రయత్నించండి లేదా సందేశాన్ని టైప్ చేయండి.",
    voiceUnavailable: "ఈ భాషకు ఇన్‌స్టాల్ చేసిన వాయిస్ అందుబాటులో లేదు. మీరు సందేశాలను చదవవచ్చు మరియు టైప్ చేయవచ్చు.",
    permission: "మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. అనుమతించండి లేదా టెక్స్ట్‌తో కొనసాగండి.",
    safety: "బ్రౌజర్ వాయిస్ సేవ మాటలను ప్రాసెస్ చేయవచ్చు. Gemini ట్రాన్స్‌క్రిప్షన్ ఎంచుకుంటే రికార్డింగ్ Geminiకి పంపబడుతుంది; టెక్స్ట్, పరిమిత స్టోర్ సమాచారం కూడా పంపబడతాయి. పాస్‌వర్డ్‌లు, OTPలు లేదా చెల్లింపు వివరాలను పంచుకోవద్దు.",
    actionFailure: "ఆ మార్పును సురక్షితంగా చేయలేకపోయాను. దయచేసి మళ్లీ ప్రయత్నించండి.",
    sendError: "సహాయకుడిని సంప్రదించలేకపోయాను. దయచేసి మళ్లీ ప్రయత్నించండి.",
  },
};

function storedLanguage(fallback) {
  try {
    const stored = localStorage.getItem("chickenfresh-assistant-language");
    return languages.some((language) => language.code === stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

function AssistantIcon({ name }) {
  const paths = {
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-6a7.5 7.5 0 1 1 17-3.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    stop: <><rect x="5" y="5" width="14" height="14" rx="2" /></>,
    clear: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function VoiceAssistant({
  language,
  onLanguageChange,
  screen,
  products,
  getProductName,
  cart,
  onAction,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [assistantLanguage, setAssistantLanguage] = useState(() => storedLanguage(language));
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [requestingMicrophone, setRequestingMicrophone] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [audioFallbackAvailable, setAudioFallbackAvailable] = useState(false);
  const [useGeminiAudio, setUseGeminiAudio] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const recorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimeoutRef = useRef(null);
  const recordingRequestIdRef = useRef(0);
  const transcriptRef = useRef(null);
  const copy = uiText[assistantLanguage] || uiText.en;
  const selectedLanguage = languages.find((item) => item.code === assistantLanguage) || languages[0];

  function changeLanguage(nextLanguage) {
    setAssistantLanguage(nextLanguage);
    try {
      localStorage.setItem("chickenfresh-assistant-language", nextLanguage);
    } catch {
      setError("Language preference could not be saved in this browser.");
    }
    if (["en", "hi", "te"].includes(nextLanguage)) {
      onLanguageChange(nextLanguage);
    }
  }

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, busy]);

  useEffect(() => () => {
    recordingRequestIdRef.current += 1;
    recognitionRef.current?.stop();
    if (recordingTimeoutRef.current) window.clearTimeout(recordingTimeoutRef.current);
    if (recorderRef.current) {
      recorderRef.current.onstop = null;
      if (recorderRef.current.state !== "inactive") recorderRef.current.stop();
    }
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    window.speechSynthesis?.cancel();
  }, []);

  function stopAudioRecording() {
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function cancelAudioRecording() {
    recordingRequestIdRef.current += 1;
    setRequestingMicrophone(false);
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.onstop = null;
      if (recorderRef.current.state !== "inactive") recorderRef.current.stop();
      recorderRef.current = null;
    }
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    audioChunksRef.current = [];
    setRecording(false);
  }

  async function transcribeAudio(blob) {
    const mimeType = blob.type.split(";")[0].toLowerCase();
    const supportedTypes = ["audio/webm", "audio/ogg", "audio/wav", "audio/mp3", "audio/mpeg", "audio/aac", "audio/opus", "audio/flac"];
    if (!supportedTypes.includes(mimeType)) {
      setError(copy.audioUnavailable);
      return;
    }
    if (!blob.size) {
      setError(copy.noSpeech);
      return;
    }
    setTranscribing(true);
    setError("");
    try {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      const result = await transcribeAssistantAudio({
        language: assistantLanguage,
        mime_type: mimeType,
        audio_base64: window.btoa(binary),
      });
      if (!result.transcript?.trim()) {
        setError(copy.noSpeech);
        return;
      }
      setDraft(result.transcript);
      setTranscribing(false);
      await sendMessage(result.transcript);
    } catch (requestError) {
      setError(requestError.message || copy.sendError);
    } finally {
      setTranscribing(false);
    }
  }

  async function startGeminiRecording() {
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      setError(copy.audioUnavailable);
      return;
    }
    const requestId = recordingRequestIdRef.current + 1;
    recordingRequestIdRef.current = requestId;
    let stream;
    setError("");
    setRequestingMicrophone(true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (requestId !== recordingRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const formats = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/ogg", "audio/wav", "audio/mp3"];
      const mimeType = typeof window.MediaRecorder.isTypeSupported === "function"
        ? formats.find((format) => window.MediaRecorder.isTypeSupported(format))
        : "";
      const recorder = mimeType ? new window.MediaRecorder(stream, { mimeType }) : new window.MediaRecorder(stream);
      audioChunksRef.current = [];
      audioStreamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError(copy.audioUnavailable);
        cancelAudioRecording();
      };
      recorder.onstop = () => {
        const blobType = recorder.mimeType || audioChunksRef.current[0]?.type || "";
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        audioChunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        void transcribeAudio(blob);
      };
      recorder.start();
      setError("");
      setRequestingMicrophone(false);
      setRecording(true);
      recordingTimeoutRef.current = window.setTimeout(stopAudioRecording, 30000);
    } catch (recordingError) {
      stream?.getTracks().forEach((track) => track.stop());
      if (audioStreamRef.current === stream) cancelAudioRecording();
      if (requestId === recordingRequestIdRef.current) setRequestingMicrophone(false);
      setError(recordingError.name === "NotAllowedError" ? copy.permission : copy.audioUnavailable);
    }
  }

  function speak(text) {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage.locale;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase() === selectedLanguage.locale.toLowerCase())
      || voices.find((item) => item.lang.toLowerCase().split("-")[0] === assistantLanguage);
    if (voices.length > 0 && !voice) {
      setError(copy.voiceUnavailable);
      return;
    }
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = (event) => {
      setSpeaking(false);
      if (event.error === "language-unavailable") setError(copy.voiceUnavailable);
    };
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(rawText) {
    const text = rawText.trim();
    if (!text || busy) return;
    setError("");
    setDraft("");
    const conversation = [...messages, { role: "user", text }];
    setMessages(conversation);
    setBusy(true);
    try {
      const context = {
        current_screen: screen,
        catalog_is_sample: true,
        catalog: products.map((product) => ({
          id: product.id,
          name: getProductName(product),
          category: product.category,
          price_per_kg: product.pricePerKg,
        })),
        cart: cart.map((item) => ({
          product_id: item.productId,
          weight_grams: item.weightGrams,
          quantity: item.quantity,
        })),
      };
      const result = await chatWithAssistant({
        language: assistantLanguage,
        messages: conversation.slice(-12),
        context,
      });
      if (!result.reply || !result.action) throw new Error(copy.sendError);
      const applied = onAction(result.action);
      const reply = applied === false ? copy.actionFailure : result.reply;
      setMessages((current) => [...current, { role: "assistant", text: reply }]);
      speak(reply);
    } catch (requestError) {
      setError(requestError.message || copy.sendError);
    } finally {
      setBusy(false);
    }
  }

  function startListening() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setAudioFallbackAvailable(true);
      setError(copy.unavailable);
      return;
    }
    setError("");
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    recognitionRef.current?.stop();
    const recognition = new Recognition();
    recognition.lang = selectedLanguage.locale;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      setDraft(interimText);
      if (finalText.trim()) {
        setDraft("");
        setAudioFallbackAvailable(false);
        recognition.stop();
        void sendMessage(finalText);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError(copy.permission);
      } else if (event.error === "network" || event.error === "language-not-supported") {
        setDraft("");
        setAudioFallbackAvailable(true);
        setError(copy.browserSpeechFailed);
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Speech recognition failed: ${event.error}`);
      }
    };
    recognition.onend = () => {
      setListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
      setError(copy.unavailable);
      recognitionRef.current = null;
    }
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function closePanel() {
    recognitionRef.current?.stop();
    cancelAudioRecording();
    stopSpeaking();
    setIsOpen(false);
  }

  return (
    <div className="voice-assistant">
      {isOpen ? (
        <section className="assistant-panel" role="dialog" aria-label={copy.title}>
          <header className="assistant-header">
            <div className="assistant-heading">
              <span className="assistant-avatar"><AssistantIcon name="chat" /></span>
              <div><h2>{copy.title}</h2><p>{copy.description}</p></div>
            </div>
            <button type="button" className="assistant-icon-button" onClick={closePanel} aria-label={copy.close}>
              <AssistantIcon name="close" />
            </button>
          </header>
          <div className="assistant-toolbar">
            <label htmlFor="assistant-language">{copy.language}</label>
            <select
              id="assistant-language"
              value={assistantLanguage}
              onChange={(event) => changeLanguage(event.target.value)}
            >
              {languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
            <button
              type="button"
              className="assistant-icon-button clear-button"
              onClick={() => { setMessages([]); setError(""); setDraft(""); stopSpeaking(); }}
              aria-label={copy.clear}
              title={copy.clear}
              disabled={busy || messages.length === 0}
            >
              <AssistantIcon name="clear" />
            </button>
          </div>
          <div className="assistant-transcript" ref={transcriptRef} aria-live="polite">
            {messages.length === 0 && <p className="assistant-empty">{copy.description}</p>}
            {messages.map((message, index) => (
              <div className={`assistant-message ${message.role}`} key={`${index}-${message.role}`}>
                <span>{message.role === "user" ? "You" : copy.title}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {busy && <p className="assistant-status" role="status">{copy.thinking}</p>}
            {listening && <p className="assistant-status" role="status">{copy.listening}</p>}
            {recording && <p className="assistant-status" role="status">{copy.recording}</p>}
            {transcribing && <p className="assistant-status" role="status">{copy.transcribing}</p>}
            {speaking && <p className="assistant-status" role="status">{copy.speaking}</p>}
          </div>
          <p className="assistant-safety">{copy.safety}</p>
          {error && <p className="assistant-error" role="alert">{error}</p>}
          {audioFallbackAvailable && !useGeminiAudio && (
            <button
              type="button"
              className="assistant-fallback-button"
              onClick={() => { setUseGeminiAudio(true); void startGeminiRecording(); }}
            >
              {copy.useGeminiAudio}
            </button>
          )}
          <form
            className="assistant-composer"
            onSubmit={(event) => { event.preventDefault(); void sendMessage(draft); }}
          >
            <button
              type="button"
              className={`assistant-control-button microphone-button${listening || recording ? " active" : ""}`}
              onClick={recording ? stopAudioRecording : listening ? () => recognitionRef.current?.stop() : useGeminiAudio ? startGeminiRecording : startListening}
              disabled={busy || transcribing || requestingMicrophone}
              aria-label={recording ? copy.stopRecording : listening ? copy.listening : useGeminiAudio ? copy.recordAudio : copy.microphone}
              title={recording ? copy.stopRecording : listening ? copy.listening : useGeminiAudio ? copy.recordAudio : copy.microphone}
            >
              <AssistantIcon name="mic" />
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={copy.placeholder}
              aria-label={copy.placeholder}
              maxLength={2000}
              disabled={busy || recording || transcribing}
            />
            {speaking && (
              <button type="button" className="assistant-control-button" onClick={stopSpeaking} aria-label={copy.stop} title={copy.stop}>
                <AssistantIcon name="stop" />
              </button>
            )}
            <button type="submit" className="assistant-send-button" disabled={busy || recording || transcribing || !draft.trim()} aria-label={copy.send} title={copy.send}>
              <AssistantIcon name="send" />
            </button>
          </form>
        </section>
      ) : (
        <button type="button" className="assistant-launcher" onClick={() => setIsOpen(true)} aria-label={copy.title}>
          <AssistantIcon name="chat" />
          <span>{copy.title}</span>
        </button>
      )}
    </div>
  );
}
