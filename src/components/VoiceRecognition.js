import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  AppBar,
  Toolbar,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Slider,
} from "@mui/material";
import { Mic, MicOff, VolumeUp, VolumeOff } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

const ChatBubble = styled(Paper)(({ theme, role }) => ({
  padding: "1rem",
  margin: "0.5rem 0",
  borderRadius: "20px",
  backgroundColor: role === "user" ? "#e0f7fa" : "#e1bee7",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
  maxWidth: "80%",
  alignSelf: role === "user" ? "flex-end" : "flex-start",
}));

const Header = styled(AppBar)( {
  backgroundColor: "#1976d2",
  color: "#ffffff",
});

const VoiceQualityIndicator = styled(Box)(({ theme, quality }) => ({
  width: '50px',
  height: '10px',
  backgroundColor: '#e0e0e0',
  borderRadius: '5px',
  overflow: 'hidden',
  position: 'relative',
  marginRight: '10px',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: `${quality * 100}%`,
    backgroundColor: quality > 0.7 ? '#4caf50' : quality > 0.4 ? '#ff9800' : '#f44336',
    transition: 'width 0.3s ease-in-out, background-color 0.3s ease-in-out',
  },
}));

const VoiceRecognition = () => {
  const languageOptions = [
    { value: "es-ES", label: "Español" },
    { value: "en-US", label: "English (US)" },
    { value: "fr-FR", label: "Français" },
    { value: "de-DE", label: "Deutsch" },
    { value: "it-IT", label: "Italiano" },
    { value: "pt-PT", label: "Português" },
  ];

  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [chat, setChat] = useState([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState(languageOptions[0].value);
  const [sessionId] = useState(uuidv4());
  const [voiceQuality, setVoiceQuality] = useState(0);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneStreamRef = useRef(null);

  const [volume, setVolume] = useState(50); // Initial volume state
  //const API_URL = 'http://localhost:5000';
  const API_URL = 'https://voiceassistantbackend-production.up.railway.app';
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const speak = useCallback((text) => {
    if (isVoiceEnabled && synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLanguage;
      utterance.volume = volume / 100; // Set volume based on slider
      utterance.onend = () => console.log('Speech synthesis finished');
      utterance.onerror = (event) => console.error('Speech synthesis error', event);
      synthRef.current.speak(utterance);
    }
  }, [isVoiceEnabled, selectedLanguage, volume]);

  const handleResult = useCallback(async (event) => {
    const current = event.resultIndex;
    const transcriptText = event.results[current][0].transcript;
    setTranscript(transcriptText);
    setChat((prevChat) => [{ role: "user", content: transcriptText }, ...prevChat]);

    try {
      console.log("Sending transcript to API: ", transcriptText);
      
      const result = await axios.post(`${API_URL}/api/generate-response`, { 
        transcript: transcriptText,
        sessionId: sessionId
      });
      
      console.log("API Response:", result.data);

      const responseText = result.data.response;
      setResponse(responseText);
      setChat((prevChat) => [{ role: "assistant", content: responseText }, ...prevChat]);
      if (isVoiceEnabled) {
        speak(responseText);
      }
    } catch (error) {
      console.error("Error generating response: ", error);
      const errorMessage = "Could not generate a response. Check the backend.";
      setResponse(errorMessage);
      setChat((prevChat) => [{ role: "assistant", content: errorMessage }, ...prevChat]);
      if (isVoiceEnabled) {
        speak(errorMessage);
      }
    }
  }, [API_URL, sessionId, isVoiceEnabled, speak]);

  const stopVoiceQualityAnalysis = useCallback(() => {
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().then(() => {
        audioContextRef.current = null;
      }).catch((error) => {
        console.error("Error closing AudioContext:", error);
      });
    }
    analyserRef.current = null;
    setVoiceQuality(0);
  }, []);

  const handleEnd = useCallback(() => {
    setIsRecognitionActive(false);
    stopVoiceQualityAnalysis();
  }, [stopVoiceQualityAnalysis]);

  const initializeSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.removeEventListener('result', handleResult);
      recognitionRef.current.removeEventListener('end', handleEnd);
      recognitionRef.current.abort();
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = selectedLanguage;

    recognitionRef.current.addEventListener('result', handleResult);
    recognitionRef.current.addEventListener('end', handleEnd);
  }, [selectedLanguage, SpeechRecognition, handleResult, handleEnd]);

  useEffect(() => {
    initializeSpeechRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.removeEventListener('result', handleResult);
        recognitionRef.current.removeEventListener('end', handleEnd);
        recognitionRef.current.abort();
      }
      stopVoiceQualityAnalysis();
    };
  }, [initializeSpeechRecognition, handleResult, handleEnd, stopVoiceQualityAnalysis]);

  const startVoiceQualityAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVoiceQuality = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
        const normalizedQuality = Math.min(average / 128, 1);
        console.log("Voice quality:", normalizedQuality);
        setVoiceQuality(normalizedQuality);

        if (isRecognitionActive) {
          requestAnimationFrame(updateVoiceQuality);
        }
      };

      updateVoiceQuality();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, [isRecognitionActive]);

  const startRecognition = useCallback(() => {
    if (!isRecognitionActive && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecognitionActive(true);
        startVoiceQualityAnalysis();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        setIsRecognitionActive(false);
      }
    }
  }, [isRecognitionActive, startVoiceQualityAnalysis]);

  const stopRecognition = useCallback(() => {
    if (isRecognitionActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Failed to stop speech recognition:", error);
      } finally {
        setIsRecognitionActive(false);
        stopVoiceQualityAnalysis();
      }
    }
  }, [isRecognitionActive, stopVoiceQualityAnalysis]);

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => {
      if (prev) {
        synthRef.current.cancel();
      }
      return !prev;
    });
  }, []);

  const handleLanguageChange = useCallback((event) => {
    setSelectedLanguage(event.target.value);
    stopRecognition();
  }, [stopRecognition]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    if (synthRef.current) {
      synthRef.current.volume = newValue / 100; // Set volume based on slider
    }
  };

  return (
    <Container maxWidth="sm" sx={{ padding: "1rem", marginTop: "1rem" }}>
      <Header position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Voice Assistant</Typography>
          <VoiceQualityIndicator quality={voiceQuality} />
          <IconButton color="inherit" onClick={toggleVoice}>
            {isVoiceEnabled ? <VolumeUp /> : <VolumeOff />}
          </IconButton>
        </Toolbar>
      </Header>

      <Box
        sx={{
          backgroundColor: "#f3f4f6",
          padding: "1.5rem",
          borderRadius: "12px",
          height: "60vh",
          overflowY: "auto",
          margin: "1rem 0",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column-reverse",
        }}
      >
        <div ref={chatEndRef} />
        {chat.map((message, index) => (
          <ChatBubble key={index} role={message.role}>
            <Typography variant="body1">{message.content}</Typography>
          </ChatBubble>
        ))}
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="language-select-label">Language</InputLabel>
          <Select
            labelId="language-select-label"
            id="language-select"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            label="Language"
          >
            {languageOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Slider
            value={volume}
            onChange={handleVolumeChange}
            aria-labelledby="volume-slider"
            sx={{ width: 200, margin: '0 1rem' }}
          />
          <Button
            variant="contained"
            color={isRecognitionActive ? "secondary" : "primary"}
            onMouseDown={startRecognition}
            onMouseUp={stopRecognition}
            onTouchStart={startRecognition}
            onTouchEnd={stopRecognition}
            sx={{ flexGrow: 1, borderRadius: "20px", height: "60px" }} // Adjust height and rounded corners
          >
            {isRecognitionActive ? <MicOff fontSize="large" /> : <Mic fontSize="large" />}
            <Typography sx={{ marginLeft: "0.5rem" }}>
              {isRecognitionActive ? "Listening..." : "Hold to Talk"}
            </Typography>
          </Button>
        </Box>
      </Box>

      <Box 
        display="flex" 
        justifyContent="space-between" 
        sx={{ 
          backgroundColor: "#e7e9eb", 
          padding: "1rem", 
          borderRadius: "8px",
          alignItems: "center"
        }}
      >
        <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 'bold' }}>
          💳 Credits: 8
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ 
            borderRadius: "20px",
            textTransform: 'none',
            fontWeight: 'bold'
          }}
        >
          Buy Credits
        </Button>
      </Box>
    </Container>
  );
};

export default VoiceRecognition;
