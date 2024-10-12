import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Container,
  Paper,
  Typography,
  Box,
  Fab,
  Button,
  AppBar,
  Toolbar,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import { Mic } from "@mui/icons-material";
import { styled } from "@mui/system";

// Styled components for chat bubbles.
const ChatBubble = styled(Paper)(({ theme, role }) => ({
  padding: "1rem",
  margin: "0.5rem 0",
  borderRadius: "20px",
  backgroundColor: role === "user" ? "#e0f7fa" : "#e1bee7",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
}));

const Header = styled(AppBar)({
  backgroundColor: "#005c99",
  color: "#ffffff",
});

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
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const API_URL = 'https://voiceassistantbackend-production.up.railway.app';
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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
  }, [selectedLanguage]);

  const handleResult = async (event) => {
    const current = event.resultIndex;
    const transcriptText = event.results[current][0].transcript;
    setTranscript(transcriptText);
    setChat((prevChat) => [{ role: "user", content: transcriptText }, ...prevChat]);

    try {
      const result = await axios.post(`${API_URL}/api/generate-response`, { transcript: transcriptText });
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
  };

  const handleEnd = () => {
    setIsRecognitionActive(false);
  };

  useEffect(() => {
    initializeSpeechRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.removeEventListener('result', handleResult);
        recognitionRef.current.removeEventListener('end', handleEnd);
        recognitionRef.current.abort();
      }
    };
  }, [initializeSpeechRecognition]);

  const speak = useCallback((text) => {
    if (isVoiceEnabled && synthRef.current) {
      synthRef.current.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLanguage;
      utterance.onend = () => console.log('Speech synthesis finished');
      utterance.onerror = (event) => console.error('Speech synthesis error', event);
      synthRef.current.speak(utterance);
    }
  }, [isVoiceEnabled, selectedLanguage]);

  const startRecognition = useCallback(() => {
    if (!isRecognitionActive && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecognitionActive(true);
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        setIsRecognitionActive(false);
      }
    }
  }, [isRecognitionActive]);

  const stopRecognition = useCallback(() => {
    if (isRecognitionActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Failed to stop speech recognition:", error);
      } finally {
        setIsRecognitionActive(false);
      }
    }
  }, [isRecognitionActive]);

  const toggleVoice = () => {
    setIsVoiceEnabled(prev => {
      if (prev) {
        synthRef.current.cancel(); // Stop ongoing speech when turning off
      }
      return !prev;
    });
  };

  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
    stopRecognition();
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  return (
    <Container maxWidth="sm" sx={{ padding: "1rem", marginTop: "1rem" }}>
      <Header position="static">
        <Toolbar>
          <Typography variant="h6">Voice Assistant</Typography>
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
        }}
      >
        {chat.slice().reverse().map((message, index) => (
          <ChatBubble key={index} role={message.role}>
            <Typography variant="body1">{message.content}</Typography>
          </ChatBubble>
        ))}
        <div ref={chatEndRef} />
      </Box>

      <Typography align="center" variant="body2" color="textSecondary" sx={{ marginBottom: "1rem" }}>
        Press the button or space bar to speak
      </Typography>

      <Box display="flex" justifyContent="center" mb={3}>
        <Fab
          size="large"
          color={isRecognitionActive ? "secondary" : "primary"}
          aria-label="voice-control"
          onMouseDown={startRecognition}
          onMouseUp={stopRecognition}
          onTouchStart={startRecognition}
          onTouchEnd={stopRecognition}
          sx={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            transition: "0.3s",
            '&:hover': {
              transform: "scale(1.1)",
            },
            '&:active': {
              transform: "scale(0.9)",
            },
          }}
        >
          <Mic />
        </Fab>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <FormControlLabel
          control={
            <Switch
              checked={isVoiceEnabled}
              onChange={toggleVoice}
              color="primary"
            />
          }
          label="Enable Voice"
        />

        <FormControl variant="outlined" size="small">
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
      </Box>

      <Box display="flex" justifyContent="space-between" sx={{ backgroundColor: "#e7e9eb", padding: "0.5rem", borderRadius: "8px" }}>
        <Typography variant="body2" color="textSecondary">
          💳 Credits: 8
        </Typography>
        <Button variant="contained" color="primary" sx={{ borderRadius: "20px" }}>
          Buy Credits
        </Button>
      </Box>
    </Container>
  );
};

export default VoiceRecognition;